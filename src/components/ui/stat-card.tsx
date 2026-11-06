import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PastelTone =
  | "lavender"
  | "pink"
  | "butter"
  | "sky"
  | "mint"
  | "peach";

const TONES: Record<PastelTone, { card: string; chip: string }> = {
  lavender: { card: "bg-pastel-lavender", chip: "bg-icon-lavender" },
  pink: { card: "bg-pastel-pink", chip: "bg-icon-pink" },
  butter: { card: "bg-pastel-butter", chip: "bg-icon-butter" },
  sky: { card: "bg-pastel-sky", chip: "bg-icon-sky" },
  mint: { card: "bg-pastel-mint", chip: "bg-icon-mint" },
  peach: { card: "bg-pastel-peach", chip: "bg-icon-peach" },
};

export function StatCard({
  tone,
  icon: Icon,
  label,
  value,
  hint,
  hintTone = "neutral",
}: {
  tone: PastelTone;
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  hintTone?: "good" | "bad" | "neutral";
}) {
  const t = TONES[tone];
  return (
    <div className={cn("stat-card p-4 sm:p-5", t.card)}>
      <span className={cn("icon-chip", t.chip)} aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs font-bold text-slate-600">{label}</p>
      <p className="mt-0.5 text-3xl font-extrabold leading-tight text-brand-950">
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-0.5 text-xs font-bold",
            hintTone === "good"
              ? "text-success-ink"
              : hintTone === "bad"
              ? "text-danger-ink"
              : "text-slate-600"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
