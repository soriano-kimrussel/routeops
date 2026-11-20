import { PartyForm } from "@/components/PartyForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { createVendor } from "../actions";

export default async function NewVendorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <PageHeader title="New vendor" />
      <ErrorBanner message={error} />
      <PartyForm action={createVendor} submitLabel="Create vendor" cancelHref="/vendors" />
    </>
  );
}
