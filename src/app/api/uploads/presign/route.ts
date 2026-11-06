import { NextResponse } from "next/server";
import { getCurrentUser, hasRoleAccess } from "@/lib/auth";
import {
  buildObjectKey,
  createR2PresignedUpload,
  getStorageDriver,
  type StorageFolder,
} from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.centerId || !hasRoleAccess(user.role, ["ADMIN", "TEACHER"])) {
    return NextResponse.json({ error: "Không có quyền tải tệp." }, { status: 403 });
  }

  const body = (await request.json()) as {
    folder?: StorageFolder;
    fileName?: string;
    contentType?: string;
  };

  const folder: StorageFolder =
    body.folder === "documents" ? "documents" : "homeworks";
  const fileName = body.fileName || "upload.bin";
  const contentType = body.contentType || "application/octet-stream";

  const fileKey = buildObjectKey({
    folder,
    centerId: user.centerId,
    fileName,
    mimeType: contentType,
  });

  const driver = getStorageDriver();
  if (driver === "r2") {
    const { uploadUrl, publicFileUrl } = await createR2PresignedUpload({
      fileKey,
      contentType,
    });
    return NextResponse.json({
      mode: "r2",
      fileKey,
      uploadUrl,
      fileUrl: publicFileUrl,
    });
  }

  return NextResponse.json({
    mode: "local",
    fileKey,
    uploadUrl: "/api/uploads/local",
    fileUrl: `/api/files/${fileKey}`,
  });
}
