// THE POLICE PROOF. Same mechanism that already makes the settings screen honest,
// pointed at the rule service.
//
// The bijection: DB/20's catalog ↔ engine/police/**. If someone legislates a rule and
// writes no file, THIS FAILS. If someone writes a rule DB/20 never legislated, this
// fails too. That is how CE-1 stops being possible to lose.
//
// The founder's question — "in some times other 'unlogical' things will happen, then
// what?" — is answered by the SENSE class: a new oddity becomes a new file, and this
// test then guards it like everything else.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { ALL_RULES, runPolice, findRule } from "../engine/police/registry.js";
import { panelDecomposition } from "../engine/index.js";
import { QORASU_PROFILE, OTHER_SHOP_PROFILE } from "../engine/catalogs/profiles.js";
import type { DesignNode, DesignProject } from "../engine/contracts/design.js";
import type { Part } from "../engine/contracts/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/** Rule IDs DB/20 legislates, read from the document itself — never a copy. */
function catalogIds(): string[] {
  const doc = readFileSync(join(ROOT, "DB", "20_ENGINE_INVARIANTS.md"), "utf8");
  return [...doc.matchAll(/^- \*\*((?:CE|GEO|CONS|DET)-\d+)\s/gm)].map((m) => m[1]!);
}

/** Rule files actually on disk, by the ID in their filename. */
function fileIds(): string[] {
  const base = join(ROOT, "engine", "police");
  return ["ce", "geo", "cons", "det", "sense"].flatMap((d) =>
    readdirSync(join(base, d))
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.split("_")[0]!),
  );
}

const cab = (nodeId: string, over: Partial<DesignNode> = {}): DesignNode => ({
  nodeId, kind: "cabinet", roleSlot: "korpus",
  size: { w_mm10: 6000, h_mm10: 7200, d_mm10: 5600 }, ...over,
});
const project = (nodes: DesignNode[]): DesignProject => ({
  projectId: "p", name: "police", nodes,
  slotBindings: { fasad: "A", korpus: "B", orqa: "C" }, overrides: [],
});

const part = (over: Partial<Part> = {}): Part => ({
  id: "p1", name: "деталь", length_mm10: 6000, width_mm10: 5000, thickness_mm10: 160,
  grain: "L", edges: { face1: null, face2: null, face3: null, face4: null },
  operations: [], ...over,
} as Part);

const ctxOf = (parts: Part[]) => ({ parts, profile: QORASU_PROFILE });

describe("POLICE — the catalog and the filesystem are the same set", () => {
  it("NO MISSING RULE — every rule DB/20 legislates has a physical file", () => {
    const missing = catalogIds().filter((id) => !fileIds().includes(id));
    expect(missing, `\nDB/20 legislates these with no file in engine/police/:\n  ${missing.join("\n  ")}\n`).toEqual([]);
  });

  it("NO PHANTOM RULE — every file is either in DB/20 or an explicit SENSE rule", () => {
    const known = new Set(catalogIds());
    const phantom = fileIds().filter((id) => !known.has(id) && !id.startsWith("SENSE"));
    expect(phantom, `\nrule files with no DB/20 entry:\n  ${phantom.join("\n  ")}\n`).toEqual([]);
  });

  it("every registered rule is reachable by its own id", () => {
    for (const r of ALL_RULES) expect(findRule(r.id)).toBe(r);
    expect(new Set(ALL_RULES.map((r) => r.id)).size).toBe(ALL_RULES.length); // no duplicate id
  });

  it("NO SILENT RULE — every rule states what it is, why it matters and where it came from", () => {
    for (const r of ALL_RULES) {
      expect(r.title.length, `${r.id} has no title`).toBeGreaterThan(5);
      expect(r.why.length, `${r.id} has no 'why' — a rule with no consequence is noise`).toBeGreaterThan(15);
      expect(r.source.length, `${r.id} has no source`).toBeGreaterThan(5);
    }
  });

  it("an unimplemented rule must SAY what blocks it — never a silent no-op", () => {
    for (const r of ALL_RULES.filter((x) => x.status === "not_implemented")) {
      expect(r.blockedBy?.length ?? 0, `${r.id} is not implemented and does not say why`).toBeGreaterThan(20);
    }
  });

  it("coverage is reported on EVERY run — 'ok:true' with dead rules is a lie by omission", () => {
    const rep = runPolice(ctxOf([part()]));
    expect(rep.coverage.total).toBe(ALL_RULES.length);
    expect(rep.coverage.active).toBeLessThan(rep.coverage.total); // honest: work remains
    expect(rep.coverage.notImplemented.length).toBeGreaterThan(0);
  });
});

describe("CE-1 — the rule that did not exist until 2026-08-15", () => {
  it("CATCHES a face drill deeper than the board — this passed validate.ts before", () => {
    const p = part({
      thickness_mm10: 160,
      operations: [{ op: "drill", id: "d1", face: "A", x_mm10: 1000, y_mm10: 1000,
        diameter_mm10: 80, depth_mm10: 200, source: "auto" }],
    });
    const v = runPolice(ctxOf([p]), ["CE"]).violations.filter((x) => x.ruleId === "CE-1");
    expect(v).toHaveLength(1);
    expect(v[0]!.detail).toContain("насквозь");
  });

  it("allows a blind hole that leaves 1mm of board", () => {
    const p = part({
      thickness_mm10: 160,
      operations: [{ op: "drill", id: "d1", face: "A", x_mm10: 1000, y_mm10: 1000,
        diameter_mm10: 80, depth_mm10: 150, source: "auto" }],
    });
    expect(runPolice(ctxOf([p]), ["CE"]).violations.filter((x) => x.ruleId === "CE-1")).toEqual([]);
  });

  it("does NOT fire on edge drills — they run along the panel, not through it", () => {
    const p = part({
      thickness_mm10: 160,
      operations: [{ op: "drill", id: "d1", face: "edge3", x_mm10: 6000, y_mm10: 1000,
        z_mm10: 80, diameter_mm10: 80, depth_mm10: 340, source: "auto" }],
    });
    expect(runPolice(ctxOf([p]), ["CE"]).violations.filter((x) => x.ruleId === "CE-1")).toEqual([]);
  });
});

describe("CE-2 / CE-3 — radius and web, not just centres", () => {
  it("CE-2 catches a Ø35 cup whose CENTRE is on the panel but whose edge is not", () => {
    const p = part({
      operations: [{ op: "drill", id: "cup", face: "A", x_mm10: 50, y_mm10: 1000,
        diameter_mm10: 350, depth_mm10: 130, source: "auto" }],
    });
    const v = runPolice(ctxOf([p]), ["CE"]).violations.filter((x) => x.ruleId === "CE-2");
    expect(v).toHaveLength(1);
  });

  it("CE-3 catches two bores closer than radii + web", () => {
    const p = part({
      operations: [
        { op: "drill", id: "a", face: "A", x_mm10: 1000, y_mm10: 1000, diameter_mm10: 150, depth_mm10: 120, source: "auto" },
        { op: "drill", id: "b", face: "A", x_mm10: 1080, y_mm10: 1000, diameter_mm10: 150, depth_mm10: 120, source: "auto" },
      ],
    });
    expect(runPolice(ctxOf([p]), ["CE"]).violations.filter((x) => x.ruleId === "CE-3")).toHaveLength(1);
  });

  it("the same two bores on DIFFERENT faces do not collide", () => {
    const p = part({
      operations: [
        { op: "drill", id: "a", face: "A", x_mm10: 1000, y_mm10: 1000, diameter_mm10: 150, depth_mm10: 120, source: "auto" },
        { op: "drill", id: "b", face: "B", x_mm10: 1080, y_mm10: 1000, diameter_mm10: 150, depth_mm10: 120, source: "auto" },
      ],
    });
    expect(runPolice(ctxOf([p]), ["CE"]).violations.filter((x) => x.ruleId === "CE-3")).toEqual([]);
  });
});

describe("SENSE — the furniture maker's eye", () => {
  it("SENSE-3 — QORASU wall cabinet now carries NO plinth (item 5 fixed at the profile)", () => {
    const design = project([cab("wall1", { cabinetType: "kitchen_wall" })]);
    const res = panelDecomposition(design, QORASU_PROFILE);
    // the profile gained a kitchen_wall scope with plinth.style "none" — no plinth part is cut…
    const plinths = res.parts.filter((p) => res.provenance[p.id]?.role === "plinth");
    expect(plinths, "a wall cabinet must not receive a plinth").toHaveLength(0);
    // …so SENSE-3 (the safety net that demanded this scope) is quiet on QORASU.
    const rep = runPolice({ parts: res.parts, profile: QORASU_PROFILE, design, provenance: res.provenance }, ["SENSE"]);
    expect(rep.violations.filter((x) => x.ruleId === "SENSE-3")).toEqual([]);
  });

  it("SENSE-3 still FIRES for any profile that gives a wall cabinet a plinth (detection intact)", () => {
    const design = project([cab("wall1", { cabinetType: "kitchen_wall" })]);
    // OTHER_SHOP has no kitchen_wall scope, so a wall cabinet falls through to its default plinth —
    // exactly the divergence SENSE-3 exists to catch. The rule is unchanged; only QORASU was fixed.
    const res = panelDecomposition(design, OTHER_SHOP_PROFILE);
    const rep = runPolice({ parts: res.parts, profile: OTHER_SHOP_PROFILE, design, provenance: res.provenance }, ["SENSE"]);
    const v = rep.violations.filter((x) => x.ruleId === "SENSE-3");
    expect(v).toHaveLength(1);
    expect(v[0]!.detail).toContain("kitchen_wall");
  });

  it("SENSE-2 is quiet on a normal cabinet — the police does not cry wolf", () => {
    const design = project([cab("c1", { cabinetType: "kitchen_base" })]);
    const res = panelDecomposition(design, QORASU_PROFILE);
    const rep = runPolice({ parts: res.parts, profile: QORASU_PROFILE, design, provenance: res.provenance }, ["SENSE"]);
    expect(rep.violations.filter((x) => x.ruleId === "SENSE-2")).toEqual([]);
  });
});
