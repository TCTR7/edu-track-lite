import { db, type DbClient } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditActionType = (typeof auditLogs.$inferInsert)["actionType"];

export async function recordAuditLog(
  params: {
    centerId: string;
    actorUserId: string;
    actionType: AuditActionType;
    targetStudentId?: string | null;
    classId?: string | null;
    details: Record<string, unknown>;
  },
  tx: DbClient = db
): Promise<void> {
  await tx.insert(auditLogs).values({
    centerId: params.centerId,
    actorUserId: params.actorUserId,
    actionType: params.actionType,
    targetStudentId: params.targetStudentId ?? null,
    classId: params.classId ?? null,
    detailsJson: params.details,
  });
}
