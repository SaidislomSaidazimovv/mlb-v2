// CE-2 — a hole, PLUS ITS RADIUS, lies inside the panel.
//
// Stricter than the old bounds check, which tested the hole's CENTRE only. A Ø35 hinge
// cup whose centre sits 5mm from the edge passes a centre test and blows out the edge.

import type { Rule } from "../types.js";
import { violation } from "../types.js";

export const CE_2: Rule = {
  uid: "r-002",
  id: "CE-2",
  severity: "BLOCK",
  cls: "CE",
  title: "Отверстие целиком на панели, с учётом радиуса",
  why: "Центр внутри панели ещё не значит, что отверстие внутри. Ø35 чашка в 5мм от кромки выламывает торец.",
  source: "DB/20 CE-2",
  status: "active",
  check(ctx) {
    const out = [];
    for (const part of ctx.parts) {
      for (const op of part.operations) {
        if (op.op !== "drill") continue;
        const r = op.diameter_mm10 / 2;
        const x = op.x_mm10, y = op.y_mm10;
        if (x - r < 0 || x + r > part.length_mm10 || y - r < 0 || y + r > part.width_mm10) {
          out.push(violation("CE-2", part.id,
            `отверстие ${op.id} Ø${op.diameter_mm10 / 10}мм в (${x / 10}, ${y / 10}) выходит за панель ` +
            `${part.length_mm10 / 10}×${part.width_mm10 / 10}мм с учётом радиуса`));
        }
      }
    }
    return out;
  },
};
