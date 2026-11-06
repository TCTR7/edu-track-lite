"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut, ShieldCheck, UserCog } from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/operator/centers",
    label: "Danh sách Trung tâm",
    icon: Building2,
  },
  {
    href: "/operator/account",
    label: "Tài khoản Hệ thống",
    icon: UserCog,
  },
];

export function OperatorShell({
  fullName,
  children,
}: {
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-canvas md:flex">
      {/* Desktop Sidebar – lavender clay */}
      <aside className="sidebar-surface hidden w-72 shrink-0 flex-col rounded-r-[2rem] md:sticky md:top-0 md:flex md:h-dvh">
        <div className="flex flex-col items-center px-5 pb-3 pt-6 text-center">
          <div
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full sidebar-avatar"
          >
            <ShieldCheck className="h-9 w-9" />
          </div>
          <p className="mt-3 text-lg font-extrabold text-brand-950">
            Chào, {fullName}! <span aria-hidden="true">👋</span>
          </p>
          <p className="text-xs font-semibold text-brand-950">
            EduTrack Operator
          </p>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-3" aria-label="Menu Operator">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-bold transition",
                  active
                    ? "pill-nav-active"
                    : "text-brand-950 hover:bg-white/30"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="stat-card bg-pastel-pink p-4">
            <p className="text-sm font-extrabold text-brand-950">
              Kết thúc phiên làm việc?
            </p>
            <form action={logoutAction} className="mt-3">
              <button
                type="submit"
                className="btn-danger w-full"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sidebar-surface sticky top-0 z-20 flex items-center justify-between rounded-b-3xl px-4 py-3 md:hidden">
        <div className="flex items-center gap-3 text-brand-950">
          <div className="flex h-11 w-11 items-center justify-center rounded-full sidebar-avatar">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-extrabold">EduTrack Operator</p>
            <p className="text-xs font-semibold text-brand-950">{fullName}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Đăng xuất"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-brand-950 hover:bg-white/30"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>

      <main className="min-w-0 flex-1 pb-28 md:pb-8">
        <div className="mx-auto max-w-5xl p-4 sm:p-6">{children}</div>
      </main>

      {/* Mobile Bottom Nav – floating clay bar */}
      <nav
        aria-label="Điều hướng Operator di động"
        className="clay-card fixed inset-x-3 bottom-3 z-20 grid grid-cols-2 gap-1 rounded-3xl p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-extrabold",
                active
                  ? "pill-nav-active bg-brand-100 text-brand-800"
                  : "text-slate-600 hover:bg-brand-50"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
