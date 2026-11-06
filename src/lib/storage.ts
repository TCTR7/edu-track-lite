import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StorageFolder = "homeworks" | "documents";

export function getStorageDriver(): "local" | "r2" {
  return process.env.STORAGE_DRIVER === "r2" ? "r2" : "local";
}

export function getLocalUploadRoot(): string {
  const configured = process.env.LOCAL_UPLOAD_DIR || "./uploads";
  return path.resolve(process.cwd(), configured);
}

export function sanitizeFileExtension(fileName: string, mimeType: string): string {
  const extFromName = path.extname(fileName).toLowerCase().replace(/[^.a-z0-9]/g, "");
  if (extFromName && extFromName.length <= 6) {
    return extFromName;
  }
  const map: Record<string, string> = {
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
  };
  return map[mimeType] ?? ".bin";
}

export function buildObjectKey(params: {
  folder: StorageFolder;
  centerId: string;
  fileName: string;
  mimeType: string;
}): string {
  const ext = sanitizeFileExtension(params.fileName, params.mimeType);
  const id = crypto.randomUUID();
  return `${params.folder}/${params.centerId}/${id}${ext}`;
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Thiếu cấu hình biến môi trường Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function createR2PresignedUpload(params: {
  fileKey: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicFileUrl: string }> {
  const bucket = process.env.R2_BUCKET_NAME || "edutrack-lite";
  const publicBase = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.fileKey,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicFileUrl = publicBase
    ? `${publicBase}/${params.fileKey}`
    : `/api/files/${params.fileKey}`;

  return { uploadUrl, publicFileUrl };
}

export async function saveLocalUploadedFile(params: {
  fileKey: string;
  buffer: Buffer;
}): Promise<{ fileUrl: string }> {
  const root = getLocalUploadRoot();
  const targetPath = path.resolve(root, params.fileKey);

  // Prevent path traversal
  if (!targetPath.startsWith(root)) {
    throw new Error("Đường dẫn tệp không hợp lệ.");
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, params.buffer);

  return {
    fileUrl: `/api/files/${params.fileKey}`,
  };
}

export async function deleteStoredObject(fileKey: string): Promise<void> {
  if (getStorageDriver() === "local") {
    const root = getLocalUploadRoot();
    const targetPath = path.resolve(root, fileKey);
    if (targetPath.startsWith(root)) {
      await fs.unlink(targetPath).catch(() => {});
    }
  }
}
