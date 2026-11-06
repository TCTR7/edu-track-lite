import { NextResponse } from "next/server";
import { getCurrentUser, hasRoleAccess } from "@/lib/auth";
import {
  buildObjectKey,
  saveLocalUploadedFile,
  type StorageFolder,
} from "@/lib/storage";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB max for teaching materials

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.centerId || !hasRoleAccess(user.role, ["ADMIN", "TEACHER"])) {
    return NextResponse.json({ error: "Không có quyền tải tệp." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folderRaw = String(formData.get("folder") ?? "homeworks");
  const folder: StorageFolder =
    folderRaw === "documents" ? "documents" : "homeworks";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu tệp tải lên." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Tệp vượt quá dung lượng tối đa 25MB." },
      { status: 400 }
    );
  }

  const fileKey = buildObjectKey({
    folder,
    centerId: user.centerId,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  });

  const arrayBuffer = await file.arrayBuffer();
  const { fileUrl } = await saveLocalUploadedFile({
    fileKey,
    buffer: Buffer.from(arrayBuffer),
  });

  return NextResponse.json({
    fileKey,
    fileUrl,
    fileSize: file.size,
    fileType: file.type || "application/octet-stream",
  });
}
