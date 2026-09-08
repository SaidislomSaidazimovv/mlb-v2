// T6 — Facet tiering (facet darajalash). Sof funksiyalar (54§0).
// ASOS: 50§1 (facet jadvali: Tier-0 = topologiyadan, geometriyasiz; Tier-3 = yakuniy o'lchov kerak)
//   + 51 D8/E2 (stratifikatsiya: geometrik P1 qoida faqat Tier-0 facetga; adjacency=topology Tier-0;
//   edge_exposure=Tier-3) + 54§3 "T6 gate" (adjacency geomsiz hisoblanadi; edge_exposure rad).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";
import type { Role } from "./junction.ts";

export type Tier = 0 | 3;
export type FacetName =
  | "role" | "layer" | "axis" | "adjacency" | "zone" | "module" | "span" | "block.tags" | "size.outer" // Tier-0
  | "edge_exposure" | "size.clear"; // Tier-3

/** 50§1: qaysi facet qaysi darajada. Tier-0 — sheet topologiyasidan (geometriyadan oldin);
 *  Tier-3 — yakuniy o'lchov kerak. */
export const FACET_TIER: Record<FacetName, Tier> = {
  role: 0, layer: 0, axis: 0, adjacency: 0, zone: 0, module: 0, span: 0, "block.tags": 0, "size.outer": 0,
  edge_exposure: 3, "size.clear": 3,
};
export const tierOf = (f: FacetName): Tier => FACET_TIER[f];
export const isTier0 = (f: FacetName): boolean => FACET_TIER[f] === 0;

/** 51 D8: geometrik (P1) qoida predikati FAQAT Tier-0 facetga mos kelishi mumkin.
 *  Yozilish paytida statik tekshiriladi — Tier-3 facetli P1 qoida "D8" bilan RAD. */
export function assertGeometricPredicate(facets: FacetName[]): Refusal | null {
  const bad = facets.filter((f) => FACET_TIER[f] === 3);
  if (bad.length) return { rule: "D8", message: `Geometrik (P1) qoida Tier-3 facetga mos kelolmaydi: ${bad.join(", ")}` };
  return null;
}

export type Adjacency = "free-end" | "abutting" | "wall-facing";
export interface PanelTopo {
  role: Role;
  axis: "V" | "H";
  neighbors: { side: string; kind: "block" | "wall" | "none" }[]; // block-grafdan
}

/** 50§1: adjacency = block-grafdan (topologiya) — GEOMETRIYASIZ. */
export function computeAdjacency(topo: PanelTopo): Record<string, Adjacency> {
  const out: Record<string, Adjacency> = {};
  for (const n of topo.neighbors) {
    out[n.side] = n.kind === "block" ? "abutting" : n.kind === "wall" ? "wall-facing" : "free-end";
  }
  return out;
}

/** Facet hisoblash. Tier-0 → topologiyadan (geom kerak emas). Tier-3 (edge_exposure, size.clear)
 *  → yakuniy geometriya kerak; geom=null bo'lsa "facet.needsGeometry" bilan RAD (54 T6-gate). */
export type FinalGeometry = { edgeExposed: boolean[]; clearSize: number };
export function computeFacet(f: FacetName, topo: PanelTopo, geom: FinalGeometry | null): { value: unknown } | Refusal {
  if (FACET_TIER[f] === 3 && geom === null) {
    return { rule: "facet.needsGeometry", message: `${f} — Tier-3: yakuniy geometriya kerak, hozir yo'q` };
  }
  switch (f) {
    case "role": return { value: topo.role };
    case "axis": return { value: topo.axis };
    case "adjacency": return { value: computeAdjacency(topo) }; // Tier-0 — geomsiz
    case "edge_exposure": return { value: geom!.edgeExposed };  // Tier-3
    case "size.clear": return { value: geom!.clearSize };       // Tier-3
    default: return { rule: "facet.unimplemented", message: `bu facet hozir hisoblanmaydi: ${f}` };
  }
}
