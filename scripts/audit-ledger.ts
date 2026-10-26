import { PrismaClient } from "@prisma/client";
import { auditLedger } from "../src/server/ledger/ledger";

// ============================================================
// LEDGER AUDIT — ตรวจสมดุลสมุดบัญชีเกมทั้งหมด
// รัน: npm run audit:ledger
// ตามโจทย์ Phase 2: "บันทึกเหรียญแบบ double-entry เพื่อให้ตรวจสอบได้ง่าย
// ก่อนแปลงเป็น Token จริง" — สคริปต์นี้คือเครื่องมือตรวจ (audit tool) ของระบบ
// exit code: 0 = สมดุล, 1 = ไม่สมดุล (นำไปต่อกับ CI ได้)
// ============================================================

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const report = await auditLedger(prisma);

  console.log("\n=== GAME LEDGER AUDIT ===");
  console.log(`รายการบัญชี (บัญชี balance = SUM(DEBIT) − SUM(CREDIT)):\n`);

  for (const acc of report.perAccount) {
    console.log(
      `  ${acc.code.padEnd(38)} ${acc.type.padEnd(9)} ${acc.currency}  balance=${acc.balance}`,
    );
  }

  console.log("");
  console.log(`total DEBIT  = ${report.totalDebit}`);
  console.log(`total CREDIT = ${report.totalCredit}`);

  if (report.balanced) {
    console.log("\n✅ สมดุลถูกต้อง: ทุก entry ครบ double-entry พร้อมพาไป mapping เป็น Token ได้");
  } else {
    console.log("\n❌ ไม่สมดุล! พบบัญชีบำวิเศษ — ต้องตรวจ code ที่ postEntry เดินผ่านเสมอ");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
