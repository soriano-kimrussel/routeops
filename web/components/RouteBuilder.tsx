"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { saveRoute } from "@/app/routes/actions";
import { STOP_TYPE_LABELS, type StopType } from "@/lib/constants";
import { StatusBadge, TypeBadge } from "./ui";

type Place = { id: string; name: string; address: string; city: string };
type DriverOption = { id: string; name: string; code: string };

type BuilderStop = {
  /** Local key for React; not sent to the server. */
  key: string;
  /** Database id, for stops that already exist. */
  id?: string;
  type: StopType;
  placeId: string;
  status: string;
};

export type RouteBuilderInitial = {
  routeId: string;
  driverId: string;
  date: string;
  name: string;
  stops: { id: string; type: StopType; placeId: string; status: string }[];
};

export function RouteBuilder({
  drivers,
  vendors,
  customers,
  defaultDate,
  initial,
}: {
  drivers: DriverOption[];
  vendors: Place[];
  customers: Place[];
  defaultDate: string;
  initial?: RouteBuilderInitial;
}) {
  const nextKey = useRef(0);
  const [driverId, setDriverId] = useState(initial?.driverId ?? drivers[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [name, setName] = useState(initial?.name ?? "");
  const [stops, setStops] = useState<BuilderStop[]>(
    () => initial?.stops.map((stop) => ({ ...stop, key: stop.id })) ?? [],
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const places = useMemo(() => {
    const map = new Map<string, Place>();
    for (const place of [...vendors, ...customers]) map.set(place.id, place);
    return map;
  }, [vendors, customers]);

  const matches = (place: Place) => {
    const query = search.trim().toLowerCase();
    return !query || `${place.name} ${place.address} ${place.city}`.toLowerCase().includes(query);
  };
  const visibleVendors = vendors.filter(matches);
  const visibleCustomers = customers.filter(matches);

  function addStop(type: StopType, placeId: string) {
    nextKey.current += 1;
    setStops((current) => [...current, { key: `new-${nextKey.current}`, type, placeId, status: "pending" }]);
  }

  function moveStop(index: number, delta: -1 | 1) {
    setStops((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeStop(key: string) {
    setStops((current) => current.filter((stop) => stop.key !== key));
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await saveRoute({
        routeId: initial?.routeId,
        driverId,
        date,
        name,
        stops: stops.map((stop) => ({ id: stop.id, type: stop.type, placeId: stop.placeId })),
      });
      // On success the action redirects, so a return value always means an error.
      if (result?.error) setError(result.error);
    });
  }

  const usedCount = (placeId: string) => stops.filter((stop) => stop.placeId === placeId).length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="card space-y-4 p-6">
          <h2 className="text-sm font-semibold">Route details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="driver">Driver</label>
              <select id="driver" className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                {drivers.length === 0 ? <option value="">No drivers yet</option> : null}
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} ({driver.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="routeName">Route name (optional)</label>
            <input
              id="routeName"
              className="input"
              placeholder="e.g. Inner Loop"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold">
            Stops in visit order <span className="font-normal text-slate-500">({stops.length})</span>
          </h2>
          {stops.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No stops yet. Add vendors and customers from the list on the right.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {stops.map((stop, index) => {
                const place = places.get(stop.placeId);
                const locked = stop.status !== "pending";
                return (
                  <li key={stop.key} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{place?.name ?? "Unknown place"}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <TypeBadge type={stop.type} />
                        {locked ? <StatusBadge status={stop.status} /> : null}
                        <span className="truncate text-xs text-slate-500">{place?.address}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="btn btn-secondary px-2 py-1"
                        onClick={() => moveStop(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move stop ${index + 1} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary px-2 py-1"
                        onClick={() => moveStop(index, 1)}
                        disabled={index === stops.length - 1}
                        aria-label={`Move stop ${index + 1} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger px-2 py-1"
                        onClick={() => removeStop(stop.key)}
                        disabled={locked}
                        title={locked ? "Already worked by the driver, cannot be removed" : undefined}
                        aria-label={`Remove stop ${index + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : initial ? "Save route" : "Create route"}
          </button>
          <Link href={initial ? `/routes/${initial.routeId}` : "/routes"} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </div>

      <div className="card self-start p-6">
        <h2 className="text-sm font-semibold">Add stops</h2>
        <input
          className="input mt-3"
          placeholder="Search by name or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search vendors and customers"
        />

        <h3 className="mt-5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Vendors, oil pickup
        </h3>
        <ul className="mt-2 divide-y divide-slate-100">
          {visibleVendors.map((vendor) => (
            <PlaceRow key={vendor.id} place={vendor} used={usedCount(vendor.id)}>
              <button type="button" className="btn btn-secondary px-2.5 py-1 text-xs" onClick={() => addStop("pickup", vendor.id)}>
                + {STOP_TYPE_LABELS.pickup}
              </button>
            </PlaceRow>
          ))}
          {visibleVendors.length === 0 ? <li className="py-2 text-sm text-slate-500">No vendors match.</li> : null}
        </ul>

        <h3 className="mt-5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Customers, service jobs
        </h3>
        <ul className="mt-2 divide-y divide-slate-100">
          {visibleCustomers.map((customer) => (
            <PlaceRow key={customer.id} place={customer} used={usedCount(customer.id)}>
              <button type="button" className="btn btn-secondary px-2.5 py-1 text-xs" onClick={() => addStop("grease_trap", customer.id)}>
                + {STOP_TYPE_LABELS.grease_trap}
              </button>
              <button type="button" className="btn btn-secondary px-2.5 py-1 text-xs" onClick={() => addStop("hood_cleaning", customer.id)}>
                + {STOP_TYPE_LABELS.hood_cleaning}
              </button>
            </PlaceRow>
          ))}
          {visibleCustomers.length === 0 ? <li className="py-2 text-sm text-slate-500">No customers match.</li> : null}
        </ul>
      </div>
    </div>
  );
}

function PlaceRow({ place, used, children }: { place: Place; used: number; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">
          {place.name}
          {used > 0 ? <span className="ml-2 text-xs font-normal text-emerald-700">on route{used > 1 ? ` ×${used}` : ""}</span> : null}
        </div>
        <div className="text-xs text-slate-500">
          {place.address}, {place.city}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">{children}</div>
    </li>
  );
}
