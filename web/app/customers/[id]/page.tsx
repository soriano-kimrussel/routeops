import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PartyForm } from "@/components/PartyForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { deleteCustomer, updateCustomer } from "../actions";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle="Edit customer"
        action={
          <form action={deleteCustomer.bind(null, customer.id)}>
            <ConfirmButton message={`Delete ${customer.name}?`}>Delete customer</ConfirmButton>
          </form>
        }
      />
      <ErrorBanner message={error} />
      <PartyForm
        action={updateCustomer.bind(null, customer.id)}
        defaults={customer}
        submitLabel="Save changes"
        cancelHref="/customers"
      />
    </>
  );
}
