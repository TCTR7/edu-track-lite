import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { DocumentsClient, type DocumentViewItem } from "./documents-client";

export default async function DocumentsPage() {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  const [docRows, centerUsers] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(eq(documents.centerId, user.centerId!))
      .orderBy(desc(documents.createdAt)),
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.centerId, user.centerId!)),
  ]);

  const userMap = new Map(centerUsers.map((u) => [u.id, u.fullName]));

  const items: DocumentViewItem[] = docRows.map((d) => ({
    id: d.id,
    title: d.title,
    gradeLevel: d.gradeLevel,
    fileUrl: d.fileUrl,
    fileKey: d.fileKey,
    fileType: d.fileType,
    fileSize: d.fileSize,
    uploadedByUserId: d.uploadedByUserId,
    uploadedByName: userMap.get(d.uploadedByUserId) ?? "Giáo viên",
    createdAtIso: d.createdAt.toISOString(),
    canDelete: user.role === "ADMIN" || d.uploadedByUserId === user.id,
  }));

  return <DocumentsClient documentsList={items} />;
}
