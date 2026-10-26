// ============================================================
// Battle renderer — เล่นอนิเมชันจาก BattleEvent ที่ server ส่งมา
//   • หน้าจอ 320×180 (master res) + screen shake / hit flash
//   • hero (ซ้าย) ↔ ศัตรู (ขวา) ลุย/ชนะ-แพ้ transition
//   • particles + ตัวเลขดาเมจลอย + HP bar tween
//   ใช้ event จาก server เท่านั้น — ห้ามคำนวณผลใหม่ฝั่ง client
// ============================================================

import { CANVAS_W, CANVAS_H, GROUND_Y, paintScene, type SceneKind } from "./scenes";
import {
  drawSprite,
  drawPixelText,
  pixelTextWidth,
  heroSprite,
  slimeSprite,
  goblinSprite,
  kingSlimeSprite,
  OUTLINE,
  type BuiltSprite,
} from "./sprites";
import type { BattleEvent, BattleView } from "../types";
import { sfx } from "../sfx";

const PAD = 8; // ขอบเผื่อ screen-shake
const HERO_X = 92;
const ENEMY_X = 238;

const W_BAR = 88;
const H_BAR = 7;

// ความยาวอนิเมชันต่อชนิดเหตุการณ์ (ms)
const DUR: Record<BattleEvent["kind"], number> = {
  player_attack: 520,
  player_skill: 660,
  player_guard: 430,
  player_flee: 640,
  enemy_attack: 540,
  battle_end: 900,
};

interface Particle {
  x: number; y: number; vx: number; vy: number;
  grav: number; age: number; life: number; color: string; size: number;
}

interface Floaty {
  x: number; y: number; vy: number; age: number; life: number; text: string; color: string; scale: number;
}

interface BarState { cur: number; shown: number; max: number }

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function smooth(p: number): number {
  return p * p * (3 - 2 * p);
}

export function sceneKindOf(stageCode: string): SceneKind {
  if (stageCode.includes("02") || stageCode.includes("goblin") || stageCode.includes("camp")) return "camp";
  if (stageCode.includes("03") || stageCode.includes("king") || stageCode.includes("lair")) return "lair";
  return "fields";
}

function enemySpriteFor(stageCode: string): BuiltSprite {
  if (stageCode.includes("03") || stageCode.includes("king")) return kingSlimeSprite();
  if (stageCode.includes("02") || stageCode.includes("goblin")) return goblinSprite();
  return slimeSprite();
}

export interface RendererInit {
  stageCode: string;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
}

export class BattleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stageCode: string;
  private sceneCv: HTMLCanvasElement;
  private sceneCtx: CanvasRenderingContext2D;

  private heroSpr = heroSprite();
  private enemySpr: BuiltSprite;

  private raf = 0;
  private running = false;
  private t0 = performance.now();
  private now = 0;
  private lastFrame = this.t0;

  // คิวเหตุการณ์ (มาจาก server)
  private queue: BattleEvent[] = [];
  private cur: { ev: BattleEvent; start: number; dur: number } | null = null;
  private lastSeq = 0;
  private emptyFired = true;
  private timeline: { at: number; fn: () => void }[] = [];

  // แถบเลือด
  private hp = {
    player: { cur: 100, shown: 100, max: 100 } as BarState,
    enemy: { cur: 100, shown: 100, max: 100 } as BarState,
  };

  // เอฟเฟกต์
  private particles: Particle[] = [];
  private floaties: Floaty[] = [];
  private shakeUntil = 0; private shakeDur = 1; private shakeMag = 0;
  private whiteUntil = 0; private whiteAlpha = 0;
  private heroFlashUntil = 0; private enemyFlashUntil = 0;
  private heroDash = { start: -1, dur: 0, from: 0, to: 0 };
  private enemyDash = { start: -1, dur: 0, from: 0, to: 0 };
  private shieldUntil = 0;
  private slashUntil = 0;
  private slashAt = { x: 0, y: 0 };
  private slashHeavy = false;
  private enemyDeathAt = -1;
  private heroDown = false;
  private heroRanAway = false;

  /** เรียกเมื่อเหตุการณ์ทั้งหมดเล่นจบ (ใช้เปิดปุ่มอีกครั้ง/จบการต่อสู้) */
  onQueueEmpty?: () => void;

  constructor(canvas: HTMLCanvasElement, init: RendererInit) {
    this.canvas = canvas;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("canvas 2d context ไม่พร้อม");
    this.ctx = c;
    this.ctx.imageSmoothingEnabled = false;
    this.stageCode = init.stageCode;
    this.enemySpr = enemySpriteFor(init.stageCode);

    this.sceneCv = document.createElement("canvas");
    this.sceneCv.width = CANVAS_W + PAD * 2;
    this.sceneCv.height = CANVAS_H + PAD * 2;
    const sc = this.sceneCv.getContext("2d");
    if (!sc) throw new Error("scene canvas สร้างไม่ได้");
    this.sceneCtx = sc;
    this.sceneCtx.imageSmoothingEnabled = false;

    this.hp.player = { cur: init.playerHp, shown: init.playerHp, max: init.playerMaxHp };
    this.hp.enemy = { cur: init.enemyHp, shown: init.enemyHp, max: init.enemyMaxHp };
  }

  // ----------------------------------------------------------
  // การป้อนข้อมูลจาก server
  // ----------------------------------------------------------

  private ingest(events: BattleEvent[]): void {
    const fresh = events
      .filter((e) => e.seq > this.lastSeq)
      .sort((a, b) => a.seq - b.seq);
    for (const e of fresh) {
      this.lastSeq = e.seq;
      this.queue.push(e);
    }
    if (this.queue.length > 0) this.emptyFired = false;
  }

  /** ตั้งจุดเริ่ม (เปิดฉากใหม่) — เก็บ seq ล่าสุดไว้เป็น baseline */
  startView(view: BattleView): void {
    const maxSeq = (view.events ?? []).reduce((m, e) => Math.max(m, e.seq), 0);
    this.lastSeq = maxSeq;
    this.emptyFired = true;
  }

  /** หลังส่ง action — เล่นเฉพาะเหตุการณ์ใหม่ */
  applyView(view: BattleView): void {
    this.ingest(view.events ?? []);
  }

  isBusy(): boolean {
    return this.cur !== null || this.queue.length > 0 || this.timeline.length > 0;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  // ----------------------------------------------------------
  // อัปเดตเชิงเวลา
  // ----------------------------------------------------------

  private frame(): void {
    const now = performance.now();
    const dt = Math.min(50, now - this.lastFrame);
    this.lastFrame = now;
    this.now = now;
    this.updateEvents(now);
    this.updateFx(dt);
    this.draw(now);
    this.maybeNotify();
  }

  private updateEvents(now: number): void {
    if (this.cur && now - this.cur.start >= this.cur.dur) {
      this.timeline.length = 0; // เหตุการณ์เก่าไม่ทิ้งงานค้าง
      this.cur = null;
    }
    while (!this.cur && this.queue.length > 0) {
      const ev = this.queue.shift()!;
      this.cur = { ev, start: now, dur: DUR[ev.kind] };
      this.beginEvent(ev, now);
    }
    if (this.cur) {
      for (let i = 0; i < this.timeline.length; ) {
        if (this.timeline[i].at <= now) {
          const job = this.timeline.splice(i, 1)[0];
          job.fn();
        } else i++;
      }
    }
  }

  private maybeNotify(): void {
    if (!this.emptyFired && !this.isBusy()) {
      this.emptyFired = true;
      this.onQueueEmpty?.();
    }
  }

  private updateFx(dt: number): void {
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.vy += (p.grav * dt) / 1000;
    }
    // ตัวเลขลอย
    for (let i = this.floaties.length - 1; i >= 0; i--) {
      const f = this.floaties[i];
      f.age += dt;
      if (f.age >= f.life) {
        this.floaties.splice(i, 1);
        continue;
      }
      f.y -= (f.vy * dt) / 1000;
    }
    // HP bar tween
    const k = 1 - Math.exp(-dt / 85);
    for (const b of [this.hp.player, this.hp.enemy]) {
      b.shown += (b.cur - b.shown) * k;
      if (Math.abs(b.cur - b.shown) < 0.7) b.shown = b.cur;
      b.shown = clamp(b.shown, 0, b.max);
    }
  }

  // ----------------------------------------------------------
  // โครงเหตุการณ์ → อนิเมชัน
  // ----------------------------------------------------------

  private schedule(delay: number, fn: () => void): void {
    this.timeline.push({ at: this.now + delay, fn });
    this.timeline.sort((a, b) => a.at - b.at);
  }

  private dash(who: "hero" | "enemy", from: number, to: number, delay: number, dur: number): void {
    this.schedule(delay, () => {
      const d = who === "hero" ? this.heroDash : this.enemyDash;
      d.from = from; d.to = to; d.dur = dur; d.start = this.now;
    });
  }

  private shake(mag: number, dur: number): void {
    this.shakeMag = mag;
    this.shakeDur = dur;
    this.shakeUntil = this.now + dur;
  }

  private burst(x: number, y: number, colors: string[], n = 14, power = 1): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 130 * power,
        vy: (Math.random() * -100 - 30) * power,
        grav: 260,
        age: 0,
        life: 380 + Math.random() * 320,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() < 0.4 ? 2 : 1,
      });
    }
  }

  private floaty(x: number, y: number, text: string, color: string, scale = 2): void {
    this.floaties.push({ x, y, vy: 32, age: 0, life: 850, text, color, scale });
  }

  private hitEnemy(dmg: number, crit: boolean, hpAfter: number, heavy: boolean): void {
    this.enemyFlashUntil = this.now + 110;
    this.slashUntil = this.now + 140;
    this.slashAt = { x: ENEMY_X, y: GROUND_Y - 20 };
    this.slashHeavy = heavy;
    this.shake(heavy ? 6 : 4, 210);
    this.burst(ENEMY_X, GROUND_Y - 14, crit || heavy ? ["#ffd94a", "#fff2a8", "#ff9d4a", "#ffffff"] : ["#ffffff", "#ffd94a", "#a7f5b4"], heavy ? 18 : 12);
    this.floaty(ENEMY_X, GROUND_Y - 30, String(Math.round(dmg)), crit ? "#ff8a3c" : "#ffd94a", crit ? 3 : 2);
    this.hp.enemy.cur = hpAfter;
    if (crit) {
      this.whiteAlpha = 0.14;
      this.whiteUntil = this.now + 110;
    }
    sfx(crit ? "crit" : heavy ? "skill" : "hit");
  }

  private hitPlayer(dmg: number, hpAfter: number, heavy: boolean): void {
    this.heroFlashUntil = this.now + 110;
    this.shake(heavy ? 6 : 4, 210);
    this.burst(HERO_X, GROUND_Y - 14, ["#ff5b6e", "#ffa1ac", "#ffffff"], heavy ? 16 : 10);
    this.floaty(HERO_X, GROUND_Y - 32, String(Math.round(dmg)), "#ff5b6e", 2);
    this.hp.player.cur = hpAfter;
    sfx("hurt");
  }

  private beginEvent(ev: BattleEvent, now: number): void {
    switch (ev.kind) {
      case "player_attack": {
        this.dash("hero", 0, 34, 0, 150);
        this.schedule(160, () => this.hitEnemy(ev.damage ?? 0, ev.crit === true, ev.enemyHpAfter ?? 0, false));
        this.dash("hero", 34, 0, 320, 200);
        break;
      }
      case "player_skill": {
        this.dash("hero", 0, 26, 0, 150);
        this.schedule(160, () => {
          this.whiteAlpha = 0.18;
          this.whiteUntil = now + 120;
          this.burst(ENEMY_X - 12, GROUND_Y - 18, ["#c9a4ef", "#ffffff", "#9a5cd0"], 12);
          this.hitEnemy(ev.damage ?? 0, ev.crit === true, ev.enemyHpAfter ?? 0, true);
        });
        this.dash("hero", 26, 0, 330, 220);
        break;
      }
      case "player_guard": {
        this.shieldUntil = now + DUR.player_guard - 60;
        sfx("guard");
        break;
      }
      case "player_flee": {
        if (ev.success) {
          sfx("flee");
          this.dash("hero", 0, 215, 40, 520);
          this.schedule(560, () => {
            this.heroRanAway = true;
          });
        } else {
          sfx("fleeFail");
          this.dash("hero", 0, 14, 0, 140);
          this.dash("hero", 14, 0, 180, 180);
          this.schedule(160, () => this.shake(3, 160));
        }
        break;
      }
      case "enemy_attack": {
        this.dash("enemy", 0, -36, 0, 160);
        this.schedule(170, () => {
          this.hitPlayer(ev.damage ?? 0, ev.playerHpAfter ?? 0, ev.heavy === true || ev.crit === true);
        });
        this.dash("enemy", -36, 0, 330, 210);
        break;
      }
      case "battle_end": {
        if (ev.result === "WON") {
          sfx("win");
          this.shake(5, 260);
          this.enemyDeathAt = now;
          this.burst(ENEMY_X, GROUND_Y - 16, ["#c9a4ef", "#ffffff", "#f2c94c"], 26, 1.3);
          this.hp.enemy.shown = 0;
          this.hp.enemy.cur = 0;
        } else if (ev.result === "LOST") {
          sfx("lose");
          this.shake(5, 260);
          this.heroDown = true;
          this.heroFlashUntil = now + 200;
        } else {
          // FLED — hero วิ่งหนีไปแล้วเมื่อครู่
          this.heroRanAway = true;
        }
        break;
      }
    }
  }

  // ----------------------------------------------------------
  // วาดภาพเต็มเฟรม
  // ----------------------------------------------------------

  private draw(now: number): void {
    const ctx = this.ctx;
    const t = this.t0 + now;

    // พื้นหลังนอกขอบ
    ctx.fillStyle = "#0d0918";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ---- screen shake ----
    let sx = 0, sy = 0;
    if (now < this.shakeUntil) {
      const p = (this.shakeUntil - now) / this.shakeDur;
      const m = this.shakeMag * p;
      sx = Math.round((Math.random() - 0.5) * 2 * m);
      sy = Math.round((Math.random() - 0.5) * 1.6 * m);
    }

    // ---- ฉาก (offscreen ไม่ให้ขอบโผล่ตอนสั่น) ----
    this.sceneCtx.fillStyle = "#0d0918";
    this.sceneCtx.fillRect(0, 0, this.sceneCv.width, this.sceneCv.height);
    this.sceneCtx.save();
    this.sceneCtx.translate(PAD, PAD);
    paintScene(this.sceneCtx, sceneKindOf(this.stageCode), t);
    this.sceneCtx.restore();

    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(this.sceneCv, -PAD, -PAD);

    this.drawActors(now, ctx);
    this.drawSlashArc(now, ctx);
    this.drawParticles(ctx);
    ctx.restore();

    // ---- HUD นิ่งบนภาพ (ไม่โดนสั่น) ----
    this.drawBar(ctx, 8, 9, this.hp.player, false);
    this.drawBar(ctx, CANVAS_W - 8 - W_BAR, 9, this.hp.enemy, true);

    // ---- แสงขาว (crit) ----
    if (now < this.whiteUntil) {
      const a = this.whiteAlpha * ((this.whiteUntil - now) / 120);
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // ---- ตัวเลขลอย (บนสุด) ----
    ctx.save();
    ctx.translate(sx, sy);
    this.drawFloaties(ctx);
    ctx.restore();
  }

  private drawActors(now: number, ctx: CanvasRenderingContext2D): void {
    const t = this.t0 + now;

    // --- hero ---
    if (!this.heroRanAway) {
      const bob = Math.sin(t / 300 + 1) < -0.55 ? -1 : 0;
      let ox = 0;
      if (this.heroDash.start >= 0) {
        const p = clamp((now - this.heroDash.start) / Math.max(1, this.heroDash.dur), 0, 1);
        ox = this.heroDash.from + (this.heroDash.to - this.heroDash.from) * smooth(p);
        if (p >= 1) this.heroDash.start = -1;
      }
      const x = HERO_X + ox;
      // เงา
      ctx.fillStyle = "rgba(16,10,26,0.30)";
      ctx.fillRect(Math.round(x) - 8, GROUND_Y + 1, 16, 3);

      let angle = 0;
      if (this.heroDown) {
        angle = Math.PI / 2.3;
      }
      drawSprite(ctx, this.heroSpr, x, GROUND_Y + bob, {
        variant: now < this.heroFlashUntil ? "flash" : "normal",
        alpha: this.heroDown ? 0.95 : 1,
        angle,
      });

      // โล่ป้องกัน
      if (now < this.shieldUntil) {
        const pulse = 0.55 + 0.25 * Math.sin(now / 55);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = "#cdd3e0";
        ctx.fillRect(Math.round(x) + 12, GROUND_Y - 20, 4, 20);
        ctx.fillStyle = "#8e97ab";
        ctx.fillRect(Math.round(x) + 15, GROUND_Y - 18, 2, 16);
        ctx.globalAlpha = 1;
      }
    }

    // --- enemy ---
    if (this.enemyDeathAt < 0 || now - this.enemyDeathAt < 900) {
      const bob = Math.sin(t / 260) < -0.5 ? -1 : 0;
      const squish = Math.sin(t / 240) * 0.05;
      let ox = 0;
      if (this.enemyDash.start >= 0) {
        const p = clamp((now - this.enemyDash.start) / Math.max(1, this.enemyDash.dur), 0, 1);
        ox = this.enemyDash.from + (this.enemyDash.to - this.enemyDash.from) * smooth(p);
        if (p >= 1) this.enemyDash.start = -1;
      }
      let alpha = 1;
      if (this.enemyDeathAt >= 0) alpha = clamp(1 - (now - this.enemyDeathAt) / 700, 0, 1);
      const x = ENEMY_X + ox;
      ctx.fillStyle = "rgba(16,10,26,0.30)";
      ctx.fillRect(Math.round(x) - 9, GROUND_Y + 1, 18, 3);
      drawSprite(ctx, this.enemySpr, x, GROUND_Y + bob, {
        variant: now < this.enemyFlashUntil ? "flash" : "normal",
        flip: true,
        alpha,
        scaleY: 1 + squish,
        scaleX: 1 - squish * 0.7,
      });
    }
  }

  private drawSlashArc(now: number, ctx: CanvasRenderingContext2D): void {
    if (now >= this.slashUntil) return;
    const p = clamp((this.slashUntil - now) / 140, 0, 1);
    ctx.globalAlpha = clamp(p + 0.25, 0, 1);
    const main = this.slashHeavy ? "#ffe98a" : "#ffffff";
    // รอยฟันเฉียง 3 เส้น (step-pixel ให้เป็น pixel art)
    for (let i = 0; i < 3; i++) {
      const bx = this.slashAt.x - 16 + i * 7;
      const by = this.slashAt.y - 6 + i * 2;
      for (let s = 0; s < 8; s++) {
        ctx.fillStyle = s < 2 ? main : i === 1 ? main : "#9fd8ff";
        ctx.fillRect(bx + s * 3, by + s * 2, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawFloaties(ctx: CanvasRenderingContext2D): void {
    for (const f of this.floaties) {
      const a = clamp(1 - f.age / f.life, 0, 1);
      ctx.globalAlpha = a;
      const w = pixelTextWidth(f.text, f.scale);
      const tx = Math.round(f.x - w / 2);
      const ty = Math.round(f.y);
      // เงา
      drawPixelText(ctx, f.text, tx + 1, ty + 1, OUTLINE, f.scale);
      drawPixelText(ctx, f.text, tx, ty, f.color, f.scale);
    }
    ctx.globalAlpha = 1;
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, bar: BarState, right: boolean): void {
    const p = clamp(bar.shown / Math.max(1, bar.max), 0, 1);
    const fw = Math.round(W_BAR * p);
    // เฟรม
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, W_BAR + 2, H_BAR + 2);
    ctx.fillStyle = "#3d2a55";
    ctx.fillRect(x, y, W_BAR, H_BAR);
    const color = p > 0.5 ? "#57d96a" : p > 0.25 ? "#f2b04a" : "#e6535c";
    if (fw > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(right ? x + W_BAR - fw : x, y, fw, H_BAR);
      // ไฮไลต์บนแถบ
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(right ? x + W_BAR - fw : x, y, fw, 2);
    }
    // ตัวเลขเลือด
    const label = String(Math.max(0, Math.ceil(bar.shown)));
    const tw = pixelTextWidth(label, 1);
    ctx.save();
    ctx.translate(right ? 0 : 0, 0);
    drawPixelText(
      ctx,
      label,
      right ? x + W_BAR - tw : x + 1,
      y + H_BAR + 3,
      "#ffe9c7",
      1,
    );
    ctx.restore();
  }
}
