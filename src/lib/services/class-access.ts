import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes } from "@/db/schema";
import { requireAuth, type AuthenticatedUser } from "@/lib/auth";

export async function requireClassAccess(classId: string): Promise<{
  user: AuthenticatedUser;
  classRow: typeof classes.$inferSelect;
}> {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  const [classRow] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.centerId, user.centerId!)))
    .limit(1);

  if (!classRow) {
    throw new Error("Không tìm thấy Ca học hoặc bạn không có quyền truy cập.");
  }

  if (user.role === "TEACHER" && classRow.teacherId !== user.id) {
    throw new Error("Bạn chỉ được phép thao tác trên Ca học được phân công.");
  }

  return { user, classRow };
}
