"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { centers, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { generateRandomPassword, hashPassword } from "@/lib/password";

export interface TeacherActionState {
  error?: string;
  success?: string;
  generatedCredentials?: {
    fullName: string;
    username: string;
    plainPassword: string;
  };
}

export async function createTeacherAction(
  _prevState: TeacherActionState,
  formData: FormData
): Promise<TeacherActionState> {
  const admin = await requireAuth(["ADMIN"]);
  if (!admin.centerId) {
    return { error: "Không xác định được trung tâm." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const customPassword = String(formData.get("password") ?? "").trim();

  if (!fullName || !username) {
    return { error: "Vui lòng nhập Họ tên giáo viên và Tên đăng nhập." };
  }

  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return {
      error:
        "Tên đăng nhập chỉ gồm chữ thường không dấu, số hoặc dấu gạch dưới (3–32 ký tự).",
    };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) {
    return { error: `Tên đăng nhập "${username}" đã được sử dụng.` };
  }

  const plainPassword =
    customPassword.length >= 6 ? customPassword : generateRandomPassword(6);
  const passwordHash = await hashPassword(plainPassword);

  await db.insert(users).values({
    centerId: admin.centerId,
    username,
    passwordHash,
    fullName,
    phone: phone || null,
    role: "TEACHER",
    isActive: true,
  });

  revalidatePath("/management/teachers");

  return {
    success: `Đã tạo tài khoản cho giáo viên "${fullName}".`,
    generatedCredentials: {
      fullName,
      username,
      plainPassword,
    },
  };
}

export async function toggleTeacherStatusAction(
  teacherId: string,
  nextActive: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAuth(["ADMIN"]);
  if (!admin.centerId) return { ok: false, error: "Thiếu thông tin trung tâm." };

  await db
    .update(users)
    .set({ isActive: nextActive })
    .where(
      and(
        eq(users.id, teacherId),
        eq(users.centerId, admin.centerId),
        eq(users.role, "TEACHER")
      )
    );

  revalidatePath("/management/teachers");
  return { ok: true };
}

export async function resetTeacherPasswordAction(teacherId: string): Promise<{
  ok: boolean;
  fullName?: string;
  username?: string;
  plainPassword?: string;
  error?: string;
}> {
  const admin = await requireAuth(["ADMIN"]);
  if (!admin.centerId) return { ok: false, error: "Thiếu thông tin trung tâm." };

  const [teacher] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
    })
    .from(users)
    .where(
      and(
        eq(users.id, teacherId),
        eq(users.centerId, admin.centerId),
        eq(users.role, "TEACHER")
      )
    )
    .limit(1);

  if (!teacher) {
    return { ok: false, error: "Không tìm thấy giáo viên." };
  }

  const plainPassword = generateRandomPassword(6);
  const passwordHash = await hashPassword(plainPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, teacher.id));

  revalidatePath("/management/teachers");
  return {
    ok: true,
    fullName: teacher.fullName,
    username: teacher.username,
    plainPassword,
  };
}

export interface SettingsActionState {
  error?: string;
  success?: string;
}

export async function updateCenterSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const admin = await requireAuth(["ADMIN"]);
  if (!admin.centerId) {
    return { error: "Không tìm thấy thông tin trung tâm." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bankBin = String(formData.get("bankBin") ?? "").trim();
  const bankAccountNo = String(formData.get("bankAccountNo") ?? "")
    .trim()
    .replace(/\s+/g, "");
  const bankAccountName = String(formData.get("bankAccountName") ?? "").trim();
  const roundingUnit = Number(formData.get("roundingUnit") ?? 1000);

  if (!name) {
    return { error: "Tên trung tâm không được để trống." };
  }

  const validRounding = [1, 100, 1000, 5000, 10000].includes(roundingUnit)
    ? roundingUnit
    : 1000;

  await db
    .update(centers)
    .set({
      name,
      phone: phone || null,
      bankBin: bankBin || null,
      bankAccountNo: bankAccountNo || null,
      bankAccountName: bankAccountName || null,
      roundingUnit: validRounding,
    })
    .where(eq(centers.id, admin.centerId));

  revalidatePath("/management/settings");
  revalidatePath("/", "layout");

  return {
    success: "Đã lưu cài đặt trung tâm và cấu hình VietQR thành công.",
  };
}
