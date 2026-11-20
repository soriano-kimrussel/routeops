import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { applySyncAction, parseSyncAction, type SyncAction } from "@/lib/sync";

const db = new PrismaClient();

let driverId: string;
let otherDriverId: string;
let stopId: string;

function action(overrides: Partial<SyncAction> = {}): SyncAction {
  return {
    id: "action-0001",
    stopId,
    status: "completed",
    gallonsCollected: 38.5,
    note: "Drum was full",
    completedAt: "2026-11-21T15:04:00.000Z",
    clientCreatedAt: "2026-11-21T15:04:05.000Z",
    ...overrides,
  };
}

beforeEach(async () => {
  await db.syncLog.deleteMany();
  await db.stop.deleteMany();
  await db.route.deleteMany();
  await db.driver.deleteMany();
  await db.vendor.deleteMany();

  const driver = await db.driver.create({ data: { name: "Test Driver", code: "T-1", token: "token-1" } });
  const other = await db.driver.create({ data: { name: "Other Driver", code: "T-2", token: "token-2" } });
  const vendor = await db.vendor.create({ data: { name: "Test Kitchen", address: "1 Main St", city: "Houston" } });
  const route = await db.route.create({
    data: {
      date: "2026-11-21",
      driverId: driver.id,
      stops: { create: [{ order: 1, type: "pickup", vendorId: vendor.id }] },
    },
    include: { stops: true },
  });

  driverId = driver.id;
  otherDriverId = other.id;
  stopId = route.stops[0].id;
});

afterAll(() => db.$disconnect());

describe("applySyncAction", () => {
  it("applies a stop update and records it in the sync log", async () => {
    const outcome = await applySyncAction(db, driverId, action(), "action-0001.jpg");
    expect(outcome).toEqual({ result: "applied" });

    const stop = await db.stop.findUniqueOrThrow({ where: { id: stopId } });
    expect(stop.status).toBe("completed");
    expect(stop.gallonsCollected).toBe(38.5);
    expect(stop.note).toBe("Drum was full");
    expect(stop.photoPath).toBe("action-0001.jpg");
    expect(stop.completedAt?.toISOString()).toBe("2026-11-21T15:04:00.000Z");
    expect(await db.syncLog.count()).toBe(1);
  });

  it("does not double-apply when the same action is sent again", async () => {
    await applySyncAction(db, driverId, action(), null);

    // The office corrects the gallons after the first delivery.
    await db.stop.update({ where: { id: stopId }, data: { gallonsCollected: 40 } });

    // The phone never saw the response and re-sends the same queued action.
    const replay = await applySyncAction(db, driverId, action(), null);
    expect(replay).toEqual({ result: "duplicate" });

    const stop = await db.stop.findUniqueOrThrow({ where: { id: stopId } });
    expect(stop.gallonsCollected).toBe(40);
    expect(await db.syncLog.count()).toBe(1);
  });

  it("treats two copies racing each other as one apply and one duplicate", async () => {
    const outcomes = await Promise.all([
      applySyncAction(db, driverId, action(), null),
      applySyncAction(db, driverId, action(), null),
    ]);
    expect(outcomes.map((o) => o.result).sort()).toEqual(["applied", "duplicate"]);
    expect(await db.syncLog.count()).toBe(1);
  });

  it("keeps an earlier photo when a later action has none", async () => {
    await applySyncAction(db, driverId, action(), "action-0001.jpg");
    await applySyncAction(db, driverId, action({ id: "action-0002", note: "Edited note" }), null);

    const stop = await db.stop.findUniqueOrThrow({ where: { id: stopId } });
    expect(stop.note).toBe("Edited note");
    expect(stop.photoPath).toBe("action-0001.jpg");
  });

  it("rejects a stop on another driver's route without changing it", async () => {
    const outcome = await applySyncAction(db, otherDriverId, action(), null);
    expect(outcome).toMatchObject({ result: "rejected", httpStatus: 403 });

    const stop = await db.stop.findUniqueOrThrow({ where: { id: stopId } });
    expect(stop.status).toBe("pending");
    expect(await db.syncLog.count()).toBe(0);
  });

  it("rejects a stop that no longer exists", async () => {
    const outcome = await applySyncAction(db, driverId, action({ stopId: "missing" }), null);
    expect(outcome).toMatchObject({ result: "rejected", httpStatus: 404 });
  });
});

describe("parseSyncAction", () => {
  it("accepts a well-formed action and trims the note", () => {
    const parsed = parseSyncAction({ ...action(), note: "  gate was locked  " });
    expect(parsed.ok && parsed.action.note).toBe("gate was locked");
  });

  it.each([
    ["an unsafe action id", { id: "../../etc/passwd" }],
    ["an unknown status", { status: "done" }],
    ["negative gallons", { gallonsCollected: -1 }],
    ["gallons as text", { gallonsCollected: "40" }],
    ["a bad timestamp", { completedAt: "yesterday" }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseSyncAction({ ...action(), ...overrides }).ok).toBe(false);
  });
});
