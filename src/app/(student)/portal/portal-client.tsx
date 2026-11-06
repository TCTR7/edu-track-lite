"use client";

import { useState } from "react";
import {
  AlertCircle,
  Award,
  CalendarCheck2,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  GraduationCap,
  KeyRound,
  LogOut,
  QrCode,
  TrendingUp,
  Wallet,
  ZoomIn,
} from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {
  buildVietQrImageUrl,
  buildVietQrTransferNote,
  getBankNameByBin,
} from "@/lib/constants/banks";
import { cn, formatCurrencyVnd, formatDateTimeVn } from "@/lib/utils";
import { evaluateAcademicTrend } from "@/lib/utils/academic-trend";

export interface PortalClassOption {
  classId: string;
  className: string;
  gradeLevel: string;
  scheduleSummary: string;
  tuitionPerCycle: number;
  sessionsPerCycle: number;
  currentCycleNumber: number;
  currentSessionCount: number;
  publicNote: string | null;
  totalBonusPoints: number;
}

export interface PortalTuitionBillItem {
  id: string;
  cycleNumber: number;
  startDate: string;
  endDate: string;
  billableSessions: number;
  excusedAbsentCount: number;
  unexcusedAbsentCount: number;
  baseAmount: number;
  deductedAmount: number;
  adjustmentAmount: number;
  adjustmentNote: string | null;
  finalAmount: number;
  isPaid: boolean;
  paymentMethod: "CASH" | "TRANSFER" | null;
  paidAtIso: string | null;
}

export interface PortalHomeworkItem {
  id: string;
  title: string;
  imageUrls: string[];
  createdAtIso: string;
}

export interface PortalPointItem {
  id: string;
  type: "BONUS" | "TEST";
  title: string;
  score: number;
  recordedDate: string;
  createdAtIso: string;
}

export interface PortalAttendanceItem {
  id: string;
  status: "PRESENT" | "ABSENT_EXCUSED" | "ABSENT_UNEXCUSED";
  sessionDate: string;
  cycleNumber: number;
  sessionNumberInCycle: number;
}

type PortalTab = "overview" | "homework" | "academic";

export function PortalClient({
  student,
  centerBank,
  enrolledClasses,
  selectedClass,
  teacherName,
  tuitionBills,
  homeworksList,
  pointsList,
  attendanceList,
}: {
  student: {
    fullName: string;
    username: string;
    centerName: string;
  };
  centerBank: {
    phone: string | null;
    bankBin: string | null;
    bankAccountNo: string | null;
    bankAccountName: string | null;
  };
  enrolledClasses: PortalClassOption[];
  selectedClass: PortalClassOption | null;
  teacherName: string;
  tuitionBills: PortalTuitionBillItem[];
  homeworksList: PortalHomeworkItem[];
  pointsList: PortalPointItem[];
  attendanceList: PortalAttendanceItem[];
}) {
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [qrBill, setQrBill] = useState<PortalTuitionBillItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  const unpaidBills = tuitionBills.filter((b) => !b.isPaid);
  const chronologicalTests = pointsList
    .filter((p) => p.type === "TEST")
    .slice()
    .sort(
      (a, b) =>
        a.recordedDate.localeCompare(b.recordedDate) ||
        a.createdAtIso.localeCompare(b.createdAtIso)
    );
  const trend = evaluateAcademicTrend(chronologicalTests.map((t) => t.score));

  const presentCount = attendanceList.filter(
    (a) => a.status === "PRESENT"
  ).length;
  const excusedCount = attendanceList.filter(
    (a) => a.status === "ABSENT_EXCUSED"
  ).length;
  const unexcusedCount = attendanceList.filter(
    (a) => a.status === "ABSENT_UNEXCUSED"
  ).length;

  const copyTransferNote = async (note: string) => {
    await navigator.clipboard.writeText(note);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  return (
    <div className="min-h-dvh bg-canvas pb-20">
      {/* Top Lavender Header */}
      <header className="sidebar-surface sticky top-0 z-20 rounded-b-3xl px-4 py-3.5">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full sidebar-avatar">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-brand-950">
              <p className="truncate text-sm font-extrabold">
                Chào, {student.fullName}! <span aria-hidden="true">👋</span>
              </p>
              <p className="truncate text-xs font-semibold text-brand-950">
                {student.centerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChangePwOpen(true)}
              aria-label="Đổi mật khẩu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/30 text-brand-950 hover:bg-white/50"
            >
              <KeyRound className="h-4 w-4" />
            </button>

            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Đăng xuất"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/30 text-brand-950 hover:bg-white/50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Multi-class switcher if student attends >= 2 classes */}
        {enrolledClasses.length > 1 && (
          <div className="mx-auto mt-3 flex max-w-2xl gap-2 overflow-x-auto pb-1">
            {enrolledClasses.map((c) => {
              const active = c.classId === selectedClass?.classId;
              return (
                <a
                  key={c.classId}
                  href={`/portal?classId=${c.classId}`}
                  className={
                    active
                      ? "clay-filter pill-nav-active shrink-0 rounded-full px-4 py-2 text-xs font-extrabold"
                      : "clay-filter shrink-0 rounded-full bg-white/30 px-4 py-2 text-xs font-bold text-brand-950 hover:bg-white/50"
                  }
                >
                  {c.className}
                </a>
              );
            })}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {selectedClass ? (
          <>
            {/* Unpaid Tuition Prominent Alert Banner */}
            {unpaidBills.map((bill) => (
              <div
                key={bill.id}
                data-testid="portal-unpaid-banner"
                className="stat-card bg-pastel-pink p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-extrabold text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Thông báo Học phí Kỳ #{bill.cycleNumber}
                    </span>
                    <p className="mt-1.5 text-xl font-black text-red-900">
                      Cần đóng: {formatCurrencyVnd(bill.finalAmount)}
                    </p>
                    <p className="mt-0.5 text-xs text-red-800">
                      Chu kỳ: {bill.startDate} → {bill.endDate} (Tính phí{" "}
                      {bill.billableSessions} buổi • Nghỉ có phép:{" "}
                      {bill.excusedAbsentCount} buổi)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQrBill(bill)}
                    className="btn-primary"
                  >
                    <QrCode className="h-4 w-4" />
                    Quét mã VietQR đóng học phí
                  </button>
                </div>
              </div>
            ))}

            {/* Class Overview Header Card */}
            <div className="clay-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-800">
                    {selectedClass.gradeLevel === "OTHER"
                      ? "Khác"
                      : `Khối ${selectedClass.gradeLevel}`}
                  </span>
                  <h1 className="mt-2 text-xl font-extrabold text-slate-900">
                    {selectedClass.className}
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-600">
                    GV: {teacherName} • Lịch học: {selectedClass.scheduleSummary}
                  </p>
                </div>

                <div className="rounded-2xl bg-brand-50 px-3.5 py-2 text-right">
                  <p className="text-[11px] font-bold uppercase text-brand-700">
                    Tiến độ Chu kỳ {selectedClass.currentCycleNumber}
                  </p>
                  <p className="text-base font-black text-brand-950">
                    Buổi {selectedClass.currentSessionCount}/
                    {selectedClass.sessionsPerCycle}
                  </p>
                </div>
              </div>

              {/* 3 Portal Sub-tabs */}
              <div
                role="tablist"
                aria-label="Phân mục Cổng Học sinh"
                className="clay-tab-track mt-4 grid grid-cols-3 gap-1.5 rounded-2xl  p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "overview"}
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-extrabold transition sm:flex-row sm:px-2",
                    activeTab === "overview"
                      ? "clay-tab-active"
                      : "text-slate-600"
                  )}
                >
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-center leading-tight">Tổng quan & Phí</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "homework"}
                  onClick={() => setActiveTab("homework")}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-extrabold transition sm:flex-row sm:px-2",
                    activeTab === "homework"
                      ? "clay-tab-active"
                      : "text-slate-600"
                  )}
                >
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-center leading-tight">BTVN ({homeworksList.length})</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "academic"}
                  onClick={() => setActiveTab("academic")}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-extrabold transition sm:flex-row sm:px-2",
                    activeTab === "academic"
                      ? "clay-tab-active"
                      : "text-slate-600"
                  )}
                >
                  <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-center leading-tight">Kết quả học tập</span>
                </button>
              </div>
            </div>

            {/* TAB 1: OVERVIEW & TUITION */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="stat-card bg-pastel-butter p-4">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Award className="h-5 w-5 text-amber-600" />
                      <span className="text-xs font-bold">
                        Điểm cộng tích lũy
                      </span>
                    </div>
                    <p className="mt-1.5 text-2xl font-black text-amber-950">
                      +{selectedClass.totalBonusPoints} điểm
                    </p>
                  </div>

                  <div className="stat-card bg-pastel-lavender p-4">
                    <div className="flex items-center gap-2 text-brand-900">
                      <TrendingUp className="h-5 w-5 text-brand-700" />
                      <span className="text-xs font-bold">Đánh giá lực học</span>
                    </div>
                    <p className="mt-1.5 text-base font-black text-brand-950">
                      {trend.averageScore !== null
                        ? `TB ${trend.averageScore} • ${trend.label}`
                        : trend.label}
                    </p>
                  </div>
                </div>

                {selectedClass.publicNote && (
                  <div className="clay-card p-5">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Nhận xét của Giáo viên
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                      {selectedClass.publicNote}
                    </p>
                  </div>
                )}

                {/* Tuition History */}
                <div className="clay-card p-5 space-y-3">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Lịch sử các kỳ Học phí ({tuitionBills.length})
                  </h2>

                  {tuitionBills.length === 0 ? (
                    <p className="text-xs text-slate-600">
                      Hiện chưa có kỳ học phí nào được chốt cho ca học này.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {tuitionBills.map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                        >
                          <div>
                            <p className="font-extrabold text-slate-900">
                              Kỳ #{b.cycleNumber}{" "}
                              <span className="text-xs font-normal text-slate-600">
                                ({b.startDate} → {b.endDate})
                              </span>
                            </p>
                            <p className="text-xs text-slate-600">
                              Cơ sở: {formatCurrencyVnd(b.baseAmount)} (
                              {b.billableSessions} buổi) • Trừ có phép: -
                              {formatCurrencyVnd(b.deductedAmount)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-black text-slate-900">
                                {formatCurrencyVnd(b.finalAmount)}
                              </p>
                              <span
                                className={cn(
                                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold",
                                  b.isPaid
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-700"
                                )}
                              >
                                {b.isPaid
                                  ? `Đã đóng (${
                                      b.paymentMethod === "CASH"
                                        ? "Tiền mặt"
                                        : "Chuyển khoản"
                                    })`
                                  : "Chưa đóng"}
                              </span>
                            </div>

                            {!b.isPaid && (
                              <button
                                type="button"
                                onClick={() => setQrBill(b)}
                                className="btn-primary"
                              >
                                <QrCode className="h-3.5 w-3.5" />
                                Mã QR
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: HOMEWORK (BTVN) */}
            {activeTab === "homework" && (
              <div className="space-y-3">
                {homeworksList.length === 0 ? (
                  <div className="clay-card p-8 text-center text-sm text-slate-600">
                    Chưa có bài tập về nhà nào được đăng trong ca học này.
                  </div>
                ) : (
                  homeworksList.map((hw) => (
                    <div key={hw.id} className="clay-card p-4 sm:p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {hw.title}
                        </h3>
                        <p className="text-xs text-slate-600">
                          Đăng lúc {formatDateTimeVn(hw.createdAtIso)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {hw.imageUrls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                url,
                                title: `${hw.title} (Ảnh ${idx + 1})`,
                              })
                            }
                            className="group relative clay-panel overflow-hidden bg-slate-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`${hw.title} - Ảnh ${idx + 1}`}
                              className="h-36 w-full object-cover transition group-hover:scale-105"
                            />
                            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-white">
                              <ZoomIn className="h-3 w-3" />
                              Phóng to
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: ACADEMIC & ATTENDANCE */}
            {activeTab === "academic" && (
              <div className="space-y-4">
                {/* Periodic Test Scores */}
                <div className="clay-card p-5 space-y-3">
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Bảng điểm Kiểm tra định kỳ ({chronologicalTests.length})
                  </h2>

                  {chronologicalTests.length === 0 ? (
                    <p className="text-xs text-slate-600">
                      Chưa có điểm bài kiểm tra định kỳ nào.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {chronologicalTests
                        .slice()
                        .reverse()
                        .map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between py-2.5 text-sm"
                          >
                            <div>
                              <p className="font-bold text-slate-900">
                                {t.title}
                              </p>
                              <p className="text-xs text-slate-600">
                                Ngày kiểm tra: {t.recordedDate}
                              </p>
                            </div>
                            <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-black text-brand-900">
                              {t.score} điểm
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Attendance History */}
                <div className="clay-card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Thống kê Chuyên cần ({attendanceList.length} buổi)
                    </h2>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      <span className="text-emerald-700">
                        Có mặt: {presentCount}
                      </span>
                      <span className="text-amber-700">
                        Có phép: {excusedCount}
                      </span>
                      <span className="text-red-700">
                        Vắng tự ý: {unexcusedCount}
                      </span>
                    </div>
                  </div>

                  {attendanceList.length === 0 ? (
                    <p className="text-xs text-slate-600">
                      Chưa có dữ liệu điểm danh.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {attendanceList.slice(0, 20).map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between py-2.5 text-xs sm:text-sm"
                        >
                          <span className="font-semibold text-slate-800">
                            Ngày {att.sessionDate} (Kỳ {att.cycleNumber} • Buổi{" "}
                            {att.sessionNumberInCycle})
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-bold",
                              att.status === "PRESENT"
                                ? "bg-emerald-100 text-emerald-800"
                                : att.status === "ABSENT_EXCUSED"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-red-100 text-red-700"
                            )}
                          >
                            {att.status === "PRESENT"
                              ? "Có mặt"
                              : att.status === "ABSENT_EXCUSED"
                              ? "Nghỉ có phép (-phí)"
                              : "Vắng tự ý"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="clay-card p-6 text-center text-sm text-slate-600">
            Học sinh hiện chưa được xếp vào ca học nào.
          </div>
        )}
      </main>

      {/* VietQR Payment Modal */}
      <ModalDialog
        open={Boolean(qrBill)}
        onClose={() => setQrBill(null)}
        title={`Thanh toán Học phí Kỳ #${qrBill?.cycleNumber ?? ""}`}
        description="Mở ứng dụng Ngân hàng bất kỳ và quét mã VietQR bên dưới (đã điền sẵn số tiền & nội dung)."
      >
        {qrBill && selectedClass && (
          <div className="space-y-4">
            {centerBank.bankBin && centerBank.bankAccountNo ? (
              <div className="flex flex-col items-center space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={buildVietQrImageUrl({
                    bankBin: centerBank.bankBin,
                    bankAccountNo: centerBank.bankAccountNo,
                    bankAccountName: centerBank.bankAccountName,
                    amount: qrBill.finalAmount,
                    transferNote: buildVietQrTransferNote({
                      cycleNumber: qrBill.cycleNumber,
                      studentName: student.fullName,
                      className: selectedClass.className,
                    }),
                  })}
                  alt="Mã VietQR đóng học phí"
                  className="clay-card w-full max-w-[260px]  p-2"
                />

                <div className="w-full rounded-2xl bg-brand-50 p-3.5 text-xs text-brand-950 space-y-1.5">
                  <p>
                    Ngân hàng:{" "}
                    <strong>{getBankNameByBin(centerBank.bankBin)}</strong>
                  </p>
                  <p>
                    Số tài khoản:{" "}
                    <strong className="font-mono">
                      {centerBank.bankAccountNo}
                    </strong>{" "}
                    {centerBank.bankAccountName
                      ? `(${centerBank.bankAccountName})`
                      : ""}
                  </p>
                  <p>
                    Số tiền cần chuyển:{" "}
                    <strong className="text-sm text-brand-800">
                      {formatCurrencyVnd(qrBill.finalAmount)}
                    </strong>
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span>
                      Nội dung CK:{" "}
                      <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">
                        {buildVietQrTransferNote({
                          cycleNumber: qrBill.cycleNumber,
                          studentName: student.fullName,
                          className: selectedClass.className,
                        })}
                      </code>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyTransferNote(
                          buildVietQrTransferNote({
                            cycleNumber: qrBill.cycleNumber,
                            studentName: student.fullName,
                            className: selectedClass.className,
                          })
                        )
                      }
                      className="btn-primary"
                    >
                      {copiedNote ? (
                        <>
                          <Check className="h-3 w-3" /> Đã copy
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy nội dung
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                Trung tâm hiện chưa cấu hình số tài khoản VietQR. Phụ huynh vui
                lòng đóng học phí trực tiếp hoặc liên hệ SĐT trung tâm{" "}
                {centerBank.phone ? <strong>{centerBank.phone}</strong> : ""}.
              </div>
            )}
          </div>
        )}
      </ModalDialog>

      {/* Homework Image Lightbox Modal */}
      <ModalDialog
        open={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        title={lightboxImage?.title ?? "Ảnh Bài tập về nhà"}
        className="max-w-3xl"
      >
        {lightboxImage && (
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[75dvh] w-auto rounded-2xl object-contain"
            />
          </div>
        )}
      </ModalDialog>

      {/* Change Password Modal */}
      <ModalDialog
        open={changePwOpen}
        onClose={() => setChangePwOpen(false)}
        title="Đổi mật khẩu Tài khoản Học sinh"
        description={`Tài khoản: ${student.username}`}
      >
        <ChangePasswordForm />
      </ModalDialog>
    </div>
  );
}
