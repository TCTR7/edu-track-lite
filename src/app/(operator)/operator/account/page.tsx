import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { requireAuth } from "@/lib/auth";

export default async function OperatorAccountPage() {
  const user = await requireAuth(["OPERATOR"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Tài khoản Hệ thống
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Quản lý bảo mật cho tài khoản Operator ({user.username})
        </p>
      </div>

      <div className="max-w-lg clay-card p-5 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Đổi mật khẩu Operator
        </h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
