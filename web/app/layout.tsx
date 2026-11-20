import type { Metadata } from "next";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "RouteOps",
  description: "Routes, oil pickups and service jobs for the office and the field.",
};

// Every screen reads live data from SQLite, so nothing is statically cached.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="border-b border-slate-200 bg-slate-900 text-slate-200 md:w-56 md:shrink-0 md:border-b-0">
            <div className="flex items-center gap-2 px-5 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                R
              </span>
              <div>
                <div className="text-sm font-semibold text-white">RouteOps</div>
                <div className="text-xs text-slate-400">Office</div>
              </div>
            </div>
            <NavLinks />
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
