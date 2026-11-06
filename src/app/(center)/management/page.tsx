import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  Landmark,
  UserCheck,
  UserCircle2,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";

const MANAGEMENT_CARDS = [
  {
    href: "/management/audit-logs",
    title: "Nhật ký hoạt động (Audit Log)",
    description:
      "Theo dõi chi tiết lịch sử thu học phí, điểm danh, cộng điểm và nhập điểm kiểm tra của từng giáo viên.",
    icon: ClipboardList,
  },
  {
    href: "/management/teachers",
    title: "Quản lý Giáo viên",
    description:
      "Tạo tài khoản giáo viên mới, khóa/mở khóa hoặc cấp lại mật khẩu nhanh gửi qua Zalo.",
    icon: UserCheck,
  },
  {
    href: "/management/settings",
    title: "Cài đặt Trung tâm & VietQR",
    description:
      "Cập nhật tên trung tâm, số tài khoản ngân hàng nhận học phí (sinh mã VietQR tự động) và quy tắc làm tròn tiền.",
    icon: Landmark,
  },
  {
    href: "/account",
    title: "Tài khoản cá nhân & Đổi mật khẩu",
    description:
      "Xem số tiền mặt bạn trực tiếp thu trong ngày và thay đổi mật khẩu đăng nhập.",
    icon: UserCircle2,
  },
];

export default async function ManagementHubPage() {
  await requireAuth(["ADMIN"]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Quản trị Trung tâm
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Thiết lập hệ thống, phân quyền giáo viên và kiểm soát minh bạch
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MANAGEMENT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-start justify-between gap-4 clay-card p-4 transition hover:border-brand-600 sm:p-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="icon-chip shrink-0 bg-icon-lavender">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{card.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {card.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-600 group-hover:text-brand-700" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
