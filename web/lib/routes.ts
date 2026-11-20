export type StopSummary = {
  total: number;
  completed: number;
  skipped: number;
  pending: number;
  /** Stops the driver has dealt with, either way. */
  done: number;
  /** Sum of gallons on completed stops. */
  gallons: number;
};

export function summarizeStops(
  stops: { status: string; gallonsCollected: number | null }[],
): StopSummary {
  const summary: StopSummary = { total: stops.length, completed: 0, skipped: 0, pending: 0, done: 0, gallons: 0 };
  for (const stop of stops) {
    if (stop.status === "completed") {
      summary.completed += 1;
      summary.gallons += stop.gallonsCollected ?? 0;
    } else if (stop.status === "skipped") {
      summary.skipped += 1;
    } else {
      summary.pending += 1;
    }
  }
  summary.done = summary.completed + summary.skipped;
  // Avoid float noise like 42.300000000000004 when adding decimals.
  summary.gallons = Math.round(summary.gallons * 100) / 100;
  return summary;
}

export function formatGallons(gallons: number | null | undefined): string {
  if (gallons === null || gallons === undefined) return "—";
  return `${gallons.toLocaleString("en-US", { maximumFractionDigits: 2 })} gal`;
}
