"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  QrCode,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import {
  adjustTuitionBillAction,
  collectTuitionBillAction,
  revertTuitionBillAction,
} from "@/actions/tuition-actions";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { StatCard } from "@/components/ui/stat-card";
import {
  buildVietQrImageUrl,
  buildVietQrTransferNote,
} from "@/lib/constants/banks";
import {
  summarizeTuitionReconciliation,
  type PaidTuitionEntry,
} from "@/lib/services/reconciliation";
import {
  cn,
  formatCurrencyVnd,
  formatDateTimeVn,
  removeVietnameseTones,
} from "@/lib/utils";

export interface TuitionBillViewItem {
  id: string;
  classId: string;
  className: string;
  cycleId: string;
  cycleNumber: number;
  cycleStartDate: string;
  cycleEndDate: string;
  studentId: string;
  studentName: string;
  studentUsername: string;
  studentPhone: string | null;
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
  collectedByUserId: string | null;
  collectedByName: string | null;
  paidAtIso: string | null;
}

type TuitionTab = "unpaid" | "reconciliation" | "paid";

export function TuitionClient({
  bills,
  classesList,
  initialClassId,
  initialTab,
  todayStr,
  bankConfig,
}: {
  bills: TuitionBillViewItem[];
  classesList: { id: string; name: string; gradeLevel: string }[];
  initialClassId: string;
  initialTab: TuitionTab;
  todayStr: string;
  bankConfig: {
    bankBin: string | null;
    bankAccountNo: string | null;
    bankAccountName: string | null;
  };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TuitionTab>(initialTab);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Adjustment modal state
  const [adjustTarget, setAdjustTarget] = useState<TuitionBillViewItem | null>(
    null
  );
  const [adjAmount, setAdjAmount] = useState<string>("0");
  const [adjNote, setAdjNote] = useState<string>("");

  // Revert modal state
  const [revertTarget, setRevertTarget] = useState<TuitionBillViewItem | null>(
    null
  );
  const [revertReason, setRevertReason] = useState<string>("");

  // VietQR preview modal state
  const [qrTarget, setQrTarget] = useState<TuitionBillViewItem | null>(null);

  const unpaidBills = useMemo(
    () => bills.filter((b) => !b.isPaid),
    [bills]
  );
  const paidBills = useMemo(() => bills.filter((b) => b.isPaid), [bills]);

  const filteredUnpaid = useMemo(() => {
    const q = removeVietnameseTones(searchQuery).toLowerCase();
    return unpaidBills.filter((b) => {
      if (selectedClassId !== "ALL" && b.classId !== selectedClassId) {
        return false;
      }
      if (!q) return true;
      return (
        removeVietnameseTones(b.studentName).toLowerCase().includes(q) ||
        b.studentUsername.toLowerCase().includes(q) ||
        removeVietnameseTones(b.className).toLowerCase().includes(q)
      );
    });
  }, [unpaidBills, selectedClassId, searchQuery]);

  const filteredPaid = useMemo(() => {
    const q = removeVietnameseTones(searchQuery).toLowerCase();
    return paidBills.filter((b) => {
      if (selectedClassId !== "ALL" && b.classId !== selectedClassId) {
        return false;
      }
      if (!q) return true;
      return (
        removeVietnameseTones(b.studentName).toLowerCase().includes(q) ||
        b.studentUsername.toLowerCase().includes(q) ||
        removeVietnameseTones(b.className).toLowerCase().includes(q)
      );
    });
  }, [paidBills, selectedClassId, searchQuery]);

  const paidEntriesForReconciliation: PaidTuitionEntry[] = useMemo(
    () =>
      paidBills
        .filter(
          (b) =>
            b.paymentMethod &&
            b.collectedByUserId &&
            b.collectedByName &&
            b.paidAtIso
        )
        .map((b) => ({
          id: b.id,
          classId: b.classId,
          className: b.className,
          cycleNumber: b.cycleNumber,
          studentId: b.studentId,
          studentName: b.studentName,
          studentUsername: b.studentUsername,
          finalAmount: b.finalAmount,
          paymentMethod: b.paymentMethod!,
          collectedByUserId: b.collectedByUserId!,
          collectedByName: b.collectedByName!,
          paidAtIso: b.paidAtIso!,
        })),
    [paidBills]
  );

  const todaySummary = useMemo(
    () =>
      summarizeTuitionReconciliation(
        paidEntriesForReconciliation,
        todayStr,
        todayStr
      ),
    [paidEntriesForReconciliation, todayStr]
  );

  const rangeSummary = useMemo(
    () =>
      summarizeTuitionReconciliation(
        paidEntriesForReconciliation,
        fromDate <= toDate ? fromDate : toDate,
        fromDate <= toDate ? toDate : fromDate
      ),
    [paidEntriesForReconciliation, fromDate, toDate]
  );

  const totalUnpaidAmount = useMemo(
    () => unpaidBills.reduce((acc, b) => acc + b.finalAmount, 0),
    [unpaidBills]
  );

  const handleCollect = (
    bill: TuitionBillViewItem,
    method: "CASH" | "TRANSFER"
  ) => {
    setErrorMsg(null);
    setStatusMsg(null);
    startTransition(async () => {
      const res = await collectTuitionBillAction({
        recordId: bill.id,
        paymentMethod: method,
      });
      if (!res.ok) {
        setErrorMsg(res.error ?? "Không thể xác nhận thu học phí.");
        return;
      }
      setStatusMsg(
        `Đã xác nhận thu ${formatCurrencyVnd(bill.finalAmount)} (${
          method === "CASH" ? "Tiền mặt" : "Chuyển khoản"
        }) của học sinh ${bill.studentName}.`
      );
      router.refresh();
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setErrorMsg(null);
    setStatusMsg(null);
    const target = adjustTarget;
    const numericAdj = Number(adjAmount) || 0;
    const note = adjNote;

    startTransition(async () => {
      const res = await adjustTuitionBillAction({
        recordId: target.id,
        adjustmentAmount: numericAdj,
        adjustmentNote: note,
      });
      setAdjustTarget(null);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Không thể lưu điều chỉnh học phí.");
        return;
      }
      setStatusMsg(
        `Đã cập nhật điều chỉnh học phí cho em ${target.studentName}.`
      );
      router.refresh();
    });
  };

  const handleRevertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revertTarget) return;
    setErrorMsg(null);
    setStatusMsg(null);
    const target = revertTarget;
    const reason = revertReason;

    startTransition(async () => {
      const res = await revertTuitionBillAction({
        recordId: target.id,
        reason,
      });
      setRevertTarget(null);
      setRevertReason("");
      if (!res.ok) {
        setErrorMsg(res.error ?? "Không thể hủy thu hóa đơn.");
        return;
      }
      setStatusMsg(
        `Đã hoàn tác hóa đơn của em ${target.studentName} về trạng thái Chưa đóng.`
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-950">
          Học phí & Đối soát cuối ngày
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Xác nhận thu học phí 1 chạm và tách bạch Tiền mặt từng giáo viên đang
          giữ với Chuyển khoản về trung tâm.
        </p>
      </div>

      {/* Top Pastel Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          tone={unpaidBills.length > 0 ? "pink" : "mint"}
          icon={AlertCircle}
          label="Hóa đơn chờ thu"
          value={unpaidBills.length}
          hint={
            unpaidBills.length > 0
              ? `Tổng: ${formatCurrencyVnd(totalUnpaidAmount)}`
              : "Không còn nợ tồn"
          }
          hintTone={unpaidBills.length > 0 ? "bad" : "good"}
        />
        <StatCard
          tone="butter"
          icon={Banknote}
          label="Tiền mặt hôm nay"
          value={formatCurrencyVnd(todaySummary.totalCashAmount)}
          hint={`${todaySummary.totalCashCount} phiếu thu tiền mặt`}
        />
        <StatCard
          tone="lavender"
          icon={CreditCard}
          label="Chuyển khoản hôm nay"
          value={formatCurrencyVnd(todaySummary.totalTransferAmount)}
          hint={`${todaySummary.totalTransferCount} phiếu chuyển khoản`}
        />
        <StatCard
          tone="sky"
          icon={Wallet}
          label="Tổng thu hôm nay"
          value={formatCurrencyVnd(todaySummary.grandTotalAmount)}
          hint={`Ngày ${todayStr}`}
          hintTone="good"
        />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          {statusMsg}
        </div>
      )}

      {/* 3 Sub-tabs */}
      <div className="clay-card p-3 sm:p-4">
        <div
          role="tablist"
          aria-label="Phân mục Quản lý Học phí"
          className="clay-tab-track grid grid-cols-3 gap-1.5 rounded-2xl  p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "unpaid"}
            onClick={() => setActiveTab("unpaid")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition sm:text-sm",
              activeTab === "unpaid"
                ? "clay-tab-active"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span>Chưa đóng ({unpaidBills.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "reconciliation"}
            onClick={() => setActiveTab("reconciliation")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition sm:text-sm",
              activeTab === "reconciliation"
                ? "clay-tab-active"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Banknote className="h-4 w-4 shrink-0" />
            <span>Đối soát theo ngày</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "paid"}
            onClick={() => setActiveTab("paid")}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition sm:text-sm",
              activeTab === "paid"
                ? "clay-tab-active"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Đã thu ({paidBills.length})</span>
          </button>
        </div>

        {/* Filter bar for Unpaid / Paid tabs */}
        {(activeTab === "unpaid" || activeTab === "paid") && (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-12">
            <div className="relative sm:col-span-7">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh, username hoặc tên lớp (hỗ trợ gõ không dấu)..."
                aria-label="Tìm kiếm hóa đơn học phí"
                className="clay-input w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm"
              />
            </div>

            <div className="sm:col-span-5">
              <select
                aria-label="Lọc theo Ca học"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium"
              >
                <option value="ALL">Tất cả Ca học ({classesList.length})</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: UNPAID BILLS */}
      {activeTab === "unpaid" && (
        <div className="space-y-3">
          {filteredUnpaid.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" />
              <p className="mt-2 font-bold text-slate-900">
                Không có hóa đơn chưa đóng nào khớp bộ lọc
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Khi điểm danh chạm buổi cuối của chu kỳ, hóa đơn học phí của từng
                học sinh sẽ tự động xuất hiện tại đây.
              </p>
            </div>
          ) : (
            filteredUnpaid.map((bill) => (
              <div
                key={bill.id}
                data-testid="unpaid-bill-card"
                className="clay-card p-4 transition sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-extrabold text-brand-800">
                        {bill.className} • Kỳ #{bill.cycleNumber}
                      </span>
                      <span className="text-xs text-slate-600">
                        ({bill.cycleStartDate} → {bill.cycleEndDate})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
                        {bill.studentName}
                      </h2>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {bill.studentUsername}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Mức cơ sở:{" "}
                        <strong className="text-slate-900">
                          {formatCurrencyVnd(bill.baseAmount)}
                        </strong>{" "}
                        ({bill.billableSessions} buổi)
                      </span>
                      <span>
                        Trừ nghỉ có phép:{" "}
                        <strong className="text-amber-800">
                          -{formatCurrencyVnd(bill.deductedAmount)}
                        </strong>{" "}
                        ({bill.excusedAbsentCount} buổi)
                      </span>
                      {bill.adjustmentAmount !== 0 && (
                        <span>
                          Điều chỉnh:{" "}
                          <strong
                            className={
                              bill.adjustmentAmount > 0
                                ? "text-red-700"
                                : "text-emerald-700"
                            }
                          >
                            {bill.adjustmentAmount > 0 ? "+" : ""}
                            {formatCurrencyVnd(bill.adjustmentAmount)}
                          </strong>
                          {bill.adjustmentNote
                            ? ` (${bill.adjustmentNote})`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                    <div className="text-left lg:text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Thực thu
                      </span>
                      <p className="text-xl font-black text-brand-900">
                        {formatCurrencyVnd(bill.finalAmount)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustTarget(bill);
                          setAdjAmount(String(bill.adjustmentAmount));
                          setAdjNote(bill.adjustmentNote ?? "");
                        }}
                        className="btn-soft"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Điều chỉnh (+/-)
                      </button>

                      {bankConfig.bankBin && bankConfig.bankAccountNo && (
                        <button
                          type="button"
                          onClick={() => setQrTarget(bill)}
                          className="btn-soft"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Mã VietQR
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleCollect(bill, "CASH")}
                        className="btn-success"
                      >
                        <Banknote className="h-4 w-4" />
                        Thu Tiền mặt
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleCollect(bill, "TRANSFER")}
                        className="btn-primary"
                      >
                        <CreditCard className="h-4 w-4" />
                        Thu Chuyển khoản
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: DAILY RECONCILIATION */}
      {activeTab === "reconciliation" && (
        <div className="space-y-4">
          <div className="clay-card p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Bảng Đối soát Tiền mặt & Chuyển khoản
                </h2>
                <p className="text-xs text-slate-600">
                  Giúp chủ trung tâm biết chính xác từng giáo viên đang cầm bao
                  nhiêu tiền mặt để bàn giao cuối ngày.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <label
                    htmlFor="recon-from"
                    className="text-xs font-bold text-slate-600"
                  >
                    Từ:
                  </label>
                  <input
                    id="recon-from"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="clay-input rounded-xl border px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="recon-to"
                    className="text-xs font-bold text-slate-600"
                  >
                    Đến:
                  </label>
                  <input
                    id="recon-to"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="clay-input rounded-xl border px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFromDate(todayStr);
                    setToDate(todayStr);
                  }}
                  className="clay-filter rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-100"
                >
                  Hôm nay
                </button>
              </div>
            </div>

            {/* Collector Breakdown Table */}
            <div className="mt-4">
              {rangeSummary.byCollector.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-600">
                  Chưa có giao dịch thu học phí nào trong khoảng ngày{" "}
                  <strong>{rangeSummary.fromDate}</strong> đến{" "}
                  <strong>{rangeSummary.toDate}</strong>.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-brand-50/70 text-xs font-extrabold uppercase text-brand-900">
                      <tr>
                        <th className="px-4 py-3">Người thu</th>
                        <th className="px-4 py-3 text-right">
                          Tiền mặt đang giữ (Cần bàn giao)
                        </th>
                        <th className="px-4 py-3 text-right">
                          Chuyển khoản đã xác nhận
                        </th>
                        <th className="px-4 py-3 text-right">Tổng cộng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rangeSummary.byCollector.map((row) => (
                        <tr key={row.collectorId}>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-brand-700" />
                              <span>{row.collectorName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                            {formatCurrencyVnd(row.cashAmount)}{" "}
                            <span className="text-xs font-normal text-slate-600">
                              ({row.cashCount} HĐ)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-brand-800">
                            {formatCurrencyVnd(row.transferAmount)}{" "}
                            <span className="text-xs font-normal text-slate-600">
                              ({row.transferCount} HĐ)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {formatCurrencyVnd(row.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-extrabold text-slate-900">
                      <tr>
                        <td className="px-4 py-3">
                          Tổng cộng ({rangeSummary.grandTotalCount} hóa đơn)
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-800">
                          {formatCurrencyVnd(rangeSummary.totalCashAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-brand-900">
                          {formatCurrencyVnd(rangeSummary.totalTransferAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrencyVnd(rangeSummary.grandTotalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Matching Transactions List */}
          {rangeSummary.matchingEntries.length > 0 && (
            <div className="clay-card p-4 sm:p-5">
              <h3 className="text-sm font-extrabold text-slate-900">
                Chi tiết các phiếu thu trong khoảng ngày (
                {rangeSummary.matchingEntries.length})
              </h3>
              <div className="mt-3 divide-y divide-slate-100">
                {rangeSummary.matchingEntries.map((item) => {
                  const fullBill = paidBills.find((b) => b.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.studentName}{" "}
                          <span className="text-xs font-semibold text-brand-700">
                            • {item.className} (Kỳ #{item.cycleNumber})
                          </span>
                        </p>
                        <p className="text-xs text-slate-600">
                          Thực hiện bởi: {item.collectedByName} –{" "}
                          {formatDateTimeVn(item.paidAtIso)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-extrabold text-slate-900">
                            {formatCurrencyVnd(item.finalAmount)}
                          </p>
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold",
                              item.paymentMethod === "CASH"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-brand-100 text-brand-800"
                            )}
                          >
                            {item.paymentMethod === "CASH"
                              ? "Tiền mặt"
                              : "Chuyển khoản"}
                          </span>
                        </div>

                        {fullBill && (
                          <button
                            type="button"
                            onClick={() => setRevertTarget(fullBill)}
                            className="btn-danger"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Hủy thu
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAID HISTORY */}
      {activeTab === "paid" && (
        <div className="space-y-3">
          {filteredPaid.length === 0 ? (
            <div className="clay-card p-8 text-center text-sm text-slate-600">
              Chưa có hóa đơn đã thu nào khớp bộ lọc.
            </div>
          ) : (
            filteredPaid.map((bill) => (
              <div
                key={bill.id}
                data-testid="paid-bill-card"
                className="clay-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Đã thu •{" "}
                        {bill.paymentMethod === "CASH"
                          ? "Tiền mặt"
                          : "Chuyển khoản"}
                      </span>
                      <span className="text-xs font-semibold text-brand-800">
                        {bill.className} • Kỳ #{bill.cycleNumber}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-extrabold text-slate-900">
                      {bill.studentName}{" "}
                      <span className="font-mono text-xs font-normal text-slate-600">
                        ({bill.studentUsername})
                      </span>
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Thực hiện bởi: {bill.collectedByName ?? "Giáo viên"} –{" "}
                      {formatDateTimeVn(bill.paidAtIso)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-emerald-800">
                      {formatCurrencyVnd(bill.finalAmount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setRevertTarget(bill)}
                      className="btn-danger"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Hoàn tác
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Adjust Tuition Modal */}
      <ModalDialog
        open={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title={`Điều chỉnh Học phí – ${adjustTarget?.studentName ?? ""}`}
        description={
          adjustTarget
            ? `${adjustTarget.className} • Kỳ #${adjustTarget.cycleNumber}`
            : undefined
        }
      >
        {adjustTarget && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1">
              <p>
                Mức cơ sở ({adjustTarget.billableSessions} buổi):{" "}
                <strong>{formatCurrencyVnd(adjustTarget.baseAmount)}</strong>
              </p>
              <p>
                Khấu trừ nghỉ có phép ({adjustTarget.excusedAbsentCount} buổi):{" "}
                <strong>-{formatCurrencyVnd(adjustTarget.deductedAmount)}</strong>
              </p>
            </div>

            <div>
              <label
                htmlFor="adj-amount-input"
                className="mb-1 block text-sm font-bold text-slate-700"
              >
                Số tiền điều chỉnh (VNĐ, nhập số âm để giảm phí)
              </label>
              <input
                id="adj-amount-input"
                type="number"
                step={1000}
                required
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="VD: -50000 (giảm 50k) hoặc 50000 (phụ thu)"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold"
              />
              <p className="mt-1 text-xs font-semibold text-brand-800">
                Thực thu sau điều chỉnh:{" "}
                {formatCurrencyVnd(
                  Math.max(
                    0,
                    adjustTarget.baseAmount -
                      adjustTarget.deductedAmount +
                      (Number(adjAmount) || 0)
                  )
                )}
              </p>
            </div>

            <div>
              <label
                htmlFor="adj-note-input"
                className="mb-1 block text-sm font-bold text-slate-700"
              >
                Lý do điều chỉnh
              </label>
              <input
                id="adj-note-input"
                type="text"
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                placeholder="VD: Giảm 10% anh chị em ruột học cùng trung tâm"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="btn-soft"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary"
              >
                Lưu điều chỉnh
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Revert Paid Bill Modal */}
      <ModalDialog
        open={Boolean(revertTarget)}
        onClose={() => setRevertTarget(null)}
        title="Xác nhận hủy thu / hoàn tác hóa đơn?"
        description="Hóa đơn sẽ trở lại trạng thái Chưa đóng và thao tác này được ghi nhận vào Nhật ký hoạt động (Audit Log)."
      >
        {revertTarget && (
          <form onSubmit={handleRevertSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="revert-reason-input"
                className="mb-1 block text-sm font-bold text-slate-700"
              >
                Lý do hoàn tác
              </label>
              <input
                id="revert-reason-input"
                type="text"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="VD: Bấm nhầm học sinh hoặc nhầm hình thức thanh toán"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevertTarget(null)}
                className="btn-soft"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-danger"
              >
                Xác nhận hủy thu
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* VietQR Modal */}
      <ModalDialog
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        title={`Mã VietQR – ${qrTarget?.studentName ?? ""}`}
        description="Phụ huynh mở ứng dụng ngân hàng bất kỳ để quét mã điền sẵn số tiền và nội dung."
      >
        {qrTarget && bankConfig.bankBin && bankConfig.bankAccountNo && (
          <div className="flex flex-col items-center space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={buildVietQrImageUrl({
                bankBin: bankConfig.bankBin,
                bankAccountNo: bankConfig.bankAccountNo,
                bankAccountName: bankConfig.bankAccountName,
                amount: qrTarget.finalAmount,
                transferNote: buildVietQrTransferNote({
                  cycleNumber: qrTarget.cycleNumber,
                  studentName: qrTarget.studentName,
                  className: qrTarget.className,
                }),
              })}
              alt={`VietQR của ${qrTarget.studentName}`}
              className="clay-card w-full max-w-[260px]  p-2"
            />
            <div className="w-full rounded-2xl bg-brand-50 p-3.5 text-center text-xs text-brand-950">
              <p className="font-bold">
                Số tiền: {formatCurrencyVnd(qrTarget.finalAmount)}
              </p>
              <p className="mt-1">
                Nội dung CK:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">
                  {buildVietQrTransferNote({
                    cycleNumber: qrTarget.cycleNumber,
                    studentName: qrTarget.studentName,
                    className: qrTarget.className,
                  })}
                </code>
              </p>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
