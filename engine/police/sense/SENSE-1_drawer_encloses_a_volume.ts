// SENSE-1 — a drawer must ENCLOSE A VOLUME.
//
// ─────────────────────────────────────────────────────────────────────────────────
// CORRECTED 2026-08-22, and the correction matters.
//
// This rule shipped on 2026-08-15 as "a drawer has two sides and a bottom", taken
// verbatim from the founder's example. The R47 research audit named it, specifically,
// as one of the checks a real master would call nonsense:
//
//   "The founder's example is a great ILLUSTRATION but a dangerous literal rule.
//    Corner drawers, curved drawers, sink-front tip-outs, and pull-outs with a single
//    wrap-around side or a bent-metal box (LEGRABOX) violate '2 sides' and are still
//    correct. The real predicate is TOPOLOGICAL CLOSURE — a drawer must enclose a
//    volume and be openable — not a side count. Encoding '2 sides' verbatim encodes a
//    false rule."
//
// It is right, and this was worse than a missing rule: a false rule fires on correct
// furniture, and a police that cries wolf gets switched off. The instinct behind the
// example was sound — a drawer that is one panel is not a drawer — so the rule stays.
// What changes is the predicate: closure, not arithmetic.
//
// Note the severity too. WARN, not BLOCK. A drawer we cannot see the sides of is very
// probably wrong, but a metal-box system legitimately cuts almost nothing, and no
// count we invent should stop a shop that builds them.
// ─────────────────────────────────────────────────────────────────────────────────

import type { Rule, Violation } from "../types.js";
import { violation } from "../types.js";

/** Roles that form an upstand — a wall of the box, whichever way it is oriented. */
const UPSTAND: ReadonlySet<string> = new Set(["side", "divider", "door", "filler"]);

/**
 * A box needs a floor plus enough walls to enclose something. Three upstands is the
 * honest floor: a wrap-around single side still reads as two walls plus a front, and a
 * bent-metal box carries its own. Fewer than that is not a container by any reading.
 */
const MIN_UPSTANDS = 3;

export const SENSE_1: Rule = {
  uid: "r-026",
  id: "SENSE-1",
  severity: "WARN",
  cls: "SENSE",
  title: "Ящик замыкает объём",
  why: "Ящик — это ёмкость: дно плюс стенки вокруг него. Одна панель ёмкостью не является, и собрать такой короб нельзя, хотя каждая деталь по отдельности корректна.",
  source: "Основатель 2026-08-15 (пример «у ящика 2 бока») · ИСПРАВЛЕНО по R47: считать замыкание, а не количество боков — угловые, гнутые и металлические короба нарушают счёт и при этом верны",
  status: "active",
  check(ctx) {
    if (!ctx.design || !ctx.provenance) return [];
    const out: Violation[] = [];
    const walk = (n: import("../../contracts/design.js").DesignNode): void => {
      if (n.kind === "drawer") {
        const mine = Object.values(ctx.provenance!).filter((p) => p.nodeId === n.nodeId);
        // A drawer that cuts NOTHING is a proprietary box system (LEGRABOX and kin):
        // the metal carries the box and only the front is ours. Not our business.
        if (mine.length > 0) {
          const floor = mine.filter((p) => p.role === "bottom").length;
          const walls = mine.filter((p) => UPSTAND.has(p.role)).length;
          if (floor < 1 || walls < MIN_UPSTANDS) {
            out.push(violation("SENSE-1", n.nodeId,
              `ящик не замыкает объём: дно ×${floor}, стенок ×${walls} ` +
              `(нужно дно и минимум ${MIN_UPSTANDS} стенки). Короб не собрать.`));
          }
        }
      }
      (n.children ?? []).forEach(walk);
    };
    ctx.design.nodes.forEach(walk);
    return out;
  },
};
