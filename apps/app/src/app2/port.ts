// App-2 (Конструктор / Блок) — the PORT: App-2's contract with the shared store.
//
// Qadam 4 ("ko'prik" — the bridge). Before this, the constructor slice imported the whole
// `AppState` from store.ts and could read/write ANY store field. Now app2/ imports NOTHING
// from store.ts — it depends only on this file, and the store fulfils this contract:
//
//   • ConstructorState — the NARROW WINDOW of store state App-2 reads/writes (its "3 walls":
//     the shared cabs/grids, the room shape, and its own selection / undo history / style).
//     App-2 does NOT own these fields — the store does (they are shared with App-1) — so this
//     is a structural view the store SATISFIES, not a claim of ownership. Read or write a field
//     that isn't listed here and it stops compiling: the boundary is now type-checker-enforced.
//
//   • ConstructorActions — the 58 constructor actions App-2 OWNS. store.ts's `AppState` now
//     `extends ConstructorActions` instead of declaring them inline, so the dependency INVERTS:
//     App-2 declares its own action contract, and the store fulfils it.
//
// Everything here imports only from the shared model/ kernel (+ app2's own storeHelpers) —
// never from store.ts — which is exactly what keeps App-2 independent of the store.

import type { Pt, Opening, Fitting } from "../model/room";
import type { Cabinet, FinishKey } from "../model/cabinet";
import type { Grids } from "../model/sheet";
import type { KitchenLayout } from "../model/runPlan";
import type { KitchenStyle } from "../model/layout";
import type { MaterialSlots, MaterialSlotKey } from "../model/materials";
import type { ResizeBounds, RowEdit } from "../model/rowOps";
import type { CellRef, RowKind } from "../model/grid";
import type { Settings } from "../model/settings";
import type { CabSnap } from "./storeHelpers";

/** The WINDOW of store STATE App-2 reads/writes — nothing else in the store is visible to the
 *  slice. The store's full AppState is a structural superset of this and so satisfies it. */
export interface ConstructorState {
  // room — App-2's read-only view of App-1's room shape (drives runs/corners/reach)
  roomPoints: Pt[];
  openings: Opening[];
  fittings: Fitting[];
  ceiling: number;
  reveal: number;
  waterWall: number | null;
  // the shared furniture + per-wall sheets — App-1 seeds them, App-2 edits them
  cabs: Cabinet[];
  grids: Grids;
  // selection + the constructor's own undo history (separate from the room-geometry undo)
  selIdx: number;
  selIds: string[];
  cabsPast: CabSnap[];
  cabsFuture: CabSnap[];
  // the committed layout + look
  runLayout: KitchenLayout;
  runStyle: KitchenStyle;
  /** project material variables (§3): board material per role slot — additive to runStyle. */
  runMaterials: MaterialSlots;
  mat: number;
  mode: "real" | "xray" | "wire" | "application";
  // settings App-2 reads (hanging rule / span); the saved-cab library bump; the toast channel
  settings: Settings;
  savedCabsRev: number;
  toast: string | null;
  // auth — App-2 only ever reads the id, only to sync a saved cabinet to the cloud
  authUser: { id: string } | null;
  // the open project — App-2 reads it to bind a 🔒 «В проект» (local-scoped) saved block to it
  currentProjectId: string | null;
}

/** The 58 constructor actions App-2 owns. store.ts's `AppState extends ConstructorActions`. */
export interface ConstructorActions {
  // ---- selection (per-module) ----
  selectCab: (i: number) => void;
  /** select exactly one module (a chip tap, or after adding) — the selection becomes just `[id]`. */
  selectOnly: (id: string) => void;
  /** set the whole selection to `ids` (e.g. after duplicating a group). */
  selectMany: (ids: string[]) => void;
  /** clear the whole selection. */
  clearSel: () => void;
  /** add/remove a module id from the selection (a tap in the 3D). Keeps `selIdx` on the primary. */
  toggleSelId: (id: string) => void;
  /** push a style patch (front / handle / door …) onto EVERY selected module at once. */
  applyToSelected: (patch: Partial<Cabinet>) => void;
  /** push a finish (part → colour) onto every selected module at once. */
  applyFinishToSelected: (finish: Partial<Record<FinishKey, number>>) => void;
  /** resize the whole selection to a new COMBINED width (mm), redistributed across its members. Only
   *  fires when the selection is a contiguous run of gridded modules on ONE wall band; otherwise no-op. */
  resizeSelectedWidth: (mm: number) => void;
  /** DRAG-resize the selection's combined width from ONE outer edge (the 3D group handle): "right"
   *  grows the group's right edge into the column after it, "left" grows the left edge into the column
   *  before it; the members redistribute proportionally. Live steps push no undo. Same contiguity
   *  guard as `resizeSelectedWidth`. */
  resizeSelectedSpan: (mm: number, edge: "left" | "right", live?: boolean) => void;
  /** set height / depth on EVERY selected module at once (same clamps + corner/base rules as one). */
  dimSelected: (patch: { h?: number; depth?: number }, live?: boolean) => void;
  /** make every selected module in a contiguous run the same width (their combined width unchanged). */
  equalizeSelected: () => void;
  patchCab: (i: number, patch: Partial<Cabinet>) => void;
  /** live patch (NO undo entry) — for continuous gestures; pair with beginCabEdit() */
  patchCabLive: (i: number, patch: Partial<Cabinet>) => void;
  /** THE dimension edit — height/depth for ONE module. Every view routes through it. */
  patchCabDims: (id: string, patch: { h?: number; depth?: number }, live?: boolean) => void;
  /** «Объединить в один корпус» — build this module's whole ROW as ONE carcass (two outer sides, a
   *  shared stile at each boundary, one long top/bottom/back) instead of one box per cabinet. */
  toggleCarcassMerge: (id: string) => void;
  /** JOIN or SPLIT the seam between two neighbouring cabinets — the per-boundary switch. */
  toggleSeam: (leftId: string, rightId: string) => void;
  /** PUT A HANGER ON THIS SIDE PANEL — or take it off. `pos` is mm from the BOX's left edge. */
  toggleHangerAt: (id: string, pos: number) => void;
  /** back to the workshop's standing rule (Настройки) for this box */
  resetHangers: (id: string) => void;
  /** merge a finish (part → colour) into every module — the editor's "apply to all" */
  applyFinishToAll: (finish: Partial<Record<FinishKey, number>>) => void;
  /** bind a project material SLOT (§3 variables) to a catalog SKU id — the explicit material
   *  identity behind the colour. Additive: colours still flow through `finish`/`runStyle`. */
  setRunMaterial: (key: MaterialSlotKey, id: string) => void;
  /** apply a patch (e.g. handle type, fill) to every module — "apply to all" scope */
  patchAllCabs: (patch: Partial<Cabinet>) => void;
  /** add a NEW module from the catalog — auto-fits into the first free gap (else drops free); returns id.
   *  `topBand` seats it in the topmost EXISTING wall row of the target run (height/mount/depth adopted). */
  addCab: (cab: Partial<Cabinet>, preferredRun?: number, topBand?: boolean) => string | null;
  /** grow a module to fill the empty space beside it in its row (after a delete) */
  fillCabGap: (id: string) => void;
  /** save a customised module to the "My cabinets" reusable library (captures a thumbnail) */
  saveCab: (cabId: string, name: string, scope?: "mine" | "project") => void;
  /** remove a saved cabinet from the library */
  removeSavedCab: (id: string) => void;
  /** remove a module from the run (best-effort — the run isn't re-flowed yet) */
  removeCab: (id: string) => void;
  /** copy a module, parked at the end of its run lane; returns the new id */
  duplicateCab: (id: string) => string | null;
  /** swap a module's TYPE for a catalog template, keeping its place / finish / id */
  replaceCab: (id: string, cab: Partial<Cabinet>) => void;
  // ── THE SHEET (model/grid.ts) — every edit goes through grid.editSheet, which refuses overlaps ──
  /** Build this wall's sheet if it has none yet (or the room moved the wall under it). Silent (no undo). */
  openSheet: (run: number) => void;
  /** Force the constructor into the "all" shape (a grid on every wall). Idempotent; remaps cab runs. */
  ensureAllWalls: () => void;
  /** Set column `i`'s width (mm) IN BAND `rowId`. Columns beyond it in the band absorb the change. */
  gridSetColW: (run: number, rowId: string, i: number, mm: number, live?: boolean) => void;
  /** ADD a cabinet-column to band `rowId` — the "+". Appends a slot and equalises the band. */
  gridAddCol: (run: number, rowId: string) => void;
  /** DROP the last column of band `rowId` — the "−". Removes the rightmost cabinet, re-equalises. */
  gridDropCol: (run: number, rowId: string) => void;
  /** FILL A CORNER by extending the cabinet next to a reach strip INTO it (or retract it back out). */
  gridFillReach: (run: number, rowId: string, reachIdx: number) => void;
  /** ADD AN L-SHAPED CORNER CABINET to band `rowId` of wall `run` — the floating inside-corner unit. */
  addCornerCab: (run: number, rowId: string) => void;
  /** TAP-TO-PLACE a corner: seat the armed corner template at run `run`'s inside corner, band `rowId`. */
  placeCornerInBand: (run: number, rowId: string, tpl?: Partial<Cabinet>) => void;
  /** Set row `j`'s height (mm) — the rows above give up what it takes, so the ceiling never moves. */
  gridSetRowH: (run: number, j: number, mm: number, live?: boolean) => void;
  /** Carve a new band out of a row — how an антресоль is born. */
  gridSplitRow: (run: number, j: number, atMm: number, kind: RowKind) => void;
  /** Turn a row into one that holds modules, or back into dead wall. */
  gridSetRowKind: (run: number, j: number, kind: RowKind) => void;
  /** PUT A MODULE IN A CELL. It takes the CELL's width/height/depth/kind. Returns null if taken. */
  addCabInCell: (run: number, cell: CellRef, tpl?: Partial<Cabinet>) => string | null;
  /** fill every empty cell of the selected module's ROW with a copy of it (one undo step) */
  fillWallRow: (id: string) => void;
  /** «3-й ряд»: turn the top void into a wall row AND drop the module into it, in one step. */
  addCabInTopVoid: (run: number, tpl?: Partial<Cabinet>) => string | null;
  /** RESIZE A MODULE BY GRABBING ONE OF ITS FACES — really a change to the COLUMN it sits in. */
  gridSetCabW: (id: string, w: number, edge: "left" | "right", live?: boolean) => void;
  /** resize a module's width; the next module in its row absorbs the change (tiled, no overlap) */
  resizeCab: (id: string, newW: number, edge?: "left" | "right", bounds?: ResizeBounds) => void;
  /** resizeCab with NO undo entry — for the grid's border drag; pair with beginCabEdit() */
  resizeCabLive: (id: string, newW: number, edge?: "left" | "right", bounds?: ResizeBounds) => void;
  /** set the base-cabinet (counter) height for ALL base cabinets at once (mm) — keeps the worktop level */
  setBaseHeight: (mm: number) => void;
  /** setBaseHeight with NO undo entry — for the grid's worktop drag */
  setBaseHeightLive: (mm: number) => void;
  /** re-hang / resize wall units — the front sheet's row drags. `…Live` skips the undo stack. */
  setRows: (edits: RowEdit[]) => void;
  setRowsLive: (edits: RowEdit[]) => void;
  /** add a module at an EXACT free slot on a run (the grid's tap-an-empty-cell) — no first-fit search */
  addCabAt: (cab: Partial<Cabinet>, run: number, x: number, w: number) => string | null;
  /** Re-attach a free-placed module to a wall run at a run-local x — it becomes a real column. No undo. */
  dockCab: (id: string, run: number, x: number) => void;
  /** repair columns that ended up inside a wall's cleared corner zone (negative run-local x). No undo. */
  healRows: () => void;
  /** batch-set module positions (x / mountY) — front-view drag reorder commit */
  moveCabsX: (updates: { id: string; x: number; mountY?: number; run?: number }[]) => void;
  /** set a module's free plan transform (px/pz centre mm, rot degrees) — 2D plan drag/rotate */
  moveCabPlan: (id: string, patch: { px?: number; pz?: number; rot?: number; cornerFace?: Pt }) => void;
  setMat: (i: number) => void;
  /** snapshot cabs before a continuous gesture (plan drag/rotate) so it's one undo step */
  beginCabEdit: () => void;
  undoCab: () => void;
  redoCab: () => void;
  /** constructor render style: realistic / translucent / wireframe */
  setMode: (m: "real" | "xray" | "wire" | "application") => void;
}
