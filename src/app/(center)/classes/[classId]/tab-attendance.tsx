"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  CalendarCheck2,
  CheckCircle2,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  addBonusPointAction,
  startAttendanceSessionAction,
  updateAttendanceStatusAction,
} from "@/actions/attendance-actions";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { cn, formatDateTimeVn } from "@/lib/utils";
import type {
  AttendanceRecordItem,
  ClassDetailInfo,
  SessionWithRecords,
} from "./types";

const STATUS_BUTTONS: {
  value: AttendanceRecordItem["status"];
  label: string;
  activeClass: string;
}[] = [
  {
    value: "PRESENT",
    label: "Có mặt",
    activeClass: "attendance-present",
  },
  {
    value: "ABSENT_EXCUSED",
    label: "Có phép (-phí)",
    activeClass: "attendance-excused",
  },
  {
    value: "ABSENT_UNEXCUSED",
    label: "Vắng tự ý",
    activeClass: "attendance-absent",
  },
];

export function TabAttendance({
  classInfo,
  sessions,
  todayStr,
  activeStudentCount,
  actorName,
}: {
  classInfo: ClassDetailInfo;
  sessions: SessionWithRecords[];
  todayStr: string;
  activeStudentCount: number;
  actorName: string;
}) {
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id ?? ""
  );
  const [isPendingSession, startSessionTransition] = useTransition();
  const [, startRecordTransition] = useTransition();
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmSecondOpen, setConfirmSecondOpen] = useState(false);

  // Custom Bonus Modal state
  const [bonusTarget, setBonusTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const [bonusDelta, setBonusDelta] = useState(2);
  const [bonusReason, setBonusReason] = useState("");

  const currentSession =
    sessions.find((s) => s.id === selectedSessionId) ?? sessions[0] ?? null;

  const hasTodaySession = sessions.some((s) => s.sessionDate === todayStr);

  const [optimisticRecords, applyOptimistic] = useOptimistic(
    currentSession?.records ?? [],
    (
      state: AttendanceRecordItem[],
      action:
        | {
            type: "status";
            recordId: string;
            nextStatus: AttendanceRecordItem["status"];
          }
        | { type: "bonus"; studentId: string; delta: number }
    ) => {
      if (action.type === "status") {
        return state.map((r) =>
          r.id === action.recordId
            ? {
                ...r,
                status: action.nextStatus,
                updatedByName: actorName,
                updatedAt: new Date().toISOString(),
              }
            : r
        );
      }
      return state.map((r) =>
        r.studentId === action.studentId
          ? {
              ...r,
              totalBonusPoints: Math.max(0, r.totalBonusPoints + action.delta),
            }
          : r
      );
    }
  );

  const handleStartTodaySession = (forceSecond = false) => {
    setErrorMsg(null);
    setBannerMsg(null);
    startSessionTransition(async () => {
      const res = await startAttendanceSessionAction({
        classId: classInfo.id,
        sessionDate: todayStr,
        forceSecondSessionToday: forceSecond,
      });
      setConfirmSecondOpen(false);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Không thể mở buổi điểm danh.");
        return;
      }
      if (res.sessionId) {
        setSelectedSessionId(res.sessionId);
      }
      if (res.alreadyExistedToday) {
        setBannerMsg("Đã mở lại buổi điểm danh hôm nay.");
      } else if (res.cycleClosed) {
        setBannerMsg(
          `Đã hoàn tất buổi cuối của Kỳ ${res.closedCycleNumber}! Hệ thống đã tự động lập bảng thu học phí Kỳ ${res.closedCycleNumber} và mở sẵn chu kỳ kế tiếp.`
        );
      } else {
        setBannerMsg(
          "Đã khởi tạo buổi học mới – Mặc định 100% học sinh Có mặt."
        );
      }
      router.refresh();
    });
  };

  const handleStatusTap = (
    recordId: string,
    nextStatus: AttendanceRecordItem["status"]
  ) => {
    startRecordTransition(async () => {
      applyOptimistic({ type: "status", recordId, nextStatus });
      const res = await updateAttendanceStatusAction({ recordId, nextStatus });
      if (!res.ok) {
        setErrorMsg(res.error ?? "Lỗi cập nhật điểm danh.");
      }
    });
  };

  const handleQuickPlusOne = (studentId: string) => {
    startRecordTransition(async () => {
      applyOptimistic({ type: "bonus", studentId, delta: 1 });
      const res = await addBonusPointAction({
        classId: classInfo.id,
        studentId,
        delta: 1,
      });
      if (!res.ok) {
        setErrorMsg(res.error ?? "Lỗi cộng điểm.");
      }
    });
  };

  const handleCustomBonusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusTarget) return;
    const target = bonusTarget;
    const delta = bonusDelta;
    const reason = bonusReason;
    setBonusTarget(null);
    setBonusReason("");

    startRecordTransition(async () => {
      applyOptimistic({ type: "bonus", studentId: target.studentId, delta });
      const res = await addBonusPointAction({
        classId: classInfo.id,
        studentId: target.studentId,
        delta,
        reason,
      });
      if (!res.ok) {
        setErrorMsg(res.error ?? "Lỗi cộng điểm.");
      }
    });
  };

  const presentCount = optimisticRecords.filter(
    (r) => r.status === "PRESENT"
  ).length;
  const excusedCount = optimisticRecords.filter(
    (r) => r.status === "ABSENT_EXCUSED"
  ).length;
  const unexcusedCount = optimisticRecords.filter(
    (r) => r.status === "ABSENT_UNEXCUSED"
  ).length;

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div
          role="alert"
          className="clay-notice clay-notice-danger px-4 py-3 text-sm font-medium"
        >
          {errorMsg}
        </div>
      )}

      {bannerMsg && (
        <div
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900"
        >
          {bannerMsg}
        </div>
      )}

      {/* Top Action & Session Selector Card */}
      <div className="clay-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!hasTodaySession ? (
            <button
              type="button"
              disabled={isPendingSession || activeStudentCount === 0}
              onClick={() => handleStartTodaySession(false)}
              className="btn-success w-full sm:w-auto"
            >
              <CalendarCheck2 className="h-5 w-5" />
              {isPendingSession
                ? "Đang khởi tạo buổi học..."
                : `Bắt đầu Điểm danh hôm nay (Kỳ ${classInfo.currentCycleNumber} • Buổi ${
                    classInfo.currentSessionCount + 1
                  }/${classInfo.sessionsPerCycle})`}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Đã mở điểm danh hôm nay ({todayStr})
              </span>
              <button
                type="button"
                onClick={() => setConfirmSecondOpen(true)}
                className="btn-soft"
              >
                <Plus className="h-3.5 w-3.5" />
                Dạy bù ca 2 hôm nay
              </button>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label
                htmlFor="session-picker"
                className="shrink-0 text-xs font-semibold text-slate-600"
              >
                Xem buổi:
              </label>
              <select
                id="session-picker"
                value={currentSession?.id ?? ""}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="clay-input w-full rounded-xl border px-3 py-2 text-sm font-medium sm:w-auto"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    Ngày {s.sessionDate} – Kỳ {s.cycleNumber} (Buổi{" "}
                    {s.sessionNumberInCycle}/{classInfo.sessionsPerCycle})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {activeStudentCount === 0 && (
          <p className="mt-3 text-xs font-medium text-amber-700">
            Ca học hiện chưa có học sinh. Hãy chuyển sang tab{" "}
            <strong>Học sinh trong ca</strong> để thêm học sinh trước khi điểm
            danh.
          </p>
        )}
      </div>

      {/* Attendance List */}
      {currentSession ? (
        <div className="space-y-3">
          {/* Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700">
            <div className="flex flex-wrap gap-3">
              <span className="text-emerald-700">
                Có mặt: {presentCount}
              </span>
              <span className="text-amber-700">
                Có phép (-phí): {excusedCount}
              </span>
              <span className="text-red-700">
                Vắng tự ý: {unexcusedCount}
              </span>
            </div>
            <span className="text-slate-600">
              Khởi tạo bởi: {currentSession.createdByName}
            </span>
          </div>

          <div className="space-y-2.5">
            {optimisticRecords.map((rec, index) => (
              <div
                key={rec.id}
                className={cn(
                  "clay-card p-3.5 transition sm:p-4",
                  rec.status === "PRESENT"
                    ? "border-slate-200"
                    : rec.status === "ABSENT_EXCUSED"
                    ? "border-amber-300 bg-amber-50/30"
                    : "border-red-300 bg-red-50/30"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Student Name & Bonus */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">
                          #{index + 1}
                        </span>
                        <span className="text-base font-bold text-slate-900">
                          {rec.studentName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                          <Award className="h-3.5 w-3.5 text-amber-600" />+
                          {rec.totalBonusPoints}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Thực hiện bởi: {rec.updatedByName} –{" "}
                        {formatDateTimeVn(rec.updatedAt)}
                      </p>
                    </div>

                    {/* Mobile Bonus Quick Action */}
                    <div className="flex items-center gap-1 sm:hidden">
                      <button
                        type="button"
                        onClick={() => handleQuickPlusOne(rec.studentId)}
                        className="btn-soft"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        +1 Điểm
                      </button>
                      <button
                        type="button"
                        aria-label={`Cộng điểm kèm lý do cho ${rec.studentName}`}
                        onClick={() =>
                          setBonusTarget({
                            studentId: rec.studentId,
                            studentName: rec.studentName,
                          })
                        }
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                      >
                        +...
                      </button>
                    </div>
                  </div>

                  {/* 1-Tap Status Pills + Desktop Bonus Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      role="group"
                      aria-label={`Trạng thái điểm danh của ${rec.studentName}`}
                      className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto"
                    >
                      {STATUS_BUTTONS.map((btn) => {
                        const active = rec.status === btn.value;
                        return (
                          <button
                            key={btn.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => handleStatusTap(rec.id, btn.value)}
                            className={cn(
                              "attendance-pill border px-2 py-2 text-xs font-bold transition",
                              active
                                ? btn.activeClass
                                : "attendance-idle"
                            )}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="hidden items-center gap-1 sm:flex">
                      <button
                        type="button"
                        onClick={() => handleQuickPlusOne(rec.studentId)}
                        className="btn-soft"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        +1 Điểm
                      </button>
                      <button
                        type="button"
                        aria-label={`Cộng điểm kèm lý do cho ${rec.studentName}`}
                        onClick={() =>
                          setBonusTarget({
                            studentId: rec.studentId,
                            studentName: rec.studentName,
                          })
                        }
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        +...
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="clay-card   p-8 text-center">
          <CalendarCheck2 className="mx-auto h-11 w-11 text-brand-700" />
          <p className="mt-2 font-semibold text-slate-800">
            Chưa có buổi điểm danh nào trong ca học này
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Bấm nút &ldquo;Bắt đầu Điểm danh hôm nay&rdquo; ở trên để mở buổi
            đầu tiên.
          </p>
        </div>
      )}

      {/* Confirm Second Session Today Modal */}
      <ModalDialog
        open={confirmSecondOpen}
        onClose={() => setConfirmSecondOpen(false)}
        title="Xác nhận tạo buổi học thứ 2 trong ngày?"
        description="Hôm nay ca học này đã có 1 buổi điểm danh. Chỉ tiếp tục nếu lớp thực sự học tăng cường 2 buổi trong cùng một ngày."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Tạo buổi mới sẽ cộng thêm <strong>+1 buổi</strong> vào bộ đếm chu
              kỳ học phí của ca học.
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmSecondOpen(false)}
              className="btn-soft"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isPendingSession}
              onClick={() => handleStartTodaySession(true)}
              className="btn-warning"
            >
              Xác nhận tạo buổi 2
            </button>
          </div>
        </div>
      </ModalDialog>

      {/* Custom Bonus Modal */}
      <ModalDialog
        open={Boolean(bonusTarget)}
        onClose={() => setBonusTarget(null)}
        title={`Thưởng / Điều chỉnh điểm – ${bonusTarget?.studentName ?? ""}`}
        description="Ghi nhận lý do cộng điểm để phụ huynh xem trên Cổng Học sinh."
      >
        <form onSubmit={handleCustomBonusSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Chọn mức điểm
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, -1].map((val) => (
                <label
                  key={val}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-bold",
                    bonusDelta === val
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  )}
                >
                  <input
                    type="radio"
                    name="bonusDelta"
                    value={val}
                    checked={bonusDelta === val}
                    onChange={() => setBonusDelta(val)}
                    className="visually-hidden"
                  />
                  {val > 0 ? `+${val}` : val} điểm
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="bonus-reason"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Lý do ghi nhận (Tùy chọn)
            </label>
            <input
              id="bonus-reason"
              type="text"
              value={bonusReason}
              onChange={(e) => setBonusReason(e.target.value)}
              placeholder="VD: Xung phong lên bảng giải bài khó"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBonusTarget(null)}
              className="btn-soft"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Lưu điểm
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
