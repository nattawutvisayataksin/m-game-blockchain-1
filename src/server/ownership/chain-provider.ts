import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";
import type { IAssetOwnershipProvider, OwnershipEntry } from "./types";

// ============================================================
// Chain Adapter (Phase C) — Mockup/โครงหมา
// ------------------------------------------------------------
// แนวทางจริง: อ่าน ownerOf(tokenId) จาก collection contract บน Kub Chain
// (ชื่อจาก ERC-721; กับ ERC-1155 จะใช้ balanceOf(owner, id) แทน)
// ตอนนี้ WEB3_BRIDGE_ENABLED=false → endpoint ใดเรียกถึงจะได้ 503
// เมื่อเปิด flag และฝาก contract address ลง env ระบบจะเรียก JSON-RPC จริงผ่าน
// fetch() ธรรมดา — ไม่มี dependency เฉพาะทาง เพื่อไม่ลาก Ethers.js เข้า Phase 2
// ============================================================

// function selector keccak-256("ownerOf(uint256)")[0:4]
const SELECTOR_ERC721_OWNER_OF = "0x6352211e";
// keccak-256("balanceOf(address)")[0:4]
const SELECTOR_ERC20_BALANCE_OF = "0x70a08231";

const pointer = env.kubChainId;

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(env.kubRpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  if (!res.ok) {
    throw new ApiError(502, "RPC_UNAVAILABLE", `เรียก KUB Chain RPC ไม่สำเร็จ (${res.status})`);
  }
  return (await res.json()).result as string;
}

function padUint256(hexTokenId: string): string {
  return hexTokenId.replace(/^0x/, "").padStart(64, "0");
}

function toAddressFromWord(data: string): string | null {
  const hex = data.replace(/^0x/, "");
  if (hex.length < 40) return null;
  return ("0x" + hex.slice(-40)).toLowerCase();
}

export const chainOwnershipProvider: IAssetOwnershipProvider = {
  name: "kub-chain-owner-of",
  source: "chain",

  async assertOwned(_userId, _inventoryIds): Promise<void> {
    const info = await this.getMany(_userId, _inventoryIds);
    const notOwned = info.filter((e) => !e.owned);
    if (notOwned.length > 0) {
      throw new ApiError(
        403,
        "NOT_ASSET_OWNER",
        `on-chain ผู้เล่นไม่ได้เป็นเจ้าของ asset: ${notOwned.map((e) => e.inventoryId).join(", ")}`,
      );
    }
  },

  async getMany(userId: string, inventoryIds: string[]): Promise<OwnershipEntry[]> {
    if (!env.web3BridgeEnabled) {
      throw new ApiError(
        503,
        "WEB3_BRIDGE_DISABLED",
        "Bridge ยังไม่เปิดใช้งาน — ตั้ง WEB3_BRIDGE_ENABLED=true และฝาก contract address ใน Phase C",
      );
    }
    if (!env.nftCollectionContractAddress) {
      throw new ApiError(503, "CONTRACT_NOT_CONFIGURED", "ยังไม่ตั้ง NFT_COLLECTION_CONTRACT_ADDRESS");
    }

    // Phase C: mapping inventoryId → tokenId โดยดึงจาก DB ก่อน (จะย้ายไป indexer ภายหลัง)
    // ยังไม่ query จริงในเฟสนี้ — คืนโครงรายงานจากผู้ใช้
    return inventoryIds.map((inventoryId) => ({
      inventoryId,
      userId,
      owned: false,
      ownerRef: null,
      source: "chain" as const,
      tokenRef: null,
    }));
  },
};

// ---------- ต่อ Phase C: ฟังก์ชันจริงจะ map inventoryId → tokenId จาก indexer ----------
// แล้วเรียก ethCall(contract, SELECTOR_ERC721_OWNER_OF + padUint256(tokenId))
// เทียบผลลัพธ์กับ wallet address ของ user ที่ผูกไว้ (User.walletAddress)

// ข้อมูลอ้างอิงสาย Kub Chain เผื่อให้ contract อื่น ๆ ใช้ต่อ
export const chainInfo = {
  chainId: pointer,
  rpcUrl: env.kubRpcUrl,
  explorerUrl: env.kubExplorerUrl,
  tokenContract: env.gameTokenContractAddress || null,
  nftContract: env.nftCollectionContractAddress || null,
  selectors: { ERC721_OWNER_OF: SELECTOR_ERC721_OWNER_OF, ERC20_BALANCE_OF: SELECTOR_ERC20_BALANCE_OF },
  padUint256,
  toAddressFromWord,
};

export const chainProvider = chainOwnershipProvider;
