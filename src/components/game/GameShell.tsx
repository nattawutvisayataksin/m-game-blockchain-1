"use client";

// ============================================================
// GameShell — เปลือกเกม: จัดการ screen สลับ + banner + บูต
// ============================================================

import { useEffect, type ReactNode } from "react";
import { useGame } from "./store";
import "./game.css";
import TitleScreen from "./screens/TitleScreen";
import HubScreen from "./screens/HubScreen";
import StageSelectScreen from "./screens/StageSelectScreen";
import BattleScreen from "./screens/BattleScreen";

export default function GameShell() {
  const booted = useGame((s) => s.booted);
  const boot = useGame((s) => s.boot);
  const screen = useGame((s) => s.screen);
  const banner = useGame((s) => s.banner);

  useEffect(() => {
    void boot();
  }, [boot]);

  // banner ลบตัวเองหลังครู่หนึ่ง
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => {
      useGame.setState({ banner: null });
    }, 3600);
    return () => clearTimeout(id);
  }, [banner]);

  const switchScreen: Record<typeof screen, ReactNode> = {
    title: <TitleScreen />,
    hub: <HubScreen />,
    stageSelect: <StageSelectScreen />,
    battle: <BattleScreen />,
  };

  return (
    <div className="game-root">
      {booted ? (
        switchScreen[screen] ?? <HubScreen />
      ) : (
        <div className="game-splash">
          <div className="splash-title">⚔️ M-GAME</div>
          <div className="splash-sub">กำลังเรียกเซิร์ฟเวอร์…</div>
        </div>
      )}

      {banner && (
        <div key={banner.id} className={`game-banner ${banner.kind}`}>
          {banner.msg}
        </div>
      )}
    </div>
  );
}
