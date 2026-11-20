import path from "path";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";

/** Stop photos live on local disk in web/uploads. */
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

const SAFE_NAME = /^[A-Za-z0-9_-]+\.(jpg|png|webp|heic)$/;

export function photoUrl(photoPath: string | null): string | null {
  return photoPath ? `/api/uploads/${photoPath}` : null;
}

/**
 * Save a photo under a name derived from the sync action id, so re-sending the
 * same action overwrites the same file instead of creating another one.
 */
export async function savePhoto(actionId: string, file: File): Promise<string> {
  const ext = EXTENSION_BY_MIME[file.type.toLowerCase()] ?? "jpg";
  const name = `${actionId}.${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function deletePhoto(name: string): Promise<void> {
  if (!SAFE_NAME.test(name)) return;
  await unlink(path.join(UPLOADS_DIR, name)).catch(() => undefined);
}

export async function readPhoto(name: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!SAFE_NAME.test(name)) return null;
  try {
    const data = await readFile(path.join(UPLOADS_DIR, name));
    const ext = name.split(".").pop() ?? "jpg";
    return { data, contentType: MIME_BY_EXTENSION[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
