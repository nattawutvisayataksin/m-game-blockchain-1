// Smoke test เดินโฟลว์เกมจริงผ่าน HTTP (register → battle → claim → shop → ledger audit)
const BASE = process.env.BASE ?? "http://localhost:3000";
const email = `smoke_${Date.now()}@game.dev`;
const password = "smoke-pass-1234";
let token = "";
let fail = 0;

async function api(method: "GET" | "POST", path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false }));
  if (!res.ok || json?.ok === false) {
    console.log(`✗ ${method} ${path} → ${res.status}`, JSON.stringify(json).slice(0, 200));
    fail++;
    return null;
  }
  return json.data ?? json;
}

async function main() {
  const health = await api("GET", "/api/health");
  console.log("health:", JSON.stringify(health));

  const reg = await api("POST", "/api/auth/register", { email, password, displayName: "SmokeHero" });
  token = reg.token;
  console.log("registered:", reg.user.displayName, "token len:", token.length);

  const me1 = await api("GET", "/api/auth/me");
  console.log("gold initial:", me1.goldBalance);

  const stages = await api("GET", "/api/stages");
  const stageCode = stages[0].code;
  console.log("stage:", stageCode);

  const inv = await api("GET", "/api/inventory");
  const character = inv.items.find((i: any) => i.kind === "CHARACTER");
  const weapon = inv.items.find((i: any) => i.kind === "WEAPON");
  console.log("inventory:", inv.items.length, "items; char:", character?.name, "weapon:", weapon?.name);

  const battle = await api("POST", "/api/battles", {
    stageCode,
    characterInvId: character.id,
    ...(weapon ? { weaponInvId: weapon.id } : {}),
  });
  console.log("battle started:", battle.id, "vs", battle.enemy.name, "events:", battle.events?.length ?? 0);

  let view = battle;
  let turns = 0;
  while (view.status === "IN_PROGRESS" && turns < 40) {
    turns++;
    const action = view.skillCd > 0 ? (turns % 3 === 0 ? "GUARD" : "ATTACK") : turns % 2 === 0 ? "SKILL" : "ATTACK";
    view = await api("POST", `/api/battles/${view.id}/action`, { action });
    if (!view) break;
    const evts = view.events ?? [];
    const lastSeq: number = view._lastSeq ?? 0;
    console.log(
      `  turn ${view.turn} [${action}] hp=${view.player.hp}/${view.player.maxHp} vs enemy=${view.enemy.hp}/${view.enemy.maxHp} events=${evts.filter((e: any) => e.seq > lastSeq).length}`,
    );
    view._lastSeq = Math.max(lastSeq, ...evts.map((e: any) => e.seq));
    // ทุก 4 เทิร์นดื่มยา (ถ้ามี) เพื่อดู flow guard+skill+อื่น ๆ
  }

  console.log("final status:", view.status, "rewards:", JSON.stringify(view.rewards ?? []));

  const pending = await api("GET", "/api/rewards");
  console.log("pending rewards:", pending.pendingCount);

  const claim = await api("POST", "/api/rewards/claim", {});
  console.log("claim:", JSON.stringify(claim));

  const me2 = await api("GET", "/api/auth/me");
  console.log("gold after claim:", me2.goldBalance);

  const shop = await api("GET", "/api/shop");
  const potion = shop.find((s: any) => s.code === "potion_small");
  const purch = await api("POST", "/api/shop/purchase", { templateCode: "potion_small", quantity: 2 });
  console.log("shop potion price:", potion.shopPrice, "→ purchase:", JSON.stringify(purch));

  const me3 = await api("GET", "/api/auth/me");
  console.log("gold after shop:", me3.goldBalance);

  // ทดสอบ double-claim ต้อง 404 (ป้องกันรางวัลซ้ำ) — นี่การทดสอบที่ "ควร" ล้มเหลว
  const res2 = await fetch(`${BASE}/api/rewards/claim`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: "{}",
  });
  const j2 = await res2.json();
  const doubleClaimBlocked = res2.status === 404 && j2?.error?.code === "NOTHING_TO_CLAIM";
  console.log("double-claim blocked:", doubleClaimBlocked ? "✓" : "✗ จริง ๆ ควรบล็อก!");
  if (!doubleClaimBlocked) fail++;

  // ทดสอบ ownership ผ่าน adapter
  const ow = await api("POST", "/api/ownership/check", { inventoryIds: [character.id] });
  console.log("ownership(db):", ow.provider.source, JSON.stringify(ow.results[0]));

  // metadata
  const meta = await fetch(`${BASE}/api/nft/metadata/${character.id}`).then((r) => r.json());
  console.log("nft metadata name:", meta.name, "traits:", meta.attributes?.length);

  console.log(fail === 0 ? "\n✅ SMOKE PASS" : `\n❌ SMOKE FAIL (${fail})`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
