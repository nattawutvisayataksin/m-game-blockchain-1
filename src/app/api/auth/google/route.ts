import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ok } from "@/lib/http";
import { finishGoogleOAuth, isGoogleConfigured, startGoogleOAuth } from "@/server/identity/google";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

const STATE_COOKIE = "mg_oauth_state";

/**
 * GET /api/auth/google            → redirect ไปหน้า consent ของ Google
 * GET /api/auth/google?code=...   → callback: แลก code, เข้าเงื่อนไข create/login
 * ยังไม่ตั้ง env → 501 พร้อมข้อความชี้แจ้ง (ไม่ราริกพัฒนาระบบหลัก)
 */
export const GET = async (req: NextRequest) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  // ---------- callback ----------
  if (code) {
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { ok: false, error: { code: "OAUTH_NOT_CONFIGURED", message: "Google OAuth ยังไม่ตั้งค่า" } },
        { status: 501 },
      );
    }
    if (!state || !cookieState || state !== cookieState) {
      return NextResponse.json(
        { ok: false, error: { code: "OAUTH_STATE_MISMATCH", message: "state ไม่ตรงกัน (CSRF guard)" } },
        { status: 400 },
      );
    }

    const user = await finishGoogleOAuth(url.origin, code);
    const token = await createSessionToken(user.id);

    const res = NextResponse.json({
      ok: true,
      data: { user: { id: user.id, email: user.email, displayName: user.displayName }, token },
    });
    res.cookies.set({ ...sessionCookieOptions(), value: token });
    res.cookies.set({ name: STATE_COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  }

  // ---------- เริ่ม flow ----------
  const nextState = randomBytes(16).toString("hex");
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message:
            "ยังไม่เปิดใช้ Google OAuth — ตั้ง GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ใน .env แล้วเดมอีกครั้ง",
        },
      },
      { status: 501 },
    );
  }

  const redirectUrl = startGoogleOAuth(url.origin, nextState);
  const res = NextResponse.redirect(redirectUrl, { status: 302 });
  res.cookies.set({ name: STATE_COOKIE, value: nextState, httpOnly: true, path: "/", maxAge: 600 });
  return res;
};

export const runtime = "nodejs";
