// App-2 (Конструктор) store helpers — extracted from store.ts (Faza 3a).
//
// Pure helpers the constructor's Zustand actions use: the cabinet edit-history
// snapshot (the grids ride along) and the run-index remap when the layout shape
// changes. No store, no React — just data transforms the constructor slice needs.

import type { Cabinet } from "../model/cabinet";
import type { Grids } from "../model/sheet";
import type { KitchenStyle } from "../model/layout";
import { planRuns, type KitchenLayout } from "../model/runPlan";
import type { Pt, Opening } from "../model/room";

// ---- constructor (cabinet) edit history — separate from the room geometry undo ----
// The GRIDS ride along in the snapshot: a column drag changes the track AND every module the track
// projects, so undoing one without the other would leave modules addressing columns that no longer
// have those widths. One snapshot, one undo step — the sheet is the unit of history.
export interface CabSnap {
  cabs: Cabinet[];
  grids: Grids;
  runStyle: KitchenStyle;
  mat: number;
}
export type CabHistState = { cabsPast: CabSnap[]; cabs: Cabinet[]; grids: Grids; runStyle: KitchenStyle; mat: number };
// push the current cabinet state onto the undo stack (and clear redo)
export const cabHist = (s: CabHistState) => ({
  cabsPast: [...s.cabsPast.slice(-49), { cabs: s.cabs, grids: s.grids, runStyle: s.runStyle, mat: s.mat }],
  cabsFuture: [] as CabSnap[],
});
export const cabNow = (s: CabHistState): CabSnap => ({ cabs: s.cabs, grids: s.grids, runStyle: s.runStyle, mat: s.mat });

/** Translate every gridded module's run INDEX from one layout to another via its physical wall, so a
 *  cabinet keeps standing on the same wall when the constructor switches the shape to "all" (whose run
 *  order differs from i/l/u). Free/corner modules carry px/pz, not a run index — they pass through. */
export function remapCabRuns(cabs: Cabinet[], from: KitchenLayout, to: KitchenLayout, points: Pt[], waterWall: number | null, openings: Opening[]): Cabinet[] {
  if (from === to) return cabs;
  const oldRuns = planRuns(points, waterWall, from, openings).runs;
  const newRuns = planRuns(points, waterWall, to, openings).runs;
  const wallToNew = new Map<number, number>();
  newRuns.forEach((r, i) => { if (r.kind === "wall") wallToNew.set(r.wall, i); });
  return cabs.map((c) => {
    if (c.px != null || c.run == null) return c;
    const wall = oldRuns[c.run]?.wall;
    const nr = wall != null ? wallToNew.get(wall) : undefined;
    return nr != null && nr !== c.run ? { ...c, run: nr } : c;
  });
}
