import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export type UserRole = "OPERATOR" | "ADMIN" | "TEACHER" | "STUDENT";

export interface SessionTokenPayload {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  centerId: string | null;
}

export const SESSION_COOKIE_NAME = "edutrack_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days for mobile PWA convenience

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "edutrack-lite-dev-secret-change-in-production-2026";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: SessionTokenPayload
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.fullName !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      username: payload.username,
      fullName: payload.fullName,
      role: payload.role as UserRole,
      centerId: typeof payload.centerId === "string" ? payload.centerId : null,
    };
  } catch {
    return null;
  }
}

export function getHomeRouteForRole(role: UserRole): string {
  switch (role) {
    case "OPERATOR":
      return "/operator/centers";
    case "ADMIN":
    case "TEACHER":
      return "/classes";
    case "STUDENT":
      return "/portal";
  }
}
