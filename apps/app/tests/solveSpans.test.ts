// solveSpans — the CONSTRUCTION_FRAME_v4 §4 division-rule solver (Fixed / Ratio / Locked / Flex).
// Pins each rule against the doc's own worked examples. Lives in the app suite because that is the
// vitest that runs on this machine; the function itself is @mebelchi/pricing.

import { describe, it, expect } from "vitest";
import { solveSpans, walkInterior } from "@mebelchi/pricing";
import type { DivisionRule, Cell } from "@mebelchi/schema";

describe("solveSpans — §4 division rules (fixed / ratio / locked / flex)", () => {
  it("all ratio → proportional share (shelves 1 : 1 : 0.6 of 260mm)", () => {
    const r: DivisionRule[] = [
      { kind: "ratio", weight: 1 },
      { kind: "ratio", weight: 1 },
      { kind: "ratio", weight: 0.6 },
    ];
    expect(solveSpans(260, r)).toEqual([100, 100, 60]);
  });

  it("fixed + ratio → the fixed zone keeps its mm, the rest shares proportionally (plinth 100mm)", () => {
    const r: DivisionRule[] = [
      { kind: "fixed", mm: 100 },
      { kind: "ratio", weight: 1 },
      { kind: "ratio", weight: 1 },
    ];
    expect(solveSpans(500, r)).toEqual([100, 200, 200]);
  });

  it("locked + flex → the locked zone survives, flex absorbs the remainder (sled 180mm + hanging)", () => {
    const r: DivisionRule[] = [{ kind: "locked", mm: 180 }, { kind: "flex" }];
    expect(solveSpans(600, r)).toEqual([180, 420]);
  });

  it("two flex → split the leftover equally", () => {
    const r: DivisionRule[] = [{ kind: "fixed", mm: 100 }, { kind: "flex" }, { kind: "flex" }];
    expect(solveSpans(500, r)).toEqual([100, 200, 200]);
  });

  it("overflow (fixed exceeds total) → flexible zones collapse to 0, never negative (amber case)", () => {
    const r: DivisionRule[] = [{ kind: "fixed", mm: 150 }, { kind: "flex" }];
    expect(solveSpans(100, r)).toEqual([150, 0]);
  });
});

describe("walkInterior honours the division rules (§4 wiring)", () => {
  it("cols split: fixed + two ratio → front widths & positions follow the rule", () => {
    const root: Cell = {
      split: "cols",
      rules: [{ kind: "fixed", mm: 100 }, { kind: "ratio", weight: 1 }, { kind: "ratio", weight: 1 }],
      children: [{ front: "door" }, { front: "door" }, { front: "door" }],
    };
    const spec = walkInterior(root, { w: 500, h: 700, innerW: 468 });
    expect(spec.fronts.map((f) => f.wMm)).toEqual([100, 200, 200]);
    expect(spec.fronts.map((f) => f.xMm)).toEqual([0, 100, 300]);
  });

  it("rows split: locked drawer + flex → front heights follow the rule", () => {
    const root: Cell = {
      split: "rows",
      rules: [{ kind: "locked", mm: 180 }, { kind: "flex" }],
      children: [{ front: "drawer" }, { front: "door" }],
    };
    const spec = walkInterior(root, { w: 500, h: 600, innerW: 468 });
    expect(spec.fronts.map((f) => f.hMm)).toEqual([180, 420]);
  });

  it("no rules → falls back to sizes/even (existing cabinets unchanged)", () => {
    const root: Cell = { split: "cols", children: [{ front: "door" }, { front: "door" }] };
    const spec = walkInterior(root, { w: 400, h: 700, innerW: 368 });
    expect(spec.fronts.map((f) => f.wMm)).toEqual([200, 200]);
  });
});
