// Цоколь (plinth) emission — the cut list now emits a plinth front panel per FLOOR box,
// with dimensions from the ConstructionProfile (the canonical panelDecomposition rule:
// one panel, length = innerW for "between" placement, width = plinth HEIGHT, carcass
// thickness). Census-confirmed 120mm (QONUNLAR §10.6). Wall (upper) cabinets have none. §5.3.

import { describe, it, expect } from "vitest";
import { production } from "../src/model/cncExport";
import { mk } from "../src/model/cabinet";
import { GEOM } from "../src/model/layout";
import { QORASU_PROFILE } from "../../../engine/index.js";

const plinthsOf = (cabs: ReturnType<typeof mk>[]) =>
  (production(cabs)?.panels ?? []).filter((p) => p.partEn === "plinth");

describe("plinth (Цоколь) emission from the profile", () => {
  it("a base cabinet gets exactly one plinth, 120mm tall, banded per the profile", () => {
    const p = plinthsOf([mk({ kind: "base", w: 600, h: 720 })]);
    expect(p.length).toBe(1);
    expect(p[0]!.part).toBe("Цоколь");
    expect(p[0]!.widthMm).toBe(120); // plinth HEIGHT, from the profile (census 120mm)
    expect(p[0]!.thicknessMm).toBe(16); // carcass thickness, from the profile
    // "between" placement → length is the interior width (< the 600mm outer width)
    expect(p[0]!.lengthMm).toBeGreaterThan(0);
    expect(p[0]!.lengthMm).toBeLessThan(600);
    // profile kromkaByRole.plinth = { top: K1, left/right: K2 }
    expect(p[0]!.edge).toBe("лев·прав: 0.4мм · верх: 1мм");
  });

  it("a tall (floor-standing) cabinet also gets a plinth", () => {
    expect(plinthsOf([mk({ kind: "tall", w: 600, h: 2100 })]).length).toBe(1);
  });

  it("a wall (upper) cabinet has NO plinth — it stands off the floor", () => {
    expect(plinthsOf([mk({ kind: "upper", w: 600, h: 720 })]).length).toBe(0);
  });
});

describe("цоколь (plinth) — a RUN-level band for wall-runs of 2+ (DB/39, migration Faza 1b)", () => {
  it("a wall-run of 2+ base cabinets yields ONE plinth board spanning the run, not one per box", () => {
    const p = plinthsOf([
      mk({ kind: "base", w: 600, h: 720, run: 0, x: 0 }),
      mk({ kind: "base", w: 600, h: 720, run: 0, x: 600 }),
    ]);
    expect(p.length).toBe(1); // ONE board for the row, not two per-cabinet plinths
    expect(p[0]!.part).toBe("Цоколь");
    expect(p[0]!.lengthMm).toBe(1200); // spans the whole 2×600 run (like the worktop)
    expect(p[0]!.widthMm).toBe(120); // plinth HEIGHT from the profile, not a per-box interior width
  });

  it("two base cabinets in DIFFERENT runs are each lone → each keeps its per-box plinth", () => {
    const p = plinthsOf([
      mk({ kind: "base", w: 600, h: 720, run: 0, x: 0 }),
      mk({ kind: "base", w: 600, h: 720, run: 1, x: 2000 }),
    ]);
    expect(p.length).toBe(2); // no shared run → no consolidation, two per-box plinths
  });
});

describe("столешница (worktop) — a RUN-level band, taken from the engine (DB/39, migration Faza 1)", () => {
  const worktopsOf = (cabs: ReturnType<typeof mk>[]) =>
    (production(cabs)?.panels ?? []).filter((p) => p.partEn === "worktop");

  it("a wall-run of 2+ base cabinets yields exactly ONE worktop slab spanning the run", () => {
    const w = worktopsOf([
      mk({ kind: "base", w: 600, h: 720, run: 0, x: 0 }),
      mk({ kind: "base", w: 600, h: 720, run: 0, x: 600 }),
    ]);
    expect(w.length).toBe(1); // ONE slab for the row, not two per-cabinet worktops
    expect(w[0]!.part).toBe("Столешница");
    expect(w[0]!.lengthMm).toBe(1200); // spans the whole 2×600 run (ends closed → no overhang)
  });

  it("a wall (upper) run has no worktop", () => {
    const w = worktopsOf([
      mk({ kind: "upper", w: 600, h: 720, run: 0, x: 0 }),
      mk({ kind: "upper", w: 600, h: 720, run: 0, x: 600 }),
    ]);
    expect(w.length).toBe(0);
  });
});

describe("GEOM.plinth is sourced from the profile (the 3D/layout matches the cut list)", () => {
  it("GEOM.plinth = the profile's plinth height (census 120mm), not a hardcoded 100", () => {
    expect(GEOM.plinth).toBe(120);
    expect(GEOM.plinth).toBe(QORASU_PROFILE.defaults.plinth.height_mm10 / 10);
  });

  it("the standard counter stack is now 880mm (plinth 120 + carcass 720 + worktop 40)", () => {
    expect(GEOM.plinth + GEOM.baseH + GEOM.worktop).toBe(880);
  });
});
