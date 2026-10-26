import type { User } from "@prisma/client";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { bootstrapNewUser } from "./bootstrap";

// ============================================================
// Google OAuth 2.0 (Authorization Code) — เปิดใช้เมื่อตั้ง GOOGLE_CLIENT_ID/SECRET
// ไม่พึ่ง SDK เพิ่มเติม: ยิง HTTP ตรงกับ endpoints ของ Google
// ============================================================

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export function isGoogleConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

export function buildRedirectUri(origin: string): string {
  return `${origin}/api/auth/google`;
}

export function startGoogleOAuth(origin: string, state: string): string {
  if (!isGoogleConfigured()) {
    throw new ApiError(
      501,
      "OAUTH_NOT_CONFIGURED",
      "ยังไม่ใช้ Google OAuth — ตั้ง GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ก่อน",
    );
  }
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: buildRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleProfile {
  sub: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
}

export async function finishGoogleOAuth(origin: string, code: string): Promise<User> {
  if (!isGoogleConfigured()) {
    throw new ApiError(501, "OAUTH_NOT_CONFIGURED", "Google OAuth ยังไม่ตั้งค่า");
  }

  // 1) แลก code เป็น token
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: buildRedirectUri(origin),
    }),
  });
  if (!tokenRes.ok) {
    throw new ApiError(502, "OAUTH_TOKEN_FAILED", "แลก access token กับ Google ไม่สำเร็จ");
  }
  const accessToken = (await tokenRes.json()) as { access_token?: string };
  if (!accessToken.access_token) {
    throw new ApiError(502, "OAUTH_TOKEN_FAILED", "ไม่ได้ access token จาก Google");
  }

  // 2) ดึงโปรไฟล์
  const profileRes = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken.access_token}` },
  });
  if (!profileRes.ok) {
    throw new ApiError(502, "OAUTH_PROFILE_FAILED", "ดึงโปรไฟล์ Google ไม่สำเร็จ");
  }
  const profile = (await profileRes.json()) as GoogleProfile;

  if (!profile.email) {
    throw new ApiError(400, "OAUTH_EMAIL_MISSING", "บัญชี Google นี้ไม่มีอีเมลสำหรับใช้สมัคร");
  }
  if (profile.email_verified === false) {
    throw new ApiError(400, "OAUTH_EMAIL_UNVERIFIED", "อีเมลนี้ไม่ได้รับการยืนยันจาก Google");
  }

  // 3) ถ้ามี identity อยู่แล้ว → ให้เป็นการ "เข้าสู่ระบบ"
  const { prisma } = await import("@/lib/db");
  const existing = await prisma.authIdentity.findUnique({
    where: { provider_subject: { provider: "GOOGLE_OAUTH", subject: profile.sub } },
  });
  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user) throw new ApiError(500, "OAUTH_MAPPING_BROKEN", "ข้อมูลผูกบัญชีเสียหาย กรุณาติดต่อแอดมิน");
    return user;
  }

  // 4) ยังไม่มี → สมัครใหม่ด้วย bootstrap เดียวกับ email/password
  return bootstrapNewUser({
    provider: "GOOGLE_OAUTH",
    email: profile.email,
    googleSubject: profile.sub,
    displayName: profile.name?.slice(0, 40) || profile.email.split("@")[0],
  });
}
