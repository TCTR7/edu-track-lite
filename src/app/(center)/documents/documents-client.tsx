"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createDocumentAction,
  deleteDocumentAction,
} from "@/actions/document-actions";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {
  compressImageInBrowser,
  uploadFileWithAdapter,
} from "@/lib/client/upload-helper";
import { cn, formatDateTimeVn, removeVietnameseTones } from "@/lib/utils";

export interface DocumentViewItem {
  id: string;
  title: string;
  gradeLevel: string;
  fileUrl: string;
  fileKey: string;
  fileType: string;
  fileSize: number;
  uploadedByUserId: string;
  uploadedByName: string;
  createdAtIso: string;
  canDelete: boolean;
}

const GRADE_FILTERS = [
  { id: "ALL", label: "Tất cả" },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    label: `Lớp ${i + 1}`,
  })),
  { id: "OTHER", label: "Tài liệu khác" },
];

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDocumentTypeBadge(fileType: string, fileUrl: string): {
  label: string;
  toneClass: string;
} {
  const lower = `${fileType} ${fileUrl}`.toLowerCase();
  if (lower.includes("pdf")) {
    return { label: "PDF", toneClass: "bg-red-100 text-red-700" };
  }
  if (lower.includes("word") || lower.includes(".doc")) {
    return { label: "WORD", toneClass: "bg-sky-100 text-sky-800" };
  }
  if (
    lower.includes("sheet") ||
    lower.includes("excel") ||
    lower.includes(".xls")
  ) {
    return { label: "EXCEL", toneClass: "bg-emerald-100 text-emerald-800" };
  }
  if (lower.includes("presentation") || lower.includes(".ppt")) {
    return { label: "PPT", toneClass: "bg-amber-100 text-amber-900" };
  }
  if (lower.includes("image/") || /\.(png|jpe?g|webp)$/i.test(lower)) {
    return { label: "ẢNH", toneClass: "bg-brand-100 text-brand-800" };
  }
  return { label: "TỆP", toneClass: "bg-slate-100 text-slate-700" };
}

export function DocumentsClient({
  documentsList,
}: {
  documentsList: DocumentViewItem[];
}) {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const [docTitle, setDocTitle] = useState("");
  const [docGrade, setDocGrade] = useState("4");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isMutating, startTransition] = useTransition();

  const filteredDocs = useMemo(() => {
    const q = removeVietnameseTones(searchQuery).toLowerCase();
    return documentsList.filter((doc) => {
      if (selectedGrade !== "ALL" && doc.gradeLevel !== selectedGrade) {
        return false;
      }
      if (!q) return true;
      const haystack = removeVietnameseTones(
        `${doc.title} ${doc.uploadedByName} ${doc.fileType}`
      ).toLowerCase();
      return haystack.includes(q);
    });
  }, [documentsList, selectedGrade, searchQuery]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (!docTitle.trim()) {
      setErrorMsg("Vui lòng nhập tên tài liệu.");
      return;
    }
    if (!selectedFile) {
      setErrorMsg("Vui lòng chọn tệp tài liệu cần tải lên.");
      return;
    }

    try {
      setIsUploading(true);
      const processedFile = selectedFile.type.startsWith("image/")
        ? await compressImageInBrowser(selectedFile)
        : selectedFile;

      const uploaded = await uploadFileWithAdapter(processedFile, "documents");
      const res = await createDocumentAction({
        title: docTitle,
        gradeLevel: docGrade,
        fileUrl: uploaded.fileUrl,
        fileKey: uploaded.fileKey,
        fileType: uploaded.fileType,
        fileSize: uploaded.fileSize,
      });

      if (!res.ok) {
        setErrorMsg(res.error ?? "Không thể lưu tài liệu.");
        return;
      }

      setUploadOpen(false);
      setDocTitle("");
      setSelectedFile(null);
      setStatusMsg(`Đã tải lên tài liệu "${docTitle}" thành công.`);
      router.refresh();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Tải tệp lên không thành công."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-950">
            Kho Tài liệu Dạy học ({documentsList.length})
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Lưu trữ giáo án, đề cương, phiếu bài tập phân loại theo Khối lớp 1–12
            với tìm kiếm không dấu tức thời.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setUploadOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Tải Tài liệu lên
        </button>
      </div>

      {statusMsg && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          {statusMsg}
        </div>
      )}

      {errorMsg && !uploadOpen && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {/* Search & Grade Filter Bar */}
      <div className="clay-card space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Gõ tên tài liệu, chuyên đề hoặc tên giáo viên (hỗ trợ gõ không dấu)..."
            aria-label="Tìm kiếm tài liệu"
            className="clay-input w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {GRADE_FILTERS.map((g) => {
            const active = selectedGrade === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGrade(g.id)}
                aria-pressed={active}
                className={cn(
                  "clay-filter rounded-full px-3 py-2 text-xs font-extrabold transition",
                  active
                    ? "clay-filter-active"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="clay-card p-8 text-center">
          <FolderOpen className="mx-auto h-11 w-11 text-brand-700" />
          <p className="mt-2 font-bold text-slate-800">
            Chưa có tài liệu nào khớp bộ lọc
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Bấm &ldquo;Tải Tài liệu lên&rdquo; ở góc trên để lưu trữ đề cương,
            phiếu bài tập PDF/Word/Ảnh.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredDocs.map((doc) => {
            const badge = getDocumentTypeBadge(doc.fileType, doc.fileUrl);
            const isImg = badge.label === "ẢNH";
            const isSheet = badge.label === "EXCEL";

            return (
              <div
                key={doc.id}
                data-testid="document-card"
                className="clay-card flex flex-col justify-between gap-3 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="icon-chip shrink-0 bg-icon-lavender">
                    {isImg ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : isSheet ? (
                      <FileSpreadsheet className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-extrabold",
                          badge.toneClass
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {doc.gradeLevel === "OTHER"
                          ? "Tài liệu khác"
                          : `Khối Lớp ${doc.gradeLevel}`}
                      </span>
                      <span className="text-xs text-slate-600">
                        {formatFileSize(doc.fileSize)}
                      </span>
                    </div>

                    <h2 className="mt-1.5 line-clamp-2 text-base font-extrabold text-slate-900">
                      {doc.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      Thực hiện bởi: {doc.uploadedByName} –{" "}
                      {formatDateTimeVn(doc.createdAtIso)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn-primary"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tải về / Mở xem
                  </a>

                  {doc.canDelete && (
                    <button
                      type="button"
                      disabled={isMutating}
                      aria-label={`Xóa tài liệu ${doc.title}`}
                      onClick={() => {
                        startTransition(async () => {
                          const res = await deleteDocumentAction(doc.id);
                          if (res.ok) {
                            setStatusMsg(`Đã xóa tài liệu "${doc.title}".`);
                            router.refresh();
                          } else {
                            setErrorMsg(res.error ?? "Không thể xóa tài liệu.");
                          }
                        });
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      <ModalDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Tải Tài liệu Dạy học lên Kho"
        description="Hỗ trợ tệp PDF, Word, Excel, PowerPoint hoặc ảnh chụp phiếu bài tập."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <div>
            <label
              htmlFor="doc-title-input"
              className="mb-1 block text-sm font-bold text-slate-700"
            >
              Tên tài liệu / Đề cương *
            </label>
            <input
              id="doc-title-input"
              type="text"
              required
              autoFocus
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="VD: Đề cương Ôn tập Học kỳ 1 Toán Lớp 4"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="doc-grade-select"
              className="mb-1 block text-sm font-bold text-slate-700"
            >
              Phân loại Khối lớp
            </label>
            <select
              id="doc-grade-select"
              value={docGrade}
              onChange={(e) => setDocGrade(e.target.value)}
              className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium"
            >
              {GRADE_FILTERS.filter((g) => g.id !== "ALL").map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="doc-file-input"
              className="mb-1 block text-sm font-bold text-slate-700"
            >
              Chọn tệp từ thiết bị *
            </label>
            <input
              id="doc-file-input"
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,.txt"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="clay-input w-full rounded-xl border border-dashed border-brand-300 p-3 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="btn-soft"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="btn-primary"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Đang tải lên..." : "Lưu vào Kho Tài liệu"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
