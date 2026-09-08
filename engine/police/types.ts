// ПОЛИЦИЯ — the rule service. One physical file per rule, navigable in the filesystem.
//
// THE FOUNDER'S LAW (2026-08-15): "I want those logics of testings to be physical file,
// so the logic of every component could be navigated in the file system."
//
// WHY THIS EXISTS AS FILES AND NOT ONE VALIDATOR. DB/20 legislated 25 invariants in
// 2026. `engine/core/validate.ts` implemented about four of them, in one 93-line
// function, with no way to ask "is CE-1 covered?" without reading the whole thing.
// CE-1 — "drill depth < panel thickness", which DB/20 itself calls "the single most
// important rule in the system" — was NOT among them. A face drill deeper than the
// board passed validation and would have gone through the panel.
//
// That is the same disease as the joints hole: legislated in a document, absent from
// code, invisible because there was no file for it to be missing from. The fix is the
// same shape that already works for settings — one file per rule, a registry, and a
// test that proves the DB/20 catalog and this folder are the SAME SET.
//
// HALF-NESS IS MADE VISIBLE, NOT FORBIDDEN. A rule that cannot be implemented yet
// still gets its file, with `status: "not_implemented"` and a stated `blockedBy`.
// That is the whole trick: a missing rule used to be silence; now it is a row in a
// coverage report that the build prints every run.

import type { Part } from "../contracts/types.js";
import type { ConstructionProfile, DecomposeResult, DesignProject } from "../contracts/design.js";

/** DB/20 §1's severity tiers, plus SENSE — see below. */
export type PoliceClass =
  /** Company-Ending. Could destroy a panel, break a tool, crash the spindle. HARD BLOCK. */
  | "CE"
  /** Geometry. Furniture is wrong or unbuildable, but not machine-dangerous. */
  | "GEO"
  /** Conservation. Data integrity — lost, duplicated or orphaned parts. */
  | "CONS"
  /** Determinism. Same input → same output. CI-enforced; never reaches a user. */
  | "DET"
  /**
   * FURNITURE SENSE — the founder's addition, 2026-08-15: "the police should have the
   * mind of the most advanced furniture maker … if it's a drawer there should be 2
   * sides, right? That kind of police."
   *
   * These are not machine-safety rules and not data-integrity rules. They are the
   * things a master cabinetmaker would notice in one glance and no schema can express.
   * Deliberately a separate class, because the answer to "unlogical things will happen"
   * is a place to PUT each new one — a file, not an argument.
   */
  | "SENSE";

/**
 * WHAT A VIOLATION MEANS (R47, 2026-08-22). Added after the research audit, which found
 * the biggest failure mode of a rule service is treating taste as law:
 *
 *   "The checks that survive contact with a master are the ones grounded in physics …
 *    The checks a master rejects are the ones that try to formalise TASTE or freeze one
 *    CONVENTION into a universal law. Build the first kind as gates; build the second
 *    kind as advice — and let the human veto it."
 *
 * A rule with no severity defaults to blocking, and a blocking taste rule is how a tool
 * starts insulting the person using it.
 */
export type Severity =
  /** Physically wrong or unsafe. Stop before CNC. */
  | "BLOCK"
  /** Very likely wrong; a human signs off. */
  | "WARN"
  /** Taste or economics. Surface it, never block, always suppressible. */
  | "ADVISORY";

/** Implemented, or knowingly not yet. Never a third, silent state. */
export type RuleStatus = "active" | "not_implemented";

export interface Violation {
  ruleId: string;
  /** Part id, node id, or profile id — whatever the master needs to find it. */
  where: string;
  /** Plain, with the measured numbers in it. Never "validation failed". */
  detail: string;
}

/** Everything a rule may look at. A rule that needs more must say so in `blockedBy`
 *  rather than reach outside this object. */
export interface PoliceContext {
  parts: Part[];
  profile: ConstructionProfile;
  design?: DesignProject;
  provenance?: DecomposeResult["provenance"];
}

export interface Rule {
  /**
   * IMMUTABLE, MEANINGLESS IDENTITY. Assigned once, never reused, never re-derived.
   *
   * R46's leading finding: every mature rule system (Sigma, CVE, CodeQL) separates a
   * stable id from the human name, and the PLM world calls the alternative — encoding
   * meaning into the identifier — the "smart part number" anti-pattern after twenty
   * years of unwinding it. Their verdict on our scheme was blunt: "the single thing you
   * will most regret at 10x is encoding meaning into rule IDs or filenames", because
   * every reclassification then becomes a rename cascade through saved customer files.
   *
   * So `id` below stays human-facing and may be renamed, split or re-filed freely.
   * `uid` is what a saved project stores. Cheap to add at 29 rules; a migration at 500.
   */
  uid: string;
  /** "CE-1", "SENSE-3". Human-facing; matches DB/20's catalog (proven by the test). */
  id: string;
  severity: Severity;
  cls: PoliceClass;
  /** The rule in one plain sentence, as a master would say it. */
  title: string;
  /** WHAT GOES WRONG if it is violated. Required — a rule with no consequence is noise. */
  why: string;
  /** DB/20 CE-1 · R11 · founder 2026-08-15. Required — no un-sourced rule. */
  source: string;
  status: RuleStatus;
  /** Required when status is "not_implemented": exactly what is missing. */
  blockedBy?: string;
  check(ctx: PoliceContext): Violation[];
}

export interface PoliceReport {
  ok: boolean;
  violations: Violation[];
  /** Honest coverage — how many legislated rules actually run. */
  coverage: { total: number; active: number; notImplemented: string[] };
}

/** Small helper so every rule file reads the same way. */
export const violation = (ruleId: string, where: string, detail: string): Violation =>
  ({ ruleId, where, detail });
