// SENSE-4 — a shelf is narrower than the opening it drops into.
//
// A shelf 1mm wider than its compartment does not fit and nobody finds out until the
// panels are cut, edged and delivered.

import type { Rule, Violation } from "../types.js";
import { violation } from "../types.js";

export const SENSE_4: Rule = {
  uid: "r-029",
  id: "SENSE-4",
  severity: "WARN",
  cls: "SENSE",
  title: "Полка входит в свой отсек",
  why: "Полка на 1мм шире проёма просто не встанет — и это выясняется после раскроя, кромления и доставки.",
  source: "Основатель, 2026-08-15 (класс «мысль мебельщика») · DB/28 B1 отсеки",
  status: "active",
  check(ctx) {
    if (!ctx.design || !ctx.provenance) return [];
    const t = ctx.profile.material.carcass_mm10;
    const byId = new Map(ctx.parts.map((p) => [p.id, p]));
    const out: Violation[] = [];
    const walk = (n: import("../../contracts/design.js").DesignNode): void => {
      if (n.kind === "cabinet") {
        const W = n.size?.w_mm10 ?? 0;
        const dividers = (n.children ?? []).filter((c) => c.kind === "divider").length;
        const inner = W - 2 * t;
        const compartment = Math.round((inner - dividers * t) / (dividers + 1));
        const shelfIds = (n.children ?? [])
          .filter((c) => c.kind === "shelf")
          .flatMap((c) => Object.entries(ctx.provenance!).filter(([, v]) => v.nodeId === c.nodeId).map(([id]) => id));
        for (const id of shelfIds) {
          const p = byId.get(id);
          if (!p) continue;
          // Shelves are stored depth×width (DB/28), so the compartment dimension is `width`.
          if (p.width_mm10 > compartment) {
            out.push(violation("SENSE-4", id,
              `полка ${p.width_mm10 / 10}мм шире отсека ${compartment / 10}мм — не встанет`));
          }
        }
      }
      (n.children ?? []).forEach(walk);
    };
    ctx.design.nodes.forEach(walk);
    return out;
  },
};
