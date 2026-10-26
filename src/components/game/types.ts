// ============================================================
// types ใช้ร่วมฝั่ง client (ตรงกับรูปที่ API คืน — BigInt เป็น string)
// ============================================================

export interface MeResponse {
  id: string;
  email: string | null;
  displayName: string;
  goldBalance: string;
  wallet: {
    address: string | null;
    chainId: string | null;
    linkedAt: string | null;
    bridgeEnabled: boolean;
    chainReference: { name: string; chainId: string; rpcUrl: string; explorerUrl: string };
  };
}

export interface StageInfo {
  id: string;
  code: string;
  name: string;
  order: number;
  description: string | null;
  enemy: Record<string, unknown> | null;
  scene: "fields" | "camp" | "lair";
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  kind: string;
  rarity: string;
  quantity: number;
  fungible: boolean;
  attributes: Record<string, unknown>;
  instance: { level: number | null; exp: number | null; currentHp: null | number };
  imageUri: string | null;
  web3: {
    isOnChain: boolean;
    tokenId: string | null;
    contractAddress: string | null;
    tokenStandard: string;
    explorerUrl: string | null;
  };
  earnedAt: string;
}

export interface InventoryResponse {
  goldBalance: string;
  items: InventoryItem[];
}

export interface BattleEvent {
  seq: number;
  kind:
    | "player_attack"
    | "player_skill"
    | "player_guard"
    | "player_flee"
    | "enemy_attack"
    | "battle_end";
  damage?: number;
  crit?: boolean;
  heavy?: boolean;
  enemyHpAfter?: number;
  playerHpAfter?: number;
  success?: boolean;
  result?: "WON" | "LOST" | "FLED";
}

export interface BattleRewardView {
  id: string;
  type: "GOLD" | "EXP" | "ITEM";
  quantity?: string;
  item?: { code: string; name: string; rarity: string; quantity: number };
}

export interface BattleView {
  id: string;
  stage: { code: string; name: string };
  status: string;
  turn: number;
  player: { name: string; hp: number; maxHp: number };
  enemy: { name: string; hp: number; maxHp: number };
  skillCd: number;
  log: string[];
  events?: BattleEvent[];
  rewards?: BattleRewardView[];
}

export interface PendingReward {
  id: string;
  refType: string;
  refId: string;
  type: "GOLD" | "EXP" | "ITEM";
  quantity: string | null;
  item: { code: string; name: string; rarity: string } | null;
  grantedAt: string;
}

export interface ClaimSummary {
  claimedCount: number;
  goldGranted: string;
  newGoldBalance: string;
  itemsGranted: { code: string; name: string; quantity: number }[];
  expResults: { characterName: string; levelBefore: number; levelAfter: number; levelUps: number }[];
}

export interface ShopTemplate {
  code: string;
  name: string;
  kind: string;
  rarity: string;
  description: string | null;
  fungible: boolean;
  shopPrice: string | null;
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}
