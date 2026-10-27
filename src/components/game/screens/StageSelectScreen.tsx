"use client";

// ============================================================
// StageSelectScreen — เลือกตัวละคร + อาวุธ + ด่าน (มีภาพฉากจริง)
// server-authoritative ยังคงเดิม — ตรงนี้เป็น "ตำแหน่งยืน่าชอบ" เท่านั้น
// ============================================================

import { useEffect, useRef, type ReactElement } from "react";
import { useGame } from "../store";
import { paintScenePreview } from "../pixel/scenes";
import { sceneKindOf } from "../pixel/renderer";
import { buildIcon, itemIconByCode } from "../pixel/sprites";
import type { StageInfo } from "../types";
import { sfx } from "../sfx";
import { ItemIconCv } from "./HubScreen";

function StageCard({ stage }: { stage: StageInfo }): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    paintScenePreview(cv, sceneKindOf(stage.code));
  }, [stage.code]);

  const enemy = (stage.enemy ?? null) as { name?: string } | null;
  const enemyKind = String((stage.enemy as { kind?: string } | null)?.kind ?? "");
  const enemyStats = (stage.enemy ?? {}) as { hp?: number; atk?: number; def?: number };

  return (
    <button
      className="stage-card"
      onClick={() => {
        const choose = useGame.getState().chooseStage;
        choose(stage);
      }}
    >
      <canvas ref={ref} width={208} height={117} className="pixel-canvas stage-preview" />
      <div className="stage-info">
        <div className="stage-name">
          {stage.name}
          <span className="stage-order">#{stage.order}</span>
        </div>
        <div className="stage-desc">{stage.description ?? ""}</div>
        <div className="stage-enemy">👹 ศัตรู: {enemy?.name ?? "ไม่ทราบ"} {enemyKind && <span className="kind-chip">{enemyKind}</span>}</div>
        <div className="stage-stats">HP {enemyStats.hp ?? "?"} · ATK {enemyStats.atk ?? "?"} · DEF {enemyStats.def ?? "?"}</div>
      </div>
    </button>
  );
}

export default function StageSelectScreen() {
  const items = useGame((s) => s.items);
  const stages = useGame((s) => s.stages);
  const selectedCharacterId = useGame((s) => s.selectedCharacterId);
  const selectedWeaponId = useGame((s) => s.selectedWeaponId);
  const setCharacter = useGame((s) => s.setCharacter);
  const setWeapon = useGame((s) => s.setWeapon);
  const setScreen = useGame((s) => s.setScreen);

  const characters = items.filter((i) => i.kind === "CHARACTER");
  const weapons = items.filter((i) => i.kind === "WEAPON");
  const chosenChar = characters.find((c) => c.id === selectedCharacterId) ?? characters[0];
  const chosenWeapon = weapons.find((w) => w.id === selectedWeaponId) ?? null;

  return (
    <div className="stage-select">
      <header className="ss-header">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            sfx("ui");
            setScreen("hub");
          }}
        >
          ← กลับฐาน
        </button>
        <h2 className="ss-title">🗺️ ทีม &amp; ด่าน</h2>
      </header>

      <section className="ss-row">
        <div className="ss-label">🧑‍🎤 ตัวละคร</div>
        <div className="chips">
          {characters.map((c) => (
            <button
              key={c.id}
              className={`chip ${c.id === chosenChar?.id ? "on" : ""}`}
              onClick={() => {
                sfx("ui");
                setCharacter(c.id);
              }}
            >
              <ItemIconCv item={c} size={20} />
              <span>
                {c.name}
                {c.instance.level != null && <em> Lv.{c.instance.level}</em>}
              </span>
            </button>
          ))}
          {characters.length === 0 && <span className="muted">ยังไม่มีตัวละคร (ควรเกิดจากของขวัญเริ่มเกม)</span>}
        </div>
      </section>

      <section className="ss-row">
        <div className="ss-label">🗡️ อาวุธ</div>
        <div className="chips">
          <button
            className={`chip ${chosenWeapon === null ? "on" : ""}`}
            onClick={() => {
              sfx("ui");
              setWeapon(null);
            }}
          >
            ✊ มือเปล่า
          </button>
          {weapons.map((w) => (
            <button
              key={w.id}
              className={`chip ${w.id === chosenWeapon?.id ? "on" : ""}`}
              onClick={() => {
                sfx("ui");
                setWeapon(w.id);
              }}
            >
              <ItemIconCv item={w} size={20} />
              <span>{w.name}</span>
            </button>
          ))}
          {weapons.length === 0 && <span className="muted">ซื้ออาวุธเพิ่มได้ในร้านค้า</span>}
        </div>
      </section>

      <section className="ss-row">
        <div className="ss-label">⚔️ เลือกด่าน — กดการ์ดเพื่อออกศึก</div>
        <div className="stage-grid">
          {stages.map((s) => (
            <StageCard key={s.id} stage={s} />
          ))}
          {stages.length === 0 && (
            <div className="panel-card">
              กำลังโหลดด่าน… (หรือเซิร์ฟเวอร์ยังไม่ตอบ — ลองรีเฟรช)
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
