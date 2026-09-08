import { describe, it, expect } from "vitest";
import type { Project } from "../../schema/src/index.js";
import { priceProject, buildBom, modulesToParts, seedRateTable } from "../src/index.js";

// Seed RateTable material UUIDs (packages/pricing/seed/rate-table.seed.json).
const LDSP = "cca8dc43-3ec6-4c8c-980d-05bf4625cc16"; // carcass, 95000/m²
const MDF = "1d2c7bbe-c4c8-4f08-a1b7-85a55823c545"; // facade,  240000/m²
const WORKTOP = "e8b5f6db-2fec-4e55-a3e0-8205087a2ad9"; // 185000/m
const EDGE_2MM = "3f5c7d17-561b-4d84-bb87-4367cfcb769d"; // 3500/m
const EDGE_04MM = "ea86c841-0136-43ea-b06e-8fa8f5977408"; // 1200/m

// One base cabinet: 600×720×560, one shelf, one flat door, on a worktop.
const kitchen: Project = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Example kitchen — one base cabinet",
  ownerId: "00000000-0000-4000-8000-0000000000aa",
  units: "mm",
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z",
  schemaVersion: 1,
  space: {
    source: "manual",
    shape: "i",
    wallLength: 3000,
    ceilingHeight: 2700,
    waterWall: "left",
    constraints: [],
  },
  run: [
    {
      id: "mod-1",
      kind: "base",
      w: 600,
      h: 720,
      d: 560,
      fill: "shelves",
      count: 1,
      dividers: 0,
      door: { style: "flat" },
      handle: { type: "bar" },
    },
  ],
  materials: {
    carcassId: LDSP,
    facadeId: MDF,
    worktopId: WORKTOP,
    edgeVisibleId: EDGE_2MM,
    edgeHiddenId: EDGE_04MM,
  },
  pricing: {
    rateTableId: seedRateTable.id,
    snapshotAt: "2026-06-20T00:00:00.000Z",
  },
};

// Hand-checked totals, against the CURRENT seed rate table.
//
// This cabinet cuts 7 panels, 26 drilled holes, 0.6m of worktop, and — per the DB/25 census
// (buildBom.carcassBandK1Mm) — 7.224m of VISIBLE K1 edge and NO hidden K2 edge. That K1 metre is the
// door's 2.64m perimeter plus 4.584m of carcass front-facing edge (both verticals of each side =
// 2×2×720, the front of the top/bottom/shelf = 3×568). The census tapes every one of those K1, and
// nothing a frameless box is built from is hidden K2 (only the плинтус is, and it is not a priced
// panel) — so the hidden bucket is empty. (packages/pricing/test/cells.test.ts proves the cell-tree
// decomposition emits panels bit-identical to the flat one it replaced.) Re-derived against the
// seed's rates — edge 5500 (K1) / 3500 (K2), drill 800/hole, cut 2200/panel, edgeband 0/m:
//
//   carcassFacade : panels 311982 + assembly 80000                     = 391982
//   worktopEdge   : edge 7.224×5500                                    =  39732
//   ordered       : worktop 0.6×185000 (stone — a bought ordered good) = 111000
//   hardware      : hinge 24000 + dowel 2400 + cam 12000               =  38400
//   cnc           : drill 26×800 + cut 7×2200 + edgeband 7.224×0       =  36200
//   delivery      : base 150000 + perModule 20000                      = 170000
//   total                                                              = 787314
const EXPECTED = {
  total: 787_314,
  groups: {
    carcassFacade: 391_982,
    worktopEdge: 39_732,
    ordered: 111_000,
    hardware: 38_400,
    cnc: 36_200,
    delivery: 170_000,
  },
} as const;

describe("priceProject — one example kitchen", () => {
  const quote = priceProject(kitchen, seedRateTable);

  it("prices the kitchen to the hand-checked total", () => {
    expect(quote.currency).toBe("UZS");
    expect(quote.total).toBe(EXPECTED.total);
  });

  it("breaks the total into the six UI groups (glass + stone roll up as ordered goods)", () => {
    expect(quote.groups).toEqual(EXPECTED.groups);
  });

  it("keeps the books balanced (Σ groups === Σ lines === total)", () => {
    const sumGroups = Object.values(quote.groups).reduce((a, b) => a + b, 0);
    const sumLines = quote.lines.reduce((a, b) => a + b.amount, 0);
    expect(sumGroups).toBe(quote.total);
    expect(sumLines).toBe(quote.total);
  });

  it("reports one item and a complete BOM", () => {
    expect(quote.itemCount).toBe(1);
    // 18, not 19: the census tapes every carcass edge K1, so there is no hidden-K2 edge line.
    expect(quote.lines.length).toBe(18);
    // every line is rate × qty rounded, and carries a group
    for (const line of quote.lines) {
      expect(line.amount).toBe(Math.round(line.qty * line.rate));
      expect(line.group).toBeTruthy();
    }
  });

  it("is pure — identical inputs give an identical quote", () => {
    const again = priceProject(kitchen, seedRateTable);
    expect(again).toEqual(quote);
  });
});

describe("buildBom / modulesToParts", () => {
  it("derives 7 engine parts for the cabinet (6 carcass + 1 door)", () => {
    const parts = modulesToParts(kitchen);
    expect(parts.length).toBe(7);
    // engine contract is mm10: 720mm → 7200, 560mm → 5600
    const sideLeft = parts.find((p) => p.name === "side-left");
    expect(sideLeft).toMatchObject({ length_mm10: 7200, width_mm10: 5600 });
  });

  it("emits a rate-free BOM (no rate/amount/group yet)", () => {
    for (const line of buildBom(kitchen)) {
      expect(line).not.toHaveProperty("rate");
      expect(line).not.toHaveProperty("amount");
      expect(line).not.toHaveProperty("group");
    }
  });
});
