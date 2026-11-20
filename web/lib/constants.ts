export const STOP_TYPES = ["pickup", "grease_trap", "hood_cleaning"] as const;
export type StopType = (typeof STOP_TYPES)[number];

export const STOP_TYPE_LABELS: Record<StopType, string> = {
  pickup: "Oil pickup",
  grease_trap: "Grease trap",
  hood_cleaning: "Hood cleaning",
};

export const STOP_STATUSES = ["pending", "completed", "skipped"] as const;
export type StopStatus = (typeof STOP_STATUSES)[number];

export function isStopType(value: unknown): value is StopType {
  return STOP_TYPES.includes(value as StopType);
}

export function isStopStatus(value: unknown): value is StopStatus {
  return STOP_STATUSES.includes(value as StopStatus);
}

export function stopTypeLabel(type: string): string {
  return isStopType(type) ? STOP_TYPE_LABELS[type] : type;
}
