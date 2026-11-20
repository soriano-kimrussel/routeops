import Link from "next/link";
import { PartyTable } from "@/components/PartyTable";
import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";

export default async function CustomersPage() {
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { stops: true } } },
  });

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Sites we run grease-trap and hood-cleaning jobs for."
        action={<Link href="/customers/new" className="btn btn-primary">New customer</Link>}
      />
      <PartyTable rows={customers} basePath="/customers" emptyText="No customers yet. Add the first one." />
    </>
  );
}
