"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { centers, classes, users, type ScheduleSlot } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { calculateRoundedSessionPrice } from "@/lib/utils";

export interface ClassFormState {
  error?: string;
  success?: string;
}

function parseScheduleSlots(rawJson: string): ScheduleSlot[] {
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ScheduleSlot =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as ScheduleSlot).dayOfWeek === "number" &&
          typeof (item as ScheduleSlot).startTime === "string" &&
          typeof (item as ScheduleSlot).endTime === "string"
      )
      .map((s) => ({
        dayOfWeek: Math.min(6, Math.max(0, Math.round(s.dayOfWeek))),
        startTime: s.startTime.trim(),
        endTime: s.endTime.trim(),
      }));
  } catch {
    return [];
  }
}

export async function saveClassAction(
  _prevState: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  const admin = await requireAuth(["ADMIN"]);
  if (!admin.centerId) {
    return { error: "Không tìm thấy thông tin trung tâm." };
  }

  const classId = String(formData.get("classId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const gradeLevel = String(formData.get("gradeLevel") ?? "4").trim();
  const teacherId = String(formData.get("teacherId") ?? admin.id).trim();
  const tuitionPerCycle = Math.round(
    Number(formData.get("tuitionPerCycle") ?? 0)
  );
  const sessionsPerCycle = Math.round(
    Number(formData.get("sessionsPerCycle") ?? 0)
  );
  const customDeduction = Number(formData.get("deductionPerSession") ?? 0);
  const scheduleRaw = String(formData.get("scheduleJson") ?? "[]");

  if (!name) {
    return { error: "Vui lòng nhập Tên Lớp / Ca học." };
  }
  if (sessionsPerCycle < 1 || sessionsPerCycle > 100) {
    return { error: "Số buổi của 1 chu kỳ phải từ 1 đến 100 buổi." };
  }
  if (tuitionPerCycle < 0) {
    return { error: "Học phí chu kỳ không hợp lệ." };
  }

  // Verify selected teacher belongs to the same center
  const [teacher] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, teacherId), eq(users.centerId, admin.centerId)))
    .limit(1);

  if (!teacher) {
    return { error: "Giáo viên phụ trách không hợp lệ." };
  }

  const [center] = await db
    .select({ roundingUnit: centers.roundingUnit })
    .from(centers)
    .where(eq(centers.id, admin.centerId))
    .limit(1);

  const scheduleJson = parseScheduleSlots(scheduleRaw);
  const deductionPerSession =
    customDeduction > 0
      ? Math.round(customDeduction)
      : calculateRoundedSessionPrice(
          tuitionPerCycle,
          sessionsPerCycle,
          center?.roundingUnit ?? 1000
        );

  if (classId) {
    await db
      .update(classes)
      .set({
        name,
        gradeLevel,
        teacherId: teacher.id,
        scheduleJson,
        tuitionPerCycle,
        sessionsPerCycle,
        deductionPerSession,
      })
      .where(
        and(eq(classes.id, classId), eq(classes.centerId, admin.centerId))
      );

    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    return { success: "Đã cập nhật thông tin Ca học." };
  }

  await db.insert(classes).values({
    centerId: admin.centerId,
    name,
    gradeLevel,
    teacherId: teacher.id,
    scheduleJson,
    tuitionPerCycle,
    sessionsPerCycle,
    deductionPerSession,
    currentCycleNumber: 1,
    currentSessionCount: 0,
    status: "ACTIVE",
  });

  revalidatePath("/classes");
  return { success: "Đã tạo Ca học mới thành công." };
}

export async function archiveClassAction(
  classId: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAuth(["ADMIN"]);
  if (!admin.centerId) return { ok: false, error: "Thiếu thông tin trung tâm." };

  await db
    .update(classes)
    .set({ status: "ARCHIVED" })
    .where(and(eq(classes.id, classId), eq(classes.centerId, admin.centerId)));

  revalidatePath("/classes");
  return { ok: true };
}
