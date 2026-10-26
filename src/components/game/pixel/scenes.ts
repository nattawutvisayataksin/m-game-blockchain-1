// ============================================================
// Stage scenes — วาดฉากแต่ละด่านด้วยโค้ดบน canvas 320×180 (master res)
// ทุกฉาก: ชั้นหลัง (ท้องฟ้า/ไกล) → ชั้นกลาง (พื้นหลังต้นไม้/เต็นท์) → พื้นดิน
// มีของ animate: เมฆลอย, กองไฟกระพริบ, คริสตัลเรืองแสง, หิมะสไลม์?
// ============================================================

export const CANVAS_W = 320;
export const CANVAS_H = 180;
export const GROUND_Y = 148;

function skyBands(
  ctx: CanvasRenderingContext2D,
  colors: string[],
  heightFrom: number,
  heightTo: number,
): void {
  const n = colors.length;
  const span = heightTo - heightFrom;
  for (let i = 0; i < n; i++) {
    const y = heightFrom + Math.floor((span * i) / n);
    const h = Math.ceil(span / n);
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, y, CANVAS_W, h);
  }
}

function dither(ctx: CanvasRenderingContext2D, y: number, x: number, w: number, color: string, step = 2): void {
  ctx.fillStyle = color;
  for (let i = 0; i < w; i += step) ctx.fillRect(x + i, y, 1, 1);
}

function ground(ctx: CanvasRenderingContext2D, topColor: string, bodyColor: string, darkColor: string): void {
  ctx.fillStyle = bodyColor;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  ctx.fillStyle = topColor;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);
  dither(ctx, GROUND_Y + 4, 0, CANVAS_W, darkColor, 3);
  dither(ctx, GROUND_Y + 9, 2, CANVAS_W - 6, darkColor, 4);
  // หญ้าเรียบ ๆ ประปราย
  ctx.fillStyle = topColor;
  for (let i = 0; i < 26; i++) {
    const gx = 4 + i * 12 + ((i * 37) % 7);
    ctx.fillRect(gx, GROUND_Y - 1, 1, 1);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y, 10, 3);
  ctx.fillRect(x, y + 3, 18, 3);
  ctx.fillRect(x + 12, y + 1, 6, 2);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, dark: string, light: string): void {
  ctx.fillStyle = "#5d3a20";
  ctx.fillRect(x + 3, y - 10, 3, 10);
  ctx.fillStyle = dark;
  ctx.fillRect(x - 6, y - 22, 15, 12);
  ctx.fillStyle = light;
  ctx.fillRect(x - 5, y - 21, 8, 4);
  ctx.fillStyle = dark;
  ctx.fillRect(x - 2, y - 28, 8, 8);
  ctx.fillStyle = light;
  ctx.fillRect(x, y - 27, 4, 3);
}

function drawTent(ctx: CanvasRenderingContext2D, x: number, y: number, c1: string, c2: string): void {
  ctx.fillStyle = c1;
  for (let i = 0; i < 16; i++) {
    const w = 2 + i;
    ctx.fillRect(x - Math.floor(w / 2) + 8, y - i, w, 1);
  }
  ctx.fillStyle = c2;
  ctx.fillRect(x + 6, y - 6, 3, 6); // ประตู
}

function drawCampfire(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const flick = Math.floor(t / 140) % 3;
  ctx.fillStyle = "#5d3a20";
  ctx.fillRect(x - 5, y - 2, 10, 2);
  ctx.fillStyle = flick === 1 ? "#8a5a2f" : "#5d3a20";
  ctx.fillRect(x - 3, y - 3, 6, 2);
  const flameColors = ["#f2c94c", "#f2994a", "#e66d4c"];
  for (let i = 0; i < 3; i++) {
    const h = 5 + (flick === i % 3 ? 2 : 0);
    ctx.fillStyle = flameColors[i];
    ctx.fillRect(x - 2 + i, y - 3 - h + i, 2, h);
  }
}

function drawStalactites(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  const xs = [12, 44, 78, 108, 140, 172, 208, 242, 276, 308];
  for (let i = 0; i < xs.length; i++) {
    const h = 10 + ((i * 23) % 18);
    for (let j = 0; j < h; j += 2) {
      ctx.fillRect(xs[i] + Math.floor(j / 4), j, 6 - Math.floor(j / 3), 2);
    }
  }
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, base: string, glow: string, t: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(t / 600);
  ctx.fillStyle = base;
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(x + Math.floor(i / 3), y + i, 8 - Math.floor(i / 1.6), 1);
  }
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.25 + 0.45 * pulse;
  ctx.fillRect(x - 4, y - 2, 14, 16);
  ctx.globalAlpha = 1;
}

// ============================================================
// ฉากแต่ละด่าน
// ============================================================

export type SceneKind = "fields" | "camp" | "lair";

export function paintScene(ctx: CanvasRenderingContext2D, kind: SceneKind, t: number): void {
  if (kind === "fields") {
    skyBands(ctx, ["#8ed8f8", "#9ce2fa", "#aee9fc"], 0, 96);
    // ดวงอาทิตย์
    ctx.fillStyle = "#fff2a8";
    ctx.fillRect(252, 16, 16, 16);
    ctx.fillStyle = "#ffe97a";
    ctx.fillRect(256, 20, 8, 8);
    // เมฆ (ลอยช้า)
    drawCloud(ctx, 20 + ((t / 90) % 340), 18, "#ffffff");
    drawCloud(ctx, 150 + ((t / 60) % 300), 30, "#e8f8ff");
    // ภูเขาไกล
    ctx.fillStyle = "#7fc57f";
    for (const [x, w, h] of [[0, 90, 34], [60, 70, 26], [200, 100, 38], [270, 60, 30]] as const) {
      for (let i = 0; i < h; i += 2) {
        ctx.fillRect(x + Math.floor(i / 3), 96 - i, w - Math.floor(i / 2), 2);
      }
    }
    // ต้นไม้สองข้าง
    drawTree(ctx, 24, GROUND_Y + 2, "#2f9451", "#4cbd63");
    drawTree(ctx, 292, GROUND_Y + 2, "#2f9451", "#4cbd63");
    ground(ctx, "#6fcf6a", "#4aa94b", "#3d8f3f");
    return;
  }

  if (kind === "camp") {
    skyBands(ctx, ["#2b1a4e", "#5d2a5e", "#a04a4e", "#d97a4a", "#f2b04a"], 0, 100);
    // ดาว
    ctx.fillStyle = "#ffe9c7";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 61) % CANVAS_W;
      const sy = 4 + ((i * 29) % 40);
      if (Math.floor(t / 900 + i) % 3 !== 0) ctx.fillRect(sx, sy, 1, 1);
      else ctx.fillRect(sx, sy, 1, 1);
    }
    // เมฆพรายแดง
    drawCloud(ctx, 40 + ((t / 80) % 300), 26, "#7a4463");
    // ต้นไม้ยามเย็น (เงา)
    drawTree(ctx, 14, GROUND_Y + 2, "#22402c", "#2f5a3f");
    drawTree(ctx, 306, GROUND_Y + 2, "#22402c", "#2f5a3f");
    // เต็นท์ (ฉากหลัง)
    drawTent(ctx, 60, GROUND_Y, "#8a5a2f", "#5d3a20");
    drawTent(ctx, 266, GROUND_Y, "#8a5a2f", "#5d3a20");
    drawCampfire(ctx, 160, GROUND_Y + 6, t);
    ground(ctx, "#7a5a4a", "#5b4032", "#4a352a");
    return;
  }

  // lair — ถ้ำ King Slime
  ctx.fillStyle = "#1d1030";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  skyBands(ctx, ["#2a1745", "#241238", "#1d1030"], 0, 96);
  drawStalactites(ctx, "#35225a");
  // เสาถ้ำไกล
  ctx.fillStyle = "#2a1a45";
  ctx.fillRect(30, 60, 5, 88);
  ctx.fillRect(285, 60, 5, 88);
  drawCrystal(ctx, 44, 116, "#9a5cd0", "#c9a4ef", t);
  drawCrystal(ctx, 272, 120, "#9a5cd0", "#c9a4ef", t + 300);
  ground(ctx, "#4a3a6a", "#38294f", "#2c1f40");
}

/** ภาพ preview เล็กสำหรับ stage select (วาดครั้งเดียวให้ canvas เป้าหมาย) */
export function paintScenePreview(cv: HTMLCanvasElement, kind: SceneKind): void {
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.scale(cv.width / CANVAS_W, cv.height / CANVAS_H);
  paintScene(ctx, kind, 0);
  // ใส่เงาให้เห็นมอนสเตอร์เป็น silhouette
  ctx.fillStyle = "rgba(20,14,34,0.85)";
  ctx.fillRect(232, GROUND_Y - 26, 30, 26);
  ctx.fillStyle = "rgba(20,14,34,0.5)";
  ctx.fillRect(62, GROUND_Y - 30, 20, 30);
  ctx.restore();
}
