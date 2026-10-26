"use client";

// ============================================================
// RewardsPanel — รางวัลที่รอรับ + ยอด claim ล่าสุด
// ============================================================

import { useState } from "react";
import type { ReactElement } from "react";
import { useGame } from "../store";

export default function RewardsPanel(): ReactElement {
  const pendingCount = useGame((s) => s.pendingCount);
  const pending = useGame((s) => s.pending);
  const lastClaim = useGame((s) => s.lastClaim);
  const claim = useGame((s) => s.claim);
  const setPanel = useGame((s) => s.setPanel);
  const [busy, setBusy] = useState(false);

  const levelUps = (lastClaim?.expResults ?? []).filter((r) => r.levelUps > 0);

  return (
    <div className="panel-card">
      <div className="panel-head">
        <div className="panel-title">
          🎁 รางวัลที่รอรับ <span className={`badge-pill ${pendingCount > 0 ? "hot" : ""}`}>{pendingCount}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setPanel(null)}>
          ✕
        </button>
      </div>

      <div className="reward-list">
        {pending.map((r) => (
          <div key={r.id} className="reward-row">
            {r.type === "GOLD" && <span>🪙 เงิน</span>}
            {r.type === "EXP" && <span>⭐ ค่าประสบการณ์</span>}
            {r.type === "ITEM" && (
              <span>
                📦 {r.item?.name ?? "ไอเทม"} <em className="muted">({r.item?.rarity ?? ""})</em>
              </span>
            )}
            {r.quantity && r.type !== "ITEM" && <b className="gold-text">+{r.quantity}</b>}
            {r.type === "ITEM" && <b className="gold-text">×1</b>}
          </div>
        ))}
        {pendingCount === 0 && <div className="muted">ไม่มีรางวัลค้างอยู่ — ไปชนะด่านเพิ่มก่อน!</div>}
      </div>

      <button
        className={`btn btn-block ${pendingCount > 0 ? "btn-gold" : "btn-disabled"}`}
        disabled={pendingCount === 0 || busy}
        onClick={() => {
          if (busy) return;
          setBusy(true);
          void claim().finally(() => setBusy(false));
        }}
      >
        {busy ? "⏳ กำลังมอบของ…" : pendingCount > 0 ? "🎉 รับรางวัลทั้งหมด" : "ไม่มีอะไรให้รับ"}
      </button>

      {lastClaim && (
        <div className="claim-summary">
          <div className="claim-head">✅ รับล่าสุด</div>
          <div>
            🪙 เงิน received +{lastClaim.goldGranted} (คงเหลือ {Number(lastClaim.newGoldBalance).toLocaleString("th-TH")})
          </div>
          {lastClaim.itemsGranted.length > 0 && (
            <div>📦 {lastClaim.itemsGranted.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</div>
          )}
          {levelUps.map((l) => (
            <div key={l.characterName} className="lv-up">
              🔥 {l.characterName} เลื่อนเป็น <b>Lv.{l.levelAfter}</b>!
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
