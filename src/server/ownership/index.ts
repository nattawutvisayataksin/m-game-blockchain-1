import { env } from "@/lib/env";
import { dbOwnershipProvider } from "./db-provider";
import { chainOwnershipProvider } from "./chain-provider";
import type { IAssetOwnershipProvider } from "./types";

export type { IAssetOwnershipProvider, OwnershipEntry, OwnershipSource } from "./types";

/**
 * Factory ตาม env — เกมทั้งหมด (Battle/Claim/Shop) เรียกผ่าน getOwnershipProvider()
 * ตอนนี้: "db" (Web2) → ภายหลัง Phase C เปลี่ยน env เป็น "chain"
 * แล้ว game logic ทั้งหมดจะเช็คสิทธิ์ on-chain ทันทีโดยไม่ต้องแก้โค้ดเกมเลย
 */
export function getOwnershipProvider(): IAssetOwnershipProvider {
  if (env.assetOwnershipProvider === "chain") {
    return chainOwnershipProvider;
  }
  return dbOwnershipProvider;
}

// จุดเดียวที่ game logic ตรวจสิทธิ์ asset ก่อนใช้งาน
// (เช่น ก่อนเอาไปต่อสู้ / ก่อน claim รางวัลที่เป็นไอเทม)
export async function assertUserOwns(userId: string, inventoryIds: string[]) {
  const provider = getOwnershipProvider();
  await provider.assertOwned(userId, inventoryIds.filter(Boolean));
}

export const ownershipProviders = {
  db: dbOwnershipProvider,
  chain: chainOwnershipProvider,
};
