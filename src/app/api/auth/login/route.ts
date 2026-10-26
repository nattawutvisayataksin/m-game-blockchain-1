import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, ok, parseBody, withRoute } from "@/lib/http";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

const bodySchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const POST = withRoute(async (req: NextRequest) => {
  const body = (await parseBody(req, bodySchema)) as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email: body.email } });

  // ข้อความเดียวกันทั้งสองกรณี กัน enumerate อีเมล
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    throw new ApiError(401, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  const token = await createSessionToken(user.id);
  const res = ok({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token,
  });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
});
