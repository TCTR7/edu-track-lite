import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  centers,
  classes,
  classStudents,
  homeworks,
  pointHistories,
  tuitionCycles,
  tuitionRecords,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { formatScheduleSummary } from "@/lib/utils/schedule";
import {
  PortalClient,
  type PortalAttendanceItem,
  type PortalClassOption,
  type PortalHomeworkItem,
  type PortalPointItem,
  type PortalTuitionBillItem,
} from "./portal-client";

export default async function StudentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const student = await requireAuth(["STUDENT"]);
  const params = await searchParams;

  // Strictly SELECT only publicNote — NEVER select internalNote in ROLE_STUDENT queries!
  const enrolledRows = await db
    .select({
      classId: classes.id,
      className: classes.name,
      gradeLevel: classes.gradeLevel,
      teacherId: classes.teacherId,
      scheduleJson: classes.scheduleJson,
      tuitionPerCycle: classes.tuitionPerCycle,
      sessionsPerCycle: classes.sessionsPerCycle,
      currentCycleNumber: classes.currentCycleNumber,
      currentSessionCount: classes.currentSessionCount,
      publicNote: classStudents.publicNote,
      totalBonusPoints: classStudents.totalBonusPoints,
    })
    .from(classStudents)
    .innerJoin(classes, eq(classStudents.classId, classes.id))
    .where(
      and(
        eq(classStudents.studentId, student.id),
        eq(classStudents.status, "ACTIVE")
      )
    );

  const [center] = await db
    .select({
      name: centers.name,
      phone: centers.phone,
      bankBin: centers.bankBin,
      bankAccountNo: centers.bankAccountNo,
      bankAccountName: centers.bankAccountName,
    })
    .from(centers)
    .where(eq(centers.id, student.centerId!))
    .limit(1);

  const enrolledClasses: PortalClassOption[] = enrolledRows.map((c) => ({
    classId: c.classId,
    className: c.className,
    gradeLevel: c.gradeLevel,
    scheduleSummary: formatScheduleSummary(c.scheduleJson),
    tuitionPerCycle: c.tuitionPerCycle,
    sessionsPerCycle: c.sessionsPerCycle,
    currentCycleNumber: c.currentCycleNumber,
    currentSessionCount: c.currentSessionCount,
    publicNote: c.publicNote ?? null,
    totalBonusPoints: c.totalBonusPoints,
  }));

  const selectedClass =
    enrolledClasses.find((c) => c.classId === params.classId) ??
    enrolledClasses[0] ??
    null;

  let teacherName = "Giáo viên";
  let tuitionBills: PortalTuitionBillItem[] = [];
  let homeworksList: PortalHomeworkItem[] = [];
  let pointsList: PortalPointItem[] = [];
  let attendanceList: PortalAttendanceItem[] = [];

  if (selectedClass) {
    const rawSelected = enrolledRows.find(
      (r) => r.classId === selectedClass.classId
    )!;

    const [teacherRow, billRows, hwRows, ptRows, attRows] = await Promise.all([
      db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, rawSelected.teacherId))
        .limit(1),
      db
        .select({
          id: tuitionRecords.id,
          cycleNumber: tuitionCycles.cycleNumber,
          startDate: tuitionCycles.startDate,
          endDate: tuitionCycles.endDate,
          billableSessions: tuitionRecords.billableSessions,
          excusedAbsentCount: tuitionRecords.excusedAbsentCount,
          unexcusedAbsentCount: tuitionRecords.unexcusedAbsentCount,
          baseAmount: tuitionRecords.baseAmount,
          deductedAmount: tuitionRecords.deductedAmount,
          adjustmentAmount: tuitionRecords.adjustmentAmount,
          adjustmentNote: tuitionRecords.adjustmentNote,
          finalAmount: tuitionRecords.finalAmount,
          isPaid: tuitionRecords.isPaid,
          paymentMethod: tuitionRecords.paymentMethod,
          paidAt: tuitionRecords.paidAt,
        })
        .from(tuitionRecords)
        .innerJoin(
          tuitionCycles,
          eq(tuitionRecords.tuitionCycleId, tuitionCycles.id)
        )
        .where(
          and(
            eq(tuitionCycles.classId, selectedClass.classId),
            eq(tuitionRecords.studentId, student.id)
          )
        )
        .orderBy(desc(tuitionCycles.cycleNumber)),
      db
        .select({
          id: homeworks.id,
          title: homeworks.title,
          imageUrlsJson: homeworks.imageUrlsJson,
          createdAt: homeworks.createdAt,
        })
        .from(homeworks)
        .where(eq(homeworks.classId, selectedClass.classId))
        .orderBy(desc(homeworks.createdAt)),
      db
        .select({
          id: pointHistories.id,
          type: pointHistories.type,
          title: pointHistories.title,
          score: pointHistories.score,
          recordedDate: pointHistories.recordedDate,
          createdAt: pointHistories.createdAt,
        })
        .from(pointHistories)
        .where(
          and(
            eq(pointHistories.classId, selectedClass.classId),
            eq(pointHistories.studentId, student.id)
          )
        )
        .orderBy(desc(pointHistories.createdAt)),
      db
        .select({
          id: attendanceRecords.id,
          status: attendanceRecords.status,
          sessionDate: attendanceSessions.sessionDate,
          cycleNumber: attendanceSessions.cycleNumber,
          sessionNumberInCycle: attendanceSessions.sessionNumberInCycle,
        })
        .from(attendanceRecords)
        .innerJoin(
          attendanceSessions,
          eq(attendanceRecords.sessionId, attendanceSessions.id)
        )
        .where(
          and(
            eq(attendanceSessions.classId, selectedClass.classId),
            eq(attendanceRecords.studentId, student.id)
          )
        )
        .orderBy(
          desc(attendanceSessions.sessionDate),
          desc(attendanceSessions.createdAt)
        ),
    ]);

    teacherName = teacherRow[0]?.fullName ?? "Giáo viên";

    tuitionBills = billRows.map((b) => ({
      id: b.id,
      cycleNumber: b.cycleNumber,
      startDate: b.startDate,
      endDate: b.endDate,
      billableSessions: b.billableSessions,
      excusedAbsentCount: b.excusedAbsentCount,
      unexcusedAbsentCount: b.unexcusedAbsentCount,
      baseAmount: b.baseAmount,
      deductedAmount: b.deductedAmount,
      adjustmentAmount: b.adjustmentAmount,
      adjustmentNote: b.adjustmentNote,
      finalAmount: b.finalAmount,
      isPaid: b.isPaid,
      paymentMethod: b.paymentMethod,
      paidAtIso: b.paidAt ? b.paidAt.toISOString() : null,
    }));

    homeworksList = hwRows.map((h) => ({
      id: h.id,
      title: h.title,
      imageUrls: h.imageUrlsJson,
      createdAtIso: h.createdAt.toISOString(),
    }));

    pointsList = ptRows.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      score: p.score,
      recordedDate: p.recordedDate,
      createdAtIso: p.createdAt.toISOString(),
    }));

    attendanceList = attRows;
  }

  return (
    <PortalClient
      student={{
        fullName: student.fullName,
        username: student.username,
        centerName: student.centerName ?? center?.name ?? "Trung tâm",
      }}
      centerBank={{
        phone: center?.phone ?? null,
        bankBin: center?.bankBin ?? null,
        bankAccountNo: center?.bankAccountNo ?? null,
        bankAccountName: center?.bankAccountName ?? null,
      }}
      enrolledClasses={enrolledClasses}
      selectedClass={selectedClass}
      teacherName={teacherName}
      tuitionBills={tuitionBills}
      homeworksList={homeworksList}
      pointsList={pointsList}
      attendanceList={attendanceList}
    />
  );
}
