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

function drawMountain(ctx: CanvasRenderingContext2D, x: number, width: number, height: number, dark: string, light: string): void {
  ctx.fillStyle = dark;
  for (let row = 0; row < height; row += 2) {
    const inset = Math.floor((row * width) / (height * 2));
    ctx.fillRect(x + inset, 96 - height + row, Math.max(2, width - inset * 2), 2);
  }
  ctx.fillStyle = light;
  for (let row = 0; row < Math.floor(height * 0.42); row += 2) {
    const inset = Math.floor((row * width) / (height * 2));
    ctx.fillRect(x + inset + 2, 96 - height + row, Math.max(1, Math.floor(width / 2) - inset), 2);
  }
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, dark: string, light: string): void {
  ctx.fillStyle = dark;
  ctx.fillRect(x, y - 8, 24, 8);
  ctx.fillRect(x + 4, y - 12, 14, 4);
  ctx.fillStyle = light;
  ctx.fillRect(x + 3, y - 7, 7, 3);
  ctx.fillRect(x + 14, y - 9, 6, 3);
}

function drawRuins(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, light: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 22, 18, 22);
  ctx.fillRect(x + 23, y - 34, 10, 34);
  ctx.fillRect(x + 38, y - 16, 15, 16);
  ctx.fillStyle = light;
  ctx.fillRect(x + 3, y - 18, 12, 2);
  ctx.fillRect(x + 25, y - 29, 6, 2);
  ctx.fillRect(x + 41, y - 12, 9, 2);
  ctx.fillStyle = "#2e314e";
  ctx.fillRect(x + 5, y - 10, 5, 10);
  ctx.fillRect(x + 26, y - 18, 4, 18);
}

function drawFirefly(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t / 180 + x);
  ctx.fillStyle = "#f7cf69";
  ctx.fillRect(x, y, 2, 2);
  ctx.globalAlpha = 1;
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

export type SceneKind = "fields" | "camp" | "lair" | "ruins" | "marsh" | "temple";

export function paintScene(ctx: CanvasRenderingContext2D, kind: SceneKind, t: number): void {
  if (kind === "fields") {
    skyBands(ctx, ["#4969b3", "#719ed0", "#a9d9e4", "#f2c48b"], 0, 96);
    // ดวงอาทิตย์
    ctx.fillStyle = "#ffe9a8";
    ctx.fillRect(251, 15, 18, 18);
    ctx.fillStyle = "#fff3c4";
    ctx.fillRect(255, 19, 10, 10);
    // เมฆ (ลอยช้า)
    drawCloud(ctx, 20 + ((t / 90) % 340), 18, "#ffffff");
    drawCloud(ctx, 150 + ((t / 60) % 300), 30, "#e8f8ff");
    // ภูเขาไกล
    drawMountain(ctx, 0, 92, 34, "#4f7a83", "#75a68e");
    drawMountain(ctx, 66, 76, 27, "#527b83", "#86b08f");
    drawMountain(ctx, 190, 112, 40, "#456c7b", "#709b88");
    drawRuins(ctx, 128, GROUND_Y, "#52636a", "#789188");
    // ต้นไม้สองข้าง
    drawTree(ctx, 24, GROUND_Y + 2, "#254d4b", "#39766a");
    drawTree(ctx, 292, GROUND_Y + 2, "#254d4b", "#39766a");
    drawBush(ctx, 86, GROUND_Y, "#2c6958", "#4c9a6e");
    drawBush(ctx, 215, GROUND_Y, "#2c6958", "#4c9a6e");
    ground(ctx, "#9bc65f", "#628f50", "#416d48");
    return;
  }

  if (kind === "camp") {
    skyBands(ctx, ["#211a45", "#49305f", "#82506b", "#c47567", "#efb06e"], 0, 100);
    // ดาว
    ctx.fillStyle = "#ffe9c7";
    for (let i = 0; i < 30; i++) {
      const sx = (i * 61) % CANVAS_W;
      const sy = 4 + ((i * 29) % 40);
      if (Math.floor(t / 900 + i) % 3 !== 0) ctx.fillRect(sx, sy, 1, 1);
      else ctx.fillRect(sx, sy, 1, 1);
    }
    // เมฆพรายแดง
    drawCloud(ctx, 40 + ((t / 80) % 300), 26, "#684763");
    // ต้นไม้ยามเย็น (เงา)
    drawTree(ctx, 14, GROUND_Y + 2, "#22402c", "#2f5a3f");
    drawTree(ctx, 306, GROUND_Y + 2, "#22402c", "#2f5a3f");
    // เต็นท์ (ฉากหลัง)
    drawTent(ctx, 60, GROUND_Y, "#a96b47", "#553548");
    drawTent(ctx, 266, GROUND_Y, "#7a5877", "#44334e");
    drawCampfire(ctx, 160, GROUND_Y + 6, t);
    for (let i = 0; i < 9; i++) drawFirefly(ctx, 25 + i * 34, 78 + ((i * 17) % 38), t + i * 60);
    ground(ctx, "#8d6651", "#573d3b", "#392d37");
    return;
  }

  if (kind === "ruins") {
    skyBands(ctx, ["#171a38", "#29234d", "#493558", "#845468"], 0, 104);
    ctx.fillStyle = "#e9c4dc"; ctx.fillRect(248, 18, 18, 18); ctx.fillStyle = "#f8e7e9"; ctx.fillRect(252, 22, 10, 10);
    drawRuins(ctx, 48, GROUND_Y, "#554765", "#8c7190"); drawRuins(ctx, 222, GROUND_Y, "#453957", "#755d7d");
    for (let i = 0; i < 12; i++) drawFirefly(ctx, 18 + i * 25, 52 + (i * 13) % 55, t + i * 40);
    ground(ctx, "#716078", "#443953", "#302b42"); return;
  }

  if (kind === "marsh") {
    skyBands(ctx, ["#172b39", "#24514f", "#3f7962", "#8a9a61"], 0, 100);
    ctx.fillStyle = "#233e48"; ctx.fillRect(20, 70, 280, 18);
    for (let i = 0; i < 9; i++) { const x = 12 + i * 37; ctx.fillStyle = i % 2 ? "#d6d86b" : "#d67f8f"; ctx.fillRect(x, 62 + (i % 3) * 5, 5, 10); ctx.fillRect(x - 3, 68 + (i % 3) * 5, 11, 3); }
    ground(ctx, "#6c9a67", "#3f6656", "#294b48"); return;
  }

  if (kind === "temple") {
    skyBands(ctx, ["#5b2e4c", "#a04d4c", "#e39355", "#f5cc73"], 0, 98);
    ctx.fillStyle = "#b76c45"; ctx.fillRect(34, 48, 252, 52);
    ctx.fillStyle = "#e0a058"; ctx.fillRect(52, 42, 216, 8); ctx.fillRect(74, 30, 172, 12);
    ctx.fillStyle = "#70405a"; for (const x of [62, 112, 162, 212, 262]) ctx.fillRect(x, 52, 8, 48);
    ctx.fillStyle = "#ffe29a"; ctx.fillRect(148, 62, 24, 38);
    ground(ctx, "#c18b50", "#76503e", "#4c3840"); return;
  }

  // lair — ถ้ำ King Slime
  ctx.fillStyle = "#110d25";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  skyBands(ctx, ["#302054", "#21153c", "#15102a"], 0, 96);
  drawStalactites(ctx, "#49316d");
  // เสาถ้ำไกล
  ctx.fillStyle = "#30204e";
  ctx.fillRect(30, 60, 5, 88);
  ctx.fillRect(285, 60, 5, 88);
  drawCrystal(ctx, 44, 116, "#7c55bd", "#b18bea", t);
  drawCrystal(ctx, 272, 120, "#7c55bd", "#b18bea", t + 300);
  ctx.fillStyle = "#4f3677";
  ctx.fillRect(112, 104, 3, 44); ctx.fillRect(206, 96, 4, 52);
  ctx.fillStyle = "#8b65b6";
  ctx.fillRect(113, 106, 1, 30); ctx.fillRect(207, 98, 1, 34);
  ground(ctx, "#5e4c7f", "#3b2f59", "#292441");
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
