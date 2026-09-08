// componentPreview — the read-only «показать детали раскроя» helper decomposes a component's root
// (via the engine) so the «Компоненты» card can show the real parts. Same App-3 export shape.

import { describe, it, expect } from "vitest";
import { previewParts, componentPanelLayout, fitCheck, componentGate } from "../src/model/componentPreview";
import { QORASU_PROFILE } from "../../../engine/index.js";
import type { ComponentLibraryItem } from "../../../engine/index.js";

const demo: ComponentLibraryItem = {
  componentId: "demo-component", version: 1, schemaVersion: 1, name: "Demo component",
  author: "usta", requiredSlots: ["korpus"], gate: { ok: true, failures: [] },
  root: {
    nodeId: "demo", kind: "group", size: { w_mm10: 5500, h_mm10: 7200, d_mm10: 5600 },
    children: [
      { nodeId: "d0", kind: "divider", roleSlot: "korpus", size: { w_mm10: 160, h_mm10: 7200, d_mm10: 5600 },
        modifiers: [{ type: "laminate", anchors: [], params: { layers: 2 } }] },
      { nodeId: "d1", kind: "divider", roleSlot: "korpus", size: { w_mm10: 1200, h_mm10: 900, d_mm10: 160 } },
      { nodeId: "d2", kind: "divider", roleSlot: "korpus", size: { w_mm10: 5000, h_mm10: 3500, d_mm10: 180 },
        modifiers: [{ type: "viyemka", anchors: [{ edge: "right", distance: { rule: "fixed", mm10: 1750 } }],
          params: { width: 400, depth: 90, run: 3500 } }] },
    ],
  },
};

describe("componentPreview.previewParts — real parts from a component root", () => {
  const parts = previewParts(demo);

  it("returns every cut part in mm, laminate doubled (2 + 1 + 1 = 4)", () => {
    expect(parts).toHaveLength(4);
    // laminate:2 → two 720×560×16mm blanks (mm10 7200/5600/160 → mm)
    const d0 = parts.filter((p) => p.l_mm === 720 && p.w_mm === 560);
    expect(d0).toHaveLength(2);
    expect(d0[0]!.t_mm).toBe(16); // profile carcass, never the node's thin extent
  });

  it("marks the viyemka part with a groove", () => {
    expect(parts.filter((p) => p.hasGroove)).toHaveLength(1);
  });
});

describe("componentPanelLayout — the interim pos bridge (exact 3D/picture without a contract change)", () => {
  const withPos: ComponentLibraryItem = {
    componentId: "p", version: 1, schemaVersion: 1, name: "Positioned", author: "u",
    requiredSlots: [], gate: { ok: true, failures: [] },
    root: {
      nodeId: "r", kind: "group", size: { w_mm10: 1000, h_mm10: 2000, d_mm10: 500 },
      children: [
        // App-3's interim extra field `pos` (panel centre in the envelope frame) — not a contract field
        { nodeId: "a", kind: "divider", size: { w_mm10: 100, h_mm10: 2000, d_mm10: 500 }, pos: { x_mm10: 500, y_mm10: 1000, z_mm10: 250 } },
      ],
    } as unknown as ComponentLibraryItem["root"],
  };

  it("normalises each panel to 0..1 envelope space when every panel has pos", () => {
    const boxes = componentPanelLayout(withPos)!;
    expect(boxes).toHaveLength(1);
    // centre 500 − half 50 = 450 → 0.45 ; full-height 2000 → 1.0 spanning y 0..1
    expect(boxes[0]!.x).toBeCloseTo(0.45);
    expect(boxes[0]!.w).toBeCloseTo(0.1);
    expect(boxes[0]!.y).toBeCloseTo(0);
    expect(boxes[0]!.h).toBeCloseTo(1);
  });

  it("returns undefined (→ schematic fallback) when a panel has no pos", () => {
    const noPos: ComponentLibraryItem = {
      ...withPos,
      root: { ...withPos.root, children: [{ nodeId: "a", kind: "divider", size: { w_mm10: 100, h_mm10: 2000, d_mm10: 500 } }] },
    };
    expect(componentPanelLayout(noPos)).toBeUndefined();
  });
});

describe("fitCheck — B6 accept-fit-check (reject with a reason, never silent)", () => {
  const fitted = (fit: ComponentLibraryItem["fit"]): ComponentLibraryItem => ({
    componentId: "f", version: 1, schemaVersion: 1, name: "F", author: "u",
    requiredSlots: [], gate: { ok: true, failures: [] },
    root: { nodeId: "r", kind: "group", size: { w_mm10: 4000, h_mm10: 7000, d_mm10: 5600 }, children: [] },
    fit,
  });
  const okFit = { minW_mm10: 3800, maxW_mm10: 4200, minH_mm10: 6800, maxH_mm10: 7200, minD_mm10: 5000, maxD_mm10: 5600,
    validatedProfileId: "qorasu_eman_2026_07", validatedThicknesses_mm10: [160] };

  it("accepts a target inside the range, on the validated profile + thickness", () => {
    const r = fitCheck(fitted(okFit), { w_mm10: 4000, h_mm10: 7200, d_mm10: 5600 }, QORASU_PROFILE);
    expect(r.ok).toBe(true);
    expect(r.failures).toHaveLength(0);
  });

  it("rejects an out-of-range height WITH a reason", () => {
    const r = fitCheck(fitted(okFit), { w_mm10: 4000, h_mm10: 9000, d_mm10: 5600 }, QORASU_PROFILE);
    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.includes("высота"))).toBe(true);
  });

  it("rejects a component with no FitConstraint (unproven)", () => {
    const r = fitCheck(fitted(undefined), { w_mm10: 4000, h_mm10: 7000, d_mm10: 5600 }, QORASU_PROFILE);
    expect(r.ok).toBe(false);
    expect(r.failures[0]).toContain("не проверен");
  });
});

describe("componentGate — F2 client pre-check (schema·slot·decomposition·invariant)", () => {
  const base = (over: Partial<ComponentLibraryItem> = {}): ComponentLibraryItem => ({
    componentId: "g", version: 1, schemaVersion: 1, name: "G", author: "u",
    requiredSlots: ["korpus"], gate: { ok: true, failures: [] },
    root: {
      nodeId: "r", kind: "group", size: { w_mm10: 4000, h_mm10: 7000, d_mm10: 5600 },
      children: [{ nodeId: "d", kind: "divider", roleSlot: "korpus", size: { w_mm10: 160, h_mm10: 7000, d_mm10: 5000 } }],
    },
    ...over,
  });

  it("passes the four client stages for a clean component", () => {
    const r = componentGate(base());
    expect(r.ok).toBe(true);
    expect(r.stages.slice(0, 4).every((s) => s.ok)).toBe(true);
    // the two server stages are reported, not claimed as a pass
    expect(r.stages.find((s) => s.stage === "ad-integrity")?.detail).toContain("сервер");
  });

  it("fails the SLOT stage when a used roleSlot is not declared", () => {
    const r = componentGate(base({ requiredSlots: [] })); // divider uses korpus, but it isn't declared
    expect(r.ok).toBe(false);
    expect(r.stages.find((s) => s.stage === "slot")?.ok).toBe(false);
  });

  it("fails the SCHEMA stage on a bad shape", () => {
    const r = componentGate(base({ name: "" }));
    expect(r.stages.find((s) => s.stage === "schema")?.ok).toBe(false);
    expect(r.ok).toBe(false);
  });
});
