"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  BookOpen,
  Building2,
  Check,
  Copy,
  KeyRound,
  Lock,
  Plus,
  Unlock,
  Users,
} from "lucide-react";
import {
  createCenterWithAdminAction,
  resetCenterAdminPasswordAction,
  toggleCenterStatusAction,
  type OperatorCenterActionState,
} from "@/actions/operator-actions";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { cn, formatDateTimeVn } from "@/lib/utils";

export interface OperatorCenterSummary {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  adminUser: {
    id: string;
    fullName: string;
    username: string;
  } | null;
  classCount: number;
  studentCount: number;
}

const initialState: OperatorCenterActionState = {};

export function OperatorCentersClient({
  centersList,
  appUrl,
}: {
  centersList: OperatorCenterSummary[];
  appUrl: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createCenterWithAdminAction,
    initialState
  );
  const [isMutating, startTransition] = useTransition();
  const [credentialBanner, setCredentialBanner] = useState<{
    title: string;
    username: string;
    plainPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.generatedCredentials) {
      setCreateOpen(false);
      setCredentialBanner({
        title: `Tài khoản Admin cho "${state.generatedCredentials.centerName}"`,
        username: state.generatedCredentials.username,
        plainPassword: state.generatedCredentials.plainPassword,
      });
    }
  }, [state.generatedCredentials]);

  const copyCredentials = async (username: string, plainPassword: string) => {
    const text = [
      `Thông tin quản trị EduTrack Lite:`,
      `- Link đăng nhập: ${appUrl}/login`,
      `- Tên đăng nhập: ${username}`,
      `- Mật khẩu: ${plainPassword}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Danh sách Trung tâm
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Quản lý đơn vị thuê bao và tài khoản Admin đại diện
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Tạo Trung tâm mới
        </button>
      </div>

      {/* Credential Alert Banner */}
      {credentialBanner && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{credentialBanner.title}</p>
              <p className="mt-1">
                Username:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {credentialBanner.username}
                </code>{" "}
                • Mật khẩu:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {credentialBanner.plainPassword}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyCredentials(
                  credentialBanner.username,
                  credentialBanner.plainPassword
                )
              }
              className="btn-primary"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Đã copy gửi Zalo
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy thông tin đăng nhập
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard tone="lavender" icon={Building2} label="Tổng trung tâm" value={centersList.length} />
        <StatCard tone="mint" icon={Unlock} label="Đang hoạt động" value={centersList.filter((c) => c.isActive).length} hintTone="good" hint="Đang cho phép đăng nhập" />
        <StatCard tone="butter" icon={BookOpen} label="Tổng số Ca học" value={centersList.reduce((acc, c) => acc + c.classCount, 0)} />
        <StatCard tone="sky" icon={Users} label="Tổng Học sinh" value={centersList.reduce((acc, c) => acc + c.studentCount, 0)} />
      </div>

      {/* Centers List */}
      <div className="space-y-3">
        {centersList.map((center) => (
          <div
            key={center.id}
            data-testid="center-card"
            className={cn(
              "clay-card p-4 transition sm:p-5",
              center.isActive
                ? "border-slate-200"
                : "border-red-200 bg-red-50/30"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Building2 className="h-5 w-5 text-brand-700" />
                  <h2 className="text-base font-bold text-slate-900">
                    {center.name}
                  </h2>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      center.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {center.isActive ? "Đang hoạt động" : "Đã khóa toàn TT"}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Admin:{" "}
                  <span className="font-medium text-slate-900">
                    {center.adminUser?.fullName ?? "Chưa có"}
                  </span>{" "}
                  {center.adminUser && (
                    <span className="text-slate-600">
                      ({center.adminUser.username})
                    </span>
                  )}
                  {center.phone ? ` • SĐT: ${center.phone}` : ""}
                </p>
                <p className="text-xs text-slate-600">
                  Quy mô: {center.classCount} ca học • {center.studentCount} học
                  sinh • Tạo lúc {formatDateTimeVn(center.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {center.adminUser && (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await resetCenterAdminPasswordAction(
                          center.id,
                          center.adminUser!.id
                        );
                        if (res.ok && res.username && res.plainPassword) {
                          setCredentialBanner({
                            title: `Đã cấp lại mật khẩu Admin cho "${center.name}"`,
                            username: res.username,
                            plainPassword: res.plainPassword,
                          });
                        }
                      });
                    }}
                    className="btn-soft"
                  >
                    <KeyRound className="h-4 w-4" />
                    Reset MK Admin
                  </button>
                )}

                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => {
                    startTransition(async () => {
                      await toggleCenterStatusAction(
                        center.id,
                        !center.isActive
                      );
                    });
                  }}
                  className={cn(
                    "gap-1.5",
                    center.isActive
                      ? "btn-danger"
                      : "btn-success"
                  )}
                >
                  {center.isActive ? (
                    <>
                      <Lock className="h-4 w-4" /> Khóa trung tâm
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" /> Mở khóa
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Center Modal */}
      <ModalDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo Trung tâm & Tài khoản Admin"
        description="Cấp không gian làm việc mới cho chủ trung tâm hoặc giáo viên dạy cá nhân."
      >
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="clay-notice clay-notice-danger px-3.5 py-2.5 text-sm"
            >
              {state.error}
            </div>
          )}

          <div>
            <label
              htmlFor="centerName"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Tên Trung tâm / Lớp dạy thêm *
            </label>
            <input
              id="centerName"
              name="centerName"
              type="text"
              required
              autoFocus
              placeholder="VD: Lớp Toán Cô Lan"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Số điện thoại liên hệ
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="VD: 0909123456"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>

          <div>
            <label
              htmlFor="adminFullName"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Họ và tên Chủ trung tâm (Admin) *
            </label>
            <input
              id="adminFullName"
              name="adminFullName"
              type="text"
              required
              placeholder="VD: Nguyễn Thị Lan"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="adminUsername"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Username Admin *
              </label>
              <input
                id="adminUsername"
                name="adminUsername"
                type="text"
                required
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="VD: colan_admin"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5"
              />
            </div>

            <div>
              <label
                htmlFor="adminPassword"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Mật khẩu (để trống = tự sinh)
              </label>
              <input
                id="adminPassword"
                name="adminPassword"
                type="text"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Tự sinh 6 ký tự"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="btn-soft"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? "Đang tạo..." : "Tạo Trung tâm"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
