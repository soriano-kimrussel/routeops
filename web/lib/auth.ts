import { randomBytes } from "crypto";
import type { Driver } from "@prisma/client";
import { db } from "./db";

/** Resolve the driver from an `Authorization: Bearer <token>` header. */
export async function driverFromRequest(req: Request): Promise<Driver | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  return db.driver.findUnique({ where: { token: match[1].trim() } });
}

export function newDriverToken(): string {
  return randomBytes(24).toString("hex");
}

export function unauthorized(): Response {
  return Response.json({ error: "Invalid or missing driver token" }, { status: 401 });
}
