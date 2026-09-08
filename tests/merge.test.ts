// ОБЪЕДИНЕНИЕ СЕКЦИЙ — merge. DB/22 N1 (Ulugbek's nuance №1), built 2026-08-15 on the
// founder's "this is very vital function!!! merging."
//
// The central property proved here is not "merge saves panels" — that is arithmetic.
// It is that **merging changes NOTHING ELSE**: every shelf, back, bottom, door and
// plinth comes out byte-identical to the unmerged run. A saving that quietly moved a
// shelf would be worse than no saving at all.

import { describe, expect, it } from "vitest";

import { panelDecomposition } from "../engine/index.js";
import { QORASU_PROFILE } from "../engine/catalogs/profiles.js";
import { planMerges, ALL_BLOCKERS, findBlocker } from "../engine/solver/merge/registry.js";
import type { DesignNode, DesignProject } from "../engine/contracts/design.js";
import type { Part } from "../engine/contracts/types.js";

const cab = (nodeId: string, over: Partial<DesignNode> = {}): DesignNode => ({
  nodeId, kind: "cabinet", roleSlot: "korpus", cabinetType: "kitchen_base",
  size: { w_mm10: 6000, h_mm10: 7200, d_mm10: 3000 }, ...over,
});

const run = (children: DesignNode[]): DesignNode =>
  ({ nodeId: "run1", kind: "run", children, ends: { begin: "open", end: "open" } });

const project = (nodes: DesignNode[]): DesignProject => ({
  projectId: "p", name: "merge", nodes,
  slotBindings: { fasad: "A", korpus: "B", orqa: "C" }, overrides: [],
});

const go = (nodes: DesignNode[]) => panelDecomposition(project(nodes), QORASU_PROFILE);
const rolesOf = (r: ReturnType<typeof go>, role: string) =>
  r.parts.filter((p) => r.provenance[p.id]?.role === role);

/** Identity-free shape of a part: what the factory actually cuts. */
const shape = (p: Part) => JSON.stringify({
  l: p.length_mm10, w: p.width_mm10, t: p.thickness_mm10, g: p.grain, e: p.edges,
  ops: [...p.operations].map((o) => ({ ...o, id: "" })),
});

describe("merge — the saving", () => {
  it("three cabinets in a run become ONE carcass: 6 sides → 4", () => {
    const merged = go([run([cab("c1"), cab("c2"), cab("c3")])]);
    expect(rolesOf(merged, "side")).toHaveLength(4);           // 2 outer + 2 shared
    const separate = go([cab("c1"), cab("c2"), cab("c3")]);
    expect(rolesOf(separate, "side")).toHaveLength(6);         // untouched without a run
  });

  it("the merge is REPORTED — a changed assembly may never be silent", () => {
    const r = go([run([cab("c1"), cab("c2"), cab("c3")])]);
    const m = r.flags.filter((f) => f.code === "MERGED");
    expect(m).toHaveLength(1);
    expect(m[0]!.detail).toContain("экономия 2");
  });

  it("MB-7 — three DEEP cabinets refuse to merge fully: 48kg is not carryable", () => {
    // 600×720×560 carcasses weigh ~16kg each in 16mm ЛДСП. Three of them is 48kg —
    // past the 45kg manual-handling limit, so the third stays its own carcass. This
    // is the blocker doing real work, not a test fixture quirk.
    const deep = (id: string) => cab(id, { size: { w_mm10: 6000, h_mm10: 7200, d_mm10: 5600 } });
    const r = go([run([deep("d1"), deep("d2"), deep("d3")])]);
    expect(r.flags.some((f) => f.code === "MERGE_BLOCKED" && f.detail.includes("MB-7"))).toBe(true);
    expect(rolesOf(r, "side")).toHaveLength(5);   // group of 2 (3 sides) + a single (2)
  });

  it("saving scales: N cabinets save N−1 panels", () => {
    for (const n of [2, 3]) {
      const cabs = Array.from({ length: n }, (_, i) => cab(`c${i}`));
      expect(rolesOf(go([run(cabs)]), "side")).toHaveLength(n + 1);
    }
  });
});

describe("merge — THE SAFETY PROPERTY: nothing else moves", () => {
  it("every non-side part is byte-identical to the unmerged run", () => {
    const cabs = [cab("c1"), cab("c2"), cab("c3")];
    const merged = go([run(cabs)]);
    const separate = go(cabs);

    const nonSides = (r: ReturnType<typeof go>) =>
      r.parts.filter((p) => r.provenance[p.id]?.role !== "side")
        .map((p) => `${p.id}|${shape(p)}`).sort();

    expect(nonSides(merged)).toEqual(nonSides(separate));
  });

  it("the sides that DO survive are unchanged in shape — only some are absent", () => {
    const cabs = [cab("c1"), cab("c2")];
    const mSides = rolesOf(go([run(cabs)]), "side").map(shape).sort();
    const sSides = rolesOf(go(cabs), "side").map(shape).sort();
    expect(mSides).toHaveLength(3);
    expect(sSides).toHaveLength(4);
    for (const s of mSides) expect(sSides).toContain(s);   // no new shape was invented
  });
});

describe("merge — the blockers, each answering 'why are there still two panels here?'", () => {
  const boundaryBlocked = (a: DesignNode, b: DesignNode) => {
    const r = go([run([a, b])]);
    return r.flags.find((f) => f.code === "MERGE_BLOCKED");
  };

  it("MB-2 different depth", () => {
    const f = boundaryBlocked(cab("c1"), cab("c2", { size: { w_mm10: 6000, h_mm10: 7200, d_mm10: 5600 } }));
    expect(f?.detail).toContain("MB-2");
  });

  it("MB-3 different height", () => {
    const f = boundaryBlocked(cab("c1"), cab("c2", { size: { w_mm10: 6000, h_mm10: 9000, d_mm10: 3000 } }));
    expect(f?.detail).toContain("MB-3");
  });

  it("MB-4 different construction — the DB/27 breach, caught before the saw", () => {
    const f = boundaryBlocked(cab("c1"), cab("c2", { cabinetType: "shelf_unit" }));
    expect(f?.detail).toContain("MB-4");
    expect(f?.detail).toContain("DB/27");
  });

  it("MB-5 different material slot", () => {
    const f = boundaryBlocked(cab("c1"), cab("c2", { roleSlot: "fasad" }));
    expect(f?.detail).toContain("MB-5");
  });

  it("MB-8 max cabinets per carcass — the one blocker that IS a setting", () => {
    const cabs = Array.from({ length: 5 }, (_, i) => cab(`c${i}`));
    const r = go([run(cabs)]);
    expect(r.flags.some((f) => f.code === "MERGE_BLOCKED" && f.detail.includes("MB-8"))).toBe(true);
    // 5 cabinets, limit 3 → groups of 3 and 2 → (3+1) + (2+1) = 7 sides, not 10.
    expect(rolesOf(r, "side")).toHaveLength(7);
  });

  it("MB-9 the master pins a boundary open — his decision beats the automation", () => {
    const f = boundaryBlocked(cab("c1"), cab("c2", { mergeLeft: "never" }));
    expect(f?.detail).toContain("MB-9");
    expect(rolesOf(go([run([cab("c1"), cab("c2", { mergeLeft: "never" })])]), "side")).toHaveLength(4);
  });

  it("MB-1 merging switched off in the profile stops everything", () => {
    const off = {
      ...QORASU_PROFILE,
      defaults: { ...QORASU_PROFILE.defaults, merge: { ...QORASU_PROFILE.defaults.merge, allowed: false } },
    };
    const r = panelDecomposition(project([run([cab("c1"), cab("c2")])]), off);
    expect(r.parts.filter((p) => r.provenance[p.id]?.role === "side")).toHaveLength(4);
    expect(r.flags.some((f) => f.code === "MERGE_BLOCKED" && f.detail.includes("MB-1"))).toBe(true);
  });
});

describe("merge — the planner is honest and stable", () => {
  it("every blocker states what it is, why it matters and where it came from", () => {
    for (const b of ALL_BLOCKERS) {
      expect(b.title.length, `${b.id} has no title`).toBeGreaterThan(5);
      expect(b.why.length, `${b.id} has no 'why'`).toBeGreaterThan(20);
      expect(b.source.length, `${b.id} has no source`).toBeGreaterThan(5);
      expect(findBlocker(b.id)).toBe(b);
    }
    expect(new Set(ALL_BLOCKERS.map((b) => b.id)).size).toBe(ALL_BLOCKERS.length);
  });

  it("GREEDY IS STABLE — appending a cabinet never re-groups what is to its left", () => {
    const base = [cab("c1"), cab("c2"), cab("c3")];
    const grown = [...base, cab("c4", { size: { w_mm10: 6000, h_mm10: 9999, d_mm10: 3000 } })];
    const g1 = planMerges(base, QORASU_PROFILE).groups[0]!.cabinets.map((c) => c.nodeId);
    const g2 = planMerges(grown, QORASU_PROFILE).groups[0]!.cabinets.map((c) => c.nodeId);
    expect(g2).toEqual(g1); // yesterday's carcass is not rebuilt today
  });

  it("planning is pure — same input, same plan, every time", () => {
    const cabs = [cab("c1"), cab("c2"), cab("c3")];
    expect(JSON.stringify(planMerges(cabs, QORASU_PROFILE)))
      .toBe(JSON.stringify(planMerges(cabs, QORASU_PROFILE)));
  });
});
