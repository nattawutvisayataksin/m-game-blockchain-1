# 01 — System Architecture

> สรุปโปรเจกต์: เกม **2D Turn-based RPG บนเบราว์เซอร์** ที่สร้างเป็น Web2 ก่อน
> และออกแบบให้พร้อมต่อ **Kub Chain (EVM)** ในอนาคต
> Stack: **Next.js (App Router, TypeScript) + Prisma + PostgreSQL**

## 1. หลักการออกแบบ (ตามโจทย์)

| เป้าหมาย | วิธีที่ใช้ใน repo |
|---|---|
| แยก Game Logic ออกจาก Identity/Asset | เลเยอร์เกม (`src/server/game/*`) ไม่รู้จักการเชื่อม blockchain เลย ตรวจสิทธิ์ทรัพย์สินผ่าน **Ownership Adapter** เพียงช่องเดียว |
| พร้อม Tokenomics / NFT | เหรียญในเกมเดินผ่าน **Ledger แบบ double-entry** สามารถแม็ปเป็น ERC-20 ได้ และ item/character มีฟิลด์ Web3 ครบ (`tokenId`, `contractAddress`, `transactionHash`, `isOnChain`) |
| Hybrid Authentication | `User` + `AuthIdentity` รองรับ `EMAIL_PASSWORD`, `GOOGLE_OAUTH`, `WALLET_SIGN_IN` (wallet login เปิดใช้ใน Phase B) |
| Anti-Cheat / Server-Authoritative | ฝั่ง client ส่งได้เพียง "action" ผลทั้งหมดคำนวณที่ server และเก็บ snapshot ใน `Battle.state` |

## 2. ผังระบบ (สถานะปัจจุบัน = Phase A)

```mermaid
flowchart TB
    subgraph Browser["Browser (ผู้เล่น)"]
        UI["Next.js UI / API client\n(ต่อได้เป็น Phaser Canvas ใน Phase 3)"]
    end

    subgraph Server["Next.js Server (Server-Authoritative)"]
        subgraph API["app/api — thin controllers"]
            E1["auth: register / login / logout / me / google"]
            E2["battles: start · status · action"]
            E3["rewards: list · claim"]
            E4["inventory · shop · health · nft/metadata"]
        end
        subgraph Domain["src/server — domain services"]
            BE["battle-engine (server ตัดสินแพ้ชนะ)"]
            RW["rewards: grant → claim"]
            LG["ledger (double-entry)"]
            SH["shop (economy sink)"]
            OW["ownership adapter (db|chain)"]
            ID["identity (bootstrap / google / wallet scaffold)"]
        end
        DB[(PostgreSQL + Prisma)]
    end

    UI -- REST/JSON + JWT cookie --> API
    API --> BE
    API --> RW
    API --> SH
    API --> OW
    API --> ID
    BE --> DB
    RW --> LG
    SH --> LG
    LG --> DB
```

- Client ไม่มีอำนาจการตัดสินใดเลย: HP, ผลชนะ, รางวัล อ่านกลับจาก server เสมอ
- ผู้เล่นพยายามแก้ค่า JavaScript หรือ packet ก็ไม่กระทบผล เพราะตัวเลขทั้งหมดเกิดที่ server

## 3. Flow สำคัญ 1: รอบการเล่น + การรับรางวัล

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server (Next.js)
    participant DB as PostgreSQL

    C->>S: POST /api/battles { stageCode, characterInvId, weaponInvId? }
    Note over S: ตรวจสิทธิ์ผ่าน Ownership Adapter<br/>คำนวณสถิติ → สร้าง battle state (server only)
    S->>DB: insert Battle(IN_PROGRESS)
    S-->>C: สถานะเริ่ม + log

    loop จนกว่าการต่อสู้จบ (ชนะ / แพ้ / หนี)
        C->>S: POST /api/battles/:id/action { action: "ATTACK|SKILL|GUARD|FLEE" }
        Note over S: คำนวณตาผู้เล่น → ตาศัตรู AI<br/>ดาเมจ/คริท/drop ทั้งหมดเกิดที่นี่
        S->>DB: update Battle (state/turn/status)
        S-->>C: log + HP + สถานะ
    end

    Note over S: เมื่อชนะ สร้าง RewardGrant(PENDING) ทันที
    C->>S: POST /api/rewards/claim
    Note over S: ล็อกแถวรางวัล (status=PENDING) ภายใน tx serializable กัน claim ซ้ำ
    S->>DB: GOLD → Ledger<br/>ITEM → UserInventory<br/>EXP → ยกระดับตัวละคร
    S-->>C: สรุปรางวัลที่รับแล้ว
```

## 4. Flow สำคัญ 2: Web3 Bridge (เวลาถึง Phase C)

หลักการ: server เป็นผู้อนุมัติ (ผ่านลายเซ็น EIP-712) — ผู้เล่นเรียก claim mint ด้วยกระเป๋าของตัวเอง แล้ว indexer ยืนยันสถานะกลับเข้า DB

```mermaid
sequenceDiagram
    participant C as Client (wallet เช่น MetaMask)
    participant S as Game Server
    participant KC as Kub Chain (ERC-721/1155)

    C->>S: "อยากเปลี่ยน weapon_iron_sword ไปเป็น NFT"
    Note over S: ตรวจ: asset ยังไม่ถูก mint, อยู่สถานะ ACTIVE, ผ่าน battle จริง<br/>set สถานะ LOCKED กันเล่นสองทาง
    S->>C: return signed voucher (EIP-712) { itemId, owner, expiry, sig }
    C->>KC: claimItem(voucher) — ผู้เล่นเซ็น + จ่าย gas เอง
    KC->>S: event ItemMinted(tokId, owner, txHash)

    Loop Indexer (worker บน server)
        S->>S: ยืนยัน event = ข้อมูล DB
        S->>DB: ตั้ง isOnChain=true, tokenId, contractAddress, txHash<br/>และเปลี่ยนสถานะเป็น EXPORTED
    End
```

โค้ด scaffold ที่ชี้ทางอันนี้มีอยู่แล้ว:
- `src/server/ownership/chain-provider.ts` — อ่านสิทธิ์ `ownerOf()` ผ่าน JSON-RPC (เปิดเมื่อ `WEB3_BRIDGE_ENABLED=true` + ระบุ contract address)
- `prisma/schema.prisma` — ฟิลด์ Web3 ครบในตาราง `UserInventory` และ `ItemTemplate`
- `src/app/api/nft/metadata/[inventoryId]/route.ts` — JSON ตามมาตรฐาน ERC-721 (ใช้ upload ขึ้น IPFS ภายหลัง)

## 5. ระบบสกุลเงิน: Ledger ↔ Token

| LedgerAccount | ความหมาย | แม็ปเมื่อถึง Phase C |
|---|---|---|
| `player:<userId>` | เหรียญในเกมของผู้เล่น | ยอด token ที่เข้า wallet จริง |
| `system:treasury` | คลังกลางของระบบ (จ่ายรางวัล) | wallet ของ server game |
| `system:shop` | เหรียญที่ออกจากเกมหลังซื้อของ (sink) | burn ที่เกิดจริงปลายทาง |
| `mint` | แหล่งกำเนิดเหรียญ | `GameToken.mint()` โดย server |
| `burn` | ที่ทำไปแล้ว | `GameToken.burn()` |

กติกาบัญชี: `sum(DEBIT) = sum(CREDIT)` ทุก entry — เครื่องรับรองด้วย `postEntry()` และตรวจทุกครั้งได้ด้วย `npm run audit:ledger`

## 6. ข้อมูลอ้างอิง Kub Chain ในโปรเจกต์

| สาย | Chain ID | RPC | Explorer | Symbol |
|---|---|---|---|---|
| KUB Mainnet | `96` | `https://rpc.kubchain.io` | `https://kubscan.com` | KUB |
| KUB Testnet | `25925` | `https://rpc-testnet.kubchain.io` | `https://testnet.kubscan.com` | tKUB (มี faucet) |
| KUB L2 Mainnet | `9601` | `https://kublayer2.kubchain.io` | `https://kublayer2.kubscan.com` | KUB |
| KUB L2 Testnet | `259251` | `https://kublayer2.testnet.kubchain.io` | `https://kublayer2.testnet.kubscan.com` | tKUB |

ตั้งค่าชุดนี้ที่ไฟล์ `.env` (KUB_CHAIN_ID, KUB_CHAIN_RPC_URL, KUB_CHAIN_EXPLORER_URL) — โมดูลทุกชิ้นอ่านผ่าน src/lib/env.ts จุดเดียว

ต่อ: [02-database-schema.md](./02-database-schema.md) · [03-roadmap.md](./03-roadmap.md)