"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Archive,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  archiveClassAction,
  saveClassAction,
  type ClassFormState,
} from "@/actions/class-actions";
import { HeroBanner } from "@/components/ui/hero-banner";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { StatCard } from "@/components/ui/stat-card";
import type { ScheduleSlot } from "@/db/schema";
import {
  calculateRoundedSessionPrice,
  cn,
  formatCurrencyVnd,
} from "@/lib/utils";
import { formatScheduleSummary } from "@/lib/utils/schedule";

export interface ClassCardItem {
  id: string;
  name: string;
  gradeLevel: string;
  teacherId: string;
  teacherName: string;
  scheduleJson: ScheduleSlot[];
  tuitionPerCycle: number;
  sessionsPerCycle: number;
  deductionPerSession: number;
  currentCycleNumber: number;
  currentSessionCount: number;
  activeStudentCount: number;
  unpaidBillCount: number;
  inSession: boolean;
  scheduledToday: boolean;
}

export interface AssignableTeacher {
  id: string;
  fullName: string;
  role: string;
}

const GRADE_OPTIONS = [
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Khối Lớp ${i + 1}`,
  })),
  { value: "OTHER", label: "Khác / Ôn thi" },
];

const DAY_OPTIONS = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];

const initialState: ClassFormState = {};

export function ClassesClient({
  classesList,
  teachers,
  isAdmin,
  currentUserId,
  roundingUnit,
  greeting,
  userShortName,
}: {
  classesList: ClassCardItem[];
  teachers: AssignableTeacher[];
  isAdmin: boolean;
  currentUserId: string;
  roundingUnit: number;
  greeting: { text: string; emoji: string };
  userShortName: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassCardItem | null>(null);
  const [state, formAction, isPending] = useActionState(
    saveClassAction,
    initialState
  );
  const [isArchiving, startTransition] = useTransition();

  // Form controlled states for live deduction calculation & schedule builder
  const [tuition, setTuition] = useState(800000);
  const [sessions, setSessions] = useState(16);
  const [deduction, setDeduction] = useState(50000);
  const [manualDeduction, setManualDeduction] = useState(false);
  const [slots, setSlots] = useState<ScheduleSlot[]>([
    { dayOfWeek: 2, startTime: "17:30", endTime: "19:00" },
    { dayOfWeek: 5, startTime: "17:30", endTime: "19:00" },
  ]);

  const openCreateModal = () => {
    setEditingClass(null);
    setTuition(800000);
    setSessions(16);
    setDeduction(calculateRoundedSessionPrice(800000, 16, roundingUnit));
    setManualDeduction(false);
    setSlots([
      { dayOfWeek: 2, startTime: "17:30", endTime: "19:00" },
      { dayOfWeek: 5, startTime: "17:30", endTime: "19:00" },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (item: ClassCardItem) => {
    setEditingClass(item);
    setTuition(item.tuitionPerCycle);
    setSessions(item.sessionsPerCycle);
    setDeduction(item.deductionPerSession);
    setManualDeduction(true);
    setSlots(
      item.scheduleJson.length > 0
        ? item.scheduleJson
        : [{ dayOfWeek: 2, startTime: "17:30", endTime: "19:00" }]
    );
    setModalOpen(true);
  };

  useEffect(() => {
    if (!manualDeduction) {
      setDeduction(calculateRoundedSessionPrice(tuition, sessions, roundingUnit));
    }
  }, [tuition, sessions, roundingUnit, manualDeduction]);

  useEffect(() => {
    if (state.success) {
      setModalOpen(false);
    }
  }, [state.success]);

  const todayCount = classesList.filter((c) => c.scheduledToday).length;
  const totalUnpaid = classesList.reduce((acc, c) => acc + c.unpaidBillCount, 0);
  const totalStudents = classesList.reduce(
    (acc, c) => acc + c.activeStudentCount,
    0
  );
  const liveClass = classesList.find((c) => c.inSession) ?? null;

  return (
    <div className="space-y-5">
      <HeroBanner
        emoji={greeting.emoji}
        illustration="/illustrations/learning-companion.webp"
        title={`${greeting.text}, ${userShortName}!`}
        subtitle={
          liveClass
            ? `${liveClass.name} đang trong giờ học – vào điểm danh ngay nhé.`
            : "Chạm vào một Ca học để điểm danh 1 chạm, cộng điểm hoặc đăng BTVN."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {liveClass && (
              <Link
                href={`/classes/${liveClass.id}`}
                className="btn-primary"
              >
                <CalendarClock className="h-4 w-4" />
                Điểm danh ngay
              </Link>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className={
                  liveClass
                    ? "btn-soft"
                    : "btn-primary"
                }
              >
                <Plus className="h-4 w-4" />
                Tạo Ca học mới
              </button>
            )}
          </div>
        }
      />

      {/* Pastel stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          tone="lavender"
          icon={BookOpen}
          label="Ca học đang mở"
          value={classesList.length}
          hint={`${todayCount} ca có lịch hôm nay`}
        />
        <StatCard
          tone="butter"
          icon={CalendarClock}
          label="Lịch dạy hôm nay"
          value={todayCount}
          hint={liveClass ? "Có ca đang trong giờ" : "Chưa đến giờ học"}
          hintTone={liveClass ? "good" : "neutral"}
        />
        <StatCard
          tone="sky"
          icon={Users}
          label="Học sinh đang học"
          value={totalStudents}
          hint="Tổng các ca đang mở"
        />
        <Link href="/tuition" className="block rounded-2xl">
          <StatCard
            tone={totalUnpaid > 0 ? "pink" : "mint"}
            icon={AlertCircle}
            label="Hóa đơn chưa thu"
            value={totalUnpaid}
            hint={totalUnpaid > 0 ? "Chạm để mở Học phí" : "Đã thu đủ"}
            hintTone={totalUnpaid > 0 ? "bad" : "good"}
          />
        </Link>
      </div>

      <h2 className="pt-1 text-lg font-extrabold text-brand-950">
        Danh sách Ca học
      </h2>

      {classesList.length === 0 ? (
        <div className="clay-card p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-2 font-semibold text-slate-800">
            Chưa có Ca học nào
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Bấm 'Tạo Ca học mới' ở góc trên để khởi tạo lớp đầu tiên."
              : "Bạn chưa được Admin phân công phụ trách ca học nào."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {classesList.map((item) => {
            const progressPct = Math.min(
              100,
              Math.round(
                (item.currentSessionCount /
                  Math.max(1, item.sessionsPerCycle)) *
                  100
              )
            );
            return (
              <div
                key={item.id}
                data-testid="class-card"
                className={cn(
                  "clay-card class-clay-card group relative flex min-w-0 flex-col justify-between p-5",
                  item.inSession
                    ? "border-2 border-emerald-500 ring-4 ring-emerald-50"
                    : ""
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {item.gradeLevel === "OTHER"
                          ? "Khác"
                          : `Khối ${item.gradeLevel}`}
                      </span>
                      {item.inSession && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                          Đang trong giờ học
                        </span>
                      )}
                      {item.unpaidBillCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                          Còn {item.unpaidBillCount} HS nợ phí
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        aria-label={`Chỉnh sửa ${item.name}`}
                        className="clay-icon-button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/classes/${item.id}`}
                    className="mt-3 block rounded-xl"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="break-words text-lg font-extrabold text-slate-900 group-hover:text-brand-800">
                        {item.name}
                      </h2>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-brand-700" />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>Tiến độ Chu kỳ {item.currentCycleNumber}</span>
                      <span className="text-brand-800">
                        Buổi {item.currentSessionCount}/{item.sessionsPerCycle}
                      </span>
                    </div>

                    <div className="clay-progress mt-2">
                      <div
                        className="clay-progress-fill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{formatScheduleSummary(item.scheduleJson)}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          Sĩ số:{" "}
                          <strong className="text-slate-900">
                            {item.activeStudentCount} học sinh
                          </strong>{" "}
                          • GV: {item.teacherName}
                        </span>
                      </p>
                      <p className="text-xs leading-relaxed text-slate-600">
                        Học phí: {formatCurrencyVnd(item.tuitionPerCycle)} /{" "}
                        {item.sessionsPerCycle} buổi (Trừ nghỉ có phép:{" "}
                        {formatCurrencyVnd(item.deductionPerSession)}/buổi)
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Class Modal */}
      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? "Chỉnh sửa Ca học" : "Tạo Ca học mới"}
        description="Cấu hình lịch học trong tuần và chu kỳ tính học phí tự động."
      >
        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="classId"
            value={editingClass?.id ?? ""}
          />
          <input
            type="hidden"
            name="scheduleJson"
            value={JSON.stringify(slots)}
          />

          {state.error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {state.error}
            </div>
          )}

          <div>
            <label
              htmlFor="class-name"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Tên Lớp / Ca học *
            </label>
            <input
              id="class-name"
              name="name"
              type="text"
              required
              autoFocus
              defaultValue={editingClass?.name ?? ""}
              placeholder="VD: Toán Lớp 4 - Ca 1"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="class-grade"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Khối lớp
              </label>
              <select
                id="class-grade"
                name="gradeLevel"
                defaultValue={editingClass?.gradeLevel ?? "4"}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="class-teacher"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Giáo viên phụ trách
              </label>
              <select
                id="class-teacher"
                name="teacherId"
                defaultValue={editingClass?.teacherId ?? currentUserId}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} {t.role === "ADMIN" ? "(Admin)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weekly Schedule Slots */}
          <fieldset className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-semibold text-slate-800">
                Lịch học trong tuần
              </legend>
              <button
                type="button"
                onClick={() =>
                  setSlots((prev) => [
                    ...prev,
                    { dayOfWeek: 4, startTime: "17:30", endTime: "19:00" },
                  ])
                }
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                + Thêm buổi/tuần
              </button>
            </div>

            {slots.map((slot, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Thứ buổi ${idx + 1}`}
                  value={slot.dayOfWeek}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === idx ? { ...s, dayOfWeek: val } : s
                      )
                    );
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                >
                  {DAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>

                <input
                  type="time"
                  aria-label={`Giờ bắt đầu buổi ${idx + 1}`}
                  value={slot.startTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === idx ? { ...s, startTime: val } : s
                      )
                    );
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                />
                <span className="text-xs text-slate-500">đến</span>
                <input
                  type="time"
                  aria-label={`Giờ kết thúc buổi ${idx + 1}`}
                  value={slot.endTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === idx ? { ...s, endTime: val } : s
                      )
                    );
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
                />

                {slots.length > 1 && (
                  <button
                    type="button"
                    aria-label="Xóa khung giờ"
                    onClick={() =>
                      setSlots((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </fieldset>

          {/* Tuition Cycle Configuration */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="class-sessions"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Số buổi / chu kỳ *
              </label>
              <input
                id="class-sessions"
                name="sessionsPerCycle"
                type="number"
                min={1}
                max={100}
                required
                value={sessions}
                onChange={(e) => setSessions(Number(e.target.value || 1))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label
                htmlFor="class-tuition"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Học phí chu kỳ (VNĐ) *
              </label>
              <input
                id="class-tuition"
                name="tuitionPerCycle"
                type="number"
                min={0}
                step={1000}
                required
                value={tuition}
                onChange={(e) => setTuition(Number(e.target.value || 0))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label
                htmlFor="class-deduction"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Đơn giá 1 buổi (VNĐ)
              </label>
              <input
                id="class-deduction"
                name="deductionPerSession"
                type="number"
                min={0}
                step={1000}
                required
                value={deduction}
                onChange={(e) => {
                  setManualDeduction(true);
                  setDeduction(Number(e.target.value || 0));
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {editingClass ? (
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => {
                  startTransition(async () => {
                    await archiveClassAction(editingClass.id);
                    setModalOpen(false);
                  });
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                <Archive className="h-4 w-4" />
                Lưu trữ / Đóng ca học
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="min-h-11 rounded-full bg-brand-600 shadow-btn px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {isPending
                  ? "Đang lưu..."
                  : editingClass
                  ? "Lưu thay đổi"
                  : "Tạo Ca học"}
              </button>
            </div>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
