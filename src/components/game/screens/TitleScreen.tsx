"use client";

// ============================================================
// TitleScreen — หน้าเข้าเกม: ภาพ art อนิเมต + เข้าสู่ระบบ/สมัคร
// ============================================================

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useGame } from "../store";
import { paintScene } from "../pixel/scenes";
import { drawSprite, heroSprite, slimeSprite, goblinSprite, kingSlimeSprite } from "../pixel/sprites";
import { sfx } from "../sfx";

export default function TitleScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const login = useGame((s) => s.login);
  const register = useGame((s) => s.register);
  const startGuest = useGame((s) => s.startGuest);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const hero = heroSprite();
    const slime = slimeSprite();
    const goblin = goblinSprite();
    const king = kingSlimeSprite();
    let raf = 0;

    const loop = (t: number): void => {
      paintScene(ctx, "fields", t);
      // Hero spotlight + layered enemy lineup
      ctx.fillStyle = "rgba(255, 225, 143, 0.13)";
      ctx.fillRect(42, 62, 70, 76);
      ctx.fillStyle = "rgba(20, 16, 43, 0.38)";
      ctx.fillRect(40, 144, 76, 6);
      drawSprite(ctx, hero, 78, 150, { scaleY: 1 + (Math.sin(t / 340) < -0.6 ? 0.03 : 0), scaleX: 1.05 });
      drawSprite(ctx, slime, 205, 150, {
        flip: true,
        scaleY: 1.05 + Math.sin(t / 300) * 0.06,
        scaleX: 1.05 - Math.sin(t / 300) * 0.04,
      });
      drawSprite(ctx, goblin, 248, 150, { flip: true, alpha: Math.sin(t / 700) < 0 ? 0.85 : 1, scaleX: 0.82, scaleY: 0.82 });
      drawSprite(ctx, king, 165, 150, {
        flip: true,
        alpha: 0.65 + 0.25 * Math.sin(t / 900),
        scaleY: 0.9 + Math.sin(t / 380) * 0.04,
        scaleX: 0.9,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const fail =
      mode === "login"
        ? await login(email.trim(), password)
        : await register(email.trim(), password, displayName.trim() || "นักผจญภัย");
    if (fail) setErr(fail);
    setBusy(false);
  }

  return (
    <div className="title-wrap">
      <div className="canvas-frame title-frame">
        <canvas ref={canvasRef} width={320} height={180} className="pixel-canvas" />
        <div className="title-overlay">
          <div className="game-logo">
            <span className="logo-kicker">A PIXEL ADVENTURE</span>
            <span className="logo-line1">⚔ M-GAME</span>
            <span className="logo-line2">VERSION 2 · FUN-FIRST RPG</span>
          </div>
        </div>
      </div>

      <div className="panel-card auth-card">
        <div className="auth-tabs">
          <button
            className={`tab ${mode === "login" ? "on" : ""}`}
            onClick={() => {
              setMode("login");
              setErr(null);
              sfx("ui");
            }}
          >
            เข้าสู่ระบบ
          </button>
          <button
            className={`tab ${mode === "register" ? "on" : ""}`}
            onClick={() => {
              setMode("register");
              setErr(null);
              sfx("ui");
            }}
          >
            สมัครใหม่ (ฟรี)
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label className="field">
              <span>ชื่อผู้เล่น</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="เช่น สลายิน"
                maxLength={24}
              />
            </label>
          )}
          <label className="field">
            <span>อีเมล</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span>รหัสผ่าน</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              minLength={8}
              required
            />
          </label>

          {err && <div className="form-error">⚠️ {err}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "⏳ กำลัง…" : mode === "login" ? "🚪 เข้าเล่น" : "🌱 สมัครและเริ่มเล่น"}
          </button>
        </form>

        <button
          className="btn btn-gold btn-block"
          onClick={() => { void startGuest(); }}
        >
          ⚡ เริ่มเล่นทันที (Guest)
        </button>

        <button
          className="btn btn-ghost btn-block btn-sm"
          onClick={() => {
            setEmail("demo@game.dev");
            setPassword("demo1234");
            setMode("login");
            setErr(null);
            sfx("ui");
          }}
        >
          🎭 ใช้บัญชีทดสอบ demo@game.dev / demo1234
        </button>

        <div className="auth-foot">
          บัญชีทุกบัญชีเริ่มพร้อม 500 🪙 · ตัวละคร · อาวุธ — ข้อมูลเกมทั้งหมดเก็บฝั่งเซิร์ฟเวอร์
        </div>
      </div>
    </div>
  );
}
