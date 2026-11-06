import { and, asc, eq } from "drizzle-orm";
import type { DbClient } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  classes,
  tuitionCycles,
  tuitionRecords,
} from "@/db/schema";
import { calculateStudentCycleBill } from "./tuition-calc";

/**
 * Generates (or refreshes unpaid) tuition bills for a completed cycle of a class.
 * Safe to call both when the final session is created AND when attendance in that cycle is edited.
 */
export async function syncTuitionCycleBillsTx(
  tx: DbClient,
  params: {
    classId: string;
    cycleNumber: number;
  }
): Promise<void> {
  const [classRow] = await tx
    .select()
    .from(classes)
    .where(eq(classes.id, params.classId))
    .limit(1);

  if (!classRow) return;

  const sessions = await tx
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.classId, params.classId),
        eq(attendanceSessions.cycleNumber, params.cycleNumber)
      )
    )
    .orderBy(asc(attendanceSessions.sessionDate), asc(attendanceSessions.createdAt));

  if (sessions.length === 0) return;

  const startDate = sessions[0].sessionDate;
  const endDate = sessions[sessions.length - 1].sessionDate;

  let [cycle] = await tx
    .select()
    .from(tuitionCycles)
    .where(
      and(
        eq(tuitionCycles.classId, params.classId),
        eq(tuitionCycles.cycleNumber, params.cycleNumber)
      )
    )
    .limit(1);

  if (!cycle) {
    [cycle] = await tx
      .insert(tuitionCycles)
      .values({
        classId: params.classId,
        cycleNumber: params.cycleNumber,
        startDate,
        endDate,
        status: "OPEN",
      })
      .returning();
  } else {
    await tx
      .update(tuitionCycles)
      .set({ startDate, endDate })
      .where(eq(tuitionCycles.id, cycle.id));
  }

  // Gather all attendance records across sessions in this cycle
  const rows = await tx
    .select({
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .innerJoin(
      attendanceSessions,
      eq(attendanceRecords.sessionId, attendanceSessions.id)
    )
    .where(
      and(
        eq(attendanceSessions.classId, params.classId),
        eq(attendanceSessions.cycleNumber, params.cycleNumber)
      )
    );

  const byStudent = new Map<
    string,
    { billable: number; excused: number; unexcused: number }
  >();

  for (const r of rows) {
    const stat = byStudent.get(r.studentId) ?? {
      billable: 0,
      excused: 0,
      unexcused: 0,
    };
    stat.billable += 1;
    if (r.status === "ABSENT_EXCUSED") stat.excused += 1;
    if (r.status === "ABSENT_UNEXCUSED") stat.unexcused += 1;
    byStudent.set(r.studentId, stat);
  }

  const existingRecords = await tx
    .select()
    .from(tuitionRecords)
    .where(eq(tuitionRecords.tuitionCycleId, cycle.id));

  for (const [studentId, stat] of byStudent.entries()) {
    const existing = existingRecords.find((x) => x.studentId === studentId);
    // Do not overwrite already-paid invoices
    if (existing?.isPaid) continue;

    const calc = calculateStudentCycleBill({
      tuitionPerCycle: classRow.tuitionPerCycle,
      sessionsPerCycle: classRow.sessionsPerCycle,
      deductionPerSession: classRow.deductionPerSession,
      billableSessions: stat.billable,
      excusedAbsentCount: stat.excused,
      unexcusedAbsentCount: stat.unexcused,
      adjustmentAmount: existing?.adjustmentAmount ?? 0,
    });

    if (!existing) {
      await tx.insert(tuitionRecords).values({
        tuitionCycleId: cycle.id,
        studentId,
        billableSessions: calc.billableSessions,
        excusedAbsentCount: calc.excusedAbsentCount,
        unexcusedAbsentCount: calc.unexcusedAbsentCount,
        baseAmount: calc.baseAmount,
        deductedAmount: calc.deductedAmount,
        adjustmentAmount: calc.adjustmentAmount,
        finalAmount: calc.finalAmount,
        isPaid: false,
      });
    } else {
      await tx
        .update(tuitionRecords)
        .set({
          billableSessions: calc.billableSessions,
          excusedAbsentCount: calc.excusedAbsentCount,
          unexcusedAbsentCount: calc.unexcusedAbsentCount,
          baseAmount: calc.baseAmount,
          deductedAmount: calc.deductedAmount,
          finalAmount: calc.finalAmount,
        })
        .where(eq(tuitionRecords.id, existing.id));
    }
  }
}
