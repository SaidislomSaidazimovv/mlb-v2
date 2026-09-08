// CE-5 — a saw groove is shallower than the board, same logic as CE-1.
//
// Separate from CE-1 because a groove is cut by a different tool with a different
// failure mode: a saw that reaches the far face does not drill through, it splits the
// panel along its length.

import type { Rule } from "../types.js";
import { violation } from "../types.js";

const SAFETY_MARGIN_MM10 = 10;

export const CE_5: Rule = {
  uid: "r-005",
  id: "CE-5",
  severity: "BLOCK",
  cls: "CE",
  title: "Глубина паза меньше толщины",
  why: "Пила, дошедшая до дальней пласти, не «просверливает», а раскалывает панель по длине.",
  source: "DB/20 CE-5",
  status: "active",
  check(ctx) {
    const out = [];
    for (const part of ctx.parts) {
      for (const op of part.operations) {
        if (op.op !== "saw_groove") continue;
        const limit = part.thickness_mm10 - SAFETY_MARGIN_MM10;
        if (op.depth_mm10 > limit) {
          out.push(violation("CE-5", part.id,
            `паз ${op.id}: глубина ${op.depth_mm10 / 10}мм при толщине ${part.thickness_mm10 / 10}мм (предел ${limit / 10}мм)`));
        }
        if (op.width_mm10 <= 0) {
          out.push(violation("CE-5", part.id, `паз ${op.id}: некорректная ширина ${op.width_mm10 / 10}мм`));
        }
      }
    }
    return out;
  },
};
