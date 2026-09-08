// A single cabinet module in the run (PRICING_AND_SCHEMA.md §1).

import type { MM, UUID } from "./common.js";

export type ModuleKind = "base" | "tall" | "upper";

export type ModuleFill = "shelves" | "drawers" | "open";

/**
 * THE FRONT'S BODY. Not a colour and not a material — the shape of the door itself, which is what
 * separates a plain slab kitchen from a neoclassic or a fluted one.
 *
 *   flat    — a plain slab
 *   shaker  — a routed frame around a recessed panel
 *   raised  — a routed frame around a RAISED, profiled panel (неоклассика)
 *   fluted  — vertical ribs routed across the face (рифлёный)
 *   glass   — a frame with a glass pane (витрина)
 *   grid    — a glass front with a mullion grid (витрина с раскладкой)
 *   none    — no front at all
 *
 * All but `glass`/`grid` are ONE piece of MDF: the CNC routes the profile into a single blank and it
 * is then painted. So a profiled front is a panel PLUS a machining operation — never an assembled
 * frame. Glass is the exception: the blank's middle is routed out and a bought pane goes in.
 *
 * (This replaces `DoorStyle = "flat" | "milled" | "glass" | "none"`, of which only `"none"` was ever
 * read by anything.)
 */
export type FrontProfile = "flat" | "shaker" | "raised" | "fluted" | "glass" | "grid" | "none";

/** @deprecated the old four-member style; kept as an alias while callers migrate */
export type DoorStyle = FrontProfile;

export type HandleType = "bar" | "profile" | "knob" | "none";

export interface ModuleDoor {
  style: FrontProfile;
  hingeSide?: "L" | "R";
  /** A LAMINATED front — N boards glued into one thick decorative facade (e.g. a heavy shaped /
   *  TV-cabinet front). The value is the LAYER COUNT: the cut list emits that many blanks + (N−1)
   *  glue lines, never one thick board (QONUNLAR §14.1 / DB/35: intent `{layers:2}` → 2 panels + 1
   *  glue, not a single 32mm panel; 3 → 3 panels + 2 glue). Absent → a single-board front. */
  layers?: 2 | 3;
}

export interface ModuleHandle {
  type: HandleType;
}

/** A door's opening side (hinge for left/right; hydraulic lift for top/bottom). */
export type DoorOpening = "left" | "right" | "top" | "bottom";

/** Where the handle sits on a door / drawer front. "center" = a central knob; "none" =
 *  handleless (a push-to-open / tip-on latch — a real hardware item in production). */
export type HandlePos = "top" | "bottom" | "left" | "right" | "center" | "none";

/** A per-zone DIVISION RULE (CONSTRUCTION_FRAME_v4 §4). Each child of a split may carry one:
 *   - `fixed`  — an absolute mm distance (plinth 100mm)
 *   - `ratio`  — a proportional weight (shelves 1 : 1 : 0.6)
 *   - `locked` — an mm dimension OWNED by the component in that space (a drawer-slide height
 *                180mm); Building-mode resize can NOT change it
 *   - `flex`   — absorbs whatever is left over (the hanging zone)
 *  Resize re-solves the chain: fixed + locked keep their mm, ratio shares the remainder by
 *  weight, flex absorbs what's left. When a Cell has no `rules`, its `sizes` (ratio fractions)
 *  apply exactly as before — so this is fully additive and backward-compatible. */
export type DivisionRule =
  | { kind: "fixed"; mm: number }
  | { kind: "ratio"; weight: number }
  | { kind: "locked"; mm: number }
  | { kind: "flex" };

/** A recursive interior cell — the hybrid model. Separators SPLIT a cell into `children`
 *  (rows = horizontal separators, cols = vertical), creating a grid of cells. A `front`
 *  (door / drawer) is then placed onto a cell — and because a front can sit on a SPLIT node,
 *  ONE door can cover a whole group of cells (the children become the compartments behind
 *  it). No front → an open compartment.
 *
 *  This is THE interior model. It supersedes the flat `fill`/`count`/`dividers` fields, which
 *  survive only as the legacy shape a tree is derived from (see pricing's `deriveLayout`). */
/** §B · a Cell BOUND to a library Component (a nested sled, a door-as-component, «place one, multiply by
 *  ratio»). Mirrors the engine contract's `ComponentRef` (POSYLKA-2, DesignNode.component). VERSION
 *  DISCIPLINE (founder): `pinnedVersion` is authoritative and NEVER auto-advances — a silent library
 *  update must not break a finalized project; the master accepts a newer version explicitly (after a
 *  fit-check). DB/27 holds by the shape: there is NO thickness/kromka/joint field here, only the binding,
 *  so a bound instance can never smuggle a construction opinion into a shared component. */
export interface ComponentRef {
  componentId: string;
  /** the version this instance is pinned to — only a deliberate accept changes it */
  pinnedVersion: number;
}

export interface Cell {
  split?: "rows" | "cols";
  sizes?: number[]; // child fractions (normalized to sum 1) — the RATIO shorthand
  /** per-child DIVISION RULE (§4). Same length as `children` when present. Overrides `sizes`;
   *  when absent, `sizes` (ratio) applies — additive, backward-compatible. */
  rules?: DivisionRule[];
  children?: Cell[];
  front?: "door" | "drawer"; // covers this cell's whole rect; undefined = open
  /** PER-CELL front profile (Гладкий/Стекло/Шейкер…) — overrides the module-wide `ModuleDoor.style` for
   *  THIS front only (a glass display door beside plain ones). Additive/optional: absent → the module
   *  style applies exactly as before. App-2 surface (render + pricing); NOT the frozen engine contract —
   *  `engine/contracts/design.ts` DesignNode carries no front profile, so this never reaches the CNC. */
  frontProfile?: FrontProfile;
  opening?: DoorOpening; // door only (default "left")
  handle?: HandlePos; // handle placement
  /** drawer only: the Blum LEGRABOX height CLASS — N (≥80mm) / M (≥106mm) / K (≥144mm) minimum interior
   *  height (37_MIN §2.1). Drives the drawer min-size gate so a zone too short for the chosen mechanism is
   *  flagged. Absent → N (the smallest) — every drawer drawn before classes existed stays an N at its old
   *  80mm gate, so this is fully additive. Founder-approved contract field (2026-08-10, #5). */
  drawerClass?: "N" | "M" | "K";
  /** drawer only: a top-down split of the drawer FLOOR into organizer compartments
   *  (cutlery tray). Same recursive model, edited from a top view. Never a cut panel. */
  organizer?: Cell;
  /** §B · present → this cell is a BOUND instance of a library Component (e.g. a nested sled). Absent →
   *  an ordinary subtree (detached). One mechanism covers nesting + doors-as-components + multiply-by-ratio. */
  component?: ComponentRef;
}

/** A door covering a rectangular block of the interior (fractions 0..1), spanning any number
 *  of cells. An overlay on top of the cell tree — it can span across rows AND columns, which
 *  a single tree node cannot express. */
export interface CombinedDoor {
  fx0: number;
  fy0: number;
  fx1: number;
  fy1: number;
  opening?: DoorOpening;
  handle?: HandlePos;
}

export interface Module {
  id: UUID;
  kind: ModuleKind;
  w: MM;
  h: MM;
  d: MM;
  fill: ModuleFill;
  /** Number of shelves or drawers. */
  count: number;
  /** Vertical separators (0..n). */
  dividers: number;
  door: ModuleDoor;
  handle: ModuleHandle;
  /** THE interior, as a cell tree. When present it supersedes `fill`/`count`/`dividers` for
   *  the whole decomposition (panels, fronts, hinges, slides). Absent → the decomposition
   *  falls back to those legacy fields. The app always sends one. */
  layout?: Cell;
  /** Doors spanning a rectangular block of cells — an overlay on `layout`. */
  combinedDoors?: CombinedDoor[];
  /** Optional override — enables the "split facade/carcass" advisor. */
  facadeMaterialId?: UUID;
  /** Applied hardening-panel preset ids. */
  hardening?: string[];
  /** Carcass board thickness in mm — 16 (default) or 18 («усиленный»). Mirrors the app Cabinet field so the
   *  REAL thickness survives into pricing/parts (DB/27: it is construction the intent CARRIES, never invented —
   *  parts read it, the value is not literal in code). Founder-approved additive contract field (2026-08-10). */
  boardThickness?: 16 | 18;
  /**
   * SHARED CARCASS. Modules tagged with the same `carcassGroup` are built as ONE box: two outer
   * sides, a shared stile at every internal boundary, and one top / bottom / back spanning the
   * whole run — instead of N separate boxes each with its own pair of sides.
   *
   * This is the economy build a workshop quotes for a row of wall units: four 600mm uppers merged
   * into one 2400 carcass drop from 8 side panels to 5 vertical panels, from 4 backs to 1, and
   * (crucially) from 8 wall hangers to one set for the whole box.
   *
   * The FRONTS ARE UNCHANGED. Every module keeps its own doors and drawers at exactly the size it
   * had standalone — merging is a carcass decision, not a facade one, so the kitchen looks
   * identical. Only the shell behind it changes.
   *
   * Absent (the default, and every project saved before this existed) → the module is its own
   * carcass, and the decomposition is bit-identical to what it always was.
   */
  carcassGroup?: string;
  /** WALL HANGERS (навесы) fitted to THIS BOX — an override of the shop's standing rule.
   *
   *  The rule (ProductionOpts.hangingsPerCarcass / hangingSpanMm) is what the workshop does by
   *  default, and it is right nearly always. But it is a rule about WIDTH, and it cannot know that
   *  this particular box carries a stone worktop, or hangs on plasterboard, or holds the microwave —
   *  which is exactly when a fitter wants a third pair of навесы and no formula will tell him so.
   *
   *  Read off the box's FIRST module (see pricing/carcass.hangingCount). Absent → the rule applies. */
  hangings?: number;
}
