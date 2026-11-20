import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DriverForm } from "@/components/DriverForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { deleteDriver, updateDriver } from "../actions";

export default async function EditDriverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const driver = await db.driver.findUnique({ where: { id } });
  if (!driver) notFound();

  return (
    <>
      <PageHeader
        title={driver.name}
        subtitle="Edit driver"
        action={
          <form action={deleteDriver.bind(null, driver.id)}>
            <ConfirmButton message={`Delete ${driver.name}?`}>Delete driver</ConfirmButton>
          </form>
        }
      />
      <ErrorBanner message={error} />
      <DriverForm action={updateDriver.bind(null, driver.id)} defaults={driver} submitLabel="Save changes" />

      <div className="card mt-6 max-w-2xl p-6">
        <h2 className="text-sm font-semibold">Mobile API token</h2>
        <p className="mt-1 text-sm text-slate-500">
          The mobile app receives this token when the driver signs in with their code, and sends it as a
          bearer token on every request.
        </p>
        <code className="mt-3 block overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
          {driver.token}
        </code>
      </div>
    </>
  );
}
