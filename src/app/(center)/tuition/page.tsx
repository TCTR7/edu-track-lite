import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  centers,
  classes,
  tuitionCycles,
  tuitionRecords,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { toVnDateString } from "@/lib/services/reconciliation";
import { TuitionClient, type TuitionBillViewItem } from "./tuition-client";

export default async function TuitionPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; tab?: string }>;
}) {
  const user = await requireAuth(["ADMIN", "TEACHER"]);
  const params = await searchParams;

  const [center] = await db
    .select()
    .from(centers)
    .where(eq(centers.id, user.centerId!))
    .limit(1);

  const accessibleClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      gradeLevel: classes.gradeLevel,
    })
    .from(classes)
    .where(
      user.role === "ADMIN"
        ? eq(classes.centerId, user.centerId!)
        : and(
            eq(classes.centerId, user.centerId!),
            eq(classes.teacherId, user.id)
          )
    );

  const classIds = accessibleClasses.map((c) => c.id);
  const classMap = new Map(accessibleClasses.map((c) => [c.id, c]));

  const centerUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.centerId, user.centerId!));

  const userMap = new Map(centerUsers.map((u) => [u.id, u]));

  let bills: TuitionBillViewItem[] = [];

  if (classIds.length > 0) {
    const cycleRows = await db
      .select()
      .from(tuitionCycles)
      .where(inArray(tuitionCycles.classId, classIds))
      .orderBy(desc(tuitionCycles.createdAt), desc(tuitionCycles.cycleNumber));

    const cycleIds = cycleRows.map((c) => c.id);
    const cycleMap = new Map(cycleRows.map((c) => [c.id, c]));

    if (cycleIds.length > 0) {
      const recordRows = await db
        .select()
        .from(tuitionRecords)
        .where(inArray(tuitionRecords.tuitionCycleId, cycleIds));

      bills = recordRows
        .map((r) => {
          const cyc = cycleMap.get(r.tuitionCycleId)!;
          const cls = classMap.get(cyc.classId)!;
          const student = userMap.get(r.studentId);
          const collector = r.collectedByUserId
            ? userMap.get(r.collectedByUserId)
            : null;

          return {
            id: r.id,
            classId: cls.id,
            className: cls.name,
            cycleId: cyc.id,
            cycleNumber: cyc.cycleNumber,
            cycleStartDate: cyc.startDate,
            cycleEndDate: cyc.endDate,
            studentId: r.studentId,
            studentName: student?.fullName ?? "Học sinh",
            studentUsername: student?.username ?? "",
            studentPhone: student?.phone ?? null,
            billableSessions: r.billableSessions,
            excusedAbsentCount: r.excusedAbsentCount,
            unexcusedAbsentCount: r.unexcusedAbsentCount,
            baseAmount: r.baseAmount,
            deductedAmount: r.deductedAmount,
            adjustmentAmount: r.adjustmentAmount,
            adjustmentNote: r.adjustmentNote,
            finalAmount: r.finalAmount,
            isPaid: r.isPaid,
            paymentMethod: r.paymentMethod,
            collectedByUserId: r.collectedByUserId,
            collectedByName: collector?.fullName ?? null,
            paidAtIso: r.paidAt ? r.paidAt.toISOString() : null,
          };
        })
        .sort((a, b) => {
          if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
          if (b.cycleNumber !== a.cycleNumber) {
            return b.cycleNumber - a.cycleNumber;
          }
          return a.studentName.localeCompare(b.studentName, "vi");
        });
    }
  }

  const todayStr = toVnDateString(new Date());

  return (
    <TuitionClient
      bills={bills}
      classesList={accessibleClasses}
      initialClassId={params.classId ?? "ALL"}
      initialTab={
        params.tab === "reconciliation"
          ? "reconciliation"
          : params.tab === "paid"
          ? "paid"
          : "unpaid"
      }
      todayStr={todayStr}
      bankConfig={{
        bankBin: center?.bankBin ?? null,
        bankAccountNo: center?.bankAccountNo ?? null,
        bankAccountName: center?.bankAccountName ?? null,
      }}
    />
  );
}
