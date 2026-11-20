import { revalidatePath } from "next/cache";
import { driverFromRequest, unauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { applySyncAction, parseSyncAction } from "@/lib/sync";
import { deletePhoto, MAX_PHOTO_BYTES, savePhoto } from "@/lib/uploads";

/**
 * POST multipart/form-data
 *   action: JSON string (see SyncAction in lib/sync.ts)
 *   photo:  optional image file
 *
 * 200 { result: "applied" | "duplicate" }  -> the phone removes the action from its outbox
 * 4xx { error }                            -> the action can never succeed; the phone drops it
 * anything else (network error, 5xx)       -> the phone keeps it and retries later
 */
export async function POST(req: Request) {
  const driver = await driverFromRequest(req);
  if (!driver) return unauthorized();

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: "Expected multipart form data" }, { status: 400 });

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("action") ?? ""));
  } catch {
    return Response.json({ error: "Field 'action' must be JSON" }, { status: 400 });
  }

  const parsed = parseSyncAction(raw);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const action = parsed.action;

  const photo = form.get("photo");
  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return Response.json({ error: "Photo is larger than 10 MB" }, { status: 413 });
    }
    photoPath = await savePhoto(action.id, photo);
  }

  const outcome = await applySyncAction(db, driver.id, action, photoPath);

  if (outcome.result === "rejected") {
    if (photoPath) await deletePhoto(photoPath);
    return Response.json({ error: outcome.error }, { status: outcome.httpStatus });
  }

  if (outcome.result === "applied") revalidatePath("/", "layout");
  return Response.json({ result: outcome.result, actionId: action.id });
}
