import { PartyForm } from "@/components/PartyForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { createCustomer } from "../actions";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <PageHeader title="New customer" />
      <ErrorBanner message={error} />
      <PartyForm action={createCustomer} submitLabel="Create customer" cancelHref="/customers" />
    </>
  );
}
