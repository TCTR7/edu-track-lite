"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Search,
  User,
} from "lucide-react";
import type { AuditCategory } from "@/lib/services/audit-formatter";
import { cn, formatDateTimeVn, removeVietnameseTones } from "@/lib/utils";

export interface AuditLogViewItem {
  id: string;
  actionType: string;
  category: AuditCategory;
  label: string;
  badgeTone: "mint" | "pink" | "butter" | "lavender" | "sky";
  summary: string;
  actorName: string;
  targetStudentName: string | null;
  classId: string | null;
  className: string | null;
  createdAtIso: string;
}

const CATEGORY_FILTERS: { id: "ALL" | AuditCategory; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "TUITION", label: "Học phí" },
  { id: "ATTENDANCE", label: "Điểm danh" },
  { id: "ACADEMIC", label: "Điểm & Nhận xét" },
  { id: "ACCOUNT", label: "Tài khoản" },
];

const BADGE_CLASSES: Record<AuditLogViewItem["badgeTone"], string> = {
  mint: "bg-emerald-100 text-emerald-800",
  pink: "bg-red-100 text-red-700",
  butter: "bg-amber-100 text-amber-900",
  lavender: "bg-brand-100 text-brand-800",
  sky: "bg-sky-100 text-sky-800",
};

export function AuditLogsClient({
  logsList,
  classesList,
}: {
  logsList: AuditLogViewItem[];
  classesList: { id: string; name: string }[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | AuditCategory
  >("ALL");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = useMemo(() => {
    const q = removeVietnameseTones(searchQuery).toLowerCase();
    return logsList.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedClassId !== "ALL" && item.classId !== selectedClassId) {
        return false;
      }
      if (!q) return true;
      const haystack = removeVietnameseTones(
        [
          item.label,
          item.summary,
          item.actorName,
          item.targetStudentName ?? "",
          item.className ?? "",
        ].join(" ")
      ).toLowerCase();
      return haystack.includes(q);
    });
  }, [logsList, selectedCategory, selectedClassId, searchQuery]);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/management"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Quay lại Quản trị Trung tâm
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-950">
          Nhật ký hoạt động (Audit Log)
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Lưu vết minh bạch toàn bộ thao tác thu/hủy học phí, điểm danh, cộng
          điểm và ghi chú của giáo viên & quản trị viên.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="clay-card space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "clay-filter rounded-full px-3.5 py-2 text-xs font-extrabold transition",
                  active
                    ? "clay-filter-active"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-12">
          <div className="relative sm:col-span-7">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên người thực hiện, tên học sinh hoặc nội dung..."
              aria-label="Tìm kiếm nhật ký hoạt động"
              className="clay-input w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm"
            />
          </div>

          <div className="sm:col-span-5">
            <select
              aria-label="Lọc nhật ký theo Ca học"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium"
            >
              <option value="ALL">Tất cả Ca học</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Items */}
      {filteredLogs.length === 0 ? (
        <div className="clay-card p-8 text-center">
          <ClipboardList className="mx-auto h-11 w-11 text-slate-600" />
          <p className="mt-2 font-bold text-slate-800">
            Không có bản ghi nhật ký nào khớp bộ lọc
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              data-testid="audit-log-item"
              className="clay-card p-4 text-sm transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-extrabold",
                      BADGE_CLASSES[log.badgeTone]
                    )}
                  >
                    {log.label}
                  </span>

                  {log.className && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      <BookOpen className="h-3 w-3 text-brand-700" />
                      {log.className}
                    </span>
                  )}

                  {log.targetStudentName && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-900">
                      <User className="h-3 w-3 text-brand-700" />
                      HS: {log.targetStudentName}
                    </span>
                  )}
                </div>

                <span className="text-xs font-semibold text-slate-600">
                  Thực hiện bởi:{" "}
                  <strong className="text-slate-800">{log.actorName}</strong> –{" "}
                  {formatDateTimeVn(log.createdAtIso)}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-700">{log.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
