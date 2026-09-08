// 45kg weight limit (DB/40 §5): the cut list now carries each panel's REAL weight — volume ×
// the material's real density from the eman.uz catalogue (ЛДСП 728, derived from a real sheet
// weight), not the engine's 680 hardcode — and flags any assembled carcass over the lift limit.

import { describe, it, expect } from "vitest";
import { production } from "../src/model/cncExport";
import { mk } from "../src/model/cabinet";

describe("45kg weight limit — real density wired into the cut list (DB/40 §5)", () => {
  it("every cut-list panel carries a positive real weight (kg)", () => {
    const p = production([mk({ kind: "base", w: 600, h: 720 })])!;
    expect(p.panels.length).toBeGreaterThan(0);
    for (const row of p.panels) expect(row.weightKg).toBeGreaterThan(0);
  });

  it("a carcass panel's weight uses the real ЛДСП density (728), from the catalogue not a hardcode", () => {
    const p = production([mk({ kind: "base", w: 600, h: 720 })])!;
    const carcass = p.panels.find((r) => r.role === "carcass" && r.partEn !== "back" && r.partEn !== "worktop");
    expect(carcass).toBeDefined();
    const volM3 = (carcass!.lengthMm / 1000) * (carcass!.widthMm / 1000) * (carcass!.thicknessMm / 1000);
    // weight = volume × 728 (the catalogue's real ЛДСП density), rounded to 0.1kg
    expect(carcass!.weightKg!).toBeCloseTo(Math.round(volM3 * 728 * 10) / 10, 1);
  });

  it("a small cabinet is liftable → no weight warnings", () => {
    const p = production([mk({ kind: "base", w: 600, h: 720 })])!;
    expect(p.warnings).toEqual([]);
  });

  it("a big assembled carcass over 45kg is flagged for splitting", () => {
    const p = production([mk({ kind: "tall", w: 1200, h: 2700 })])!;
    expect(p.warnings.length).toBeGreaterThan(0);
    expect(p.warnings[0]).toContain("кг");
  });
});
