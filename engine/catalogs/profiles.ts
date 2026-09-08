// Layer 0 — construction profiles. Data, not logic.
//
// Every number is MEASURED, and each carries where it came from:
//   DB/25  — the 359-panel census (aggregate across prop-0/1/2 + XML output examples)
//   DB/28  — the replay of one real cabinet, which resolved what the census could not
// A number with no citation is a bug. When a value is a guess, it says so.

import type {
  ConstructionProfile, EdgeKromka, JointConstruction, PartRole, TypeConstruction,
} from "../contracts/design.js";

/** Build a kromka map from only the edges that exist for that part's axes. */
const K = (e: Partial<EdgeKromka>): EdgeKromka =>
  ({ front: null, back: null, left: null, right: null, top: null, bottom: null, ...e });

const BARE = K({});

/**
 * DB/25 F2 kromka map (aggregate): shelf = 1 front edge (9/9) · door = 4 (16/22) ·
 * plinth never bare (0/38) · divider/stretcher = front only · backs mostly bare.
 *
 * DB/28 A6 FIX: side = 2 edges. The census already said side 2e×9 / 3e×6 — the
 * first cut of this file encoded 1. The replay caught the mis-encoding.
 *
 * Each map uses only the semantic names its part's ORIENTATION owns (see EdgeKromka):
 *   side/divider  h×d → front/back/top/bottom      shelf d×w → front/back/left/right
 *   bottom/top/stretcher/worktop w×d → front/back/left/right
 *   door h×w, plinth w×h, filler h×w → top/bottom/left/right
 */
const KROMKA_CENSUS: Record<PartRole, EdgeKromka> = {
  shelf:     K({ front: "K1" }),                                  // 9/9 — one front edge
  divider:   K({ front: "K1" }),
  stretcher: K({ front: "K1" }),
  side:      K({ front: "K1", back: "K1" }),                      // A6: two edges
  bottom:    K({ front: "K1" }),
  top:       K({ front: "K1" }),
  worktop:   K({ front: "K1", back: "K1", left: "K1", right: "K1" }),
  door:      K({ top: "K1", bottom: "K1", left: "K1", right: "K1" }), // h×w → no "front"
  plinth:    K({ top: "K1", left: "K2", right: "K2" }),           // w×h → 3 edges (22× mode)
  filler:    K({ left: "K1" }),
  back:      BARE,
  /** A glued-on decorative overlay sits PROUD of the panel it rides, so all four of
   *  its edges are visible and all four get banded. (Curved outlines cannot be taped
   *  at all without softforming — the manufacturing gate refuses those; V1 decor is
   *  rectangles only, per redteam B1.) */
  decor:     K({ top: "K1", bottom: "K1", left: "K1", right: "K1" }),
  /** Band parts (DB/39). A фартук shows its top edge above the worktop; a шапка shows
   *  its bottom edge. Both run w×h, so they band on top/bottom/left/right. */
  fartuk:    K({ top: "K1", left: "K2", right: "K2" }),
  shapka:    K({ bottom: "K1", left: "K2", right: "K2" }),
};

/**
 * JOINTS (Узлы) — measured from the 350-panel dump, not copied from a standard.
 *
 * Every number below was recounted on 2026-08-13 against `mined_dump_operations.csv`
 * and `mined_dump_holeclasses.csv`. Where the published System-32 standard and this
 * factory disagree, the PROFILE carries what the factory does and the manifest's
 * `why` records what the standard says — because the profile describes one workshop,
 * not the textbook. `OTHER_SHOP_JOINTS` below carries the textbook values, so both
 * readings exist in code and neither has to be argued from memory again.
 */
const QORASU_JOINTS: JointConstruction = {
  // Ø15×12.5 cam housing on 99 of 350 panels (×357 holes) + Ø8×34 edge bolt on 97
  // panels (×342) — эксцентрик+шкант is this shop's carcass joint, by a wide margin.
  carcassConnector: "cam_dowel",
  // MEASURED: 34.0mm on 274 of 357 cam seats (77%). The dummy spec guessed 20 and
  // its own comment already flagged "factory ORTA_BAK shows ~34mm; CONFIRM". Confirmed.
  connectorEndOffset_mm10: 340,
  connectorMaxPitch_mm10: 3200, // 320mm between connectors along a joint — R9 practice
  system32: {
    enabled: true,
    pitch_mm10: 320,          // 32mm — System-32 and the mined data agree (shelf_pin.rules.json)
    firstHoleOffset_mm10: 370, // 37mm — the standard's grid origin
    /**
     * 65mm, MEASURED — not the standard's 37.
     * Row setbacks across the 27 Ø5-drilled panels: 64/64, 65/65, 78/64, 145/79,
     * 115/65, 37, 43. The mode is 64–65. 37mm is what GTV's catalogue prescribes
     * (catalog/rules/shelf_pin.rules.json, placement_principles_from_source) and it
     * appears on exactly two panels here — both in the `paired_32` pattern, not in a
     * front/back row. The standard is not this factory. Both are now representable.
     */
    frontRowSetback_mm10: 650,
    backRowSetback_mm10: 650,
    rowMode: "front_and_back",
  },
  shelfSupport: "pin",        // Ø5×11 face holes, 12/12 in the mined cross-check
  hinge: {
    // MEASURED: 100.0mm from the nearest door end on 37 of 94 Ø35 cups — the mode.
    endOffset_mm10: 1000,
    extraHingeEveryLength_mm10: 6000, // 600mm — catalog/rules/hinge_count.gtv.json
  },
  drawer: {
    // A catalog KEY, not a Blum height letter — see DrawerSystemId's note on why
    // "N"|"M"|"K" would have been a brand shortcut. This key resolves in
    // catalog/packs/core_2026_06/accessories/.
    systemId: "gtv_bb_slide_h45",
    // 12.5mm/side is the ball-bearing class standard; slide.rules.json cites lengths
    // only, so this one is still class-derived rather than measured. Flagged, not hidden.
    sideClearance_mm10: 125,
  },
};

/** The TEXTBOOK joints — the published System-32 standard, unmodified. Lives here so
 *  "37mm" has a home in code and stops being re-litigated from memory. */
const OTHER_SHOP_JOINTS: JointConstruction = {
  carcassConnector: "confirmat",
  connectorEndOffset_mm10: 500,
  connectorMaxPitch_mm10: 2500,
  system32: {
    enabled: true,
    pitch_mm10: 320,
    firstHoleOffset_mm10: 370,
    frontRowSetback_mm10: 370, // 37mm — GTV catalogue, the published standard
    backRowSetback_mm10: 370,  // "rear hole row 37mm from the rear edge"
    rowMode: "front_and_back",
  },
  shelfSupport: "pin",
  hinge: { endOffset_mm10: 800, extraHingeEveryLength_mm10: 9000 },
  drawer: { systemId: "gtv_roller_slide", sideClearance_mm10: 130 },
};

/** The census aggregate — the safe fallback for a type we have not replayed yet. */
const DEFAULTS: TypeConstruction = {
  bottomPlacement: "nakladnoe", // UNPROVEN for the aggregate (DB/25 gap: 4 pairs only)
  topStyle: "full",             // DB/25 F5: 7 full tops, 0 stretcher-tops
  stretcherWidth_mm10: 800,     // R17 theory (~80mm) — no local evidence
  back: {
    treatment: "groove",   // DB/25 F3: universal in the aggregate
    grooveWidth_mm10: 40,  // 4.0mm — 70 of 71
    grooveDepth_mm10: 80,  // 8.0mm — 69 of 71
    grooveSetback_mm10: 120, // 12.0mm — 50 of 71
  },
  backZone_mm10: 170,      // DB/28 A2 — see shelf_unit; unproven for the aggregate
  shelfSetback_mm10: 0,    // DB/28: the depth reduction IS the back zone, not extra
  plinth: { style: "box", height_mm10: 1200, placement: "between", role: "structural" }, // DB/25 F4: box, 120 (22×)
  worktop: { sideOverhang_mm10: 400, frontOverhang_mm10: 800 },      // DB/28, from the replay
  kromkaByRole: KROMKA_CENSUS,
  merge: {
    allowed: true,
    strategy: "shared_divider",
    limits: { maxSheetLength_mm10: 27500, maxSheetWidth_mm10: 18300, maxWeightKg: 45, maxCabinetsPerCarcass: 3 }, // R9/R21
  },
  grainPolicy: {
    mode: "lock_all",                       // DB/25: L on 359/359 — this shop locks all
    hiddenRoles: ["back", "bottom", "divider", "stretcher"],
  },
  joints: QORASU_JOINTS,
};

/**
 * The measured Qorasu/Eman workshop.
 *
 * `shelf_unit` is the ONLY type replayed against real panels so far (DB/28) — its
 * numbers are exact. Every other type falls back to the census aggregate and is
 * therefore UNPROVEN until its own replay. That distinction is deliberate and must
 * not be blurred: `byType` says "measured", `defaults` says "aggregate guess".
 */
export const QORASU_PROFILE: ConstructionProfile = {
  profileId: "qorasu_eman_2026_07",
  name: "Карасу · Eman",
  material: {
    carcass_mm10: 160, // DB/25 F1: 16mm — 0 of 359 panels were 18mm
    back_mm10: 160,    // DB/28 A2/A3: 16mm ЛДСП backs are 17 of the dump's 33 backs
    front_mm10: 220,   // DB/25: the 22mm facade layer
  },
  kromka: { slots: { K1: { thickness_mm10: 10 }, K2: { thickness_mm10: 4 } } }, // F2: 1.0 / 0.4; 2mm never
  grain: "L", // F-secondary: L on 359/359
  defaults: DEFAULTS,
  byType: {
    /** REPLAY-EXACT (DB/28): every value below reproduces the real 7-panel cabinet. */
    shelf_unit: {
      bottomPlacement: "vkladnoe",   // A1 — real bottom 988 = W−2t. The replay settled the census gap.
      topStyle: "none",              // A4 — a worktop sits on the sides; no carcass top
      backZone_mm10: 170,            // A2 — bottom & shelf are 503 vs sides 520 (16mm back + 1mm)
      shelfSetback_mm10: 0,          // the 17mm back zone is the whole reduction
      plinth: { style: "strip", height_mm10: 800, placement: "between", role: "decorative" }, // A5 — 80mm strip
      worktop: { sideOverhang_mm10: 400, frontOverhang_mm10: 800 },       // 1100×600 vs 1020×520
      back: { treatment: "overlay", grooveWidth_mm10: 0, grooveDepth_mm10: 0, grooveSetback_mm10: 0 },
      kromkaByRole: {
        ...KROMKA_CENSUS,
        plinth: BARE, // A7 — real plinth is bare here (the census aggregate says never bare)
      },
    },
    // App-2 item #5 / SENSE-3 (r-028): a навесной shkaf hangs on the wall — it never stands on the
    // floor, so it carries no plinth. Without this scope kitchen_wall fell through to the census
    // default (box, 120mm) and the engine emitted a plinth the app then had to skip — the silent
    // divergence SENSE-3 flags. This is the scope SENSE-3's own message asks for; it overrides only
    // the plinth style, everything else stays the measured default.
    kitchen_wall: {
      // style "none" is the whole point; the other fields are inert (no plinth is emitted) but the
      // type carries the full census shape, so they mirror the default and are never read.
      plinth: { style: "none", height_mm10: 0, placement: "between", role: "structural" },
    },
  },
};

/** A deliberately different workshop — proves profile-swap purity (DB/27 §5b ④). */
export const OTHER_SHOP_PROFILE: ConstructionProfile = {
  profileId: "other_shop",
  name: "Другой цех (для проверки чистоты профиля)",
  material: { carcass_mm10: 180, back_mm10: 40, front_mm10: 180 },
  kromka: { slots: { K1: { thickness_mm10: 20 }, K2: { thickness_mm10: 4 } } },
  grain: "L",
  defaults: {
    ...DEFAULTS,
    bottomPlacement: "vkladnoe",
    topStyle: "stretchers",
    back: { treatment: "overlay", grooveWidth_mm10: 0, grooveDepth_mm10: 0, grooveSetback_mm10: 0 },
    backZone_mm10: 40,
    shelfSetback_mm10: 200,
    plinth: { style: "strip", height_mm10: 1000, placement: "under", role: "decorative" },
    merge: { allowed: false, strategy: "shared_divider", limits: { maxSheetLength_mm10: 28000, maxSheetWidth_mm10: 20700, maxWeightKg: 40, maxCabinetsPerCarcass: 2 } },
    grainPolicy: { mode: "free_hidden", hiddenRoles: ["back", "bottom"] },
    joints: OTHER_SHOP_JOINTS,
  },
  byType: {},
};
