import { Prisma, type PrismaClient } from "@prisma/client";
import { isStopStatus, type StopStatus } from "./constants";

/** A stop update queued on the phone. `id` is generated on the device. */
export type SyncAction = {
  id: string;
  stopId: string;
  status: StopStatus;
  gallonsCollected: number | null;
  note: string | null;
  completedAt: string | null;
  clientCreatedAt: string;
};

export type SyncResult =
  | { result: "applied" }
  | { result: "duplicate" }
  | { result: "rejected"; httpStatus: number; error: string };

// The action id is also used as the photo file name, so keep it to safe characters.
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_NOTE_LENGTH = 2000;
const MAX_GALLONS = 100000;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function parseSyncAction(
  raw: unknown,
): { ok: true; action: SyncAction } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Action must be an object" };
  const a = raw as Record<string, unknown>;

  if (typeof a.id !== "string" || !ID_PATTERN.test(a.id)) return { ok: false, error: "Invalid action id" };
  if (typeof a.stopId !== "string" || !a.stopId) return { ok: false, error: "Missing stopId" };
  if (!isStopStatus(a.status)) return { ok: false, error: "Invalid status" };

  let gallons: number | null = null;
  if (a.gallonsCollected !== null && a.gallonsCollected !== undefined) {
    if (
      typeof a.gallonsCollected !== "number" ||
      !Number.isFinite(a.gallonsCollected) ||
      a.gallonsCollected < 0 ||
      a.gallonsCollected > MAX_GALLONS
    ) {
      return { ok: false, error: "Invalid gallonsCollected" };
    }
    gallons = a.gallonsCollected;
  }

  let note: string | null = null;
  if (a.note !== null && a.note !== undefined) {
    if (typeof a.note !== "string" || a.note.length > MAX_NOTE_LENGTH) {
      return { ok: false, error: "Invalid note" };
    }
    note = a.note.trim() || null;
  }

  let completedAt: string | null = null;
  if (a.completedAt !== null && a.completedAt !== undefined) {
    if (!isIsoDate(a.completedAt)) return { ok: false, error: "Invalid completedAt" };
    completedAt = a.completedAt;
  }

  if (!isIsoDate(a.clientCreatedAt)) return { ok: false, error: "Invalid clientCreatedAt" };

  return {
    ok: true,
    action: {
      id: a.id,
      stopId: a.stopId,
      status: a.status,
      gallonsCollected: gallons,
      note,
      completedAt,
      clientCreatedAt: a.clientCreatedAt,
    },
  };
}

/**
 * Apply one queued action exactly once.
 *
 * The SyncLog row and the stop update are written in a single transaction, and
 * SyncLog.id is the action id from the phone. If the phone re-sends an action
 * (for example, the response was lost on a bad connection), the insert hits
 * the primary key and nothing is changed.
 *
 * `photoPath` is only applied when the action carried a photo, so an update
 * without a photo never wipes an earlier one.
 */
export async function applySyncAction(
  db: PrismaClient,
  driverId: string,
  action: SyncAction,
  photoPath: string | null,
): Promise<SyncResult> {
  const already = await db.syncLog.findUnique({ where: { id: action.id } });
  if (already) return { result: "duplicate" };

  const stop = await db.stop.findUnique({
    where: { id: action.stopId },
    include: { route: { select: { driverId: true } } },
  });
  if (!stop) return { result: "rejected", httpStatus: 404, error: "Stop not found" };
  if (stop.route.driverId !== driverId) {
    return { result: "rejected", httpStatus: 403, error: "Stop belongs to another driver" };
  }

  try {
    await db.$transaction([
      db.syncLog.create({
        data: {
          id: action.id,
          driverId,
          stopId: action.stopId,
          type: "stop.update",
          payload: JSON.stringify({ ...action, hasPhoto: photoPath !== null }),
          clientCreatedAt: new Date(action.clientCreatedAt),
        },
      }),
      db.stop.update({
        where: { id: action.stopId },
        data: {
          status: action.status,
          gallonsCollected: action.gallonsCollected,
          note: action.note,
          completedAt: action.completedAt ? new Date(action.completedAt) : null,
          ...(photoPath ? { photoPath } : {}),
        },
      }),
    ]);
  } catch (err) {
    // Two copies of the same action raced; the other one won.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { result: "duplicate" };
    }
    throw err;
  }

  return { result: "applied" };
}
