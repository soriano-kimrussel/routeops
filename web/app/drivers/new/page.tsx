import { DriverForm } from "@/components/DriverForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { createDriver } from "../actions";

export default async function NewDriverPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <PageHeader title="New driver" />
      <ErrorBanner message={error} />
      <DriverForm action={createDriver} submitLabel="Create driver" />
    </>
  );
}
