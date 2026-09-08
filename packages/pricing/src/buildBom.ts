// buildBom: Project → normalised BOM (PRICING_AND_SCHEMA.md §3).
//
// Returns RawBomLine[] = Omit<BomLine,'rate'|'amount'|'group'> — quantities and
// refs only. priceProject applies rates, amounts and groups. Pure and
// deterministic: same model → same BOM, no I/O.

import type { Project, Module, RawBomLine } from "../../schema/src/index.js";
import {
  carcassPanels,
  panelAreaM2,
  shelfCount,
  drawerCount,
  cutFronts,
  type DerivedPanel,
} from "./parts.js";
import { groupCarcasses, hangingCount, resolveProduction } from "./carcass.js";
import { millContourMm, fluteAreaMm2 } from "./fronts.js";
import {
  DEFAULT_HARDWARE_SKUS,
  CAMS_PER_JOINT,
  DOWELS_PER_JOINT,
  carcassJoints,
  HOLES_PER_HINGE,
  HOLES_PER_SHELF,
  HOLES_PER_SLIDE_SET,
  hingesForDoorHeight,
} from "./constants.js";

/** Hinges on a module — counted PER DOOR, by that door's own height. A cabinet whose interior
 *  carries three separate doors needs three sets of hinges, and a short door needs fewer than a
 *  tall one; billing one set for the whole module (as this used to) under-charges every custom
 *  interior. Drawer fronts and open compartments carry none. */
function hingeCount(m: Module): number {
  return cutFronts(m)
    .filter((f) => f.kind === "door")
    .reduce((n, f) => n + hingesForDoorHeight(f.hMm), 0);
}

/** Visible (K1, 1mm) edge-banding length for a module, in mm — the perimeter of every front.
 *  (Length only — priced per metre; the band thickness is K1=1.0mm per DB/25, not 2mm.) */
function visibleEdgeMm(m: Module): number {
  return cutFronts(m).reduce((mm, f) => mm + 2 * (f.wMm + f.hMm), 0);
}

/** Routed contour across every front of a module (mm) — the frame groove, the raised panel's edge,
 *  or the pane cut-out. Zero on a flat or fluted front. */
function millMm(m: Module): number {
  return cutFronts(m).reduce((mm, f) => mm + millContourMm(f.style ?? m.door.style, f.wMm, f.hMm), 0);
}

/** Fluted face area across every front of a module (mm²). Zero unless the front is fluted. */
function fluteMm2(m: Module): number {
  return cutFronts(m).reduce((a, f) => a + fluteAreaMm2(f.style ?? m.door.style, f.wMm, f.hMm), 0);
}

/**
 * K1 (visible, 1.0mm) edge-band length a CARCASS panel carries, in mm — the DB/25 census.
 *
 * The census is authored in the ConstructionProfile (QORASU_PROFILE.defaults.kromkaByRole —
 * KROMKA_CENSUS in engine/catalogs/profiles.ts), the single home for kromka per DB/27 §1.2.
 * Pricing is pure and cannot import the engine profile, so — exactly as KROMKA_VISIBLE_MM mirrors
 * the K1 thickness — the census is mirrored here for the parts a box is built from. Keep in sync.
 *
 * For those parts the census is uniformly K1: nothing a carcass is built from takes hidden K2 tape
 * (only the плинтус sides do, and the plinth is not a priced panel). Banded edges, by role:
 *   side            front + back  → 2 × lengthMm   (A6: a frameless gable is taped both vertical edges)
 *   top · bottom    front         → 1 × lengthMm
 *   stile · divider front         → 1 × lengthMm
 *   shelf           front         → 1 × lengthMm
 *   back            —             → 0              (BARE)
 * `lengthMm` is the front-facing edge on every carcass panel carcassPanels emits (see parts.ts):
 * a side/stile's height, a top/bottom/shelf's width. Merging still saves banding — it drops whole
 * verticals (an outer side taped both edges → a stile taped one), which is where the win shows.
 */
function carcassBandK1Mm(p: DerivedPanel): number {
  if (p.role !== "carcass" || p.name === "back") return 0;
  if (p.name === "side-left" || p.name === "side-right") return 2 * p.lengthMm; // front + back
  return p.lengthMm; // top, bottom, stile-*, shelf-*, divider-* — front edge
}

export function buildBom(project: Project): RawBomLine[] {
  const lines: RawBomLine[] = [];
  const mats = project.materials;
  const prod = resolveProduction(project.production);

  // THE UNIT OF PRODUCTION IS THE BOX, NOT THE CABINET. Untagged modules are each their own box, so
  // an unmerged run iterates exactly as it always did.
  const carcasses = groupCarcasses(project.run);

  for (const c of carcasses) {
    const ms = c.modules;

    // --- panels (carcass + facade) → m² lines, one per panel ---
    const panels = carcassPanels(c, mats, ms[0]?.boardThickness); // §C1 · this box's real board thickness (16/18)
    for (const p of panels) {
      // a glass pane is bought cut-to-size (an ORDERED good), not a board panel — same per-m² rate,
      // its own quote group. Every other panel is a sawn board.
      lines.push({ kind: p.role === "glass" ? "ordered" : "panel", ref: p.materialRef, qty: panelAreaM2(p), unit: "m2" });
    }

    // --- edge banding (material). Every finished edge is K1 (1.0mm visible) per the DB/25 census:
    // the fronts' full perimeter, plus the carcass's front-facing edges (both verticals of each
    // outer side, the front of every top/bottom/stile/shelf). Merging changes no front, and cuts
    // carcass edge the way it cuts board — fewer verticals. Nothing a box is built from takes hidden
    // K2 tape (only the плинтус does, and it is not a priced panel), so the K2 bucket is empty. ---
    const visM =
      (ms.reduce((mm, m) => mm + visibleEdgeMm(m), 0) +
        panels.reduce((mm, p) => mm + carcassBandK1Mm(p), 0)) /
      1000;
    if (visM > 0) lines.push({ kind: "edge", ref: mats.edgeVisibleId, qty: visM, unit: "m" });

    // --- hardware ---
    // hinges and slides hang off FRONTS, so they are per module and merging does not touch them.
    const hinges = ms.reduce((n, m) => n + hingeCount(m), 0);
    const slides = ms.reduce((n, m) => n + drawerCount(m), 0); // one slide set per drawer
    if (hinges > 0) lines.push({ kind: "hardware", ref: DEFAULT_HARDWARE_SKUS.hinge, qty: hinges, unit: "unit" });
    if (slides > 0) lines.push({ kind: "hardware", ref: DEFAULT_HARDWARE_SKUS.slide, qty: slides, unit: "unit" });

    // cams and dowels join the top and bottom to every vertical panel — so they scale with the BOX,
    // not with the cabinets in it. A merged 4-bay box has 5 verticals → 10 joints, where 4 separate
    // boxes had 4 × 4 = 16. carcassJoints(1) === 4, so an unmerged module still bills 8 and 8.
    const joints = carcassJoints(ms.length);
    const dowels = joints * DOWELS_PER_JOINT;
    const cams = joints * CAMS_PER_JOINT;
    lines.push({ kind: "hardware", ref: DEFAULT_HARDWARE_SKUS.dowel, qty: dowels, unit: "unit" });
    lines.push({ kind: "hardware", ref: DEFAULT_HARDWARE_SKUS.cam, qty: cams, unit: "unit" });

    // THE HANGERS. A wall box hangs on one set of навесы however many cabinets it contains — which
    // is the reason a workshop merges a top row in the first place. Four separate 600s need four
    // sets; the 2400 box that replaces them needs one. Floor and tall units get none.
    const hangings = hangingCount(c, prod);
    if (hangings > 0) lines.push({ kind: "hardware", ref: DEFAULT_HARDWARE_SKUS.hanging, qty: hangings, unit: "unit" });

    // --- operations (CNC) ---
    const shelves = ms.reduce((n, m) => n + shelfCount(m), 0);
    const holes =
      hinges * HOLES_PER_HINGE +
      (cams + dowels) +
      shelves * HOLES_PER_SHELF +
      slides * HOLES_PER_SLIDE_SET;
    if (holes > 0) lines.push({ kind: "operation", ref: "drillPerHole", qty: holes, unit: "hole" });
    // a glass pane is bought cut to size — it is not sawn from a board, so it is not a "cut panel"
    lines.push({ kind: "operation", ref: "cutPerPanel", qty: panels.filter((p) => p.role !== "glass").length, unit: "panel" });
    const bandM = visM; // total banded length — all K1 now (K2 is empty for priced parts)
    if (bandM > 0) lines.push({ kind: "operation", ref: "edgebandPerM", qty: bandM, unit: "m" });

    // THE PROFILE'S COST. A shaker / raised / glazed front is ONE MDF blank with its shape routed
    // in, and a fluted one is the same blank with ribs cut across its face. So the profile buys no
    // extra parts — it buys MACHINE TIME, and this is where that lands.
    //
    // Both rates are seeded at ZERO, exactly as edgebandPerM is: until the seller sets them in
    // Settings, no existing quote moves by a single сум. (Note the default facade material is
    // literally named «МДФ фасад фрезерованный» — so today a flat front already pays for milling it
    // never got, and a milled one gets its routing free.)
    const millM = ms.reduce((mm, m) => mm + millMm(m), 0) / 1000;
    if (millM > 0) lines.push({ kind: "operation", ref: "millPerM", qty: millM, unit: "m" });
    const fluteM2 = ms.reduce((a, m) => a + fluteMm2(m), 0) / 1_000_000;
    if (fluteM2 > 0) lines.push({ kind: "operation", ref: "flutePerM2", qty: fluteM2, unit: "m2" });

    // THE LAMINATE'S COST. A laminated front is billed as N blanks (parts.ts emits every board), plus
    // the glue + press step bonding them into one thick facade — which is what THIS line buys, per m²
    // of BONDED face. N boards have (N−1) glued interfaces (2 layers → 1, 3 → 2, QONUNLAR §14.1), so the
    // area scales by (layers−1). Seeded at 0, same discipline as millPerM/flutePerM2: no quote moves
    // until the seller sets it.
    const lamM2 =
      ms.reduce((a, m) => {
        const layers = m.door.layers ?? 1;
        return layers > 1 ? a + (layers - 1) * cutFronts(m).reduce((s, f) => s + f.wMm * f.hMm, 0) : a;
      }, 0) / 1_000_000;
    if (lamM2 > 0) lines.push({ kind: "operation", ref: "laminatePerM2", qty: lamM2, unit: "m2" });

    // --- worktop (base modules only, when one is selected) ---
    // still per module: the slab runs the length of the cabinetry either way.
    for (const m of ms) {
      if (m.kind === "base" && mats.worktopId) {
        lines.push({ kind: "worktop", ref: mats.worktopId, qty: m.w / 1000, unit: "m" });
      }
    }
  }

  // --- labor + delivery (project level) ---
  // BOXES, not cabinets: the shop assembles one merged carcass and puts one carcass on the van.
  // With nothing merged, boxes === modules and both lines are unchanged.
  const boxCount = carcasses.length;
  if (boxCount > 0) {
    lines.push({ kind: "labor", ref: "assemblyPerModule", qty: boxCount, unit: "module" });
  }
  const hardeningCount = project.run.reduce((n, m) => n + (m.hardening?.length ?? 0), 0);
  if (hardeningCount > 0) {
    lines.push({ kind: "labor", ref: "hardeningPerPreset", qty: hardeningCount, unit: "unit" });
  }

  lines.push({ kind: "delivery", ref: "base", qty: 1, unit: "unit" });
  lines.push({ kind: "delivery", ref: "perModule", qty: boxCount, unit: "module" });

  return lines;
}
