import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Hash รหัสผ่านด้วย scrypt ในตัว Node.js ทุกเครื่องใช้ได้โดยไม่ต้อง build native addon
// รูปแบบที่เก็บใน DB: scrypt$<salt>$<hash>
const KEY_LEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string | null): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(plain, salt, KEY_LEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
