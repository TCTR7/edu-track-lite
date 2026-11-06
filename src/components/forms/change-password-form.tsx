"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import {
  changeOwnPasswordAction,
  type ActionState,
} from "@/actions/auth-actions";

const initialState: ActionState = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changeOwnPasswordAction,
    initialState
  );
  const [showPass, setShowPass] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="clay-notice clay-notice-danger px-4 py-3 text-sm font-medium"
        >
          {state.error}
        </div>
      )}
      {state.success && (
        <div
          role="status"
          aria-live="polite"
          className="clay-notice clay-notice-success px-4 py-3 text-sm font-medium"
        >
          {state.success}
        </div>
      )}

      <div>
        <label
          htmlFor="currentPassword"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Mật khẩu hiện tại
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type={showPass ? "text" : "password"}
          required
          autoComplete="current-password"
          className="clay-input w-full rounded-xl border px-3.5 py-2.5"
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Mật khẩu mới (tối thiểu 6 ký tự)
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showPass ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            className="clay-input w-full rounded-xl border py-2.5 pl-3.5 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-pressed={showPass}
            aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {showPass ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Nhập lại mật khẩu mới
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPass ? "text" : "password"}
          required
          minLength={6}
          autoComplete="new-password"
          className="clay-input w-full rounded-xl border px-3.5 py-2.5"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary"
      >
        <KeyRound className="h-4 w-4" />
        {isPending ? "Đang cập nhật..." : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}
