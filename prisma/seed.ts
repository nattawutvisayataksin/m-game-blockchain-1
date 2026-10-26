import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  ACCOUNT_CODES,
  ensureAccount,
  ensurePlayerAccount,
  postEntry,
} from "../src/server/ledger/ledger";

// ============================================================
// SEED — สร้างข้อมูลตั้งต้นทั้งเกมให้พร้อมเล่น (idempotent: รันซ้ำได้)
//   • Item templates (CHARACTER/WEAPON/CONSUMABLE/MATERIAL/LAND) — โครง NFT-ready
//   • Stage templates + drop table
//   • บัญชี Ledger ระบบ + "กำเนิดเหรียญ" เข้า TREASURY ผ่าน double-entry จริง
//   • ผู้เล่นเดโม่: demo@game.dev / demo1234 (พร้อมตัวละคร+ยา+โบนัส)
// ============================================================

const prisma = new PrismaClient();

const GOLD = "GOLD" as const;
const MINT_BUDGET = 10_000_000n;
const DEMO_EMAIL = "demo@game.dev";
const DEMO_PASSWORD = "demo1234";
const DEMO_DISPLAY_NAME = "DemoHero";
const DEMO_SIGNUP_BONUS = 500n;

interface TemplateSeed {
  code: string;
  name: string;
  kind: "WEAPON" | "ARMOR" | "ACCESSORY" | "CONSUMABLE" | "MATERIAL" | "CHARACTER" | "LAND";
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  description: string;
  attributes: Record<string, number>;
  fungible?: boolean;
  shopPrice?: bigint;
}

const TEMPLATES: TemplateSeed[] = [
  {
    code: "char_recruit",
    name: "Recruit",
    kind: "CHARACTER",
    rarity: "COMMON",
    description: "ทหารหนุ่มผู้ออกรบเพื่อปกป้องหมู่บ้านเล็กริมป่า (ตัวละครเริ่มต้น)",
    attributes: { hp: 130, atk: 14, def: 8, spd: 9, crit: 0.08 },
  },
  {
    code: "weapon_wooden_sword",
    name: "Wooden Sword",
    kind: "WEAPON",
    rarity: "COMMON",
    description: "ดาบไม้เรียบง่าย เพิ่มพลังโจมตีเล็กน้อยแต่พอใช้ได้ตอนเริ่มเกม",
    attributes: { atk: 3 },
    shopPrice: 120n,
  },
  {
    code: "weapon_iron_sword",
    name: "Iron Sword",
    kind: "WEAPON",
    rarity: "RARE",
    description: "ดาบเหล็กที่ตีด้วยฝีมือช่างเก่า ทุกการฟันคมชัดกว่าดาบไม้อยู่หลายเท่า",
    attributes: { atk: 8 },
  },
  {
    code: "potion_small",
    name: "Small Potion",
    kind: "CONSUMABLE",
    rarity: "COMMON",
    description: "ยาฟื้นฟูเล็ก ๆ ที่ฟื้นชีวิตให้ฮีโร่กลับมาต่อสู้ได้ในเทิร์นถัดไป (อนาคต: ERC-1155)",
    attributes: { heal: 40 },
    fungible: true,
    shopPrice: 45n,
  },
  {
    code: "material_slime_jelly",
    name: "Slime Jelly",
    kind: "MATERIAL",
    rarity: "COMMON",
    description: "วัตถุดิบเจลี่ยจากก้อนสไลม์ ใช้ทำเครื่องใช้และยาต่าง ๆ (อนาคต: ERC-1155)",
    attributes: { value: 5 },
    fungible: true,
  },
  {
    code: "land_plains_01",
    name: "Plains Parcel #1",
    kind: "LAND",
    rarity: "UNCOMMON",
    description: "ที่ดินทุ่งหญ้าชิ้นที่หนึ่ง เหมาะทำสวนบ้าน/ค่ายเก็บของ (อนาคต: ERC-721)",
    attributes: { yield: 2 },
  },
];

interface StageSeed {
  code: string;
  name: string;
  order: number;
  description: string;
  enemy: Record<string, number | string>;
  dropTable: { templateCode: string; chance: number; qty?: number }[];
  goldMin: number;
  goldMax: number;
  expReward: number;
}

const STAGES: StageSeed[] = [
  {
    code: "stage_01_slime_fields",
    name: "Slime Fields",
    order: 1,
    description: "ทุ่งหญ้ากว้างที่มีสไลม์เขียวเรียงแถวไปเรื่อย ๆ — ด่านทดสอบพื้นฐานของเกม",
    enemy: { name: "Green Slime", hp: 60, atk: 10, def: 3, spd: 5, crit: 0.04 },
    expReward: 30,
    goldMin: 25,
    goldMax: 55,
    dropTable: [
      { templateCode: "material_slime_jelly", chance: 0.7, qty: 1 },
      { templateCode: "weapon_wooden_sword", chance: 0.15 },
    ],
  },
  {
    code: "stage_02_goblin_camp",
    name: "Goblin Camp",
    order: 2,
    description: "แคนเร่ร่อนของพวกก็อบลิน จบด่านด้วยหัวหน้าที่ต้องเริ่มด้วยฝีมือกันมากพอ",
    enemy: { name: "Goblin Warrior", hp: 100, atk: 14, def: 6, spd: 8, crit: 0.08 },
    expReward: 65,
    goldMin: 50,
    goldMax: 95,
    dropTable: [
      { templateCode: "potion_small", chance: 0.35 },
      { templateCode: "weapon_iron_sword", chance: 0.1 },
    ],
  },
  {
    code: "stage_03_king_slime_lair",
    name: "King Slime Lair",
    order: 3,
    description: "ถ้ำจบด่านที่มี King Slime ครองตำแหน่ง รางวัลแน่หนาแต่ก็ชินและปลอดภัยอยู่แล้ว",
    enemy: { name: "King Slime", hp: 180, atk: 18, def: 8, spd: 6, crit: 0.12 },
    expReward: 150,
    goldMin: 120,
    goldMax: 220,
    dropTable: [
      { templateCode: "potion_small", chance: 0.6 },
      { templateCode: "land_plains_01", chance: 0.05 },
    ],
  },
];

const DEMO_STARTER = [
  { code: "char_recruit", quantity: 1, instance: { level: 1, exp: 0, currentHp: null, equipment: {} } },
  { code: "potion_small", quantity: 3, instance: {} },
];

async function main(): Promise<void> {
  console.log("=== M-Game Blockchain: seed ===");

  // --- 1) บัญชี Ledger ระบบ ---
  await ensureAccount(prisma, {
    code: ACCOUNT_CODES.treasury,
    name: "คลังทุนของระบบ (จ่ายรางวัลจากที่นี่)",
    type: "TREASURY",
    currency: GOLD,
  });
  await ensureAccount(prisma, {
    code: ACCOUNT_CODES.shop,
    name: "เหรียญที่รับจากร้านค้า (economy sink)",
    type: "SYSTEM",
    currency: GOLD,
  });
  await ensureAccount(prisma, {
    code: ACCOUNT_CODES.mint,
    name: "แหล่งกำเนิดเหรียญ (อนาคต: Token mint role ของ Server)",
    type: "MINT",
    currency: GOLD,
  });
  await ensureAccount(prisma, {
    code: ACCOUNT_CODES.burn,
    name: "ถังเผาเหรียญ (อนาคต: Token burn)",
    type: "BURN",
    currency: GOLD,
  });

  // --- 2) กำเนิดเหรียญ GOLD ครั้งแรก: DEBIT treasury / CREDIT mint ---
  const mintCount = await prisma.ledgerEntry.count({ where: { refType: "MINT_BUDGET" } });
  if (mintCount === 0) {
    await postEntry(prisma, {
      refType: "MINT_BUDGET",
      memo: `ออกงบประมาณเหรียญ GOLD เริ่มต้น ${MINT_BUDGET}`,
      lines: [
        { accountCode: ACCOUNT_CODES.treasury, side: "DEBIT", amount: MINT_BUDGET },
        { accountCode: ACCOUNT_CODES.mint, side: "CREDIT", amount: MINT_BUDGET },
      ],
    });
    console.log("• MINT_BUDGET: บันทึกบัญชีครั้งแรกเรียบร้อย");
  } else {
    console.log("• MINT_BUDGET มีอยู่แล้ว — ข้าม");
  }

  // --- 3) Item templates ---
  for (const t of TEMPLATES) {
    await prisma.itemTemplate.upsert({
      where: { code: t.code },
      create: {
        code: t.code,
        name: t.name,
        kind: t.kind,
        rarity: t.rarity,
        description: t.description,
        attributes: t.attributes,
        fungible: t.fungible ?? false,
        shopPrice: t.shopPrice ?? null,
      },
      update: {
        name: t.name,
        kind: t.kind,
        rarity: t.rarity,
        description: t.description,
        attributes: t.attributes,
        fungible: t.fungible ?? false,
        shopPrice: t.shopPrice ?? null,
      },
    });
  }
  console.log(`• item templates: ${TEMPLATES.length} ชิ้น`);

  // --- 4) Stage templates (รวม category exp/gold ของรางวัลใน enemy json) ---
  for (const s of STAGES) {
    const enemy: Record<string, unknown> = { ...s.enemy };
    enemy["expReward"] = s.expReward;
    enemy["goldMin"] = s.goldMin;
    enemy["goldMax"] = s.goldMax;

    await prisma.stageTemplate.upsert({
      where: { code: s.code },
      create: {
        code: s.code,
        name: s.name,
        order: s.order,
        description: s.description,
        enemy: enemy as unknown as Prisma.InputJsonValue,
        dropTable: s.dropTable as unknown as Prisma.InputJsonValue,
      },
      update: {
        name: s.name,
        order: s.order,
        description: s.description,
        enemy: enemy as unknown as Prisma.InputJsonValue,
        dropTable: s.dropTable as unknown as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`• stage templates: ${STAGES.length} ด่าน`);

  // --- 5) ผู้เล่นเดโม่ (สมัครใช้งานได้จริงเลย) ---
  const demoIdentity = await prisma.authIdentity.findUnique({
    where: { provider_subject: { provider: "EMAIL_PASSWORD", subject: DEMO_EMAIL } },
  });
  if (!demoIdentity) {
    const user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        displayName: DEMO_DISPLAY_NAME,
        passwordHash: hashPassword(DEMO_PASSWORD),
        identities: { create: { provider: "EMAIL_PASSWORD", subject: DEMO_EMAIL } },
      },
    });

    await prisma.$transaction(async (tx) => {
      await ensurePlayerAccount(tx, user.id);

      for (const starter of DEMO_STARTER) {
        const template = await tx.itemTemplate.findUnique({ where: { code: starter.code } });
        if (!template) continue;
        await tx.userInventory.create({
          data: {
            userId: user.id,
            templateId: template.id,
            quantity: starter.quantity,
            instanceData: starter.instance,
          },
        });
      }

      await postEntry(tx, {
        refType: "SIGNUP_BONUS",
        refId: user.id,
        memo: `โบนัสต้อนรับผู้เล่นใหม่ (${DEMO_DISPLAY_NAME})`,
        lines: [
          { accountCode: `player:${user.id}`, side: "DEBIT", amount: DEMO_SIGNUP_BONUS },
          { accountCode: ACCOUNT_CODES.treasury, side: "CREDIT", amount: DEMO_SIGNUP_BONUS },
        ],
      });
    });
    console.log(`• ผู้เล่นเดโม่: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log("• ผู้เล่นเดโม่มีอยู่แล้ว — ข้าม");
  }
}

main()
  .then(() => {
    console.log("=== seed เสร็จสมบูรณ์ ===");
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
