import { prisma } from "@/lib/db";
import { forbidden } from "@/lib/http";
import type { IAssetOwnershipProvider, OwnershipEntry } from "./types";

// Adapter ปัจจุบัน (Web2): ความเป็นเจ้าของตัดสินจากแถวใน UserInventory
export const dbOwnershipProvider: IAssetOwnershipProvider = {
  name: "db-owner-inventory",
  source: "db",

  async getMany(userId, inventoryIds): Promise<OwnershipEntry[]> {
    if (inventoryIds.length === 0) return [];
    const rows = await prisma.userInventory.findMany({
      where: { id: { in: inventoryIds } },
      select: {
        id: true,
        userId: true,
        isOnChain: true,
        contractAddress: true,
        tokenId: true,
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    return inventoryIds.map((id) => {
      const row = byId.get(id);
      return {
        inventoryId: id,
        userId,
        owned: row?.userId === userId,
        ownerRef: row ? row.userId : null,
        source: "db" as const,
        tokenRef:
          row?.isOnChain && row.contractAddress && row.tokenId
            ? { contractAddress: row.contractAddress, tokenId: row.tokenId }
            : null,
      };
    });
  },

  async assertOwned(userId, inventoryIds): Promise<void> {
    if (inventoryIds.length === 0) return;
    const entries = await this.getMany(userId, inventoryIds);
    const notOwned = entries.filter((e) => !e.owned);
    if (notOwned.length > 0) {
      throw forbidden(`ไม่มีสิทธิ์ใช้ asset ต่อไปนี้: ${notOwned.map((e) => e.inventoryId).join(", ")}`);
    }
  },
};
