import { and, eq, gte, sql } from "drizzle-orm";
import { Banknote, Shield } from "lucide-react";
import { db } from "@/db";
import { tuitionRecords } from "@/db/schema";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { requireAuth } from "@/lib/auth";
import { formatCurrencyVnd } from "@/lib/utils";

export default async function PersonalAccountPage() {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [cashToday] = await db
    .select({
      totalCash: sql<number>`coalesce(sum(${tuitionRecords.finalAmount}), 0)::int`,
      billCount: sql<number>`count(*)::int`,
    })
    .from(tuitionRecords)
    .where(
      and(
        eq(tuitionRecords.collectedByUserId, user.id),
        eq(tuitionRecords.isPaid, true),
        eq(tuitionRecords.paymentMethod, "CASH"),
        gte(tuitionRecords.paidAt, startOfToday)
      )
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tài khoản cá nhân</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          {user.fullName} ({user.username}) • Vai trò:{" "}
          {user.role === "ADMIN"
            ? "Chủ trung tâm (Admin kiêm Giáo viên)"
            : "Giáo viên đứng lớp"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Cash Handover Card */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-900">
            <Banknote className="h-5 w-5" />
            <h2 className="text-base font-bold">
              Tiền mặt tôi đã thu hôm nay
            </h2>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-950">
            {formatCurrencyVnd(cashToday?.totalCash ?? 0)}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Từ {cashToday?.billCount ?? 0} hóa đơn thu tiền mặt trực tiếp trong
            ngày hôm nay (dùng để đối chiếu bàn giao cuối ngày).
          </p>
        </div>

        {/* Password Change Card */}
        <div className="clay-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <Shield className="h-5 w-5 text-brand-700" />
            <h2 className="text-base font-bold">Đổi mật khẩu đăng nhập</h2>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
