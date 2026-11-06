import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { centers, classes, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import {
  OperatorCentersClient,
  type OperatorCenterSummary,
} from "./operator-centers-client";

export default async function OperatorCentersPage() {
  await requireAuth(["OPERATOR"]);

  const allCenters = await db
    .select()
    .from(centers)
    .orderBy(desc(centers.createdAt));

  const classCounts = await db
    .select({
      centerId: classes.centerId,
      count: sql<number>`count(*)::int`,
    })
    .from(classes)
    .groupBy(classes.centerId);

  const studentCounts = await db
    .select({
      centerId: users.centerId,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(eq(users.role, "STUDENT"))
    .groupBy(users.centerId);

  const admins = await db
    .select({
      id: users.id,
      centerId: users.centerId,
      fullName: users.fullName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.role, "ADMIN"));

  const summaries: OperatorCenterSummary[] = allCenters.map((c) => {
    const admin = admins.find((a) => a.centerId === c.id) ?? null;
    const classCount =
      classCounts.find((x) => x.centerId === c.id)?.count ?? 0;
    const studentCount =
      studentCounts.find((x) => x.centerId === c.id)?.count ?? 0;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      isActive: c.isActive,
      createdAt: c.createdAt,
      adminUser: admin
        ? {
            id: admin.id,
            fullName: admin.fullName,
            username: admin.username,
          }
        : null,
      classCount,
      studentCount,
    };
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return <OperatorCentersClient centersList={summaries} appUrl={appUrl} />;
}
