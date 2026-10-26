import type { NextRequest } from "next/server";
import { ok, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getBattleView } from "@/server/game/battle-engine";

/** GET /api/battles/:id — สถานะการต่อสู้ล่าสุด (เฉพาะเจ้าของ) */
export const GET = withRoute(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const view = await getBattleView(user.id, id);
  return ok(view);
});
