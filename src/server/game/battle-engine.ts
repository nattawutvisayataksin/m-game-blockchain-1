import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError, badRequest, conflict, notFound } from "@/lib/http";
import { assertUserOwns } from "@/server/ownership";
import { characterStats, enemyStats } from "./stats";

// ============================================================
// BATTLE ENGINE — Server-Authoritative (ข้อกำหนดหลักของโปรเจกต์)
// ------------------------------------------------------------
// กติกา:
//   • ฝั่ง client ส่งมาแค่ "action" (ATTACK/SKILL/GUARD/FLEE) เท่านั้น
//   • ผลทั้งหมด (ดาเมจ/คริ/ตาศัตรู/drop/gold) คำนวณที่ server แล้วเก็บเป็น
//     Battle.state (snapshot) — ไม่เชื่อค่าที่ client อ้างอิงเด็ดขาด
//   • ชนะ → สร้าง RewardGrant สถานะ PENDING ก่อน → ผู้เล่นค่อย "claim"
// ============================================================

export type BattleAction = "ATTACK" | "SKILL" | "GUARD" | "FLEE";

export const BATTLE_ACTIONS: BattleAction[] = ["ATTACK", "SKILL", "GUARD", "FLEE"];

// เหตุการณ์ที่ server คำนวณแล้ว "ไล่ลำดับส่งกลับ" ให้ client replay เป็นอนิเมชัน
// (seq ต่อเนื่องกัน ใช้กรองว่าอะไรที่ client เล่นไปแล้ว)
export type BattleEvent =
  | { seq: number; kind: "player_attack"; damage: number; crit: boolean; enemyHpAfter: number }
  | { seq: number; kind: "player_skill"; damage: number; crit: boolean; enemyHpAfter: number }
  | { seq: number; kind: "player_guard" }
  | { seq: number; kind: "player_flee"; success: boolean }
  | {
      seq: number;
      kind: "enemy_attack";
      damage: number;
      crit: boolean;
      heavy: boolean;
      playerHpAfter: number;
    }
  | { seq: number; kind: "battle_end"; result: "WON" | "LOST" | "FLED" };

const MAX_EVENTS = 200;

interface CombatantState {
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
}

interface BattleCoreState {
  player: CombatantState;
  enemy: CombatantState;
  skillCd: number; // > 0 = ยังเรียกใช้สกิลไม่ได้อีกกี่ turn
  defending: boolean; // ลดดาเมจศัตรู 50% หนึ่งตา
  log: string[];
  events: BattleEvent[]; // ประวัติเหตุการณ์ (แคปที่ MAX_EVENTS)
  nextEventSeq: number; // นับลำดับเหตุการณ์ถัดไป
}

const MAX_LOG_LINES = 60;

function clampPositive(n: number): number {
  return Math.max(1, Math.floor(n));
}

function clampZero(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** คำนวณดาเมจ: ฐาน = 2*atk − def, ช่วงสุ่ม 90–110%, คริ 1.6 เท่า */
function damage(
  attacker: CombatantState,
  defender: CombatantState,
  scale: number,
): { dmg: number; crit: boolean } {
  const base = clampPositive(attacker.atk * 2 - defender.def);
  const variance = 0.9 + Math.random() * 0.2;
  const crit = Math.random() < attacker.crit;
  let dmg = clampPositive(base * scale * variance);
  if (crit) dmg = clampPositive(dmg * 1.6);
  return { dmg, crit };
}

function addLog(state: BattleCoreState, line: string): void {
  state.log.push(line);
  if (state.log.length > MAX_LOG_LINES) {
    state.log.splice(0, state.log.length - MAX_LOG_LINES);
  }
}

function tickSkillCd(state: BattleCoreState): void {
  if (state.skillCd > 0) state.skillCd -= 1;
}

type NewBattleEvent =
  | { kind: "player_attack"; damage: number; crit: boolean; enemyHpAfter: number }
  | { kind: "player_skill"; damage: number; crit: boolean; enemyHpAfter: number }
  | { kind: "player_guard" }
  | { kind: "player_flee"; success: boolean }
  | { kind: "enemy_attack"; damage: number; crit: boolean; heavy: boolean; playerHpAfter: number }
  | { kind: "battle_end"; result: "WON" | "LOST" | "FLED" };

function pushEvent(state: BattleCoreState, event: NewBattleEvent): void {
  state.events.push({ ...event, seq: state.nextEventSeq } as BattleEvent);
  state.nextEventSeq += 1;
  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS);
  }
}

function applyDamage(target: CombatantState, dmg: number): void {
  target.hp = Math.max(0, target.hp - dmg);
}

// ------------------------------------------------------------
// public view กลางสำหรับ client
// ------------------------------------------------------------
export interface BattleViewRewardItem {
  code: string;
  name: string;
  rarity: string;
  quantity: number;
}

export interface BattleView {
  id: string;
  stage: { code: string; name: string };
  status: string;
  turn: number;
  player: { name: string; hp: number; maxHp: number };
  enemy: { name: string; hp: number; maxHp: number };
  skillCd: number;
  log: string[];
  events?: BattleEvent[];
  rewards?: {
    id: string;
    type: "GOLD" | "EXP" | "ITEM";
    quantity?: string;
    item?: BattleViewRewardItem;
  }[];
}

type BattleRow = {
  id: string;
  status: string;
  turn: number;
  state: unknown;
  stage: { code: string; name: string };
};

function viewOf(
  row: BattleRow,
  rewards?: BattleView["rewards"],
): BattleView {
  const state = row.state as unknown as BattleCoreState;
  const view: BattleView = {
    id: row.id,
    stage: row.stage,
    status: row.status,
    turn: row.turn,
    player: { name: state.player.name, hp: state.player.hp, maxHp: state.player.maxHp },
    enemy: { name: state.enemy.name, hp: state.enemy.hp, maxHp: state.enemy.maxHp },
    skillCd: state.skillCd,
    log: state.log.slice(-12),
  };
  if (state.events && state.events.length > 0) view.events = state.events;
  if (rewards && rewards.length > 0) view.rewards = rewards;
  return view;
}

async function battleRewardsView(battleId: string): Promise<BattleView["rewards"] | undefined> {
  const grants = await prisma.rewardGrant.findMany({
    where: { refType: "BATTLE", refId: battleId },
    include: { itemTemplate: { select: { code: true, name: true, rarity: true } } },
    orderBy: { grantedAt: "asc" },
  });
  if (grants.length === 0) return undefined;
  return grants.map((g) => ({
    id: g.id,
    type: g.type,
    quantity: g.quantity !== null && g.quantity !== undefined ? g.quantity.toString() : undefined,
    item:
      g.itemTemplate && g.type === "ITEM"
        ? {
            code: g.itemTemplate.code,
            name: g.itemTemplate.name,
            rarity: g.itemTemplate.rarity,
            quantity: clampZero(Number(g.quantity ?? 1)),
          }
        : undefined,
  }));
}

// ------------------------------------------------------------
// เริ่มการต่อสู้
// ------------------------------------------------------------
export interface StartBattleInput {
  stageCode: string;
  characterInvId: string;
  weaponInvId?: string;
}

export async function startBattle(userId: string, input: StartBattleInput): Promise<BattleView> {
  if (!input.characterInvId) throw badRequest("ต้องระบุตัวละคร (characterInvId) ที่จะออกสู่การต่อสู้");

  // 1) ตรวจสิทธิ์ asset ทุกชิ้น ผ่าน Ownership Adapter
  const idsToCheck = [input.characterInvId, input.weaponInvId].filter(Boolean) as string[];
  await assertUserOwns(userId, idsToCheck);

  // 2) ตัวละคร
  const character = await prisma.userInventory.findUnique({
    where: { id: input.characterInvId },
    include: { template: true },
  });
  if (!character || character.userId !== userId) throw notFound("ไม่พบตัวละครนี้");
  if (character.status !== "ACTIVE") throw conflict("ตัวละครนี้ไม่พร้อมใช้งานขณะนี้");
  if (character.template.kind !== "CHARACTER") throw badRequest("asset ที่ใช้ต่อสู้ต้องเป็นชนิด CHARACTER");

  // 3) อาวุธ (ถ้าส่งมา) — เพิ่ม atk ให้ตัวละคร
  let weaponAtk = 0;
  if (input.weaponInvId) {
    const weapon = await prisma.userInventory.findUnique({
      where: { id: input.weaponInvId },
      include: { template: true },
    });
    if (!weapon || weapon.userId !== userId) throw notFound("ไม่พบอาวุธที่เลือก");
    if (weapon.template.kind !== "WEAPON") throw badRequest("asset ที่จะติดตั้งต้องเป็นชนิด WEAPON");
    const wAttrs = (weapon.template.attributes ?? {}) as Record<string, unknown>;
    weaponAtk = clampZero(Number(wAttrs.atk ?? 0));
  }

  // 4) กันสร้างการต่อสู้ซ้อนไว้หลายอัน
  const ongoing = await prisma.battle.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (ongoing) {
    throw conflict("มีการต่อสู้ค้างอยู่ — จบการต่อสู้เดิมก่อน (submit action หรือ FLEE)");
  }

  // 5) อ่านสเตจ
  const stage = await prisma.stageTemplate.findUnique({ where: { code: input.stageCode } });
  if (!stage) throw notFound("ไม่พบสเตจนี้");

  // 6) คำนวณสถิติทั้งสองฝ่าย จากข้อมูล server เท่านั้น
  const instance = (character.instanceData ?? {}) as Record<string, unknown>;
  const level = clampZero(Number(instance.level ?? 1));
  const pStats = characterStats(character.template.attributes, level);
  const eStats = enemyStats(stage.enemy);

  const playerCombatant: CombatantState = {
    name: `${character.template.name} Lv.${level}`,
    hp: pStats.hp,
    maxHp: pStats.hp,
    atk: pStats.atk + weaponAtk,
    def: pStats.def,
    spd: pStats.spd,
    crit: pStats.crit,
  };
  const enemyCombatant: CombatantState = {
    name: eStats.name,
    hp: eStats.hp,
    maxHp: eStats.hp,
    atk: eStats.atk,
    def: eStats.def,
    spd: eStats.spd,
    crit: eStats.crit,
  };

  const state: BattleCoreState = {
    player: playerCombatant,
    enemy: enemyCombatant,
    skillCd: 0,
    defending: false,
    log: [
      `⚔️ เริ่มการต่อสู้: ${playerCombatant.name} ปะทะ ${enemyCombatant.name}`,
      weaponAtk > 0 ? `🔫 อาวุธเสริมพลังโจมตี +${weaponAtk}` : "🖐️ ต่อสู้ด้วยมือเปล่า",
    ],
    events: [],
    nextEventSeq: 1,
  };

  const created = await prisma.battle.create({
    data: {
      userId,
      stageId: stage.id,
      characterInvId: character.id,
      status: "IN_PROGRESS",
      turn: 0,
      state: state as unknown as Prisma.InputJsonValue,
    },
    include: { stage: { select: { code: true, name: true } } },
  });

  return viewOf(created);
}

// ------------------------------------------------------------
// เดินการต่อสู้ทีละ turn: ผู้เล่นลงมือก่อน แล้วศัตรูโต้
// ------------------------------------------------------------
export async function submitAction(
  userId: string,
  battleId: string,
  action: BattleAction,
): Promise<BattleView> {
  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { stage: { select: { code: true, name: true } } },
  });
  if (!battle || battle.userId !== userId) throw notFound("ไม่พบการต่อสู้นี้");
  if (battle.status !== "IN_PROGRESS") {
    throw conflict(`การต่อสู้นี้ปิดการเล่นแล้ว (สถานะ: ${battle.status})`);
  }

  const state = battle.state as unknown as BattleCoreState;
  let status: string = battle.status;
  let finishedAt: Date | null = null;
  let rewardsGranted = battle.rewardsGranted;

  addLog(state, `— Turn ${battle.turn + 1} —`);

  // ----- ตา "ผู้เล่น" -----
  switch (action) {
    case "ATTACK": {
      const { dmg, crit } = damage(state.player, state.enemy, 1);
      applyDamage(state.enemy, dmg);
      addLog(state, `🗡️ ${state.player.name} โจมตี สร้างดาเมจ ${dmg}${crit ? " (คริ)" : ""}`);
      pushEvent(state, { kind: "player_attack", damage: dmg, crit, enemyHpAfter: state.enemy.hp });
      tickSkillCd(state);
      break;
    }
    case "SKILL": {
      if (state.skillCd > 0) {
        throw badRequest(`สกิลยังพักอยู่ (ใช้ได้อีกครั้งในอีก ${state.skillCd} turn)`);
      }
      const { dmg, crit } = damage(state.player, state.enemy, 1.8);
      applyDamage(state.enemy, dmg);
      state.skillCd = 2;
      addLog(state, `✨ ${state.player.name} ปล่อยสกิล${crit ? " (คริ)" : ""} ทำดาเมจ ${dmg}`);
      pushEvent(state, { kind: "player_skill", damage: dmg, crit, enemyHpAfter: state.enemy.hp });
      break;
    }
    case "GUARD": {
      state.defending = true;
      addLog(state, `🛡️ ${state.player.name} ตั้งการป้องกัน`);
      pushEvent(state, { kind: "player_guard" });
      tickSkillCd(state);
      break;
    }
    case "FLEE": {
      if (Math.random() < 0.5) {
        addLog(state, "🏃 หนีออกจากการต่อสู้สำเร็จ (ไม่มีรางวัล)");
        status = "FLED";
        finishedAt = new Date();
        pushEvent(state, { kind: "player_flee", success: true });
        break;
      }
      addLog(state, "💨 พยายามหนี… แต่ถูกศัตรูขวางไว้!");
      pushEvent(state, { kind: "player_flee", success: false });
      tickSkillCd(state);
      break;
    }
    default:
      throw badRequest(`action ไม่ถูกต้อง: ${String(action)}`);
  }

  // ----- ตรวจชนะก่อนเข้าตาศัตรู -----
  if (state.enemy.hp <= 0 && status === "IN_PROGRESS") {
    addLog(state, `🎉 ชนะ! เอาชนะ ${state.enemy.name} ได้`);
    status = "WON";
    finishedAt = new Date();
    await rollStageRewards(userId, battle.id, battle.stageId);
    rewardsGranted = true;
    pushEvent(state, { kind: "battle_end", result: "WON" });
  }

  // ----- ตา "ศัตรู" (ยังมีชีวิตอยู่) -----
  if (state.enemy.hp > 0 && status === "IN_PROGRESS") {
    const playerLowHp = state.player.hp / state.player.maxHp < 0.3;
    const heavy = playerLowHp ? Math.random() < 0.4 : Math.random() < 0.25;
    let { dmg, crit } = damage(state.enemy, state.player, heavy ? 1.4 : 1);
    if (state.defending) {
      dmg = Math.max(1, Math.floor(dmg * 0.5));
      addLog(state, "🛡️ ดาเมจที่โดนลดครึ่งเพราะตั้งรับ");
    }
    applyDamage(state.player, dmg);
    addLog(state, `💥 ${state.enemy.name}${heavy ? " โจมตีหนัก" : " โจมตี"} สร้างดาเมจ ${dmg}${crit ? " (คริ)" : ""}`);
    pushEvent(state, { kind: "enemy_attack", damage: dmg, crit, heavy, playerHpAfter: state.player.hp });
    state.defending = false;
  }

  // ----- ตรวจแพ้ (หลังศัตรูตี) -----
  if (state.player.hp <= 0 && status === "IN_PROGRESS") {
    addLog(state, `☠️ ${state.player.name} หมดแรง — แพ้ในการต่อสู้นี้`);
    status = "LOST";
    finishedAt = new Date();
    pushEvent(state, { kind: "battle_end", result: "LOST" });
  }

  const updated = await prisma.battle.update({
    where: { id: battle.id },
    data: {
      turn: { increment: 1 },
      state: state as unknown as Prisma.InputJsonValue,
      status: status as "IN_PROGRESS" | "WON" | "LOST" | "FLED",
      finishedAt,
      rewardsGranted,
    },
    include: { stage: { select: { code: true, name: true } } },
  });

  const rewards =
    updated.status === "WON" ? await battleRewardsView(updated.id) : undefined;
  return viewOf(updated, rewards);
}

/** หนอสถานะต่อสู้ (read-only) */
export async function getBattleView(userId: string, battleId: string): Promise<BattleView> {
  const row = await prisma.battle.findUnique({
    where: { id: battleId },
    include: { stage: { select: { code: true, name: true } } },
  });
  if (!row || row.userId !== userId) throw notFound("ไม่พบการต่อสู้นี้");
  const rewards = row.status === "WON" ? await battleRewardsView(row.id) : undefined;
  return viewOf(row, rewards);
}

// ------------------------------------------------------------
// รางวัลตอนชนะ: gold/exp จากช่วงที่ตั้งในสเตจ + หมุน drop ตามโอกาส
// ทุกอย่างถูกบันทึกเป็น RewardGrant สถานะ PENDING
// ------------------------------------------------------------
async function rollStageRewards(userId: string, battleId: string, stageId: string): Promise<void> {
  const stage = await prisma.stageTemplate.findUnique({ where: { id: stageId } });
  if (!stage) throw new ApiError(500, "STAGE_MISSING", "ไม่พบข้อมูลสเตจที่ใช้สร้างรางวัล");

  const e = enemyStats(stage.enemy);
  const gold = e.goldMin + Math.floor(Math.random() * (e.goldMax - e.goldMin + 1));

  await prisma.rewardGrant.createMany({
    data: [
      { userId, refType: "BATTLE", refId: battleId, type: "GOLD", quantity: BigInt(gold) },
      { userId, refType: "BATTLE", refId: battleId, type: "EXP", quantity: BigInt(e.expReward) },
    ],
  });

  interface DropEntry {
    templateCode: string;
    chance: number;
    qty?: number;
  }
  const drops = (Array.isArray(stage.dropTable) ? stage.dropTable : []) as unknown as DropEntry[];

  for (const drop of drops) {
    if (Math.random() >= drop.chance) continue;
    const template = await prisma.itemTemplate.findUnique({ where: { code: drop.templateCode } });
    if (!template) continue;
    await prisma.rewardGrant.create({
      data: {
        userId,
        refType: "BATTLE",
        refId: battleId,
        type: "ITEM",
        itemTemplateId: template.id,
        quantity: BigInt(clampPositive(drop.qty ?? 1)),
      },
    });
  }
}
