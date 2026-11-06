"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon, Trash2, UploadCloud } from "lucide-react";
import {
  createHomeworkAction,
  deleteHomeworkAction,
} from "@/actions/homework-actions";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {
  compressImageInBrowser,
  uploadFileWithAdapter,
} from "@/lib/client/upload-helper";
import { formatDateTimeVn } from "@/lib/utils";
import type { HomeworkItem } from "./types";

interface SelectedPreview {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  previewUrl: string;
}

function formatKb(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function TabHomework({
  classId,
  homeworksList,
}: {
  classId: string;
  homeworksList: HomeworkItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [previews, setPreviews] = useState<SelectedPreview[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setErrorMsg(null);
    setIsCompressing(true);

    try {
      const nextItems: SelectedPreview[] = [];
      for (const rawFile of Array.from(fileList)) {
        const compressed = await compressImageInBrowser(rawFile);
        nextItems.push({
          file: compressed,
          originalBytes: rawFile.size,
          compressedBytes: compressed.size,
          previewUrl: URL.createObjectURL(compressed),
        });
      }
      setPreviews((prev) => [...prev, ...nextItems]);
    } catch {
      setErrorMsg("Không thể xử lý nén ảnh đã chọn.");
    } finally {
      setIsCompressing(false);
      e.target.value = "";
    }
  };

  const handlePublishHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề hoặc lời dặn dò BTVN.");
      return;
    }
    if (previews.length === 0) {
      setErrorMsg("Vui lòng chụp hoặc chọn ít nhất 1 ảnh BTVN.");
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const item of previews) {
        const uploaded = await uploadFileWithAdapter(item.file, "homeworks");
        uploadedUrls.push(uploaded.fileUrl);
      }

      const res = await createHomeworkAction({
        classId,
        title,
        imageUrls: uploadedUrls,
      });

      if (!res.ok) {
        setErrorMsg(res.error ?? "Không thể lưu bài tập về nhà.");
        return;
      }

      previews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPreviews([]);
      setTitle("");
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải ảnh lên."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Publish Homework Form */}
      <form
        onSubmit={handlePublishHomework}
        className="space-y-4 clay-card p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 text-slate-900">
          <Camera className="h-5 w-5 text-brand-700" />
          <h2 className="text-base font-bold">Đăng Bài tập về nhà mới</h2>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="clay-notice clay-notice-danger px-3.5 py-2.5 text-sm"
          >
            {errorMsg}
          </div>
        )}

        <div>
          <label
            htmlFor="hw-title"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Tiêu đề / Lời dặn dò cho học sinh *
          </label>
          <input
            id="hw-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: BTVN ngày 02/11 – Làm bài 1, 2, 3 trong ảnh"
            className="clay-input w-full rounded-xl border px-3.5 py-2.5"
          />
        </div>

        <div>
          <label
            htmlFor="hw-images"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Chụp bảng / Chọn ảnh BTVN (Tự động nén ~300KB) *
          </label>
          <input
            id="hw-images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="clay-input w-full rounded-xl border p-2 text-sm text-slate-600"
          />
        </div>

        {isCompressing && (
          <p className="text-xs font-medium text-brand-700">
            Đang tối ưu dung lượng ảnh trên trình duyệt...
          </p>
        )}

        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((item, idx) => (
              <div
                key={item.previewUrl}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={`Ảnh xem trước ${idx + 1}`}
                  className="h-28 w-full rounded-lg object-cover"
                />
                <p className="mt-1 truncate text-center text-xs font-medium text-slate-600">
                  {formatKb(item.originalBytes)} →{" "}
                  <span className="font-bold text-brand-700">
                    {formatKb(item.compressedBytes)}
                  </span>
                </p>
                <button
                  type="button"
                  aria-label="Bỏ ảnh này"
                  onClick={() => {
                    URL.revokeObjectURL(item.previewUrl);
                    setPreviews((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || isCompressing}
          className="btn-primary"
        >
          <UploadCloud className="h-4 w-4" />
          {isUploading ? "Đang tải ảnh & đăng BTVN..." : "Đăng BTVN ngay"}
        </button>
      </form>

      {/* Homework Feed */}
      {homeworksList.length === 0 ? (
        <div className="clay-card   p-8 text-center">
          <ImageIcon className="mx-auto h-11 w-11 text-slate-600" />
          <p className="mt-2 font-semibold text-slate-800">
            Chưa có bài tập về nhà nào trong ca học này
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {homeworksList.map((hw) => (
            <article
              key={hw.id}
              className="clay-card p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {hw.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Thực hiện bởi: {hw.createdByName} –{" "}
                    {formatDateTimeVn(hw.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isDeleting}
                  aria-label={`Xóa ${hw.title}`}
                  onClick={() => {
                    startDeleteTransition(async () => {
                      await deleteHomeworkAction({
                        homeworkId: hw.id,
                        classId,
                      });
                      router.refresh();
                    });
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {hw.imageUrls.map((url, idx) => (
                  <button
                    key={`${hw.id}-${idx}`}
                    type="button"
                    onClick={() => setZoomImageUrl(url)}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${hw.title} - Ảnh ${idx + 1}`}
                      loading="lazy"
                      className="h-40 w-full object-cover transition group-hover:scale-103"
                    />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Fullscreen Image Lightbox Dialog */}
      <ModalDialog
        open={Boolean(zoomImageUrl)}
        onClose={() => setZoomImageUrl(null)}
        title="Xem chi tiết ảnh BTVN"
        className="max-w-3xl"
      >
        {zoomImageUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImageUrl}
              alt="Ảnh BTVN phóng to"
              className="max-h-[72dvh] w-auto rounded-xl object-contain"
            />
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
