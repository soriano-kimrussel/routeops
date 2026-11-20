import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { formatGallons, summarizeStops } from "@/lib/routes";
import { ProgressBar } from "./ui";

type RouteCardData = {
  id: string;
  name: string | null;
  date: string;
  driver: { name: string };
  stops: { status: string; gallonsCollected: number | null }[];
};

export function RouteCard({ route, showDate = false }: { route: RouteCardData; showDate?: boolean }) {
  const summary = summarizeStops(route.stops);

  return (
    <Link href={`/routes/${route.id}`} className="card block p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{route.name ?? "Route"}</div>
          <div className="text-sm text-slate-500">
            {route.driver.name}
            {showDate ? ` · ${formatDate(route.date)}` : ""}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm">
          <div className="font-semibold tabular-nums">
            {summary.done} / {summary.total}
          </div>
          <div className="text-xs text-slate-500">stops done</div>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar done={summary.done} total={summary.total} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{summary.completed} completed</span>
        <span>{summary.skipped} skipped</span>
        <span>{summary.pending} pending</span>
        <span className="ml-auto font-medium text-slate-700">{formatGallons(summary.gallons)}</span>
      </div>
    </Link>
  );
}
