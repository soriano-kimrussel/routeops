export type StopStatus = 'pending' | 'completed' | 'skipped';
export type StopType = 'pickup' | 'grease_trap' | 'hood_cleaning';

/** A stop as the server sent it, cached on the phone. */
export type Stop = {
  id: string;
  routeId: string;
  routeName: string | null;
  order: number;
  type: StopType;
  status: StopStatus;
  gallonsCollected: number | null;
  note: string | null;
  completedAt: string | null;
  /** Server path of the uploaded photo, e.g. /api/uploads/abc.jpg */
  photoUrl: string | null;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string;
  city: string;
  siteNotes: string | null;
  /** Photo file on this phone, kept so the picture shows without a connection. */
  localPhotoUri?: string | null;
};

/** A stop as shown on screen: the cached stop with any queued updates applied. */
export type StopView = Stop & { pendingSync: boolean };

/**
 * One queued stop update. `id` is generated on the phone and is what makes
 * sync idempotent: the server remembers every id it has applied.
 */
export type OutboxAction = {
  id: string;
  stopId: string;
  status: StopStatus;
  gallonsCollected: number | null;
  note: string | null;
  completedAt: string | null;
  clientCreatedAt: string;
  /** New photo taken with this update, if any. */
  photoUri: string | null;
};

export type Driver = { id: string; name: string; code: string };

export type Session = { token: string; driver: Driver; apiUrl: string };

export const STOP_TYPE_LABELS: Record<StopType, string> = {
  pickup: 'Oil pickup',
  grease_trap: 'Grease trap',
  hood_cleaning: 'Hood cleaning',
};
