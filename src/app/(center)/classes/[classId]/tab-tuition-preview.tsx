"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Wallet } from "lucide-react";
import { collectTuitionBillAction } from "@/actions/tuition-actions";
import { cn, formatCurrencyVnd, formatDateTimeVn } from "@/lib/utils";
import type { ClassTuitionCycleItem } from "./types";

export function TabTuitionPreview({
  classId,
  cycles,
}: {
  classId: string;
  cycles: ClassTuitionCycleItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (cycles.length === 0) {
    return (
      <div className="clay-card   p-8 text-center">
        <Wallet className="mx-auto h-11 w-11 text-brand-700" />
        <p className="mt-2 font-semibold text-slate-800">
          Ca học chưa có kỳ thu học phí nào được chốt
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Ngay khi điểm danh chạm buổi cuối của chu kỳ, bảng tính học phí tự
          động sẽ xuất hiện tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cycles.map((cycle) => {
        const unpaidCount = cycle.records.filter((r) => !r.isPaid).length;
        return (
          <div key={cycle.id} className="clay-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Kỳ thu phí #{cycle.cycleNumber}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      cycle.status === "COMPLETED" && unpaidCount === 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {unpaidCount === 0
                      ? "Đã thu đủ"
                      : `Còn ${unpaidCount} HS chưa đóng`}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  Từ ngày {cycle.startDate} đến {cycle.endDate}
                </p>
              </div>

              <Link
                href={`/tuition?classId=${classId}`}
                className="btn-primary"
              >
                Mở màn hình Thu & Đối soát
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {cycle.records.map((rec) => (
                <div
                  key={rec.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {rec.studentName}
                    </p>
                    <p className="text-xs text-slate-600">
                      Tính phí {rec.billableSessions} buổi • Nghỉ có phép:{" "}
                      {rec.excusedAbsentCount} • Tự ý:{" "}
                      {rec.unexcusedAbsentCount}
                    </p>
                    {rec.isPaid && rec.collectedByName && (
                      <p className="text-xs text-slate-600">
                        Thực hiện bởi: {rec.collectedByName} (
                        {rec.paymentMethod === "CASH"
                          ? "Tiền mặt"
                          : "Chuyển khoản"}
                        ) – {formatDateTimeVn(rec.paidAt)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        {formatCurrencyVnd(rec.finalAmount)}
                      </p>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-bold",
                          rec.isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {rec.isPaid ? "Đã đóng" : "Chưa đóng"}
                      </span>
                    </div>

                    {!rec.isPaid && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await collectTuitionBillAction({
                                recordId: rec.id,
                                paymentMethod: "CASH",
                              });
                              router.refresh();
                            });
                          }}
                          className="btn-success"
                        >
                          <Banknote className="h-3.5 w-3.5" />
                          Tiền mặt
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await collectTuitionBillAction({
                                recordId: rec.id,
                                paymentMethod: "TRANSFER",
                              });
                              router.refresh();
                            });
                          }}
                          className="btn-primary"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Chuyển khoản
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
