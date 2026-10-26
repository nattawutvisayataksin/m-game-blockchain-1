// ============================================================
// สัญญา (Interface) ของระบบตรวจสิทธิ์ "ความเป็นเจ้าของ asset"
// ------------------------------------------------------------
// เหตุผลที่มี Adapter:
//   ตอนนี้ (Web2) ความเป็นเจ้าของตัดสินจากตาราง UserInventory (DB)
//   ในอนาคต (Web3/Phase C) asset บางชิ้นจะกลายเป็น NFT จริงบน Kub Chain
//   การตรวจสิทธิ์จะเปลี่ยนจาก "เช็ค DB" → "เรียก contract ownerOf()"
//   เกมอื่นทั้งหมด (Battle/Shop/Claim) เรียกผ่าน interface นี้เท่านั้น
//   → เปลี่ยน implementation โดยไม่ต้องแก้ game logic
// เปิดใช้ adapter ตัวไหน: env ASSET_OWNERSHIP_PROVIDER = "db" | "chain"
// ============================================================

export type OwnershipSource = "db" | "chain";

export interface OwnershipEntry {
  inventoryId: string;
  userId: string;
  owned: boolean;
  // คำอธิบายเจ้าของข้อจริง: ตอนนี้ = userId ใน DB / อนาคต = wallet address บน chain
  ownerRef: string | null;
  source: OwnershipSource;
  // ข้อมูลเสริม (เช่น tokenId/contract หลัง Phase C)
  tokenRef?: { contractAddress: string; tokenId: string } | null;
}

export interface IAssetOwnershipProvider {
  readonly name: string;
  readonly source: OwnershipSource;

  /** ตรวจว่าผู้ใช้เป็นเจ้าของ asset ทุกชิ้นในรายการ — ถ้าไม่ครบ throw ApiError(403) */
  assertOwned(userId: string, inventoryIds: string[]): Promise<void>;

  /** ตรวจแบบนุ่มนวล: คืนรายงานทีละชิ้น (ใช้ใน endpoint สาธิต/Debug) */
  getMany(userId: string, inventoryIds: string[]): Promise<OwnershipEntry[]>;
}
