// Adapter: the app's Cabinet run → the engine's canonical DesignProject (DB/27).
//
// WHY: the founder's POSYLKA installed the canonical design layer —
//   engine/contracts/design.ts        (DesignNode + ConstructionProfile)
//   engine/solver/panelDecomposition.ts (design + profile → Part[])
//   engine/catalogs/profiles.ts       (QORASU_PROFILE — measured, K1 = 1.0mm)
// This adapter is the bridge that lets App-2's Cabinet reach that decomposer, so a
// cabinet is built by the ONE profile-driven function instead of a hardcoded path.
//
// THE LAW (DB/27 §3): this file maps INTENT only — kind, size, has-door,
// shelves/dividers. It writes NO construction (thickness, kromka, groove, placement,
// setback). Those live in the ConstructionProfile and are applied by
// panelDecomposition, NEVER here. There is deliberately no field for them on a node.
//
// ADDITIVE (DB/36 §5): a new, pure, tested function. Nothing existing is changed; the
// live pricing/3D path is untouched. This is the wiring seam, opt-in per call.
//
// SCOPE v1 (honest, documented — expanded later):
//   • shelves + dividers come from the legacy `count`; FRONTS (per-cell doors + drawers, at their
//     own sizes) come from the cut list's own `cutFronts` (the cell tree), so a multi-door or
//     custom-layout cabinet maps all its fronts. Combined-door overlays / nested Components: NOT yet.
//   • DB/39 horizontal bands (2026-08-15 posylka): a wall-run of 2+ BASE cabinets is now
//     grouped under a `run` node whose stoleshnitsa/tsokol bands own the shared worktop +
//     plinth (each cabinet skips them — panelDecomposition sets bandsInScope). Still v1:
//     run ends are assumed CLOSED (wall-abutting — no side overhang); a lone base cabinet
//     keeps hasWorktop:false; open/island-end detection and tall-in-run grouping come later.
//   • free-standing furniture and corner units are skipped.

import type {
  CabinetType,
  ComponentLibraryItem,
  DesignNode,
  DesignProject,
  RoleSlot,
} from "../../../../engine/index.js";
import type { Cabinet, Cell, ComponentRef } from "./cabinet";
import type { MaterialSlots } from "./materials";
import { purposeOf } from "./purposeTags";
import { cabToModule } from "./toProject";
import { cutFronts } from "@mebelchi/pricing";
import { resolveComponent } from "./componentLibrary";

/** How a placed ComponentRef becomes its library item. Default reads the local library (localStorage);
 *  tests inject a pure fake so the adapter stays deterministic and store-free. NEVER auto-advances a
 *  pinned version (that discipline lives in resolveComponent). */
export type ComponentResolver = (ref: ComponentRef) => ComponentLibraryItem | undefined;
const DEFAULT_RESOLVE: ComponentResolver = (ref) => resolveComponent(ref);

/** app cabinet kind → canonical design cabinetType (intent, not construction). */
const KIND_TO_TYPE: Record<Cabinet["kind"], CabinetType> = {
  base: "kitchen_base",
  upper: "kitchen_wall",
  tall: "tall",
};

/** per-kind default depth (mm) — mirrors machining.ts so the two engine paths agree. */
const DEPTH: Record<Cabinet["kind"], number> = { base: 560, tall: 560, upper: 350 };

/** mm (float, UI edge) → mm10 integer (the engine's internal unit; 16mm → 160). */
const mm10 = (mm: number): number => Math.round(mm * 10);

/** Vertical dividers in this cabinet's interior, from the legacy fields the cut list
 *  already derives from. */
function dividerCount(c: Cabinet): number {
  if (c.dividerXs && c.dividerXs.length > 0) return c.dividerXs.length;
  return c.div ? 1 : 0;
}

/** Every ComponentRef bound anywhere in a cell tree (a cell with `component` set, at any nesting
 *  depth — children AND drawer organizers). The order is the placement order the front node-ids key
 *  off, so it is stable. */
function componentRefsIn(cell: Cell | undefined): ComponentRef[] {
  const out: ComponentRef[] = [];
  const walk = (c: Cell): void => {
    if (c.component) out.push(c.component);
    (c.children ?? []).forEach(walk);
    if (c.organizer) walk(c.organizer);
  };
  if (cell) walk(cell);
  return out;
}

/** Deep copy of a component subtree with every nodeId prefixed, so the SAME component placed twice
 *  yields distinct part ids (the panel ids the engine derives key off nodeId). One prefix for the
 *  whole subtree keeps the ids unique per placement while staying unique within it (Forge ids are
 *  already unique inside a component). size/modifiers/roleSlot/kind are carried through untouched. */
function namespaceNode(node: DesignNode, prefix: string): DesignNode {
  return {
    ...node,
    nodeId: `${prefix}:${node.nodeId}`,
    ...(node.children ? { children: node.children.map((c) => namespaceNode(c, prefix)) } : {}),
  };
}

/** ④ decompose wiring — the group roots of the components placed in this cabinet. Each bound
 *  ComponentRef is resolved to its library item; the item's `root` (a NodeKind "group", carrying its
 *  panels + their laminate/viyemka modifiers[]) joins the cabinet as a child, and panelDecomposition's
 *  decomposeGroup turns it into real parts/grooves — DB_37 §4: "panelDecomposition runs fresh on the
 *  instance, same as any other node." An unresolved pin (not in the library) contributes nothing — the
 *  cut list is never fabricated from a missing component.
 *  v1 scope: the component decomposes at its AUTHORED geometry; resizing the instance to its placement
 *  cell (DB_37 §4 mixed-resolution, DB/32 §4.3 "still to be written") is a documented follow-up. */
function componentGroupNodes(mod: ReturnType<typeof cabToModule>, cabId: string, resolve: ComponentResolver): DesignNode[] {
  const out: DesignNode[] = [];
  componentRefsIn(mod.layout).forEach((ref, ci) => {
    const item = resolve(ref);
    if (!item) return;
    out.push(namespaceNode(item.root, `${cabId}:comp${ci}`));
  });
  return out;
}

/** One app Cabinet → one canonical cabinet DesignNode (+ shelf/divider/front children).
 *  `resolve` maps any placed ComponentRef to its library item (default: the local library); its
 *  fronts + modifiers[] join as extra fronts (④ decompose wiring). */
export function cabinetToDesignNode(c: Cabinet, resolve: ComponentResolver = DEFAULT_RESOLVE): DesignNode {
  const shelves = c.fill === "shelves" ? Math.max(0, c.count) : 0;
  const dividers = dividerCount(c);
  const mod = cabToModule(c);
  // FRONTS — the EXACT set the cut list derives (pricing cutFronts, walking the cell tree): per-cell
  // doors AND drawers at their own sizes. A multi-door or custom-layout cabinet now reaches the engine
  // with ALL its fronts, not one. Each is a door/drawer node so panelDecomposition emits one фасад per
  // front (it reads node.children, exactly like shelves). hasDoor stays as the derived intent flag.
  const fronts = cutFronts(mod);
  const hasDoor = fronts.some((f) => f.kind === "door");
  // ④ · library components placed in this cabinet's cells → their group roots (with modifiers[]).
  const compGroups = componentGroupNodes(mod, c.id, resolve);

  const children: DesignNode[] = [];
  for (let i = 0; i < dividers; i++) {
    children.push({ nodeId: `${c.id}:divider:${i}`, kind: "divider" });
  }
  for (let i = 0; i < shelves; i++) {
    children.push({ nodeId: `${c.id}:shelf:${i}`, kind: "shelf" });
  }
  fronts.forEach((f, i) => {
    children.push({
      nodeId: `${c.id}:front:${i}`, kind: f.kind,
      size: { w_mm10: mm10(f.wMm), h_mm10: mm10(f.hMm) },
    });
  });
  children.push(...compGroups);

  const purpose = purposeOf(c);
  return {
    nodeId: c.id,
    kind: "cabinet",
    cabinetType: KIND_TO_TYPE[c.kind],
    size: { w_mm10: mm10(c.w), h_mm10: mm10(c.h), d_mm10: mm10(c.depth ?? DEPTH[c.kind]) },
    hasDoor,
    hasWorktop: false, // v1: worktop is a run-level piece, not per-cabinet (see SCOPE)
    ...(purpose ? { purpose } : {}),
    ...(children.length ? { children } : {}),
  };
}

/** Material slots (A·facade / B·carcass / C·back / W·worktop) → the project's role→material
 *  bindings. Design carries the ROLE; the material id is the project's per-job pick
 *  (CONSTRUCTION_FRAME_v4 §3.2). `stoleshnitsa` (= W group) added with POSYLKA 2026-08-13 /
 *  DB/39: the worktop is its own horizontal BLOCK, so it binds its own material role. */
export function slotBindingsFrom(slots?: MaterialSlots): Record<RoleSlot, string> {
  return {
    fasad: slots?.facade ?? "",
    korpus: slots?.carcass ?? "",
    orqa: slots?.back ?? "",
    stoleshnitsa: slots?.worktop ?? "",
  };
}

/** Base cabinets grouped by wall-run (`c.run`); only runs of 2+ are returned — those that share
 *  ONE worktop + ONE plinth band (DB/39). Exported so the cut list (cncExport) can tell which
 *  cabinets' per-box цоколь the run band now owns, using the SAME grouping the project does. */
export function baseRuns(cabs: Cabinet[]): Cabinet[][] {
  const real = cabs.filter((c) => !c.furniture && !c.corner);
  const byRun = new Map<number, Cabinet[]>();
  for (const c of real) {
    if (c.kind !== "base") continue;
    const r = c.run ?? 0;
    const g = byRun.get(r);
    if (g) g.push(c);
    else byRun.set(r, [c]);
  }
  return [...byRun.values()].filter((g) => g.length >= 2);
}

/** The app's Cabinet run → a canonical DesignProject ready for panelDecomposition.
 *  Free-standing furniture and corner units are skipped (v1 scope). A wall-run of 2+ base
 *  cabinets becomes a `run` node with shared worktop + plinth bands (DB/39); everything else
 *  (a lone base, every upper/tall) stays a standalone node. */
export function toDesignProject(cabs: Cabinet[], slots?: MaterialSlots, resolve: ComponentResolver = DEFAULT_RESOLVE): DesignProject {
  const real = cabs.filter((c) => !c.furniture && !c.corner);
  const nodes: DesignNode[] = [];

  // A wall-run of 2+ base cabinets → one `run` node whose bands own the shared worktop + plinth.
  const grouped = new Set<string>();
  let ri = 0;
  for (const members of baseRuns(cabs)) {
    const rid = `run:${ri++}`;
    const sorted = [...members].sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
    for (const c of sorted) grouped.add(c.id);
    nodes.push({
      nodeId: rid,
      kind: "run",
      ends: { begin: "closed", end: "closed" }, // v1: wall-abutting run, no overhang (see SCOPE)
      children: [
        ...sorted.map((c) => cabinetToDesignNode(c, resolve)),
        { nodeId: `${rid}:stoleshnitsa`, kind: "band", bandRole: "stoleshnitsa", roleSlot: "stoleshnitsa" },
        { nodeId: `${rid}:tsokol`, kind: "band", bandRole: "tsokol", roleSlot: "korpus" },
      ],
    });
  }
  // everything not pulled into a run stays standalone, in original order
  for (const c of real) if (!grouped.has(c.id)) nodes.push(cabinetToDesignNode(c, resolve));

  return { projectId: "app", name: "app", nodes, slotBindings: slotBindingsFrom(slots), overrides: [] };
}
