# ⚔️ M-Game Blockchain — 2D Turn-based RPG (Pixel Art)

เกม turn-based RPG ออนไลน์บนเบราว์เซอร์ ที่สร้าง **Web2 ให้เล่นได้จริงและสนุกก่อน**
แต่วางสถาปัตยกรรมให้พร้อมพาไป **Kub Chain (EVM)** ในอนาคตโดยไม่ต้องเขียนระบบใหม่

![status](https://img.shields.io/badge/phase-A%20(Web2%20core)%20%2B%20Pixel%20Game-blue) ![next](https://img.shields.io/badge/Next.js-15-black) ![prisma](https://img.shields.io/badge/Prisma-6-2D3748) ![db](https://img.shields.io/badge/PostgreSQL-16-336791)

## เล่นได้ทันที (3 คำสั่ง)

```bash
docker compose up -d      # 1) รัน PostgreSQL
npm install && npm run setup   # 2) ติดตั้ง + สร้าง schema + ใส่ข้อมูลเริ่มต้น
npm run dev               # 3) เปิด http://localhost:3000/play แล้วเล่นได้เลย
```

บัญชีทดสอบสำเร็จรูป: `demo@game.dev` / `demo1234` (หรือกดสมัครใหม่ในหน้าเว็บ)

> `npm run setup` = `prisma db push` + `prisma seed` + เช็คระบบบัญชี
>
> หมายเหตุ: ถ้า port 3000 ถูกโปรแกรมอื่นครองอยู่ Next.js จะสลับไป port ว่างเอง
> (เช่น `http://localhost:3001/play`) — ดู URL จากบรรทัด `- Local:` ตอนรัน `npm run dev`

## เกมเล่นอะไรได้ตอนนี้ (Phase A — เน้น "สนุก")

- ✦ **Pixel Art เต็มระบบ**: ตัวละคร/มอนสเตอร์/ฉาก/อนิเมชัน วาดด้วยโค้ด (canvas + `image-rendering: pixelated`)
- ✦ **Battle เต็มอารมณ์**: animation โจมตี/สกิล/ป้องกัน/หนี, flash + screen shake, particles, ตัวเลขดาเมจลอย, HP bar pixel, Log เป็นภาษาไทย
- ✦ **Stage Select** 3 ด่าน (Slime Fields / Goblin Camp / King Slime Lair) แต่ละด่านมีภาพฉากคนละแบบ (กลางวัน/ยามเย็น/ถ้ำมืด)
- ✦ **โปรเฟสระดับเลเวล / EXP / ดาเมจสูงขึ้น**, Inventory, Shop (ซื้อยา/ดาบด้วย GOLD)
- ✦ Server-Authoritative 100%: ฝั่ง client ส่งได้แค่ท่า (ATTACK/SKILL/GUARD/FLEE) — ผลทั้งหมดคำนวณจาก server (กันแก้ค่า/ดัก packet)
- ✦ ระบบเสริมแพ็ก: Game Ledger (double-entry audit ได้), Ownership Adapter, ช่อง Web3 รองรับ ทุกชิ้น "วางรอไว้แบบต่อได้จริง" (schema/metadata/bridge-adapter)

## Roadmap สั้น ๆ

| Phase | สิ่งที่ทำ | สถานะ |
|---|---|---|
| A | Core Web2 + Pixel game frontend | ✅ ใน repo นี้ |
| B | Connect Wallet + SIWE (scaffold พร้อม) | ⏳ รอเปิด |
| C | NFT/Token บน Kub Chain (Adapter+schema รองรับแล้ว) | 🔬 ออกแบบไว้ |

รายละเอียดทั้งหมดอยู่ที่ `docs/` (01-architecture, 02-database-schema, 03-roadmap)

## สถาปัตยกรรม (ย่อ)

```
Browser (pixel canvas + zustand store)
  └─ REST (คุยกับ server ด้วย action เท่านั้น)
      └─ Next.js API routes
          ├─ battle-engine (server ตัดสินทุกตัวเลข)
          ├─ rewards → Ledger (double-entry)
          ├─ inventory/shop
          └─ ownership adapter (db ↔ on-chain สลับได้)
              └─ PostgreSQL (Prisma · ฟิลด์ Web3-ready ครบ)
```

## หมายเหตุของระบบบัญชี (สำคัญตอนขึ้น Token)

ทุกการเปลี่ยนเหรียญ GOLD เกิดใน `LedgerEntry` (บัญชีคู่ DEBIT/CREDIT ต้องสมดุลเสมอ) → ตรวจได้:

```bash
npm run audit:ledger
```

ตอนขึ้น chain คือค่อย mapping `player` ↔ wallet balance, `mint` ↔ `GameToken.mint()` ฯลฯ (ดู `docs/02-database-schema.md`)

## Scripts

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน Next.js dev server |
| `npm run build` | build ตัว production |
| `npm run db:push` / `db:migrate` | สร้าง/อัปเดต schema ลง database |
| `npm run db:seed` | ใส่ข้อมูลตั้งต้น (templates/stages/demo user) |
| `npm run setup` | db push + seed ในคำสั่งเดียว |
| `npm run audit:ledger` | ตรวจสมดุลสมุดบัญชี double-entry |

## เทคนิคอย่างย่อ

- **Backend**: Next.js 15 (App Router) · TypeScript strict · Prisma · PostgreSQL · JWT (jose) · scrypt password · zod validation
- **เกม**: HTML5 Canvas `image-rendering: pixelated` resolution 320×180, sprites นิยามเป็นรเมทริกซ์ในโค้ด (ไม่พึ่งไฟล์ภาพภายนอก), อนิเมชันแบบ state machine เชื่อกับ event ที่ server ส่งกลับ
- **Web3 (รอเปิด)**: Kub Chain — Mainnet `96`, Testnet `25925` · RPC/Explorer ตั้งใน `.env` · adapter อ่าน `ownerOf()` ผ่าน JSON-RPC เมื่อเปิด `WEB3_BRIDGE_ENABLED`
