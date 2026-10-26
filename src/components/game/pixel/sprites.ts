// ============================================================
// Pixel sprite engine (procedural) — วาดทุก sprite ด้วยโค้ดบน canvas จิ้มเล็ก
//  ข้อดี: ผลเสมอกัน ไม่พึ่งไฟล์ภาพ, cache อัตโนมัติ, เวอร์ชัน hit-flash
// ============================================================

export const OUTLINE = "#241a2f";

export interface BuiltSprite {
  frame: HTMLCanvasElement;
  flash: HTMLCanvasElement;
  w: number;
  h: number;
}

const cache = new Map<string, BuiltSprite>();

function newCanvas(w: number, h: number): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { cv, ctx };
}

function whiteVariant(src: HTMLCanvasElement): HTMLCanvasElement {
  const { cv, ctx } = newCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

/** สร้าง sprite จากฟังก์ชันวาด (cache ด้วย key) */
export function buildSprite(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): BuiltSprite {
  const hit = cache.get(key);
  if (hit) return hit;

  const { cv, ctx } = newCanvas(w, h);
  draw(ctx);
  const built: BuiltSprite = { frame: cv, flash: whiteVariant(cv), w, h };
  cache.set(key, built);
  return built;
}

export interface DrawOpts {
  variant?: "normal" | "flash";
  flip?: boolean;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  angle?: number; // radian หมุนรอบจุดฐาน (สำหรับท่าล้ม)
}

/** (x, y) = จุดฐานล่างกึ่งกลาง — ตั้ง y = groundY ให้ sprite ยืนบนพื้น */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: BuiltSprite,
  x: number,
  y: number,
  opts: DrawOpts = {},
): void {
  const sx = opts.scaleX ?? 1;
  const sy = opts.scaleY ?? 1;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.translate(Math.round(x), Math.round(y));
  if (opts.angle) ctx.rotate(opts.angle);
  if (opts.flip) ctx.scale(-1, 1);
  ctx.scale(sx, sy);
  const img = opts.variant === "flash" ? sprite.flash : sprite.frame;
  ctx.drawImage(img, -Math.floor(sprite.w / 2), -sprite.h);
  ctx.restore();
}

// ---------- helpers วาด pixel ----------
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** วาดกล่อง + outline รอบนอก 1px (เจาะเตา pixel-art look) */
function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  outline = OUTLINE,
): void {
  if (outline !== "none") {
    px(ctx, x - 1, y - 1, w + 2, h + 2, outline);
  }
  px(ctx, x, y, w, h, color);
}

// ============================================================
// HERO (Recruit) 14×20 — หันขวา
// ============================================================
function drawHero(ctx: CanvasRenderingContext2D): void {
  const P = {
    hair: "#7a4a2b",
    hairDark: "#5d3a20",
    skin: "#f6c49a",
    skinDark: "#d9966a",
    tunic: "#3f77c9",
    tunicDark: "#2c5a9b",
    belt: "#8a5a2f",
    pants: "#4a5a7a",
    boot: "#37435c",
    eye: OUTLINE,
  };

  // ประวัติบนลอง: หัว (แสกนจากบน)
  box(ctx, 2, 1, 9, 10, P.skin); // หน้า
  px(ctx, 2, 1, 9, 3, P.hair); // เชขหน้าบน
  px(ctx, 1, 2, 3, 6, P.hairDark); // ผมหลัง (ซ้าย = ด้านหลังหัว)
  px(ctx, 2, 5, 2, 2, P.hairDark); // สะดือผมหน้า
  px(ctx, 7, 6, 1, 1, P.eye); // ตาหน้า (ขวา)
  px(ctx, 4, 6, 1, 1, P.eye); // ตาหลัง
  px(ctx, 3, 8, 5, 1, P.skinDark); // คางเงา

  // คอ + ตัว
  px(ctx, 5, 11, 4, 1, P.skinDark);
  box(ctx, 3, 12, 9, 6, P.tunic);
  px(ctx, 3, 12, 9, 1, P.tunicDark);
  px(ctx, 3, 16, 9, 1, P.belt); // เข็มขัด
  px(ctx, 11, 13, 2, 4, P.tunicDark); // แขนหลัง

  // ขา + รองเท้า
  box(ctx, 4, 18, 3, 2, P.pants, "none");
  box(ctx, 8, 18, 3, 2, P.pants, "none");
  px(ctx, 4, 19, 3, 1, P.boot);
  px(ctx, 8, 19, 3, 1, P.boot);

  // แขนหน้า (จับดาบ — ส่วนดาบวาด runtime)
  box(ctx, 10, 12, 3, 4, P.skin);
  px(ctx, 10, 12, 3, 1, P.skinDark);
}

export function heroSprite(): BuiltSprite {
  return buildSprite("hero", 14, 20, drawHero);
}

// ============================================================
// SLIME 16×12 — สีเขียว มีไฮไลต์ + ตา
// ============================================================
function drawSlime(ctx: CanvasRenderingContext2D, body: string, dark: string, hi: string): void {
  // ทรงก้อน: วาดเป็นชั้นแถวแนวนอน (กว้างล่าง แคบบน)
  const cx = 8;
  const rows: [y: number, w: number][] = [
    [1, 8], [2, 10], [3, 12], [4, 13], [5, 14], [6, 15], [7, 16], [8, 16], [9, 16],
  ];
  for (const [y, w] of rows) {
    const x = cx - Math.floor(w / 2);
    px(ctx, x, y, w, 1, y >= 9 ? dark : body);
  }
  px(ctx, cx - 4, 2, 3, 1, hi); // ไฮไลต์
  px(ctx, cx - 4, 3, 2, 1, hi);

  // ตา + ปาก
  px(ctx, cx - 3, 6, 2, 2, OUTLINE);
  px(ctx, cx + 2, 6, 2, 2, OUTLINE);
  px(ctx, cx - 1, 9, 3, 1, dark);
}

export function slimeSprite(): BuiltSprite {
  return buildSprite("slime", 16, 12, (c) =>
    drawSlime(c, "#4cbd63", "#2f9447", "#a7f5b4"),
  );
}

// ============================================================
// GOBLIN 16×18 — เขียว ผ้าโพกแดง + ตัวเตี้ย
// ============================================================
function drawGoblin(ctx: CanvasRenderingContext2D): void {
  const P = { g: "#5fa84b", gDark: "#427d38", band: "#c9485d", bandDark: "#8f3044", eye: "#2a1130" };

  // หัวกลม (เอียงหน้าขวา)
  box(ctx, 4, 2, 9, 7, P.g);
  px(ctx, 4, 2, 9, 2, P.gDark);
  px(ctx, 3, 4, 2, 3, P.gDark); // หูหลัง
  px(ctx, 3, 4, 1, 3, OUTLINE); // ขอบหู
  px(ctx, 4, 3, 9, 2, P.band); // ผ้าโพก
  px(ctx, 4, 4, 9, 1, P.bandDark);
  px(ctx, 1, 4, 3, 1, P.band); // หูผ้าโพกแตกแขน
  px(ctx, 6, 6, 1, 1, P.eye);
  px(ctx, 9, 6, 1, 1, P.eye);
  px(ctx, 7, 7, 2, 1, P.gDark); //ปาก

  // ตัว
  box(ctx, 5, 9, 7, 4, P.g);
  px(ctx, 5, 9, 7, 1, P.gDark);
  px(ctx, 5, 12, 7, 1, P.gDark);

  // ขา
  px(ctx, 6, 13, 2, 3, P.gDark);
  px(ctx, 9, 13, 2, 3, P.gDark);
  px(ctx, 6, 15, 2, 1, OUTLINE);
  px(ctx, 9, 15, 2, 1, OUTLINE);

  // แขนโถม (จับมีด — มีดวาด runtime)
  box(ctx, 10, 9, 3, 3, P.g);
  px(ctx, 10, 9, 3, 1, P.gDark);
}

export function goblinSprite(): BuiltSprite {
  return buildSprite("goblin", 16, 17, drawGoblin);
}

// ============================================================
// KING SLIME 24×16 — สีม่วง + มงกุฎทอง
// ============================================================
function drawKingSlime(ctx: CanvasRenderingContext2D): void {
  const body = "#9a5cd0";
  const dark = "#6f3d9c";
  const hi = "#cda9f2";

  const rows: [y: number, w: number, x: number][] = [
    [4, 10, 7], [5, 14, 5], [6, 17, 4], [7, 19, 3], [8, 22, 2],
    [9, 22, 2], [10, 23, 1], [11, 23, 1], [12, 24, 0], [13, 24, 0], [14, 22, 1],
  ];
  for (const [y, w, x] of rows) {
    px(ctx, x, y, w, 1, y >= 12 ? dark : body);
  }
  px(ctx, 9, 5, 4, 2, hi);
  px(ctx, 8, 7, 3, 1, hi);

  // มงกุฎ
  box(ctx, 8, 0, 8, 4, "#f2c94c");
  px(ctx, 8, 2, 8, 2, "#c39428");
  px(ctx, 10, 1, 2, 2, "#f6e08a");

  // ตา
  px(ctx, 7, 8, 3, 3, OUTLINE);
  px(ctx, 14, 8, 3, 3, OUTLINE);
  px(ctx, 8, 9, 1, 1, "#c9a4ef");
  px(ctx, 15, 9, 1, 1, "#c9a4ef");

  // ปาก
  px(ctx, 10, 12, 5, 1, OUTLINE);
}

export function kingSlimeSprite(): BuiltSprite {
  return buildSprite("kingslime", 24, 16, drawKingSlime);
}

// ============================================================
// ITEM ICONS 12×12 (procedural)
// ============================================================
export type ItemIconKey = "sword" | "potion" | "jelly" | "land" | "coin";

export const ITEM_ICONS = ["sword", "potion", "jelly", "land", "coin"] as const;

function drawSword(ctx: CanvasRenderingContext2D): void {
  // ดาบเฉียง 45° ใน 12×12
  for (let i = 0; i < 7; i++) {
    px(ctx, 9 - i, 2 + i, 2, 2, "#cdd3e0");
    px(ctx, 10 - i, 4 + i, 1, 1, "#8e97ab");
  }
  px(ctx, 2, 8, 4, 1, "#f2c94c"); // guard
  px(ctx, 4, 7, 1, 1, "#f2c94c");
  px(ctx, 3, 7, 1, 1, "#f2c94c");
  px(ctx, 1, 9, 2, 2, "#8a5a2f"); // grip
  px(ctx, 0, 10, 2, 1, "#6e4626");
  px(ctx, 9, 1, 2, 1, OUTLINE);
  px(ctx, 10, 2, 1, 2, OUTLINE);
}

function drawPotion(ctx: CanvasRenderingContext2D): void {
  box(ctx, 3, 2, 6, 2, "#cdd3e0");
  px(ctx, 4, 2, 4, 2, "#8e97ab");
  box(ctx, 2, 4, 8, 6, "#d94a63");
  px(ctx, 2, 7, 8, 3, "#8f3044");
  px(ctx, 3, 4, 2, 2, "#f58ba0"); // shine
  px(ctx, 2, 4, 8, 1, OUTLINE);
  px(ctx, 2, 4, 1, 6, OUTLINE);
  px(ctx, 9, 4, 1, 6, OUTLINE);
}

function drawJelly(ctx: CanvasRenderingContext2D): void {
  drawSlime(ctx, "#4cbd63", "#2f9447", "#a7f5b4");
}

function drawLand(ctx: CanvasRenderingContext2D): void {
  box(ctx, 1, 2, 10, 8, "#57a773");
  px(ctx, 1, 2, 10, 2, "#3f8759");
  px(ctx, 4, 5, 3, 3, "#8a5a2f"); // หิน
  px(ctx, 8, 8, 2, 2, "#8a5a2f");
  px(ctx, 2, 9, 8, 1, "#3f8759");
  px(ctx, 5, 3, 1, 8, "#3f8759");
}

function drawCoin(ctx: CanvasRenderingContext2D): void {
  px(ctx, 3, 2, 6, 1, OUTLINE);
  px(ctx, 2, 3, 8, 5, "#f2c94c");
  px(ctx, 2, 7, 2, 1, "#f2c94c");
  px(ctx, 8, 7, 2, 1, "#f2c94c");
  px(ctx, 3, 8, 6, 1, OUTLINE);
  px(ctx, 5, 2, 1, 1, "#6e4626");
}

const ICON_BUILDERS: Record<ItemIconKey, (c: CanvasRenderingContext2D) => void> = {
  sword: drawSword,
  potion: drawPotion,
  jelly: drawJelly,
  land: drawLand,
  coin: drawCoin,
};

const iconCache = new Map<ItemIconKey, BuiltSprite>();

export function buildIcon(key: ItemIconKey): BuiltSprite {
  const hit = iconCache.get(key);
  if (hit) return hit;
  const built = buildSprite(`icon_${key}`, 12, 12, ICON_BUILDERS[key]);
  iconCache.set(key, built);
  return built;
}

export function itemIconByCode(code: string, kind: string): ItemIconKey {
  if (code.includes("potion")) return "potion";
  if (code.includes("jelly")) return "jelly";
  if (code.includes("land")) return "land";
  if (kind === "WEAPON" || kind === "ARMOR" || kind === "ACCESSORY") return "sword";
  if (kind === "CHARACTER") return "land";
  return "jelly";
}

// ============================================================
// ตัวเลขดาเมจ 3×5 (sprite-free, วาด fillRect)
// ============================================================
const DIGIT_GLYPHS: Record<string, string> = {
  "0": "111101101101111",
  "1": "110110110110111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
  "7": "111001001001001",
  "8": "111101111101111",
  "9": "111101111001001",
};

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
): void {
  let cursor = Math.round(x);
  for (const ch of text) {
    const glyph = DIGIT_GLYPHS[ch];
    if (!glyph) {
      cursor += 4 * scale;
      continue;
    }
    ctx.fillStyle = color;
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (glyph[gy * 3 + gx] === "1") {
          ctx.fillRect(cursor + gx * scale, Math.round(y + gy * scale), scale, scale);
        }
      }
    }
    cursor += 4 * scale;
  }
}

export function pixelTextWidth(text: string, scale = 1): number {
  return (text.split("").length) * 4 * scale - scale;
}
