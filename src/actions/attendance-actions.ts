"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  classes,
  classStudents,
  pointHistories,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/services/audit";
import { requireClassAccess } from "@/lib/services/class-access";
import { syncTuitionCycleBillsTx } from "@/lib/services/tuition-cycle";

function getVietnamDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function startAttendanceSessionAction(params: {
  classId: string;
  sessionDate?: string;
  forceSecondSessionToday?: boolean;
}): Promise<{
  ok: boolean;
  sessionId?: string;
  alreadyExistedToday?: boolean;
  cycleClosed?: boolean;
  closedCycleNumber?: number;
  error?: string;
}> {
  try {
    const { user } = await requireClassAccess(params.classId);
    const targetDate =
      params.sessionDate && /^\d{4}-\d{2}-\d{2}$/.test(params.sessionDate)
        ? params.sessionDate
        : getVietnamDateString();

    // Anti-double-tap / duplicate session guard on the same date
    if (!params.forceSecondSessionToday) {
      const [existingToday] = await db
        .select({ id: attendanceSessions.id })
        .from(attendanceSessions)
        .where(
          and(
            eq(attendanceSessions.classId, params.classId),
            eq(attendanceSessions.sessionDate, targetDate)
          )
        )
        .orderBy(desc(attendanceSessions.createdAt))
        .limit(1);

      if (existingToday) {
        return {
          ok: true,
          sessionId: existingToday.id,
          alreadyExistedToday: true,
        };
      }
    }

    const result = await db.transaction(async (tx) => {
      const [freshClass] = await tx
        .select()
        .from(classes)
        .where(eq(classes.id, params.classId))
        .limit(1);

      if (!freshClass) {
        throw new Error("Không tìm thấy Ca học.");
      }

      const activeStudents = await tx
        .select({ studentId: classStudents.studentId })
        .from(classStudents)
        .where(
          and(
            eq(classStudents.classId, params.classId),
            eq(classStudents.status, "ACTIVE")
          )
        );

      if (activeStudents.length === 0) {
        throw new Error(
          "Ca học chưa có học sinh Đang học. Hãy thêm học sinh trước khi điểm danh."
        );
      }

      const cycleNumber = freshClass.currentCycleNumber;
      const sessionNumberInCycle = freshClass.currentSessionCount + 1;

      const [newSession] = await tx
        .insert(attendanceSessions)
        .values({
          classId: params.classId,
          cycleNumber,
          sessionNumberInCycle,
          sessionDate: targetDate,
          createdByUserId: user.id,
        })
        .returning();

      // Default 100% of ACTIVE students to PRESENT
      await tx.insert(attendanceRecords).values(
        activeStudents.map((s) => ({
          sessionId: newSession.id,
          studentId: s.studentId,
          status: "PRESENT" as const,
          updatedByUserId: user.id,
        }))
      );

      await recordAuditLog(
        {
          centerId: user.centerId!,
          actorUserId: user.id,
          actionType: "CREATE_ATTENDANCE_SESSION",
          classId: params.classId,
          details: {
            sessionDate: targetDate,
            cycleNumber,
            sessionNumberInCycle,
            studentCount: activeStudents.length,
          },
        },
        tx
      );

      const cycleClosed = sessionNumberInCycle >= freshClass.sessionsPerCycle;

      if (cycleClosed) {
        // Advance class immediately so the next session is never blocked by unpaid bills
        await tx
          .update(classes)
          .set({
            currentCycleNumber: cycleNumber + 1,
            currentSessionCount: 0,
          })
          .where(eq(classes.id, params.classId));

        await syncTuitionCycleBillsTx(tx, {
          classId: params.classId,
          cycleNumber,
        });
      } else {
        await tx
          .update(classes)
          .set({
            currentSessionCount: sessionNumberInCycle,
          })
          .where(eq(classes.id, params.classId));
      }

      return {
        sessionId: newSession.id,
        cycleClosed,
        closedCycleNumber: cycleClosed ? cycleNumber : undefined,
      };
    });

    revalidatePath(`/classes/${params.classId}`);
    revalidatePath("/classes");
    revalidatePath("/tuition");
    revalidatePath("/", "layout");

    return {
      ok: true,
      ...result,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể bắt đầu buổi điểm danh.",
    };
  }
}

export async function updateAttendanceStatusAction(params: {
  recordId: string;
  nextStatus: "PRESENT" | "ABSENT_EXCUSED" | "ABSENT_UNEXCUSED";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const [joined] = await db
      .select({
        recordId: attendanceRecords.id,
        previousStatus: attendanceRecords.status,
        studentId: attendanceRecords.studentId,
        sessionId: attendanceSessions.id,
        classId: attendanceSessions.classId,
        cycleNumber: attendanceSessions.cycleNumber,
        sessionDate: attendanceSessions.sessionDate,
      })
      .from(attendanceRecords)
      .innerJoin(
        attendanceSessions,
        eq(attendanceRecords.sessionId, attendanceSessions.id)
      )
      .where(eq(attendanceRecords.id, params.recordId))
      .limit(1);

    if (!joined) {
      return { ok: false, error: "Không tìm thấy bản ghi điểm danh." };
    }

    const { user } = await requireClassAccess(joined.classId);

    if (joined.previousStatus === params.nextStatus) {
      return { ok: true };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(attendanceRecords)
        .set({
          status: params.nextStatus,
          updatedByUserId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, params.recordId));

      await recordAuditLog(
        {
          centerId: user.centerId!,
          actorUserId: user.id,
          actionType: "UPDATE_ATTENDANCE",
          targetStudentId: joined.studentId,
          classId: joined.classId,
          details: {
            sessionDate: joined.sessionDate,
            cycleNumber: joined.cycleNumber,
            previousStatus: joined.previousStatus,
            nextStatus: params.nextStatus,
          },
        },
        tx
      );

      // If this session belongs to a cycle that already opened tuition billing, re-sync unpaid bills!
      const [existingCycle] = await tx
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.id, joined.classId))
        .limit(1);

      if (existingCycle) {
        const { tuitionCycles } = await import("@/db/schema");
        const [cycleRow] = await tx
          .select({ id: tuitionCycles.id })
          .from(tuitionCycles)
          .where(
            and(
              eq(tuitionCycles.classId, joined.classId),
              eq(tuitionCycles.cycleNumber, joined.cycleNumber)
            )
          )
          .limit(1);

        if (cycleRow) {
          await syncTuitionCycleBillsTx(tx, {
            classId: joined.classId,
            cycleNumber: joined.cycleNumber,
          });
        }
      }
    });

    revalidatePath(`/classes/${joined.classId}`);
    revalidatePath("/tuition");
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể cập nhật điểm danh.",
    };
  }
}

export async function addBonusPointAction(params: {
  classId: string;
  studentId: string;
  delta: number;
  reason?: string;
}): Promise<{ ok: boolean; newTotal?: number; error?: string }> {
  try {
    const { user } = await requireClassAccess(params.classId);
    const delta = Math.round(params.delta);
    if (delta === 0 || Math.abs(delta) > 20) {
      return { ok: false, error: "Mức điểm cộng/trừ không hợp lệ." };
    }

    const title =
      params.reason?.trim() ||
      (delta > 0 ? "Phát biểu / Làm bài tốt" : "Điều chỉnh điểm khuyến khích");
    const today = getVietnamDateString();

    const newTotal = await db.transaction(async (tx) => {
      await tx.insert(pointHistories).values({
        classId: params.classId,
        studentId: params.studentId,
        type: "BONUS",
        title,
        score: delta,
        recordedDate: today,
        createdByUserId: user.id,
      });

      const [updated] = await tx
        .update(classStudents)
        .set({
          totalBonusPoints: sql`greatest(0, ${classStudents.totalBonusPoints} + ${delta})`,
        })
        .where(
          and(
            eq(classStudents.classId, params.classId),
            eq(classStudents.studentId, params.studentId)
          )
        )
        .returning({ totalBonusPoints: classStudents.totalBonusPoints });

      await recordAuditLog(
        {
          centerId: user.centerId!,
          actorUserId: user.id,
          actionType: "ADD_BONUS_POINT",
          targetStudentId: params.studentId,
          classId: params.classId,
          details: {
            delta,
            reason: title,
          },
        },
        tx
      );

      return updated?.totalBonusPoints ?? 0;
    });

    revalidatePath(`/classes/${params.classId}`);
    revalidatePath("/portal");
    return { ok: true, newTotal };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể cộng điểm.",
    };
  }
}
