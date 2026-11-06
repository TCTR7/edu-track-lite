import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  attendanceRecords,
  attendanceSessions,
  classes,
  classStudents,
  homeworks,
  pointHistories,
  tuitionCycles,
  tuitionRecords,
  users,
} from "@/db/schema";
import { requireClassAccess } from "@/lib/services/class-access";
import { formatScheduleSummary } from "@/lib/utils/schedule";
import { ClassDetailClient } from "./class-detail-client";
import type {
  CenterStudentCandidate,
  ClassTuitionCycleItem,
  EnrolledStudentItem,
  HomeworkItem,
  PointHistoryItem,
  SessionWithRecords,
} from "./types";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  let access;
  try {
    access = await requireClassAccess(classId);
  } catch {
    notFound();
  }

  const { user, classRow } = access;

  const [teacher] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, classRow.teacherId))
    .limit(1);

  // All users in this center (for fast name lookup across sessions, points, homework, bills)
  const centerUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(eq(users.centerId, user.centerId!));

  const userMap = new Map(centerUsers.map((u) => [u.id, u]));

  // Enrolled students in this class
  const enrollmentRows = await db
    .select()
    .from(classStudents)
    .where(eq(classStudents.classId, classId))
    .orderBy(asc(classStudents.joinedAt));

  const enrolledStudents: EnrolledStudentItem[] = enrollmentRows
    .map((e) => {
      const s = userMap.get(e.studentId);
      if (!s) return null;
      return {
        enrollmentId: e.id,
        studentId: s.id,
        fullName: s.fullName,
        username: s.username,
        phone: s.phone,
        status: e.status,
        publicNote: e.publicNote,
        internalNote: e.internalNote,
        totalBonusPoints: e.totalBonusPoints,
        joinedAt: e.joinedAt.toISOString(),
      };
    })
    .filter((x): x is EnrolledStudentItem => x !== null)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  const bonusByStudentId = new Map(
    enrolledStudents.map((e) => [e.studentId, e.totalBonusPoints])
  );

  // Candidates in the center not currently ACTIVE in this class
  const allCenterEnrollments = await db
    .select({
      studentId: classStudents.studentId,
      classId: classes.id,
      className: classes.name,
      status: classStudents.status,
    })
    .from(classStudents)
    .innerJoin(classes, eq(classStudents.classId, classes.id))
    .where(eq(classes.centerId, user.centerId!));

  const activeInThisClass = new Set(
    enrolledStudents
      .filter((s) => s.status === "ACTIVE")
      .map((s) => s.studentId)
  );

  const centerCandidates: CenterStudentCandidate[] = centerUsers
    .filter((u) => u.role === "STUDENT" && !activeInThisClass.has(u.id))
    .map((u) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      currentClassNames: allCenterEnrollments
        .filter(
          (ce) =>
            ce.studentId === u.id &&
            ce.status === "ACTIVE" &&
            ce.classId !== classId
        )
        .map((ce) => ce.className),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  // Attendance sessions & records
  const sessionRows = await db
    .select()
    .from(attendanceSessions)
    .where(eq(attendanceSessions.classId, classId))
    .orderBy(
      desc(attendanceSessions.sessionDate),
      desc(attendanceSessions.createdAt)
    );

  const sessionIds = sessionRows.map((s) => s.id);
  const recordRows =
    sessionIds.length > 0
      ? await db
          .select()
          .from(attendanceRecords)
          .where(inArray(attendanceRecords.sessionId, sessionIds))
      : [];

  const sessions: SessionWithRecords[] = sessionRows.map((s) => {
    const recs = recordRows
      .filter((r) => r.sessionId === s.id)
      .map((r) => {
        const student = userMap.get(r.studentId);
        const updater = userMap.get(r.updatedByUserId);
        return {
          id: r.id,
          studentId: r.studentId,
          studentName: student?.fullName ?? "Học sinh",
          studentUsername: student?.username ?? "",
          totalBonusPoints: bonusByStudentId.get(r.studentId) ?? 0,
          status: r.status,
          updatedByName: updater?.fullName ?? "Giáo viên",
          updatedAt: r.updatedAt.toISOString(),
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "vi"));

    return {
      id: s.id,
      cycleNumber: s.cycleNumber,
      sessionNumberInCycle: s.sessionNumberInCycle,
      sessionDate: s.sessionDate,
      createdByName: userMap.get(s.createdByUserId)?.fullName ?? "Giáo viên",
      createdAt: s.createdAt.toISOString(),
      records: recs,
    };
  });

  // Point histories (Tests & Bonuses)
  const pointRows = await db
    .select()
    .from(pointHistories)
    .where(eq(pointHistories.classId, classId))
    .orderBy(desc(pointHistories.createdAt));

  const points: PointHistoryItem[] = pointRows.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    type: p.type,
    title: p.title,
    score: p.score,
    recordedDate: p.recordedDate,
    createdByName: userMap.get(p.createdByUserId)?.fullName ?? "Giáo viên",
    createdAt: p.createdAt.toISOString(),
  }));

  // Homeworks
  const homeworkRows = await db
    .select()
    .from(homeworks)
    .where(eq(homeworks.classId, classId))
    .orderBy(desc(homeworks.createdAt));

  const homeworksList: HomeworkItem[] = homeworkRows.map((h) => ({
    id: h.id,
    title: h.title,
    imageUrls: h.imageUrlsJson,
    createdByName: userMap.get(h.createdByUserId)?.fullName ?? "Giáo viên",
    createdAt: h.createdAt.toISOString(),
  }));

  // Tuition cycles for this class
  const cycleRows = await db
    .select()
    .from(tuitionCycles)
    .where(eq(tuitionCycles.classId, classId))
    .orderBy(desc(tuitionCycles.cycleNumber));

  const cycleIds = cycleRows.map((c) => c.id);
  const billRows =
    cycleIds.length > 0
      ? await db
          .select()
          .from(tuitionRecords)
          .where(inArray(tuitionRecords.tuitionCycleId, cycleIds))
      : [];

  const tuitionCyclesList: ClassTuitionCycleItem[] = cycleRows.map((c) => ({
    id: c.id,
    cycleNumber: c.cycleNumber,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
    records: billRows
      .filter((b) => b.tuitionCycleId === c.id)
      .map((b) => ({
        id: b.id,
        studentName: userMap.get(b.studentId)?.fullName ?? "Học sinh",
        billableSessions: b.billableSessions,
        excusedAbsentCount: b.excusedAbsentCount,
        unexcusedAbsentCount: b.unexcusedAbsentCount,
        finalAmount: b.finalAmount,
        isPaid: b.isPaid,
        paymentMethod: b.paymentMethod,
        collectedByName: b.collectedByUserId
          ? userMap.get(b.collectedByUserId)?.fullName ?? null
          : null,
        paidAt: b.paidAt ? b.paidAt.toISOString() : null,
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "vi")),
  }));

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <ClassDetailClient
      classInfo={{
        id: classRow.id,
        name: classRow.name,
        gradeLevel: classRow.gradeLevel,
        teacherName: teacher?.fullName ?? "Giáo viên",
        scheduleSummary: formatScheduleSummary(classRow.scheduleJson),
        tuitionPerCycle: classRow.tuitionPerCycle,
        sessionsPerCycle: classRow.sessionsPerCycle,
        deductionPerSession: classRow.deductionPerSession,
        currentCycleNumber: classRow.currentCycleNumber,
        currentSessionCount: classRow.currentSessionCount,
      }}
      sessions={sessions}
      enrolledStudents={enrolledStudents}
      centerCandidates={centerCandidates}
      pointHistories={points}
      homeworksList={homeworksList}
      tuitionCyclesList={tuitionCyclesList}
      todayStr={todayStr}
      actorName={user.fullName}
    />
  );
}
