import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/shop — ของที่ขายได้ (shopPrice ตั้งไว้ใน seed) */
export const GET = async () => {
  const { listShopTemplates } = await import("@/server/shop");
  const templates = await listShopTemplates();
  return NextResponse.json({ ok: true, data: templates });
};
