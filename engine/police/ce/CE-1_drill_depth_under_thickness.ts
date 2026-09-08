// CE-1 — THE MOST IMPORTANT RULE IN THE SYSTEM (DB/20's own words).
//
// It did not exist in code until 2026-08-15. `validate.ts` checked that a depth was
// positive and never compared it to the board. A face drill of 20mm into a 16mm panel
// passed every gate and would have gone straight through — a ruined panel, possibly a
// broken bit, on a machine where "one CNC error ends the company".

import type { Rule } from "../types.js";
import { violation } from "../types.js";
import { isEdgeFace } from "../../core/face.js";

/** Blind holes stop short of the far face. 1mm of board must remain. */
const SAFETY_MARGIN_MM10 = 10;

export const CE_1: Rule = {
  uid: "r-001",
  id: "CE-1",
  severity: "BLOCK",
  cls: "CE",
  title: "Глубина сверления меньше толщины панели",
  why: "Сквозное отверстие = испорченная деталь и, возможно, сломанное сверло. DB/20: «самое важное правило в системе».",
  source: "DB/20 CE-1",
  status: "active",
  check(ctx) {
    const out = [];
    for (const part of ctx.parts) {
      for (const op of part.operations) {
        // An EDGE drill runs along the panel, not through its thickness — its depth is
        // bounded by the panel's length/width, which CE-2 covers. Only face operations
        // eat into thickness.
        if (op.op === "drill" && isEdgeFace(op.face)) continue;
        const depth = op.op === "drill" || op.op === "saw_groove" ? op.depth_mm10 : undefined;
        if (depth === undefined) continue;
        const limit = part.thickness_mm10 - SAFETY_MARGIN_MM10;
        if (depth > limit) {
          out.push(violation("CE-1", part.id,
            `операция ${op.id}: глубина ${depth / 10}мм при толщине ${part.thickness_mm10 / 10}мм ` +
            `(предел ${limit / 10}мм — 1мм должен остаться). Сверло выйдет насквозь.`));
        }
      }
    }
    return out;
  },
};
