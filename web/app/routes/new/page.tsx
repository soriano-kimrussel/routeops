import { RouteBuilder } from "@/components/RouteBuilder";
import { PageHeader } from "@/components/ui";
import { localDateString } from "@/lib/dates";
import { db } from "@/lib/db";

const placeSelect = { id: true, name: true, address: true, city: true } as const;

export default async function NewRoutePage() {
  const [drivers, vendors, customers] = await Promise.all([
    db.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    db.vendor.findMany({ orderBy: { name: "asc" }, select: placeSelect }),
    db.customer.findMany({ orderBy: { name: "asc" }, select: placeSelect }),
  ]);

  return (
    <>
      <PageHeader title="Build a route" subtitle="Pick a driver and a date, then add stops in the order they should be visited." />
      <RouteBuilder drivers={drivers} vendors={vendors} customers={customers} defaultDate={localDateString()} />
    </>
  );
}
