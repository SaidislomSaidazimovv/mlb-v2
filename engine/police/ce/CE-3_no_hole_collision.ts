// CE-3 — no two holes on the same face overlap.
//
// Overlapping bores blow out the web between them: the second bit enters a broken
// surface, wanders, and can snap. Two holes that merely touch are already too close —
// a minimum web of material must remain.

import type { Rule } from "../types.js";
import { violation } from "../types.js";

/** Material that must remain between two bores. 2mm. */
const MIN_WEB_MM10 = 20;

export const CE_3: Rule = {
  uid: "r-003",
  id: "CE-3",
  severity: "BLOCK",
  cls: "CE",
  title: "Отверстия не пересекаются",
  why: "Перекрывающиеся отверстия выламывают перемычку: второе сверло входит в рваную поверхность, уводит и ломается.",
  source: "DB/20 CE-3",
  status: "active",
  check(ctx) {
    const out = [];
    for (const part of ctx.parts) {
      const drills = part.operations.filter((o) => o.op === "drill");
      for (let i = 0; i < drills.length; i++) {
        for (let j = i + 1; j < drills.length; j++) {
          const a = drills[i], b = drills[j];
          if (!a || !b || a.face !== b.face) continue;       // different faces never collide
          const dx = a.x_mm10 - b.x_mm10, dy = a.y_mm10 - b.y_mm10;
          const need = a.diameter_mm10 / 2 + b.diameter_mm10 / 2 + MIN_WEB_MM10;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < need) {
            out.push(violation("CE-3", part.id,
              `${a.id} и ${b.id}: расстояние ${(dist / 10).toFixed(1)}мм, нужно ${(need / 10).toFixed(1)}мм ` +
              `(радиусы + 2мм перемычка)`));
          }
        }
      }
    }
    return out;
  },
};
