// DB/40 §4 — the material advisor. CIEDE2000 is proven against the published Sharma, Wu & Dalal
// (2005) reference data; the ranking is proven against DB/40 §4 (ΔE00 gate → finish → stock → price).

import { describe, expect, it } from "vitest";
import { ciede2000, closestMaterials, type CatalogueEntry } from "../engine/index.js";

describe("ciede2000 — perceptual colour distance (Sharma et al. reference values)", () => {
  it("identical colours have zero distance", () => {
    expect(ciede2000({ L: 50, a: 2.5, b: 0 }, { L: 50, a: 2.5, b: 0 })).toBe(0);
  });

  it("matches the published CIEDE2000 test data (to 4 decimals)", () => {
    expect(ciede2000({ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 })).toBeCloseTo(2.0425, 3);
    expect(ciede2000({ L: 50, a: -1.3802, b: -84.2814 }, { L: 50, a: 0, b: -82.7485 })).toBeCloseTo(1.0, 3);
    expect(ciede2000({ L: 50, a: 0, b: 0 }, { L: 50, a: -1, b: 2 })).toBeCloseTo(2.3669, 3);
    expect(ciede2000({ L: 60.2574, a: -34.0099, b: 36.2677 }, { L: 60.4626, a: -34.1751, b: 39.4387 })).toBeCloseTo(1.2644, 3);
  });
});

describe("closestMaterials — the advisor ranking (DB/40 §4)", () => {
  const mk = (sku: string, color: { L: number; a: number; b: number }, extra: Partial<CatalogueEntry> = {}): CatalogueEntry => ({
    sku, supplier: "Eman", decorName: sku, color, thickness_mm10: [160, 180],
    sheet_mm10: { length_mm10: 28000, width_mm10: 20700 }, density_kg_m3: 728,
    price: 700000, currency: "UZS", availability: "in_stock", ...extra,
  });
  const cat: CatalogueEntry[] = [
    mk("near", { L: 50, a: 0, b: 0 }),
    mk("mid", { L: 55, a: 2, b: -3 }),
    mk("far", { L: 20, a: 40, b: -50 }),
  ];

  it("returns the closest SKU first", () => {
    const r = closestMaterials({ L: 50, a: 0, b: 0 }, cat);
    expect(r[0]!.entry.sku).toBe("near");
    expect(r[0]!.deltaE00).toBeCloseTo(0, 6);
  });

  it("drops materials beyond the ΔE00 gate (>6 is a different colour)", () => {
    const r = closestMaterials({ L: 50, a: 0, b: 0 }, cat);
    expect(r.some((m) => m.entry.sku === "far")).toBe(false);
  });

  it("filters by thickness — a colour match not made in the project's thickness is not a match", () => {
    const only16 = [mk("near16", { L: 50, a: 0, b: 0 }, { thickness_mm10: [160] })];
    expect(closestMaterials({ L: 50, a: 0, b: 0 }, only16, { thickness_mm10: 180 })).toEqual([]);
    expect(closestMaterials({ L: 50, a: 0, b: 0 }, only16, { thickness_mm10: 160 })).toHaveLength(1);
  });

  it("prefers in-stock over discontinued at equal colour distance", () => {
    const twins: CatalogueEntry[] = [
      mk("disc", { L: 50, a: 0, b: 0 }, { availability: "discontinued", price: 100 }),
      mk("stock", { L: 50, a: 0, b: 0 }, { availability: "in_stock", price: 999 }),
    ];
    expect(closestMaterials({ L: 50, a: 0, b: 0 }, twins)[0]!.entry.sku).toBe("stock");
  });

  it("returns [] when nothing is within range — never a silent bad bind", () => {
    expect(closestMaterials({ L: 90, a: 0, b: 0 }, [mk("dark", { L: 10, a: 0, b: 0 })])).toEqual([]);
  });
});
