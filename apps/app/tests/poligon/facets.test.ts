// T6 — Facet tiering testlari. ASOS: 50§1 + 51 D8/E2 + 54§3 "T6 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FACET_TIER, isTier0, assertGeometricPredicate, computeAdjacency, computeFacet,
  type PanelTopo,
} from "../../src/poligon/model/facets.ts";

const topo: PanelTopo = {
  role: "side",
  axis: "V",
  neighbors: [
    { side: "left", kind: "block" },
    { side: "right", kind: "wall" },
    { side: "top", kind: "none" },
  ],
};

test("FACET_TIER: adjacency/size.outer Tier-0; edge_exposure/size.clear Tier-3 (50§1)", () => {
  assert.equal(FACET_TIER.adjacency, 0);
  assert.equal(FACET_TIER["size.outer"], 0);
  assert.equal(FACET_TIER.edge_exposure, 3);
  assert.equal(FACET_TIER["size.clear"], 3);
  assert.equal(isTier0("adjacency"), true);
  assert.equal(isTier0("edge_exposure"), false);
});

test("D8: geometrik qoida Tier-0 facetlarga — OK; Tier-3 → rad (51 D8)", () => {
  assert.equal(assertGeometricPredicate(["role", "adjacency", "size.outer"]), null);
  const bad = assertGeometricPredicate(["role", "edge_exposure"]);
  assert.equal(bad?.rule, "D8");
});

test("computeAdjacency: block=abutting, wall=wall-facing, none=free-end (50§1, topologiya)", () => {
  const a = computeAdjacency(topo);
  assert.equal(a["left"], "abutting");
  assert.equal(a["right"], "wall-facing");
  assert.equal(a["top"], "free-end");
});

test("T6-GATE: adjacency GEOMSIZ hisoblanadi (Tier-0)", () => {
  const r = computeFacet("adjacency", topo, null);
  assert.equal("value" in r, true);
});

test("T6-GATE: edge_exposure geomsiz RAD qiladi (Tier-3)", () => {
  const r = computeFacet("edge_exposure", topo, null);
  assert.equal("rule" in r, true);
  assert.equal((r as { rule: string }).rule, "facet.needsGeometry");
});

test("edge_exposure geometriya bilan hisoblanadi", () => {
  const r = computeFacet("edge_exposure", topo, { edgeExposed: [true, false, true, false], clearSize: 568 });
  assert.equal("value" in r, true);
});
