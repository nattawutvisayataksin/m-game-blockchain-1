const ENDPOINTS: { method: string; path: string; note: string }[] = [
  { method: "GET", path: "/api/health", note: "สถานะระบบ + เช็คต่อ database" },
  { method: "POST", path: "/api/auth/register", note: "สมัคร (email/password) — จัดบัญชี GOLD + ชุดเริ่มเกมให้อัตโนมัติ" },
  { method: "POST", path: "/api/auth/login", note: "เข้าสู่ระบบ (JWT cookie + bearer token)" },
  { method: "GET", path: "/api/auth/me", note: "โปรไฟล์ + ยอด GOLD + สถานะ Web3 readiness" },
  { method: "GET", path: "/api/stages", note: "รายการสเตจ" },
  { method: "POST", path: "/api/battles", note: "เริ่มต่อสู้ (server-authoritative)" },
  { method: "GET", path: "/api/battles/:id", note: "สถานะต่อสู้ล่าสุด" },
  { method: "POST", path: "/api/battles/:id/action", note: "ส่ง action: ATTACK/SKILL/GUARD/FLEE" },
  { method: "GET", path: "/api/inventory", note: "คลัง items + สถานะ + ช่องข้อมูล Web3" },
  { method: "GET", path: "/api/shop", note: "ร้านค้า" },
  { method: "POST", path: "/api/shop/purchase", note: "ซื้อ → เดิน Ledger (DEBIT shop / CREDIT player)" },
  { method: "GET", path: "/api/rewards", note: "รางวัลที่รอรับ (PENDING)" },
  { method: "POST", path: "/api/rewards/claim", note: "รับรางวัล → เดิน Ledger + เลเวลอัป + ไอเทม" },
  { method: "POST", path: "/api/ownership/check", note: "ตรวจสิทธิ์ asset ผ่าน Ownership Adapter" },
  { method: "GET", path: "/api/nft/metadata/:inventoryId", note: "ERC-721 metadata JSON (พร้อมสำหรับ IPFS)" },
  { method: "RUN", path: "npm run audit:ledger", note: "สคริปต์ตรวจสมดุลสมุดบัญชี (DEBIT == CREDIT)" },
];

export default function Home() {
  return (
    <main className="panel">
      <h1>⚔️ M-Game Blockchain — 2D Turn-based RPG</h1>
      <p className="muted">
        Backend Core (Phase A/B-ready) สร้างบน <strong>Next.js + Prisma + PostgreSQL</strong> —
        Server-Authoritative, Double-entry Game Ledger, และฟิลด์ฐานข้อมูล Web3-ready
        เพื่อเดินไป <strong>Kub Chain (EVM, chainId 96 / testnet 25925)</strong>
        ใน Phase C ได้โดยไม่ต้องเขียนระบบใหม่
      </p>

      <p>
        <span className="badge b-ready">READY: Web2 core (auth/battle/ledger/claim)</span>{" "}
        <span className="badge b-wait">PHASE B: wallet connect (scaffold รอเปิด)</span>{" "}
        <span className="badge b-wait">PHASE C: minting (adapter + schema รองรับแล้ว)</span>
      </p>

      <p style={{ margin: "18px 0" }}>
        <a href="/play" style={{ fontSize: 20, fontWeight: 700, textDecoration: "none" }}>
          ▶️ เปิดเกมแล้วเล่นได้เลยที่ /play
        </a>{" "}
        <small className="muted">(บัญชีทดสอบ demo@game.dev / demo1234)</small>
      </p>

      <h2>เล่นทดสอบได้ทันที (curl/Postman)</h2>
      <pre>{`1) docker compose up -d   →  PostgreSQL
2) npm install && npm run db:push && npm run db:seed
3) npm run dev
4) POST /api/auth/register { "email": "p1@x.co", "password": "pass1234", "displayName": "Hero1" }
5) GET  /api/stages ดูสเตจ → POST /api/battles {stageCode, characterInvId}
6) POST /api/battles/:id/action { "action": "ATTACK" } จนชนะ
7) POST /api/rewards/claim`}</pre>

      <h2>รายการ endpoint</h2>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>คำอธิบาย</th>
          </tr>
        </thead>
        <tbody>
          {ENDPOINTS.map((e) => (
            <tr key={`${e.method}-${e.path}`}>
              <td><code>{e.method}</code></td>
              <td><code>{e.path}</code></td>
              <td className="muted">{e.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted">
        เอกสารสถาปัตยกรรม: <code>docs/01-architecture.md</code> ·
        ERD: <code>docs/02-database-schema.md</code> ·
        Roadmap: <code>docs/03-roadmap.md</code>
      </p>
    </main>
  );
}
