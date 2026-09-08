// SENSE-3 — a wall cabinet does not stand on the floor, so it has no plinth.
//
// This is App-2's reported item #5, as a RULE rather than a workaround. QORASU_PROFILE now
// carries a `kitchen_wall` byType scope with plinth.style "none" (the fix this rule's own
// message asked for), so on QORASU no wall cabinet gets a plinth and this rule is quiet.
// The rule STAYS as the safety net: any profile lacking that scope falls back to the census
// default (plinth: box, 120mm) and emits a plinth a wall cabinet must not have — the silent
// divergence the Magic Separation exists to prevent, flagged loudly here.

import type { Rule, Violation } from "../types.js";
import { violation } from "../types.js";

/** Cabinet types that hang on a wall and therefore never carry a plinth. */
const HANGING: ReadonlySet<string> = new Set(["kitchen_wall"]);

export const SENSE_3: Rule = {
  uid: "r-028",
  id: "SENSE-3",
  severity: "WARN",
  cls: "SENSE",
  title: "У навесного шкафа нет цоколя",
  why: "Навесной шкаф не стоит на полу. Цоколь у него — лишняя деталь в раскрое и лишние деньги в смете.",
  source: "App-2, 2026-08-15 (пункт 5) · QORASU получил scope kitchen_wall; правило — страховка для профилей без него",
  status: "active",
  check(ctx) {
    if (!ctx.design || !ctx.provenance) return [];
    const out: Violation[] = [];
    const walk = (n: import("../../contracts/design.js").DesignNode): void => {
      if (n.kind === "cabinet" && n.cabinetType && HANGING.has(n.cabinetType)) {
        const plinths = Object.values(ctx.provenance!).filter((p) => p.nodeId === n.nodeId && p.role === "plinth");
        if (plinths.length > 0) {
          out.push(violation("SENSE-3", n.nodeId,
            `навесной шкаф (${n.cabinetType}) получил ${plinths.length} деталь(ей) цоколя. ` +
            `Добавьте scope byType.kitchen_wall с plinth.style = "none".`));
        }
      }
      (n.children ?? []).forEach(walk);
    };
    ctx.design.nodes.forEach(walk);
    return out;
  },
};
