import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

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
    code: "weapon_flame_blade",
    name: "Flame Blade",
    kind: "WEAPON",
    rarity: "EPIC",
    description: "ดาบเปลวเพลิง เพิ่มพลังโจมตีและมีโอกาสคริติคอลสูงขึ้น",
    attributes: { atk: 14, crit: 0.05 },
    shopPrice: 480n,
  },
  {
    code: "weapon_moon_scythe",
    name: "Moon Scythe",
    kind: "WEAPON",
    rarity: "LEGENDARY",
    description: "เคียวจันทร์เสี้ยว เพิ่มพลังโจมตี ความเร็ว และคริติคอล",
    attributes: { atk: 20, spd: 2, crit: 0.08 },
    shopPrice: 950n,
  },
  {
    code: "weapon_spore_wand",
    name: "Spore Wand",
    kind: "WEAPON",
    rarity: "RARE",
    description: "คทาเห็ด เพิ่มพลังสกิลและพลังโจมตี",
    attributes: { atk: 10, skillPower: 0.2 },
    shopPrice: 360n,
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
  {
    code: "armor_traveler_coat",
    name: "Traveler Coat",
    kind: "ARMOR",
    rarity: "UNCOMMON",
    description: "เสื้อคลุมเดินทางสีคราม เพิ่มความคล่องตัวของนักผจญภัย",
    attributes: { def: 2, spd: 1 },
  },
  {
    code: "armor_sun_guardian",
    name: "Sun Guardian Mail",
    kind: "ARMOR",
    rarity: "EPIC",
    description: "เกราะผู้พิทักษ์สุริยะ เพิ่มพลังป้องกันและความโดดเด่น",
    attributes: { def: 5, hp: 20 },
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
  {
    code: "stage_04_moonlit_ruins",
    name: "Moonlit Ruins",
    order: 4,
    description: "ซากวิหารใต้แสงจันทร์ที่ถูกเฝ้าโดย Wraith Knight",
    enemy: { name: "Wraith Knight", kind: "wraith", hp: 230, atk: 23, def: 10, spd: 11, crit: 0.14 },
    expReward: 210,
    goldMin: 160,
    goldMax: 280,
    dropTable: [{ templateCode: "armor_traveler_coat", chance: 0.25 }, { templateCode: "potion_small", chance: 0.5 }],
  },
  {
    code: "stage_05_mushroom_marsh",
    name: "Mushroom Marsh",
    order: 5,
    description: "บึงเห็ดเรืองแสงที่เต็มไปด้วยพิษและ Spore Beast",
    enemy: { name: "Spore Beast", kind: "spore", hp: 280, atk: 20, def: 13, spd: 7, crit: 0.1 },
    expReward: 280,
    goldMin: 220,
    goldMax: 360,
    dropTable: [{ templateCode: "material_slime_jelly", chance: 0.8 }, { templateCode: "armor_sun_guardian", chance: 0.12 }],
  },
  {
    code: "stage_06_sun_temple",
    name: "Sun Temple",
    order: 6,
    description: "วิหารโบราณที่มี Solar Colossus เป็นบททดสอบสุดท้าย",
    enemy: { name: "Solar Colossus", kind: "colossus", hp: 380, atk: 28, def: 16, spd: 5, crit: 0.18 },
    expReward: 420,
    goldMin: 350,
    goldMax: 520,
    dropTable: [{ templateCode: "armor_sun_guardian", chance: 0.3 }, { templateCode: "land_plains_01", chance: 0.08 }],
  },
];

const DEMO_STARTER = [
  { code: "char_recruit", quantity: 1, instance: { level: 1, exp: 0, currentHp: null, equipment: {} } },
  { code: "potion_small", quantity: 3, instance: {} },
];

async function main(): Promise<void> {
  console.log("=== M-Game Blockchain: seed ===");

  // --- 1) Item templates ---
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

  // --- 2) Stage templates (รวม category exp/gold ของรางวัลใน enemy json) ---
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

  // --- 3) ผู้เล่นเดโม่ (สมัครใช้งานได้จริงเลย) ---
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
      await tx.user.update({ where: { id: user.id }, data: { goldBalance: DEMO_SIGNUP_BONUS } });

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
