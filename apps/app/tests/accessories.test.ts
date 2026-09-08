// Accessories REFERENCE library loads the REAL core catalog pack (nothing invented). Locks: the pack is
// read verbatim, grouped by function, and honestly browse-grade (every entry verified:false) — so the UI
// can only ever DISPLAY it, never drill from it (drilling = founder-deferred F1, engine's Joints layer).

import { describe, it, expect } from "vitest";
import { ACCESSORIES, accessoriesByFunction, functionGroupLabel } from "../src/model/accessories";

describe("accessories reference library — reads the real core pack", () => {
  it("loads the whole pack (63 entries) verbatim", () => {
    expect(ACCESSORIES.length).toBe(63);
    for (const a of ACCESSORIES) expect(a.id).toBeTruthy();
  });

  it("includes the wardrobe rail (rod) — an accessory, not an App-3 component", () => {
    const rod = ACCESSORIES.find((a) => a.id === "gtv_wardrobe_rail");
    expect(rod).toBeTruthy();
    expect(rod!.functionGroup).toBe("F12_wardrobe");
    expect(rod!.brand).toBe("GTV");
  });

  it("is REFERENCE/browse only — every entry is verified:false (no functional/drilling placement)", () => {
    expect(ACCESSORIES.every((a) => a.verified === false)).toBe(true);
    expect(ACCESSORIES.every((a) => a.grade === "browse")).toBe(true);
  });

  it("groups by function (§8.5) with mechanically-derived labels (no invented names)", () => {
    const groups = accessoriesByFunction();
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(63);
    expect(functionGroupLabel("F12_wardrobe")).toBe("wardrobe");
    expect(functionGroupLabel("F5_door_hinged")).toBe("door hinged");
  });
});
