"use client";

// ============================================================
// ShopPanel — ร้านค้า: ซื้อด้วย GOLD โดยหักยอดตรงจากบัญชีผู้เล่น
// ============================================================

import { useState } from "react";
import { useGame } from "../store";
import { buildIcon, itemIconByCode } from "../pixel/sprites";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";

function ShopIcon({ code, kind }: { code: string; kind: string }): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const spr = buildIcon(itemIconByCode(code, kind));
    ctx.drawImage(spr.frame, 0, 0, cv.width, cv.height);
  }, [code, kind]);

  return <canvas ref={ref} width={26} height={26} className="item-icon" />;
}

export default function ShopPanel(): ReactElement {
  const shop = useGame((s) => s.shop);
  const gold = useGame((s) => s.gold);
  const buy = useGame((s) => s.buy);
  const setPanel = useGame((s) => s.setPanel);
  const [buying, setBuying] = useState<string | null>(null);

  const KIND_TAG: Record<string, string> = {
    WEAPON: "🗡️ อาวุธ",
    ARMOR: "🥼 เกราะ",
    CONSUMABLE: "🧪 ยา",
    MATERIAL: "📦 วัสดุ",
    CHARACTER: "🧑‍🎤 ตัวละคร",
  };

  async function doBuy(code: string): Promise<void> {
    if (buying) return;
    setBuying(code);
    await buy(code, 1);
    setBuying(null);
  }

  return (
    <div className="panel-card">
      <div className="panel-head">
        <div className="panel-title">
          🏪 ร้านค้า <span className="gold-chip small">เงิน {Number(gold).toLocaleString("th-TH")} 🪙</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setPanel(null)}>
          ✕
        </button>
      </div>

      <div className="shop-list">
        {shop.map((t) => {
          const price = Number(t.shopPrice ?? 0);
          const afford = Number(gold) >= price;
          return (
            <div key={t.code} className="shop-row">
              <ShopIcon code={t.code} kind={t.kind} />
              <div className="item-main">
                <div className="item-name">
                  {t.name}
                  <span className="kind-chip">{KIND_TAG[t.kind] ?? t.kind}</span>
                  {t.kind !== "WEAPON" && t.code.includes("potion") && (
                    <span className="soon-chip">ใช้ในสงครามเร็ว ๆ นี้</span>
                  )}
                </div>
                <div className="item-sub">{t.description ?? ""}</div>
              </div>
              <button
                className={`btn btn-small ${afford ? "btn-gold" : "btn-disabled"}`}
                disabled={!afford || buying !== null}
                onClick={() => void doBuy(t.code)}
              >
                {buying === t.code ? "⏳" : `${price} 🪙`}
              </button>
            </div>
          );
        })}
        {shop.length === 0 && <div className="muted">ร้านยังเปิดไม่สอง — ลองใหม่อีกที</div>}
      </div>
      <div className="shop-foot muted">
        การซื้อหัก GOLD จากยอดผู้เล่นโดยตรง ไม่มี Ledger และไม่มีค่าธรรมเนียมแฝง
      </div>
    </div>
  );
}
