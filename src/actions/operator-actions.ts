"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { centers, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { generateRandomPassword, hashPassword } from "@/lib/password";

export interface OperatorCenterActionState {
  error?: string;
  success?: string;
  generatedCredentials?: {
    centerName: string;
    username: string;
    plainPassword: string;
  };
}

export async function createCenterWithAdminAction(
  _prevState: OperatorCenterActionState,
  formData: FormData
): Promise<OperatorCenterActionState> {
  await requireAuth(["OPERATOR"]);

  const centerName = String(formData.get("centerName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const adminFullName = String(formData.get("adminFullName") ?? "").trim();
  const adminUsername = String(formData.get("adminUsername") ?? "")
    .trim()
    .toLowerCase();
  const customPassword = String(formData.get("adminPassword") ?? "").trim();

  if (!centerName || !adminFullName || !adminUsername) {
    return {
      error: "Vui lòng nhập Tên trung tâm, Họ tên Admin và Username Admin.",
    };
  }

  if (!/^[a-z0-9_.-]{3,32}$/.test(adminUsername)) {
    return {
      error:
        "Username Admin chỉ gồm chữ thường không dấu, số hoặc dấu gạch dưới (3–32 ký tự).",
    };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, adminUsername))
    .limit(1);

  if (existing) {
    return { error: `Username "${adminUsername}" đã tồn tại trên hệ thống.` };
  }

  const plainPassword =
    customPassword.length >= 6 ? customPassword : generateRandomPassword(6);
  const passwordHash = await hashPassword(plainPassword);

  await db.transaction(async (tx) => {
    const [newCenter] = await tx
      .insert(centers)
      .values({
        name: centerName,
        phone: phone || null,
        isActive: true,
      })
      .returning();

    await tx.insert(users).values({
      centerId: newCenter.id,
      username: adminUsername,
      passwordHash,
      fullName: adminFullName,
      phone: phone || null,
      role: "ADMIN",
      isActive: true,
    });
  });

  revalidatePath("/operator/centers");

  return {
    success: `Đã tạo trung tâm "${centerName}" thành công.`,
    generatedCredentials: {
      centerName,
      username: adminUsername,
      plainPassword,
    },
  };
}

export async function toggleCenterStatusAction(
  centerId: string,
  nextActive: boolean
): Promise<{ ok: boolean; error?: string }> {
  await requireAuth(["OPERATOR"]);

  await db
    .update(centers)
    .set({ isActive: nextActive })
    .where(eq(centers.id, centerId));

  revalidatePath("/operator/centers");
  return { ok: true };
}

export async function resetCenterAdminPasswordAction(
  centerId: string,
  adminUserId: string
): Promise<{
  ok: boolean;
  username?: string;
  plainPassword?: string;
  error?: string;
}> {
  await requireAuth(["OPERATOR"]);

  const [adminUser] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      and(
        eq(users.id, adminUserId),
        eq(users.centerId, centerId),
        eq(users.role, "ADMIN")
      )
    )
    .limit(1);

  if (!adminUser) {
    return { ok: false, error: "Không tìm thấy tài khoản Admin của trung tâm." };
  }

  const plainPassword = generateRandomPassword(6);
  const passwordHash = await hashPassword(plainPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, adminUser.id));

  revalidatePath("/operator/centers");
  return {
    ok: true,
    username: adminUser.username,
    plainPassword,
  };
}
