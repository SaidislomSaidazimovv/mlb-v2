// DB/39 — horizontal bands. The claim under test, in one sentence:
//
//   Four cabinets under one worktop produce ONE slab, not four butted pieces.
//
// Цоколь, столешница, фартук and шапка are horizontal BLOCKS spanning the whole run.
// They are not properties of the cabinet beneath them and they are NOT cut at every
// cabinet joint. This file proves the engine agrees.

import { describe, expect, it } from "vitest";

import { panelDecomposition } from "../engine/index.js";
import { QORASU_PROFILE } from "../engine/catalogs/profiles.js";
import type { DesignNode, DesignProject, RunEnd } from "../engine/contracts/design.js";

const CAB_W = 6000;   // 600mm
const CAB_D = 5600;   // 560mm

const cab = (nodeId: string): DesignNode => ({
  nodeId, kind: "cabinet", roleSlot: "korpus",
  size: { w_mm10: CAB_W, h_mm10: 7200, d_mm10: CAB_D }, hasWorktop: true,
});

const band = (nodeId: string, bandRole: DesignNode["bandRole"], h?: number): DesignNode => ({
  nodeId, kind: "band", bandRole, roleSlot: "korpus", ...(h ? { size: { h_mm10: h } } : {}),
});

const run = (children: DesignNode[], begin: RunEnd = "open", end: RunEnd = "open"): DesignNode => ({
  nodeId: "run1", kind: "run", children, ends: { begin, end },
});

const project = (nodes: DesignNode[]): DesignProject => ({
  projectId: "p1", name: "bands", nodes,
  slotBindings: { fasad: "A", korpus: "B", orqa: "C", stoleshnitsa: "W" }, overrides: [],
});

const roleOf = (r: ReturnType<typeof panelDecomposition>, id: string) => r.provenance[id]?.role;
const partsOfRole = (r: ReturnType<typeof panelDecomposition>, role: string) =>
  r.parts.filter((p) => roleOf(r, p.id) === role);

const FOUR = ["c1", "c2", "c3", "c4"].map(cab);

describe("DB/39 — horizontal bands", () => {
  it("THE CLAIM — four cabinets under one worktop band produce ONE slab, not four", () => {
    const res = panelDecomposition(
      project([run([...FOUR, band("b_top", "stoleshnitsa")])]), QORASU_PROFILE,
    );
    const tops = partsOfRole(res, "worktop");
    expect(tops).toHaveLength(1);
    // Spans the whole run + one side overhang per OPEN end.
    const over = QORASU_PROFILE.defaults.worktop.sideOverhang_mm10;
    expect(tops[0]!.length_mm10).toBe(4 * CAB_W + 2 * over);
    expect(tops[0]!.width_mm10).toBe(CAB_D + QORASU_PROFILE.defaults.worktop.frontOverhang_mm10);
  });

  it("without a band, the old per-cabinet behaviour is untouched — four worktops", () => {
    const res = panelDecomposition(project(FOUR), QORASU_PROFILE);
    expect(partsOfRole(res, "worktop")).toHaveLength(4);
  });

  it("a цоколь band replaces the per-cabinet plinths — one run board, not four", () => {
    const res = panelDecomposition(
      project([run([...FOUR, band("b_plinth", "tsokol")])]), QORASU_PROFILE,
    );
    const plinths = partsOfRole(res, "plinth");
    expect(plinths).toHaveLength(1);
    expect(plinths[0]!.length_mm10).toBe(4 * CAB_W);
  });

  it("THE CLOSING RULE — a closed end gets no overhang; a wall needs no end cap", () => {
    const both = panelDecomposition(
      project([run([...FOUR, band("b", "stoleshnitsa")], "open", "open")]), QORASU_PROFILE);
    const oneClosed = panelDecomposition(
      project([run([...FOUR, band("b", "stoleshnitsa")], "closed", "open")]), QORASU_PROFILE);
    const bothClosed = panelDecomposition(
      project([run([...FOUR, band("b", "stoleshnitsa")], "closed", "closed")]), QORASU_PROFILE);

    const len = (r: ReturnType<typeof panelDecomposition>) => partsOfRole(r, "worktop")[0]!.length_mm10;
    const over = QORASU_PROFILE.defaults.worktop.sideOverhang_mm10;
    expect(len(both)).toBe(4 * CAB_W + 2 * over);
    expect(len(oneClosed)).toBe(4 * CAB_W + over);
    expect(len(bothClosed)).toBe(4 * CAB_W);
  });

  it("a band longer than the sheet is SEAMED — and the seam is reported, never silent", () => {
    const many = Array.from({ length: 8 }, (_, i) => cab(`c${i}`)); // 8 × 600 = 4800mm
    const r = panelDecomposition(
      project([run([...many, band("b", "stoleshnitsa")], "closed", "closed")]), QORASU_PROFILE);
    const max = QORASU_PROFILE.defaults.merge.limits.maxSheetLength_mm10; // 2750mm
    expect(8 * CAB_W).toBeGreaterThan(max);
    expect(partsOfRole(r, "worktop").length).toBeGreaterThan(1);
    expect(r.flags.some((f) => f.code === "BAND_SPLIT")).toBe(true);
    // The pieces still add up to the full run — a seam splits, it never shortens.
    expect(partsOfRole(r, "worktop").reduce((s, p) => s + p.length_mm10, 0)).toBe(8 * CAB_W);
  });

  it("a band with no height is refused, not guessed", () => {
    const res = panelDecomposition(
      project([run([...FOUR, band("b_shapka", "shapka")])]), QORASU_PROFILE);
    expect(partsOfRole(res, "shapka")).toHaveLength(0);
    expect(res.flags.some((f) => f.code === "DEGENERATE_GEOMETRY" && f.where === "b_shapka")).toBe(true);
  });

  it("a шапка band WITH a height cuts a real part, banded on its own visible edge", () => {
    const res = panelDecomposition(
      project([run([...FOUR, band("b_shapka", "shapka", 1500)])]), QORASU_PROFILE);
    const s = partsOfRole(res, "shapka");
    expect(s).toHaveLength(1);
    expect(s[0]!.length_mm10).toBe(4 * CAB_W);
    expect(s[0]!.width_mm10).toBe(1500);
  });
});

describe("connector geometry — reported, not enforced", () => {
  it("cam_dowel is MEASURED — no caveat at all", () => {
    const res = panelDecomposition(project(FOUR), QORASU_PROFILE);
    expect(res.flags.some((f) => f.code === "CONNECTOR_GEOMETRY_UNPROVEN")).toBe(false);
  });

  it("confirmat still CUTS — it carries its caveat instead of blocking the shop", () => {
    // Reversed on 2026-08-15. The engine used to refuse outright, which blocked a shop
    // already building with euro screws. Geometry is a variable with defaults.
    const euro = {
      ...QORASU_PROFILE,
      defaults: {
        ...QORASU_PROFILE.defaults,
        joints: { ...QORASU_PROFILE.defaults.joints, carcassConnector: "confirmat" as const },
      },
    };
    const res = panelDecomposition(project(FOUR), euro);
    expect(res.parts.length).toBeGreaterThan(0);            // work is NOT blocked
    const flag = res.flags.find((f) => f.code === "CONNECTOR_GEOMETRY_UNPROVEN");
    expect(flag).toBeDefined();
    expect(flag!.detail).toContain("не подтверждена");      // and the doubt survives to Export
  });
});
