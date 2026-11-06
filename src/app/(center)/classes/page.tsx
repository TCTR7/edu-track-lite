import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  centers,
  classes,
  classStudents,
  tuitionCycles,
  tuitionRecords,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { isClassInSessionNow } from "@/lib/utils/schedule";
import {
  ClassesClient,
  type AssignableTeacher,
  type ClassCardItem,
} from "./classes-client";

export default async function ClassesHomePage() {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  const [center] = await db
    .select({ roundingUnit: centers.roundingUnit })
    .from(centers)
    .where(eq(centers.id, user.centerId!))
    .limit(1);

  const conditions = [
    eq(classes.centerId, user.centerId!),
    eq(classes.status, "ACTIVE"),
  ];
  if (user.role === "TEACHER") {
    conditions.push(eq(classes.teacherId, user.id));
  }

  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      gradeLevel: classes.gradeLevel,
      teacherId: classes.teacherId,
      scheduleJson: classes.scheduleJson,
      tuitionPerCycle: classes.tuitionPerCycle,
      sessionsPerCycle: classes.sessionsPerCycle,
      deductionPerSession: classes.deductionPerSession,
      currentCycleNumber: classes.currentCycleNumber,
      currentSessionCount: classes.currentSessionCount,
      teacherName: users.fullName,
    })
    .from(classes)
    .innerJoin(users, eq(classes.teacherId, users.id))
    .where(and(...conditions));

  const studentCounts = await db
    .select({
      classId: classStudents.classId,
      count: sql<number>`count(*)::int`,
    })
    .from(classStudents)
    .where(eq(classStudents.status, "ACTIVE"))
    .groupBy(classStudents.classId);

  const unpaidCounts = await db
    .select({
      classId: tuitionCycles.classId,
      count: sql<number>`count(*)::int`,
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
    .groupBy(tuitionCycles.classId);

  const staffRows =
    user.role === "ADMIN"
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            role: users.role,
          })
          .from(users)
          .where(
            and(
              eq(users.centerId, user.centerId!),
              eq(users.isActive, true),
              inArray(users.role, ["ADMIN", "TEACHER"])
            )
          )
      : [];

  const now = new Date();
  const todayDayOfWeek = now.getDay();

  const items: ClassCardItem[] = rows
    .map((c) => ({
      ...c,
      activeStudentCount:
        studentCounts.find((s) => s.classId === c.id)?.count ?? 0,
      unpaidBillCount:
        unpaidCounts.find((u) => u.classId === c.id)?.count ?? 0,
      inSession: isClassInSessionNow(c.scheduleJson, now),
      scheduledToday: c.scheduleJson.some(
        (slot) => slot.dayOfWeek === todayDayOfWeek
      ),
    }))
    .sort((a, b) => {
      if (a.inSession !== b.inSession) return Number(b.inSession) - Number(a.inSession);
      if (a.scheduledToday !== b.scheduledToday)
        return Number(b.scheduledToday) - Number(a.scheduledToday);
      return a.name.localeCompare(b.name, "vi");
    });

  const teachers: AssignableTeacher[] = staffRows.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    role: s.role,
  }));

  return (
    <ClassesClient
      classesList={items}
      teachers={teachers}
      isAdmin={user.role === "ADMIN"}
      currentUserId={user.id}
      roundingUnit={center?.roundingUnit ?? 1000}
      greeting={getGreeting(now)}
      userShortName={user.fullName.trim().split(/\s+/).slice(-2).join(" ")}
    />
  );
}

function getGreeting(now: Date): { text: string; emoji: string } {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
  if (hour < 11) return { text: "Chào buổi sáng", emoji: "☀️" };
  if (hour < 14) return { text: "Chào buổi trưa", emoji: "🌤️" };
  if (hour < 18) return { text: "Chào buổi chiều", emoji: "🌼" };
  return { text: "Chào buổi tối", emoji: "🌙" };
}
