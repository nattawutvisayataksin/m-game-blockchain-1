"use client";

// ============================================================
// InventoryPanel — คลังไอเทมของผู้เล่น (+ ช่องข้อมูล Web3-ready)
// ============================================================

import { useGame } from "../store";
import type { InventoryItem } from "../types";
import type { ReactElement } from "react";

const KIND_TH: Record<string, string> = {
  CHARACTER: "ตัวละคร",
  WEAPON: "อาวุธ",
  ARMOR: "เกราะ",
  ACCESSORY: "สินร้ายตกแต่ง",
  CONSUMABLE: "ยา",
  MATERIAL: "วัสดุ",
  LAND: "ที่ดิน",
};

const RARITY_TH: Record<string, string> = {
  COMMON: "ธรรมดา",
  UNCOMMON: "หาได้",
  RARE: "หายาก",
  EPIC: "เอปิก",
  LEGENDARY: "ตำนาน",
};

interface Props {
  ItemIconCv: (props: { item: InventoryItem; size?: number }) => ReactElement;
}

export default function InventoryPanel({ ItemIconCv }: Props): React.ReactElement {
  const items = useGame((s) => s.items);
  const setPanel = useGame((s) => s.setPanel);

  return (
    <div className="panel-card">
      <div className="panel-head">
        <div className="panel-title">🎒 คลังไอเทม ({items.length})</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setPanel(null)}>
          ✕
        </button>
      </div>

      <div className="item-list">
        {items.map((it) => (
          <div key={it.id} className={`item-row rarity-${it.rarity.toLowerCase()}`}>
            <ItemIconCv item={it} />
            <div className="item-main">
              <div className="item-name">
                {it.name}
                <span className="kind-chip">{KIND_TH[it.kind] ?? it.kind}</span>
                {it.quantity > 1 && <span className="qty-chip">×{it.quantity}</span>}
                {it.web3.isOnChain && <span className="web3-chip">🔗 on-chain</span>}
              </div>
              <div className="item-sub">
                {RARITY_TH[it.rarity] ?? it.rarity}
                {it.instance.level != null && <> · Lv.{it.instance.level}</>}
                {it.instance.exp != null && <> · EXP {it.instance.exp}</>}
                {it.instance.currentHp != null && <> · ❤️ {it.instance.currentHp}</>}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="muted">ยังไม่มีไอเทม — ลองชนะด่านหรือร้านค้าก่อน</div>}
      </div>
    </div>
  );
}
