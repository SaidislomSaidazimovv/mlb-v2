// SENSE-2 — the same count, one level up. A carcass has exactly two sides.
//
// Three sides means a merge ran twice or a divider was misclassified; one side means a
// merge consumed a panel it should not have. Both are silent today.

import type { Rule, Violation } from "../types.js";
import { violation } from "../types.js";

export const SENSE_2: Rule = {
  uid: "r-027",
  id: "SENSE-2",
  severity: "WARN",
  cls: "SENSE",
  title: "У корпуса ровно два бока",
  why: "Три бока — слияние отработало дважды или стойку посчитали боком. Один — слияние съело лишнюю панель.",
  source: "Основатель, 2026-08-15 (класс «мысль мебельщика»)",
  status: "active",
  check(ctx) {
    if (!ctx.design || !ctx.provenance) return [];
    const out: Violation[] = [];
    const walk = (n: import("../../contracts/design.js").DesignNode): void => {
      if (n.kind === "cabinet") {
        const sides = Object.values(ctx.provenance!).filter((p) => p.nodeId === n.nodeId && p.role === "side").length;
        if (sides !== 2) {
          out.push(violation("SENSE-2", n.nodeId, `у корпуса ${sides} бок(ов), должно быть 2`));
        }
      }
      (n.children ?? []).forEach(walk);
    };
    ctx.design.nodes.forEach(walk);
    return out;
  },
};
