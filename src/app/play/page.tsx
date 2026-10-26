"use client";

// /play — หน้าเล่นเกม (client-only)
import dynamic from "next/dynamic";

const GameShell = dynamic(() => import("@/components/game/GameShell"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#efe7fa" }}>
      ⚔️ กำลังโหลดเกม…
    </div>
  ),
});

export default function PlayPage() {
  return <GameShell />;
}
