"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Landmark,
  LogOut,
  Settings,
  UserCheck,
  UserCircle2,
  Users,
  Wallet,
} from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";
import type { UserRole } from "@/lib/jwt";
import { cn } from "@/lib/utils";

interface CenterShellProps {
  centerName: string;
  fullName: string;
  role: UserRole;
  unpaidCount: number;
  children: React.ReactNode;
}

function getInitials(fullName: string): string {
  const parts = fullName.replace(/\s*\([^)]*\)\s*$/, "").trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  return (last[0] ?? "?").toUpperCase();
}

function getShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.slice(-2).join(" ");
}

export function CenterShell({
  centerName,
  fullName,
  role,
  unpaidCount,
  children,
}: CenterShellProps) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";

  const mobileTabs = [
    {
      href: "/classes",
      label: "Ca học",
      icon: BookOpen,
      active: pathname.startsWith("/classes"),
      badge: 0,
    },
    {
      href: "/tuition",
      label: "Học phí",
      icon: Wallet,
      active: pathname.startsWith("/tuition"),
      badge: unpaidCount,
    },
    {
      href: "/students",
      label: "Học sinh",
      icon: Users,
      active: pathname.startsWith("/students"),
      badge: 0,
    },
    {
      href: "/documents",
      label: "Tài liệu",
      icon: FolderOpen,
      active: pathname.startsWith("/documents"),
      badge: 0,
    },
    isAdmin
      ? {
          href: "/management",
          label: "Quản trị",
          icon: Settings,
          active:
            pathname.startsWith("/management") ||
            pathname.startsWith("/account"),
          badge: 0,
        }
      : {
          href: "/account",
          label: "Cá nhân",
          icon: UserCircle2,
          active: pathname.startsWith("/account"),
          badge: 0,
        },
  ];

  const desktopPrimary = [
    { href: "/classes", label: "Ca học", icon: BookOpen, badge: 0 },
    {
      href: "/tuition",
      label: "Học phí & Đối soát",
      icon: Wallet,
      badge: unpaidCount,
    },
    { href: "/students", label: "Danh bạ Học sinh", icon: Users, badge: 0 },
    { href: "/documents", label: "Kho Tài liệu", icon: FolderOpen, badge: 0 },
  ];

  const desktopSecondary = isAdmin
    ? [
        {
          href: "/management/audit-logs",
          label: "Nhật ký hoạt động",
          icon: ClipboardList,
        },
        {
          href: "/management/teachers",
          label: "Quản lý Giáo viên",
          icon: UserCheck,
        },
        {
          href: "/management/settings",
          label: "Cài đặt & VietQR",
          icon: Landmark,
        },
        { href: "/account", label: "Tài khoản cá nhân", icon: UserCircle2 },
      ]
    : [{ href: "/account", label: "Tài khoản cá nhân", icon: UserCircle2 }];

  const navLinkClass = (active: boolean) =>
    cn(
      "flex min-h-12 items-center justify-between rounded-full px-4 py-2.5 text-sm font-bold transition",
      active
        ? "pill-nav-active"
        : "text-brand-950 hover:bg-white/30"
    );

  return (
    <div className="min-h-dvh bg-canvas md:flex md:gap-0">
      {/* Desktop Left Sidebar – lavender clay */}
      <aside className="sidebar-surface hidden w-72 shrink-0 flex-col rounded-r-[2rem] md:sticky md:top-0 md:flex md:h-dvh">
        <div className="flex flex-col items-center px-5 pb-3 pt-6 text-center">
          <div
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full sidebar-avatar text-3xl font-extrabold"
          >
            {getInitials(fullName)}
          </div>
          <p className="mt-3 text-lg font-extrabold text-brand-950">
            Chào, {getShortName(fullName)}! <span aria-hidden="true">👋</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand-950">
            <GraduationCap className="h-4 w-4" />
            <span className="max-w-44 truncate">{centerName}</span>
            <span aria-hidden="true">•</span>
            <span>{isAdmin ? "Admin" : "Giáo viên"}</span>
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-3">
          <nav className="space-y-1.5" aria-label="Menu vận hành">
            {desktopPrimary.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={navLinkClass(active)}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge > 0 && (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-xs font-extrabold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div>
            <p className="mb-1.5 px-4 text-xs font-extrabold uppercase tracking-wider text-brand-950">
              {isAdmin ? "Quản trị trung tâm" : "Cá nhân"}
            </p>
            <nav className="space-y-1.5" aria-label="Menu quản trị">
              {desktopSecondary.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={navLinkClass(active)}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Pink highlight card at the bottom (logout) */}
        <div className="p-4">
          <div className="stat-card rounded-3xl bg-pastel-pink p-4">
            <p className="text-sm font-extrabold text-brand-950">
              Xong việc hôm nay?
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Nhớ đối soát tiền mặt trước khi đăng xuất.
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

      {/* Mobile Top Header – lavender */}
      <header className="sidebar-surface sticky top-0 z-20 flex items-center justify-between rounded-b-3xl px-4 py-3 md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full sidebar-avatar text-lg font-extrabold"
          >
            {getInitials(fullName)}
          </div>
          <div className="min-w-0 text-brand-950">
            <p className="truncate text-sm font-extrabold">
              Chào, {getShortName(fullName)}! <span aria-hidden="true">👋</span>
            </p>
            <p className="truncate text-xs font-semibold text-brand-950">
              {centerName} • {isAdmin ? "Admin" : "GV"}
            </p>
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

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 pb-28 md:pb-10">
        <div className="mx-auto max-w-5xl p-4 sm:p-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation – floating clay bar (5 items) */}
      <nav
        aria-label="Menu điều hướng di động"
        className="clay-card fixed inset-x-3 bottom-3 z-20 grid grid-cols-5 gap-1 rounded-3xl p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-xs font-extrabold transition",
                tab.active
                  ? "pill-nav-active bg-brand-100 text-brand-800"
                  : "text-slate-500 hover:bg-brand-50"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {tab.badge > 0 && (
                  <span className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-extrabold leading-4 text-white">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </span>
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
