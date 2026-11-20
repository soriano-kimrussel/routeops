import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export default async function DriversPage() {
  const drivers = await db.driver.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { routes: true } } },
  });

  return (
    <>
      <PageHeader
        title="Drivers"
        subtitle="Each driver signs in to the mobile app with their driver code."
        action={<Link href="/drivers/new" className="btn btn-primary">New driver</Link>}
      />
      {drivers.length === 0 ? (
        <EmptyState>No drivers yet. Add the first one.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Driver code</th>
                <th className="th">Phone</th>
                <th className="th text-right">Routes</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td className="td font-medium">{driver.name}</td>
                  <td className="td font-mono text-slate-700">{driver.code}</td>
                  <td className="td text-slate-600">{driver.phone ?? "—"}</td>
                  <td className="td text-right text-slate-600 tabular-nums">{driver._count.routes}</td>
                  <td className="td text-right">
                    <Link href={`/drivers/${driver.id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
