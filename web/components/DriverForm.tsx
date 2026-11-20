import Link from "next/link";

export function DriverForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (form: FormData) => Promise<void>;
  defaults?: { name?: string; code?: string; phone?: string | null };
  submitLabel: string;
}) {
  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" required className="input" defaultValue={defaults?.name ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="code">Driver code</label>
          <input
            id="code"
            name="code"
            required
            placeholder="D-104"
            className="input uppercase"
            defaultValue={defaults?.code ?? ""}
          />
          <p className="mt-1 text-xs text-slate-500">The driver types this to sign in on the mobile app.</p>
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className="input" defaultValue={defaults?.phone ?? ""} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
        <Link href="/drivers" className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
