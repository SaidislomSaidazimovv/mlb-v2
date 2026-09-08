// T7 — Cascade + stratifikatsiya. Sof funksiyalar (54§0).
// ASOS: 50§2 (qatlamlar past→yuqori; ENG YUQORI mos qatlam yutadi; qatlam ichida kelishmovchilik =
//   Conflict RAD, tiebreak yo'q; system TOTAL — topilmasa Incomplete RAD)
//   + 51 D8 (geometrik P1 qoida FAQAT Tier-0 facetga; YOZILISH paytida rad, run'da emas)
//   + 50§6 (blast-radius: "bu nimani o'zgartiradi" — mutatsiyasiz)
//   + 54§3 "T7 gate" (E1 tsiklik rad; E2 exposed-end-panel qabul).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";
import { FACET_TIER, type FacetName } from "./facets.ts";

/** 50§2: qatlamlar past→yuqori. Yuqorisi pastini yutadi (specificity arifmetikasi YO'Q). */
export const LAYERS = ["system", "catalog", "theme", "project", "wall", "module", "block", "pin"] as const;
export type Layer = (typeof LAYERS)[number];

export type Part = Record<string, unknown>; // facet qiymatlari bilan (role, adjacency, ...)

export interface Rule {
  layer: Layer;
  property: string;
  value: unknown;
  facets: FacetName[];              // predikat qaysi facetlarga tayanadi (D8 uchun)
  match: (part: Part) => boolean;
  pass?: "P1" | "P4";               // P1 = geometrik (Tier-0 only); P4 = appearance
}

export type Resolved = { value: unknown; layer: Layer } | Refusal;

/** 50§2: resolve. Past→yuqori yuramiz; har mos qatlam winner'ni yangilaydi (eng yuqorisi yutadi).
 *  Bir qatlamda bir property'ga turli qiymat → Conflict RAD. Hech topilmasa → Incomplete RAD. */
export function resolve(part: Part, property: string, rules: Rule[]): Resolved {
  let winner: { value: unknown; layer: Layer } | null = null;
  for (const layer of LAYERS) {
    const m = rules.filter((r) => r.layer === layer && r.property === property && r.match(part));
    if (m.length === 0) continue;
    const first = m[0]!.value;
    const allEqual = m.every((r) => r.value === first);
    if (!allEqual) {
      return { rule: "Conflict", message: `50§2: '${property}' — '${layer}' qatlamida ${m.length} qoida kelishmaydi (tiebreak yo'q)` };
    }
    winner = { value: first, layer };
  }
  if (winner === null) return { rule: "Incomplete", message: `50§2: '${property}' hech qaysi qatlamda aniqlanmagan (system total bo'lishi kerak)` };
  return winner;
}

/** 51 D8: qoidani YOZISH paytida tekshirish. P1 (geometrik) qoida Tier-3 facetga tayansa → "D8" RAD.
 *  54 T7-gate: E1 (size.clear = Tier-3, tsikl) rad; E2 (adjacency = Tier-0) qabul. */
export function authorRule(rule: Rule): Refusal | null {
  if (rule.pass === "P1") {
    const bad = rule.facets.filter((f) => FACET_TIER[f] === 3);
    if (bad.length) return { rule: "D8", message: `Geometrik (P1) qoida Tier-3 facetga tayanolmaydi: ${bad.join(", ")}` };
  }
  return null;
}

/** 50§6: blast-radius — qoida QAYSI partlarga tegadi ("bu nimani o'zgartiradi"), mutatsiyasiz. */
export function blastRadius(parts: Part[], rule: Rule): Part[] {
  return parts.filter((p) => rule.match(p));
}
