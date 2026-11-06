import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, classes, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { formatAuditLogEntry } from "@/lib/services/audit-formatter";
import { AuditLogsClient, type AuditLogViewItem } from "./audit-logs-client";

export default async function AuditLogsPage() {
  const admin = await requireAuth(["ADMIN"]);

  const [rawLogs, centerUsers, centerClasses] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.centerId, admin.centerId!))
      .orderBy(desc(auditLogs.createdAt))
      .limit(150),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.centerId, admin.centerId!)),
    db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(eq(classes.centerId, admin.centerId!)),
  ]);

  const userMap = new Map(centerUsers.map((u) => [u.id, u]));
  const classMap = new Map(centerClasses.map((c) => [c.id, c.name]));

  const logsList: AuditLogViewItem[] = rawLogs.map((row) => {
    const formatted = formatAuditLogEntry(row.actionType, row.detailsJson);
    const actor = userMap.get(row.actorUserId);
    const targetStudent = row.targetStudentId
      ? userMap.get(row.targetStudentId)
      : null;
    const className = row.classId ? classMap.get(row.classId) ?? null : null;

    return {
      id: row.id,
      actionType: row.actionType,
      category: formatted.category,
      label: formatted.label,
      badgeTone: formatted.badgeTone,
      summary: formatted.summary,
      actorName: actor?.fullName ?? "Hệ thống",
      targetStudentName: targetStudent?.fullName ?? null,
      classId: row.classId ?? null,
      className,
      createdAtIso: row.createdAt.toISOString(),
    };
  });

  return (
    <AuditLogsClient logsList={logsList} classesList={centerClasses} />
  );
}
