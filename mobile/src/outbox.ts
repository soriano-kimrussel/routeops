import type { OutboxAction, Stop, StopStatus, StopView } from './types';

/** Calendar day on this phone as YYYY-MM-DD. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Apply one queued update to a stop. Used for the on-screen view and after a successful push. */
export function applyAction(stop: Stop, action: OutboxAction): Stop {
  return {
    ...stop,
    status: action.status,
    gallonsCollected: action.gallonsCollected,
    note: action.note,
    completedAt: action.completedAt,
    localPhotoUri: action.photoUri ?? stop.localPhotoUri ?? null,
  };
}

/**
 * What the driver sees: the last stops downloaded from the server with every
 * queued update layered on top, oldest first. Nothing here needs a connection.
 */
export function buildStopViews(serverStops: Stop[], outbox: OutboxAction[]): StopView[] {
  const views = new Map<string, StopView>();
  for (const stop of serverStops) views.set(stop.id, { ...stop, pendingSync: false });

  for (const action of outbox) {
    const current = views.get(action.stopId);
    if (current) views.set(action.stopId, { ...applyAction(current, action), pendingSync: true });
  }

  return [...views.values()];
}

/**
 * Replace the cached stops with a fresh download, keeping the local photo file
 * for stops we already know so the picture still shows offline.
 */
export function mergeDownloadedStops(previous: Stop[], downloaded: Stop[]): Stop[] {
  const localPhotos = new Map(previous.map((stop) => [stop.id, stop.localPhotoUri ?? null]));
  return downloaded.map((stop) => ({ ...stop, localPhotoUri: localPhotos.get(stop.id) ?? null }));
}

/** Keep the original timestamp when a stop is edited without changing its status. */
export function completedAtFor(
  previous: { status: StopStatus; completedAt: string | null },
  nextStatus: StopStatus,
  now: Date = new Date(),
): string | null {
  if (nextStatus === 'pending') return null;
  if (previous.status === nextStatus && previous.completedAt) return previous.completedAt;
  return now.toISOString();
}

/** Parse what the driver typed for gallons. Empty means "not recorded". */
export function parseGallons(text: string): { ok: true; value: number | null } | { ok: false } {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return { ok: true, value: null };
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value > 100000) return { ok: false };
  return { ok: true, value };
}
