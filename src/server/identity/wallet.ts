import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// ============================================================
// Web3 Identity SCAFFOLD (Phase B) — Sign-In with Ethereum/Kub Chain
// ------------------------------------------------------------
// โครงสร้างพร้อมทั้งหมด แต่ "ยังไม่มี endpoint ใดเรียกเปิดใช้"
// เมื่อถึง Phase B จะเพิ่ม:
//   • POST /api/auth/wallet/challenge → สร้าง nonce + ข้อความ SIWE
//     (ผู้เล่นเซ็นด้วยกระเป๋าเงิน เช่น MetaMask บนเคร.Infof ต่างชาติ)
//   • POST /api/auth/wallet/verify → verify signature (eip-191 personal_sign)
//     → ผูก User.walletAddress และสร้าง AuthIdentity(WALLET_SIGN_IN)
// กำหนดคำสำคัญ: ทำในเว็บไซต์เกมเฟสไหน ก็ให้ฟังก์ชันนี้ใช้ common symbol เดียวกันทั้งหมด
// ============================================================

export const CHAIN_NAME_FALLBACK = "Kub Chain";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEvmAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS_RE.test(value);
}

export function normalizeAddress(address: string): string {
  if (!ADDRESS_RE.test(address)) {
    throw new Error("รูปแบบ wallet address ไม่ใช่ EVM address ที่ถูกต้อง");
  }
  return address.toLowerCase(); // เก็บ lowercase ในระบบกันตัวพิมพ์ต่างกัน
}

/** ชื่อผู้เล่น + address + nonce อยู่ในข้อความเดียว เพื่อห้ามใครซ้ำ nonce ใช้ replay */
export function buildWalletChallenge(user: Pick<User, "signInNonce">, walletAddress: string) {
  const nonce = user.signInNonce;
  if (!nonce) {
    return { error: "ไม่มี nonce ที่ยังใช้งาน — ต้องเรียกขอ challenge ก่อน (Phase B)" } as const;
  }
  const lines = [
    "m-game-blockchain: เข้าสู่ระบบเกมด้วย wallet",
    `Wallet: ${walletAddress}`,
    `Chain: Kub Chain (chainId ${env.kubChainId})`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ];
  return { message: lines.join("\n"), nonce } as const;
}

/** ใช้ตอน verify เพื่อหมุน nonce ออก (พร้อมทั้งบันทึกว่าผูกสำเร็จ) */
export async function linkWalletToUser(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  walletAddress: string,
): Promise<void> {
  const normalized = normalizeAddress(walletAddress);
  const clash = await tx.user.findUnique({ where: { walletAddress: normalized } });
  if (clash && clash.id !== userId) {
    throw new Error("wallet นี้ถูกผูกกับบัญชีอื่นอยู่แล้ว");
  }
  await tx.user.update({
    where: { id: userId },
    data: {
      walletAddress: normalized,
      walletChainId: env.kubChainId,
      walletLinkedAt: new Date(),
      signInNonce: null,
    },
  });
  await tx.authIdentity.upsert({
    where: {
      provider_subject: { provider: "WALLET_SIGN_IN", subject: normalized },
    },
    create: { userId, provider: "WALLET_SIGN_IN", subject: normalized },
    update: {},
  });
}
