// CE-8 — every panel fits a sheet the workshop actually buys.

import type { Rule } from "../types.js";
import { violation } from "../types.js";

export const CE_8: Rule = {
  uid: "r-008",
  id: "CE-8",
  severity: "BLOCK",
  cls: "CE",
  title: "Деталь помещается в реальный лист",
  why: "Деталь больше листа невозможно раскроить. Ловится здесь, а не на пиле.",
  source: "DB/20 CE-8 · GEO-4 · лимиты из profile.defaults.merge.limits",
  status: "active",
  check(ctx) {
    const lim = ctx.profile.defaults.merge.limits;
    const out = [];
    for (const part of ctx.parts) {
      const long = Math.max(part.length_mm10, part.width_mm10);
      const short = Math.min(part.length_mm10, part.width_mm10);
      if (long > lim.maxSheetLength_mm10 || short > lim.maxSheetWidth_mm10) {
        out.push(violation("CE-8", part.id,
          `${long / 10}×${short / 10}мм больше листа ${lim.maxSheetLength_mm10 / 10}×${lim.maxSheetWidth_mm10 / 10}мм`));
      }
    }
    return out;
  },
};
