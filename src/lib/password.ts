import bcrypt from "bcryptjs";
import { removeVietnameseTones } from "./utils";

const SAFE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Generates a random 6-character readable password (no ambiguous 0/O, 1/I/l).
 */
export function generateRandomPassword(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  }
  return out;
}

/**
 * Builds normalized lowercase username prefix from Vietnamese full name, e.g. "Nguyễn Văn Nam" -> "nguyenvannam"
 */
export function buildUsernameSlug(fullName: string): string {
  const normalized = removeVietnameseTones(fullName)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return normalized || "hocsinh";
}

export function formatZaloCredentialsMessage(params: {
  studentName: string;
  centerName: string;
  appUrl: string;
  username: string;
  plainPassword: string;
}): string {
  return [
    `[${params.centerName}] Thông tin theo dõi học tập của em ${params.studentName}:`,
    `- Link truy cập: ${params.appUrl}/login`,
    `- Tên đăng nhập: ${params.username}`,
    `- Mật khẩu: ${params.plainPassword}`,
    `(Phụ huynh bấm vào link trên để xem BTVN, chuyên cần, điểm số và thông báo học phí)`,
  ].join("\n");
}
