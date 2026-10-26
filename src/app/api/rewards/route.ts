import type { NextRequest } from "next/server";
import { ok, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listPendingRewards } from "@/server/game/rewards";

/** GET /api/rewards — รางวัลที่รอรับ (PENDING) ของผู้เล่น */
export const GET = withRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  const rewards = await listPendingRewards(user.id);
  return ok({ pendingCount: rewards.length, rewards });
});
