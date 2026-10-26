import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env, warnIfConfigMissing } from "@/lib/env";
import { unauthorized } from "@/lib/http";

warnIfConfigMissing();

const secretKey = new TextEncoder().encode(
  env.jwtSecret || "dev-only-secret-do-not-use-in-production-0123456789",
);

// JWT HS256 เก็บใน httpOnly cookie — รองรับและส่งกลับ token ด้วย
// เพื่อทดสอบผ่าน Postman/curl ด้วย Authorization: Bearer
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.sessionTtlSeconds}s`)
    .setAudience("m-game-client")
    .sign(secretKey);
}

async function readTokenFrom(req: NextRequest): Promise<string | null> {
  // 1) httpOnly cookie
  const cookieToken = req.cookies.get(env.sessionCookieName)?.value;
  if (cookieToken) return cookieToken;
  // 2) Bearer token (สำหรับเทสด้วยเครื่องมือ API)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireUser(req: NextRequest): Promise<User> {
  const token = await readTokenFrom(req);
  if (!token) throw unauthorized();

  let subject: string;
  try {
    const { payload } = await jwtVerify(token, secretKey, { audience: "m-game-client" });
    subject = payload.sub ?? "";
  } catch {
    throw unauthorized("session หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่");
  }
  if (!subject) throw unauthorized();

  const user = await prisma.user.findUnique({ where: { id: subject } });
  if (!user) throw unauthorized("ไม่พบบัญชีผู้ใช้");
  return user;
}

export function sessionCookieOptions() {
  return {
    name: env.sessionCookieName,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: env.sessionTtlSeconds,
    path: "/",
  };
}

// nonce สำหรับ SIWE / Sign-In with wallet ใน Phase B (สร้างล่วงหน้าเผื่อโครงสร้าง)
export function newAuthNonce(): string {
  return randomBytes(16).toString("hex");
}
