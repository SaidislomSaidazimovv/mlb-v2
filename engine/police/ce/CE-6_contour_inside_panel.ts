// CE-6 — a contour mill stays inside the panel outline.

import type { Rule } from "../types.js";
import { violation } from "../types.js";

export const CE_6: Rule = {
  uid: "r-006",
  id: "CE-6",
  severity: "BLOCK",
  cls: "CE",
  title: "Контур внутри панели",
  why: "Фреза, вышедшая за габарит, режет вакуумный стол или прижим — а деталь срывается с присосок.",
  source: "DB/20 CE-6",
  status: "active",
  check(ctx) {
    const out = [];
    for (const part of ctx.parts) {
      for (const op of part.operations) {
        if (op.op !== "contour") continue;
        for (const s of op.segments) {
          if (s.endX_mm10 < 0 || s.endX_mm10 > part.length_mm10 ||
              s.endY_mm10 < 0 || s.endY_mm10 > part.width_mm10) {
            out.push(violation("CE-6", part.id,
              `контур ${op.id}: точка (${s.endX_mm10 / 10}, ${s.endY_mm10 / 10}) вне панели ` +
              `${part.length_mm10 / 10}×${part.width_mm10 / 10}мм`));
          }
        }
      }
    }
    return out;
  },
};
