"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newDriverToken } from "@/lib/auth";
import { db } from "@/lib/db";

function parseDriverForm(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  // Codes are stored upper-case so sign-in on the phone is case-insensitive.
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const phone = String(form.get("phone") ?? "").trim() || null;

  if (!name) return { ok: false as const, error: "Name is required." };
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
    return { ok: false as const, error: "Driver code must be 3-20 letters, digits or dashes." };
  }
  return { ok: true as const, data: { name, code, phone } };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function withError(path: string, message: string): string {
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function createDriver(form: FormData) {
  const parsed = parseDriverForm(form);
  if (!parsed.ok) redirect(withError("/drivers/new", parsed.error));

  try {
    await db.driver.create({ data: { ...parsed.data, token: newDriverToken() } });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(withError("/drivers/new", "That driver code is already in use."));
    throw err;
  }

  revalidatePath("/drivers");
  redirect("/drivers");
}

export async function updateDriver(id: string, form: FormData) {
  const parsed = parseDriverForm(form);
  if (!parsed.ok) redirect(withError(`/drivers/${id}`, parsed.error));

  try {
    await db.driver.update({ where: { id }, data: parsed.data });
  } catch (err) {
    if (isUniqueViolation(err)) redirect(withError(`/drivers/${id}`, "That driver code is already in use."));
    throw err;
  }

  revalidatePath("/drivers");
  redirect("/drivers");
}

export async function deleteDriver(id: string) {
  const routeCount = await db.route.count({ where: { driverId: id } });
  if (routeCount > 0) {
    redirect(
      withError(
        `/drivers/${id}`,
        `This driver has ${routeCount} route${routeCount === 1 ? "" : "s"} and cannot be deleted. Delete or reassign those routes first.`,
      ),
    );
  }

  await db.driver.delete({ where: { id } });
  revalidatePath("/drivers");
  redirect("/drivers");
}
