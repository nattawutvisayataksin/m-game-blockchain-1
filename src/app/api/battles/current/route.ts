import type { NextRequest } from "next/server";
import { ok, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { abandonOngoingBattle } from "@/server/game/battle-engine";

/** DELETE /api/battles/current — ปิด battle ที่ค้างจากการปิดแท็บ/รีเฟรช โดยไม่มีรางวัล */
export const DELETE = withRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  const view = await abandonOngoingBattle(user.id);
  return ok(view);
});