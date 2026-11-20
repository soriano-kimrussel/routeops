import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHeader, ProgressBar, StatusBadge, TypeBadge } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatGallons, summarizeStops } from "@/lib/routes";
import { photoUrl } from "@/lib/uploads";
import { deleteRoute } from "../actions";

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const route = await db.route.findUnique({
    where: { id },
    include: {
      driver: true,
      stops: { orderBy: { order: "asc" }, include: { vendor: true, customer: true } },
    },
  });
  if (!route) notFound();

  const summary = summarizeStops(route.stops);
  const syncLogs = await db.syncLog.findMany({
    where: { stopId: { in: route.stops.map((stop) => stop.id) } },
    orderBy: { receivedAt: "desc" },
    take: 15,
  });
  const stopNumber = new Map(route.stops.map((stop) => [stop.id, stop.order]));

  return (
    <>
      <PageHeader
        title={route.name ?? "Route"}
        subtitle={
          <>
            {formatDate(route.date)} · {route.driver.name} ({route.driver.code})
          </>
        }
        action={
          <div className="flex items-center gap-2">
            <Link href={`/routes/${route.id}/edit`} className="btn btn-secondary">Edit route</Link>
            <form action={deleteRoute.bind(null, route.id)}>
              <ConfirmButton message="Delete this route and all of its stops?">Delete</ConfirmButton>
            </form>
          </div>
        }
      />

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Stat label="Completed" value={`${summary.completed} of ${summary.total}`} />
            <Stat label="Skipped" value={String(summary.skipped)} />
            <Stat label="Pending" value={String(summary.pending)} />
            <Stat label="Gallons collected" value={formatGallons(summary.gallons)} />
          </div>
          <AutoRefresh />
        </div>
        <div className="mt-4">
          <ProgressBar done={summary.done} total={summary.total} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th w-10">#</th>
              <th className="th">Stop</th>
              <th className="th">Status</th>
              <th className="th text-right">Gallons</th>
              <th className="th">Photo</th>
              <th className="th">Driver note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {route.stops.map((stop) => {
              const place = stop.vendor ?? stop.customer;
              const photo = photoUrl(stop.photoPath);
              return (
                <tr key={stop.id}>
                  <td className="td text-slate-500 tabular-nums">{stop.order}</td>
                  <td className="td">
                    <div className="font-medium">{place?.name ?? "Unknown"}</div>
                    <div className="text-xs text-slate-500">
                      {place?.address}, {place?.city}
                    </div>
                    <div className="mt-1.5">
                      <TypeBadge type={stop.type} />
                    </div>
                  </td>
                  <td className="td">
                    <StatusBadge status={stop.status} />
                    {stop.completedAt ? (
                      <div className="mt-1 text-xs text-slate-500">{formatTime(stop.completedAt)}</div>
                    ) : null}
                  </td>
                  <td className="td text-right tabular-nums">{formatGallons(stop.gallonsCollected)}</td>
                  <td className="td">
                    {photo ? (
                      <a href={photo} target="_blank" rel="noreferrer" title="Open full size">
                        {/* eslint-disable-next-line @next/next/no-img-element -- served from local uploads, not optimizable */}
                        <img
                          src={photo}
                          alt={`Photo for stop ${stop.order}, ${place?.name ?? ""}`}
                          className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                        />
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="td max-w-xs text-slate-700">
                    {stop.note ?? <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold">Sync activity from the mobile app</h2>
      {syncLogs.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing received from the field for this route yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Received</th>
                <th className="th">Stop</th>
                <th className="th">Recorded on phone</th>
                <th className="th">Action id</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {syncLogs.map((log) => (
                <tr key={log.id}>
                  <td className="td">{formatTime(log.receivedAt)}</td>
                  <td className="td">#{stopNumber.get(log.stopId) ?? "?"}</td>
                  <td className="td">{formatTime(log.clientCreatedAt)}</td>
                  <td className="td font-mono text-xs text-slate-500">{log.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
