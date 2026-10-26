import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { submitAction } from "@/server/game/battle-engine";

const bodySchema = z.object({
  action: z.enum(["ATTACK", "SKILL", "GUARD", "FLEE"]),
});

/**
 * POST /api/battles/:id/action — ส่ง "action" เข้าเครื่องยนต์ (Server-Authoritative)
 * ฝั่ง client ห้ามส่ง.damage/target ใด ๆ มา — ส่งได้แค่การเลือกท่า
 */
export const POST = withRoute(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const body = await parseBody(req, bodySchema);
  const view = await submitAction(user.id, id, body.action);
  return ok(view);
});
