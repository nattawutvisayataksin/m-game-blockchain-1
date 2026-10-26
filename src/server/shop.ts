import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError, forbidden, notFound } from "@/lib/http";
import { ACCOUNT_CODES, playerAccountCode, playerBalance, postEntry } from "@/server/ledger/ledger";

// ============================================================
// SHOP — สาธิตฝั่ง economy "ผู้เล่นจ่ายเหรียญ" (sink)
//   DEBIT system:shop  /  CREDIT player:<userId>
// กับ Reward Claim ที่เป็นฝั่ง "ระบบจ่ายให้ผู้เล่น" จึงครบวงจร double-entry
// ============================================================

export async function listShopTemplates() {
  const templates = await prisma.itemTemplate.findMany({
    where: { shopPrice: { not: null } },
    orderBy: { shopPrice: "asc" },
    select: {
      code: true,
      name: true,
      kind: true,
      rarity: true,
      description: true,
      fungible: true,
      shopPrice: true,
      tokenStandard: true,
    },
  });
  return templates.map((t) => ({
    ...t,
    shopPrice: t.shopPrice?.toString() ?? null,
  }));
}

export async function purchaseItem(userId: string, templateCode: string, qty: number): Promise<{
  itemCode: string;
  quantityPurchased: number;
  goldSpent: string;
  goldBalance: string;
  inventoryId: string;
}> {
  if (qty < 1 || qty > 99) throw new ApiError(400, "INVALID_QTY", "จำนวนต้องอยู่ระหว่าง 1-99");

  // ซื้อของ "เฉพาะตัว" (WEAPON/ARMOR/CHARACTER/LAND) ห้ามกองรวม 1 ชิ้นต่อครั้งเท่านั้น
  const qtyEffective = qty;

  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const template = await tx.itemTemplate.findUnique({ where: { code: templateCode } });
      if (!template) throw notFound("ไม่พบไอเทมนี้ในระบบ");
      if (template.shopPrice === null) throw forbidden("ไอเทมนี้ไม่ได้ขายในร้าน");
      if (!template.fungible && qtyEffective !== 1) {
        throw new ApiError(400, "NON_STACKABLE", "ของชนิดนี้ซื้อได้ครั้งละ 1 ชิ้นเท่านั้น");
      }

      const price = template.shopPrice * BigInt(qtyEffective);

      // 1) ยอดเงินผู้เล่น ณ ขณะนี้ = SUM(DEBIT) − SUM(CREDIT) ของบัญชี player
      const balance = await playerBalance(tx, userId);
      if (balance < price) {
        throw new ApiError(402, "INSUFFICIENT_GOLD", `เหรียญไม่พอ ต้องการ ${price} มีอยู่ ${balance}`);
      }

      // 2) เดินบัญชี: shop รับ → player ลด
      const entryId = await postEntry(tx, {
        refType: "SHOP_PURCHASE",
        refId: template.code,
        memo: `ซื้อ ${template.name} ×${qtyEffective}`,
        lines: [
          { accountCode: ACCOUNT_CODES.shop, side: "DEBIT", amount: price },
          { accountCode: playerAccountCode(userId), side: "CREDIT", amount: price },
        ],
      });

      // 3) เติมของลงคลัง
      let inventoryId: string;
      if (template.fungible) {
        const existing = await tx.userInventory.findFirst({
          where: { userId, templateId: template.id, status: "ACTIVE" },
          select: { id: true, quantity: true },
        });
        if (existing) {
          await tx.userInventory.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + qtyEffective },
          });
          inventoryId = existing.id;
        } else {
          const created = await tx.userInventory.create({
            data: { userId, templateId: template.id, quantity: qtyEffective, instanceData: {} },
          });
          inventoryId = created.id;
        }
      } else {
        const created = await tx.userInventory.create({
          data: {
            userId,
            templateId: template.id,
            quantity: 1,
            instanceData: {
              level: template.kind === "CHARACTER" ? 1 : 0,
              exp: 0,
              currentHp: null,
              equipment: {},
            },
          },
        });
        inventoryId = created.id;
      }

      const finalBalance = await playerBalance(tx, userId);
      return { entryId, inventoryId, finalBalance, price };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 },
  );

  void result.inventoryId; // (ใช้เป็น key ของการแสดงสินค้าที่เพิ่งซื้อใน UI ภายหลัง)

  return {
    itemCode: templateCode,
    quantityPurchased: qtyEffective,
    goldSpent: result.price.toString(),
    goldBalance: result.finalBalance.toString(),
    inventoryId: result.inventoryId,
  };
}
