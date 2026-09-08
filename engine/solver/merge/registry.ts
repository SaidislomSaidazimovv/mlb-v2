// THE MERGE PLANNER. One place that lists the blockers, one function that groups.
//
// The algorithm is deliberately the simplest thing that is correct: walk the run left
// to right, and extend the current group while every blocker allows it. Greedy, not
// optimal — and that is the right trade.
//
// WHY NOT OPTIMAL. A search for the best grouping would sometimes save one more panel,
// at the cost of being unpredictable: adding a cabinet at the right-hand end of a run
// could silently re-group everything to its left, and the master would find yesterday's
// carcass rebuilt today. Greedy is stable — a boundary's fate depends only on what is
// to its left, so editing the end of a run never disturbs the start.

import type { ConstructionProfile, DesignNode } from "../../contracts/design.js";
import type { MergeBlocker, MergeCandidate, MergePlan } from "./types.js";

import { MB_1 } from "./blockers/MB-1_merge_disabled.js";
import { MB_2 } from "./blockers/MB-2_different_depth.js";
import { MB_3 } from "./blockers/MB-3_different_height.js";
import { MB_4 } from "./blockers/MB-4_different_construction.js";
import { MB_5 } from "./blockers/MB-5_different_material.js";
import { MB_6 } from "./blockers/MB-6_exceeds_sheet.js";
import { MB_7 } from "./blockers/MB-7_exceeds_weight.js";
import { MB_8 } from "./blockers/MB-8_max_cabinets_per_carcass.js";
import { MB_9 } from "./blockers/MB-9_pinned_open.js";

/**
 * Order matters for the REPORT, not for the outcome: the first blocker to fire is the
 * reason the master is shown. Cheapest and most explanatory first — "the master pinned
 * it" and "you switched merging off" are better answers than "~46kg > 45kg".
 */
export const ALL_BLOCKERS: MergeBlocker[] = [MB_1, MB_9, MB_4, MB_2, MB_3, MB_5, MB_8, MB_6, MB_7];

export function findBlocker(id: string): MergeBlocker | undefined {
  return ALL_BLOCKERS.find((b) => b.id === id);
}

/** The first blocker that refuses this boundary, or null if every one allows it. */
export function firstBlocker(c: MergeCandidate): { blockerId: string; reason: string } | null {
  for (const b of ALL_BLOCKERS) {
    const reason = b.blocks(c);
    if (reason) return { blockerId: b.id, reason };
  }
  return null;
}

/**
 * Group the cabinets of ONE run into merged carcasses.
 *
 * Pure and deterministic: same cabinets + same profile → same plan, every time. It
 * emits no parts and mutates nothing — the decomposer decides what to do with the plan.
 */
export function planMerges(cabinets: DesignNode[], profile: ConstructionProfile): MergePlan {
  const plan: MergePlan = { groups: [], blocked: [] };
  if (cabinets.length === 0) return plan;

  let current: DesignNode[] = [cabinets[0]!];

  for (let i = 1; i < cabinets.length; i++) {
    const left = cabinets[i - 1]!, right = cabinets[i]!;
    const blocked = firstBlocker({ left, right, groupSoFar: current, profile });
    if (blocked) {
      plan.blocked.push({ leftNodeId: left.nodeId, rightNodeId: right.nodeId, ...blocked });
      plan.groups.push({ cabinets: current, panelsSaved: current.length - 1 });
      current = [right];
    } else {
      current.push(right);
    }
  }
  plan.groups.push({ cabinets: current, panelsSaved: current.length - 1 });
  return plan;
}

/**
 * Which cabinets lose their LEFT side panel.
 *
 * This is the whole geometric effect of a merge, and it is deliberately that small:
 * for every merged boundary, the right-hand cabinet simply does not cut its left side —
 * the left-hand cabinet's right side IS the shared board.
 *
 * The consequence worth knowing: every OTHER part — shelf, back, bottom, door, plinth —
 * comes out byte-identical to the unmerged case. Merging cannot silently change what it
 * was not asked to change, and `tests/merge.test.ts` proves exactly that.
 */
export function suppressedLeftSides(plan: MergePlan): Set<string> {
  const out = new Set<string>();
  for (const g of plan.groups) {
    for (let i = 1; i < g.cabinets.length; i++) out.add(g.cabinets[i]!.nodeId);
  }
  return out;
}
