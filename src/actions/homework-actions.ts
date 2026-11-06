"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { homeworks } from "@/db/schema";
import { requireClassAccess } from "@/lib/services/class-access";

export async function createHomeworkAction(params: {
  classId: string;
  title: string;
  imageUrls: string[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { user } = await requireClassAccess(params.classId);
    const title = params.title.trim();

    if (!title) {
      return { ok: false, error: "Vui lòng nhập tiêu đề hoặc lời dặn dò BTVN." };
    }
    if (!params.imageUrls || params.imageUrls.length === 0) {
      return { ok: false, error: "Vui lòng chọn ít nhất 1 ảnh bài tập về nhà." };
    }

    await db.insert(homeworks).values({
      classId: params.classId,
      title,
      imageUrlsJson: params.imageUrls,
      createdByUserId: user.id,
    });

    revalidatePath(`/classes/${params.classId}`);
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể đăng BTVN.",
    };
  }
}

export async function deleteHomeworkAction(params: {
  homeworkId: string;
  classId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireClassAccess(params.classId);

    await db
      .delete(homeworks)
      .where(
        and(
          eq(homeworks.id, params.homeworkId),
          eq(homeworks.classId, params.classId)
        )
      );

    revalidatePath(`/classes/${params.classId}`);
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không thể xóa BTVN.",
    };
  }
}
