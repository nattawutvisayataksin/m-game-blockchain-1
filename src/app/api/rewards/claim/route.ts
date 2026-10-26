import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { claimRewards } from "@/server/game/rewards";

const bodySchema = z.object({
  grantIds: z.array(z.string().min(8)).max(50).optional(), // ไม่ส่ง = รับทุกใบที่ PENDING
});

/**
 * POST /api/rewards/claim — "รับรางวัล" หลังชนะ
 * Server ถึงคำนวณยอดอีมืโนทุกอย่าง: บัญชี Ledger (GOLD) / inventory (ITEM) / เลเวล (EXP)
 */
export const POST = withRoute(async (req: NextRequest) => {
  const user = await requireUser(req);
  let grantIds: string[] | undefined;
  try {
    const body = await parseBody(req, bodySchema);
    grantIds = body.grantIds;
  } catch {
    // อนุญาตให้เรียกแบบไม่มี body ได้ (รับทุก PENDING)
    grantIds = undefined;
  }
  const summary = await claimRewards(user.id, grantIds);
  return ok(summary);
});
