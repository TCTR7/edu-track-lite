"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginAction, type ActionState } from "@/actions/auth-actions";

const initialState: ActionState = {};

const DEMO_ACCOUNTS = [
  { label: "Operator", user: "operator", pass: "operator123" },
  { label: "Admin (Chủ TT)", user: "admin", pass: "admin123" },
  { label: "Giáo viên", user: "giaovien1", pass: "giaovien123" },
  { label: "Học sinh / PH", user: "nguyenvannam_01", pass: "nam246" },
];

export function LoginForm({ showDemoAccounts }: { showDemoAccounts: boolean }) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="w-full max-w-md clay-card p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="clay-banner mb-5 flex w-full items-center justify-center p-3" aria-hidden="true">
          <Image src="/illustrations/learning-companion.webp" alt="" width={720} height={480} sizes="180px" className="h-auto w-40" priority />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          EduTrack Lite
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Hệ thống quản lý lớp dạy thêm & theo dõi học tập tinh gọn
        </p>
      </div>

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

        <div>
          <label
            htmlFor="login-username"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Tên đăng nhập
          </label>
          <input
            id="login-username"
            name="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="Ví dụ: nguyenvannam_01"
            className="clay-input w-full rounded-xl border px-3.5 py-2.5 text-slate-900"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              enterKeyHint="done"
              placeholder="Nhập mật khẩu"
              className="clay-input w-full rounded-xl border py-2.5 pl-3.5 pr-12 text-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-describedby="login-pw-warning"
              className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-700"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
            <span id="login-pw-warning" className="visually-hidden">
              Lưu ý: thao tác này sẽ hiển thị mật khẩu trực tiếp trên màn hình.
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary mt-2 w-full"
        >
          <LogIn className="h-5 w-5" />
          {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      {showDemoAccounts && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Điền nhanh tài khoản mẫu (Môi trường Dev)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.user}
                type="button"
                onClick={() => {
                  setUsername(acc.user);
                  setPassword(acc.pass);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs transition hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="block font-semibold text-slate-800">
                  {acc.label}
                </span>
                <span className="text-slate-600">{acc.user}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
