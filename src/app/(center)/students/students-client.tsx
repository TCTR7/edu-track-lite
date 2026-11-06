"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, Copy, KeyRound, Search, Users } from "lucide-react";
import { resetStudentPasswordAction } from "@/actions/student-actions";
import { formatCurrencyVnd, removeVietnameseTones } from "@/lib/utils";

export interface StudentDirectoryItem {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  unpaidTotal: number;
  classes: {
    classId: string;
    className: string;
    status: "ACTIVE" | "PAUSED" | "LEFT";
  }[];
}

export function StudentsDirectoryClient({
  students,
}: {
  students: StudentDirectoryItem[];
}) {
  const [query, setQuery] = useState("");
  const [isResetting, startTransition] = useTransition();
  const [resetResult, setResetResult] = useState<{
    fullName: string;
    username: string;
    plainPassword: string;
    zaloMessage: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = removeVietnameseTones(query).toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const nameNorm = removeVietnameseTones(s.fullName).toLowerCase();
      return (
        nameNorm.includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
      );
    });
  }, [query, students]);

  const copyMessage = async (msg: string) => {
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Danh bạ Học sinh</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Tìm nhanh học sinh ở mọi ca học, kiểm tra các môn đang học hoặc cấp
          lại mật khẩu gửi Zalo 1 chạm
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" />
        <input
          type="search"
          aria-label="Tìm học sinh theo tên hoặc username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Nhập tên học sinh không dấu hoặc username (VD: nguyen van nam)..."
          className="clay-input w-full rounded-2xl border py-3 pl-11 pr-4 text-sm"
        />
      </div>

      {resetResult && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                Đã cấp mật khẩu mới cho em {resetResult.fullName}
              </p>
              <p className="mt-1">
                Username:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {resetResult.username}
                </code>{" "}
                • Mật khẩu mới:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {resetResult.plainPassword}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyMessage(resetResult.zaloMessage)}
              className="btn-primary"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Đã copy gửi Zalo
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy tin nhắn Zalo
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="clay-card   p-8 text-center">
          <Users className="mx-auto h-11 w-11 text-slate-600" />
          <p className="mt-2 font-semibold text-slate-800">
            Không tìm thấy học sinh phù hợp
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="clay-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {s.fullName}
                    </h2>
                    {s.unpaidTotal > 0 && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                        Nợ phí: {formatCurrencyVnd(s.unpaidTotal)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Username:{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-medium text-slate-800">
                      {s.username}
                    </code>
                    {s.phone ? ` • SĐT PH: ${s.phone}` : ""}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {s.classes.map((c) => (
                      <Link
                        key={c.classId}
                        href={`/classes/${c.classId}`}
                        className={
                          c.status === "ACTIVE"
                            ? "rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                            : "rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        {c.className}
                        {c.status === "PAUSED"
                          ? " (Tạm nghỉ)"
                          : c.status === "LEFT"
                          ? " (Đã nghỉ)"
                          : ""}
                      </Link>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await resetStudentPasswordAction(s.id);
                      if (
                        res.ok &&
                        res.fullName &&
                        res.username &&
                        res.plainPassword &&
                        res.zaloMessage
                      ) {
                        setResetResult({
                          fullName: res.fullName,
                          username: res.username,
                          plainPassword: res.plainPassword,
                          zaloMessage: res.zaloMessage,
                        });
                        await copyMessage(res.zaloMessage);
                      }
                    });
                  }}
                  className="btn-soft"
                >
                  <KeyRound className="h-4 w-4 text-brand-700" />
                  Reset MK & Copy Zalo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
