// DB/40 §4 — the app's material advisor: hex → Lab, the 286-SKU background feed (gathered from
// eman.uz) for the board roles + the palette for back/worktop, and "closest real material" via the
// engine's CIEDE2000 + ranking.

import { describe, it, expect } from "vitest";
import { hexToLab, emanCatalogue, suggestMaterials, suggestForUI } from "../src/model/materialAdvisor";
import { resolveMaterial } from "../src/model/materials";
import feedJson from "../src/model/data/eman-catalogue.json";

describe("hexToLab — sRGB hex → CIE L*a*b*", () => {
  it("white is L≈100, a≈0, b≈0", () => {
    const w = hexToLab("#ffffff");
    expect(w.L).toBeCloseTo(100, 0);
    expect(w.a).toBeCloseTo(0, 1);
    expect(w.b).toBeCloseTo(0, 1);
  });
  it("black is L≈0", () => {
    expect(hexToLab("#000000").L).toBeCloseTo(0, 1);
  });
});

describe("emanCatalogue — background feed (286 ЛДСП) + palette", () => {
  it("board roles (facade/carcass) get the big ЛДСП feed — hundreds of SKUs", () => {
    expect(emanCatalogue("facade").length).toBeGreaterThan(100);
    expect(emanCatalogue("carcass").length).toBeGreaterThan(100);
  });
  it("back/worktop get the palette (ХДФ/stone) — small, not the big feed", () => {
    const back = emanCatalogue("back");
    expect(back.length).toBeGreaterThan(0);
    expect(back.length).toBeLessThan(20);
  });
  it("every entry is Eman with a positive density, and no handles leak in", () => {
    const cat = emanCatalogue();
    expect(cat.every((e) => e.supplier === "Eman")).toBe(true);
    expect(cat.every((e) => e.density_kg_m3 > 0)).toBe(true);
    expect(cat.some((e) => e.sku.startsWith("bagannas"))).toBe(false);
  });
});

describe("suggestMaterials / suggestForUI — closest real material (DB/40 §4)", () => {
  it("finds real ЛДСП matches for a wood-brown facade colour", () => {
    const r = suggestMaterials("#8a6a4a", { part: "facade" });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]!.entry.sku.startsWith("cat-")).toBe(true); // from the big feed
  });
  it("returns suggestions nearest-first", () => {
    const r = suggestMaterials("#8a6a4a", { part: "facade", limit: 4 });
    for (let i = 1; i < r.length; i++) {
      expect(r[i]!.deltaE00).toBeGreaterThanOrEqual(r[i - 1]!.deltaE00);
    }
  });
  it("suggestForUI enriches with a display hex + name + price", () => {
    const s = suggestForUI("#8a6a4a", { part: "facade", limit: 1 });
    expect(s.length).toBe(1);
    expect(s[0]!.hex).toMatch(/^#[0-9a-f]{6}$/i);
    expect(s[0]!.name.length).toBeGreaterThan(0);
    expect(s[0]!.price).toBeGreaterThan(0);
  });
});

describe("resolveMaterial — a bound feed SKU resolves to a real material (DB/40 §4 binding)", () => {
  it("resolves a palette id to the palette material", () => {
    expect(resolveMaterial("eman-1408")?.name.length).toBeGreaterThan(0);
  });
  it("resolves a feed SKU (cat-…) to a material with colour + price", () => {
    const id = `cat-${(feedJson as { id: string }[])[0]!.id}`;
    const m = resolveMaterial(id);
    expect(m).toBeDefined();
    expect(m!.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m!.price).toBeGreaterThan(0);
  });
  it("returns undefined for an unknown or empty id", () => {
    expect(resolveMaterial("nope-xyz")).toBeUndefined();
    expect(resolveMaterial(undefined)).toBeUndefined();
  });
});
