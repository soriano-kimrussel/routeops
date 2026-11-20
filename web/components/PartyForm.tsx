import Link from "next/link";
import type { PartyInput } from "@/lib/party";

/** Create/edit form shared by vendors and customers. */
export function PartyForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (form: FormData) => Promise<void>;
  defaults?: Partial<PartyInput>;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" required className="input" defaultValue={defaults?.name ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contactName">Contact name</label>
          <input id="contactName" name="contactName" className="input" defaultValue={defaults?.contactName ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className="input" defaultValue={defaults?.phone ?? ""} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="address">Street address</label>
          <input id="address" name="address" required className="input" defaultValue={defaults?.address ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="city">City, state, ZIP</label>
          <input id="city" name="city" required className="input" defaultValue={defaults?.city ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Site notes for the driver</label>
        <textarea id="notes" name="notes" rows={3} className="input" defaultValue={defaults?.notes ?? ""} />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
        <Link href={cancelHref} className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
