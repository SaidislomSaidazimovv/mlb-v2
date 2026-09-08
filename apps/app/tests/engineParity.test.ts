// Engine parity — the two engines characterized side by side, so the founder's B0
// question ("how does drilling attach to panelDecomposition's panels?") is answered as
// verifiable FACTS, not prose:
//   • panelDecomposition (design + QORASU profile) → panels WITH kromka + grooves, NO drills
//   • solveBaseCabinet   (the app's real SWJ008 path via solveRun) → panels WITH drills, NO kromka
// They are COMPLEMENTARY: one derives construction geometry + edge banding from the profile,
// the other derives hole placement from the hardware spec. Integrating them (a drilling pass
// over the decomposer's panels) is the wiring the founder must scope — this pins today's state.

import { describe, it, expect } from "vitest";
import { mk } from "../src/model/cabinet";
import { toDesignProject } from "../src/model/toDesign";
import { solveRun } from "../src/model/machining";
import { panelDecomposition, QORASU_PROFILE } from "../../../engine/index.js";

const CAB = mk({ kind: "base", w: 600, h: 720, fill: "shelves", count: 2 });

describe("engine parity — panelDecomposition (design/profile) vs solveBaseCabinet (drilling)", () => {
  const design = panelDecomposition(toDesignProject([CAB]), QORASU_PROFILE).parts;
  const drill = solveRun([CAB]);

  it("panelDecomposition: panels carry profile kromka, ops are only saw-grooves (no drills)", () => {
    expect(design.some((p) => p.edges.some((e) => e > 0))).toBe(true); // profile kromka present
    const ops = design.flatMap((p) => p.operations);
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every((o) => o.op === "saw_groove")).toBe(true);
    expect(ops.some((o) => o.op === "drill")).toBe(false);
  });

  it("solveBaseCabinet: panels are bare-edged (no kromka) but carry drill holes", () => {
    expect(drill.length).toBeGreaterThan(0);
    expect(drill.every((p) => p.edges.every((e) => e === 0))).toBe(true); // no kromka
    const ops = drill.flatMap((p) => p.operations);
    expect(ops.some((o) => o.op === "drill")).toBe(true);
  });

  it("both agree on the carcass core: exactly 2 sides and 2 shelves", () => {
    expect(design.filter((p) => p.name.includes("бок"))).toHaveLength(2);
    expect(drill.filter((p) => p.name.includes("side"))).toHaveLength(2);
    expect(design.filter((p) => p.name.includes("полка"))).toHaveLength(2);
    expect(drill.filter((p) => p.name.includes("shelf"))).toHaveLength(2);
  });

  it("documents the KNOWN geometry differences (profile construction, not a bug)", () => {
    // panelDecomposition applies QORASU census defaults solveBaseCabinet does not:
    //  • a structural plinth (цоколь) — an extra panel solveBaseCabinet never emits
    expect(design.some((p) => p.name.includes("цоколь"))).toBe(true);
    expect(drill.some((p) => p.name.toLowerCase().includes("plinth"))).toBe(false);
    //  • sides shorter than full height (накладное bottom steals one board thickness)
    const dSide = design.find((p) => p.name.includes("бок"));
    const kSide = drill.find((p) => p.name.includes("side"));
    expect(dSide).toBeDefined();
    expect(kSide).toBeDefined();
    expect(dSide!.length_mm10).toBeLessThan(kSide!.length_mm10);
  });
});
