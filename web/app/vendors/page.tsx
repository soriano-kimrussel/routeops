import Link from "next/link";
import { PartyTable } from "@/components/PartyTable";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export default async function VendorsPage() {
  const vendors = await db.vendor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { stops: true } } },
  });

  return (
    <>
      <PageHeader
        title="Vendors"
        subtitle="Restaurants and kitchens we collect used cooking oil from."
        action={<Link href="/vendors/new" className="btn btn-primary">New vendor</Link>}
      />
      <PartyTable rows={vendors} basePath="/vendors" emptyText="No vendors yet. Add the first one." />
    </>
  );
}
