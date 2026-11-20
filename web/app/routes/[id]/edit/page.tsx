import { notFound } from "next/navigation";
import { RouteBuilder } from "@/components/RouteBuilder";
import { PageHeader } from "@/components/ui";
import { isStopType } from "@/lib/constants";
import { formatDate, localDateString } from "@/lib/dates";
import { db } from "@/lib/db";

const placeSelect = { id: true, name: true, address: true, city: true } as const;

export default async function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [route, drivers, vendors, customers] = await Promise.all([
    db.route.findUnique({ where: { id }, include: { stops: { orderBy: { order: "asc" } } } }),
    db.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    db.vendor.findMany({ orderBy: { name: "asc" }, select: placeSelect }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: placeSelect }),
  ]);
  if (!route) notFound();

  return (
    <>
      <PageHeader title="Edit route" subtitle={`${route.name ?? "Route"}, ${formatDate(route.date)}`} />
      <RouteBuilder
        drivers={drivers}
        vendors={vendors}
        customers={customers}
        defaultDate={localDateString()}
        initial={{
          routeId: route.id,
          driverId: route.driverId,
          date: route.date,
          name: route.name ?? "",
          stops: route.stops.flatMap((stop) => {
            const placeId = stop.vendorId ?? stop.customerId;
            if (!placeId || !isStopType(stop.type)) return [];
            return [{ id: stop.id, type: stop.type, placeId, status: stop.status }];
          }),
        }}
      />
    </>
  );
}
