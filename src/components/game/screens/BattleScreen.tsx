"use client";

// ============================================================
// BattleScreen — ส่ง action ให้ server แล้วเล่นอนิเมชันจาก events
//   • ปุ่มทั้ง 4 ท่า (server-authoritative — จอไม่คิดเลขเอง)
//   • renderer จะเรียก onQueueEmpty → ปลดล็อกปุ่ม/เปิดจบเกม
// ============================================================

import { useEffect, useRef, useState } from "react";
import { abandonCurrentBattle, ApiFailure, battleAction, startBattle } from "../api";
import { useGame } from "../store";
import { BattleRenderer, sceneKindOf } from "../pixel/renderer";
import { sfx } from "../sfx";
import type { BattleView } from "../types";

type EndStatus = "WON" | "LOST" | "FLED";

export default function BattleScreen() {
  const stage = useGame((s) => s.activeStage);
  const charId = useGame((s) => s.selectedCharacterId);
  const weaponId = useGame((s) => s.selectedWeaponId);
  const setScreen = useGame((s) => s.setScreen);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BattleRenderer | null>(null);
  const lastViewRef = useRef<BattleView | null>(null);

  const [view, setView] = useState<BattleView | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [ended, setEnded] = useState<EndStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // ---------- เปิดการต่อสู้ ----------
  useEffect(() => {
    if (!stage || !charId) return;
    let cancelled = false;

    setView(null);
    setEnded(null);
    setLoadErr(null);
    setBusy(true);

    const openBattle = async (): Promise<BattleView> => {
      try {
        return await startBattle(stage.code, charId, weaponId ?? undefined);
      } catch (e) {
        // A previous tab can leave an orphaned IN_PROGRESS row. Recover once,
        // then open the requested battle instead of showing a dead-end error UI.
        if (!(e instanceof ApiFailure) || e.code !== "CONFLICT") throw e;
        await abandonCurrentBattle();
        return startBattle(stage.code, charId, weaponId ?? undefined);
      }
    };

    openBattle()
      .then((v) => {
        if (cancelled) return;
        lastViewRef.current = v;
        setView(v);

        const cv = canvasRef.current;
        if (!cv) return;
        const r = new BattleRenderer(cv, {
          stageCode: stage.code,
          heroAppearance: (useGame.getState().items.find((i) => i.id === charId)?.instance.appearance as "ember" | "ocean" | "moon") ?? "ember",
          heroOutfit: (useGame.getState().items.find((i) => i.id === charId)?.instance.outfit as "traveler" | "guardian" | "rogue") ?? "traveler",
          playerHp: v.player.hp,
          playerMaxHp: v.player.maxHp,
          enemyHp: v.enemy.hp,
          enemyMaxHp: v.enemy.maxHp,
        });
        r.onQueueEmpty = () => {
          const latest = lastViewRef.current;
          setBusy(false);
          if (latest && latest.status !== "IN_PROGRESS") {
            setEnded(latest.status as EndStatus);
          }
        };
        r.startView(v);
        r.start();
        rendererRef.current = r;
        sfx("start");
        setBusy(false);
      })
      .catch((e) => {
        if (cancelled) return;
          setLoadErr(useGame.getState().errText(e));
        setBusy(false);
      });

    return () => {
      cancelled = true;
      rendererRef.current?.stop();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage?.id, charId, weaponId]);

  const act = (action: "ATTACK" | "SKILL" | "GUARD" | "FLEE" | "FINISHER"): void => {
    const r = rendererRef.current;
    if (!r || !view || busy || ended || r.isBusy()) return;
    setBusy(true);
    sfx("ui");
    battleAction(view.id, action)
      .then((v) => {
        lastViewRef.current = v;
        setView(v);
        r.applyView(v);
      })
      .catch((e) => {
        setBusy(false);
        useGame.getState().showBanner(useGame.getState().errText(e), "error");
      });
  };

  const finish = async (dest: "hubRewards" | "stageSelect"): Promise<void> => {
    setClaiming(true);
    const s = useGame.getState();
    if (ended === "WON") await s.claim();
    s.setScreen("hub");
    if (dest === "hubRewards") s.setPanel("rewards");
    setClaiming(false);
  };

  const leave = (): void => {
    rendererRef.current?.stop();
    setScreen("hub");
  };

  const recover = async (): Promise<void> => {
    setRecovering(true);
    try {
      await abandonCurrentBattle();
      await useGame.getState().refresh();
      setScreen("stageSelect");
      useGame.getState().showBanner("ยกเลิกการต่อสู้เดิมแล้ว เริ่มด่านใหม่ได้เลย");
    } catch (e) {
      setLoadErr(useGame.getState().errText(e));
      setRecovering(false);
    }
  };

  if (!stage || !charId) {
    return (
      <div className="battle-wrap">
        <div className="panel-card">
          ยังไม่เลือกตัวละคร/ด่าน ตัวอย่างเกิดจากการเดินเกมผิดลำดับ (ลองเข้าเมนูออกไปต่อสู้อีกครั้ง)
        </div>
      </div>
    );
  }

  const skillCd = view?.skillCd ?? 0;
  const momentum = view?.momentum ?? 0;
  const locked = busy || ended !== null || loadErr !== null;
  const skillDisabled = locked || skillCd > 0;

  return (
    <div className="battle-wrap">
      <header className="battle-top">
        <button className="btn btn-ghost btn-sm" onClick={leave}>
          ← ออก
        </button>
        <span className="battle-stage"><span className="stage-eyebrow">CURRENT MISSION</span>🗺️ {stage.name}</span>
        <span className="battle-turn">TURN <strong>{String(view?.turn ?? 0).padStart(2, "0")}</strong></span>
      </header>

      <div className="canvas-frame battle-frame">
        <canvas ref={canvasRef} width={320} height={180} className="pixel-canvas" />
        <div className="hp-label hp-left">{view?.player.name ?? "…"}</div>
        <div className="hp-label hp-right">{view?.enemy.name ?? "…"}</div>

        {ended && (
          <div className="overlay">
            <div className={`end-card end-${ended}`}>
              <div className="end-title">
                {ended === "WON" && "🏆 ชนะเลย!"}
                {ended === "LOST" && "💀 พ่ายแพ้…"}
                {ended === "FLED" && "💨 หนีรอดมาได้"}
              </div>

              {ended === "WON" && (
                <ul className="reward-line">
                  {(view?.rewards ?? []).map((rw) => (
                    <li key={rw.id}>
                      {rw.type === "GOLD" && `🪙 +${rw.quantity}`}
                      {rw.type === "EXP" && `⭐ +${rw.quantity} EXP`}
                      {rw.type === "ITEM" && `📦 ${rw.item?.name ?? "ไอเทม"} ×${rw.item?.quantity ?? 1}`}
                    </li>
                  ))}
                </ul>
              )}

              <div className="end-actions">
                {ended !== "FLED" && (
                  <button className="btn btn-primary" disabled={claiming} onClick={() => void finish("hubRewards")}>
                    {claiming ? "⏳ กำลังรับ…" : ended === "WON" ? "🎁 รับรางวัล → กลับฐาน" : "กลับฐาน"}
                  </button>
                )}
                <button className="btn btn-dark" disabled={claiming} onClick={() => void finish("stageSelect")}>
                  {ended === "FLED" ? "🏠 กลับฐาน" : "⚔️ เลือกด่านต่อ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="battle-actions">
        <button className="action-btn atk" disabled={locked} onClick={() => act("ATTACK")}>
          ⚔️ <span>โจมตี</span>
        </button>
        <button className="action-btn skill" disabled={skillDisabled} onClick={() => act("SKILL")}>
          ✨ <span>{skillCd > 0 ? `รอ ${skillCd} เทิร์น` : "สกิล"}</span>
        </button>
        <button className="action-btn guard" disabled={locked} onClick={() => act("GUARD")}>
          🛡️ <span>ป้องกัน</span>
        </button>
        <button className="action-btn finisher" disabled={locked || momentum < 100} onClick={() => act("FINISHER")}>
          💥 <span>{momentum >= 100 ? "FINISHER" : `Momentum ${momentum}%`}</span>
        </button>
        <button className="action-btn flee" disabled={locked} onClick={() => act("FLEE")}>
          🏃 <span>หนี</span>
        </button>
      </div>

      <div className="battle-hint">เลือกคำสั่งหนึ่งอย่างต่อเทิร์น · ผลการต่อสู้คำนวณโดยเซิร์ฟเวอร์</div>

      <div className="battle-log">
        {(view?.log ?? []).slice(-4).map((line, i, arr) => (
          <div key={`${i}-${line}`} className={i === arr.length - 1 ? "log-line latest" : "log-line"}>
            {line}
          </div>
        ))}
      </div>

      {loadErr && <div className="form-error">⚠️ {loadErr}</div>}
    </div>
  );
}
