import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  classes,
  classStudents,
  tuitionCycles,
  tuitionRecords,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import {
  StudentsDirectoryClient,
  type StudentDirectoryItem,
} from "./students-client";

export default async function StudentsDirectoryPage() {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  const studentRows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      phone: users.phone,
    })
    .from(users)
    .where(and(eq(users.centerId, user.centerId!), eq(users.role, "STUDENT")))
    .orderBy(asc(users.fullName));

  const enrollments = await db
    .select({
      studentId: classStudents.studentId,
      classId: classes.id,
      className: classes.name,
      teacherId: classes.teacherId,
      status: classStudents.status,
    })
    .from(classStudents)
    .innerJoin(classes, eq(classStudents.classId, classes.id))
    .where(eq(classes.centerId, user.centerId!));

  const unpaidByStudent = await db
    .select({
      studentId: tuitionRecords.studentId,
      unpaidTotal: sql<number>`coalesce(sum(${tuitionRecords.finalAmount}), 0)::int`,
    })
    .from(tuitionRecords)
    .innerJoin(
      tuitionCycles,
      eq(tuitionRecords.tuitionCycleId, tuitionCycles.id)
    )
    .innerJoin(classes, eq(tuitionCycles.classId, classes.id))
    .where(
      and(
        eq(classes.centerId, user.centerId!),
        eq(tuitionRecords.isPaid, false)
      )
    )
    .groupBy(tuitionRecords.studentId);

  const visibleStudents =
    user.role === "ADMIN"
      ? studentRows
      : studentRows.filter((s) =>
          enrollments.some(
            (e) => e.studentId === s.id && e.teacherId === user.id
          )
        );

  const items: StudentDirectoryItem[] = visibleStudents.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    username: s.username,
    phone: s.phone,
    unpaidTotal:
      unpaidByStudent.find((u) => u.studentId === s.id)?.unpaidTotal ?? 0,
    classes: enrollments
      .filter((e) =>
        user.role === "ADMIN"
          ? e.studentId === s.id
          : e.studentId === s.id && e.teacherId === user.id
      )
      .map((e) => ({
        classId: e.classId,
        className: e.className,
        status: e.status,
      })),
  }));

  return <StudentsDirectoryClient students={items} />;
}
