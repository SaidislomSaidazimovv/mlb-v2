// toDesign adapter — app Cabinet run → canonical DesignProject → panelDecomposition.
// Proves the POSYLKA wiring seam: an app cabinet is decomposed by the ONE
// profile-driven function, with kromka coming from QORASU (K1 = 1.0mm), never "2mm".

import { describe, it, expect } from "vitest";
import { mk } from "../src/model/cabinet";
import { cabinetToDesignNode, slotBindingsFrom, toDesignProject, type ComponentResolver } from "../src/model/toDesign";
import { importComponents, resolveComponent, type KeyValue } from "../src/model/componentLibrary";
import { panelDecomposition, QORASU_PROFILE, type ComponentLibraryItem } from "../../../engine/index.js";

function fakeStore(): KeyValue {
  let v: string | null = null;
  return { getItem: () => v, setItem: (_k, val) => { v = val; } };
}

describe("toDesign — app Cabinet → canonical DesignNode", () => {
  it("maps a base shelf cabinet to a cabinet node with N shelf children (intent only)", () => {
    const cab = mk({ kind: "base", w: 600, h: 720, fill: "shelves", count: 2 });
    const node = cabinetToDesignNode(cab);

    expect(node.kind).toBe("cabinet");
    expect(node.cabinetType).toBe("kitchen_base");
    expect(node.size).toEqual({ w_mm10: 6000, h_mm10: 7200, d_mm10: 5600 });
    expect(node.children?.filter((c) => c.kind === "shelf")).toHaveLength(2);
    // DB/27: a design node carries NO construction — assert nothing leaked in.
    expect(node).not.toHaveProperty("thickness");
    expect(node).not.toHaveProperty("kromka");
  });

  it("maps a drawer stack to N drawer front children (one фасад each, split by height)", () => {
    const cab = mk({ kind: "base", w: 600, h: 720, fill: "drawers", count: 3 });
    const node = cabinetToDesignNode(cab);
    const fronts = node.children?.filter((c) => c.kind === "drawer") ?? [];
    expect(fronts).toHaveLength(3);
    // each drawer front: full width, height split evenly (720 / 3 = 240mm)
    expect(fronts[0]!.size).toEqual({ w_mm10: 6000, h_mm10: 2400 });
    expect(node.hasDoor).toBe(false);
  });

  it("a multi-door layout maps to one front node per door (per-cell fronts, engine cuts each)", () => {
    const cab = mk({ kind: "base", w: 800, h: 720, layout: { split: "cols", children: [{ front: "door" }, { front: "door" }] } });
    const node = cabinetToDesignNode(cab);
    // two door cells → two door front nodes (was one hasDoor before per-cell mapping)
    expect(node.children?.filter((c) => c.kind === "door")).toHaveLength(2);
    // end-to-end: panelDecomposition cuts two фасад parts, one per front
    const r = panelDecomposition(toDesignProject([cab]), QORASU_PROFILE);
    const roleOf = (id: string) => r.provenance[id]?.role;
    expect(r.parts.filter((p) => roleOf(p.id) === "door")).toHaveLength(2);
  });

  it("a nested layout (cols → rows) decomposes recursively — nesting works to depth 2+", () => {
    const cab = mk({ kind: "base", w: 800, h: 720, layout: {
      split: "cols", children: [
        { split: "rows", children: [{ front: "drawer" }, { front: "drawer" }] }, // left column: 2 drawers
        { front: "door" }, // right column: one door
      ],
    } });
    const node = cabinetToDesignNode(cab);
    const fronts = node.children?.filter((c) => c.kind === "door" || c.kind === "drawer") ?? [];
    // recursive decomposition sees all three fronts, not a flattened one
    expect(fronts.filter((f) => f.kind === "drawer")).toHaveLength(2);
    expect(fronts.filter((f) => f.kind === "door")).toHaveLength(1);
  });

  it("maps material slots to role bindings (role, not material, on the node)", () => {
    const b = slotBindingsFrom({ facade: "fac1", carcass: "car1", back: "bk1", worktop: "wt1" });
    // POSYLKA 2026-08-13 / DB/39: worktop (W) now binds the `stoleshnitsa` role — its own horizontal block.
    expect(b).toEqual({ fasad: "fac1", korpus: "car1", orqa: "bk1", stoleshnitsa: "wt1" });
  });

  it("skips free-standing furniture and corner units", () => {
    const cab = mk({ kind: "base", fill: "shelves", count: 1 });
    const table = mk({ furniture: "table" });
    const corner = mk({ corner: true });
    expect(toDesignProject([cab, table, corner]).nodes).toHaveLength(1);
  });
});

describe("toDesign — feeds panelDecomposition(QORASU)", () => {
  it("yields Part[] with profile-driven kromka (K1 = 1.0mm) and no flags", () => {
    const cab = mk({ kind: "base", w: 600, h: 720, fill: "shelves", count: 2 });
    const dp = toDesignProject([cab]);
    const r = panelDecomposition(dp, QORASU_PROFILE);

    expect(r.parts.length).toBeGreaterThan(0);
    // sides banded with K1 = 1.0mm = 10 mm10 (from the profile, never a hardcoded 2mm)
    const side = r.parts.find((p) => p.name.includes("бок"));
    expect(side?.edges).toContain(10);
    expect(r.flags).toEqual([]);
  });

  it("a drawer stack yields one фасад part per drawer (engine reads the drawer nodes)", () => {
    const cab = mk({ kind: "base", w: 600, h: 720, fill: "drawers", count: 3 });
    const r = panelDecomposition(toDesignProject([cab]), QORASU_PROFILE);
    const roleOf = (id: string) => r.provenance[id]?.role;
    const fronts = r.parts.filter((p) => roleOf(p.id) === "door");
    expect(fronts).toHaveLength(3);
    expect(fronts[0]!.length_mm10).toBe(2400); // height 720/3 = 240mm
    expect(fronts[0]!.width_mm10).toBe(6000); // full width
    expect(r.flags).toEqual([]);
  });
});

describe("toDesign — ④ placed component decompose wiring (the live end-to-end)", () => {
  // A Forge component: a single laminated фасад (2 layers → 2 blanks per §14 / DB/35 §7.4).
  const lamComponent: ComponentLibraryItem = {
    componentId: "lam-door", version: 1, schemaVersion: 1, name: "Ламинированный фасад",
    author: "forge", requiredSlots: [], gate: { ok: true, failures: [] },
    root: {
      nodeId: "root", kind: "group",
      children: [{
        nodeId: "d", kind: "door", size: { w_mm10: 4000, h_mm10: 7000 },
        modifiers: [{ type: "laminate", anchors: [], params: { layers: 2 } }],
      }],
    },
  };
  const resolve: ComponentResolver = (ref) =>
    ref.componentId === "lam-door" && ref.pinnedVersion === 1 ? lamComponent : undefined;

  it("a cell BOUND to a laminate component → its group root becomes a cabinet child that decomposes", () => {
    const cab = mk({ kind: "base", w: 400, h: 700, layout: { component: { componentId: "lam-door", pinnedVersion: 1 } } });
    // the placed component enters the design as a group node (DB_37 §4), not folded into the cabinet
    expect(cabinetToDesignNode(cab, resolve).children?.some((c) => c.kind === "group")).toBe(true);

    const r = panelDecomposition(toDesignProject([cab], undefined, resolve), QORASU_PROFILE);
    const roleOf = (id: string) => r.provenance[id]?.role;
    // the laminate modifier reached panelDecomposition via decomposeGroup — 2 фасад blanks, not one
    expect(r.parts.filter((p) => roleOf(p.id) === "door")).toHaveLength(2);
    expect(r.flags.some((f) => f.code === "UNBOUND_SLOT")).toBe(false);
  });

  it("an UNRESOLVED pin (missing from the library) fabricates nothing", () => {
    const cab = mk({ kind: "base", w: 400, h: 700, layout: { component: { componentId: "lam-door", pinnedVersion: 9 } } });
    const node = cabinetToDesignNode(cab, resolve); // pin 9 not in the library
    expect(node.children?.some((c) => c.kind === "group")).toBe(false);
    const r = panelDecomposition(toDesignProject([cab], undefined, resolve), QORASU_PROFILE);
    expect(r.parts.filter((p) => r.provenance[p.id]?.role === "door")).toHaveLength(0);
  });

  it("the same component placed twice → distinct node-ids, both decompose (no collision)", () => {
    const cab = mk({ kind: "base", w: 800, h: 700, layout: {
      split: "cols", children: [
        { component: { componentId: "lam-door", pinnedVersion: 1 } },
        { component: { componentId: "lam-door", pinnedVersion: 1 } },
      ],
    } });
    const r = panelDecomposition(toDesignProject([cab], undefined, resolve), QORASU_PROFILE);
    const roleOf = (id: string) => r.provenance[id]?.role;
    // 2 placements × 2 laminate blanks = 4 фасад parts, all with unique ids
    const doors = r.parts.filter((p) => roleOf(p.id) === "door");
    expect(doors).toHaveLength(4);
    expect(new Set(doors.map((p) => p.id)).size).toBe(4);
  });

  it("App-3 export shape: placing demo-component cuts real divider parts + a viyemka groove", () => {
    // A verbatim transcription of App-3's real forge-library.json (demo-component v1) — the same
    // "committed transcription of the real thing" pattern the golden XML fixtures use. Modifiers ride
    // on DIVIDER panels inside a `group` root, exactly as Forge exports them.
    const json = JSON.stringify([{
      componentId: "demo-component", version: 1, schemaVersion: 1, name: "Demo component",
      author: "usta", requiredSlots: ["korpus"], gate: { ok: true, failures: [] },
      root: {
        nodeId: "demo-component", kind: "group", size: { w_mm10: 5500, h_mm10: 7200, d_mm10: 5600 },
        children: [
          { nodeId: "demo:d0", kind: "divider", roleSlot: "korpus", size: { w_mm10: 160, h_mm10: 7200, d_mm10: 5600 },
            modifiers: [{ type: "laminate", anchors: [], params: { layers: 2 } }] },
          { nodeId: "demo:d1", kind: "divider", roleSlot: "korpus", size: { w_mm10: 1200, h_mm10: 900, d_mm10: 160 } },
          { nodeId: "demo:d2", kind: "divider", roleSlot: "korpus", size: { w_mm10: 5000, h_mm10: 3500, d_mm10: 180 },
            modifiers: [{ type: "viyemka", anchors: [{ edge: "right", distance: { rule: "fixed", mm10: 1750 } }],
              params: { width: 400, depth: 90, run: 3500 } }] },
        ],
      },
    }]);
    const s = fakeStore();
    expect(importComponents(json, s).imported.length).toBeGreaterThan(0);
    const resolveReal: ComponentResolver = (ref) => resolveComponent(ref, s);

    const cab = mk({ kind: "base", w: 550, h: 720, layout: { component: { componentId: "demo-component", pinnedVersion: 1 } } });
    const dp = toDesignProject([cab], { facade: "F", carcass: "K", back: "C", worktop: "W" }, resolveReal);
    const r = panelDecomposition(dp, QORASU_PROFILE);
    const roleOf = (id: string) => r.provenance[id]?.role;

    // v1: divider:0 laminate:2 → 2 blanks · divider:1 → 1 · divider:2 (viyemka) → 1 = 4 стойка parts
    const dividers = r.parts.filter((p) => roleOf(p.id) === "divider");
    expect(dividers).toHaveLength(4);
    // the viyemka modifier on divider:2 is a real source:user saw-groove in the cut list
    const grooves = dividers.flatMap((p) => (p.operations ?? []).filter((o) => o.op === "saw_groove" && o.source === "user"));
    expect(grooves).toHaveLength(1);
    // korpus is bound → no unbound-slot; thickness is the profile's 16mm carcass, never the node's thin extent
    expect(r.flags.some((f) => f.code === "UNBOUND_SLOT")).toBe(false);
    expect(dividers.every((p) => p.thickness_mm10 === 160)).toBe(true);
  });

  it("a component ADDED beside existing content decomposes BOTH — placement adds, never replaces", () => {
    const comp: ComponentLibraryItem = {
      componentId: "one-div", version: 1, schemaVersion: 1, name: "One divider",
      author: "u", requiredSlots: ["korpus"], gate: { ok: true, failures: [] },
      root: {
        nodeId: "r", kind: "group", size: { w_mm10: 3000, h_mm10: 7000, d_mm10: 5000 },
        children: [{ nodeId: "dv", kind: "divider", roleSlot: "korpus", size: { w_mm10: 160, h_mm10: 7000, d_mm10: 5000 } }],
      },
    };
    const resolveOne: ComponentResolver = (ref) => (ref.componentId === "one-div" ? comp : undefined);
    // the placement shape: the existing interior (a door cell) is KEPT; the component is a NEW column
    const cab = mk({ kind: "base", w: 800, h: 720, layout: {
      split: "cols", children: [{ front: "door" }, { component: { componentId: "one-div", pinnedVersion: 1 } }],
    } });
    const r = panelDecomposition(toDesignProject([cab], { facade: "F", carcass: "K", back: "C", worktop: "W" }, resolveOne), QORASU_PROFILE);
    const roleOf = (id: string) => r.provenance[id]?.role;
    // existing door front survives …
    expect(r.parts.filter((p) => roleOf(p.id) === "door")).toHaveLength(1);
    // … AND the component's divider is added (face height×depth = 7000×5000, profile carcass)
    const compDiv = r.parts.filter((p) => roleOf(p.id) === "divider");
    expect(compDiv).toHaveLength(1);
    expect(compDiv[0]!.length_mm10).toBe(7000);
    expect(compDiv[0]!.width_mm10).toBe(5000);
  });
});

describe("toDesign — DB/39 horizontal bands (2026-08-15 posylka)", () => {
  const roleOf = (r: ReturnType<typeof panelDecomposition>, id: string) => r.provenance[id]?.role;

  it("groups a wall-run of 2+ base cabinets into ONE worktop + ONE plinth, not per-cabinet", () => {
    const a = mk({ kind: "base", w: 600, h: 720, run: 0, x: 0, fill: "shelves", count: 1 });
    const b = mk({ kind: "base", w: 600, h: 720, run: 0, x: 600, fill: "shelves", count: 1 });
    const dp = toDesignProject([a, b], { facade: "F", carcass: "K", back: "C", worktop: "W" });
    const r = panelDecomposition(dp, QORASU_PROFILE);

    // The whole point of DB/39: 2 cabinets under one worktop → ONE slab, not two; ONE plinth board.
    expect(r.parts.filter((p) => roleOf(r, p.id) === "worktop")).toHaveLength(1);
    expect(r.parts.filter((p) => roleOf(r, p.id) === "plinth")).toHaveLength(1);
    // Slots are bound → no UNBOUND_SLOT flag. (Since the 2026-08-22 posylka the two base cabinets
    // also legitimately MERGE — that adds a MERGED flag, which is expected, not an error.)
    expect(r.flags.some((f) => f.code === "UNBOUND_SLOT")).toBe(false);
  });

  it("leaves a lone base cabinet standalone (v1: no run wrapper, hasWorktop deferred)", () => {
    const dp = toDesignProject([mk({ kind: "base", run: 0, fill: "shelves", count: 1 })]);
    expect(dp.nodes).toHaveLength(1);
    expect(dp.nodes[0]!.kind).toBe("cabinet"); // a lone base cabinet is NOT wrapped in a run
  });
});
