import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/http";
import { bootstrapNewUser } from "@/server/identity/bootstrap";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

const bodySchema = z.object({
  email: z.string().email().max(120).toLowerCase(),
  password: z.string().min(8, "ต้องยาวอย่างน้อย 8 ตัวอักษร").max(72),
  displayName: z.string().min(2).max(40),
});

export const POST = withRoute(async (req: NextRequest) => {
  const body = (await parseBody(req, bodySchema)) as { email: string; password: string; displayName: string };

  const user = await bootstrapNewUser({
    provider: "EMAIL_PASSWORD",
    email: body.email,
    password: body.password,
    displayName: body.displayName,
  });

  const token = await createSessionToken(user.id);
  const res = ok({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token, // ให้ทดสอบด้วย Authorization: Bearer ได้ด้วย
  });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
});
