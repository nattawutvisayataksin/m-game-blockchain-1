"use client";

// ============================================================
// HubScreen — ฐานหลัก: hero card + เมนู (คลัง/ร้าน/รางวัล/wallet)
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { drawSprite, heroSprite, buildIcon, itemIconByCode, type HeroAppearance, type HeroOutfit } from "../pixel/sprites";
import { customizeCharacter } from "../api";
import type { InventoryItem } from "../types";
import InventoryPanel from "../panels/InventoryPanel";
import ShopPanel from "../panels/ShopPanel";
import RewardsPanel from "../panels/RewardsPanel";
import { sfx } from "../sfx";

function HeroPortrait({ appearance = "ember", outfit = "traveler" }: { appearance?: string; outfit?: string }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    // ผืนหลังเบลอ ๆ
    const grad = ctx.createLinearGradient(0, 0, 0, cv.height);
    grad.addColorStop(0, "#2a1745");
    grad.addColorStop(1, "#141022");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cv.width, cv.height);
    // ดาวประกาย
    ctx.fillStyle = "#efe6ff";
    for (let i = 0; i < 14; i++) {
      const x = (i * 37) % cv.width;
      const y = (i * 23) % 40;
      ctx.fillRect(x, y, 1, 1);
    }
    const hero = heroSprite(appearance as HeroAppearance, outfit as HeroOutfit);
    drawSprite(ctx, hero, cv.width / 2, cv.height - 6, { scaleY: 2.4, scaleX: 2.4 });
  }, [appearance, outfit]);

  return <canvas ref={ref} width={64} height={70} className="hero-portrait" />;
}

function ItemIconCv({ item, size = 26 }: { item: InventoryItem; size?: number }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const key = itemIconByCode(item.code, item.kind);
    const spr = buildIcon(key);
    ctx.drawImage(spr.frame, 0, 0, cv.width, cv.height);
  }, [item.code, item.kind]);

  return <canvas ref={ref} width={size} height={size} className="item-icon" aria-hidden />;
}

export { ItemIconCv };

export default function HubScreen() {
  const user = useGame((s) => s.user);
  const gold = useGame((s) => s.gold);
  const items = useGame((s) => s.items);
  const pendingCount = useGame((s) => s.pendingCount);
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);
  const setScreen = useGame((s) => s.setScreen);
  const logout = useGame((s) => s.logout);

  const character = items.find((i) => i.kind === "CHARACTER") ?? null;
  const [appearance, setAppearance] = useState<HeroAppearance>((character?.instance.appearance as HeroAppearance) ?? "ember");
  const [outfit, setOutfit] = useState<HeroOutfit>((character?.instance.outfit as HeroOutfit) ?? "traveler");
  const [customizing, setCustomizing] = useState(false);
  const herbalCount = items
    .filter((i) => i.code.includes("potion"))
    .reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="hub-wrap">
      <header className="hub-header">
        <div className="hub-name">
          🛡️ {user?.displayName ?? "นักผจญภัย"}
          {character?.instance.level != null && (
            <span className="lv-chip">Lv.{character.instance.level}</span>
          )}
        </div>
        <div className="hub-actions">
          <span className="gold-chip">🪙 {Number(gold).toLocaleString("th-TH")}</span>
          {herbalCount > 0 && <span className="mini-chip">🧪×{herbalCount}</span>}
          {pendingCount > 0 && (
            <button className="mini-chip glow" onClick={() => { sfx("ui"); setScreen("hub"); setPanel("rewards"); }}>
              🎁 รางวัลรอ {pendingCount}!
            </button>
          )}
        </div>
      </header>

      <div className="hub-body">
        <aside className="hero-card">
          <div className="hero-frame-wrap">
            <HeroPortrait appearance={appearance} outfit={outfit} />
          </div>
          <div className="hero-name">{character?.name ?? "Recruit"}</div>
          <div className="hero-stats">
            {character?.instance.level != null && <div>Lv. {character.instance.level}</div>}
            {character?.instance.exp != null && <div>EXP {character.instance.exp} / {character.instance.nextLevelExp ?? "?"}</div>}
            {character?.instance.currentHp != null && <div>❤️ {character.instance.currentHp}</div>}
            {character?.instance.stats && <div className="hero-stat-grid">
              <span>❤️ {character.instance.stats.hp}</span><span>⚔️ {character.instance.stats.atk}</span>
              <span>🛡️ {character.instance.stats.def}</span><span>⚡ {character.instance.stats.spd}</span>
              <span>🎯 {Math.round(character.instance.stats.crit * 100)}%</span>
            </div>}
          </div>
          {character?.instance.level != null && <div className="level-progress">
            <div className="level-progress-head"><span>LEVEL PROGRESS</span><span>{character.instance.exp ?? 0}/{character.instance.nextLevelExp ?? "?"}</span></div>
            <div className="level-progress-track"><div style={{ width: `${Math.min(100, ((character.instance.exp ?? 0) / Math.max(1, character.instance.nextLevelExp ?? 1)) * 100)}%` }} /></div>
            <div className="level-reward-note">เลเวลอัป: HP +22 · ATK +4 · DEF +2 · SPD +1 · CRIT +0.2%</div>
          </div>}
          {character && (
            <button className="btn btn-ghost btn-sm customize-btn" disabled={customizing} onClick={async () => {
              setCustomizing(true);
              try {
                const nextAppearance: HeroAppearance = appearance === "ember" ? "ocean" : appearance === "ocean" ? "moon" : "ember";
                const nextOutfit: HeroOutfit = outfit === "traveler" ? "guardian" : outfit === "guardian" ? "rogue" : "traveler";
                await customizeCharacter(character.id, nextAppearance, nextOutfit);
                setAppearance(nextAppearance); setOutfit(nextOutfit);
                useGame.getState().showBanner(`ปรับโฉมเป็น ${nextAppearance} / ${nextOutfit} แล้ว`);
                void useGame.getState().refresh();
              } catch (e) { useGame.getState().showBanner(useGame.getState().errText(e), "error"); }
              setCustomizing(false);
            }}>{customizing ? "⏳ กำลังปรับโฉม…" : "🎨 เปลี่ยนหน้าตา / ชุด"}</button>
          )}
        </aside>

        <main className="menu-col">
          <button
            className="menu-btn main-cta"
            onClick={() => {
              sfx("ui");
              setScreen("stageSelect");
            }}
          >
            ⚔️ <span>ออกไปต่อสู้</span>
            <small>เลือกด่าน · อาวุธ แล้วลุยเลย</small>
          </button>

          <div className="menu-grid">
            <button className="menu-btn" onClick={() => { sfx("ui"); setPanel("inventory"); }}>
              🎒 <span>คลังไอเทม</span>
              <small>{items.length} ชิ้น</small>
            </button>
            <button className="menu-btn" onClick={() => { sfx("ui"); setPanel("shop"); }}>
              🏪 <span>ร้านค้า</span>
              <small>ซื้ออาวุธ/ยา</small>
            </button>
            <button className="menu-btn" onClick={() => { sfx("ui"); setPanel("rewards"); }}>
              🎁 <span>รับรางวัล</span>
              <small>{pendingCount > 0 ? `มี ${pendingCount} ใบรออยู่` : "ไม่มีใบรออยู่"}</small>
            </button>
            <button className="menu-btn disabled" title="Phase B — wagmi + SIWE (รอเปิด)">
              🔗 <span>เชื่อมกระเป๋า</span>
              <small>Phase B · รอเปิด</small>
            </button>
          </div>

          <div className={panel === "inventory" ? "" : "hidden"}>
            <InventoryPanel ItemIconCv={ItemIconCv} />
          </div>
          <div className={panel === "shop" ? "" : "hidden"}>
            <ShopPanel />
          </div>
          <div className={panel === "rewards" ? "" : "hidden"}>
            <RewardsPanel />
          </div>
          <div className={panel === "wallet" ? "" : "hidden"}>
            <div className="panel-card">
              <div className="panel-title">🔗 เชื่อมกระเป๋า (Web3)</div>
              <p className="muted">
                Phase B — ปุ่มเชื่อมกระเป๋า (wagmi + SIWE, Bitkub Chain 96 / testnet 25925)
                จะเปิดใช้ในภายหลัง ตาราง + adapter รองรับแล้วทั้งหมดใน schema
              </p>
              <button className="btn btn-dark" disabled>
                เร็ว ๆ นี้ 🚧
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="hub-foot">
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          🚪 ออกจากระบบ
        </button>
        <span className="muted server-note">ข้อมูลทั้งหมดฝั่งเซิร์ฟเวอร์ · Web3 พร้อมแต่ยังปิด (BRIDGE=false)</span>
      </footer>
    </div>
  );
}
