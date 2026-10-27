import type { NextRequest } from "next/server";
import { ok, withRoute } from "@/lib/http";
import { bootstrapGuestUser } from "@/server/identity/bootstrap";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

/** POST /api/auth/guest — V2 quick start; no credentials required. */
export const POST = withRoute(async (_req: NextRequest) => {
  const user = await bootstrapGuestUser();
  const token = await createSessionToken(user.id);
  const res = ok({ user: { id: user.id, email: null, displayName: user.displayName }, token }, 201);
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
});