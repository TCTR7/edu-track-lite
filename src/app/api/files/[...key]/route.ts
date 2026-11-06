import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLocalUploadRoot } from "@/lib/storage";

const MIME_BY_EXT: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { key } = await context.params;
  if (!key || key.length < 3) {
    return NextResponse.json({ error: "Đường dẫn không hợp lệ." }, { status: 400 });
  }

  const [folder, fileCenterId] = key;

  // Enforce tenant isolation + block ROLE_STUDENT from internal teaching materials
  if (user.role !== "OPERATOR" && user.centerId !== fileCenterId) {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }
  if (folder === "documents" && user.role === "STUDENT") {
    return NextResponse.json(
      { error: "Tài liệu nội bộ chỉ dành cho Giáo viên và Admin." },
      { status: 403 }
    );
  }

  const root = getLocalUploadRoot();
  const resolved = path.resolve(root, ...key);
  if (!resolved.startsWith(root)) {
    return NextResponse.json({ error: "Truy cập bị từ chối." }, { status: 403 });
  }

  try {
    const fileBuffer = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy tệp." }, { status: 404 });
  }
}
