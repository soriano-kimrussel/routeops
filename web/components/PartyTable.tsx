import Link from "next/link";
import { EmptyState } from "./ui";

type Row = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string;
  city: string;
  _count: { stops: number };
};

/** List table shared by vendors and customers. */
export function PartyTable({ rows, basePath, emptyText }: { rows: Row[]; basePath: string; emptyText: string }) {
  if (rows.length === 0) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="th">Name</th>
            <th className="th">Contact</th>
            <th className="th">Address</th>
            <th className="th text-right">Stops</th>
            <th className="th" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="td font-medium">{row.name}</td>
              <td className="td text-slate-600">
                <div>{row.contactName ?? "—"}</div>
                {row.phone ? <div className="text-xs text-slate-500">{row.phone}</div> : null}
              </td>
              <td className="td text-slate-600">
                <div>{row.address}</div>
                <div className="text-xs text-slate-500">{row.city}</div>
              </td>
              <td className="td text-right text-slate-600 tabular-nums">{row._count.stops}</td>
              <td className="td text-right">
                <Link href={`${basePath}/${row.id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
