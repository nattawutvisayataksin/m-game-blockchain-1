import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    app: "m-game-blockchain",
    version: "0.1.0",
    phase: "A (Web2 core) — Web3-ready",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "unreachable (เช็ค DATABASE_URL และ docker compose up db)";
  }

  return NextResponse.json({ ok: true, data: checks });
}
