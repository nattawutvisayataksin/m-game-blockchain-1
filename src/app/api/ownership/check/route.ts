import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { ownershipProviders } from "@/server/ownership";

const bodySchema = z.object({
  inventoryIds: z.array(z.string().min(8)).min(1).max(20),
  // ทดลองสลับ provider ได้ทันทีภายในคำขอเดียว (default: ตาม env)
  runProvider: z.enum(["db", "chain"]).optional(),
});

/**
 * POST /api/ownership/check — ตรวจสิทธิ์ asset ผ่าน "Ownership Adapter"
 * สลับ provider ได้จาก marketplace/sandbox/db (env ASSET_OWNERSHIP_PROVIDER)
 * เวลา Phase C เปลี่ยน to "chain" ปลายทางนี้จะเรียก ownerOf(tokenId) บน Kub Chain
 */
export const POST = withRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  const body = await parseBody(req, bodySchema);

  const selected = body.runProvider === "chain" ? ownershipProviders.chain : ownershipProviders.db;

  const entries = await selected.getMany(user.id, body.inventoryIds);
  return ok({
    provider: { name: selected.name, source: selected.source },
    results: entries,
  });
});
