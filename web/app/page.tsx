import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RouteCard } from "@/components/RouteCard";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate, localDateString } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatGallons, summarizeStops } from "@/lib/routes";

export default async function DashboardPage() {
  const today = localDateString();
  const routes = await db.route.findMany({
    where: { date: today },
    orderBy: { createdAt: "asc" },
    include: {
      driver: { select: { name: true } },
      stops: { select: { status: true, gallonsCollected: true } },
    },
  });

  const totals = summarizeStops(routes.flatMap((route) => route.stops));

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={formatDate(today)}
        action={
          <div className="flex items-center gap-4">
            <AutoRefresh />
            <Link href="/routes/new" className="btn btn-primary">Build a route</Link>
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Routes out today" value={String(routes.length)} />
        <StatTile label="Stops done" value={`${totals.done} / ${totals.total}`} />
        <StatTile label="Stops pending" value={String(totals.pending)} />
        <StatTile label="Gallons collected" value={formatGallons(totals.gallons)} />
      </div>

      <h2 className="mb-3 text-sm font-semibold">Today&apos;s routes</h2>
      {routes.length === 0 ? (
        <EmptyState>
          No routes scheduled for today.{" "}
          <Link href="/routes/new" className="font-medium text-emerald-700 hover:underline">
            Build one
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      )}
    </>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
