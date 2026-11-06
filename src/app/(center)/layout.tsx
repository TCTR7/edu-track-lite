import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, tuitionCycles, tuitionRecords } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { CenterShell } from "@/components/layout/center-shell";

export default async function CenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  let unpaidCount = 0;
  if (user.centerId) {
    const conditions = [
      eq(classes.centerId, user.centerId),
      eq(tuitionRecords.isPaid, false),
    ];
    if (user.role === "TEACHER") {
      conditions.push(eq(classes.teacherId, user.id));
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tuitionRecords)
      .innerJoin(
        tuitionCycles,
        eq(tuitionRecords.tuitionCycleId, tuitionCycles.id)
      )
      .innerJoin(classes, eq(tuitionCycles.classId, classes.id))
      .where(and(...conditions));

    unpaidCount = row?.count ?? 0;
  }

  return (
    <CenterShell
      centerName={user.centerName ?? "Trung tâm"}
      fullName={user.fullName}
      role={user.role}
      unpaidCount={unpaidCount}
    >
      {children}
    </CenterShell>
  );
}
