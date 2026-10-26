import type { ItemTemplate, UserInventory } from "@prisma/client";
import { env } from "@/lib/env";

// ============================================================
// NFT METADATA BUILDER — มาตรฐาน ERC-721 / ERC-1155 metadata JSON
// ------------------------------------------------------------
// โครงสร้างตาม spec: { name, description, image, external_url, attributes[] }
// ภายหลัง (Phase C) จะปรับให้รองรับ ipfs:// ที่ pin เอง + แนบ tokenId
// ============================================================

interface MetadataAttribute {
  trait_type: string;
  value: string | number;
}

function numericTraits(attributes: unknown): MetadataAttribute[] {
  const src = (attributes ?? {}) as Record<string, unknown>;
  const traitNames: Record<string, string> = {
    hp: "HP",
    atk: "ATK",
    def: "DEF",
    spd: "SPD",
    crit: "Crit",
    heal: "Heal",
    yield: "Yield",
  };
  const out: MetadataAttribute[] = [];
  for (const [key, value] of Object.entries(src)) {
    if (typeof value !== "number" && typeof value !== "string") continue;
    out.push({ trait_type: traitNames[key] ?? key, value });
  }
  return out;
}

/** สร้าง metadata JSON ของ instance (ใช้ก่อน upload เข้า IPFS และใน API public) */
export function buildMetadata(
  instance: Pick<UserInventory, "id" | "isOnChain" | "contractAddress" | "tokenId" | "instanceData" | "earnedAt">,
  template: Pick<
    ItemTemplate,
    "code" | "name" | "kind" | "rarity" | "description" | "imageUri" | "attributes" | "tokenStandard"
  >,
  onchainMaybe?: { contractAddress?: string | null; tokenId?: string | null },
): Record<string, unknown> {
  const inst = (instance.instanceData ?? {}) as Record<string, unknown>;
  const traits: MetadataAttribute[] = [
    { trait_type: "Kind", value: template.kind },
    { trait_type: "Rarity", value: template.rarity },
    { trait_type: "Code", value: template.code },
    ...numericTraits(template.attributes),
  ];
  const level = Number(inst.level ?? 0);
  if (level > 0) traits.push({ trait_type: "Level", value: level });

  const meta: Record<string, unknown> = {
    name: `${template.name} #${instance.id.slice(-6)}`,
    description: template.description ?? `${template.name} — M-Game asset`,
    image: template.imageUri ?? undefined,
    external_url: `${env.kubExplorerUrl}/`,
    attributes: traits.filter((t) => t.value !== undefined),
  };

  // Phase C: เพิ่มส่วน on-chain ทันทีที่มีข้อเป็น NFT จริง
  const contract = instance.contractAddress ?? onchainMaybe?.contractAddress;
  const tokenId = instance.tokenId ?? onchainMaybe?.tokenId;
  if (instance.isOnChain && contract && tokenId) {
    meta.onchain = {
      contractAddress: contract,
      tokenId,
      standard: template.tokenStandard,
      chainId: env.kubChainId.toString(),
      chainName: "Kub Chain",
      explorerUrl: `${env.kubExplorerUrl}/token/${contract}`,
    };
  }

  // เก็บค่าเฉพาะเกมมิงที่ไม่ไปขึ้น trait (game reference)
  meta.game = {
    inventoryId: instance.id,
    level: level > 0 ? level : undefined,
    earnedAt: instance.earnedAt,
  };

  return meta;
}
