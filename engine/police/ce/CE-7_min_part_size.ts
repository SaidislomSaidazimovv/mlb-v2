// CE-7 — no panel smaller than the machine can safely hold.
//
// A small part is not held by enough vacuum pods. It lifts mid-cut and becomes a
// projectile. The threshold is a workshop fact, so it belongs in the profile — until
// it lives there, this rule uses the conservative industry floor and SAYS so.

import type { Rule } from "../types.js";
import { violation } from "../types.js";

/** 100mm — the usual smallest side a vacuum bed holds reliably. NOT measured here. */
const MIN_SIDE_MM10 = 1000;

export const CE_7: Rule = {
  uid: "r-007",
  id: "CE-7",
  severity: "BLOCK",
  cls: "CE",
  title: "Минимальный размер детали",
  why: "Мелкую деталь не держат присоски: она отрывается на резе и улетает со стола.",
  source: "DB/20 CE-7 · порог 100мм — отраслевой минимум, НЕ замер этого цеха",
  status: "active",
  check(ctx) {
    const out = [];
    for (const part of ctx.parts) {
      const short = Math.min(part.length_mm10, part.width_mm10);
      if (short < MIN_SIDE_MM10) {
        out.push(violation("CE-7", part.id,
          `деталь ${part.length_mm10 / 10}×${part.width_mm10 / 10}мм: короткая сторона ${short / 10}мм < ${MIN_SIDE_MM10 / 10}мм`));
      }
    }
    return out;
  },
};
