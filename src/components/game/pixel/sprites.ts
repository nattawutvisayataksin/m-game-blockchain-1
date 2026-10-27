// ============================================================
// Pixel sprite engine (procedural) — วาดทุก sprite ด้วยโค้ดบน canvas จิ้มเล็ก
//  ข้อดี: ผลเสมอกัน ไม่พึ่งไฟล์ภาพ, cache อัตโนมัติ, เวอร์ชัน hit-flash
// ============================================================

export const OUTLINE = "#171526";

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
// HERO (Recruit) 24×32 — redesigned readable silhouette, facing right
// ============================================================
function drawHero(ctx: CanvasRenderingContext2D, appearance: HeroAppearance = "ember", outfit: HeroOutfit = "traveler"): void {
  const hairByAppearance: Record<HeroAppearance, string> = { ember: "#d2764d", ocean: "#6db7d8", moon: "#c7b6e8" };
  const hairDarkByAppearance: Record<HeroAppearance, string> = { ember: "#6d3850", ocean: "#294e78", moon: "#564979" };
  const coatByOutfit: Record<HeroOutfit, string> = { traveler: "#2f5d9b", guardian: "#8b5c35", rogue: "#49356f" };
  const coatLightByOutfit: Record<HeroOutfit, string> = { traveler: "#5fb7c3", guardian: "#e2b45c", rogue: "#9b70d2" };
  const coatShadowByOutfit: Record<HeroOutfit, string> = { traveler: "#23335f", guardian: "#5d382c", rogue: "#2c234d" };
  const P = {
    ink: "#171526", shadow: "#29244b", hair: hairByAppearance[appearance], hairDark: hairDarkByAppearance[appearance],
    skin: "#ffd0a6", skinShadow: "#c7786d", coat: coatByOutfit[outfit], coatLight: coatLightByOutfit[outfit],
    coatShadow: coatShadowByOutfit[outfit], gold: "#f5c85b", trousers: "#30345f", boot: "#211d3c",
    eye: OUTLINE,
  };

  // Long coat silhouette, warm top-left light, deliberate 1px pixel outline.
  box(ctx, 6, 2, 13, 12, P.skin, P.ink);
  px(ctx, 5, 3, 3, 8, P.hairDark); px(ctx, 7, 2, 11, 3, P.hair);
  px(ctx, 6, 5, 4, 4, P.hairDark); px(ctx, 16, 7, 2, 2, P.ink);
  px(ctx, 10, 11, 6, 2, P.skinShadow);
  px(ctx, 10, 14, 5, 2, P.skinShadow);

  px(ctx, 10, 14, 5, 2, P.skinShadow);
  box(ctx, 5, 16, 15, 10, P.coat, P.ink);
  px(ctx, 6, 17, 5, 7, P.coatLight); px(ctx, 16, 17, 3, 8, P.coatShadow);
  px(ctx, 5, 24, 15, 2, P.gold); px(ctx, 9, 24, 3, 2, P.ink);
  box(ctx, 2, 17, 4, 9, P.coatShadow, P.ink);
  box(ctx, 19, 17, 4, 8, P.skin, P.ink); px(ctx, 19, 17, 4, 2, P.skinShadow);
  box(ctx, 7, 26, 5, 4, P.trousers, P.ink); box(ctx, 15, 26, 5, 4, P.trousers, P.ink);
  px(ctx, 6, 30, 7, 2, P.boot); px(ctx, 14, 30, 7, 2, P.boot);
  px(ctx, 17, 18, 2, 4, P.gold); // shoulder clasp
}

export type HeroAppearance = "ember" | "ocean" | "moon";
export type HeroOutfit = "traveler" | "guardian" | "rogue";

export function heroSprite(appearance: HeroAppearance = "ember", outfit: HeroOutfit = "traveler"): BuiltSprite {
  return buildSprite(`hero-v2-${appearance}-${outfit}`, 24, 32, (ctx) => drawHero(ctx, appearance, outfit));
}

// SLIME 24×18 — redesigned as a faceted gem-like creature
// ============================================================
function drawSlime(ctx: CanvasRenderingContext2D, body: string, dark: string, hi: string): void {
  const cx = 12;
  const rows: [y: number, w: number][] = [[3, 8], [2, 12], [3, 16], [4, 20], [5, 22], [6, 24], [7, 24], [8, 24], [9, 22], [10, 20], [11, 18], [12, 16]];
  for (let i = 0; i < rows.length; i++) {
    const [y, w] = rows[i]; const x = cx - Math.floor(w / 2);
    px(ctx, x, y + 1, w, 1, i > 8 ? dark : body);
  }
  px(ctx, 6, 4, 5, 2, hi); px(ctx, 7, 6, 3, 1, hi); px(ctx, 17, 6, 3, 2, "#76d884");
  px(ctx, 7, 9, 3, 3, OUTLINE); px(ctx, 15, 9, 3, 3, OUTLINE);
  px(ctx, 8, 10, 1, 1, "#effff1"); px(ctx, 16, 10, 1, 1, "#effff1");
  px(ctx, 10, 14, 5, 1, dark); px(ctx, 11, 15, 3, 1, dark);
}

export function slimeSprite(): BuiltSprite {
  return buildSprite("slime-v2", 24, 18, (c) =>
    drawSlime(c, "#4cbd63", "#2f9447", "#a7f5b4"),
  );
}

// ============================================================
// GOBLIN 24×26 — redesigned scout silhouette
// ============================================================
function drawGoblin(ctx: CanvasRenderingContext2D): void {
  const P = { g: "#79b45d", gDark: "#31564f", gLight: "#c2d873", band: "#d45f68", bandDark: "#6e3858", eye: "#21152d", leather: "#9d633d" };

  // หัวกลม (เอียงหน้าขวา)
  box(ctx, 5, 4, 14, 10, P.g, OUTLINE);
  px(ctx, 5, 4, 14, 3, P.gDark); px(ctx, 8, 7, 6, 2, P.gLight);
  px(ctx, 2, 6, 4, 5, P.gDark); px(ctx, 2, 6, 2, 5, OUTLINE);
  px(ctx, 18, 7, 5, 4, P.gDark); px(ctx, 21, 7, 2, 4, OUTLINE);
  px(ctx, 5, 5, 14, 3, P.band); px(ctx, 5, 7, 14, 2, P.bandDark); px(ctx, 3, 7, 3, 2, P.band);
  px(ctx, 8, 10, 2, 2, P.eye); px(ctx, 15, 10, 2, 2, P.eye); px(ctx, 9, 10, 1, 1, "#f7e7a0");
  px(ctx, 10, 13, 5, 1, P.gDark);

  // ตัว
  box(ctx, 6, 14, 12, 8, P.g, OUTLINE); px(ctx, 7, 15, 4, 6, P.gLight); px(ctx, 6, 20, 12, 2, P.gDark);
  box(ctx, 2, 15, 5, 6, P.gDark, OUTLINE); box(ctx, 17, 14, 5, 7, P.g, OUTLINE);
  px(ctx, 19, 15, 3, 2, P.leather);
  box(ctx, 7, 22, 4, 3, P.gDark, OUTLINE); box(ctx, 14, 22, 4, 3, P.gDark, OUTLINE);
  px(ctx, 6, 25, 6, 1, OUTLINE); px(ctx, 13, 25, 6, 1, OUTLINE);
}

export function goblinSprite(): BuiltSprite {
  return buildSprite("goblin-v2", 24, 26, drawGoblin);
}

// ============================================================
// KING SLIME 36×28 — redesigned boss silhouette with crown and gem core
// ============================================================
function drawKingSlime(ctx: CanvasRenderingContext2D): void {
  const body = "#8d62d2";
  const dark = "#4d397f";
  const hi = "#d5b4f4";

  const rows: [y: number, w: number, x: number][] = [
    [7, 16, 10], [8, 22, 7], [9, 28, 4], [10, 32, 2], [11, 34, 1], [12, 36, 0],
    [13, 36, 0], [14, 36, 0], [15, 34, 1], [16, 34, 1], [17, 32, 2], [18, 30, 3], [19, 26, 5], [20, 22, 7],
  ];
  for (const [y, w, x] of rows) {
    px(ctx, x, y, w, 1, y >= 16 ? dark : body);
  }
  px(ctx, 9, 10, 7, 3, hi); px(ctx, 10, 13, 4, 2, hi); px(ctx, 24, 13, 5, 3, "#6d4eac");

  // มงกุฎ
  box(ctx, 11, 2, 14, 6, "#f2c94c");
  px(ctx, 11, 5, 14, 3, "#a96836"); px(ctx, 14, 1, 3, 4, "#f6e08a"); px(ctx, 20, 0, 3, 5, "#f6e08a");

  // ตา
  px(ctx, 9, 14, 5, 4, OUTLINE); px(ctx, 22, 14, 5, 4, OUTLINE);
  px(ctx, 10, 15, 2, 2, "#f6d7ff"); px(ctx, 23, 15, 2, 2, "#f6d7ff");

  // ปาก
  px(ctx, 14, 20, 9, 2, OUTLINE); px(ctx, 17, 22, 3, 1, OUTLINE);
}

export function kingSlimeSprite(): BuiltSprite {
  return buildSprite("kingslime-v2", 36, 28, drawKingSlime);
}

export function wraithSprite(): BuiltSprite { return buildSprite("wraith", 24, 28, drawWraith); }
export function sporeBeastSprite(): BuiltSprite { return buildSprite("spore-beast", 24, 26, drawSporeBeast); }
export function colossusSprite(): BuiltSprite { return buildSprite("solar-colossus", 24, 28, drawColossus); }

function drawWraith(ctx: CanvasRenderingContext2D): void {
  box(ctx, 5, 5, 14, 14, "#59658f", OUTLINE); px(ctx, 7, 4, 10, 3, "#8d9fd0");
  px(ctx, 8, 9, 3, 3, "#e8f3ff"); px(ctx, 14, 9, 3, 3, "#e8f3ff");
  px(ctx, 9, 10, 1, 1, "#4b3b76"); px(ctx, 15, 10, 1, 1, "#4b3b76");
  px(ctx, 4, 19, 4, 7, "#3c416e"); px(ctx, 16, 19, 4, 7, "#3c416e");
  px(ctx, 9, 20, 6, 7, "#252848");
}

function drawSporeBeast(ctx: CanvasRenderingContext2D): void {
  box(ctx, 3, 7, 18, 14, "#9560a7", OUTLINE); px(ctx, 5, 4, 14, 5, "#d584b5");
  px(ctx, 8, 10, 3, 3, "#211c3b"); px(ctx, 14, 10, 3, 3, "#211c3b");
  px(ctx, 9, 11, 1, 1, "#f6d18f"); px(ctx, 15, 11, 1, 1, "#f6d18f");
  px(ctx, 6, 21, 4, 4, "#513d73"); px(ctx, 14, 21, 4, 4, "#513d73");
}

function drawColossus(ctx: CanvasRenderingContext2D): void {
  box(ctx, 5, 3, 14, 20, "#d28b4d", OUTLINE); px(ctx, 8, 1, 8, 4, "#f7d56f");
  px(ctx, 8, 9, 3, 3, "#3d2740"); px(ctx, 14, 9, 3, 3, "#3d2740");
  px(ctx, 9, 16, 7, 2, "#70404c"); px(ctx, 2, 12, 4, 10, "#a96945"); px(ctx, 18, 12, 4, 10, "#a96945");
  px(ctx, 7, 23, 4, 4, "#70404c"); px(ctx, 14, 23, 4, 4, "#70404c");
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
