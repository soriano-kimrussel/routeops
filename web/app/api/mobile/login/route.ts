import { db } from "@/lib/db";

/** POST { code } -> { token, driver }. The driver code is the whole login for this MVP. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) return Response.json({ error: "Driver code is required" }, { status: 400 });

  const driver = await db.driver.findUnique({ where: { code } });
  if (!driver) return Response.json({ error: "Unknown driver code" }, { status: 401 });

  return Response.json({
    token: driver.token,
    driver: { id: driver.id, name: driver.name, code: driver.code },
  });
}
