import type { ReactNode } from "react";
import { stopTypeLabel } from "@/lib/constants";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  completed: "bg-emerald-100 text-emerald-800",
  skipped: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? STATUS_STYLES.pending
      }`}
    >
      {status}
    </span>
  );
}

const TYPE_STYLES: Record<string, string> = {
  pickup: "bg-sky-100 text-sky-800",
  grease_trap: "bg-violet-100 text-violet-800",
  hood_cleaning: "bg-orange-100 text-orange-800",
};

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${
        TYPE_STYLES[type] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {stopTypeLabel(type)}
    </span>
  );
}

/** Progress of a route: stops that are completed or skipped count as done. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card px-6 py-10 text-center text-sm text-slate-500">{children}</div>
  );
}
