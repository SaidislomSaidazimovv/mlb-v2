// Focused full-screen "Наполнение" (fill) editor for ONE cabinet — a TOOL-BASED hybrid
// editor. Four tools (like the main toolbar): Draw Lines (add horizontal/vertical
// separators → cells), Move/Resize (drag a separator or the module's edges), Add Doors
// (tap a cell → a door; drag over cells → one combined door), Add Drawers (tap a cell →
// a drawer). A selected door/drawer shows Opening + Handle options up top; a selected item
// shows a delete button. 3D/2D toggle (left) + undo/redo (right). Writes the cab's `layout`.

import { Fragment, useEffect, useRef, useState } from "react";
import { useT } from "../i18n/useT";
import { cabinetLayout, cellSizes, flatten, isLeaf, solveSpans, type Cabinet, type Cell, type CombinedDoor, type ComponentRef, type DivisionRule, type DoorOpening, type FrontProfile, type HandlePos } from "../model/cabinet";
import { maxCabH, MIN_H } from "../model/bands";
import { fmtLen, lenUnitLabel, type LenUnit } from "../model/units";
import { drawerMinMm, maxShelfSpanMm } from "../model/deflection";
import { QORASU_PROFILE } from "../../../../engine/index.js";
import type { KitchenStyle } from "../model/layout";
import { CabinetPreview3D } from "./CabinetPreview3D";
import { OrganizerEditor } from "./OrganizerEditor";
import { IconUndo, IconRedo } from "../components/icons";

interface Props {
  cab: Cabinet;
  index: number;
  name: string;
  style: KitchenStyle;
  patchCab: (i: number, patch: Partial<Cabinet>) => void;
  patchCabLive: (i: number, patch: Partial<Cabinet>) => void;
  beginEdit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** room height (mm) — caps how tall the module can be dragged */
  ceiling: number;
  /** shelf load for the deflection gate (kg/m) — the master-overridable project value
   *  (37_MIN §2.3; founder: "15, but masters can change it"). Defaults to 15. */
  shelfLoadKgPerM?: number;
  onClose: () => void;
  /** EMBEDDED in the V21 studio: drop the full-screen chrome (fixed overlay, header, internal
   *  3D/2D toggle) and just render the tool canvas — the studio owns the header + shows the live
   *  3D above. Edits still write cab.layout, so that 3D updates on every change. */
  embedded?: boolean;
  /** CONTROLLED tool — when the studio's viewport rail owns which tool is active, it passes it here
   *  (and `onToolChange` to receive taps). Absent → the editor keeps its own tool state + toolbar. */
  tool?: Tool;
  onToolChange?: (t: Tool) => void;
  /** embedded: report whether a divider/cell/front is selected, so the host can show its own delete
   *  button, and expose the delete action through `deleteRef` for that button to call. */
  onSelChange?: (hasSel: boolean) => void;
  /** embedded: report the selected SPACE (leaf cell) as its PATH (stable identity) + interior-fraction
   *  rect (fy = Y-up). The 3D host (V21) drives the translucent blue volume from the rect AND round-trips
   *  the path back via `initialSelPath`. null when nothing / a divider is selected. §5. */
  onSpaceSel?: (s: { path: number[]; rect: { fx0: number; fy0: number; fx1: number; fy1: number } } | null) => void;
  /** embedded: the host's currently-selected space PATH — INITIALISES the 2D selection when this
   *  editor mounts (entering 2D), so a space picked in 3D shows highlighted here. Read once, at mount. */
  initialSelPath?: number[] | null;
  /** §5:115 · report the live mm readout during a 2D divider-drag, so the host (V21) shows it in the
   *  SAME fixed top-centre readout strip the 3D drag uses. null on drag end. */
  onReadout?: (s: string | null) => void;
  /** §12.3 · the display unit (см⇄мм) so the 2D readout reads in the same unit as the rest of the app. */
  lenUnit?: LenUnit;
  deleteRef?: { current: (() => void) | null };
}

export type Tool = "draw" | "move" | "door" | "drawer";
const T = 18, PAD = 110, EDGE_STEP = 10, MIN_CELL = 0.12;
// 2D schematic palette = the APP (cool slate + green accent), not warm cream. Doors/drawers/open stay
// distinguishable by cool shade; ACCENT is the app brand green.
const LINE = "#b8c2cf", ACCENT = "#00AC7A", DOORBG = "#dde6f0", DRAWBG = "#d3ddea", OPENBG = "#eef2f7", HANDLE = "#94a3b8";

// ── tool icons (from the user's SVGs) ──
const Ico = ({ d }: { d: string }) => (<svg viewBox="0 0 32 32" width="26" height="26" fill="none"><path d={d} fill="currentColor" /></svg>);
const D_DRAW = "M22 3.58594L17.4785 8.10742L10.7383 10.0352C9.41728 10.3922 8.3715 11.3805 7.9375 12.6855L3.85938 25.2734L5.29297 26.707L6.72656 28.1406L19.3203 24.0605C20.6183 23.6285 21.6069 22.5814 21.9609 21.2734L23.8887 14.5254L28.4141 10L22 3.58594ZM22 6.41406L25.5859 10L23 12.5859L19.4141 9L22 6.41406ZM17.7109 10.125L21.875 14.2891L20.0332 20.7383C19.8512 21.4103 19.3493 21.9422 18.6973 22.1602L7.68945 25.7246L13.4844 19.9297C13.6525 19.9755 13.8258 19.9991 14 20C14.5304 20 15.0391 19.7893 15.4142 19.4142C15.7893 19.0391 16 18.5304 16 18C16 17.4696 15.7893 16.9609 15.4142 16.5858C15.0391 16.2107 14.5304 16 14 16C13.6936 16.0004 13.3914 16.0712 13.1168 16.2069C12.8421 16.3426 12.6023 16.5396 12.4158 16.7827C12.2293 17.0258 12.1012 17.3085 12.0413 17.6089C11.9814 17.9094 11.9913 18.2196 12.0703 18.5156L6.27539 24.3105L9.83789 13.3105C10.0579 12.6495 10.5904 12.1489 11.2754 11.9629L17.7109 10.125Z";
const D_MOVE = "M16 2.58594L11.293 7.29297L12.707 8.70703L15 6.41406V12H17V6.41406L19.293 8.70703L20.707 7.29297L16 2.58594ZM7.29297 11.293L2.58594 16L7.29297 20.707L8.70703 19.293L6.41406 17H13V15H6.41406L8.70703 12.707L7.29297 11.293ZM24.707 11.293L23.293 12.707L25.5859 15H19V17H25.5859L23.293 19.293L24.707 20.707L29.4141 16L24.707 11.293ZM15 19V25.5859L12.707 23.293L11.293 24.707L16 29.4141L20.707 24.707L19.293 23.293L17 25.5859V19H15Z";
const D_DOOR = "M8 5V27H24V5H8ZM10 7H22V25H10V7ZM20 15C19.4492 15 19 15.4492 19 16C19 16.5508 19.4492 17 20 17C20.5508 17 21 16.5508 21 16C21 15.4492 20.5508 15 20 15Z";
const D_DRAWER = "M5 5V27H27V5H5ZM7 7H25V15H7V7ZM13 9V11H19V9H13ZM7 17H25V25H7V17ZM13 19V21H19V19H13Z";

// ── cell-tree ops (cells addressed by a path of child indices) ──
const getCell = (root: Cell, p: number[]): Cell => { let c = root; for (const i of p) c = c.children![i]; return c; };
const replaceCell = (root: Cell, p: number[], fn: (c: Cell) => Cell): Cell => {
  if (p.length === 0) return fn(root);
  const [i, ...rest] = p;
  return { ...root, children: root.children!.map((ch, k) => (k === i ? replaceCell(ch, rest, fn) : ch)) };
};
const editorLeaf = (c: Cell) => !!c.front || isLeaf(c); // a front-node is opaque in the editor
const samePath = (a: number[] | null | undefined, b: number[]) => !!a && a.length === b.length && a.every((v, i) => v === b[i]);
const deleteAt = (root: Cell, p: number[]): Cell => {
  if (p.length === 0) return {};
  const idx = p[p.length - 1];
  return replaceCell(root, p.slice(0, -1), (par) => {
    const children = par.children!.filter((_, k) => k !== idx);
    if (children.length === 1) return children[0];
    const sizes = cellSizes(par).filter((_, k) => k !== idx);
    const tot = sizes.reduce((a, b) => a + b, 0) || 1;
    return { ...par, children, sizes: sizes.map((s) => s / tot) };
  });
};
const deleteDivider = (root: Cell, parentPath: number[], i: number): Cell =>
  replaceCell(root, parentPath, (par) => {
    const children = par.children!.filter((_, k) => k !== i + 1); // merge i+1 into i
    if (children.length === 1) return children[0];
    const s = cellSizes(par);
    const sizes = s.filter((_, k) => k !== i + 1).map((v, k) => (k === i ? v + s[i + 1] : v));
    return { ...par, children, sizes };
  });

// ── division rules (§4 CONSTRUCTION_FRAME_v4): per-zone Fixed / Ratio / Locked / Flex ──
// A split's rules: its own `rules` if set, else DERIVED from `sizes` as ratio weights (equal
// split → all 1s) so the pill row always has a value. A plain sizes-split reads as all-Ratio —
// which is what it is; nothing invented. Same guard the engine's walkInterior uses (length === n).
const rulesForSplit = (cell: Cell): DivisionRule[] => {
  const n = cell.children?.length ?? 0;
  if (cell.rules && cell.rules.length === n) return cell.rules;
  return cellSizes(cell).map((f) => ({ kind: "ratio" as const, weight: Math.round(f * n * 100) / 100 }));
};
// Switching a zone's rule KIND keeps its current number where it still makes sense.
const asKind = (kind: DivisionRule["kind"], prev: DivisionRule): DivisionRule => {
  if (kind === "flex") return { kind: "flex" };
  if (kind === "ratio") return { kind: "ratio", weight: prev.kind === "ratio" ? prev.weight : 1 };
  const mm = prev.kind === "fixed" || prev.kind === "locked" ? prev.mm : 100;
  return kind === "fixed" ? { kind: "fixed", mm } : { kind: "locked", mm };
};
// Effective child fractions for the 2D — honours the rules EXACTLY like the engine's walkInterior
// (solveSpans → normalise), else the plain `sizes`. `ref` = the split axis' mm span, so the 2D,
// the 3D and the price all place a Fixed/Locked zone at the same spot. No rules → identical to before.
const effFractions = (cell: Cell, ref: number): number[] => {
  const n = cell.children?.length ?? 0;
  if (cell.rules && cell.rules.length === n) {
    const mm = solveSpans(ref, cell.rules);
    const tot = mm.reduce((a, b) => a + b, 0) || 1;
    return mm.map((v) => v / tot);
  }
  return cellSizes(cell);
};

export interface Leaf { cell: Cell; path: number[]; fx0: number; fy0: number; fx1: number; fy1: number; }
interface Div { parent: number[]; i: number; split: "rows" | "cols"; pfx0: number; pfy0: number; pfx1: number; pfy1: number; sizes: number[]; af: number; b0: number; b1: number; }
function layoutTree(root: Cell, Wmm: number, Hmm: number): { leaves: Leaf[]; divs: Div[] } {
  const leaves: Leaf[] = [], divs: Div[] = [];
  const walk = (cell: Cell, path: number[], fx0: number, fy0: number, fx1: number, fy1: number) => {
    if (editorLeaf(cell)) { leaves.push({ cell, path, fx0, fy0, fx1, fy1 }); return; }
    // ref = the split axis' mm span, so effFractions can solve Fixed/Locked mm against it (§4).
    const ref = cell.split === "rows" ? (fy1 - fy0) * Hmm : (fx1 - fx0) * Wmm;
    const sizes = effFractions(cell, ref);
    let acc = 0;
    for (let i = 0; i < cell.children!.length; i++) {
      const f = sizes[i];
      if (cell.split === "rows") walk(cell.children![i], [...path, i], fx0, fy0 + (fy1 - fy0) * acc, fx1, fy0 + (fy1 - fy0) * (acc + f));
      else walk(cell.children![i], [...path, i], fx0 + (fx1 - fx0) * acc, fy0, fx0 + (fx1 - fx0) * (acc + f), fy1);
      acc += f;
      if (i < cell.children!.length - 1) divs.push(cell.split === "rows"
        ? { parent: path, i, split: "rows", pfx0: fx0, pfy0: fy0, pfx1: fx1, pfy1: fy1, sizes, af: fy0 + (fy1 - fy0) * acc, b0: fx0, b1: fx1 }
        : { parent: path, i, split: "cols", pfx0: fx0, pfy0: fy0, pfx1: fx1, pfy1: fy1, sizes, af: fx0 + (fx1 - fx0) * acc, b0: fy0, b1: fy1 });
    }
  };
  walk(root, [], 0, 0, 1, 1);
  return { leaves, divs };
}

/** The interior SPACES (leaf cells) of a cabinet, each with its rect in interior FRACTIONS
 *  (0..1, fy = Y-up so fy1 = TOP). Goes through the SAME flatten → layoutTree pipeline the 2D
 *  editor uses, so a 3D host (V21 §5 space-select) gets byte-identical leaves — no divergence.
 *  Reads cab.layout; stores nothing. */
export function leavesForCab(cab: Cabinet): Leaf[] {
  return layoutTree(flatten(cabinetLayout(cab)), cab.w, cab.h).leaves;
}

/** ALL fronts (Дверь/Ящик) at EVERY depth — INCLUDING a drawer/door nested behind another front, which
 *  `leavesForCab` (editorLeaf) stops at. Same flatten + effFractions pipeline, so each front's `path` is the
 *  SAME one kitchen3d tags its mesh subgroup with → a 3D click on a revealed inner drawer resolves to its
 *  `${kind}@${path}` group. Interior-fraction rects (fy up). */
export function allFrontsForCab(cab: Cabinet): { kind: "door" | "drawer"; path: number[]; fx0: number; fy0: number; fx1: number; fy1: number }[] {
  const out: { kind: "door" | "drawer"; path: number[]; fx0: number; fy0: number; fx1: number; fy1: number }[] = [];
  const walk = (cell: Cell, path: number[], fx0: number, fy0: number, fx1: number, fy1: number) => {
    if (cell.front) out.push({ kind: cell.front, path, fx0, fy0, fx1, fy1 });
    if (cell.children?.length) {
      const ref = cell.split === "rows" ? (fy1 - fy0) * cab.h : (fx1 - fx0) * cab.w;
      const sizes = effFractions(cell, ref);
      let acc = 0;
      for (let i = 0; i < cell.children.length; i++) {
        const f = sizes[i] ?? 1 / cell.children.length;
        if (cell.split === "rows") walk(cell.children[i]!, [...path, i], fx0, fy0 + (fy1 - fy0) * acc, fx1, fy0 + (fy1 - fy0) * (acc + f));
        else walk(cell.children[i]!, [...path, i], fx0 + (fx1 - fx0) * acc, fy0, fx0 + (fx1 - fx0) * (acc + f), fy1);
        acc += f;
      }
    }
  };
  walk(flatten(cabinetLayout(cab)), [], 0, 0, 1, 1);
  return out;
}

/** The interior DIVIDERS of a cabinet — a "rows" split makes a horizontal SHELF (Полка), a "cols"
 *  split makes a vertical divider / STOYKA (Стойка). Each carries its boundary fraction `af` and its
 *  span `b0..b1` (both in full-interior 0..1, matching the 3D's buildInterior). Same flatten →
 *  layoutTree pipeline as the 2D + the space leaves, so the 3D host's pick-slabs can't drift. */
export function interiorDivsForCab(cab: Cabinet): { kind: "shelf" | "vertical"; parent: number[]; i: number; af: number; b0: number; b1: number; pfx0: number; pfy0: number; pfx1: number; pfy1: number }[] {
  return layoutTree(flatten(cabinetLayout(cab)), cab.w, cab.h).divs.map((d) => ({
    kind: d.split === "rows" ? "shelf" : "vertical", parent: d.parent, i: d.i, af: d.af, b0: d.b0, b1: d.b1,
    pfx0: d.pfx0, pfy0: d.pfy0, pfx1: d.pfx1, pfy1: d.pfy1,
  }));
}

/** §342 · move a division boundary — the ONE Line-move both the 2D divider-drag and the 3D
 *  space-resize (§342 "you move the Line that bounds the Space") use, so they can't diverge. Moves
 *  boundary `i` of `parentPath` to `boundaryFrac` (0..1 within the parent's span); `refMm` = that
 *  span in mm (for Fixed/Locked rule mm). Reweights the split's rules so the move STICKS (Ratio↔Ratio
 *  exact, pair total kept; Fixed/Locked take their new mm; Flex absorbs), else plain sizes. Returns
 *  the new layout + the boundary's resulting position (0..1 within the parent). */
export function moveDivider(root: Cell, parentPath: number[], i: number, boundaryFrac: number, refMm: number): { layout: Cell; pos: number } {
  const parentCell = getCell(root, parentPath);
  const sizes0 = effFractions(parentCell, refMm);
  const before = sizes0.slice(0, i).reduce((a, b) => a + b, 0);
  const pair = sizes0[i] + sizes0[i + 1];
  const si = Math.max(MIN_CELL, Math.min(pair - MIN_CELL, boundaryFrac - before));
  const sizes = sizes0.map((s, k) => (k === i ? si : k === i + 1 ? pair - si : s));
  const ruled = !!parentCell.rules && parentCell.rules.length === sizes0.length;
  const layout = replaceCell(root, parentPath, (p) => {
    if (!ruled) return { ...p, sizes };
    const rules = parentCell.rules!;
    const ri = rules[i], rj = rules[i + 1];
    const bothRatio = ri.kind === "ratio" && rj.kind === "ratio";
    const wPair = (ri.kind === "ratio" ? ri.weight : 0) + (rj.kind === "ratio" ? rj.weight : 0);
    const reRule = (r: DivisionRule, fr: number): DivisionRule =>
      r.kind === "fixed" || r.kind === "locked" ? { kind: r.kind, mm: Math.round(fr * refMm) }
      : r.kind === "ratio" ? { kind: "ratio", weight: bothRatio ? Math.round((wPair * fr) / pair * 1000) / 1000 : r.weight }
      : r;
    const nextRules = rules.map((r, k) => (k === i ? reRule(ri, si) : k === i + 1 ? reRule(rj, pair - si) : r));
    return { ...p, rules: nextRules, sizes };
  });
  return { layout, pos: before + si };
}

/** The interior layout flattened the SAME way the 2D editor + `interiorDivsForCab` use it — so a 3D
 *  host feeds `moveDivider` the same root the divider parent-paths refer to. Reads cab.layout only. */
export function flattenedLayout(cab: Cabinet): Cell {
  return flatten(cabinetLayout(cab));
}

/** §5:106 · magnetic snap — snap a dragged Line's target boundary (a full-interior fraction 0..1) to
 *  the nearest OTHER Line on the same axis, or an interior edge (0/1), within a catch band. Mirrors
 *  the 2D editor's `snapTo`/`gridX`/`gridY` (same 0.045 band) so 2D + 3D magnetise to the same edges.
 *  Excludes the Line being dragged (its own current position). Reads geometry only. */
export function snapLineFraction(cab: Cabinet, axis: "rows" | "cols", targetAf: number, excludeParent: number[], excludeI: number, band = 0.045): number {
  const lines = [0, 1]; // interior edges
  for (const d of interiorDivsForCab(cab)) {
    const sameAxis = axis === "rows" ? d.kind === "shelf" : d.kind === "vertical";
    if (sameAxis && !(samePath(excludeParent, d.parent) && excludeI === d.i)) lines.push(d.af);
  }
  let best = targetAf, bd = band;
  for (const l of lines) { const dd = Math.abs(targetAf - l); if (dd < bd) { bd = dd; best = l; } }
  return best;
}

/** §5:113 · DELETE a selected part GROUP (the only ⋯ action that's app-layer; the rest need a
 *  Component / persisted field = founder-gated). Divider group: one member → merge its two cells
 *  (deleteDivider, keeps content); 2+ → collapse the whole split to one open cell. Front group: strip
 *  the fronts (cells stay open). Combined door: drop it. Carcass (no "@") → null (not deletable). */
export function deletePartGroup(cab: Cabinet, group: string): { layout: Cell; combinedDoors?: CombinedDoor[] } | null {
  const at = group.indexOf("@");
  if (at < 0) return null; // carcass shell — an envelope box, not a Cell node
  const role = group.slice(0, at), key = group.slice(at + 1);
  const root = flatten(cabinetLayout(cab));
  if (role === "shelf" || role === "divider") {
    const mine = interiorDivsForCab(cab).filter((d) => `${d.kind === "shelf" ? "shelf" : "divider"}@${d.parent.join(".")}` === group);
    if (mine.length === 1) return { layout: flatten(deleteDivider(root, mine[0].parent, mine[0].i)) };
    const parentPath = key === "" ? [] : key.split(".").map(Number);
    return { layout: flatten(replaceCell(root, parentPath, () => ({}))) };
  }
  if (role === "door" || role === "drawer") {
    const cds = cab.combinedDoors ?? [];
    if (key.startsWith("cd")) return { layout: root, combinedDoors: cds.filter((_, i) => i !== Number(key.slice(2))) };
    let next = root;
    for (const l of layoutTree(root, cab.w, cab.h).leaves)
      if (l.cell.front && l.path.join(".") === key) // full path → strip THIS ONE front (individual, v9 model)
        next = replaceCell(next, l.path, (c) => { const { front: _f, opening: _o, handle: _h, ...rest } = c; void _f; void _o; void _h; return rest; });
    return { layout: next };
  }
  if (role === "component") {
    // Remove a placed library component: empty its cell (drop the `component` binding + anything under it).
    // The compartment stays — the master keeps the space; only the component instance is gone.
    const path = key === "" ? [] : key.split(".").map(Number);
    return { layout: flatten(replaceCell(root, path, () => ({}))) };
  }
  return null;
}

/** PER-CELL фасад · set the front profile (Стекло/Шейкер…) on the ONE front identified by a 3D-selection
 *  `group` (`door@path` / `drawer@path`). Same group→path match as deletePartGroup; only this front's
 *  `frontProfile` is written. Returns null for a carcass part or a non-front. */
export function setPartFrontProfile(cab: Cabinet, group: string, profile: FrontProfile): { layout: Cell } | null {
  const at = group.indexOf("@");
  if (at < 0) return null;
  const role = group.slice(0, at), key = group.slice(at + 1);
  if (role !== "door" && role !== "drawer") return null;
  const root = flatten(cabinetLayout(cab));
  let next = root, hit = false;
  for (const l of layoutTree(root, cab.w, cab.h).leaves)
    if (l.cell.front && l.path.join(".") === key) { next = replaceCell(next, l.path, (c) => ({ ...c, frontProfile: profile })); hit = true; }
  return hit ? { layout: flatten(next) } : null;
}

/** The current per-cell фасад of the front at `group` (or undefined → the module default applies). */
export function partFrontProfile(cab: Cabinet, group: string): FrontProfile | undefined {
  const at = group.indexOf("@");
  if (at < 0) return undefined;
  const key = group.slice(at + 1);
  const root = flatten(cabinetLayout(cab));
  for (const l of layoutTree(root, cab.w, cab.h).leaves)
    if (l.cell.front && l.path.join(".") === key) return l.cell.frontProfile;
  return undefined;
}

/** §10.4 · ACCEPT a newer component version on the selected placement (`component@path`): re-pin its
 *  `pinnedVersion` to `newVersion`. The ONLY thing that advances a pin — never automatic. The decompose
 *  path then resolves the new version's parts (a new cut-list) on the next solve. */
export function acceptComponentUpdate(cab: Cabinet, group: string, newVersion: number): { layout: Cell } | null {
  const at = group.indexOf("@");
  if (at < 0) return null;
  const key = group.slice(at + 1);
  const root = flatten(cabinetLayout(cab));
  let next = root, hit = false;
  for (const l of layoutTree(root, cab.w, cab.h).leaves)
    if (l.cell.component && l.path.join(".") === key) { next = replaceCell(next, l.path, (c) => (c.component ? { ...c, component: { ...c.component, pinnedVersion: newVersion } } : c)); hit = true; }
  return hit ? { layout: flatten(next) } : null;
}

/** §B4/§B5 · ОТВЯЗАТЬ (detach) — drop a front's link to its library Component. Figma-detach semantics
 *  (`design.ts:63,94` «no `component` = detached, ordinary subtree» · README §1 «Разкомпонентить = detach»):
 *  the subtree STAYS — nothing is deleted, only the tracking pointer is removed.
 *  • B4 (SHALLOW): detach ONLY this node; nested bound children stay bound — their count is returned so the
 *    UI can show «внутри: N связанных».
 *  • B5: if the node is a member of a RATIO division it leaves the ratio → its parent rule becomes `fixed`
 *    at its current mm, so the remaining siblings redistribute (solveSpans) and the geometry doesn't shift.
 *  Carcass (no "@") or a node that carries no `component` → null (nothing to detach). */
export function detachPartGroup(cab: Cabinet, group: string): { layout: Cell; boundInner: number } | null {
  const at = group.indexOf("@");
  if (at < 0) return null; // carcass shell — not a Cell node
  const key = group.slice(at + 1);
  const path = key === "" ? [] : key.split(".").map(Number);
  const root = flatten(cabinetLayout(cab));
  const cellAt = (tree: Cell, p: number[]): Cell | null => { let c: Cell | undefined = tree; for (const idx of p) c = c?.children?.[idx]; return c ?? null; };
  const target = cellAt(root, path);
  if (!target || !target.component) return null; // nothing bound here
  // B4 · count nested bound components (they STAY bound — the detach is shallow)
  let boundInner = 0;
  const countBound = (c: Cell) => { for (const ch of c.children ?? []) { if (ch.component) boundInner++; countBound(ch); } };
  countBound(target);
  // B4 · strip ONLY this node's `component`
  let next = replaceCell(root, path, (c) => { const { component: _c, ...rest } = c; void _c; return rest; });
  // B5 · leave the ratio group → pin the parent rule to fixed(current mm); siblings redistribute
  if (path.length) {
    const parentPath = path.slice(0, -1), i = path[path.length - 1];
    const parent = cellAt(root, parentPath);
    if (parent?.children?.length) {
      const rules = rulesForSplit(parent);
      const d = layoutTree(next, cab.w, cab.h).divs.find((x) => samePath(x.parent, parentPath));
      const ref = d ? (d.split === "rows" ? (d.pfy1 - d.pfy0) * cab.h : (d.pfx1 - d.pfx0) * cab.w) : 0;
      if (ref > 0 && rules[i]?.kind === "ratio") {
        const mm = solveSpans(ref, rules)[i] ?? 0;
        const pinned: DivisionRule[] = rules.map((r, j) => (j === i ? { kind: "fixed" as const, mm: Math.round(mm) } : r));
        next = replaceCell(next, parentPath, (c) => ({ ...c, rules: pinned }));
      }
    }
  }
  return { layout: next, boundInner };
}

/** §Дублировать · duplicate a selected FRONT (Дверь/Ящик). The cell's OWN slot splits into two equal
 *  halves, each a deep VALUE-copy of the front subtree (§10.2 «joylashtirish = qiymat nusxa» — a copy, not
 *  a live link). The split runs in the PARENT's direction so `flatten` folds it back into the parent → "1
 *  drawer becomes 2" filling the same space, the siblings untouched. A bound copy stays a legitimate 2nd
 *  instance of the same Component (design.ts:108). Not a front → null. */
export function duplicatePartGroup(cab: Cabinet, group: string): { layout: Cell } | null {
  const at = group.indexOf("@");
  if (at < 0) return null; // carcass shell — not a Cell node
  const role = group.slice(0, at), key = group.slice(at + 1);
  if (role !== "door" && role !== "drawer") return null; // only fronts duplicate (clear semantics)
  const path = key === "" ? [] : key.split(".").map(Number);
  const root = flatten(cabinetLayout(cab));
  const cellAt = (p: number[]): Cell | null => { let c: Cell | undefined = root; for (const idx of p) c = c?.children?.[idx]; return c ?? null; };
  const cell = cellAt(path);
  if (!cell || !cell.front) return null;
  const dir: "rows" | "cols" = (path.length ? cellAt(path.slice(0, -1)) : null)?.split ?? "rows";
  const clone = (c: Cell): Cell => JSON.parse(JSON.stringify(c)) as Cell; // §10.2 value copy — Cell is plain data
  const next = replaceCell(root, path, (c) => ({ split: dir, sizes: [0.5, 0.5], children: [clone(c), clone(c)] }));
  return { layout: flatten(next) };
}

/** §5:103/§4:91 · ADD a divider — split cell `path` along `dir` at `frac` (a Полка = "rows", a Стойка
 *  = "cols"). Same writer the 2D draw-tool uses (FillEditor onUp), so 2D + 3D tap-to-place can't drift.
 *  `frac` is clamped to a sane min cell. Returns the new (flattened) layout. */
export function splitCellAt(cab: Cabinet, path: number[], dir: "rows" | "cols", frac: number): Cell {
  const pos = Math.max(0.12, Math.min(0.88, frac));
  return flatten(replaceCell(flatten(cabinetLayout(cab)), path, () => ({ split: dir, sizes: [pos, 1 - pos], children: [{}, {}] })));
}

/** §5:103 · ADD a front (Дверь / Ящик) onto cell `path` — same writer the 2D door/drawer tools use. */
export function setCellFront(cab: Cabinet, path: number[], front: "door" | "drawer"): Cell {
  return replaceCell(flatten(cabinetLayout(cab)), path, () => (front === "drawer" ? { front: "drawer", handle: "top" } : { front: "door", opening: "left", handle: "right" }));
}

/** §A/§B AUTHORING · add INNER content (ички Ящик / Полка) to a cell that ALREADY carries an outer front
 *  (Дверь/Ящик), WITHOUT dropping that front — the door-with-inner-drawers / nested-drawer the model always
 *  supported (demo §A/§B) but no writer created. The outer front stays an opaque editor-leaf (§84), so the
 *  cell stays selected and you keep adding. Each «Ящик» press appends one inner drawer; «Полка» adds one
 *  open compartment (a shelf appears between two). Structural — not the cutlery-tray `organizer` (that's a
 *  drawer-floor top-view). Pure App-2 (schema `Cell` already allows front+children; no engine contract). */
export function addInnerContent(cab: Cabinet, path: number[], kind: "drawer" | "shelf"): Cell {
  const root = flatten(cabinetLayout(cab));
  return flatten(replaceCell(root, path, (c) => {
    if (!c.front) return c; // guard: only a cell that carries an outer front can nest inside
    const existing = c.split === "rows" && c.children ? c.children : [];
    const kids: Cell[] = kind === "drawer"
      ? [...existing, { front: "drawer", handle: "top" }]
      : [...(existing.length ? existing : [{}]), {}]; // seed 2 open cells (=1 shelf) from empty, else +1
    const n = kids.length;
    return { ...c, split: "rows", sizes: kids.map(() => 1 / n), children: kids };
  }));
}

// ── E2 · swipe-cycle a section's content (DB/19 §C:70 + §5:170, founder «one gesture = one meaning») ──
/** The library variants a swipe cycles a selected section through. FOUNDER SET (§C:70): полка×N · тортма ·
 *  door · niche · rod · appliance · corner. v1 = the subset App-2 supports today (rod/appliance/corner
 *  are cabinet-level, model-work for v2). ORDER founder-confirmed 2026-08-27: Открытый→Дверь→Ящик→Полки. */
export type SectionVariant = "open" | "door" | "drawer" | "shelves";
export const CONTENT_CYCLE: SectionVariant[] = ["open", "door", "drawer", "shelves"];

/** A leaf's current content variant, or null when it is a CUSTOM structure we must not blow away by
 *  cycling: a bound component, a door/drawer WITH inner content, a cols-split (Стойка), or a rows-split
 *  that is not uniform open shelves (e.g. a drawer-stack). Protects §A/§B nested work from a stray swipe. */
export function cellVariant(cell: Cell): SectionVariant | null {
  if (cell.component) return null;
  const kids = cell.children ?? [];
  const hasKids = kids.length > 0;
  if (cell.front === "door" && !hasKids) return "door";
  if (cell.front === "drawer" && !hasKids) return "drawer";
  if (!cell.front && !hasKids) return "open";
  if (!cell.front && cell.split === "rows" && hasKids && kids.every((c) => !c.front && !c.children && !c.component)) return "shelves";
  return null;
}

/** A fresh leaf for a variant — the SAME shapes setCellFront/splitCellAt (the draw tool) produce. */
function variantCell(v: SectionVariant): Cell {
  switch (v) {
    case "door": return { front: "door", opening: "left", handle: "right" };
    case "drawer": return { front: "drawer", handle: "top" };
    case "shelves": return { split: "rows", sizes: [0.5, 0.5], children: [{}, {}] };
    default: return {};
  }
}

/** DB/19 §5:170 — swipe a selected section to the NEXT (dir +1) / PREV (dir −1) library variant, wrapping.
 *  Only the section's TYPE cycles; shelf/drawer COUNT stays a drag (Ring-0). Returns the new layout, or
 *  null when the cell is not a clean cyclable variant (see cellVariant) — the caller then does nothing. */
export function cycleCellContent(cab: Cabinet, path: number[], dir: 1 | -1): Cell | null {
  const root = flatten(cabinetLayout(cab));
  const v = cellVariant(getCell(root, path));
  if (v == null) return null;
  const i = CONTENT_CYCLE.indexOf(v);
  const next = CONTENT_CYCLE[(i + dir + CONTENT_CYCLE.length) % CONTENT_CYCLE.length]!;
  return replaceCell(root, path, () => variantCell(next));
}

/** Bind a library component to the tapped cell (drag-drop placement, DB_37 §4 / 37_MIN §295 "the master
 *  drags this Component into their own project"): the cell BECOMES this component instance — its own
 *  fronts/splits are replaced by the binding (decomposeGroup then owns its interior). */
export function setCellComponent(cab: Cabinet, path: number[], ref: ComponentRef): Cell {
  return replaceCell(flatten(cabinetLayout(cab)), path, () => ({ component: ref }));
}

type Sel = { kind: "cell"; path: number[] } | { kind: "div"; parent: number[]; i: number } | { kind: "cdoor"; idx: number } | null;
const rectsOverlap = (a: { fx0: number; fy0: number; fx1: number; fy1: number }, b: { fx0: number; fy0: number; fx1: number; fy1: number }) => a.fx0 < b.fx1 - 1e-4 && a.fx1 > b.fx0 + 1e-4 && a.fy0 < b.fy1 - 1e-4 && a.fy1 > b.fy0 + 1e-4;
type Drag =
  | { kind: "draw"; path: number[]; fx0: number; fy0: number; fx1: number; fy1: number; x0: number; y0: number; dir: "rows" | "cols"; af: number; moved: boolean }
  | { kind: "front"; front: "door" | "drawer"; x0: number; y0: number; covered: number[][]; moved: boolean }
  | { kind: "div"; d: Div; origCds: CombinedDoor[]; moved: boolean }
  | { kind: "cedge"; idx: number; edge: "l" | "r" | "t" | "b"; moved: boolean }
  | { kind: "edge"; edge: "top" | "right"; downX: number; downY: number; base: number; mmPerPx: number; moved: boolean }
  | { kind: "swipe"; path: number[]; downX: number; dx: number }; // E2 · DB/19 §5:170 swipe-cycle content

const SWIPE_MIN_PX = 32; // horizontal travel that turns a move-mode drag into an E2 content-cycle swipe
const VARIANT_RU: Record<SectionVariant, string> = { open: "Открытый", door: "Дверь", drawer: "Ящик", shelves: "Полки" };

// small dropdown for the door/drawer option bar
function Dropdown({ label, value, options, optLabel, btnLabel, onPick }: { label: string; value: string; options: string[]; optLabel: (v: string) => string; btnLabel?: (v: string) => string; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fe-dd">
      {label && <span className="fe-dd-lbl">{label}</span>}
      <button className="fe-dd-btn" onClick={() => setOpen((o) => !o)} type="button">{(btnLabel ?? optLabel)(value)}<span className="fe-dd-ch">▾</span></button>
      {open && <div className="fe-dd-menu">{options.map((o) => <button key={o} className={o === value ? "sel" : ""} onClick={() => { onPick(o); setOpen(false); }} type="button">{optLabel(o)}</button>)}</div>}
    </div>
  );
}

export function FillEditor({ cab, index, name, style, patchCab, patchCabLive, beginEdit, undo, redo, canUndo, canRedo, ceiling, shelfLoadKgPerM = 15, onClose, embedded, tool: ctrlTool, onToolChange, onSelChange, onSpaceSel, initialSelPath, onReadout, lenUnit = "mm", deleteRef }: Props) {
  const t = useT();
  const [view3d, setView3d] = useState(false);
  const show3d = view3d && !embedded; // the studio shows its own live 3D above — force the 2D canvas here
  // the active tool can be OWNED by the studio (its viewport rail drives it) or, standalone, by us.
  const [toolInner, setToolInner] = useState<Tool>("draw"); // default = draw (CONSTRUCTION_FRAME_v4:91 «Space-select → «Полка» tool → tap» is the operative add-model; DB/19 §5 tool-less is a v0 DRAFT). «move» mode still carries the locked verbs (Choose=swipe / Swap=tap-cycle, 10_UI_PRINCIPLES §2).
  const tool = ctrlTool ?? toolInner;
  // §5 · initialise from the host's space selection so a cell picked in 3D shows highlighted on the
  // 2D entry (the 3D↔2D round-trip). Read once at mount — the editor remounts on every 2D switch.
  const [sel, setSel] = useState<Sel>(() => (embedded && initialSelPath ? { kind: "cell", path: initialSelPath } : null));
  const [preview, setPreview] = useState<React.ReactNode>(null);
  const [orgOpen, setOrgOpen] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pickerZone, setPickerZone] = useState<number | null>(null); // which zone's rule-kind picker is open (§4 long-press)
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null); // long-press timer: hold a pill → rule picker
  const pickTool = (k: Tool) => {
    (onToolChange ?? setToolInner)(k); setSel(null);
    setTip((t.fe.tip as Record<string, string>)[k]);
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(null), 3500);
  };
  // when the studio switches the tool, drop any stale selection so the new tool starts clean
  useEffect(() => { if (ctrlTool !== undefined) setSel(null); }, [ctrlTool]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const W = cab.w, H = cab.h;
  const interiorW = W - 2 * T, interiorH = H - 2 * T;
  const vbW = W + PAD * 2, vbH = H + PAD * 2;
  const zvbW = vbW / zoom, zvbH = vbH / zoom;
  const x0 = PAD + T, y0 = PAD + T, iw = W - 2 * T, ih = H - 2 * T;

  const root = flatten(cabinetLayout(cab)); // always a flat tree → siblings, no nesting bug
  const cds = cab.combinedDoors ?? [];
  const { leaves, divs } = layoutTree(root, W, H);
  const selCell = sel?.kind === "cell" && leaves.find((l) => samePath(sel.path, l.path)) ? getCell(root, sel.path) : null;
  // the selected SPACE's leaf carries its interior rect (fractions) — reported to the 3D host for §5's blue volume.
  const selLeaf = sel?.kind === "cell" ? leaves.find((l) => samePath(sel.path, l.path)) : undefined;
  const selCd = sel?.kind === "cdoor" && cds[sel.idx] ? cds[sel.idx] : null;
  // grid lines (for snapping a door edge) + is a separator behind a combined door (dashed)
  const gridX = [0, 1, ...divs.filter((d) => d.split === "cols").map((d) => d.af)];
  const gridY = [0, 1, ...divs.filter((d) => d.split === "rows").map((d) => d.af)];
  const snapTo = (v: number, lines: number[]) => { let best = v, bd = 0.045; for (const l of lines) { const dd = Math.abs(v - l); if (dd < bd) { bd = dd; best = l; } } return best; };
  const behindDoor = (dv: Div) => cds.some((cd) => dv.split === "rows"
    ? dv.af > cd.fy0 + 1e-3 && dv.af < cd.fy1 - 1e-3 && dv.b0 < cd.fx1 - 1e-3 && dv.b1 > cd.fx0 + 1e-3
    : dv.af > cd.fx0 + 1e-3 && dv.af < cd.fx1 - 1e-3 && dv.b0 < cd.fy1 - 1e-3 && dv.b1 > cd.fy0 + 1e-3);

  const svgX = (fx: number) => x0 + iw * fx;
  const svgY = (fy: number) => y0 + ih * (1 - fy);
  const fracFromEvent = (cx: number, cy: number) => {
    const m = svgRef.current?.getScreenCTM();
    if (!svgRef.current || !m) return null;
    const p = svgRef.current.createSVGPoint(); p.x = cx; p.y = cy;
    const q = p.matrixTransform(m.inverse());
    return { xf: (q.x - x0) / iw, yf: 1 - (q.y - y0) / ih };
  };
  const commit = (next: Cell, live = false) => (live ? patchCabLive : patchCab)(index, { layout: next });
  const optLabel = (v: string) => (t.fe.opt as Record<string, string>)[v] ?? v;

  // ── E3b · section MULTI-SELECT (DB/19 §B:63 / §5:171): long-press a section → enter; tap → add/remove;
  // then a group action (content-cycle) applies to ALL. Keys are dot-joined cell paths. ──
  const [multiSel, setMultiSel] = useState<Set<string>>(() => new Set());
  const multiSelRef = useRef(multiSel);
  useEffect(() => { multiSelRef.current = multiSel; }, [multiSel]);
  const lpCellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpFired = useRef(false);
  const mkey = (p: number[]) => p.join(".");
  const toggleMulti = (path: number[]) => setMultiSel((s) => { const n = new Set(s); const k = mkey(path); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const cycleMulti = (dir: 1 | -1) => {
    let layout = flatten(cabinetLayout(cab)); let changed = false;
    for (const k of multiSel) { const path = k === "" ? [] : k.split(".").map(Number); const next = cycleCellContent({ ...cab, layout } as Cabinet, path, dir); if (next) { layout = next; changed = true; } }
    if (changed) commit(layout);
  };

  // ── 2D zoom (like 3D): scale the SVG viewBox. getScreenCTM (fracFromEvent) already reads the live
  // viewBox, so tapping/dragging stays correct at any zoom. Wheel zooms toward the cursor; buttons centre. ──
  const clampPan = (px: number, py: number, w: number, h: number) => ({ x: Math.max(0, Math.min(vbW - w, px)), y: Math.max(0, Math.min(vbH - h, py)) });
  const zoomTo = (nz: number, cx?: number, cy?: number) => {
    nz = Math.max(1, Math.min(6, nz));
    let sx = pan.x + zvbW / 2, sy = pan.y + zvbH / 2; // default anchor = view centre (buttons)
    const m = svgRef.current?.getScreenCTM();
    if (m && svgRef.current && cx != null && cy != null) {
      const p = svgRef.current.createSVGPoint(); p.x = cx; p.y = cy;
      const q = p.matrixTransform(m.inverse()); sx = q.x; sy = q.y;
    }
    const nw = vbW / nz, nh = vbH / nz;
    const np = clampPan(sx - (sx - pan.x) * (nw / zvbW), sy - (sy - pan.y) * (nh / zvbH), nw, nh);
    setZoom(nz); setPan(np);
  };
  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); zoomTo(zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); };
  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // ── gestures ──
  const preventTouch = (e: TouchEvent) => e.preventDefault();
  const detach = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("touchmove", preventTouch); };
  const onMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "swipe") { d.dx = e.clientX - d.downX; if (Math.abs(d.dx) > 6 && lpCellTimer.current) { clearTimeout(lpCellTimer.current); lpCellTimer.current = null; } return; } // E2 track + cancel E3b long-press on move
    const f = fracFromEvent(e.clientX, e.clientY);
    if (!f) return;
    if (d.kind === "draw") {
      d.moved = true;
      // follow the hand: a mostly-VERTICAL drag draws a VERTICAL line (cols split); the
      // line sits where you touched (perpendicular coord), spanning the cell.
      const dx = Math.abs(f.xf - d.x0), dy = Math.abs(f.yf - d.y0);
      d.dir = dy >= dx ? "cols" : "rows";
      const m = 0.12;
      if (d.dir === "cols") {
        const fx = Math.max(d.fx0 + (d.fx1 - d.fx0) * m, Math.min(d.fx1 - (d.fx1 - d.fx0) * m, d.x0));
        d.af = fx;
        // §5:115 readout — a NEW vertical line (Стойка); show the left piece mm (same module basis as the div-move readout below).
        onReadout?.(`Стойка · ${fmtLen((fx - d.fx0) * W, lenUnit)} ${lenUnitLabel(lenUnit)}`);
        setPreview(<line x1={svgX(fx)} y1={svgY(d.fy0)} x2={svgX(fx)} y2={svgY(d.fy1)} stroke={ACCENT} strokeWidth={9} strokeDasharray="4 9" strokeLinecap="round" />);
      } else {
        const fy = Math.max(d.fy0 + (d.fy1 - d.fy0) * m, Math.min(d.fy1 - (d.fy1 - d.fy0) * m, d.y0));
        d.af = fy;
        // §5:115 readout — a NEW horizontal line (Полка); show the bottom piece mm.
        onReadout?.(`Полка · ${fmtLen((fy - d.fy0) * H, lenUnit)} ${lenUnitLabel(lenUnit)}`);
        setPreview(<line x1={svgX(d.fx0)} y1={svgY(fy)} x2={svgX(d.fx1)} y2={svgY(fy)} stroke={ACCENT} strokeWidth={9} strokeDasharray="4 9" strokeLinecap="round" />);
      }
    } else if (d.kind === "front") {
      d.moved = true;
      const rx0 = Math.min(d.x0, f.xf), rx1 = Math.max(d.x0, f.xf), ry0 = Math.min(d.y0, f.yf), ry1 = Math.max(d.y0, f.yf);
      d.covered = leaves.filter((l) => { const cx = (l.fx0 + l.fx1) / 2, cy = (l.fy0 + l.fy1) / 2; return cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1; }).map((l) => l.path);
      const box = leaves.filter((l) => d.covered.some((p) => samePath(p, l.path)));
      const bx0 = Math.min(...box.map((l) => l.fx0)), bx1 = Math.max(...box.map((l) => l.fx1)), by0 = Math.min(...box.map((l) => l.fy0)), by1 = Math.max(...box.map((l) => l.fy1));
      setPreview(box.length ? <rect x={svgX(bx0)} y={svgY(by1)} width={iw * (bx1 - bx0)} height={ih * (by1 - by0)} fill={ACCENT} opacity={0.18} stroke={ACCENT} strokeWidth={5} /> : null);
      // §5:115 readout — a door being dragged over cells; show its covered W×H (module basis, matching the div readout).
      onReadout?.(box.length ? `Дверь · ${fmtLen((bx1 - bx0) * W, lenUnit)}×${fmtLen((by1 - by0) * H, lenUnit)} ${lenUnitLabel(lenUnit)}` : null);
    } else if (d.kind === "div") {
      if (!d.moved) { beginEdit(); d.moved = true; }
      const dv = d.d;
      // §5:106 magnetic — snap the pointer (full-interior fraction) to the nearest other Line / edge.
      const snapped = snapLineFraction(cab, dv.split, dv.split === "rows" ? f.yf : f.xf, dv.parent, dv.i);
      const frac = dv.split === "rows" ? (snapped - dv.pfy0) / (dv.pfy1 - dv.pfy0) : (snapped - dv.pfx0) / (dv.pfx1 - dv.pfx0);
      const refMm = dv.split === "rows" ? (dv.pfy1 - dv.pfy0) * H : (dv.pfx1 - dv.pfx0) * W;
      // shared boundary move (also used by the 3D space-resize, §342) — reweights rules so it STICKS.
      const { layout: nextLayout, pos } = moveDivider(root, dv.parent, dv.i, frac, refMm);
      // §5:115 readout law — same "Полка/Стойка · N мм" the 3D line-move shows, via the host strip.
      onReadout?.(`${dv.split === "rows" ? "Полка" : "Стойка"} · ${fmtLen(pos * refMm, lenUnit)} ${lenUnitLabel(lenUnit)}`);
      // TRACK: any combined-door edge sitting on this separator follows it
      const newAf = dv.split === "rows" ? dv.pfy0 + (dv.pfy1 - dv.pfy0) * pos : dv.pfx0 + (dv.pfx1 - dv.pfx0) * pos;
      const nextCds = d.origCds.map((cd) => {
        let c = cd;
        if (dv.split === "rows" && dv.b0 < cd.fx1 - 1e-3 && dv.b1 > cd.fx0 + 1e-3) {
          if (Math.abs(cd.fy0 - dv.af) < 2e-3) c = { ...c, fy0: newAf };
          if (Math.abs(cd.fy1 - dv.af) < 2e-3) c = { ...c, fy1: newAf };
        } else if (dv.split === "cols" && dv.b0 < cd.fy1 - 1e-3 && dv.b1 > cd.fy0 + 1e-3) {
          if (Math.abs(cd.fx0 - dv.af) < 2e-3) c = { ...c, fx0: newAf };
          if (Math.abs(cd.fx1 - dv.af) < 2e-3) c = { ...c, fx1: newAf };
        }
        return c;
      });
      patchCabLive(index, { layout: nextLayout, combinedDoors: nextCds });
    } else if (d.kind === "cedge") {
      if (!d.moved) { beginEdit(); d.moved = true; }
      const cd = cds[d.idx];
      if (!cd) return;
      let next = { ...cd };
      if (d.edge === "l") next.fx0 = Math.min(cd.fx1 - MIN_CELL, snapTo(f.xf, gridX));
      else if (d.edge === "r") next.fx1 = Math.max(cd.fx0 + MIN_CELL, snapTo(f.xf, gridX));
      else if (d.edge === "t") next.fy1 = Math.max(cd.fy0 + MIN_CELL, snapTo(f.yf, gridY));
      else next.fy0 = Math.min(cd.fy1 - MIN_CELL, snapTo(f.yf, gridY));
      patchCabLive(index, { combinedDoors: cds.map((c, k) => (k === d.idx ? next : c)) });
    } else {
      if (!d.moved) { beginEdit(); d.moved = true; }
      // the ceiling is the limit, not a flat 2400 (see model/bands.ts maxCabH)
      if (d.edge === "top") patchCabLive(index, { h: Math.round(Math.max(MIN_H, Math.min(maxCabH(cab, ceiling), d.base + (d.downY - e.clientY) * d.mmPerPx)) / EDGE_STEP) * EDGE_STEP });
      else patchCabLive(index, { w: Math.round(Math.max(150, Math.min(1200, d.base + (e.clientX - d.downX) * d.mmPerPx)) / EDGE_STEP) * EDGE_STEP });
    }
  };
  const onUp = () => {
    detach();
    const d = dragRef.current; dragRef.current = null; setPreview(null); onReadout?.(null);
    if (!d) return;
    if (d.kind === "swipe") {
      if (lpCellTimer.current) { clearTimeout(lpCellTimer.current); lpCellTimer.current = null; }
      if (lpFired.current) { lpFired.current = false; return; } // E3b · long-press already toggled multi-select
      // DB/19 §5:170 — a horizontal swipe cycles content (E2, Открытый→Дверь→Ящик→Полки, wrap).
      if (Math.abs(d.dx) > SWIPE_MIN_PX) {
        const layout = cycleCellContent(cab, d.path, d.dx > 0 ? 1 : -1);
        if (layout) {
          commit(flatten(layout));
          const nv = cellVariant(getCell(layout, d.path));
          if (nv) { setTip(VARIANT_RU[nv]); if (tipTimer.current) clearTimeout(tipTimer.current); tipTimer.current = setTimeout(() => setTip(null), 1500); }
        }
        return;
      }
      if (multiSelRef.current.size > 0) toggleMulti(d.path); // E3b · a tap toggles the section in the group while multi-select is active
      return;
    }
    if (d.kind === "draw") {
      // one separator at the drawn position (tap → split the longer side in half)
      const dir = d.moved ? d.dir : (d.fx1 - d.fx0) * interiorW >= (d.fy1 - d.fy0) * interiorH ? "cols" : "rows";
      const raw = !d.moved ? 0.5 : dir === "cols" ? (d.af - d.fx0) / (d.fx1 - d.fx0) : (d.af - d.fy0) / (d.fy1 - d.fy0);
      const pos = Math.max(0.12, Math.min(0.88, raw));
      commit(flatten(replaceCell(root, d.path, () => ({ split: dir, sizes: [pos, 1 - pos], children: [{}, {}] }))));
      setSel(null);
    } else if (d.kind === "front") {
      const paths = d.covered.length ? d.covered : [];
      if (d.front === "drawer") {
        let next = root;
        (paths.length ? paths : [dragStartPath(d)]).forEach((p) => { next = replaceCell(next, p, () => ({ front: "drawer", handle: "top" })); });
        commit(next);
      } else {
        const target = paths.length ? paths : [dragStartPath(d)];
        if (target.length === 1) {
          if (target[0]) { commit(replaceCell(root, target[0], () => ({ front: "door", opening: "left", handle: "right" }))); setSel({ kind: "cell", path: target[0] }); }
        } else {
          // combined door: one door over the bounding rect of the covered cells (any block,
          // across rows AND columns). Clear the covered cells' own fronts (they become the
          // interior behind the door), remove overlapping combined doors, add the overlay.
          const box = leaves.filter((l) => target.some((p) => samePath(p, l.path)));
          const rect = { fx0: Math.min(...box.map((l) => l.fx0)), fy0: Math.min(...box.map((l) => l.fy0)), fx1: Math.max(...box.map((l) => l.fx1)), fy1: Math.max(...box.map((l) => l.fy1)) };
          let nextLayout = root;
          target.forEach((p) => { nextLayout = replaceCell(nextLayout, p, (c) => { const { front: _f, opening: _o, handle: _h, ...rest } = c; void _f; void _o; void _h; return rest; }); });
          const nextCds = [...cds.filter((cd) => !rectsOverlap(cd, rect)), { ...rect, opening: "left" as DoorOpening, handle: "right" as HandlePos }];
          patchCab(index, { layout: nextLayout, combinedDoors: nextCds });
          setSel({ kind: "cdoor", idx: nextCds.length - 1 });
        }
      }
    }
  };
  // the leaf under the gesture's start point (for a tap that didn't move)
  const dragStartPath = (d: Drag & { x0: number; y0: number }): number[] => {
    const hit = leaves.find((l) => d.x0 >= l.fx0 && d.x0 <= l.fx1 && d.y0 >= l.fy0 && d.y0 <= l.fy1);
    return hit ? hit.path : [];
  };
  const attach = (d: Drag) => { dragRef.current = d; window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("touchmove", preventTouch, { passive: false }); };

  const onLeafDown = (l: Leaf, e: React.PointerEvent) => {
    e.preventDefault();
    const f = fracFromEvent(e.clientX, e.clientY); if (!f) return;
    if (tool === "draw") attach({ kind: "draw", path: l.path, fx0: l.fx0, fy0: l.fy0, fx1: l.fx1, fy1: l.fy1, x0: f.xf, y0: f.yf, dir: "rows", af: 0, moved: false });
    else if (tool === "door" || tool === "drawer") attach({ kind: "front", front: tool, x0: f.xf, y0: f.yf, covered: [l.path], moved: false });
    else { // move → select + E2 swipe-cycle + E3b long-press-to-multi-select
      setSel({ kind: "cell", path: l.path });
      lpFired.current = false;
      attach({ kind: "swipe", path: l.path, downX: e.clientX, dx: 0 });
      if (lpCellTimer.current) clearTimeout(lpCellTimer.current);
      lpCellTimer.current = setTimeout(() => { lpFired.current = true; toggleMulti(l.path); }, 450);
    }
  };
  const onDivDown = (dv: Div, e: React.PointerEvent) => {
    if (tool !== "move") return;
    e.preventDefault(); e.stopPropagation();
    setSel({ kind: "div", parent: dv.parent, i: dv.i });
    attach({ kind: "div", d: dv, origCds: cds, moved: false });
  };
  const onCedgeDown = (idx: number, edge: "l" | "r" | "t" | "b", e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSel({ kind: "cdoor", idx });
    attach({ kind: "cedge", idx, edge, moved: false });
  };
  const onEdgeDown = (edge: "top" | "right", e: React.PointerEvent) => {
    if (tool !== "move") return;
    e.preventDefault(); e.stopPropagation();
    setSel(null);
    const ctm = svgRef.current?.getScreenCTM();
    attach({ kind: "edge", edge, downX: e.clientX, downY: e.clientY, base: edge === "top" ? H : W, mmPerPx: ctm ? 1 / ctm.a : 1, moved: false });
  };

  const del = () => {
    if (!sel) return;
    if (sel.kind === "cdoor") { patchCab(index, { combinedDoors: cds.filter((_, k) => k !== sel.idx) }); setSel(null); return; }
    if (sel.kind === "div") { commit(deleteDivider(root, sel.parent, sel.i)); setSel(null); return; }
    const c = getCell(root, sel.path);
    if (c.front) commit(replaceCell(root, sel.path, (x) => { const { front: _f, opening: _o, handle: _h, ...rest } = x; void _f; void _o; void _h; return rest; }));
    else commit(deleteAt(root, sel.path));
    setSel(null);
  };
  // let an embedded host (the studio) render its own delete button: expose the action + report state
  if (deleteRef) deleteRef.current = del;
  useEffect(() => {
    onSelChange?.(!!sel);
    return () => onSelChange?.(false);
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  // §5: report the selected space (path + rect) to the 3D host (no cleanup-clear — the host keeps the
  // last selection after this 2D editor unmounts on the 3D switch, so the blue volume stays visible).
  useEffect(() => {
    onSpaceSel?.(selLeaf ? { path: selLeaf.path, rect: { fx0: selLeaf.fx0, fy0: selLeaf.fy0, fx1: selLeaf.fx1, fy1: selLeaf.fy1 } } : null);
  }, [selLeaf?.fx0, selLeaf?.fy0, selLeaf?.fx1, selLeaf?.fy1]); // eslint-disable-line react-hooks/exhaustive-deps
  const setOpt = (patch: { opening?: DoorOpening; handle?: HandlePos; drawerClass?: "N" | "M" | "K" }) => {
    if (sel?.kind === "cell") commit(replaceCell(root, sel.path, (c) => ({ ...c, ...patch })));
    else if (sel?.kind === "cdoor") patchCab(index, { combinedDoors: cds.map((cd, k) => (k === sel.idx ? { ...cd, ...patch } : cd)) });
  };
  // §A/§B · add an INNER drawer/shelf into the selected front (Дверь/Ящик) — the outer front stays, so
  // opening it in 3D reveals the nested content. The cell remains an opaque editor-leaf → keeps selection.
  const addInner = (kind: "drawer" | "shelf") => { if (sel?.kind === "cell") commit(addInnerContent(cab, sel.path, kind)); };

  const onCdDown = (idx: number, e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); setSel({ kind: "cdoor", idx }); };

  // ── render one editor-leaf (open / door / drawer) ──
  const handleMark = (l: { fx0: number; fy0: number; fx1: number; fy1: number }, pos: HandlePos | undefined): React.ReactNode => {
    const xL = svgX(l.fx0), xR = svgX(l.fx1), yT = svgY(l.fy1), yB = svgY(l.fy0), w = xR - xL, h = yB - yT, m = 16;
    const p = pos ?? "right";
    if (p === "none") return null;
    if (p === "center") return <circle cx={xL + w / 2} cy={yT + h / 2} r={11} fill={HANDLE} />;
    if (p === "top") return <rect x={xL + w / 2 - Math.min(60, w / 4)} y={yT + m} width={Math.min(120, w / 2)} height={8} rx={4} fill={HANDLE} />;
    if (p === "bottom") return <rect x={xL + w / 2 - Math.min(60, w / 4)} y={yB - m - 8} width={Math.min(120, w / 2)} height={8} rx={4} fill={HANDLE} />;
    if (p === "left") return <rect x={xL + m} y={yT + h / 2 - Math.min(60, h / 4)} width={8} height={Math.min(120, h / 2)} rx={4} fill={HANDLE} />;
    return <rect x={xR - m - 8} y={yT + h / 2 - Math.min(60, h / 4)} width={8} height={Math.min(120, h / 2)} rx={4} fill={HANDLE} />;
  };

  const doorSel = selCell?.front === "door" ? selCell : null;
  const drawerSel = selCell?.front === "drawer" ? selCell : null;
  const selLeafInfo = sel?.kind === "cell" ? leaves.find((l) => samePath(sel.path, l.path)) : undefined;
  const drawerDepth = Math.round(cab.depth ?? (cab.kind === "upper" ? 350 : 560));
  // A selected separator (div) edits its whole split's per-zone division rules (§4).
  const selDiv = sel?.kind === "div" ? sel : null;
  const splitCell = selDiv ? getCell(root, selDiv.parent) : null;
  const splitRules = splitCell ? rulesForSplit(splitCell) : [];
  const setZoneRule = (zi: number, rule: DivisionRule) => {
    if (!selDiv) return;
    const next = splitRules.map((r, k) => (k === zi ? rule : r));
    commit(replaceCell(root, selDiv.parent, (par) => ({ ...par, rules: next })));
  };
  // `+` pill (§4): append a zone — a new open compartment + a Ratio-1 rule; sizes reset so the new
  // child count reads as even until the user drags/types. The engine re-solves from rules.
  const addZone = () => {
    if (!selDiv || !splitCell?.children) return;
    commit(replaceCell(root, selDiv.parent, (par) => ({
      ...par,
      children: [...(par.children ?? []), {}],
      rules: [...splitRules, { kind: "ratio" as const, weight: 1 }],
      sizes: undefined,
    })));
  };
  // AMBER (§4): "if nothing can absorb → amber warning" (non-blocking here; hard gate only at export).
  // Fixed+Locked reserve mm; an overflow (they exceed the span) — or an all-fixed split that doesn't
  // exactly fill it — leaves a remainder no Ratio/Flex can absorb. `ref` = the split axis' mm span.
  const selDivInfo = selDiv ? divs.find((d) => samePath(d.parent, selDiv.parent) && d.i === selDiv.i) : undefined;
  const splitRefMm = selDivInfo ? (selDivInfo.split === "rows" ? (selDivInfo.pfy1 - selDivInfo.pfy0) * H : (selDivInfo.pfx1 - selDivInfo.pfx0) * W) : 0;
  const reservedMm = splitRules.reduce((a, r) => a + (r.kind === "fixed" || r.kind === "locked" ? r.mm : 0), 0);
  const hasFlexible = splitRules.some((r) => r.kind === "ratio" || r.kind === "flex");
  const overMm = reservedMm - splitRefMm; // > 0 overflow; < 0 with no flexible zone = an unabsorbed gap
  const amber = splitRefMm > 0 && (overMm > 0.5 || (!hasFlexible && overMm < -0.5));
  // MIN-SIZE GATE (§11 / talablar §2 / 37_MIN §2.1): a drawer needs ≥ its CLASS minimum interior HEIGHT
  // (Blum LEGRABOX — N 80 / M 106 / K 144mm; drawerMinMm, absent class → N). Edit-time WARN, non-blocking
  // (the §4 amber doctrine): a rows split whose drawer zone was shrunk below ITS class minimum flags it.
  // `zoneMm` = each zone's solved mm on the split axis. The worst offender (largest shortfall) drives the
  // warn, so its actual + required mm can be shown.
  const zoneMm = splitRefMm > 0 && splitRules.length ? solveSpans(splitRefMm, splitRules) : [];
  let drawerUnder: { mm: number; min: number } | null = null;
  if (selDivInfo?.split === "rows" && splitCell?.children && zoneMm.length === splitCell.children.length) {
    splitCell.children.forEach((c, i) => {
      if (c.front !== "drawer") return;
      const min = drawerMinMm(c.drawerClass);
      if (zoneMm[i] < min && (!drawerUnder || min - zoneMm[i] > drawerUnder.min - drawerUnder.mm)) drawerUnder = { mm: zoneMm[i], min };
    });
  }
  const drawerTooSmall = !!drawerUnder;
  // SHELF DEFLECTION GATE (37_MIN §2.3): a rows split's shelves span the compartment WIDTH.
  // Too wide for a 16mm board under the founder's 15 kg/m load → they sag past L/240. Edit-time
  // WARN (§4 amber). Thickness comes from the profile; depth ≈ the module depth (edit-time est.).
  const CARCASS_MM = QORASU_PROFILE.material.carcass_mm10 / 10;
  // the shelf spans the compartment's INTERIOR width (between the side panels), not the outer
  // W — matching the editor's own cell-mm readout (interiorW × fraction), so the warn isn't a
  // false positive from the ~2·t of extra width the outer W would add.
  const shelfSpanMm = selDivInfo?.split === "rows" ? (selDivInfo.pfx1 - selDivInfo.pfx0) * interiorW : 0;
  // b (shelf front-to-back depth, 37_MIN §2.3 I=b·h³/12) = the INTERIOR depth = module depth − back zone
  // (profile `backZone_mm10`), NOT the full module depth — the full depth makes the sag estimate optimistic
  // (AUDIT #2). backZone is read from the profile, never a literal (§1/DB-27).
  const shelfDepthMm = Math.max(50, drawerDepth - QORASU_PROFILE.defaults.backZone_mm10 / 10);
  const shelfMaxMm = maxShelfSpanMm(shelfDepthMm, CARCASS_MM, { loadKgPerM: shelfLoadKgPerM });
  const shelfTooWide =
    selDivInfo?.split === "rows" &&
    shelfSpanMm > shelfMaxMm &&
    !!splitCell?.children?.some((c) => c.front !== "drawer");
  // §12.3 · min-gate warn values follow the active display unit (см⇄мм), like every other readout.
  const flen = (mm: number) => `${fmtLen(mm, lenUnit)} ${lenUnitLabel(lenUnit)}`;
  // long-press a pill → the rule-kind picker (§4). Cancels if released / the pointer leaves first.
  const startPick = (zi: number) => { if (lpTimer.current) clearTimeout(lpTimer.current); lpTimer.current = setTimeout(() => setPickerZone(zi), 450); };
  const cancelPick = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };

  return (
    <div className={embedded ? "fill-editor embedded" : "fill-editor"}>
      {!embedded && (
        <div className="fill-head">
          <span className="fill-title">{name}</span>
          <span className="fill-sub">{t.fe.fillTitle} · {Math.round(W / 10)}×{Math.round(H / 10)} cm</span>
          <button className="fill-done" onClick={onClose} type="button">{t.fe.done}</button>
        </div>
      )}

      {/* door / drawer option bar (a combined door has door options too) */}
      {(doorSel || drawerSel || selCd) && (
        <div className="fe-optbar">
          {(doorSel || selCd) && <Dropdown label={t.fe.opening} value={(doorSel ?? selCd)!.opening ?? "left"} options={["left", "right", "top", "bottom"]} optLabel={optLabel} onPick={(v) => setOpt({ opening: v as DoorOpening })} />}
          <Dropdown label={t.fe.handlePos} value={(doorSel ?? selCd ?? drawerSel)!.handle ?? (drawerSel ? "top" : "right")} options={["top", "bottom", "left", "right", "center", "none"]} optLabel={optLabel} onPick={(v) => setOpt({ handle: v as HandlePos })} />
          {drawerSel && <Dropdown label={t.fe.drawerClass} value={drawerSel.drawerClass ?? "N"} options={["N", "M", "K"]} optLabel={(v) => `${v} · ≥${flen(drawerMinMm(v as "N" | "M" | "K"))}`} btnLabel={(v) => v} onPick={(v) => setOpt({ drawerClass: v as "N" | "M" | "K" })} />}
          {/* фасад (Стекло/Шейкер…) endi 3D ДЕТАЛЬ kartasida (front tanlanganda) — 2D'dan olib tashlandi (takror). */}
          {(doorSel || drawerSel) && <button className="fe-inner-btn" onClick={() => addInner("drawer")} type="button" title="Добавить ящик внутрь (открывается за фасадом)">↳ ＋Ящик</button>}
          {(doorSel || drawerSel) && <button className="fe-inner-btn" onClick={() => addInner("shelf")} type="button" title="Добавить полку внутрь">↳ ＋Полка</button>}
          {drawerSel && <button className="fe-org-btn" onClick={() => setOrgOpen(true)} type="button">{t.fe.organizer}</button>}
        </div>
      )}

      {/* G context bar removed — the «Chiziqlar» draw tool splits, «Eshiklar/Tortmalar» set fronts, and a
          horizontal SWIPE on a selected section cycles its content (E2). A separate ＋полка/＋стойка/содерж
          bar duplicated all of that and overflowed the top of the embedded studio, so it is gone. */}

      {/* E3b · section multi-select group bar (§5:171): a content-cycle applied to ALL selected sections. */}
      {multiSel.size > 0 && (
        <div className="fe-optbar" style={{ background: "rgba(47,111,237,0.10)", borderColor: "#2f6fed" }}>
          <span className="fe-dd-lbl">Выбрано: {multiSel.size}</span>
          <button className="fe-dd-btn" type="button" onClick={() => cycleMulti(-1)}>◀</button>
          <button className="fe-dd-btn" type="button" onClick={() => cycleMulti(1)}>содерж.&nbsp;▶</button>
          <button className="fe-dd-btn" type="button" onClick={() => setMultiSel(new Set())}>✕&nbsp;сброс</button>
        </div>
      )}

      {/* division-rule pill row (§4 CONSTRUCTION_FRAME_v4 fixture "shelf adding ratios"): a selected
          separator edits its split's per-zone rules. One value pill per zone, thin divider bars
          between pills mirroring the Lines, a dashed empty slot + a `+` pill that appends a zone.
          Writes cab.layout's Cell.rules; the engine (solveSpans) re-solves geometry + price. */}
      {selDiv && splitCell && splitRules.length > 0 && (
        <div className={`fe-optbar fe-rules${amber ? " amber" : ""}`}>
          <span className="fe-dd-lbl">{t.fe.divRules}</span>
          {splitRules.map((r, zi) => (
            <Fragment key={zi}>
              {zi > 0 && <span className="fe-rule-bar" aria-hidden="true" />}
              <div
                className={`fe-rule fe-rule-${r.kind}`}
                onPointerDown={() => startPick(zi)}
                onPointerUp={cancelPick}
                onPointerLeave={cancelPick}
                onPointerCancel={cancelPick}
                onContextMenu={(e) => e.preventDefault()}
              >
                {r.kind === "flex" ? (
                  <span className="fe-rule-val fe-rule-flex">∞</span>
                ) : (
                  <>
                    <input
                      className="fe-rule-val"
                      type="number"
                      min={0}
                      step={r.kind === "ratio" ? 0.1 : 10}
                      value={r.kind === "ratio" ? r.weight : r.mm}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setZoneRule(zi, r.kind === "ratio" ? { kind: "ratio", weight: v } : { kind: r.kind, mm: Math.round(v) });
                      }}
                    />
                    {(r.kind === "fixed" || r.kind === "locked") && <span className="fe-rule-unit">mm</span>}
                  </>
                )}
                {/* rule-kind picker (§4): long-press the pill OR tap the ▾ */}
                <button type="button" className="fe-rule-kind" aria-label={t.fe.divRules}
                  onClick={() => setPickerZone(pickerZone === zi ? null : zi)}>▾</button>
                {pickerZone === zi && (
                  <div className="fe-dd-menu fe-rule-menu">
                    {(["ratio", "fixed", "locked", "flex"] as const).map((k) => (
                      <button key={k} type="button" className={k === r.kind ? "sel" : ""}
                        onClick={() => { setZoneRule(zi, asKind(k, r)); setPickerZone(null); }}>
                        {(t.fe.ruleKind as Record<string, string>)[k] ?? k}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Fragment>
          ))}
          <span className="fe-rule-bar" aria-hidden="true" />
          <span className="fe-rule-slot" aria-hidden="true" />
          <button className="fe-rule-add" onClick={addZone} type="button" aria-label={t.fe.addZone}>+</button>
          {amber && <span className="fe-rule-warn" role="alert">⚠ {t.fe.divWarn(Math.round(overMm))}</span>}
          {drawerTooSmall && <span className="fe-rule-warn fe-rule-mingate" role="alert">⚠ {t.fe.minDrawer(flen(drawerUnder!.mm), flen(drawerUnder!.min))}</span>}
          {shelfTooWide && <span className="fe-rule-warn fe-rule-mingate" role="alert">⚠ {t.fe.shelfWide(flen(shelfSpanMm), flen(shelfMaxMm))}</span>}
        </div>
      )}

      {orgOpen && drawerSel && sel?.kind === "cell" && selLeafInfo && (
        <OrganizerEditor
          organizer={drawerSel.organizer}
          widthMm={Math.max(60, Math.round(interiorW * (selLeafInfo.fx1 - selLeafInfo.fx0)))}
          depthMm={drawerDepth}
          onChange={(next, live) => commit(replaceCell(root, sel.path, (c) => ({ ...c, organizer: next })), live)}
          beginEdit={beginEdit}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onClose={() => setOrgOpen(false)}
        />
      )}

      <div className="fill-stage">
        {show3d ? (
          <CabinetPreview3D cab={cab} style={style} />
        ) : (
          <svg ref={svgRef} className="fill-svg" viewBox={`${pan.x} ${pan.y} ${zvbW} ${zvbH}`} onWheel={onWheel} xmlns="http://www.w3.org/2000/svg">
            <rect x={PAD} y={PAD} width={W} height={H} rx={14} fill="#f8fafc" stroke={LINE} strokeWidth={5} />
            {leaves.map((l) => {
              const xL = svgX(l.fx0), yT = svgY(l.fy1), w = iw * (l.fx1 - l.fx0), h = ih * (l.fy1 - l.fy0);
              const on = sel?.kind === "cell" && samePath(sel.path, l.path);
              const multi = multiSel.has(mkey(l.path)); // E3b · in the multi-select group
              const front = l.cell.front;
              const bg = front === "door" ? DOORBG : front === "drawer" ? DRAWBG : OPENBG;
              const wmm = Math.round(interiorW * (l.fx1 - l.fx0) / 10), hmm = Math.round(interiorH * (l.fy1 - l.fy0) / 10);
              return (
                <g key={l.path.join("-") || "root"} onPointerDown={(e) => onLeafDown(l, e)}>
                  <rect x={xL + 3} y={yT + 3} width={w - 6} height={h - 6} rx={front ? 8 : 2} fill={bg} stroke={on ? ACCENT : front ? LINE : "none"} strokeWidth={on ? 7 : front ? 3 : 0} />
                  {multi && <rect x={xL + 3} y={yT + 3} width={w - 6} height={h - 6} rx={front ? 8 : 2} fill="rgba(47,111,237,0.14)" stroke="#2f6fed" strokeWidth={5} strokeDasharray="9 7" pointerEvents="none" />}
                  {front && handleMark(l, l.cell.handle ?? (front === "drawer" ? "top" : (l.cell.opening === "left" ? "right" : l.cell.opening === "right" ? "left" : l.cell.opening === "top" ? "bottom" : "top")))}
                  <text x={(xL + svgX(l.fx1)) / 2} y={(yT + svgY(l.fy0)) / 2} textAnchor="middle" dominantBaseline="middle" fontSize={30} fontFamily="Inter, sans-serif" fontWeight={on ? 700 : 500} fill={on ? ACCENT : "#8a7c5f"} pointerEvents="none">{wmm}×{hmm}</text>
                </g>
              );
            })}
            {/* combined doors — TRANSLUCENT so the separators behind show through; the body
                is pass-through in Draw/Drawer tools so you can split the cells behind it */}
            {cds.map((cd, k) => {
              const on = sel?.kind === "cdoor" && sel.idx === k;
              const xL = svgX(cd.fx0), xR = svgX(cd.fx1), yT = svgY(cd.fy1), yB = svgY(cd.fy0);
              const hpos = cd.handle ?? (cd.opening === "left" ? "right" : cd.opening === "right" ? "left" : cd.opening === "top" ? "bottom" : "top");
              const pe = tool === "move" || tool === "door" ? "auto" : "none";
              return (
                <g key={`cd${k}`}>
                  <rect x={xL + 3} y={yT + 3} width={xR - xL - 6} height={yB - yT - 6} rx={8} fill={DOORBG} fillOpacity={0.62} stroke={on ? ACCENT : LINE} strokeWidth={on ? 7 : 3} onPointerDown={(e) => onCdDown(k, e)} style={{ pointerEvents: pe as React.CSSProperties["pointerEvents"] }} />
                  <g style={{ pointerEvents: "none" }}>{handleMark(cd, hpos)}</g>
                  {on && tool === "move" && ([["l", xL, yT, xL, yB], ["r", xR, yT, xR, yB], ["t", xL, yT, xR, yT], ["b", xL, yB, xR, yB]] as [string, number, number, number, number][]).map(([edge, ex1, ey1, ex2, ey2]) => (
                    <g key={edge} className={`fill-sep ${edge === "l" || edge === "r" ? "vert" : "horiz"}`} onPointerDown={(e) => onCedgeDown(k, edge as "l" | "r" | "t" | "b", e)}>
                      <line x1={ex1} y1={ey1} x2={ex2} y2={ey2} stroke="transparent" strokeWidth={30} />
                      <line x1={ex1} y1={ey1} x2={ex2} y2={ey2} stroke={ACCENT} strokeWidth={6} strokeLinecap="round" />
                    </g>
                  ))}
                </g>
              );
            })}
            {/* separators — drawn ON TOP of the doors, DASHED when behind one, still editable */}
            {divs.map((dv, k) => {
              const ln = dv.split === "rows" ? { x1: svgX(dv.b0), y1: svgY(dv.af), x2: svgX(dv.b1), y2: svgY(dv.af) } : { x1: svgX(dv.af), y1: svgY(dv.b0), x2: svgX(dv.af), y2: svgY(dv.b1) };
              const on = sel?.kind === "div" && samePath(sel.parent, dv.parent) && sel.i === dv.i;
              const dashed = behindDoor(dv);
              return (
                <g key={`dv${k}`} className={`fill-sep ${dv.split === "rows" ? "horiz" : "vert"}`} onPointerDown={(e) => onDivDown(dv, e)} style={{ pointerEvents: tool === "move" ? "auto" : "none" }}>
                  <line {...ln} stroke="transparent" strokeWidth={40} />
                  <line {...ln} stroke={on ? ACCENT : dashed ? "#a6906a" : LINE} strokeWidth={on ? 13 : dashed ? 8 : 11} strokeLinecap="round" strokeDasharray={dashed ? "10 12" : undefined} />
                </g>
              );
            })}
            {preview}
            {tool === "move" && <>
              <line x1={x0} y1={y0} x2={x0 + iw} y2={y0} stroke="transparent" strokeWidth={34} className="fill-edge topedge" onPointerDown={(e) => onEdgeDown("top", e)} />
              <line x1={x0 + iw} y1={y0} x2={x0 + iw} y2={y0 + ih} stroke="transparent" strokeWidth={34} className="fill-edge rightedge" onPointerDown={(e) => onEdgeDown("right", e)} />
              <rect x={x0 + iw / 2 - 26} y={y0 - 5} width={52} height={10} rx={5} fill={LINE} pointerEvents="none" />
              <rect x={x0 + iw - 5} y={y0 + ih / 2 - 26} width={10} height={52} rx={5} fill={LINE} pointerEvents="none" />
            </>}
          </svg>
        )}
        {!show3d && (
          <div className="fill-zoom">
            <button type="button" onClick={() => zoomTo(zoom * 1.35)} aria-label="Приблизить" disabled={zoom >= 6}>+</button>
            <button type="button" onClick={resetZoom} aria-label="Сбросить масштаб" disabled={zoom === 1}>⤢</button>
            <button type="button" onClick={() => zoomTo(zoom / 1.35)} aria-label="Отдалить" disabled={zoom <= 1}>–</button>
          </div>
        )}
      </div>

      {/* embedded: no chrome here — the studio's viewport owns the tools, undo/redo, delete and the
          3D/2D/Сетка toggle. standalone: the full control bar. */}
      {embedded ? null : (
        <div className="fill-bar">
          <div className="fill-vtog2">
            <button className={view3d ? "sel" : ""} onClick={() => setView3d(true)} type="button">3D</button>
            <button className={!view3d ? "sel" : ""} onClick={() => setView3d(false)} type="button">2D</button>
          </div>
          <button className="fill-del2" onClick={del} type="button" aria-label="delete" style={{ visibility: sel ? "visible" : "hidden" }}>✕</button>
          <div className="fill-ur">
            <button onClick={undo} disabled={!canUndo} type="button" aria-label={t.config.undo}><IconUndo /></button>
            <button onClick={redo} disabled={!canRedo} type="button" aria-label={t.config.redo}><IconRedo /></button>
          </div>
        </div>
      )}

      {/* 4-tool toolbar (tapping a tool flashes a 3.5s how-to tip) — standalone only */}
      {!embedded && (
      <div className="fill-toolbar">
        {tip && <div className="fe-tip">{tip}</div>}
        {([["draw", D_DRAW, t.fe.drawLines], ["move", D_MOVE, t.fe.moveResize], ["door", D_DOOR, t.fe.addDoors], ["drawer", D_DRAWER, t.fe.addDrawers]] as [Tool, string, string][]).map(([k, d, lbl]) => (
          <button key={k} className={`fe-tool${tool === k ? " sel" : ""}`} onClick={() => pickTool(k)} type="button">
            <span className="fe-tool-ic"><Ico d={d} /></span>
            <span className="fe-tool-lbl">{lbl}</span>
          </button>
        ))}
      </div>
      )}
    </div>
  );
}

/** The four interior tools, exported so the studio's viewport rail can render them (icon + label)
 *  and drive the controlled FillEditor. Keep in sync with the toolbar above. */
export const FILL_TOOLS: { key: Tool; d: string; labelKey: "drawLines" | "moveResize" | "addDoors" | "addDrawers" }[] = [
  { key: "draw", d: D_DRAW, labelKey: "drawLines" },
  { key: "move", d: D_MOVE, labelKey: "moveResize" },
  { key: "door", d: D_DOOR, labelKey: "addDoors" },
  { key: "drawer", d: D_DRAWER, labelKey: "addDrawers" },
];

/** The tool icon glyph (shared with the studio rail). */
export function ToolIcon({ tool }: { tool: Tool }) {
  const d = FILL_TOOLS.find((x) => x.key === tool)?.d ?? "";
  return <Ico d={d} />;
}
