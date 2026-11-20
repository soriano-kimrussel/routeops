"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStopType } from "@/lib/constants";
import { isDateString } from "@/lib/dates";
import { db } from "@/lib/db";

export type RouteInput = {
  /** Present when editing an existing route. */
  routeId?: string;
  driverId: string;
  date: string;
  name: string;
  /** In visit order. `id` is present for stops that already exist. */
  stops: { id?: string; type: string; placeId: string }[];
};

/**
 * Create or update a route from the route builder. Returns an error message
 * for the builder to show, or redirects to the route detail on success.
 */
export async function saveRoute(input: RouteInput): Promise<{ error: string }> {
  if (!isDateString(input.date)) return { error: "Pick a valid date." };
  if (input.stops.length === 0) return { error: "Add at least one stop." };

  const driver = await db.driver.findUnique({ where: { id: input.driverId } });
  if (!driver) return { error: "Pick a driver." };

  for (const stop of input.stops) {
    if (!isStopType(stop.type)) return { error: "A stop has an unknown type." };
  }

  // Every new stop must point at a real vendor (pickups) or customer (service jobs).
  const newStops = input.stops.filter((stop) => !stop.id);
  const vendorIds = newStops.filter((s) => s.type === "pickup").map((s) => s.placeId);
  const customerIds = newStops.filter((s) => s.type !== "pickup").map((s) => s.placeId);
  const [vendorCount, customerCount] = await Promise.all([
    db.vendor.count({ where: { id: { in: vendorIds } } }),
    db.customer.count({ where: { id: { in: customerIds } } }),
  ]);
  if (vendorCount !== new Set(vendorIds).size || customerCount !== new Set(customerIds).size) {
    return { error: "A stop points at a vendor or customer that no longer exists." };
  }

  const name = input.name.trim() || null;
  const stopData = (stop: RouteInput["stops"][number], order: number) => ({
    order,
    type: stop.type,
    vendorId: stop.type === "pickup" ? stop.placeId : null,
    customerId: stop.type === "pickup" ? null : stop.placeId,
  });

  let routeId: string;

  if (!input.routeId) {
    const route = await db.route.create({
      data: {
        date: input.date,
        name,
        driverId: driver.id,
        stops: { create: input.stops.map((stop, i) => stopData(stop, i + 1)) },
      },
    });
    routeId = route.id;
  } else {
    const existing = await db.route.findUnique({
      where: { id: input.routeId },
      include: { stops: true },
    });
    if (!existing) return { error: "This route no longer exists." };

    const keptIds = new Set(input.stops.flatMap((stop) => (stop.id ? [stop.id] : [])));
    const existingIds = new Set(existing.stops.map((stop) => stop.id));
    for (const id of keptIds) {
      if (!existingIds.has(id)) return { error: "A stop was removed elsewhere. Reload and try again." };
    }

    // Stops the driver already worked hold field data, so they can be
    // reordered but never dropped from the route.
    const removed = existing.stops.filter((stop) => !keptIds.has(stop.id));
    if (removed.some((stop) => stop.status !== "pending")) {
      return { error: "Stops that are already completed or skipped cannot be removed." };
    }

    await db.$transaction([
      db.stop.deleteMany({ where: { id: { in: removed.map((stop) => stop.id) } } }),
      db.route.update({
        where: { id: existing.id },
        data: { date: input.date, name, driverId: driver.id },
      }),
      ...input.stops.map((stop, i) =>
        stop.id
          ? db.stop.update({ where: { id: stop.id }, data: { order: i + 1 } })
          : db.stop.create({ data: { routeId: existing.id, ...stopData(stop, i + 1) } }),
      ),
    ]);
    routeId = existing.id;
  }

  revalidatePath("/", "layout");
  redirect(`/routes/${routeId}`);
}

export async function deleteRoute(id: string) {
  await db.route.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/routes");
}
