import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { centers, users } from "@/db/schema";
import {
  getHomeRouteForRole,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  type UserRole,
  verifySessionToken,
} from "./jwt";

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  centerId: string | null;
  centerName: string | null;
}

/**
 * Checks whether an active session user exists AND both user.isActive and center.isActive are true in DB.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const [record] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      centerId: users.centerId,
      centerName: centers.name,
      centerIsActive: centers.isActive,
    })
    .from(users)
    .leftJoin(centers, eq(users.centerId, centers.id))
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!record || !record.isActive) {
    return null;
  }

  // Multi-tenant lock check: if center is locked, block Admin, Teacher, and Student immediately
  if (record.role !== "OPERATOR") {
    if (!record.centerId || record.centerIsActive !== true) {
      return null;
    }
  }

  return {
    id: record.id,
    username: record.username,
    fullName: record.fullName,
    role: record.role,
    centerId: record.centerId,
    centerName: record.centerName ?? null,
  };
}

/**
 * Checks role access including Admin's 100% inheritance of Teacher permissions.
 */
export function hasRoleAccess(
  actualRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  if (allowedRoles.includes(actualRole)) return true;
  if (actualRole === "ADMIN" && allowedRoles.includes("TEACHER")) return true;
  return false;
}

export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (allowedRoles && !hasRoleAccess(user.role, allowedRoles)) {
    redirect(getHomeRouteForRole(user.role));
  }
  return user;
}

export async function setSessionCookie(user: {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  centerId: string | null;
}): Promise<void> {
  const token = await signSessionToken({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    centerId: user.centerId,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
