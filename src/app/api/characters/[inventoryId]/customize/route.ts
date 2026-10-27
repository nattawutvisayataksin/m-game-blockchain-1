import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({
  appearance: z.enum(["ember", "ocean", "moon"]),
  outfit: z.enum(["traveler", "guardian", "rogue"]),
});

export const PATCH = withRoute(async (req: NextRequest, ctx: { params: Promise<{ inventoryId: string }> }) => {
  const user = await requireUser(req);
  const { inventoryId } = await ctx.params;
  const body = await parseBody(req, schema);
  const current = await prisma.userInventory.findFirst({ where: { id: inventoryId, userId: user.id, status: "ACTIVE" }, include: { template: true } });
  if (!current || current.template.kind !== "CHARACTER") throw new Error("ไม่พบตัวละครที่แก้ไขได้");
  const instance = (current.instanceData ?? {}) as Record<string, unknown>;
  const updated = await prisma.userInventory.update({
    where: { id: current.id },
    data: { instanceData: { ...instance, appearance: body.appearance, outfit: body.outfit } },
    include: { template: true },
  });
  return ok({ id: updated.id, appearance: body.appearance, outfit: body.outfit });
});