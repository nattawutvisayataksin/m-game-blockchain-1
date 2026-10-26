// ============================================================
// API client ฝั่งเกม — cookie-based (httpOnly) + bearer fallback
// client ส่งได้เท่าที่ server ยอมรับ (server-authoritative)
// ============================================================

import type {
  ApiEnvelope,
  BattleView,
  ClaimSummary,
  InventoryResponse,
  MeResponse,
  PendingReward,
  ShopTemplate,
  StageInfo,
} from "./types";

const TOKEN_KEY = "mg_token";

export class ApiFailure extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function savedToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string | undefined | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function call<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = savedToken();
  const res = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // บาง endpoint คืน plain json ไม่ใช่ครอบรูป (เช่น nft metadata)
  }

  if (!res.ok || (envelope && envelope.ok === false)) {
    const err = envelope?.error;
    throw new ApiFailure(res.status, err?.code ?? "UNKNOWN", err?.message ?? `HTTP ${res.status}`);
  }
  return (envelope?.data ?? (envelope as unknown as T)) as T;
}

// ---------- auth ----------
export function register(email: string, password: string, displayName: string): Promise<{ user: { id: string }; token: string }> {
  return call("POST", "/api/auth/register", { email, password, displayName }).then((r: any) => {
    storeToken(r.token);
    return r;
  });
}

export function login(email: string, password: string): Promise<{ user: { id: string }; token: string }> {
  return call("POST", "/api/auth/login", { email, password }).then((r: any) => {
    storeToken(r.token);
    return r;
  });
}

export function logout(): void {
  storeToken(null);
  void fetch("/api/auth/logout", { method: "POST" });
}

export const me = () => call<MeResponse>("GET", "/api/auth/me");

// ---------- เนื้อหาเกม ----------
export const stages = () => call<StageInfo[]>("GET", "/api/stages");
export const inventory = () => call<InventoryResponse>("GET", "/api/inventory");
export const shopList = () => call<ShopTemplate[]>("GET", "/api/shop");
export const purchase = (templateCode: string, quantity: number) =>
  call<{ itemCode: string; quantityPurchased: number; goldSpent: string; goldBalance: string; inventoryId: string }>(
    "POST",
    "/api/shop/purchase",
    { templateCode, quantity },
  );

export const startBattle = (stageCode: string, characterInvId: string, weaponInvId?: string) =>
  call<BattleView>("POST", "/api/battles", { stageCode, characterInvId, weaponInvId });

export const battleAction = (id: string, action: "ATTACK" | "SKILL" | "GUARD" | "FLEE") =>
  call<BattleView>("POST", `/api/battles/${id}/action`, { action });

export const pendingRewards = () => call<{ pendingCount: number; rewards: PendingReward[] }>("GET", "/api/rewards");
export const claimRewards = (grantIds?: string[]) =>
  call<ClaimSummary>("POST", "/api/rewards/claim", grantIds ? { grantIds } : {});
