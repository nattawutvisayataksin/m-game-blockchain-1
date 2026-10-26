import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodTypeAny } from "zod";

// ============================================================
// HTTP helpers กลาง: response format เดียวกันทั้งโปรเจกต์
//   success: { ok: true,  data }
//   failure: { ok: false, error: { code, message, details? } }
// ============================================================

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const unauthorized = (msg = "ต้องเข้าสู่ระบบก่อน") =>
  new ApiError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "ไม่มีสิทธิ์") => new ApiError(403, "FORBIDDEN", msg);
export const notFound = (msg = "ไม่พบข้อมูล") => new ApiError(404, "NOT_FOUND", msg);
export const conflict = (msg: string) => new ApiError(409, "CONFLICT", msg);
export const badRequest = (msg: string, details?: unknown) =>
  new ApiError(400, "BAD_REQUEST", msg, details);

// แปลง BigInt/Date/Prisma model ให้ JSON-safe ที่เดียว
export function safeJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => safeJson(v));
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(src)) {
      out[key] = safeJson(val);
    }
    return out;
  }
  return value;
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data: safeJson(data) }, { status });
}

export function failure(err: ApiError): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code: err.code, message: err.message, details: safeJson(err.details) },
    },
    { status: err.status },
  );
}

// parse + validate body ด้วย zod ที่เดียว
export async function parseBody<T extends ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<T["_output"]> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("รูปแบบ JSON ไม่ถูกต้อง");
  }
  try {
    return schema.parse(raw) as T["_output"];
  } catch (e) {
    if (e instanceof ZodError) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      );
    }
    throw e;
  }
}

// wrapper route handler: ดัก ApiError / ZodError ให้ครบทุก endpoint
export function withRoute<Args extends unknown[]>(
  fn: (req: NextRequest, ...args: Args) => Promise<NextResponse>,
): (req: NextRequest, ...args: Args) => Promise<NextResponse> {
  return async (req, ...args) => {
    try {
      return await fn(req, ...args);
    } catch (e) {
      if (e instanceof ApiError) return failure(e);
      if (e instanceof ZodError) {
        return failure(new ApiError(400, "VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง"));
      }
      console.error("[route] unhandled error:", e);
      return NextResponse.json(
        { ok: false, error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" } },
        { status: 500 },
      );
    }
  };
}
