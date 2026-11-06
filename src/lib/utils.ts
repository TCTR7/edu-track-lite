import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " đ";
}

export function formatDateTimeVn(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim();
}

export function calculateRoundedSessionPrice(
  tuitionPerCycle: number,
  sessionsPerCycle: number,
  roundingUnit = 1000
): number {
  if (sessionsPerCycle <= 0) return 0;
  const raw = tuitionPerCycle / sessionsPerCycle;
  if (roundingUnit <= 1) return Math.round(raw);
  return Math.round(raw / roundingUnit) * roundingUnit;
}
