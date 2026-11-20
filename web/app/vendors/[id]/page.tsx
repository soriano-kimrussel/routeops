import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PartyForm } from "@/components/PartyForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { deleteVendor, updateVendor } from "../actions";

export default async function EditVendorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const vendor = await db.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  return (
    <>
      <PageHeader
        title={vendor.name}
        subtitle="Edit vendor"
        action={
          <form action={deleteVendor.bind(null, vendor.id)}>
            <ConfirmButton message={`Delete ${vendor.name}?`}>Delete vendor</ConfirmButton>
          </form>
        }
      />
      <ErrorBanner message={error} />
      <PartyForm
        action={updateVendor.bind(null, vendor.id)}
        defaults={vendor}
        submitLabel="Save changes"
        cancelHref="/vendors"
      />
    </>
  );
}
