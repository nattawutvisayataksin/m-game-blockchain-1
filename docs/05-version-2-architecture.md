# M-Game Version 2 — Architecture

## หลักการ

V2 ใช้สถาปัตยกรรมแบบ local-first guest game และแยก core gameplay ออกจาก account/economy เดิมอย่างชัดเจน

```text
Browser
  └─ GameShell + Zustand
      ├─ GuestSession (localStorage)
      ├─ BattleDirector (client game loop)
      ├─ Pixel Renderer (Canvas 320×180)
      └─ Progression Store

Optional services
  ├─ Guest save API (ภายหลัง)
  ├─ Account sync (ภายหลัง)
  └─ Cloud leaderboard (ภายหลัง)
```

## ขอบเขต V2

### ใช้

- Next.js App Router
- React + Zustand
- Canvas 2D procedural pixel art
- Local guest session
- Client-side game state สำหรับ prototype ความสนุก
- Server API เฉพาะเมื่อจำเป็นสำหรับ cloud save ในอนาคต

### ยังไม่ใช้

- Login/Register เป็น requirement
- Blockchain, wallet, NFT, ownership adapter
- Ledger, token economy, double-entry accounting
- Database dependency สำหรับการเริ่มเล่น

## State model

```ts
interface V2GameState {
  mode: "guest" | "account";
  screen: "start" | "hub" | "loadout" | "stageSelect" | "battle" | "results";
  player: PlayerProfile;
  roster: HeroProfile[];
  stages: StageDefinition[];
  activeBattle: BattleSession | null;
  tutorialCompleted: boolean;
}
```

## Battle model

Battle state แยกเป็น:

- `BattleSession`: ผู้เล่น, ศัตรู, turn, AP, momentum
- `BattleAction`: ATTACK, SKILL, GUARD, ITEM, FINISHER
- `BattleEvent`: animation event ที่ renderer นำไปเล่น
- `BattleResult`: win, loss, rewards, unlocks

การคำนวณและ animation ต้องแยกจากกัน:

```text
BattleDirector คำนวณผล
  → BattleEvent[]
      → BattleRenderer เล่นภาพ/เสียง
```

## Asset architecture

V2 ใช้ asset registry เดียว:

- `src/components/game/pixel/assets.ts`
- `src/components/game/pixel/sprites.ts`
- `src/components/game/pixel/scenes.ts`
- `src/components/game/pixel/renderer.ts`

ทุกตัวละครและมอนสเตอร์ต้องประกาศ:

- silhouette
- palette
- idle animation
- attack animation
- hit reaction
- defeat animation
- shadow

## Migration strategy

1. เพิ่ม V2 route/screen แบบ Guest ก่อน
2. รักษา API และไฟล์ V1 ไว้ชั่วคราวเพื่อ rollback
3. ย้าย `GameShell` ไปใช้ `V2GameShell` เมื่อ core loop ผ่านการทดสอบ
4. ลบ auth/shop/ledger path หลัง V2 ผ่าน smoke test แล้ว
5. ไม่แก้ไข `mini-game/`

## Definition of Done

- เปิด `/play` แล้วเริ่มเกมได้โดยไม่ login
- เล่น tutorial และ stage แรกจบได้
- มี 3 action ที่แตกต่างทางภาพและผลลัพธ์
- มี XP, level-up, reward, unlock
- reload แล้วยัง resume guest progress ได้จาก localStorage
- typecheck และ production build ผ่าน
