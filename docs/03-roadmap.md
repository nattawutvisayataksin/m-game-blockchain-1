# 03 — Roadmap (3 ขั้น)

## Phase A — Core Web2 Game Loop (สถานะ: ✅ ส่งมอบใน repo แล้ว)

เป้าหมาย: "เล่นได้จริง สนุก เต็มรูปแบบ บนเบราว์เซอร์" โดยไม่แตะ blockchain เลย

- [x] Auth Web2: email/password (JWT httpOnly + Bearer), บัญชี demo, scaffold Google OAuth (`/api/auth/google`)
- [x] Item/NFTTemplate model + metadata ERC-721 builder (พร้อมฝาก IPFS)
- [x] Inventory/instance data (level/exp/hp อยู่ server)
- [x] Turn-based battle engine **server-authoritative** (ดาเมจ/คริ/AI/drop)
- [x] Reward grant → claim (กัน claim ซ้ำ, สร้าง ledger entry อัตโนมัติ)
- [x] Game Ledger double-entry + script audit (`npm run audit:ledger`)
- [x] Shop (ฝั่งใช้เหรียญ) และ ownership check ผ่าน Adapter
- [x] **Pixel Game Frontend (สนุกมากพออย่างเดียวก่อน):**
  - Battle Scene pixel art + animation (lunge/hit flash/shake/particles/damage number ลอย)
  - Stage select (พร้อมภาพฉากแบบ pixel), Hub, inventory, shop, reward claim level-up banner
- [x] เตรียมสังคม user หลายคนบนเกมนี้ (rate-limit เบื้องต้น/redesign ภายหลังตอน live)

## Phase B — Wallet Connect & Identity Mapping (แผนถัดไป, ยังไม่ลงมือ)

คร่าว ๆ ตอนเริ่มเปิด:
- เพิ่ม endpoint `POST /api/auth/wallet/challenge` และ `POST /api/auth/wallet/verify`
  - ใช้ `User.signInNonce` + `AuthIdentity(WALLET_SIGN_IN)` ที่รองรับอยู่แล้ว
- Frontend: ปุ่ม Connect Wallet (wagmi + viem ชื่อ `bitkubTestnet`) บนหน้า `Connect` placeholder ที่มีอยู่แล้ว
- Player identity: เชื่อม wallet กับบัญชีเดิมได้หลายบัญชี (email/password + wallet ใช้ทีเดียว)
- การเข้าถึง asset ผ่าน `User.walletAddress` — ไม่แตะเครื่องยนต์เกม

## Phase C — Minting, Contract และ On-Chain (เริ่มเมื่อเกมมีผู้เล่นจริง)

ตาม flow ใน `01-architecture.md #4`:
- [ ] Smart contract: `GameToken.sol` (ERC-20, MINTER_ROLE = server) + `GameAsset.sol` (ERC-721/1155 voucher claim)
- [ ] Minting flow: server ออก voucher EIP-712 → ผู้เล่น claim → indexer ตรวจ event → อัปเดต `UserInventory.isOnChain/tokenId/...`
- [ ] เปลี่ยน `ASSET_OWNERSHIP_PROVIDER=chain` — game logic ไม่แก้ (adapter สลับแล้ว)
- [ ] Ledger mapping: MINT/TREASURY/BURN เป็น token จริง + ปิด gap
- [ ] เข้า testnet ก่อน (tKUB) วางแผน tokenomics แน่นอนก่อน mainnet

หมายเหตุ: หลักคิดตามโจทย์ — เกมต้องสนุกพอทำเงินในเป้าหมายผู้เล่นก่อน แล้วค่อยนำ Web3 มาเป็นเรื่องของมูลค่าทางเศรษฐกิจที่ผู้เล่นเลือกได้