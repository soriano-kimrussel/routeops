"use server";

import { createParty, deleteParty, updateParty } from "@/lib/party";

export async function createVendor(form: FormData) {
  await createParty("vendor", form);
}

export async function updateVendor(id: string, form: FormData) {
  await updateParty("vendor", id, form);
}

export async function deleteVendor(id: string) {
  await deleteParty("vendor", id);
}
