import { driverFromRequest, unauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDateString, localDateString } from "@/lib/dates";
import { photoUrl } from "@/lib/uploads";

/**
 * GET /api/mobile/route?date=YYYY-MM-DD
 * The signed-in driver's ordered stops for a day. The phone sends its own local
 * date; without it the server's local date is used.
 */
export async function GET(req: Request) {
  const driver = await driverFromRequest(req);
  if (!driver) return unauthorized();

  const requested = new URL(req.url).searchParams.get("date");
  const date = isDateString(requested) ? requested : localDateString();

  const routes = await db.route.findMany({
    where: { driverId: driver.id, date },
    orderBy: { createdAt: "asc" },
    include: {
      stops: { orderBy: { order: "asc" }, include: { vendor: true, customer: true } },
    },
  });

  const stops = routes.flatMap((route) =>
    route.stops.map((stop) => {
      const place = stop.vendor ?? stop.customer;
      return {
        id: stop.id,
        routeId: route.id,
        routeName: route.name,
        order: stop.order,
        type: stop.type,
        status: stop.status,
        gallonsCollected: stop.gallonsCollected,
        note: stop.note,
        completedAt: stop.completedAt?.toISOString() ?? null,
        photoUrl: photoUrl(stop.photoPath),
        name: place?.name ?? "Unknown",
        contactName: place?.contactName ?? null,
        phone: place?.phone ?? null,
        address: place?.address ?? "",
        city: place?.city ?? "",
        siteNotes: place?.notes ?? null,
      };
    }),
  );

  return Response.json({
    date,
    driver: { id: driver.id, name: driver.name, code: driver.code },
    stops,
  });
}
