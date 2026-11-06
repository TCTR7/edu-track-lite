"use client";

export interface UploadedAsset {
  fileKey: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

/**
 * Compresses an image in the browser using HTMLCanvasElement down to ~300KB WebP/JPEG
 * while keeping handwriting/whiteboard text crisp (max dimension 1600px).
 */
export async function compressImageInBrowser(
  file: File,
  targetMaxBytes = 320 * 1024
): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= targetMaxBytes) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  let { width, height } = bitmap;

  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const qualities = [0.82, 0.7, 0.58, 0.48];
  let bestBlob: Blob | null = null;

  for (const q of qualities) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", q)
    );
    if (!blob) continue;
    bestBlob = blob;
    if (blob.size <= targetMaxBytes) break;
  }

  if (!bestBlob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([bestBlob], `${baseName}.webp`, {
    type: bestBlob.type || "image/webp",
  });
}

export async function uploadFileWithAdapter(
  file: File,
  folder: "homeworks" | "documents"
): Promise<UploadedAsset> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });

  if (!presignRes.ok) {
    const err = (await presignRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(err.error || "Không thể khởi tạo phiên tải tệp.");
  }

  const presignData = (await presignRes.json()) as {
    mode: "local" | "r2";
    fileKey: string;
    uploadUrl: string;
    fileUrl: string;
  };

  if (presignData.mode === "r2") {
    const putRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error("Tải tệp lên Cloudflare R2 thất bại.");
    }
    return {
      fileKey: presignData.fileKey,
      fileUrl: presignData.fileUrl,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
    };
  }

  // Local dev mode
  const formData = new FormData();
  formData.set("file", file);
  formData.set("folder", folder);

  const localRes = await fetch("/api/uploads/local", {
    method: "POST",
    body: formData,
  });

  if (!localRes.ok) {
    const err = (await localRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(err.error || "Lưu tệp cục bộ thất bại.");
  }

  return (await localRes.json()) as UploadedAsset;
}
