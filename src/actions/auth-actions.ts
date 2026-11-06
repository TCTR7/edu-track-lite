"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { centers, users } from "@/db/schema";
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
} from "@/lib/auth";
import { getHomeRouteForRole } from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";

export interface ActionState {
  error?: string;
  success?: string;
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu." };
  }

  const [record] = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      centerId: users.centerId,
      centerIsActive: centers.isActive,
    })
    .from(users)
    .leftJoin(centers, eq(users.centerId, centers.id))
    .where(eq(users.username, username))
    .limit(1);

  if (!record) {
    return { error: "Tên đăng nhập hoặc mật khẩu không chính xác." };
  }

  const validPassword = await verifyPassword(password, record.passwordHash);
  if (!validPassword) {
    return { error: "Tên đăng nhập hoặc mật khẩu không chính xác." };
  }

  if (!record.isActive) {
    return {
      error:
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản lý trung tâm.",
    };
  }

  if (record.role !== "OPERATOR") {
    if (!record.centerId || record.centerIsActive !== true) {
      return {
        error:
          "Trung tâm hiện đang tạm khóa hoạt động. Vui lòng liên hệ quản trị hệ thống.",
      };
    }
  }

  await setSessionCookie({
    id: record.id,
    username: record.username,
    fullName: record.fullName,
    role: record.role,
    centerId: record.centerId,
  });

  redirect(getHomeRouteForRole(record.role));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

export async function changeOwnPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const sessionUser = await requireAuth();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới." };
  }

  if (newPassword.length < 6) {
    return { error: "Mật khẩu mới cần có ít nhất 6 ký tự." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Xác nhận mật khẩu mới không khớp." };
  }

  const [dbUser] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (!dbUser || !(await verifyPassword(currentPassword, dbUser.passwordHash))) {
    return { error: "Mật khẩu hiện tại không đúng." };
  }

  const nextHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: nextHash })
    .where(eq(users.id, sessionUser.id));

  return { success: "Đã cập nhật mật khẩu thành công." };
}
