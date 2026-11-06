import Image from "next/image";
import { cn } from "@/lib/utils";

export function HeroBanner({
  emoji,
  illustration,
  title,
  subtitle,
  action,
  className,
}: {
  emoji: string;
  illustration?: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("clay-banner hero-layout", className)}>
      <div className="hero-art" aria-hidden="true">
        {illustration ? (
          <Image src={illustration} alt="" width={720} height={480}
            sizes="(max-width: 639px) 104px, 300px" priority />
        ) : (
          <div className="hero-emoji">{emoji}</div>
        )}
      </div>
      <div className="hero-copy">
        <p className="mb-2 text-xs font-extrabold tracking-wider text-brand-900">
          CÙNG NHAU TIẾN BỘ
        </p>
        <h1 className="text-xl font-extrabold leading-tight text-brand-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-lg text-sm font-semibold text-slate-700">
          {subtitle}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </section>
  );
}
