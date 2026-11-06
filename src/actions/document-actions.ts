"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { deleteStoredObject } from "@/lib/storage";

export async function createDocumentAction(params: {
  title: string;
  gradeLevel: string;
  fileUrl: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAuth(["ADMIN", "TEACHER"]);
    const title = params.title.trim();

    if (!title) {
      return { ok: false, error: "Vui lòng nhập tên tài liệu." };
    }
    if (!params.fileUrl || !params.fileKey) {
      return { ok: false, error: "Vui lòng chọn tệp tài liệu tải lên." };
    }

    await db.insert(documents).values({
      centerId: user.centerId!,
      gradeLevel: params.gradeLevel || "OTHER",
      title,
      fileUrl: params.fileUrl,
      fileKey: params.fileKey,
      fileType: params.fileType || "application/octet-stream",
      fileSize: Math.max(0, Math.round(params.fileSize || 0)),
      uploadedByUserId: user.id,
    });

    revalidatePath("/documents");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể lưu tài liệu mới.",
    };
  }
}

export async function deleteDocumentAction(
  documentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAuth(["ADMIN", "TEACHER"]);

    const [doc] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.centerId, user.centerId!)
        )
      )
      .limit(1);

    if (!doc) {
      return { ok: false, error: "Không tìm thấy tài liệu." };
    }

    if (user.role === "TEACHER" && doc.uploadedByUserId !== user.id) {
      return {
        ok: false,
        error: "Giáo viên chỉ được xóa tài liệu do chính mình tải lên.",
      };
    }

    await db.delete(documents).where(eq(documents.id, doc.id));
    await deleteStoredObject(doc.fileKey).catch(() => {});

    revalidatePath("/documents");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể xóa tài liệu.",
    };
  }
}
