import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { startBattle } from "@/server/game/battle-engine";

const bodySchema = z.object({
  stageCode: z.string().min(1).max(64),
  characterInvId: z.string().min(8),
  weaponInvId: z.string().min(8).optional(),
});

/** POST /api/battles — เริ่มการต่อสู้ (server สร้าง state และเก็บ snapshot) */
export const POST = withRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  const body = await parseBody(req, bodySchema);
  const view = await startBattle(user.id, body);
  return ok(view, 201);
});
