import Link from "next/link";
import { RouteCard } from "@/components/RouteCard";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export default async function RoutesPage() {
  const routes = await db.route.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "asc" }],
    take: 100,
    include: {
      driver: { select: { name: true } },
      stops: { select: { status: true, gallonsCollected: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Routes"
        subtitle="Most recent first."
        action={<Link href="/routes/new" className="btn btn-primary">Build a route</Link>}
      />
      {routes.length === 0 ? (
        <EmptyState>No routes yet. Build the first one.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} showDate />
          ))}
        </div>
      )}
    </>
  );
}
