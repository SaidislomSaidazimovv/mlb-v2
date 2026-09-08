// Layer 2 — panelDecomposition: the ONE function that turns design intent into Parts.
//
//   panelDecomposition(design, profile) → Part[]
//
// DB/27's law in code: every construction number below comes from `profile`. The
// design contributes topology and sizes only — it has no field to contribute
// construction from. That is why N blocks by N authors yield ONE consistent build.
//
// GEOMETRY MODEL (v2 — derived from the DB/28 replay; every line reproduces a real
// panel the factory cut):
//
//     H is the cabinet's TOTAL height, worktop included.
//     worktopT = hasWorktop ? carcass : 0
//     sideH    = H − worktopT − (накладное ? t : 0)
//     bottomW  = вкладное ? W − 2t : W          bottomD = D − backZone
//     dividerH = sideH − plinthH − t            (stands on the bottom, under the top)
//     shelfW   = (W − 2t − dividers·t) / (dividers + 1)   ← compartment-aware
//     shelfD   = D − backZone − shelfSetback
//     plinthW  = between ? W − 2t : W
//     worktop  = (W + 2·sideOverhang) × (D + frontOverhang)
//
// Pure: no I/O, no clock, no randomness. Same inputs → byte-identical output.

import type { Operation, Part, SawGrooveOp, mm10 } from "../contracts/types.js";
import type {
  BandRole, ConstructionOverride, ConstructionProfile, DecomposeFlag, DecomposeResult,
  DesignNode, DesignProject, EdgeKromka, PartOrientation, PartRole, TypeConstruction,
} from "../contracts/design.js";
import { geometryCaveat } from "../catalogs/connectors/registry.js";
import { derivePartId, deriveOpId } from "../core/ids.js";
import { planMerges, suppressedLeftSides } from "./merge/registry.js";

// ───────────────────────────────────────────────── construction resolution
/**
 * The cascade — the ONLY way construction reaches a part:
 *   1. project override (user, per node)   2. profile.byType[type]   3. profile.defaults
 * There is no 4th source. A block cannot appear in this list; that is the law.
 */
function construction(profile: ConstructionProfile, node: DesignNode): TypeConstruction {
  const scoped = node.cabinetType ? profile.byType[node.cabinetType] : undefined;
  if (!scoped) return profile.defaults;
  return {
    ...profile.defaults,
    ...scoped,
    // nested objects must merge, not clobber
    back: { ...profile.defaults.back, ...(scoped.back ?? {}) },
    plinth: { ...profile.defaults.plinth, ...(scoped.plinth ?? {}) },
    worktop: { ...profile.defaults.worktop, ...(scoped.worktop ?? {}) },
    kromkaByRole: { ...profile.defaults.kromkaByRole, ...(scoped.kromkaByRole ?? {}) },
  };
}

function override<T>(
  field: ConstructionOverride["field"], nodeId: string, overrides: ConstructionOverride[], fallback: T,
): T {
  const o = overrides.find((x) => x.nodeId === nodeId && x.field === field);
  return o ? (o.value as unknown as T) : fallback;
}

// ───────────────────────────────────────────────── orientation-aware kromka
/**
 * DB/28 C1. A part's edges live on SWJ008 faces 1..4, which is a MACHINE frame:
 *   face1 = Y max · face2 = Y 0 · face3 = X max · face4 = X 0
 * Which physical edge that is depends on what the part's X/Y axes MEAN. So the
 * profile stores kromka semantically (front/back/left/right) and this function is
 * the single place the mapping happens — declared, testable, not implicit.
 */
function edgesFor(
  k: EdgeKromka, o: PartOrientation, profile: ConstructionProfile,
): [mm10, mm10, mm10, mm10] {
  const t = (s: EdgeKromka[keyof EdgeKromka]) => (s ? profile.kromka.slots[s].thickness_mm10 : 0);
  /** Each axis owns a NAMED PAIR of edges. Getting this wrong double-bands a panel. */
  const semanticAt = (axis: PartOrientation["xAxis"], atMax: boolean): keyof EdgeKromka => {
    if (axis === "depth") return atMax ? "back" : "front";
    if (axis === "width") return atMax ? "right" : "left";
    return atMax ? "top" : "bottom"; // height axis owns top/bottom — NOT front/back
  };
  return [
    t(k[semanticAt(o.yAxis, true)]),  // face1 = Y max
    t(k[semanticAt(o.yAxis, false)]), // face2 = Y 0
    t(k[semanticAt(o.xAxis, true)]),  // face3 = X max
    t(k[semanticAt(o.xAxis, false)]), // face4 = X 0
  ];
}

interface Ctx {
  profile: ConstructionProfile;
  overrides: ConstructionOverride[];
  parts: Part[];
  flags: DecomposeFlag[];
  provenance: DecomposeResult["provenance"];
  usedNodeIds: Set<string>;
  /** Band roles present on the run currently being walked. A cabinet inside a run does
   *  NOT emit its own цоколь/столешница — the band does, once, for the whole run. */
  bandsInScope: Set<BandRole>;
  /** Cabinets whose LEFT side is a shared board owned by the cabinet to their left.
   *  This is the entire geometric footprint of a merge — see merge/registry.ts. */
  mergedLeftSide: Set<string>;
}

/**
 * GRAIN POLICY (Резать скрытое поперёк ради листа). "lock_all" → every part is
 * texture-locked (grain from the profile → nesting cannot rotate it). "free_hidden"
 * → a hidden role is released to grain NONE so nesting may rotate it for yield.
 */
function grainFor(ctx: Ctx, C: TypeConstruction, role: PartRole): "L" | "W" | "NONE" {
  if (C.grainPolicy.mode === "free_hidden" && C.grainPolicy.hiddenRoles.includes(role)) {
    return "NONE";
  }
  return ctx.profile.grain;
}

/** MERGE LIMIT gate — a part longer/wider than the sheet must be split, not cut. */
function checkSheet(ctx: Ctx, nodeId: string, role: PartRole, length: mm10, width: mm10, C: TypeConstruction): void {
  const long = Math.max(length, width), short = Math.min(length, width);
  if (long > C.merge.limits.maxSheetLength_mm10 || short > C.merge.limits.maxSheetWidth_mm10) {
    ctx.flags.push({
      code: "EXCEEDS_SHEET", where: nodeId,
      detail: `${role} ${long / 10}×${short / 10}mm exceeds sheet ${C.merge.limits.maxSheetLength_mm10 / 10}×${C.merge.limits.maxSheetWidth_mm10 / 10}mm — split required`,
    });
  }
}

function emit(
  ctx: Ctx, nodeId: string, role: PartRole, sub: number, name: string,
  length: mm10, width: mm10, thickness: mm10, C: TypeConstruction,
  orientation: PartOrientation, ops: Operation[] = [],
): Part {
  const id = derivePartId(nodeId, role, sub);
  checkSheet(ctx, nodeId, role, length, width, C);
  const part: Part = {
    id, name,
    length_mm10: length, width_mm10: width, thickness_mm10: thickness,
    grain: grainFor(ctx, C, role),
    edges: edgesFor(C.kromkaByRole[role], orientation, ctx.profile),
    operations: ops,
  };
  ctx.parts.push(part);
  ctx.provenance[id] = { nodeId, role, orientation };
  return part;
}

/** The back groove — census-proven geometry, entirely from the profile. */
function backGroove(ctx: Ctx, C: TypeConstruction, partId: string, length: mm10, width: mm10): SawGrooveOp[] {
  if (C.back.treatment !== "groove") return [];
  const y = width - C.back.grooveSetback_mm10;
  return [{
    op: "saw_groove", id: deriveOpId(partId, "backgroove", 0), face: "A",
    x_mm10: 0, y_mm10: y, endX_mm10: length, endY_mm10: y,
    width_mm10: C.back.grooveWidth_mm10, depth_mm10: C.back.grooveDepth_mm10,
    source: "auto",
  }];
}

/** Resolve an anchor's distance to mm10 along a span: fixed/locked are absolute, ratio is a
 *  fraction of the span (DB/32 §4 / DB/35 §2 anchoring). */
function resolveAnchorDist(d: import("../contracts/design.js").AnchorRule, span: mm10): mm10 {
  return d.rule === "ratio" ? Math.round(span * d.value) : d.mm10;
}

/**
 * DecorativeViyemka (DB/35 §5.4/§10.7): a user-drawn groove on a panel → a SawGrooveOp — the same op
 * shape as the back groove but `source:"user"` (the structural back groove stays profile-owned). This
 * is `modifiers[]`-decompose for the viyemka type. PROVISIONAL anchor reading — the measured point is
 * the founder's still-open ruling (#13 / R48): a groove parallel to the anchor edge, offset by its
 * distance, running `run` (or the full span). Emitted only for a panel that carries a viyemka modifier.
 */
function viyemkaGrooves(node: DesignNode, part: Part): SawGrooveOp[] {
  const L = part.length_mm10, W = part.width_mm10;
  return (node.modifiers ?? []).filter((m) => m.type === "viyemka").map((m, k) => {
    const width_mm10 = Math.max(0, Number(m.params.width) || 0);
    const depth_mm10 = Math.max(0, Number(m.params.depth) || 0);
    const run = Math.max(0, Number(m.params.run) || 0);
    const a = m.anchors[0];
    const id = deriveOpId(part.id, "viyemka", k);
    if (a && (a.edge === "left" || a.edge === "right")) {
      const x = a.edge === "left" ? resolveAnchorDist(a.distance, L) : L - resolveAnchorDist(a.distance, L);
      return { op: "saw_groove", id, face: "A", x_mm10: x, y_mm10: 0, endX_mm10: x, endY_mm10: run > 0 ? run : W, width_mm10, depth_mm10, source: "user" };
    }
    // top/bottom (and, provisionally, front/back) → a groove parallel to the bottom/top edge
    const dist = a ? resolveAnchorDist(a.distance, W) : 0;
    const y = a && a.edge === "top" ? W - dist : dist;
    return { op: "saw_groove", id, face: "A", x_mm10: 0, y_mm10: y, endX_mm10: run > 0 ? run : L, endY_mm10: y, width_mm10, depth_mm10, source: "user" };
  });
}

/** LAMINATE modifier (DB/35 §7.4, DECIDED): N boards glued into one thick panel → N identical
 *  blanks (plus the implicit glue/assembly), never one thick board. Absent → 1. The one place the
 *  layer count is read, so the front loop and a component's panels agree. */
function laminateLayers(node: DesignNode): number {
  const lam = node.modifiers?.find((m) => m.type === "laminate");
  return lam ? Math.max(1, Number(lam.params.layers) || 1) : 1;
}

/** NodeKind → the PartRole it cuts to, for a component's own panels. design.ts:45, verbatim: "each
 *  drawn panel is ONE DesignNode ... with `kind` = its role". A drawer front is a фасад like a door.
 *  ONLY the leaf-panel kinds the walker skips (shelf/divider/door/drawer) are owned here — filler,
 *  rod, and nested group/cabinet are emitted by walk()'s own recursion, so returning null for them
 *  keeps a filler from being cut twice. */
function panelPartRole(kind: DesignNode["kind"]): PartRole | null {
  switch (kind) {
    case "divider": return "divider";
    case "shelf": return "shelf";
    case "door": case "drawer": return "door";
    default: return null;
  }
}

/** The board thickness for a component panel's role — ALWAYS from the profile, never the node
 *  (DB/27; App-3 S2 2026-08-25: "the node's thin-extent is authoring geometry, not manufacturing
 *  thickness"). Mirrors decomposeCabinet's material picks: фасад ← front, задняя ← back, else carcass. */
function panelThickness(role: PartRole, P: ConstructionProfile): mm10 {
  if (role === "door") return P.material.front_mm10;
  if (role === "back") return P.material.back_mm10;
  return P.material.carcass_mm10;
}

/**
 * A component panel's authored `size` {w,h,d} → its cut face (length × width) + orientation.
 *
 * THE AXIS CONVENTION: the panel's `thicknessAxis` (§2.4 field, x=width/y=height/z=depth) names WHICH
 * extent is the thickness, so the face is the other two. Absent → derived, per App-3's 2026-08-25
 * authorisation (DB/34 §6): "thickness = the smallest extent" (a physical flat panel's thickness IS its
 * smallest dimension); with only two extents given, the absent one is the thickness axis. Only the AXIS
 * is read here — the thickness VALUE comes from the profile (panelThickness). Each thickness axis maps to
 * the SAME orientation decomposeCabinet already uses (side/divider = height×depth, shelf = depth×width,
 * door = height×width), so kromka lands on the right edges (EdgeKromka semantics). <2 extents → null.
 */
function panelFace(
  size: DesignNode["size"],
  declaredAxis?: "x" | "y" | "z",
): { length: mm10; width: mm10; orientation: PartOrientation } | null {
  const val = (a: "width" | "height" | "depth"): mm10 | undefined =>
    a === "width" ? size?.w_mm10 : a === "height" ? size?.h_mm10 : size?.d_mm10;
  const present = (["width", "height", "depth"] as const).filter((a) => typeof val(a) === "number");
  if (present.length < 2) return null;
  // thickness axis: the DECLARED axis (x=width, y=height, z=depth) when present; else derived — the absent
  // one (2 present) or the smallest (3 present). The face is the other two.
  const declared = declaredAxis === "x" ? "width" : declaredAxis === "y" ? "height" : declaredAxis === "z" ? "depth" : undefined;
  const thicknessAxis = declared ?? (present.length === 2
    ? (["width", "height", "depth"] as const).find((a) => !present.includes(a))!
    : [...present].sort((a, b) => (val(a)! - val(b)!))[0]!);
  if (thicknessAxis === "depth") {
    return { length: val("height") ?? 0, width: val("width") ?? 0, orientation: { xAxis: "height", yAxis: "width" } };
  }
  if (thicknessAxis === "width") {
    return { length: val("height") ?? 0, width: val("depth") ?? 0, orientation: { xAxis: "height", yAxis: "depth" } };
  }
  // thickness = height → the panel lies flat (shelf-like): depth × width
  return { length: val("depth") ?? 0, width: val("width") ?? 0, orientation: { xAxis: "depth", yAxis: "width" } };
}

const PANEL_NAME: Record<string, string> = {
  divider: "стойка", shelf: "полка", door: "фасад",
};

/**
 * A GROUP (a placed library Component's root, design.ts NodeKind "group") → its panels as Parts.
 *
 * DB_37 §4, verbatim: "panelDecomposition runs fresh on the instance, same as any other node." A
 * group carries no geometry of its own beyond an envelope (design.ts:47); it exists to own children,
 * and each child is one panel with `kind` = role and `size` = geometry. So this emits one Part per
 * panel child at its authored face (panelFace), the thickness from the profile (panelThickness), and
 * the SAME modifier decompose the front loop uses: laminate → N blanks, viyemka → a groove on the
 * outer blank. Construction (kromka, grain) comes from the profile exactly as everywhere else — a
 * component never smuggles a construction opinion (DB/27).
 *
 * SCOPE v1: no auto back-groove (that is a cabinet-back feature; a group has no back) — a component
 * panel's only grooves are its own viyemka modifiers. Nested group children are left to the walker.
 * The panel is emitted at its AUTHORED size; resizing the instance to its placement cell (DB_37 §4
 * mixed-resolution, DB/32 §4.3 "still to be written") is a documented follow-up.
 */
function decomposeGroup(ctx: Ctx, node: DesignNode): void {
  const P = ctx.profile;
  const C = construction(P, node); // a group has no cabinetType → profile.defaults
  for (const child of node.children ?? []) {
    const role = panelPartRole(child.kind);
    if (!role) continue; // rod / nested group / cabinet → not a cut panel here (walker handles groups)
    ctx.usedNodeIds.add(child.nodeId);
    const face = panelFace(child.size, child.thicknessAxis);
    if (!face) {
      ctx.flags.push({
        code: "DEGENERATE_GEOMETRY", where: child.nodeId,
        detail: `component panel "${child.kind}" needs at least two of size.{w,h,d} to form a face`,
      });
      continue;
    }
    const thickness = panelThickness(role, P);
    const layers = laminateLayers(child);
    const base = PANEL_NAME[role] ?? role;
    for (let L = 0; L < layers; L++) {
      const part = emit(ctx, child.nodeId, role, L,
        layers > 1 ? `${base} (${L + 1}/${layers})` : base,
        face.length, face.width, thickness, C, face.orientation);
      // viyemka is cut on the OUTER blank's visible face (the first layer), like the front loop.
      if (L === 0) part.operations = viyemkaGrooves(child, part);
    }
  }
}

function decomposeCabinet(ctx: Ctx, node: DesignNode): void {
  const P = ctx.profile;
  const C0 = construction(P, node);
  // user overrides sit on top of the type scope
  const C: TypeConstruction = {
    ...C0,
    bottomPlacement: override("bottomPlacement", node.nodeId, ctx.overrides, C0.bottomPlacement),
    topStyle: override("topStyle", node.nodeId, ctx.overrides, C0.topStyle),
    shelfSetback_mm10: override("shelfSetback_mm10", node.nodeId, ctx.overrides, C0.shelfSetback_mm10),
    plinth: { ...C0.plinth, height_mm10: override("plinthHeight_mm10", node.nodeId, ctx.overrides, C0.plinth.height_mm10) },
  };

  const t = P.material.carcass_mm10;
  const W = node.size?.w_mm10 ?? 6000;
  const H = node.size?.h_mm10 ?? 7200;
  const D = node.size?.d_mm10 ?? 5600;

  if (W <= 2 * t || H <= 2 * t || D <= C.backZone_mm10) {
    ctx.flags.push({
      code: "DEGENERATE_GEOMETRY", where: node.nodeId,
      detail: `cabinet ${W / 10}×${H / 10}×${D / 10}mm cannot host ${t / 10}mm board + ${C.backZone_mm10 / 10}mm back zone`,
    });
    return;
  }

  const worktopT = node.hasWorktop ? t : 0;
  const plinthH = C.plinth.style === "none" ? 0 : C.plinth.height_mm10;
  const sideH = H - worktopT - (C.bottomPlacement === "nakladnoe" ? t : 0);
  const innerW = W - 2 * t;

  // ── sides ── X = height, Y = depth
  const sideO: PartOrientation = { xAxis: "height", yAxis: "depth" };
  // MERGE (DB/22 N1): a merged cabinet does not cut its own left side — the neighbour's
  // right side IS the shared board. That single skip is the whole geometric effect.
  const skipLeft = ctx.mergedLeftSide.has(node.nodeId);
  for (const [sub, nm] of [[0, "бок левый"], [1, "бок правый"]] as const) {
    if (sub === 0 && skipLeft) continue;
    const side = emit(ctx, node.nodeId, "side", sub, nm, sideH, D, t, C, sideO);
    side.operations = backGroove(ctx, C, side.id, sideH, D);
  }

  // ── bottom ── X = width, Y = depth
  const flatO: PartOrientation = { xAxis: "width", yAxis: "depth" };
  const bottomW = C.bottomPlacement === "vkladnoe" ? innerW : W;
  const bottomD = D - C.backZone_mm10;
  const bottom = emit(ctx, node.nodeId, "bottom", 0, "дно", bottomW, bottomD, t, C, flatO);
  bottom.operations = backGroove(ctx, C, bottom.id, bottomW, bottomD);

  // ── top: full крышка · 2 царги · none (a worktop sits instead)
  if (C.topStyle === "full") {
    const top = emit(ctx, node.nodeId, "top", 0, "крышка", innerW, bottomD, t, C, flatO);
    top.operations = backGroove(ctx, C, top.id, innerW, bottomD);
  } else if (C.topStyle === "stretchers") {
    for (const sub of [0, 1]) {
      emit(ctx, node.nodeId, "stretcher", sub, sub === 0 ? "царга передняя" : "царга задняя",
        innerW, C.stretcherWidth_mm10, t, C, flatO);
    }
  }

  // ── worktop (overhangs — construction) ──
  // DB/39: inside a run with a столешница band, the BAND emits one slab for the whole
  // run. Emitting here too would double the part and re-cut it per cabinet.
  if (node.hasWorktop && !ctx.bandsInScope.has("stoleshnitsa")) {
    emit(ctx, node.nodeId, "worktop", 0, "столешница",
      W + 2 * C.worktop.sideOverhang_mm10, D + C.worktop.frontOverhang_mm10, t, C, flatO);
  }

  // ── back ──
  if (C.back.treatment === "groove") {
    const inset = C.back.grooveSetback_mm10;
    emit(ctx, node.nodeId, "back", 0, "задняя стенка",
      innerW + 2 * inset, H - 2 * t + 2 * inset, P.material.back_mm10, C, { xAxis: "width", yAxis: "height" });
  } else if (C.back.treatment === "overlay") {
    emit(ctx, node.nodeId, "back", 0, "задняя стенка", W, H, P.material.back_mm10, C,
      { xAxis: "width", yAxis: "height" });
  } // "none" → genuinely backless

  // ── dividers (design children) → compartments ──
  const dividers = (node.children ?? []).filter((c) => c.kind === "divider");
  const dividerO: PartOrientation = { xAxis: "height", yAxis: "depth" };
  const dividerH = sideH - plinthH - t;
  for (const d of dividers) {
    ctx.usedNodeIds.add(d.nodeId);
    const p = emit(ctx, d.nodeId, "divider", 0, "стойка", dividerH, D - C.backZone_mm10, t, C, dividerO);
    p.operations = backGroove(ctx, C, p.id, dividerH, D - C.backZone_mm10);
  }

  // ── shelves — compartment-aware (DB/28 B1) ── X = depth, Y = width (machine frame
  //    the factory uses for shelves: POLKA is 503×486 = depth×width)
  const shelves = (node.children ?? []).filter((c) => c.kind === "shelf");
  const compartments = dividers.length + 1;
  const shelfW = Math.round((innerW - dividers.length * t) / compartments);
  const shelfD = D - C.backZone_mm10 - C.shelfSetback_mm10;
  const shelfO: PartOrientation = { xAxis: "depth", yAxis: "width" };
  shelves.forEach((sh, i) => {
    ctx.usedNodeIds.add(sh.nodeId);
    emit(ctx, sh.nodeId, "shelf", 0, `полка ${i + 1}`, shelfD, shelfW, t, C, shelfO);
  });

  // ── fronts (door / drawer children) → one фасад part each ──
  // design.ts NodeKind, founder verbatim: "each drawn panel is ONE DesignNode ... with `kind` = its
  // role and `size` = its geometry." So a design that carries door/drawer child nodes gets one фасад
  // per node — drawers, per-cell doors, a split facade — exactly as the dividers/shelves above are
  // read off `node.children`. A design that only sets `hasDoor` (App-2's current toDesign maps INTENT
  // only, DB/27 §3) keeps the single full-size door below — unchanged, backward-compatible.
  const fronts = (node.children ?? []).filter((c) => c.kind === "door" || c.kind === "drawer");
  if (fronts.length > 0) {
    fronts.forEach((f, i) => {
      ctx.usedNodeIds.add(f.nodeId);
      // LAMINATE modifier (DB/35 §7.4, DECIDED): a laminated front is N boards glued into one thick
      // facade — emit N identical фасад blanks plus (implicitly) the glue/assembly, never one thick
      // board. This is `modifiers[]`-decompose for the laminate type; absent → a single board.
      const layers = laminateLayers(f);
      for (let L = 0; L < layers; L++) {
        const part = emit(ctx, f.nodeId, "door", L,
          layers > 1 ? `фасад ${i + 1} (${L + 1}/${layers})` : `фасад ${i + 1}`,
          f.size?.h_mm10 ?? H, f.size?.w_mm10 ?? W, P.material.front_mm10, C,
          { xAxis: "height", yAxis: "width" });
        // a viyemka (decorative groove) is cut on the OUTER blank's visible face (the first layer)
        if (L === 0) part.operations = viyemkaGrooves(f, part);
      }
    });
  } else if (node.hasDoor) {
    emit(ctx, node.nodeId, "door", 0, "фасад", H, W, P.material.front_mm10, C,
      { xAxis: "height", yAxis: "width" });
  }

  // ── plinth ── X = width, Y = HEIGHT (its 80mm dimension is height, not depth)
  // DB/39: same rule as the worktop — a цоколь band owns the run's plinth.
  if (C.plinth.style !== "none" && !ctx.bandsInScope.has("tsokol")) {
    const plinthW = C.plinth.placement === "between" ? innerW : W;
    const plinthO: PartOrientation = { xAxis: "width", yAxis: "height" };
    const p = emit(ctx, node.nodeId, "plinth", 0, "цоколь", plinthW, plinthH, t, C, plinthO);
    if (C.plinth.style === "box") p.operations = backGroove(ctx, C, p.id, plinthW, plinthH);
  }

  // ── MERGE WEIGHT GATE (границы: когда объединять нельзя) — assembled carcass mass.
  // ЛДСП ≈ 680 kg/m³ (R9). A carcass over the limit must be split, not merged.
  const LDSP_DENSITY = 680;
  const carcassMassKg = ctx.parts
    .filter((pp) => ctx.provenance[pp.id]?.nodeId === node.nodeId)
    .reduce((kg, pp) => kg + (pp.length_mm10 / 10000) * (pp.width_mm10 / 10000) * (pp.thickness_mm10 / 10000) * LDSP_DENSITY, 0);
  if (carcassMassKg > C.merge.limits.maxWeightKg) {
    ctx.flags.push({
      code: "EXCEEDS_WEIGHT", where: node.nodeId,
      detail: `assembled ~${carcassMassKg.toFixed(0)}kg exceeds ${C.merge.limits.maxWeightKg}kg — split for transport`,
    });
  }
}

// ─────────────────────────────────────────────────────── horizontal bands (DB/39)

/** Which PartRole a band produces. Only these two have construction in the profile
 *  (`plinth`, `worktop`); фартук and шапка have their own roles and no numbers yet. */
const BAND_PART_ROLE: Record<BandRole, PartRole> = {
  tsokol: "plinth",
  stoleshnitsa: "worktop",
  fartuk: "fartuk",
  shapka: "shapka",
};

const BAND_NAME: Record<BandRole, string> = {
  tsokol: "цоколь", stoleshnitsa: "столешница", fartuk: "фартук", shapka: "шапка",
};

/**
 * ONE band → ONE part spanning the whole run. DB/39's core claim: four cabinets under
 * one worktop produce one slab, not four butted pieces.
 *
 * THE CLOSING RULE (DB/39 §2). A run end that abuts a wall is CLOSED and gets no
 * overhang — the slab simply runs to the wall. Only an OPEN end, visible and
 * unsupported, gets the profile's side overhang. Emitting an overhang into a wall is
 * waste; forgetting one on a visible end is a defect the client sees.
 */
function decomposeBand(ctx: Ctx, run: DesignNode, band: DesignNode, runW: mm10, runD: mm10): void {
  const role = band.bandRole;
  if (!role) {
    ctx.flags.push({ code: "DEGENERATE_GEOMETRY", where: band.nodeId, detail: "band node has no bandRole" });
    return;
  }
  const C = construction(ctx.profile, band);
  const t = ctx.profile.material.carcass_mm10;
  const ends = run.ends ?? { begin: "open", end: "open" };
  const openEnds = (ends.begin === "open" ? 1 : 0) + (ends.end === "open" ? 1 : 0);

  // Length along the run, and the band's other dimension.
  let length: mm10;
  let width: mm10;
  let orientation: PartOrientation;
  if (role === "stoleshnitsa") {
    length = runW + openEnds * C.worktop.sideOverhang_mm10;
    width = runD + C.worktop.frontOverhang_mm10;
    orientation = { xAxis: "width", yAxis: "depth" };
  } else {
    // цоколь / фартук / шапка: the band's own height is a GRID-ROW dimension, i.e.
    // DESIGN (DB/39 §4). Fall back to the profile's plinth height only for цоколь,
    // which is the one band whose height the profile has always carried.
    length = runW;
    width = band.size?.h_mm10 ?? (role === "tsokol" ? C.plinth.height_mm10 : 0);
    orientation = { xAxis: "width", yAxis: "height" };
  }
  if (width <= 0) {
    ctx.flags.push({
      code: "DEGENERATE_GEOMETRY", where: band.nodeId,
      detail: `band "${role}" has no height — set size.h_mm10 (it is a grid-row dimension, DB/39 §4)`,
    });
    return;
  }

  // SPLIT, REPORTED — never silent (DB/39 §3). A band longer than the sheet is seamed;
  // where to seam is construction, but that the seam EXISTS is something the master
  // must see, because it is visible in the finished kitchen.
  const maxLen = C.merge.limits.maxSheetLength_mm10;
  const pieces = length > maxLen ? Math.ceil(length / maxLen) : 1;
  if (pieces > 1) {
    ctx.flags.push({
      code: "BAND_SPLIT", where: band.nodeId,
      detail: `${BAND_NAME[role]} ${length / 10}mm exceeds sheet ${maxLen / 10}mm — seamed into ${pieces} pieces`,
    });
  }

  const partRole = BAND_PART_ROLE[role];
  const each = Math.round(length / pieces);
  for (let i = 0; i < pieces; i++) {
    const segLen = i === pieces - 1 ? length - each * (pieces - 1) : each;
    const name = pieces > 1 ? `${BAND_NAME[role]} ${i + 1}/${pieces}` : BAND_NAME[role];
    const p = emit(ctx, band.nodeId, partRole, i, name, segLen, width, t, C, orientation);
    // A цоколь-box carries the back groove exactly as a per-cabinet plinth did.
    if (role === "tsokol" && C.plinth.style === "box") {
      p.operations = backGroove(ctx, C, p.id, segLen, width);
    }
  }
}

/**
 * A RUN — cabinets side by side, with bands over and under them. The run's width is the
 * sum of its cabinets', which is exactly why a band cannot be a cabinet property: no
 * single cabinet knows it.
 */
function decomposeRun(ctx: Ctx, run: DesignNode): void {
  const children = run.children ?? [];
  const cabinets = children.filter((c) => c.kind === "cabinet");
  const bands = children.filter((c) => c.kind === "band");

  const runW = cabinets.reduce((sum, c) => sum + (c.size?.w_mm10 ?? 0), 0);
  const runD = cabinets.reduce((max, c) => Math.max(max, c.size?.d_mm10 ?? 0), 0);

  // MERGE is planned BEFORE anything is cut, because it decides which side panels exist.
  // Automatic by design (founder, 2026-08-15: "best ease for user") — the master never
  // asks for it; the engine merges where physics allows and REPORTS both what it merged
  // and every boundary it refused, with the reason.
  const plan = planMerges(cabinets, ctx.profile);
  const prevMerged = ctx.mergedLeftSide;
  ctx.mergedLeftSide = suppressedLeftSides(plan);

  for (const g of plan.groups) {
    if (g.panelsSaved <= 0) continue;
    ctx.flags.push({
      code: "MERGED", where: g.cabinets[0]!.nodeId,
      detail: `объединено ${g.cabinets.length} шкафов (${g.cabinets.map((c) => c.nodeId).join(" + ")}) — ` +
              `экономия ${g.panelsSaved} панел(и): ${2 * g.cabinets.length} боков → ${g.cabinets.length + 1}`,
    });
  }
  for (const b of plan.blocked) {
    ctx.flags.push({
      code: "MERGE_BLOCKED", where: `${b.leftNodeId}|${b.rightNodeId}`,
      detail: `${b.blockerId}: ${b.reason}`,
    });
  }

  // Bands are decided BEFORE the cabinets are cut, so each cabinet knows to skip the
  // plinth/worktop the band now owns.
  const prev = ctx.bandsInScope;
  ctx.bandsInScope = new Set(bands.map((b) => b.bandRole).filter((r): r is BandRole => !!r));
  for (const c of cabinets) walk(ctx, c);
  ctx.bandsInScope = prev;
  ctx.mergedLeftSide = prevMerged;

  for (const b of bands) {
    ctx.usedNodeIds.add(b.nodeId);
    decomposeBand(ctx, run, b, runW, runD);
  }
  // Anything else under a run (a filler, a group) walks normally.
  for (const c of children) {
    if (c.kind !== "cabinet" && c.kind !== "band") walk(ctx, c);
  }
}

function walk(ctx: Ctx, node: DesignNode): void {
  ctx.usedNodeIds.add(node.nodeId);
  if (node.kind === "run") { decomposeRun(ctx, node); return; }
  if (node.kind === "cabinet") decomposeCabinet(ctx, node);
  else if (node.kind === "group") decomposeGroup(ctx, node);
  else if (node.kind === "filler") {
    const C = construction(ctx.profile, node);
    emit(ctx, node.nodeId, "filler", 0, "фальшпанель",
      node.size?.h_mm10 ?? 7200, node.size?.w_mm10 ?? 600, ctx.profile.material.carcass_mm10, C,
      { xAxis: "height", yAxis: "width" });
  }
  for (const c of node.children ?? []) {
    // shelf/divider/door/drawer are consumed inside decomposeCabinet (as `node.children`), so they
    // are marked used here but not walked — walking a leaf front node would emit nothing anyway.
    if (c.kind !== "shelf" && c.kind !== "divider" && c.kind !== "door" && c.kind !== "drawer") walk(ctx, c);
    else ctx.usedNodeIds.add(c.nodeId);
  }
}

export function panelDecomposition(
  design: DesignProject, profile: ConstructionProfile,
): DecomposeResult {
  const ctx: Ctx = {
    profile, overrides: design.overrides,
    parts: [], flags: [], provenance: {}, usedNodeIds: new Set(),
    bandsInScope: new Set(),
    mergedLeftSide: new Set(),
  };

  // The connector's drilling numbers are reported, not enforced. An "observed" or
  // "standard" geometry still cuts — it just carries its caveat all the way to whoever
  // presses Export. See engine/catalogs/connectors/.
  const caveat = geometryCaveat(profile.defaults.joints.carcassConnector);
  if (caveat) {
    ctx.flags.push({ code: "CONNECTOR_GEOMETRY_UNPROVEN", where: profile.profileId, detail: caveat });
  }

  for (const node of design.nodes) walk(ctx, node);

  // §3.2 — a block may not silently import a slot the project hasn't bound.
  const need = new Set<string>();
  const collect = (n: DesignNode) => { if (n.roleSlot) need.add(n.roleSlot); (n.children ?? []).forEach(collect); };
  design.nodes.forEach(collect);
  for (const slot of need) {
    if (!design.slotBindings[slot as keyof typeof design.slotBindings]) {
      ctx.flags.push({ code: "UNBOUND_SLOT", where: slot, detail: `role "${slot}" is not bound to a project material` });
    }
  }

  // Overrides pointing at design nodes that no longer exist are FLAGGED, not dropped.
  for (const o of design.overrides) {
    if (!ctx.usedNodeIds.has(o.nodeId)) {
      ctx.flags.push({
        code: "ORPHANED_OVERRIDE", where: o.nodeId,
        detail: `override ${o.field}=${o.value} targets a node that is not in the design`,
      });
    }
  }

  return { parts: ctx.parts, flags: ctx.flags, provenance: ctx.provenance };
}
