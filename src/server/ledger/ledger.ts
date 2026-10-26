import { Prisma, type PrismaClient } from "@prisma/client";
import { ApiError } from "@/lib/http";

// ค่านิยามล็อกไว้ในโปรเจกต์เดียว (Prisma enum unions ส่งจาก schema ตรงกัน)
export type LedgerAccountTypeValue = "PLAYER" | "SYSTEM" | "MINT" | "BURN" | "TREASURY";
export type CurrencyValue = "GOLD";
export type LedgerSideValue = "DEBIT" | "CREDIT";

// ============================================================
// GAME LEDGER — เครื่องยกเลกสาร double-entry bookkeeping ของเกม
// ------------------------------------------------------------
// กติกาบัญชี:
//   • balance ของทุกบัญชี = SUM(DEBIT) − SUM(CREDIT)
//     (DEBIT ส่วนเพิ่ม / CREDIT ส่วนลด — มองทุกบัญชีเป็นบัญชี asset)
//   • ทุก entry ต้องสมดุล: sum(DEBIT) == sum(CREDIT) เสมอ (enforce ใน postEntry)
//   • หนึ่ง entry ต่อหนึ่งสกุลเงิน (currency)
//
// ตรรกะแผนสานเข้ากับ Kub Chain ใน Phase C:
//   MINT      → แทรกออกมาจากสัญญา Game Token (mint role ของ Server)
//   TREASURY  → กลุ่มทุนของระบบที่แจกรางวัล
//   PLAYER    → "กระเป๋าเหรียญในเกม" ของผู้เล่น (ก่อนผูก wallet จริง)
//   SHOP/BURN → sink: เหรียญหายออกจากระบบเกมจริง ให้แม็ปเป็น token burn ประจำได้
// ============================================================

export const ACCOUNT_CODES = {
  treasury: "system:treasury",
  shop: "system:shop",
  mint: "mint",
  burn: "burn",
} as const;

export type PrismaTx = Prisma.TransactionClient;
export type ClientLike = PrismaTx | PrismaClient;

export interface LedgerLineSpec {
  accountCode: string;
  side: LedgerSideValue;
  amount: bigint;
}

export interface PostEntrySpec {
  refType: string;
  refId?: string;
  memo?: string;
  lines: LedgerLineSpec[];
}

// นิยามบัญชีระบบที่สร้างอัตโนมัติถ้ายังไม่มี (idempotent)
const SYSTEM_ACCOUNT_DEFS: Record<
  string,
  { name: string; type: LedgerAccountTypeValue; currency: CurrencyValue }
> = {
  [ACCOUNT_CODES.treasury]: { name: "รายได้กลางของระบบ (แจกรางวัลจากที่นี่)", type: "TREASURY", currency: "GOLD" },
  [ACCOUNT_CODES.shop]: { name: "เหรียญที่รับจากร้านค้า (economy sink)", type: "SYSTEM", currency: "GOLD" },
  [ACCOUNT_CODES.mint]: { name: "แหล่งกำเนิดเหรียญ (อนาคต: Token mint)", type: "MINT", currency: "GOLD" },
  [ACCOUNT_CODES.burn]: { name: "ถังเผาเหรียญ (อนาคต: Token burn)", type: "BURN", currency: "GOLD" },
};

export function playerAccountCode(userId: string): string {
  return `player:${userId}`;
}

/** สร้างบัญชีถ้ายังไม่มี (idempotent) */
export async function ensureAccount(
  client: ClientLike,
  spec: {
    code: string;
    name: string;
    type: LedgerAccountTypeValue;
    currency: CurrencyValue;
    userId?: string;
  },
): Promise<void> {
  await client.ledgerAccount.upsert({
    where: { code: spec.code },
    create: { code: spec.code, name: spec.name, type: spec.type, currency: spec.currency, userId: spec.userId },
    update: {},
  });
}

/** บัญชี GOLD ในเกมของผู้เล่น — เรียกตอนสมัครใหม่ */
export async function ensurePlayerAccount(tx: PrismaTx, userId: string): Promise<void> {
  await ensureAccount(tx, {
    code: playerAccountCode(userId),
    name: "GOLD ในเกมของผู้เล่น",
    type: "PLAYER",
    currency: "GOLD",
    userId,
  });
}

/**
 * บันทึก entry เดียวที่ต้องสมดุลเสมอ — validate ก่อนเขียน:
 * ยอด > 0, DEBIT == CREDIT, สกุลเงินเดียว, บัญชีอยู่จริง (สร้างให้ถ้าเป็นบัญชีระบบ)
 * คืน id ของ entry เพื่อใช้เป็น audit trail (เช่น claimEntryId ของ RewardGrant)
 */
export async function postEntry(client: ClientLike, spec: PostEntrySpec): Promise<string> {
  if (spec.lines.length < 2) {
    throw new ApiError(500, "LEDGER_INVALID", "entry ต้องมีบรรทัดตั้งแต่ 2 บรรทัดขึ้นไป");
  }

  const resolved: { accountId: string; side: LedgerSideValue; amount: bigint }[] = [];
  const currencies = new Set<string>();
  let debitTotal = 0n;
  let creditTotal = 0n;

  for (const line of spec.lines) {
    if (line.amount <= 0n) {
      throw new ApiError(500, "LEDGER_AMOUNT_INVALID", "ยอดบัญชีทุกบรรทัดต้องมากกว่าศูนย์");
    }

    let account = await client.ledgerAccount.findUnique({ where: { code: line.accountCode } });
    if (!account) {
      const def = SYSTEM_ACCOUNT_DEFS[line.accountCode];
      if (def) {
        await ensureAccount(client, { code: line.accountCode, ...def });
        account = await client.ledgerAccount.findUnique({ where: { code: line.accountCode } });
      }
    }
    if (!account) {
      throw new ApiError(500, "LEDGER_ACCOUNT_MISSING", `ไม่พบบัญชี: ${line.accountCode}`);
    }

    currencies.add(account.currency);
    if (line.side === "DEBIT") debitTotal += line.amount;
    else creditTotal += line.amount;

    resolved.push({ accountId: account.id, side: line.side, amount: line.amount });
  }

  if (debitTotal !== creditTotal) {
    throw new ApiError(
      500,
      "LEDGER_UNBALANCED",
      `Entry ไม่สมดุล: DEBIT=${debitTotal} != CREDIT=${creditTotal} (refType=${spec.refType})`,
    );
  }
  if (currencies.size !== 1) {
    throw new ApiError(500, "LEDGER_MULTI_CURRENCY", "หนึ่ง entry ต้องเป็นสกุลเงินเดียวเท่านั้น");
  }
  const currency = [...currencies.values()][0] as "GOLD";

  const entry = await client.ledgerEntry.create({
    data: {
      refType: spec.refType,
      refId: spec.refId,
      memo: spec.memo,
      lines: {
        create: resolved.map((line) => ({
          accountId: line.accountId,
          side: line.side,
          amount: line.amount,
          currency,
        })),
      },
    },
  });

  return entry.id;
}

/** ยอดคงเหลือของบัญชีใด ๆ = SUM(DEBIT) − SUM(CREDIT) */
export async function balanceOf(tx: PrismaTx, accountCode: string): Promise<bigint> {
  const rows = await tx.ledgerLine.findMany({
    where: { account: { code: accountCode } },
    select: { side: true, amount: true },
  });
  let bal = 0n;
  for (const r of rows) {
    bal = r.side === "DEBIT" ? bal + r.amount : bal - r.amount;
  }
  return bal;
}

/** เหรียญในเกมของผู้เล่น — ใช้ทั่วทั้งระบบ */
export async function playerBalance(tx: PrismaTx, userId: string): Promise<bigint> {
  return balanceOf(tx, playerAccountCode(userId));
}

/** ตรวจสอบความสมดุลของ Ledgers ทั้งระบบ — ใช้ใน scripts/audit-ledger.ts */
export async function auditLedger(client: ClientLike): Promise<{
  balanced: boolean;
  totalDebit: bigint;
  totalCredit: bigint;
  perAccount: { code: string; type: string; currency: string; balance: bigint }[];
}> {
  const lines = await client.ledgerLine.findMany({
    select: { side: true, amount: true, account: { select: { code: true, type: true, currency: true } } },
  });

  let totalDebit = 0n;
  let totalCredit = 0n;
  const acc = new Map<
    string,
    { code: string; type: string; currency: string; balance: bigint }
  >();

  for (const line of lines) {
    if (line.side === "DEBIT") totalDebit += line.amount;
    else totalCredit += line.amount;

    const key = line.account.code;
    const prev =
      acc.get(key) ?? {
        code: line.account.code,
        type: line.account.type,
        currency: line.account.currency,
        balance: 0n,
      };
    prev.balance = line.side === "DEBIT" ? prev.balance + line.amount : prev.balance - line.amount;
    acc.set(key, prev);
  }

  return {
    balanced: totalDebit === totalCredit,
    totalDebit,
    totalCredit,
    perAccount: [...acc.values()],
  };
}
