// decomposeGroup — a placed library Component's root (NodeKind "group") → its panels as Parts.
// Proves the founder A2 hop: panelDecomposition now decomposes a component root, applying the
// modifier decompose (laminate → N blanks, viyemka → groove) on ANY panel, with the AXIS CONVENTION
// App-3 authorised 2026-08-25 under DB/34 §6: thickness = the smallest extent, face = the other two.
// Thickness VALUE is the profile's (DB/27), never the node's thin extent.

import { describe, it, expect } from "vitest";
import { panelDecomposition, QORASU_PROFILE } from "../engine/index.js";
import type { DesignProject, DesignNode } from "../engine/index.js";

const CARCASS = 160; // QORASU material.carcass_mm10 (16mm)
const FRONT = 220;   // QORASU material.front_mm10 (22mm)

function project(root: DesignNode): DesignProject {
  return {
    projectId: "t", name: "t", nodes: [root],
    slotBindings: { fasad: "F", korpus: "K", orqa: "C", stoleshnitsa: "W" },
    overrides: [],
  };
}

/** The exact shape App-3 exports (forge-library.json demo-component) — a group of divider panels,
 *  each with kind=role and size=geometry, two carrying modifiers. */
const demoRoot: DesignNode = {
  nodeId: "comp", kind: "group",
  size: { w_mm10: 5500, h_mm10: 7200, d_mm10: 5600 },
  children: [
    { nodeId: "d0", kind: "divider", roleSlot: "korpus", size: { w_mm10: 160, h_mm10: 7200, d_mm10: 5600 },
      modifiers: [{ type: "laminate", anchors: [], params: { layers: 2 } }] },
    { nodeId: "d1", kind: "divider", roleSlot: "korpus", size: { w_mm10: 1200, h_mm10: 900, d_mm10: 160 } },
    { nodeId: "d2", kind: "divider", roleSlot: "korpus", size: { w_mm10: 5000, h_mm10: 3500, d_mm10: 180 },
      modifiers: [{ type: "viyemka", anchors: [{ edge: "right", distance: { rule: "fixed", mm10: 1750 } }],
        params: { width: 400, depth: 90, run: 3500 } }] },
  ],
};

describe("decomposeGroup — a component root's panels → Parts (App-3 shape)", () => {
  const r = panelDecomposition(project(demoRoot), QORASU_PROFILE);
  const roleOf = (id: string) => r.provenance[id]?.role;
  const partsOf = (nodeId: string) => r.parts.filter((p) => r.provenance[p.id]?.nodeId === nodeId);

  it("emits every divider panel as a divider part (2 + 1 + 1 = 4, laminate doubles d0)", () => {
    expect(r.parts.filter((p) => roleOf(p.id) === "divider")).toHaveLength(4);
    expect(partsOf("d0")).toHaveLength(2); // laminate layers:2
    expect(partsOf("d1")).toHaveLength(1);
    expect(partsOf("d2")).toHaveLength(1);
  });

  it("thickness axis = the smallest extent; face = the other two (App-3 S1 convention)", () => {
    // d0 thin = w(160) → face height×depth → 7200 × 5600
    const d0 = partsOf("d0")[0]!;
    expect(d0.length_mm10).toBe(7200);
    expect(d0.width_mm10).toBe(5600);
    // d1 thin = d(160) → face height×width → 900 × 1200
    const d1 = partsOf("d1")[0]!;
    expect(d1.length_mm10).toBe(900);
    expect(d1.width_mm10).toBe(1200);
    // d2 thin = d(180) → face height×width → 3500 × 5000
    const d2 = partsOf("d2")[0]!;
    expect(d2.length_mm10).toBe(3500);
    expect(d2.width_mm10).toBe(5000);
  });

  it("thickness VALUE is the profile's carcass, NEVER the node's thin extent (DB/27; d2 is not 18mm)", () => {
    for (const p of r.parts) expect(p.thickness_mm10).toBe(CARCASS);
  });

  it("the viyemka modifier on d2 becomes a source:user saw-groove", () => {
    const d2 = partsOf("d2")[0]!;
    const grooves = (d2.operations ?? []).filter((o) => o.op === "saw_groove");
    expect(grooves).toHaveLength(1);
    expect(grooves[0]!.source).toBe("user");
  });

  it("no UNBOUND_SLOT when korpus is bound; a group emits no cabinet carcass (no side/bottom/top)", () => {
    expect(r.flags.some((f) => f.code === "UNBOUND_SLOT")).toBe(false);
    expect(r.parts.some((p) => ["side", "bottom", "top", "back"].includes(roleOf(p.id) ?? ""))).toBe(false);
  });
});

describe("decomposeGroup — a door panel takes the фасад thickness, not carcass", () => {
  const root: DesignNode = {
    nodeId: "g", kind: "group",
    children: [{ nodeId: "dr", kind: "door", roleSlot: "fasad", size: { w_mm10: 4000, h_mm10: 7000 } }],
  };
  const r = panelDecomposition(project(root), QORASU_PROFILE);
  const door = r.parts.find((p) => r.provenance[p.id]?.role === "door")!;

  it("a two-dimension door: absent depth is the thickness axis → face height×width", () => {
    expect(door.length_mm10).toBe(7000);
    expect(door.width_mm10).toBe(4000);
    expect(door.thickness_mm10).toBe(FRONT);
  });
});

describe("decomposeGroup — explicit thicknessAxis (§2.4) overrides the smallest-extent default", () => {
  const root: DesignNode = {
    nodeId: "g", kind: "group", size: { w_mm10: 1000, h_mm10: 2000, d_mm10: 3000 },
    children: [{ nodeId: "p", kind: "divider", roleSlot: "korpus",
      size: { w_mm10: 1000, h_mm10: 2000, d_mm10: 3000 }, thicknessAxis: "z" }],
  };
  const r = panelDecomposition(project(root), QORASU_PROFILE);
  const p = r.parts.find((x) => r.provenance[x.id]?.role === "divider")!;

  it("thicknessAxis 'z' (depth) → face = height×width, NOT the smallest-derived height×depth", () => {
    // smallest extent is width (1000) → default would be height×depth (2000×3000); the declared z wins
    expect(p.length_mm10).toBe(2000); // height
    expect(p.width_mm10).toBe(1000);  // width
    expect(p.thickness_mm10).toBe(160); // still the profile's carcass, never the node
  });
});
