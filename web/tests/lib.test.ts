import { describe, expect, it } from "vitest";
import { isDateString, localDateString } from "@/lib/dates";
import { parsePartyForm } from "@/lib/party";
import { summarizeStops } from "@/lib/routes";

describe("dates", () => {
  it("formats the local calendar day", () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("validates date strings", () => {
    expect(isDateString("2026-11-21")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("11/21/2026")).toBe(false);
    expect(isDateString(null)).toBe(false);
  });
});

describe("summarizeStops", () => {
  it("counts statuses and sums gallons on completed stops only", () => {
    const summary = summarizeStops([
      { status: "completed", gallonsCollected: 42.1 },
      { status: "completed", gallonsCollected: 0.2 },
      { status: "skipped", gallonsCollected: 99 },
      { status: "pending", gallonsCollected: null },
    ]);
    expect(summary).toEqual({ total: 4, completed: 2, skipped: 1, pending: 1, done: 3, gallons: 42.3 });
  });
});

describe("parsePartyForm", () => {
  function form(values: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("requires name, address and city", () => {
    expect(parsePartyForm(form({ name: "", address: "1 Main St", city: "Houston" })).ok).toBe(false);
    expect(parsePartyForm(form({ name: "Diner", address: " ", city: "Houston" })).ok).toBe(false);
  });

  it("trims values and stores blanks as null", () => {
    const parsed = parsePartyForm(form({ name: " Diner ", address: "1 Main St", city: "Houston", phone: "" }));
    expect(parsed).toEqual({
      ok: true,
      data: { name: "Diner", address: "1 Main St", city: "Houston", contactName: null, phone: null, notes: null },
    });
  });
});
