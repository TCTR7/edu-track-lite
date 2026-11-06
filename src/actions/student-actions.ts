"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { classes, classStudents, pointHistories, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import {
  buildUsernameSlug,
  formatZaloCredentialsMessage,
  generateRandomPassword,
  hashPassword,
} from "@/lib/password";
import { recordAuditLog } from "@/lib/services/audit";
import { requireClassAccess } from "@/lib/services/class-access";

async function generateCollisionFreeUsername(fullName: string): Promise<string> {
  const base = buildUsernameSlug(fullName).slice(0, 20);
  for (let attempt = 0; attempt < 25; attempt++) {
    const suffix = String(Math.floor(10 + Math.random() * 90));
    const candidate = `${base}_${suffix}`;
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing) {
      return candidate;
    }
  }
  return `${base}_${Date.now().toString().slice(-4)}`;
}

export interface CreateStudentState {
  error?: string;
  success?: string;
  credentials?: {
    studentId: string;
    fullName: string;
    username: string;
    plainPassword: string;
    zaloMessage: string;
  };
}

export async function createAndEnrollStudentAction(
  _prevState: CreateStudentState,
  formData: FormData
): Promise<CreateStudentState> {
  const classId = String(formData.get("classId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!classId || !fullName) {
    return { error: "Vui lòng nhập Họ và tên học sinh." };
  }

  let access;
  try {
    access = await requireClassAccess(classId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không có quyền." };
  }

  const username = await generateCollisionFreeUsername(fullName);
  const plainPassword = generateRandomPassword(6);
  const passwordHash = await hashPassword(plainPassword);

  const studentId = await db.transaction(async (tx) => {
    const [newStudent] = await tx
      .insert(users)
      .values({
        centerId: access.user.centerId!,
        username,
        passwordHash,
        fullName,
        phone: phone || null,
        role: "STUDENT",
        isActive: true,
      })
      .returning();

    await tx.insert(classStudents).values({
      classId,
      studentId: newStudent.id,
      status: "ACTIVE",
      totalBonusPoints: 0,
    });

    return newStudent.id;
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const zaloMessage = formatZaloCredentialsMessage({
    studentName: fullName,
    centerName: access.user.centerName ?? "Trung tâm",
    appUrl,
    username,
    plainPassword,
  });

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/classes");
  revalidatePath("/students");

  return {
    success: `Đã thêm học sinh "${fullName}" vào ca học.`,
    credentials: {
      studentId,
      fullName,
      username,
      plainPassword,
      zaloMessage,
    },
  };
}

export async function enrollExistingStudentAction(
  classId: string,
  studentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { user } = await requireClassAccess(classId);

    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, studentId),
          eq(users.centerId, user.centerId!),
          eq(users.role, "STUDENT")
        )
      )
      .limit(1);

    if (!student) {
      return { ok: false, error: "Không tìm thấy học sinh trong trung tâm." };
    }

    const [existingEnrollment] = await db
      .select()
      .from(classStudents)
      .where(
        and(
          eq(classStudents.classId, classId),
          eq(classStudents.studentId, studentId)
        )
      )
      .limit(1);

    if (existingEnrollment) {
      await db
        .update(classStudents)
        .set({ status: "ACTIVE", leftAt: null })
        .where(eq(classStudents.id, existingEnrollment.id));
    } else {
      await db.insert(classStudents).values({
        classId,
        studentId,
        status: "ACTIVE",
        totalBonusPoints: 0,
      });
    }

    revalidatePath(`/classes/${classId}`);
    revalidatePath("/classes");
    revalidatePath("/students");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi khi gán học sinh vào lớp.",
    };
  }
}

export async function resetStudentPasswordAction(studentId: string): Promise<{
  ok: boolean;
  fullName?: string;
  username?: string;
  plainPassword?: string;
  zaloMessage?: string;
  error?: string;
}> {
  const actor = await requireAuth(["ADMIN", "TEACHER"]);
  if (!actor.centerId) {
    return { ok: false, error: "Không xác định được trung tâm." };
  }

  const [student] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
    })
    .from(users)
    .where(
      and(
        eq(users.id, studentId),
        eq(users.centerId, actor.centerId),
        eq(users.role, "STUDENT")
      )
    )
    .limit(1);

  if (!student) {
    return { ok: false, error: "Không tìm thấy tài khoản học sinh." };
  }

  // If teacher, verify student is enrolled in at least one class assigned to this teacher
  if (actor.role === "TEACHER") {
    const teacherEnrollments = await db
      .select({ id: classStudents.id })
      .from(classStudents)
      .innerJoin(classes, eq(classStudents.classId, classes.id))
      .where(
        and(
          eq(classStudents.studentId, studentId),
          eq(classes.teacherId, actor.id)
        )
      )
      .limit(1);

    if (teacherEnrollments.length === 0) {
      return {
        ok: false,
        error: "Bạn chỉ được cấp lại mật khẩu cho học sinh thuộc lớp mình dạy.",
      };
    }
  }

  const plainPassword = generateRandomPassword(6);
  const passwordHash = await hashPassword(plainPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, student.id));

    await recordAuditLog(
      {
        centerId: actor.centerId!,
        actorUserId: actor.id,
        actionType: "RESET_STUDENT_PASSWORD",
        targetStudentId: student.id,
        details: {
          studentName: student.fullName,
          username: student.username,
        },
      },
      tx
    );
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const zaloMessage = formatZaloCredentialsMessage({
    studentName: student.fullName,
    centerName: actor.centerName ?? "Trung tâm",
    appUrl,
    username: student.username,
    plainPassword,
  });

  revalidatePath("/students");
  return {
    ok: true,
    fullName: student.fullName,
    username: student.username,
    plainPassword,
    zaloMessage,
  };
}

export async function updateStudentEnrollmentProfileAction(params: {
  classId: string;
  studentId: string;
  status: "ACTIVE" | "PAUSED" | "LEFT";
  publicNote: string;
  internalNote: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { user } = await requireClassAccess(params.classId);

    const [current] = await db
      .select()
      .from(classStudents)
      .where(
        and(
          eq(classStudents.classId, params.classId),
          eq(classStudents.studentId, params.studentId)
        )
      )
      .limit(1);

    if (!current) {
      return { ok: false, error: "Học sinh không thuộc ca học này." };
    }

    const nextPublic = params.publicNote.trim() || null;
    const nextInternal = params.internalNote.trim() || null;
    const nextLeftAt =
      params.status === "LEFT"
        ? current.leftAt ?? new Date()
        : null;

    await db.transaction(async (tx) => {
      await tx
        .update(classStudents)
        .set({
          status: params.status,
          publicNote: nextPublic,
          internalNote: nextInternal,
          leftAt: nextLeftAt,
        })
        .where(eq(classStudents.id, current.id));

      if (current.status !== params.status) {
        await recordAuditLog(
          {
            centerId: user.centerId!,
            actorUserId: user.id,
            actionType: "UPDATE_STUDENT_STATUS",
            targetStudentId: params.studentId,
            classId: params.classId,
            details: {
              previousStatus: current.status,
              nextStatus: params.status,
            },
          },
          tx
        );
      }

      if ((current.publicNote ?? null) !== nextPublic) {
        await recordAuditLog(
          {
            centerId: user.centerId!,
            actorUserId: user.id,
            actionType: "UPDATE_PUBLIC_NOTE",
            targetStudentId: params.studentId,
            classId: params.classId,
            details: {
              previousNote: current.publicNote ?? "",
              nextNote: nextPublic ?? "",
            },
          },
          tx
        );
      }

      if ((current.internalNote ?? null) !== nextInternal) {
        await recordAuditLog(
          {
            centerId: user.centerId!,
            actorUserId: user.id,
            actionType: "UPDATE_INTERNAL_NOTE",
            targetStudentId: params.studentId,
            classId: params.classId,
            details: {
              updated: true,
            },
          },
          tx
        );
      }
    });

    revalidatePath(`/classes/${params.classId}`);
    revalidatePath("/classes");
    revalidatePath("/students");
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể lưu hồ sơ học sinh.",
    };
  }
}

export async function addTestScoreAction(params: {
  classId: string;
  studentId: string;
  title: string;
  score: number;
  recordedDate: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { user } = await requireClassAccess(params.classId);
    const title = params.title.trim();

    if (!title) {
      return { ok: false, error: "Vui lòng nhập tên bài kiểm tra." };
    }
    if (Number.isNaN(params.score) || params.score < 0 || params.score > 100) {
      return { ok: false, error: "Điểm số không hợp lệ (0–100)." };
    }

    const dateStr =
      /^\d{4}-\d{2}-\d{2}$/.test(params.recordedDate)
        ? params.recordedDate
        : new Date().toISOString().slice(0, 10);

    await db.transaction(async (tx) => {
      await tx.insert(pointHistories).values({
        classId: params.classId,
        studentId: params.studentId,
        type: "TEST",
        title,
        score: params.score,
        recordedDate: dateStr,
        createdByUserId: user.id,
      });

      await recordAuditLog(
        {
          centerId: user.centerId!,
          actorUserId: user.id,
          actionType: "ADD_TEST_SCORE",
          targetStudentId: params.studentId,
          classId: params.classId,
          details: {
            title,
            score: params.score,
            recordedDate: dateStr,
          },
        },
        tx
      );
    });

    revalidatePath(`/classes/${params.classId}`);
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể thêm điểm kiểm tra.",
    };
  }
}

export async function deleteTestScoreAction(params: {
  pointId: string;
  classId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { user } = await requireClassAccess(params.classId);

    const [existing] = await db
      .select()
      .from(pointHistories)
      .where(
        and(
          eq(pointHistories.id, params.pointId),
          eq(pointHistories.classId, params.classId),
          eq(pointHistories.type, "TEST")
        )
      )
      .limit(1);

    if (!existing) {
      return { ok: false, error: "Không tìm thấy điểm kiểm tra." };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(pointHistories)
        .where(eq(pointHistories.id, existing.id));

      await recordAuditLog(
        {
          centerId: user.centerId!,
          actorUserId: user.id,
          actionType: "DELETE_TEST_SCORE",
          targetStudentId: existing.studentId,
          classId: params.classId,
          details: {
            title: existing.title,
            score: existing.score,
          },
        },
        tx
      );
    });

    revalidatePath(`/classes/${params.classId}`);
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể xóa điểm kiểm tra.",
    };
  }
}
