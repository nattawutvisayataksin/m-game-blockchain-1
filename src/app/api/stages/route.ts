import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/stages — ลิสต์สเตจที่เปิดเล่น (อ่านทั้งหมด) */
export const GET = async () => {
  const stages = await prisma.stageTemplate.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      order: true,
      description: true,
      enemy: true,
    },
  });
  return NextResponse.json({ ok: true, data: stages });
};
