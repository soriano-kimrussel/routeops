"use server";

import { createParty, deleteParty, updateParty } from "@/lib/party";

export async function createCustomer(form: FormData) {
  await createParty("customer", form);
}

export async function updateCustomer(id: string, form: FormData) {
  await updateParty("customer", id, form);
}

export async function deleteCustomer(id: string) {
  await deleteParty("customer", id);
}
