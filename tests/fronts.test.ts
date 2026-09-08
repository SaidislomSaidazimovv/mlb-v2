// Fronts (door / drawer child nodes) → one фасад part each.
//
// design.ts NodeKind, founder verbatim: "each drawn panel is ONE DesignNode ... with `kind` = its
// role and `size` = its geometry." So a design that carries door/drawer child nodes gets one фасад
// per node (drawers, per-cell doors, a split facade) — read off `node.children` exactly as the
// dividers/shelves are. A design that only sets `hasDoor` keeps the single full-size door, unchanged.

import { describe, expect, it } from "vitest";

import { panelDecomposition } from "../engine/index.js";
import { QORASU_PROFILE } from "../engine/catalogs/profiles.js";
import type { DesignNode, DesignProject } from "../engine/contracts/design.js";

const CAB_W = 6000; // 600mm
const CAB_H = 7200; // 720mm
const CAB_D = 5600; // 560mm

const project = (node: DesignNode): DesignProject => ({
  projectId: "p", name: "fronts", nodes: [node],
  slotBindings: { fasad: "A", korpus: "B", orqa: "C", stoleshnitsa: "W" }, overrides: [],
});

const cab = (extra: Partial<DesignNode>): DesignNode => ({
  nodeId: "cab", kind: "cabinet", roleSlot: "korpus",
  size: { w_mm10: CAB_W, h_mm10: CAB_H, d_mm10: CAB_D }, ...extra,
});

const roleOf = (r: ReturnType<typeof panelDecomposition>, id: string) => r.provenance[id]?.role;
const doors = (r: ReturnType<typeof panelDecomposition>) => r.parts.filter((p) => roleOf(r, p.id) === "door");

describe("panelDecomposition — fronts (door/drawer child nodes)", () => {
  it("emits one фасад part per door/drawer child node, at each node's own size", () => {
    const children: DesignNode[] = [
      { nodeId: "d1", kind: "door", size: { w_mm10: 2900, h_mm10: 7000 } },
      { nodeId: "d2", kind: "drawer", size: { w_mm10: 2900, h_mm10: 1800 } },
    ];
    const r = panelDecomposition(project(cab({ children })), QORASU_PROFILE);
    const ds = doors(r);
    expect(ds).toHaveLength(2);
    // xAxis:"height" → length_mm10 = node height, yAxis:"width" → width_mm10 = node width
    expect(ds[0]!.length_mm10).toBe(7000);
    expect(ds[0]!.width_mm10).toBe(2900);
    expect(ds[1]!.length_mm10).toBe(1800);
    expect(ds[1]!.width_mm10).toBe(2900);
    // the facade material thickness, not the carcass
    expect(ds[0]!.thickness_mm10).toBe(QORASU_PROFILE.material.front_mm10);
  });

  it("backward-compatible: hasDoor only (no front children) → one full-size door", () => {
    const r = panelDecomposition(project(cab({ hasDoor: true })), QORASU_PROFILE);
    const ds = doors(r);
    expect(ds).toHaveLength(1);
    expect(ds[0]!.length_mm10).toBe(CAB_H);
    expect(ds[0]!.width_mm10).toBe(CAB_W);
  });

  it("front children take precedence over hasDoor (no double-count)", () => {
    const children: DesignNode[] = [{ nodeId: "d1", kind: "door", size: { w_mm10: CAB_W, h_mm10: CAB_H } }];
    const r = panelDecomposition(project(cab({ children, hasDoor: true })), QORASU_PROFILE);
    expect(doors(r)).toHaveLength(1);
  });

  it("no fronts and no hasDoor → no фасад part", () => {
    const r = panelDecomposition(project(cab({})), QORASU_PROFILE);
    expect(doors(r)).toHaveLength(0);
  });

  it("a laminate modifier on a front cuts N identical фасад blanks (modifiers[]-decompose, DB/35 §7.4)", () => {
    const children: DesignNode[] = [
      { nodeId: "d1", kind: "door", size: { w_mm10: 2900, h_mm10: 7000 },
        modifiers: [{ type: "laminate", anchors: [], params: { layers: 2 } }] },
      { nodeId: "d2", kind: "drawer", size: { w_mm10: 2900, h_mm10: 1800 } }, // no laminate → one board
    ];
    const r = panelDecomposition(project(cab({ children })), QORASU_PROFILE);
    const ds = doors(r);
    // d1 laminated (2 layers) → 2 blanks; d2 plain → 1 → total 3
    expect(ds).toHaveLength(3);
    // the two d1 blanks are identical (same 7000mm length) and use the facade thickness
    const d1parts = ds.filter((p) => p.length_mm10 === 7000);
    expect(d1parts).toHaveLength(2);
    expect(d1parts[0]!.width_mm10).toBe(2900);
    expect(d1parts[0]!.thickness_mm10).toBe(QORASU_PROFILE.material.front_mm10);
  });

  it("a viyemka modifier on a front cuts a user SawGrooveOp on its face (modifiers[]-decompose, DB/35 §5.4)", () => {
    const children: DesignNode[] = [
      { nodeId: "d1", kind: "door", size: { w_mm10: 6000, h_mm10: 7200 },
        modifiers: [{ type: "viyemka", anchors: [{ edge: "bottom", distance: { rule: "fixed", mm10: 1000 } }], params: { width: 40, depth: 90, run: 0 } }] },
    ];
    const r = panelDecomposition(project(cab({ children })), QORASU_PROFILE);
    const ops = doors(r).flatMap((p) => p.operations).filter((o) => o.op === "saw_groove");
    // the decorative groove is a user saw-groove carrying the modifier's width/depth
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ op: "saw_groove", source: "user", width_mm10: 40, depth_mm10: 90, y_mm10: 1000, endX_mm10: 7200 });
  });
});
