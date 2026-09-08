// CONS-6 — no panel ships with an unresolved material, thickness or edge role.
//
// Implemented 2026-08-15: unlike its CONS siblings this one needs nothing the engine
// does not already have. A part with thickness 0, no grain decision, or an edge map
// that is missing entirely is a part the factory cannot cut — and today it would
// simply appear in the cut list looking normal.

import type { Rule, Violation } from "../types.js";
import { violation } from "../types.js";

export const CONS_6: Rule = {
  uid: "r-014",
  id: "CONS-6",
  severity: "BLOCK",
  cls: "CONS",
  title: "Every panel has a material + edges resolved.",
  why: "Деталь без толщины, текстуры или карты кромки нельзя ни распилить, ни окромить — а в раскрое она выглядит обычной.",
  source: "DB/20 CONS-6",
  status: "active",
  check(ctx) {
    const out: Violation[] = [];
    for (const p of ctx.parts) {
      if (p.thickness_mm10 <= 0) {
        out.push(violation("CONS-6", p.id, `толщина ${p.thickness_mm10 / 10}мм — материал не разрешён`));
      }
      if (!p.edges) {
        out.push(violation("CONS-6", p.id, "нет карты кромки"));
      }
      if (!p.grain) {
        out.push(violation("CONS-6", p.id, "не принято решение по текстуре (grain)"));
      }
    }
    return out;
  },
};
