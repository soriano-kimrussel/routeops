"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the current server-rendered page on a timer so field updates show up live. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      Live, refreshes every {seconds}s
    </span>
  );
}
