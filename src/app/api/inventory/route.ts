import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { playerBalance } from "@/server/ledger/ledger";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

interface InventoryRow {
  id: string;
  quantity: number;
  status: string;
  instanceData: unknown;
  earnedAt: Date;
  isOnChain: boolean;
  tokenId: string | null;
  contractAddress: string | null;
  tokenStandard: string;
  template: {
    code: string;
    name: string;
    kind: string;
    rarity: string;
    description: string | null;
    imageUri: string | null;
    fungible: boolean;
    attributes: unknown;
  };
}

const EMPTY_STATS: Record<string, unknown> = {};

/** GET /api/inventory — คลังของผู้เล่น + สถิติที่ server เก็บสมบูรณ์ */
export const GET = async (req: NextRequest) => {
  const user = await requireUser(req);

  const [items, gold] = await Promise.all([
    prisma.userInventory.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { template: true },
      orderBy: { earnedAt: "desc" },
    }) as Promise<InventoryRow[]>,
    prisma.$transaction((tx) => playerBalance(tx, user.id)),
  ]);

  const data = items.map((row) => {
    const instance = (row.instanceData ?? EMPTY_STATS) as Record<string, unknown>;
    return {
      id: row.id,
      code: row.template.code,
      name: row.template.name,
      kind: row.template.kind,
      rarity: row.template.rarity,
      quantity: row.quantity,
      fungible: row.template.fungible,
      attributes: row.template.attributes ?? {},
      instance: {
        level: instance.level ?? null,
        exp: instance.exp ?? null,
        currentHp: instance.currentHp ?? null,
      },
      imageUri: row.template.imageUri,
      // ---- Web3 ช่องข้อมูล (ซ่อนอยู่จนกว่า mint จริง — ตามโจทย์ Phase 3) ----
      web3: {
        isOnChain: row.isOnChain,
        tokenId: row.tokenId,
        contractAddress: row.contractAddress,
        tokenStandard: row.tokenStandard,
        explorerUrl:
          row.isOnChain && row.contractAddress && row.tokenId
            ? `${env.kubExplorerUrl}/token/${row.contractAddress}?a=${row.tokenId}`
            : null,
      },
      earnedAt: row.earnedAt,
    };
  });

  return NextResponse.json({ ok: true, data: { goldBalance: gold.toString(), items: data } });
};
