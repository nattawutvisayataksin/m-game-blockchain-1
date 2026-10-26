import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const POST = async () => {
  const res = NextResponse.json({ ok: true, data: { message: "ออกจากระบบแล้ว" } });
  res.cookies.set({
    name: env.sessionCookieName,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
};
