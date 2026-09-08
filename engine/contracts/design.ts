// DB/27 — the design/construction separation, as types. (v2, after the DB/28 replay.)
//
// THE LAW: a DesignBlock carries INTENT. It has NO FIELD for construction, so a
// community author cannot ship a construction opinion — Frankenstein is a compile
// error, not a bug. Construction lives in exactly ONE ConstructionProfile per
// project. Parts are COMPUTED by panelDecomposition(), never stored, never shared.
//
// IDENTITY (resolves the doc-06 §8 tension "an ID never changes"):
//   - DESIGN nodes carry ASSIGNED ids (`nodeId`), created once, never mutated.
//   - PARTS carry DERIVED ids (hash of nodeId + role + sub). Re-decomposing is
//     idempotent; swapping the profile keeps identity and changes geometry only.
//
// v2 CHANGE (DB/28's architectural finding): construction is scoped BY CABINET TYPE.
// One flat profile could not describe both the shelf-unit (plinth 80, вкладное) and
// the census aggregate (plinth 120). The law is unchanged — still ONE source of
// construction truth — but the profile is now parameterised: defaults + byType.
// Per DB/27 §4 this cost zero published blocks, exactly as the tiebreak rule predicted.

import type { mm10 } from "./types.js";

// ───────────────────────────────────────────────────────── design (shareable)

/**
 * WHICH material slot a piece draws from. The shop's own vocabulary.
 *
 * `stoleshnitsa` added 2026-08-13: DB/39 made the worktop a BAND — its own block — and
 * a band is not made of the cabinet's material. It is the **W** group in the palette
 * screen, beside A/B/C.
 */
export type RoleSlot = "fasad" | "korpus" | "orqa" | "stoleshnitsa";

/** WHAT a piece is. Design, not construction: two workshops agree "it's a wardrobe"
 *  and disagree about how to build it. That disagreement is what `byType` scopes. */
export type CabinetType =
  | "kitchen_base" | "kitchen_wall" | "tall" | "drawer_base" | "wardrobe" | "shelf_unit";

export type NodeKind =
  | "cabinet" | "shelf" | "divider" | "door" | "drawer" | "filler" | "rod"
  /**
   * NEUTRAL CONTAINER — App-3's request, 2026-08-15. A multi-panel component (a drawer
   * block, an organiser) needs a root, and every existing kind carries a meaning that
   * root does not have. `ComponentLibraryItem.root` already excludes "cabinet", so
   * until now there was no honest value to put there and the master typed one by hand.
   *
   * ANSWERING THE ATTACHED QUESTION — yes: in Forge, each drawn panel is ONE DesignNode
   * under the root, with `kind` = its role and `size` = its geometry. That is the shape
   * `convert-to-component` should build against. A "group" carries no geometry of its
   * own beyond an envelope; it exists to own children.
   */
  | "group"
  /** A RUN — a row of cabinets plus the bands over and under them (DB/39). */
  | "run"
  /** A horizontal BAND — цоколь, столешница, фартук, шапка. Its own block, spanning the
   *  whole run, NOT cut at every cabinet joint (DB/39). */
  | "band";

/** Which band this is. Design intent — how it is BUILT stays in the profile (DB/39 §4). */
export type BandRole = "tsokol" | "stoleshnitsa" | "fartuk" | "shapka";

/**
 * A run end is CLOSED when it abuts a wall, a column or another run, and OPEN when it
 * is visible and unsupported. Only an open end gets a begin/end part.
 *
 * Founder, DB/39 §2: "we should close 'open' fields, so the beginning and ending
 * couldn't be needed." Emitting an end cap into a wall is waste; forgetting one on a
 * visible end is a defect the client sees. Hence explicit, never inferred.
 */
export type RunEnd = "open" | "closed";

export type Division =
  | { rule: "fixed"; mm: mm10 }
  | { rule: "ratio"; weight: number }
  /** Pinned against redistribution. DB/32 §4 legislated this from the start; the
   *  code carried only three rules until 2026-08-05. Mixed resolution (§4.3):
   *  subtract every fixed/locked span first, distribute the remainder by weight. */
  | { rule: "locked"; mm: mm10 }
  | { rule: "flex" };

// ───────────────────────────────────────────────────── Forge modifiers (App-3)
//
// DB/35 §2, verbatim: "Forge does NOT alter the base 3D mesh destructively. It appends
// to a `modifiers[]` array on the DesignNode." Landed 2026-08-15 on App-3's request;
// merged from the DB/38 draft rather than re-invented.

export type AnchorEdge = "top" | "bottom" | "left" | "right" | "front" | "back";

/**
 * WHERE along an edge a modifier sits. DB/35 §2: "Modifiers must use DB/32 anchoring
 * (never absolute coordinates)" — so a modifier survives a resize.
 *
 * DISCRIMINATED, not `{rule, value}` with one shared number. App-3 proposed a single
 * `value: number` for both rules; that loses the unit, and mm10-vs-fraction is a real
 * bug class — `{rule:"fixed", value: 0.5}` would silently mean 0.05mm. The ratio case
 * is byte-identical to what App-3 already emits (`{rule:"ratio", value: 0.5}`); only
 * the fixed case renames `value` → `mm10`, which is the point.
 */
export type AnchorRule =
  | { rule: "fixed"; mm10: mm10 }
  /** Fraction 0..1 of the envelope dimension the edge runs along. */
  | { rule: "ratio"; value: number }
  /**
   * OPEN — no founder ruling on record for anchor-level `locked` (only
   * `Division.locked` is legislated, DB/32 §4). Provisional reading, DB/38 §4: "fixed
   * distance from the OPPOSITE edge". Do not ship a UI `locked` state against this
   * until it gets its own ruling.
   */
  | { rule: "locked"; mm10: mm10 };

export interface Anchor { edge: AnchorEdge; distance: AnchorRule }

/** DB/35 §1's tool list, minus the session-time tools that do not persist as a
 *  modifier record (Carry attaches a child node; Material/Kromka write a project-local
 *  ConstructionOverride and are stripped before publish — DB/35 §5.3, §10.6). */
export type ModifierType =
  | "hole" | "notch" | "bevel" | "viyemka" | "round_corner" | "laminate";

/**
 * NOTE the `params` value type. It is `mm10 | number | string`, NOT `unknown`, and that
 * is deliberate: `unknown` would let a modifier carry a nested object, and a nested
 * object is where a construction opinion (thickness, kromka, a joint) would eventually
 * be smuggled into a shareable node. DB/27 stays enforced by the type, not by review.
 */
export interface Modifier {
  type: ModifierType;
  anchors: Anchor[];
  params: Record<string, mm10 | number | string>;
}

/**
 * One node of the design tree. `nodeId` is the ONLY assigned identity in the system.
 *
 * NOTE what is absent and must stay absent: thickness, kromka, groove, bottom
 * placement, setbacks, overhangs, joints, holes. There is no field for them.
 */
export interface DesignNode {
  nodeId: string;
  kind: NodeKind;
  /** Design intent: what kind of piece this is → selects the profile's type scope. */
  cabinetType?: CabinetType;
  roleSlot?: RoleSlot;
  size?: { w_mm10?: mm10; h_mm10?: mm10; d_mm10?: mm10 };
  /**
   * DESIGN geometry, NOT construction (DB/27 — same tier as `size`). Where a component's panel SITS in
   * its envelope: the panel's CENTRE in the envelope frame (origin at the min corner; +x = width,
   * +y = height, +z = depth; mm10, like `size`). Present on a Forge-authored component panel; absent on
   * a cabinet whose children are positioned by tree structure (division) rather than a flat envelope.
   * §2.4 addition 2026-08-26 — App-2 + App-3 agreed the shape, founder-approved; both mirrors carry it.
   */
  pos?: { x_mm10: mm10; y_mm10: mm10; z_mm10: mm10 };
  /**
   * DESIGN, not construction. Which of the panel's three extents is its THICKNESS axis (x = width,
   * y = height, z = depth), so the cut face is the OTHER two. Forge resolves it at authoring (its
   * classify orientation). Absent → the consumer derives it (the smallest extent). The thickness VALUE
   * still comes from the profile (DB/27), never from this axis — this only names WHICH extent is thin.
   * §2.4 addition 2026-08-26 — App-2 + App-3 agreed, founder-approved; both mirrors carry it.
   */
  thicknessAxis?: "x" | "y" | "z";
  division?: Division;
  purpose?: string;
  children?: DesignNode[];
  /** Design: it changes what it LOOKS like. */
  hasDoor?: boolean;
  /** Design: "this cabinet is topped by a worktop". The OVERHANG is construction. */
  hasWorktop?: boolean;
  /**
   * Present  → BOUND: this node is an instance of a library Component.
   * Absent   → DETACHED: an ordinary subtree that tracks nothing.
   * See ComponentRef. Detaching is SHALLOW — nested bound children stay bound, and
   * the UI must show how many (redteam B4).
   */
  component?: ComponentRef;
  /**
   * Forge modifiers, anchored (DB/35 §2). Non-destructive: they append to the node,
   * they never rewrite its geometry. Absent on every node App-2 builds today.
   */
  modifiers?: Modifier[];
  /**
   * MERGE control on this cabinet's LEFT boundary (DB/22 N1, built 2026-08-15).
   *
   * Absent or "auto" → the engine merges when physics allows. That is the founder's
   * "best ease for the user": merging saves a panel on every boundary and the master
   * should not have to ask for it.
   *
   * "never" → the master pins this boundary open. There is deliberately NO "always":
   * a master may forbid a merge, but may never force one past a physical blocker.
   * Forcing would mean one panel obeying two constructions — a DB/27 breach with a
   * saw behind it.
   */
  mergeLeft?: "auto" | "never";
  /** kind:"band" only — which band this is. */
  bandRole?: BandRole;
  /**
   * kind:"run" only — whether each end of the run is open or closed (DB/39 §2).
   * Required on a run in practice; optional in the type so existing single-cabinet
   * projects, which have no run node at all, keep compiling.
   */
  ends?: { begin: RunEnd; end: RunEnd };
}

export interface DesignBlock {
  blockId: string;
  name: string;
  author: string;
  /** Unknown version → REJECTED at import, never guessed. */
  schemaVersion: 1;
  root: DesignNode;
  requiredSlots: RoleSlot[];
  tags?: string[];
}


// ─────────────────────────────────────────────── components: bound vs detached
//
// THE MISSING PIECE. `ComponentLibraryItem` (the library ENTRY) was proposed in
// DB/38; what never existed is how a node inside a real project POINTS AT one.
// Without it a nested drawer, a door-as-component and "place one, multiply by
// ratio" have nowhere to live, which is exactly what App-2 reported blocked.
//
// The primitive, decided 2026-08-04:
//
//   BOUND    the node carries `component`. It is an instance of a library entry:
//            parametric, multiplied by a division rule, and it TRACKS a version.
//   DETACHED the node has no `component`. It is an ordinary subtree, freely
//            editable, and it tracks nothing. "Decomponented" = detach.
//
// Same idea as Figma's component → detach. One mechanism covers nesting, doors as
// components, and multiply-by-ratio, so there is nothing else to invent.

/**
 * A node's link to a library Component.
 *
 * VERSION DISCIPLINE (founder, 2026-08-04 — "silent updates will destroy finalized
 * client projects"): `pinnedVersion` is authoritative and is NEVER auto-advanced.
 * When the library holds something newer the app shows a badge; the master accepts
 * it explicitly, and acceptance must run the fit check FIRST and refuse with a
 * reason rather than produce a design that no longer fits (redteam B6).
 *
 * Two instances of the same component may legitimately sit at different versions in
 * one project. That is allowed — but they must never be presented as identical, and
 * their parts must not be merged in the cut list (redteam B10).
 */
export interface ComponentRef {
  componentId: string;
  /** The version this instance is pinned to. Only a deliberate accept changes it. */
  pinnedVersion: number;
  /**
   * Per-instance design deviations — sizes and division rules the master changed on
   * THIS instance without detaching it.
   *
   * DB/27 still applies with full force: an override may only carry INTENT. There is
   * no field here for thickness, kromka, groove or joints, so a bound instance can
   * never smuggle a construction opinion into a shared component.
   */
  overrides?: Partial<Pick<DesignNode, "size" | "division" | "purpose">>;
}

/**
 * How deep components may nest. Depth 3 covers the real cases — a TV wall unit with
 * a niche, holding a drawer block, holding an internal organiser.
 *
 * Two rules that go with it:
 *  - a `carry` attachment (decor riding on a face) does NOT consume depth, or
 *    decoration becomes impossible exactly where it is most wanted (redteam B8);
 *  - cycle detection must compare (componentId, pinnedVersion) PAIRS, not ids —
 *    with pinning, a cycle can exist across versions that exists in neither one
 *    alone (redteam B9).
 */
export const MAX_COMPONENT_NEST_DEPTH = 3;

// ───────────────────────────────────────────── the library entry a ref points at
//
// `ComponentRef.pinnedVersion` was, until now, a number pointing at NOTHING. This
// is the entry it points at — the DEFINITION half of the component model, which
// unblocks save-as ("Группировать"), the library screen, and versioning.
//
// Merged from the DB/38 proposal (`Researches/Berore 2 app/library.ts`), reduced to
// what save-as actually needs. The marketplace layer of that proposal — visibility,
// curation, revenue share — stays out on purpose: DB/21 §7 marks its economics TBD,
// and freezing a guess into the contract is worse than leaving the gap visible.

/** Why a publish attempt was refused. Never a bare boolean — a rejection always
 *  names what failed, so the master can fix it instead of guessing. */
export interface ComponentGateFailure {
  code:
    | "UNKNOWN_SCHEMA_VERSION"
    | "UNBOUND_REQUIRED_SLOT"
    | "DECOMPOSE_FAILED"
    | "CARRIES_CONSTRUCTION"   // an override survived the strip — DB/27 breach
    | "NEST_DEPTH_EXCEEDED"
    | "CYCLE_DETECTED"
    | "DEGENERATE_GEOMETRY";
  detail: string;
}

/**
 * The envelope range this component was PROVEN to decompose inside, and the profile
 * it was proven under.
 *
 * This is what makes `ComponentRef`'s promise enforceable. That type says accepting a
 * newer version "must run the fit check FIRST and refuse with a reason rather than
 * produce a design that no longer fits" — the fit check needs something to check
 * against, and this is it. It is also the "проверено на 18мм" badge (redteam B3): a
 * component validated only at 16mm must not silently claim to work at 18.
 */
export interface FitConstraint {
  minW_mm10: mm10; maxW_mm10: mm10;
  minH_mm10: mm10; maxH_mm10: mm10;
  minD_mm10: mm10; maxD_mm10: mm10;
  /** Which profile the range was measured under. A different profile → re-validate. */
  validatedProfileId: string;
  /** Carcass thicknesses the range was proven at. `[160]` ≠ "works at 18mm". */
  validatedThicknesses_mm10: mm10[];
}

/**
 * A library Component — the thing "Convert to Component" produces and the thing a
 * BOUND node's `ComponentRef` resolves to.
 */
export interface ComponentLibraryItem {
  componentId: string;
  /**
   * CONTENT version — what `ComponentRef.pinnedVersion` pins. Monotonic, bumped on
   * every published edit, NEVER reused. Distinct from `schemaVersion`, which is the
   * contract's shape: one says "the component changed", the other says "the format
   * changed", and conflating them makes both meaningless.
   */
  version: number;
  /** Unknown version → REJECTED at import, never guessed. Same law as DesignBlock. */
  schemaVersion: 1;
  name: string;
  author: string;
  /** Folder-like grouping. Deliberately the ONE mechanism — a folder tree is a
   *  presentation over tags, not a second hierarchy to keep in sync (DB/36). */
  tags?: string[];
  requiredSlots: RoleSlot[];
  /** ISO 8601. Sort/UI convenience — NOT construction provenance. */
  createdAt?: string;
  /**
   * App-3 never builds a cabinet (DB/32 §1). Excluding "cabinet" here makes the wrong
   * shape a COMPILE error rather than a runtime check — the same move DB/27 §5(a)
   * uses to keep construction fields off DesignNode.
   */
  root: DesignNode & { kind: Exclude<NodeKind, "cabinet"> };
  /** The proven envelope. Absent → never validated; the app must refuse to place it. */
  fit?: FitConstraint;
  /** The last gate run against THIS exact version. Never optimistic, never inherited
   *  from a previous version — an edit invalidates the proof that preceded it. */
  gate: { ok: boolean; failures: ComponentGateFailure[] };
}

// ────────────────────────────────────────────────── construction (per project)

export type KromkaSlot = "K1" | "K2";

/**
 * Semantic edges. The decomposer maps these onto face1..4 through each part's
 * declared orientation (DB/28 C1: panels are stored in the MACHINE frame, so a raw
 * face index is a framing choice, not a construction fact).
 *
 * SIX names, because a panel's two axes decide WHICH four it has:
 *   depth axis  → front / back      width axis → left / right
 *   height axis → top / bottom
 * A side (height×depth) has front/back/top/bottom — it has no "left". A door
 * (height×width) has top/bottom/left/right — it has no "front". Modelling only
 * four names silently double-banded the height ends; the tests caught it.
 */
export interface EdgeKromka {
  front: KromkaSlot | null;
  back: KromkaSlot | null;
  left: KromkaSlot | null;
  right: KromkaSlot | null;
  top: KromkaSlot | null;
  bottom: KromkaSlot | null;
}

export type PartRole =
  | "side" | "bottom" | "top" | "stretcher" | "shelf" | "back" | "worktop"
  | "door" | "divider" | "plinth" | "filler"
  /** Horizontal-band parts that are not the plinth or the worktop (DB/39). Their
   *  construction numbers do not exist yet — the roles exist so the kromka map is
   *  forced to declare them rather than silently banding them like something else. */
  | "fartuk" | "shapka"
  /** Glued-on decoration. Carries NO structure and takes no joints, but is still a
   *  real part: it has a material, a kromka and a cut-list line. Distinct enough
   *  from `filler` to earn a role — the engine must skip it in structural maths.
   *  (A drawer front hidden behind a door is NOT a role: hidden-ness is contextual
   *  and is computed by walking the tree, never stored.) */
  | "decor";

/**
 * Which connector family holds one carcass panel to another. A shop stocks one and
 * builds everything with it; another shop stocks a different one. Pure opinion.
 *
 * ⚠ CHOOSING ONE IS NOT THE SAME AS BEING ABLE TO DRILL IT. App-2 raised this on
 * 2026-08-14 and was right: this union shipped with five options, and only ONE has
 * factory-verified drilling geometry. See `CONNECTOR_GEOMETRY_PROVEN` — the engine
 * refuses an unproven connector loudly instead of guessing a hole pattern.
 */
export type CarcassConnector = "confirmat" | "cam_dowel" | "dowel" | "rafix" | "screw";

/**
 * WHERE CONNECTOR GEOMETRY LIVES: `engine/catalogs/connectors/*.ts`, one physical file
 * per family (DB/41). Each carries its Ø, depth and offset plus a `confidence` level
 * and a source.
 *
 * The boolean `CONNECTOR_GEOMETRY_PROVEN` table that used to sit here was REMOVED on
 * 2026-08-15. It made the engine refuse to decompose with any connector but cam_dowel,
 * which was the wrong shape twice over: a shop already building with euro screws was
 * blocked from working, and a two-state flag could not express "we can see it in 400
 * real holes but nobody has confirmed which fastener makes them". Geometry is a
 * variable with defaults, not a permission.
 */

/** How an adjustable shelf is carried. */
export type ShelfSupport = "pin" | "rafix" | "fixed";

/**
 * Which drawer system the shop stocks. A catalog KEY, deliberately not a set of
 * Blum height letters.
 *
 * WHY NOT `"N" | "M" | "K"`: those are LEGRABOX/TANDEMBOX names. GTV VERSALITE and
 * Hettich InnoTech use different names AND different heights, so a shop buying GTV
 * would get a field whose values mean nothing to it — and DB/17's law is "catalogs
 * are data, never code". The system is named here; the heights, the minimum opening
 * and the side clearance come from that system's own catalog entry. Same gate, one
 * indirection, brand-neutral. (`Cell.drawerClass` in App-2 stays as the per-drawer
 * height pick WITHIN the chosen system.)
 */
export type DrawerSystemId = string;

/**
 * THE JOINT SECTION (Узлы). Every number the engine drills, as an editable setting.
 *
 * Read the header comment on `TypeConstruction.joints` for why this exists and where
 * the product-fact / shop-decision line falls.
 */
export interface JointConstruction {
  /** Which connector joins carcass panel to carcass panel. */
  carcassConnector: CarcassConnector;
  /** Distance from the panel's end to the FIRST connector on that joint's row. */
  connectorEndOffset_mm10: mm10;
  /** Max spacing between connectors along one joint. More panel → more connectors. */
  connectorMaxPitch_mm10: mm10;

  /**
   * SYSTEM-32 — the shelf-pin hole grid.
   *
   * THE 37mm STORY, settled 2026-08-13. `catalog/rules/shelf_pin.rules.json` cites
   * the GTV catalog: "first hole row 37mm from the front edge; rear row 37mm from
   * the rear edge". That is the published STANDARD. It is not a measurement of this
   * factory — and the factory does not follow it. Across the 27 Ø5-drilled panels in
   * `mined_dump_operations.csv` the row setback is 37, 43, 64, 65, 78, 115 and 145mm,
   * per design. App-2's independent scan of ~350 exports found the same spread
   * (91.5 · 114 · 65) and no 37 at all.
   *
   * So there is no single factory number to bless, and stamping `verified: true` on
   * a global constant would have been a false claim by construction. The honest
   * shape is this one: a SETTING, defaulted to the published standard, overridable
   * per type, editable by the master in Настройки → Узлы.
   */
  system32: {
    /** Off → shelves are fixed and no pin grid is drilled at all. */
    enabled: boolean;
    /** Grid pitch along the panel's length. 32mm is what makes it "System-32". */
    pitch_mm10: mm10;
    /** Where the grid starts, measured from the panel's end. */
    firstHoleOffset_mm10: mm10;
    /** Front row's distance from the panel's front edge. */
    frontRowSetback_mm10: mm10;
    /** Rear row's distance from the panel's rear edge. Separate from the front:
     *  the factory files show asymmetric pairs (145/79, 115/65), not mirrors. */
    backRowSetback_mm10: mm10;
    /**
     * How many rows, and how they run. The dump contains BOTH patterns, which is
     * what made the 37-vs-65 argument look like a contradiction: panels with two
     * rows across the depth sit at ~65, while panels carrying pin PAIRS 32mm apart
     * along a single row sit at 37. Two patterns, not two answers.
     */
    rowMode: "front_and_back" | "front_only" | "paired_32";
  };

  /** How an adjustable shelf is carried on those holes. */
  shelfSupport: ShelfSupport;

  hinge: {
    /** Distance from the door's top/bottom end to the outermost cup centre. The cup's
     *  own Ø and depth are product facts and stay in the hardware spec. */
    endOffset_mm10: mm10;
    /** Door length above which the engine adds one more hinge. */
    extraHingeEveryLength_mm10: mm10;
  };

  drawer: {
    /** Catalog key of the stocked drawer system — NOT a brand height letter. */
    systemId: DrawerSystemId;
    /** Clearance the shop leaves per side between drawer box and carcass. */
    sideClearance_mm10: mm10;
  };
}

/**
 * The construction of ONE cabinet type. Every field here is something two competent
 * workshops would disagree about for the same design (DB/27 §4's boundary test).
 */
export interface TypeConstruction {
  /** Bottom between the sides (вкладное: W−2t) or under them (накладное: W). */
  bottomPlacement: "nakladnoe" | "vkladnoe";
  /** "none" = a worktop sits on the sides instead of a carcass top (DB/28 A4). */
  topStyle: "full" | "stretchers" | "none";
  stretcherWidth_mm10: mm10;
  back: {
    /** "none" = genuinely backless. NOT the same as "the back wasn't in this export". */
    treatment: "groove" | "overlay" | "none";
    grooveWidth_mm10: mm10;
    grooveDepth_mm10: mm10;
    grooveSetback_mm10: mm10;
  };
  /** Depth the back steals from bottom/shelf/divider. DB/28 A2: 17mm on the real
   *  cabinet = a 16mm ЛДСП back + 1mm clearance (16mm backs are 17 of the dump's 33). */
  backZone_mm10: mm10;
  /** EXTRA front clearance on shelves, beyond the back zone. */
  shelfSetback_mm10: mm10;
  plinth: {
    style: "box" | "strip" | "none";
    height_mm10: mm10;
    /** Between the sides (W−2t) or running the full width under them. */
    placement: "between" | "under";
    /**
     * DECORATIVE (a clip-on face on adjustable legs — покupnaya, no load) vs
     * STRUCTURAL (a цоколь-box the carcass stands on — carries the cabinet).
     * The founder's "options like decorative and construction" for the plinth.
     */
    role: "decorative" | "structural";
  };
  worktop: { sideOverhang_mm10: mm10; frontOverhang_mm10: mm10 };
  kromkaByRole: Record<PartRole, EdgeKromka>;
  /**
   * JOINTS (Узлы) — how panels are held together and where the holes go.
   *
   * WHY THIS LIVES HERE (added 2026-08-13). The manifest's guarantee is a
   * biconditional: "manifest covers every profile field ⟺ manifest covers every
   * engine decision". It holds only if every engine decision IS a profile field.
   * Joints were not — they lived in hardware_specs.dummy.json and catalog/rules/*,
   * entirely outside the profile. So the bijection test never covered them, and
   * that is exactly how they ended up as disconnected dummy data. Moving them in
   * makes forgetting a joint number a BUILD FAILURE, not a discovery six months on.
   *
   * THE BOUNDARY (DB/27 §4's test — "would two competent workshops disagree?"):
   *   PRODUCT FACT  → stays in the hardware spec. A Ø35×13 hinge cup is the hinge's
   *                   own geometry. No shop gets to have an opinion about it.
   *   SHOP DECISION → lives here, editable in Настройки → Узлы. Where the shelf-pin
   *                   row sits, which connector joins a carcass, which drawer system
   *                   the shop stocks. Two shops disagree; therefore it is a setting.
   */
  joints: JointConstruction;
  /**
   * SECTION MERGE (Объединение секций) — the founder's N1 nuance, as a setting.
   * When adjacent cabinets merge, two abutting sides become ONE shared divider,
   * saving a panel. This is the POLICY; the decomposer performs the merge.
   */
  merge: {
    /** May the app offer to merge adjacent cabinets at all? */
    allowed: boolean;
    /** How: today only a shared 16mm divider replaces two sides. */
    strategy: "shared_divider";
    /** ГРАНИЦЫ — when merging is forbidden (a merged part exceeding any of these
     *  forces a split, and the app must warn instead of silently merging). */
    limits: {
      maxSheetLength_mm10: mm10; // 2750 — no single-piece part longer than the sheet
      maxSheetWidth_mm10: mm10;  // 1830
      maxWeightKg: number;       // 45 — CIS manual-handling limit (R9/R21)
      /** How many cabinets may become ONE carcass. A genuine shop opinion, unlike the
       *  other blockers which are physics: a 5-section carcass may pass the sheet and
       *  weight limits and still be a thing nobody wants to carry up a staircase. */
      maxCabinetsPerCarcass: number;
    };
  };
  /**
   * GRAIN / TEXTURE policy (Резать скрытое поперёк ради листа). Census: L on
   * 359/359 → the shop locks texture on everything. But it IS a lever: hidden,
   * NON-textured parts may be rotated in nesting to save sheet.
   */
  grainPolicy: {
    /** "lock_all" = every part texture-locked (census default). "free_hidden" =
     *  hidden parts without a decor face may rotate for yield. */
    mode: "lock_all" | "free_hidden";
    /** Roles considered "hidden" (rotatable under free_hidden). */
    hiddenRoles: PartRole[];
  };
}

/**
 * THE single source of construction truth for a project. Seeded from the workshop
 * profile; the values are measured (DB/25, DB/28), not guessed.
 *
 * OPEN FOR EXTENSION (doc 13 / DB/27 §4): adding a field or a type scope is free —
 * blocks never referenced them, so every published block keeps working.
 */
export interface ConstructionProfile {
  profileId: string;
  name: string;
  material: { carcass_mm10: mm10; back_mm10: mm10; front_mm10: mm10 };
  kromka: { slots: Record<KromkaSlot, { thickness_mm10: mm10 }> };
  grain: "L" | "NONE";
  /** Applied when a type has no scope of its own. */
  defaults: TypeConstruction;
  /** Per-cabinet-type construction. Still one profile, one owner, one edit. */
  byType: Partial<Record<CabinetType, Partial<TypeConstruction>>>;
}

// ──────────────────────────────────────────────────────── project-local state

/** A per-node construction deviation. PROJECT-LOCAL — stripped when a block is
 *  shared, so block purity survives user overrides (DB/27). */
export interface ConstructionOverride {
  nodeId: string;
  field: "topStyle" | "bottomPlacement" | "shelfSetback_mm10" | "plinthHeight_mm10";
  value: string | number;
}

// ─────────────────────────────────────────────────────────── the material palette
//
// THE SHAPE THE FOUNDER DESCRIBED (2026-08-13):
//
//   "The user won't use thousands of Eman materials. The user will keep always a
//    minimal amount of materials in his palette … we had several groups of materials
//    like fasad, worktop … But still we should keep Eman's materials in the
//    BACKGROUND, so when the user picks a colour we advise."
//
// So there are TWO populations, and conflating them is the mistake to avoid:
//
//   PALETTE    a handful of materials, chosen by this user, for THIS project. Grouped
//              (A / B / C / W in the screen), swappable by tap from a dropdown. This
//              is what the app shows, what the cut list groups by, and what the 3D
//              view paints with. Small on purpose.
//   CATALOGUE  thousands of real Eman SKUs. NEVER browsed as a list, never a dropdown.
//              It sits behind the palette and does exactly one job: when the user
//              picks a colour, it answers "the closest real material is X".
//
// The letters are not new. `slotBindings` has bound roles to "A"/"B"/"C" since the
// contract was written — the palette is the thing those letters were always naming.

/** CIE L*a*b*. Perceptual, which is why the advisor measures distance here and not in
 *  RGB: two decors 30 apart in RGB can look identical while another pair looks wrong. */
export interface ColorLab { L: number; a: number; b: number }

export type MaterialFinish = "matt" | "gloss" | "structured";

/**
 * WHAT THE USER PICKED. Always present, always legal on its own — designing starts
 * with an idea of a colour, not with a supplier's article number. Blocking the
 * creative move to protect the cut list would make the app worse.
 */
export interface MaterialIntent {
  /** The user's own name for it: "Дуб Сонома", "Графит эмаль". */
  name: string;
  color: ColorLab;
  finish?: MaterialFinish;
  /** Board family the user is asking for: ЛДСП, МДФ, … Free text — the catalogue
   *  normalises it at binding time rather than the UI guessing up front. */
  boardKind?: string;
}

/**
 * WHAT IT RESOLVED TO in the real world. Absent → the material is UNBUILDABLE: no SKU,
 * no sheet size, no price. That is a legal DESIGN-time state and an error only at the
 * moment someone asks for a price or a factory export (DB/40 §4).
 *
 * Deliberately the same bound/detached shape as `ComponentRef`, including the pinning:
 * a binding records the catalogue state it was made against and NEVER silently
 * re-points when the feed refreshes.
 */
export interface MaterialBinding {
  sku: string;
  supplier: string;
  decorName: string;
  /** CIEDE2000 distance between `intent.color` and the bound decor. <1 invisible;
   *  1–3 acceptable; >6 is a different colour and must never be bound silently. */
  deltaE00: number;
  /** Sheet the SKU actually comes in — feeds nesting and `merge.limits`. */
  sheet_mm10: { length_mm10: mm10; width_mm10: mm10 };
  thickness_mm10: mm10;
  /** A price with no date is not a price. */
  pricedAt?: string;
  /** Catalogue revision this binding was made against. A newer feed shows a badge; it
   *  does not re-bind a finalized project, for the same reason `pinnedVersion` doesn't. */
  boundAgainstFeed: string;
}

/** One row of the palette screen — "A1 · Дуб Сонома · ЛДСП · 2750×1830 · 18мм". */
export interface PaletteEntry {
  /** User-visible id: "A1", "A2", "W1". Group letter + index. */
  entryId: string;
  intent: MaterialIntent;
  /** Present → bound to a real SKU. Absent → free colour, not yet buildable. */
  binding?: MaterialBinding;
}

/** A palette group — the A / B / C / W tabs. Each group serves one design role. */
export interface PaletteGroup {
  /** "A", "B", "C", "W" — the letter `slotBindings` already points at. */
  groupId: string;
  label: string;
  /** Which design role draws from this group. W → stoleshnitsa (DB/39). */
  role: RoleSlot;
  entries: PaletteEntry[];
}

/**
 * SMALL BY DESIGN. Not a limit imposed for storage reasons — a limit that IS the
 * feature. The materials mode swaps a material by tap from a dropdown; a dropdown of
 * a thousand SKUs is not a dropdown. If a user needs more than this, the answer is a
 * second project, not a longer list.
 */
export const MAX_PALETTE_ENTRIES_PER_GROUP = 8;

export interface MaterialPalette {
  groups: PaletteGroup[];
}

export interface DesignProject {
  projectId: string;
  name: string;
  nodes: DesignNode[];
  /**
   * Role → palette group letter. PARTIAL since 2026-08-13: adding `stoleshnitsa` must
   * not force a wardrobe to declare a worktop material it does not have. The unbound
   * check stays driven by each block's `requiredSlots`, which is where it belongs.
   */
  slotBindings: Partial<Record<RoleSlot, string>>;
  /** Absent → the project has no material identity yet. Legal while designing; the
   *  export gate refuses a priced cut list without it (DB/40 §5). */
  palette?: MaterialPalette;
  overrides: ConstructionOverride[];
}

// ────────────────────────────────────────────────────────────── decomposition

export type DecomposeFlagCode =
  | "ORPHANED_OVERRIDE"
  | "UNBOUND_SLOT"
  | "DEGENERATE_GEOMETRY"
  /** A panel would exceed the sheet — merge/size must split it (merge.limits). */
  | "EXCEEDS_SHEET"
  /** An assembled cabinet would exceed the manual-handling weight limit. */
  | "EXCEEDS_WEIGHT"
  /** The profile selects a carcass connector whose drilling geometry is not factory-
   *  verified. Refuse loudly — a guessed hole pattern reaches a CNC machine and ruins
   *  a sheet. See CONNECTOR_GEOMETRY_PROVEN. */
  | "CONNECTOR_GEOMETRY_UNPROVEN"
  /** A band was longer than the sheet and had to be seamed. NEVER silent: DB/39 §3. */
  | "BAND_SPLIT"
  /** Adjacent cabinets were merged into one carcass, saving panels. Reported ALWAYS —
   *  a merge changes what the workshop assembles, so it may never be silent. */
  | "MERGED"
  /** A merge the master might have expected did not happen, and why. Equally important:
   *  "why are there still two panels here?" must have an answer in the report. */
  | "MERGE_BLOCKED";

export interface DecomposeFlag { code: DecomposeFlagCode; where: string; detail: string }

/** Which physical edge each semantic edge landed on — the audit trail for DB/28 C1. */
export interface PartOrientation {
  /** What the part's X (Length) axis means physically. */
  xAxis: "width" | "height" | "depth";
  /** What the part's Y (Width) axis means physically. */
  yAxis: "width" | "height" | "depth";
}

export interface DecomposeResult {
  parts: import("./types.js").Part[];
  flags: DecomposeFlag[];
  provenance: Record<string, { nodeId: string; role: PartRole; orientation: PartOrientation }>;
}
