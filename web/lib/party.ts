import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";

/**
 * Vendors and customers share the same shape (a named place with a contact and
 * an address), so their forms and CRUD logic live here once.
 */
export type PartyKind = "vendor" | "customer";

export type PartyInput = {
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string;
  city: string;
  notes: string | null;
};

export const PARTY_META: Record<PartyKind, { path: string; singular: string; plural: string }> = {
  vendor: { path: "/vendors", singular: "vendor", plural: "Vendors" },
  customer: { path: "/customers", singular: "customer", plural: "Customers" },
};

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export function parsePartyForm(
  form: FormData,
): { ok: true; data: PartyInput } | { ok: false; error: string } {
  const name = text(form, "name");
  const address = text(form, "address");
  const city = text(form, "city");
  if (!name) return { ok: false, error: "Name is required." };
  if (!address) return { ok: false, error: "Street address is required." };
  if (!city) return { ok: false, error: "City is required." };

  return {
    ok: true,
    data: {
      name,
      address,
      city,
      contactName: text(form, "contactName") || null,
      phone: text(form, "phone") || null,
      notes: text(form, "notes") || null,
    },
  };
}

function withError(path: string, message: string): string {
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function createParty(kind: PartyKind, form: FormData): Promise<never> {
  const { path } = PARTY_META[kind];
  const parsed = parsePartyForm(form);
  if (!parsed.ok) redirect(withError(`${path}/new`, parsed.error));

  if (kind === "vendor") await db.vendor.create({ data: parsed.data });
  else await db.customer.create({ data: parsed.data });

  revalidatePath(path);
  redirect(path);
}

export async function updateParty(kind: PartyKind, id: string, form: FormData): Promise<never> {
  const { path } = PARTY_META[kind];
  const parsed = parsePartyForm(form);
  if (!parsed.ok) redirect(withError(`${path}/${id}`, parsed.error));

  if (kind === "vendor") await db.vendor.update({ where: { id }, data: parsed.data });
  else await db.customer.update({ where: { id }, data: parsed.data });

  revalidatePath(path);
  redirect(path);
}

export async function deleteParty(kind: PartyKind, id: string): Promise<never> {
  const { path, singular } = PARTY_META[kind];

  // Stops keep the history of what was collected where, so a place that has
  // been routed cannot be deleted out from under them.
  const stopCount = await db.stop.count({
    where: kind === "vendor" ? { vendorId: id } : { customerId: id },
  });
  if (stopCount > 0) {
    redirect(
      withError(
        `${path}/${id}`,
        `This ${singular} is on ${stopCount} route stop${stopCount === 1 ? "" : "s"} and cannot be deleted. Remove those stops first.`,
      ),
    );
  }

  if (kind === "vendor") await db.vendor.delete({ where: { id } });
  else await db.customer.delete({ where: { id } });

  revalidatePath(path);
  redirect(path);
}
