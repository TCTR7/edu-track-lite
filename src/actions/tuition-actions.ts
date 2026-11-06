"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { classes, tuitionCycles, tuitionRecords, users } from "@/db/schema";
import { recordAuditLog } from "@/lib/services/audit";
import { requireClassAccess } from "@/lib/services/class-access";

async function resolveTuitionBillWithAccess(recordId: string) {
  const [bill] = await db
    .select({
      record: tuitionRecords,
      cycle: tuitionCycles,
      classRow: classes,
      student: users,
    })
    .from(tuitionRecords)
    .innerJoin(
      tuitionCycles,
      eq(tuitionRecords.tuitionCycleId, tuitionCycles.id)
    )
    .innerJoin(classes, eq(tuitionCycles.classId, classes.id))
    .innerJoin(users, eq(tuitionRecords.studentId, users.id))
    .where(eq(tuitionRecords.id, recordId))
    .limit(1);

  if (!bill) {
    throw new Error("Không tìm thấy hóa đơn học phí.");
  }

  const { user: actor } = await requireClassAccess(bill.classRow.id);
  return { actor, ...bill };
}

async function syncCycleCompletionStatusTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  cycleId: string
) {
  const allInCycle = await tx
    .select({ isPaid: tuitionRecords.isPaid })
    .from(tuitionRecords)
    .where(eq(tuitionRecords.tuitionCycleId, cycleId));

  const allPaid =
    allInCycle.length > 0 && allInCycle.every((item) => item.isPaid);

  await tx
    .update(tuitionCycles)
    .set({ status: allPaid ? "COMPLETED" : "OPEN" })
    .where(eq(tuitionCycles.id, cycleId));
}

export async function collectTuitionBillAction(params: {
  recordId: string;
  paymentMethod: "CASH" | "TRANSFER";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor, record, cycle, classRow, student } =
      await resolveTuitionBillWithAccess(params.recordId);

    await db.transaction(async (tx) => {
      await tx
        .update(tuitionRecords)
        .set({
          isPaid: true,
          paymentMethod: params.paymentMethod,
          collectedByUserId: actor.id,
          paidAt: new Date(),
        })
        .where(eq(tuitionRecords.id, record.id));

      await syncCycleCompletionStatusTx(tx, cycle.id);

      await recordAuditLog(
        {
          centerId: actor.centerId!,
          actorUserId: actor.id,
          actionType: "COLLECT_TUITION",
          targetStudentId: student.id,
          classId: classRow.id,
          details: {
            recordId: record.id,
            cycleNumber: cycle.cycleNumber,
            className: classRow.name,
            studentName: student.fullName,
            finalAmount: record.finalAmount,
            paymentMethod: params.paymentMethod,
          },
        },
        tx
      );
    });

    revalidatePath("/tuition");
    revalidatePath("/classes");
    revalidatePath(`/classes/${classRow.id}`);
    revalidatePath("/students");
    revalidatePath("/portal");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể xác nhận thu học phí.",
    };
  }
}

export async function revertTuitionBillAction(params: {
  recordId: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor, record, cycle, classRow, student } =
      await resolveTuitionBillWithAccess(params.recordId);

    if (!record.isPaid) {
      return { ok: false, error: "Hóa đơn này hiện chưa được thu." };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(tuitionRecords)
        .set({
          isPaid: false,
          paymentMethod: null,
          collectedByUserId: null,
          paidAt: null,
        })
        .where(eq(tuitionRecords.id, record.id));

      await syncCycleCompletionStatusTx(tx, cycle.id);

      await recordAuditLog(
        {
          centerId: actor.centerId!,
          actorUserId: actor.id,
          actionType: "REVERT_TUITION",
          targetStudentId: student.id,
          classId: classRow.id,
          details: {
            recordId: record.id,
            cycleNumber: cycle.cycleNumber,
            className: classRow.name,
            studentName: student.fullName,
            finalAmount: record.finalAmount,
            previousMethod: record.paymentMethod,
            reason: params.reason?.trim() || "Hoàn tác thao tác thu nhầm",
          },
        },
        tx
      );
    });

    revalidatePath("/tuition");
    revalidatePath("/classes");
    revalidatePath(`/classes/${classRow.id}`);
    revalidatePath("/students");
    revalidatePath("/portal");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể hủy thu hóa đơn này.",
    };
  }
}

export async function adjustTuitionBillAction(params: {
  recordId: string;
  adjustmentAmount: number;
  adjustmentNote?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor, record, cycle, classRow, student } =
      await resolveTuitionBillWithAccess(params.recordId);

    if (record.isPaid) {
      return {
        ok: false,
        error:
          "Không thể điều chỉnh hóa đơn đã thu. Vui lòng hoàn tác thu trước nếu cần sửa.",
      };
    }

    const adj = Math.round(Number(params.adjustmentAmount) || 0);
    const note = params.adjustmentNote?.trim() || null;
    const nextFinalAmount = Math.max(
      0,
      record.baseAmount - record.deductedAmount + adj
    );

    await db.transaction(async (tx) => {
      await tx
        .update(tuitionRecords)
        .set({
          adjustmentAmount: adj,
          adjustmentNote: note,
          finalAmount: nextFinalAmount,
        })
        .where(eq(tuitionRecords.id, record.id));

      await recordAuditLog(
        {
          centerId: actor.centerId!,
          actorUserId: actor.id,
          actionType: "ADJUST_TUITION",
          targetStudentId: student.id,
          classId: classRow.id,
          details: {
            recordId: record.id,
            cycleNumber: cycle.cycleNumber,
            className: classRow.name,
            studentName: student.fullName,
            adjustmentAmount: adj,
            adjustmentNote: note,
            finalAmount: nextFinalAmount,
          },
        },
        tx
      );
    });

    revalidatePath("/tuition");
    revalidatePath("/classes");
    revalidatePath(`/classes/${classRow.id}`);
    revalidatePath("/students");
    revalidatePath("/portal");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể điều chỉnh học phí.",
    };
  }
}
