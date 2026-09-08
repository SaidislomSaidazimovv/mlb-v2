// СЛИЯНИЕ СЕКЦИЙ — merge. DB/22 N1, Ulugbek's nuance №1; the founder, 2026-08-15:
// "This is very vital function!!! merging."
//
// WHAT IT IS. Two cabinets standing side by side each cut their own side panel, so the
// boundary between them is TWO boards face to face. Merging replaces them with ONE
// shared board. N cabinets merged: 2N side panels become N+1 — a saving of N−1 panels
// on every run, on every project, forever.
//
// THE USER EXPERIENCE DECISION (founder: "best ease for user"). Merging is AUTOMATIC.
// The master does not ask for it and does not tick a box: the engine merges wherever
// physics allows, reports every merge it made, and reports every merge it could NOT
// make WITH THE REASON. A master may pin a boundary open (`mergeLeft: "never"`); there
// is deliberately no way to force a merge past a blocker, because that would mean one
// board obeying two constructions with a saw already running.
//
// WHY THE BLOCKERS ARE FILES. DB/41's law. Each reason a merge is refused is its own
// file with its own `why`, so "why are there still two panels here?" always has an
// answer a human can navigate to. Same shape as engine/police/.
//
// SETTINGS vs PHYSICS — the line that matters:
//   SETTING  maxCabinetsPerCarcass — a shop opinion. Editable in Настройки → Объединение.
//   PHYSICS  different depth, height, construction — not opinions. Making them settings
//            would let someone switch off a law of the workshop.

import type { ConstructionProfile, DesignNode } from "../../contracts/design.js";

/** The two cabinets on either side of one boundary, plus what has already been grouped. */
export interface MergeCandidate {
  left: DesignNode;
  right: DesignNode;
  /** Cabinets already merged into the group `left` belongs to, including `left`. */
  groupSoFar: DesignNode[];
  profile: ConstructionProfile;
}

export interface MergeBlocker {
  /** "MB-1". Stable — a report cites it and a master looks up the file. */
  id: string;
  title: string;
  /** What physically goes wrong, or which rule is broken. Required. */
  why: string;
  source: string;
  /** Return a plain-language reason to REFUSE this boundary, or null to allow it. */
  blocks(c: MergeCandidate): string | null;
}

/** One merged carcass: cabinets in left-to-right order. Length 1 = not merged. */
export interface MergeGroup {
  cabinets: DesignNode[];
  /** Panels saved versus cutting each cabinet separately. */
  panelsSaved: number;
}

export interface MergePlan {
  groups: MergeGroup[];
  /** Every boundary that was NOT merged, and why — so the report answers both
   *  "what did you merge?" and "why not here?". */
  blocked: Array<{ leftNodeId: string; rightNodeId: string; blockerId: string; reason: string }>;
}
