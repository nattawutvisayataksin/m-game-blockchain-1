import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/server/nft/metadata";

export const dynamic = "force-dynamic";

/**
 * GET /api/nft/metadata/:inventoryId
 * metadata JSON แบบมาตรฐาน ERC-721/1155 (public read) —
 * ไว้ใช้ตอน (1) กดดู카์ดไอเทมใน Phase 3 และ (2) upload ขึ้น IPFS ใน Phase C
 */
export const GET = async (
  _req: NextRequest,
  ctx: { params: Promise<{ inventoryId: string }> },
) => {
  const { inventoryId } = await ctx.params;

  const row = await prisma.userInventory.findUnique({
    where: { id: inventoryId },
    include: { template: true },
  });
  if (!row) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "ไม่พบ inventory id นี้" } },
      { status: 404 },
    );
  }

  const metadata = buildMetadata(
    {
      id: row.id,
      isOnChain: row.isOnChain,
      contractAddress: row.contractAddress,
      tokenId: row.tokenId,
      instanceData: row.instanceData,
      earnedAt: row.earnedAt,
    },
    row.template,
  );

  return NextResponse.json(metadata, {
    headers: { "cache-control": "no-store" },
  });
};
