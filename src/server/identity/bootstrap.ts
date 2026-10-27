import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import type { PrismaTx } from "@/server/ledger/ledger";

// ============================================================
// Bootstrap บัญชีผู้เล่นใหม่ — ใช้ร่วมกันทั้ง register (email)
// และ Google OAuth เพื่อให้ได้ผู้เล่นที่พร้อมเล่นเกมจริง หลังสมัครเสร็จ:
//   1) สร้าง User + AuthIdentity (จดบันทึกว่าสมัครผ่านช่องทางอะไร)
//   2) เปิด "บัญชี GOLD" ของผู้เล่นใน Ledger ทันที
//   3) มอบชุดเริ่มเกม (Character + Potion)
//   4) โบนัสต้อนรับ: DEBIT player / CREDIT treasury (audit trail ครบ)
// ============================================================

export const STARTER_ITEMS = [
  { code: "char_recruit", quantity: 1, instance: { level: 1, exp: 0, currentHp: null, equipment: {} } },
  { code: "potion_small", quantity: 3, instance: {} },
] as const;

export type CreateIdentityInput =
  | { provider: "EMAIL_PASSWORD"; email: string; password: string; displayName: string }
  | { provider: "GOOGLE_OAUTH"; email: string; googleSubject: string; displayName: string };

export async function bootstrapNewUser(input: CreateIdentityInput): Promise<User> {
  const subject =
    input.provider === "GOOGLE_OAUTH" ? input.googleSubject : input.email;

  const existingByIdentity = await prisma.authIdentity.findUnique({
    where: { provider_subject: { provider: input.provider, subject } },
    select: { userId: true },
  });
  if (existingByIdentity) {
    throw new ApiError(409, "IDENTITY_IN_USE", "ช่องทางล็อกอินนี้ถูกใช้กับบัญชีอื่นแล้ว");
  }

  if (input.email) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingByEmail) {
      throw new ApiError(409, "EMAIL_IN_USE", "อีเมลนี้ถูกใช้สมัครแล้ว");
    }
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.provider === "EMAIL_PASSWORD" ? hashPassword(input.password) : null,
      identities: {
        create: { provider: input.provider, subject },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { goldBalance: env.signupBonusGold } });
    await grantStarterItems(tx, user.id);
  });

  return user;
}

/** V2 guest profile: playable immediately without email/password. */
export async function bootstrapGuestUser(): Promise<User> {
  const user = await prisma.user.create({
    data: { displayName: `Guest-${Math.floor(1000 + Math.random() * 9000)}` },
  });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { goldBalance: env.signupBonusGold } });
    await grantStarterItems(tx, user.id);
  });
  return user;
}

async function grantStarterItems(tx: PrismaTx, userId: string): Promise<void> {
  for (const item of STARTER_ITEMS) {
    const template = await tx.itemTemplate.findUnique({ where: { code: item.code } });
    if (!template) continue; // seed ยังไม่รัน → ยังไม่มีของ แต่สมัครได้อยู่
    await tx.userInventory.create({
      data: {
        userId,
        templateId: template.id,
        quantity: item.quantity,
        instanceData: JSON.parse(JSON.stringify(item.instance)),
      },
    });
  }
}

export default bootstrapNewUser;
