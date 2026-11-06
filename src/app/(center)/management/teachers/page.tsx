import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { TeachersClient, type TeacherItem } from "./teachers-client";

export default async function TeachersManagementPage() {
  const admin = await requireAuth(["ADMIN"]);

  const teacherRows = await db
    .select()
    .from(users)
    .where(
      and(eq(users.centerId, admin.centerId!), eq(users.role, "TEACHER"))
    )
    .orderBy(desc(users.createdAt));

  const classCounts = await db
    .select({
      teacherId: classes.teacherId,
      count: sql<number>`count(*)::int`,
    })
    .from(classes)
    .where(
      and(eq(classes.centerId, admin.centerId!), eq(classes.status, "ACTIVE"))
    )
    .groupBy(classes.teacherId);

  const items: TeacherItem[] = teacherRows.map((t) => ({
    id: t.id,
    fullName: t.fullName,
    username: t.username,
    phone: t.phone,
    isActive: t.isActive,
    createdAt: t.createdAt,
    assignedClassCount:
      classCounts.find((c) => c.teacherId === t.id)?.count ?? 0,
  }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <TeachersClient
      teachers={items}
      centerName={admin.centerName ?? "Trung tâm"}
      appUrl={appUrl}
    />
  );
}
