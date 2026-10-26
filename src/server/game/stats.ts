// ============================================================
// ระบบสถิติและสูตรตัวเลขของเกม — อยู่ฝั่ง SERVER เท่านั้น
// (ฝั่ง client แสดง hp/log เท่านั้น; damage/crit/drop คำนวณที่นี่เสมอ)
// ============================================================

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number; // โอกาสคริ 0.0-1.0
}

// สถานสานการเติบโตต่อเลเวล (แก้ที่นี่เท่านั้นเมื่อ balance ตัวเกม)
export const GROWTH_PER_LEVEL = {
  hp: 22,
  atk: 4,
  def: 2,
  spd: 1,
  crit: 0.002,
} as const;

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNonNegative(n: number): number {
  return Math.max(0, Math.floor(n));
}

/** อ่านสถิติจาก template.attributes + level ของ instance */
export function characterStats(templateAttributes: unknown, level: number): Stats {
  const attrs = (templateAttributes ?? {}) as Record<string, unknown>;
  const lv = Math.max(1, Math.floor(level));
  const growth = lv - 1;
  return {
    hp: clampNonNegative(num(attrs.hp, 120) + growth * GROWTH_PER_LEVEL.hp),
    atk: clampNonNegative(num(attrs.atk, 12) + growth * GROWTH_PER_LEVEL.atk),
    def: clampNonNegative(num(attrs.def, 6) + growth * GROWTH_PER_LEVEL.def),
    spd: clampNonNegative(num(attrs.spd, 8) + growth * GROWTH_PER_LEVEL.spd),
    crit: Math.min(0.95, num(attrs.crit, 0.08) + growth * GROWTH_PER_LEVEL.crit),
  };
}

/** สถิติศัตรูจาก StageTemplate.enemy json */
export function enemyStats(enemyConfig: unknown): Stats & { expReward: number; goldMin: number; goldMax: number; name: string } {
  const e = (enemyConfig ?? {}) as Record<string, unknown>;
  return {
    name: typeof e.name === "string" && e.name ? e.name : "Unknown",
    hp: clampNonNegative(num(e.hp, 50)),
    atk: clampNonNegative(num(e.atk, 8)),
    def: clampNonNegative(num(e.def, 3)),
    spd: clampNonNegative(num(e.spd, 5)),
    crit: Math.min(0.5, num(e.crit, 0.05)),
    expReward: clampNonNegative(num(e.expReward, 20)),
    goldMin: clampNonNegative(num(e.goldMin, 10)),
    goldMax: clampNonNegative(Math.max(num(e.goldMax, num(e.goldMin, 10)), num(e.goldMin, 10))),
  };
}

/** EXP ที่ต้องเก็บต่อการอัปเลเวล (แนวเรียบ ๆ แก้ได้ในอนาคต) */
export function expToNextLevel(level: number): number {
  return 60 + Math.max(1, Math.floor(level)) * 40;
}

export interface LevelUpResult {
  levelBefore: number;
  levelAfter: number;
  exp: number;
  levelUps: number;
}

/** ใช้ EXP: ทำงานหลายทีเดียวกันเป็น level หลายระดับ — ไม่ห้องหลุดเลเวล */
export function gainExp(level: number, exp: number, gained: number): LevelUpResult & { newExp: number } {
  let currentLevel = Math.max(1, level);
  let currentExp = Math.max(0, exp) + gained;
  let levelUps = 0;
  while (currentExp >= expToNextLevel(currentLevel)) {
    currentExp -= expToNextLevel(currentLevel);
    currentLevel += 1;
    levelUps += 1;
  }
  return {
    levelBefore: level,
    levelAfter: currentLevel,
    levelUps,
    exp: currentExp,
    newExp: currentExp,
  };
}
