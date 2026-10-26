// รวมการอ่านตัวแปร Environment ไว้ที่เดียว — ห้ามอ่าน process.env กระจายในที่อื่น
// (ยกเว้นเล่นแบบ passthrough ที่นี่)

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function int(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "true" || v === "1" || v === "yes";
}

export const env = {
  databaseUrl: str("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/game?schema=public"),

  // --- Auth (Web2) ---
  jwtSecret: str("JWT_SECRET", ""),
  googleClientId: str("GOOGLE_CLIENT_ID"),
  googleClientSecret: str("GOOGLE_CLIENT_SECRET"),

  // --- Economy ---
  signupBonusGold: BigInt(str("SIGNUP_BONUS_GOLD", "500")),

  // --- Web2 ↔ Web3 ---
  assetOwnershipProvider: (str("ASSET_OWNERSHIP_PROVIDER", "db").toLowerCase() === "chain"
    ? "chain"
    : "db") as "db" | "chain",
  web3BridgeEnabled: bool("WEB3_BRIDGE_ENABLED", false),

  // --- Kub Chain (EVM) ---
  kubChainId: BigInt(str("KUB_CHAIN_ID", "25925")), // 96 = Mainnet, 25925 = Testnet
  kubRpcUrl: str("KUB_CHAIN_RPC_URL", "https://rpc-testnet.kubchain.io"),
  kubExplorerUrl: str("KUB_CHAIN_EXPLORER_URL", "https://testnet.kubscan.com"),
  gameTokenContractAddress: str("GAME_TOKEN_CONTRACT_ADDRESS"),
  nftCollectionContractAddress: str("NFT_COLLECTION_CONTRACT_ADDRESS"),

  sessionCookieName: "mg_session",
  sessionTtlSeconds: int("SESSION_TTL_SECONDS", 60 * 60 * 24 * 7), // 7 วัน
} as const;

export function warnIfConfigMissing(): void {
  if (!env.jwtSecret) {
    console.warn(
      "[config] JWT_SECRET ยังไม่ตั้ง — session จะใช้ dev secret (ห้ามใช้ใน production)",
    );
  }
}
