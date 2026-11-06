"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Lock,
  Plus,
  Unlock,
  UserCheck,
} from "lucide-react";
import {
  createTeacherAction,
  resetTeacherPasswordAction,
  toggleTeacherStatusAction,
  type TeacherActionState,
} from "@/actions/management-actions";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { cn, formatDateTimeVn } from "@/lib/utils";

export interface TeacherItem {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  assignedClassCount: number;
}

const initialState: TeacherActionState = {};

export function TeachersClient({
  teachers,
  centerName,
  appUrl,
}: {
  teachers: TeacherItem[];
  centerName: string;
  appUrl: string;
}) {
  const [openCreate, setOpenCreate] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createTeacherAction,
    initialState
  );
  const [isMutating, startTransition] = useTransition();
  const [credentialInfo, setCredentialInfo] = useState<{
    fullName: string;
    username: string;
    plainPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.generatedCredentials) {
      setOpenCreate(false);
      setCredentialInfo(state.generatedCredentials);
    }
  }, [state.generatedCredentials]);

  const handleCopyZalo = async (info: {
    fullName: string;
    username: string;
    plainPassword: string;
  }) => {
    const msg = [
      `[${centerName}] Tài khoản giảng dạy của ${info.fullName}:`,
      `- Link đăng nhập: ${appUrl}/login`,
      `- Tên đăng nhập: ${info.username}`,
      `- Mật khẩu: ${info.plainPassword}`,
    ].join("\n");
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý Giáo viên
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Tài khoản Admin của bạn đã có sẵn 100% quyền đứng lớp. Chỉ tạo thêm
            khi trung tâm có giáo viên phụ giảng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Thêm Giáo viên
        </button>
      </div>

      {credentialInfo && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                Thông tin đăng nhập của {credentialInfo.fullName}
              </p>
              <p className="mt-1">
                Username:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {credentialInfo.username}
                </code>{" "}
                • Mật khẩu:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
                  {credentialInfo.plainPassword}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyZalo(credentialInfo)}
              className="btn-primary"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Đã copy gửi Zalo
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy gửi Zalo
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {teachers.length === 0 ? (
        <div className="clay-card   p-8 text-center">
          <UserCheck className="mx-auto h-11 w-11 text-slate-600" />
          <p className="mt-2 font-semibold text-slate-800">
            Chưa có giáo viên phụ trách riêng
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Bạn có thể tự đứng lớp bằng chính tài khoản Admin hiện tại hoặc bấm
            &ldquo;Thêm Giáo viên&rdquo; để phân công ca dạy.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map((t) => (
            <div
              key={t.id}
              className={cn(
                "clay-card p-4 sm:p-5",
                t.isActive ? "border-slate-200" : "border-red-200 bg-red-50/30"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {t.fullName}
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        t.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {t.isActive ? "Đang dạy" : "Đã khóa"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Username:{" "}
                    <span className="font-mono font-medium text-slate-800">
                      {t.username}
                    </span>
                    {t.phone ? ` • SĐT: ${t.phone}` : ""} • Đang phụ trách:{" "}
                    <span className="font-semibold text-brand-700">
                      {t.assignedClassCount} ca học
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Tạo lúc {formatDateTimeVn(t.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await resetTeacherPasswordAction(t.id);
                        if (
                          res.ok &&
                          res.fullName &&
                          res.username &&
                          res.plainPassword
                        ) {
                          setCredentialInfo({
                            fullName: res.fullName,
                            username: res.username,
                            plainPassword: res.plainPassword,
                          });
                        }
                      });
                    }}
                    className="btn-soft"
                  >
                    <KeyRound className="h-4 w-4" />
                    Reset MK
                  </button>

                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => {
                      startTransition(async () => {
                        await toggleTeacherStatusAction(t.id, !t.isActive);
                      });
                    }}
                    className={cn(
                      "gap-1.5",
                      t.isActive
                        ? "btn-danger"
                        : "btn-success"
                    )}
                  >
                    {t.isActive ? (
                      <>
                        <Lock className="h-4 w-4" /> Khóa
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
      )}

      <ModalDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Tạo Tài khoản Giáo viên"
        description="Giáo viên chỉ nhìn thấy và thao tác trên các Ca học được Admin phân công."
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
              htmlFor="teacher-fullName"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Họ và tên Giáo viên *
            </label>
            <input
              id="teacher-fullName"
              name="fullName"
              type="text"
              required
              autoFocus
              placeholder="VD: Cô Trần Thu Hà"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-phone"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Số điện thoại
            </label>
            <input
              id="teacher-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="VD: 0912345678"
              className="clay-input w-full rounded-xl border px-3.5 py-2.5"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="teacher-username"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Tên đăng nhập *
              </label>
              <input
                id="teacher-username"
                name="username"
                type="text"
                required
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="VD: cotranha"
                className="clay-input w-full rounded-xl border px-3.5 py-2.5"
              />
            </div>

            <div>
              <label
                htmlFor="teacher-password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Mật khẩu (trống = tự sinh)
              </label>
              <input
                id="teacher-password"
                name="password"
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
              onClick={() => setOpenCreate(false)}
              className="btn-soft"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
