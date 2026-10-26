import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { purchaseItem } from "@/server/shop";

const bodySchema = z.object({
  templateCode: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(99).default(1),
});

/** POST /api/shop/purchase — ซื้อ: เดิน Ledger ฝั่งใช้เงิน + ได้ item */
export const POST = withRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  const body = await parseBody(req, bodySchema);
  const result = await purchaseItem(user.id, body.templateCode, body.quantity);
  return ok(result, 201);
});
