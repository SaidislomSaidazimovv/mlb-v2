// App-2 (Конструктор) store slice — extracted from store.ts (Faza 3b).
//
// The constructor's Zustand actions live here instead of inline in the one big
// store. They still operate on the SAME store (one `DesignNode[]`/cabs tree): the
// slice is handed the store's own `set`/`get`, so behaviour is identical — only the
// code's home changes. This grows batch by batch; every action moved here is
// removed from store.ts's `create()` and provided via `...createConstructorSlice(set, get)`.
//
// `import type { AppState }` is erased at runtime, so there is no runtime import
// cycle with store.ts (store imports this slice's VALUE; this imports only the TYPE).

import type { ConstructorState, ConstructorActions } from "./port";
import { cabHist, cabNow, remapCabRuns } from "./storeHelpers";
import type { Cabinet } from "../model/cabinet";
import { editSheet, setColWidth, setRowHeight, splitRow, setRowKind, addColumn, dropColumn, resizeSpan, resizeSpanLeft, equalizeSpan, lastFillColId, reconcileTalls, locate, rowIndex, rowEdges, ROW_MIN, type CellRef, type RowKind } from "../model/grid";
import { maxCabH, cabDepth, isOuterCorner, bandsOverlap, FOOT_DEPTH_MM, MIN_H, D_MIN, D_MAX } from "../model/bands";
import { resizeCabs, setBasesH, editRows, seatCorner, seatOuterCorner, healRunStarts, healCornerUnits, type ResizeBounds, type RowEdit } from "../model/rowOps";
import { ensureSheet, rehangCorners, openCells, inSheet, type Grids } from "../model/sheet";
import { splitSeam, joinSeam, healCarcassGroups, boxMates, hangersOn, unmergeRow, mergeRow } from "../model/carcassGroups";
import { mk, styleOf, frontOf, dedupeIds, MATERIALS } from "../model/cabinet";
import { isTiled, runFloor, resolveLayout, wallRows } from "../model/resolve";
import { planRuns, candidateLayouts, cornerUnits, cornerSideFor, interiorWallCabs, DEFAULT_REVEAL } from "../model/runPlan";
import { fillGapSpan, firstFitX, parkX } from "../model/fill";
import { dockAll, cabFootprints, footsClash } from "../model/footprint";
import { polygonBoundsMm, type Pt } from "../model/room";
import { completeCornerL, reanchorAfterCorner } from "../model/cornerEdit";
import { GEOM } from "../model/layout";
import { captureCabinetThumbnail } from "../lib/cabThumb";
import { captureThumbnail } from "../lib/thumbnailCapture";
import { addSavedCab, removeSavedCab as removeSavedCabLS, setCabScope, stripCab } from "../model/savedCabs";
import { pushSavedCab, deleteSavedCabCloud } from "../lib/sync";

const PLINTH = GEOM.plinth;
const WORKTOP = GEOM.worktop;

// The slice sees the store ONLY through its port (app2/port.ts): get() returns the
// ConstructorState READ window; set() writes only ConstructorWrite — a strict SUBSET, because the
// room / settings / auth fields App-2 only READS are not writable (that's also why the store's own
// AuthUser needn't leak in here). No AppState, no store import — so the compiler now REFUSES any
// read of a field not in the port, and any write of a field App-2 has no business changing.
type ConstructorWrite = Partial<Pick<
  ConstructorState,
  | "cabs" | "grids" | "selIdx" | "selIds" | "cabsPast" | "cabsFuture"
  | "runLayout" | "runStyle" | "runMaterials" | "mat" | "mode" | "savedCabsRev" | "toast"
>>;
type Set = (partial: ConstructorWrite | ((s: ConstructorState) => ConstructorWrite)) => void;
type Get = () => ConstructorState;

export function createConstructorSlice(set: Set, get: Get): ConstructorActions {
  return {
    // ---- selection (per-module) ----
    selectCab: (i) => set({ selIdx: i }),
    selectOnly: (id) =>
      set((s) => ({ selIds: [id], selIdx: s.cabs.findIndex((c) => c.id === id) })),
    selectMany: (ids) =>
      set((s) => ({ selIds: ids, selIdx: ids.length ? s.cabs.findIndex((c) => c.id === ids[ids.length - 1]) : -1 })),
    clearSel: () => set({ selIds: [], selIdx: -1 }),
    toggleSelId: (id) =>
      set((s) => {
        const selIds = s.selIds.includes(id) ? s.selIds.filter((x) => x !== id) : [...s.selIds, id];
        const primary = selIds[selIds.length - 1]; // the last-tapped member drives single-value readouts
        return { selIds, selIdx: primary ? s.cabs.findIndex((c) => c.id === primary) : -1 };
      }),
    // ---- operations on the current selection ----
    applyToSelected: (patch) =>
      set((s) => {
        const ids = new Set(s.selIds);
        if (!ids.size) return {};
        return { ...cabHist(s), cabs: s.cabs.map((c) => (ids.has(c.id) ? { ...c, ...patch } : c)) };
      }),
    applyFinishToSelected: (finish) =>
      set((s) => {
        const ids = new Set(s.selIds);
        if (!ids.size) return {};
        return { ...cabHist(s), cabs: s.cabs.map((c) => (ids.has(c.id) ? { ...c, finish: { ...c.finish, ...finish } } : c)) };
      }),
    resizeSelectedWidth: (mm) =>
      set((s) => {
        const ids = new Set(s.selIds);
        const picked = s.cabs.filter((c) => ids.has(c.id) && c.cell && c.px == null);
        if (!picked.length) return {};
        const run = picked[0].run ?? 0;
        if (picked.some((c) => (c.run ?? 0) !== run)) return {}; // all on ONE wall
        const g = s.grids[run];
        if (!g) return {};
        const locs = picked.map((c) => ({ c, loc: locate(g, c.cell!) }));
        if (locs.some((l) => l.loc.j < 0 || l.loc.i < 0)) return {};
        const j = locs[0].loc.j;
        if (locs.some((l) => l.loc.j !== j)) return {}; // all in ONE band
        const ranges = locs
          .map((l) => [l.loc.i, l.loc.i + (l.c.cell!.cs ?? 1) - 1] as [number, number])
          .sort((a, b) => a[0] - b[0]);
        let i0 = ranges[0][0];
        let i1 = ranges[0][1];
        for (let k = 1; k < ranges.length; k++) {
          if (ranges[k][0] !== i1 + 1) return {}; // gap / overlap → not a clean group
          i1 = ranges[k][1];
        }
        const next = resizeSpan(g, j, i0, i1, mm);
        if (!next) return {};
        const res = editSheet(s.cabs, next);
        if (!res) return {};
        return { ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs };
      }),
    resizeSelectedSpan: (mm, edge, live = false) =>
      set((s) => {
        const ids = new Set(s.selIds);
        const picked = s.cabs.filter((c) => ids.has(c.id) && c.cell && c.px == null);
        if (!picked.length) return {};
        const run = picked[0].run ?? 0;
        if (picked.some((c) => (c.run ?? 0) !== run)) return {};
        const g = s.grids[run];
        if (!g) return {};
        const locs = picked.map((c) => ({ c, loc: locate(g, c.cell!) }));
        if (locs.some((l) => l.loc.j < 0 || l.loc.i < 0)) return {};
        const j = locs[0].loc.j;
        if (locs.some((l) => l.loc.j !== j)) return {};
        const ranges = locs
          .map((l) => [l.loc.i, l.loc.i + (l.c.cell!.cs ?? 1) - 1] as [number, number])
          .sort((a, b) => a[0] - b[0]);
        let i0 = ranges[0][0];
        let i1 = ranges[0][1];
        for (let k = 1; k < ranges.length; k++) {
          if (ranges[k][0] !== i1 + 1) return {};
          i1 = ranges[k][1];
        }
        const next = edge === "left" ? resizeSpanLeft(g, j, i0, i1, mm) : resizeSpan(g, j, i0, i1, mm);
        if (!next) return {};
        const res = editSheet(s.cabs, next);
        if (!res) return {};
        const out = { grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs };
        return live ? out : { ...cabHist(s), ...out };
      }),
    dimSelected: (patch, live = false) =>
      set((s) => {
        const ids = new Set(s.selIds);
        if (!ids.size) return {};
        const next = s.cabs.map((c) => {
          if (!ids.has(c.id)) return c;
          const d = patch.depth != null ? Math.max(D_MIN, Math.min(D_MAX, Math.round(patch.depth))) : null;
          const p: Partial<Cabinet> = {};
          if (patch.h != null && c.kind !== "base") p.h = Math.max(MIN_H, Math.min(maxCabH(c, s.ceiling), Math.round(patch.h)));
          if (c.corner) {
            if (d == null) return Object.keys(p).length ? { ...c, ...p } : c;
            if (c.cornerShape === "outer") return seatOuterCorner({ ...c, ...p, armDepth: d }, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.cabs);
            return seatCorner({ ...c, ...p, armDepth: d }, s.roomPoints, s.waterWall, s.runLayout, s.openings);
          }
          if (d != null) p.depth = d;
          return Object.keys(p).length ? { ...c, ...p } : c;
        });
        const anyBase = s.cabs.some((c) => ids.has(c.id) && c.kind === "base");
        const withCounter = patch.h != null && anyBase ? (setBasesH(next, patch.h) ?? next) : next;
        if (withCounter === s.cabs) return {};
        return live ? { cabs: withCounter } : { ...cabHist(s), cabs: withCounter };
      }),
    equalizeSelected: () =>
      set((s) => {
        const ids = new Set(s.selIds);
        const picked = s.cabs.filter((c) => ids.has(c.id) && c.cell && c.px == null);
        if (picked.length < 2) return {};
        const run = picked[0].run ?? 0;
        if (picked.some((c) => (c.run ?? 0) !== run)) return {};
        const g = s.grids[run];
        if (!g) return {};
        const locs = picked.map((c) => ({ c, loc: locate(g, c.cell!) }));
        if (locs.some((l) => l.loc.j < 0 || l.loc.i < 0)) return {};
        const j = locs[0].loc.j;
        if (locs.some((l) => l.loc.j !== j)) return {};
        const ranges = locs.map((l) => [l.loc.i, l.loc.i + (l.c.cell!.cs ?? 1) - 1] as [number, number]).sort((a, b) => a[0] - b[0]);
        let i0 = ranges[0][0];
        let i1 = ranges[0][1];
        for (let k = 1; k < ranges.length; k++) { if (ranges[k][0] !== i1 + 1) return {}; i1 = ranges[k][1]; }
        const next = equalizeSpan(g, j, i0, i1);
        if (!next) return {};
        const res = editSheet(s.cabs, next);
        if (!res) return {};
        return { ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs };
      }),
    patchCab: (i, patch) =>
      set((s) => ({ ...cabHist(s), cabs: s.cabs.map((c, j) => (j === i ? { ...c, ...patch } : c)) })),
    patchCabLive: (i, patch) =>
      set((s) => ({ cabs: s.cabs.map((c, j) => (j === i ? { ...c, ...patch } : c)) })),
    // ---- carcass merge / hangers ----
    toggleSeam: (leftId, rightId) =>
      set((s) => {
        const a = s.cabs.find((c) => c.id === leftId);
        if (!a) return {};
        const joined = !!a.carcassGroup && a.carcassGroup === s.cabs.find((c) => c.id === rightId)?.carcassGroup;
        const next = joined ? splitSeam(s.cabs, leftId, rightId) : joinSeam(s.cabs, leftId, rightId);
        return next ? { ...cabHist(s), cabs: healCarcassGroups(next) } : {};
      }),
    toggleHangerAt: (id, pos) =>
      set((s) => {
        const ref = s.cabs.find((c) => c.id === id);
        if (!ref) return {};
        const box = ref.carcassGroup ? boxMates(s.cabs, ref) : [ref];
        const now = hangersOn(box, s.settings.hangingsPerCarcass, s.settings.hangingSpanMm);
        const at = Math.round(pos);
        const next = now.includes(at) ? now.filter((p) => p !== at) : [...now, at].sort((a, b) => a - b);
        const ids = new Set(box.map((c) => c.id));
        return { ...cabHist(s), cabs: s.cabs.map((c) => (ids.has(c.id) ? { ...c, hangPos: next } : c)) };
      }),
    resetHangers: (id) =>
      set((s) => {
        const ref = s.cabs.find((c) => c.id === id);
        if (!ref) return {};
        const box = ref.carcassGroup ? boxMates(s.cabs, ref) : [ref];
        const ids = new Set(box.map((c) => c.id));
        return {
          ...cabHist(s),
          cabs: s.cabs.map((c) => {
            if (!ids.has(c.id)) return c;
            const { hangPos: _drop, ...rest } = c;
            return rest as Cabinet;
          }),
        };
      }),
    toggleCarcassMerge: (id) =>
      set((s) => {
        const ref = s.cabs.find((c) => c.id === id);
        if (!ref) return {};
        const next = ref.carcassGroup ? unmergeRow(s.cabs, ref) : mergeRow(s.cabs, ref);
        return next ? { ...cabHist(s), cabs: next } : {};
      }),
    // ---- the dimension edit (height/depth), апплай-ко-всему-ряду ----
    patchCabDims: (id, patch, live = false) =>
      set((s) => {
        const ref = s.cabs.find((c) => c.id === id);
        if (!ref) return {};
        const d = patch.depth != null ? Math.max(D_MIN, Math.min(D_MAX, Math.round(patch.depth))) : null;
        const depthTargets =
          d != null && ref.kind === "upper" && inSheet(ref)
            ? new Set(
                s.cabs
                  .filter((c) => c.kind === "upper" && inSheet(c) && (c.run ?? 0) === (ref.run ?? 0) && bandsOverlap(c, ref))
                  .map((c) => c.id),
              )
            : new Set<string>([ref.id]);
        const next = s.cabs.map((c) => {
          const isRef = c.id === ref.id;
          const setDepth = d != null && depthTargets.has(c.id);
          if (!isRef && !setDepth) return c;
          const p: Partial<Cabinet> = {};
          if (isRef && patch.h != null && c.kind !== "base") p.h = Math.max(MIN_H, Math.min(maxCabH(c, s.ceiling), Math.round(patch.h)));
          if (c.corner) {
            if (!isRef || d == null) return Object.keys(p).length ? { ...c, ...p } : c;
            const withArm = { ...c, ...p, armDepth: d };
            if (c.cornerShape === "outer") return seatOuterCorner(withArm, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.cabs);
            return seatCorner(withArm, s.roomPoints, s.waterWall, s.runLayout, s.openings);
          }
          if (setDepth) p.depth = d;
          return Object.keys(p).length ? { ...c, ...p } : c;
        });
        const withCounter =
          patch.h != null && ref.kind === "base" ? (setBasesH(next, patch.h) ?? next) : next;
        if (withCounter === s.cabs) return {};
        return live ? { cabs: withCounter } : { ...cabHist(s), cabs: withCounter };
      }),
    applyFinishToAll: (finish) =>
      set((s) => ({ ...cabHist(s), cabs: s.cabs.map((c) => ({ ...c, finish: { ...c.finish, ...finish } })) })),
    setRunMaterial: (key, id) =>
      set((s) => ({ runMaterials: { ...s.runMaterials, [key]: id } })),
    patchAllCabs: (patch) =>
      set((s) => ({ ...cabHist(s), cabs: s.cabs.map((c) => ({ ...c, ...patch })) })),
    // ---- add / fill / save / remove a module ----
    addCab: (tpl, preferredRun, topBand) => {
      const s = get();
      const cab = mk({ ...styleOf(s.cabs, tpl.kind), ...tpl });
      if (cab.kind === "base") {
        const baseH = s.cabs.find((c) => c.kind === "base")?.h;
        if (baseH != null) cab.h = baseH;
      }
      if (topBand) {
        const L = resolveLayout(s.cabs, { points: s.roomPoints, waterWall: s.waterWall, layout: s.runLayout, openings: s.openings, reveal: s.reveal });
        const rows = wallRows(L.elevation(preferredRun ?? 0));
        const top = rows[rows.length - 1];
        if (top) {
          const first = s.cabs.find((c) => c.id === top.ids[0]);
          cab.mountY = top.y0;
          cab.h = top.y1 - top.y0;
          const armDepth = first ? cabDepth(first) : FOOT_DEPTH_MM.upper;
          cab.armDepth = armDepth;
          const side = cornerSideFor(armDepth);
          if (cab.corner) { cab.w = side; cab.depth = side; }
          else cab.depth = armDepth;
        }
      }
      let placed: Cabinet | null = null;
      if (!cab.corner && !cab.furniture && !cab.island) {
        const runs = planRuns(s.roomPoints, s.waterWall, s.runLayout, s.openings, s.cabs, s.reveal).runs;
        const order =
          preferredRun != null && preferredRun >= 0 && preferredRun < runs.length
            ? [preferredRun, ...runs.map((_, i) => i).filter((i) => i !== preferredRun)]
            : runs.map((_, i) => i);
        for (const r of order) {
          if (runs[r].kind !== "wall") continue;
          const x = firstFitX(s.cabs, r, cab, runs[r].len, cab.w);
          if (x != null) {
            placed = { ...cab, run: r, x };
            break;
          }
        }
      }
      if (!placed) {
        const b = polygonBoundsMm(s.roomPoints);
        const atCenter = { ...cab, px: b.cx, pz: b.cy, rot: cab.rot ?? 0 };
        const rowDepth = s.cabs.find((k) => k.kind === cab.kind && !k.corner && !k.island && !k.furniture)?.depth;
        placed = !cab.corner
          ? atCenter
          : cab.cornerShape === "outer"
            ? seatOuterCorner({ ...atCenter, armDepth: cab.armDepth ?? rowDepth }, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.cabs)
            : seatCorner(atCenter, s.roomPoints, s.waterWall, s.runLayout, s.openings);
      }
      const nextCabs = cab.corner && cab.cornerShape !== "outer"
        ? reanchorAfterCorner(s.cabs, [...s.cabs, placed], s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal)
        : [...s.cabs, placed];
      set({ ...cabHist(s), cabs: nextCabs, selIdx: s.cabs.length, selIds: [placed.id] });
      return placed.id;
    },
    fillCabGap: (id) =>
      set((s) => {
        const i = s.cabs.findIndex((c) => c.id === id);
        if (i < 0) return {};
        const docked = dockAll(s.cabs, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal);
        const cab = docked[i];
        if (cab.x == null || cab.px != null) return {};
        const runLen = planRuns(s.roomPoints, s.waterWall, s.runLayout, s.openings, s.cabs, s.reveal).runs[cab.run ?? 0]?.len ?? Infinity;
        const span = fillGapSpan(docked, cab, runLen);
        if (!span) return {};
        const filled = { ...cab, x: span.x, w: span.w };
        return { ...cabHist(s), cabs: s.cabs.map((c, j) => (j === i ? filled : c)) };
      }),
    saveCab: (cabId, name, scope) => {
      const s = get();
      const cab = s.cabs.find((c) => c.id === cabId);
      if (!cab) return;
      const thumb = captureCabinetThumbnail(cab, s.runStyle);
      const item = addSavedCab(stripCab(cab), name, thumb);
      // 🔒 «В проект» (Local): bind the saved block to THIS project (the «Локальные» section). Default is
      // «Мои шкафы» (mine — all my projects). The all-USERS «Global» tier is the server (not built) — never here.
      if (scope === "project" && s.currentProjectId) setCabScope(item.id, "project", s.currentProjectId);
      if (s.authUser) void pushSavedCab(s.authUser.id, item);
      set((st) => ({ savedCabsRev: st.savedCabsRev + 1 }));
    },
    removeSavedCab: (id) => {
      removeSavedCabLS(id);
      if (get().authUser) void deleteSavedCabCloud(id);
      set((s) => ({ savedCabsRev: s.savedCabsRev + 1 }));
    },
    removeCab: (id) =>
      set((s) => {
        const cabs = s.cabs.filter((c) => c.id !== id);
        return { ...cabHist(s), cabs, selIdx: Math.min(s.selIdx, cabs.length - 1) };
      }),
    // ── THE SHEET (grid ops) ──
    openSheet: (run) =>
      set((s) => {
        const room = { points: s.roomPoints, waterWall: s.waterWall, layout: s.runLayout, openings: s.openings, reveal: s.reveal };
        const next = ensureSheet(s.grids, s.cabs, room, s.ceiling, run);
        return next ?? {};
      }),
    ensureAllWalls: () =>
      set((s) => {
        if (s.runLayout === "all") return {};
        const cabs = remapCabRuns(s.cabs, s.runLayout, "all", s.roomPoints, s.waterWall, s.openings);
        return { cabs, runLayout: "all" };
      }),
    gridSetColW: (run, rowId, i, mm, live) =>
      set((s) => {
        const g = s.grids[run];
        const j = g ? rowIndex(g, rowId) : -1;
        if (!g || j < 0) return {};
        const res = editSheet(s.cabs, setColWidth(g, j, i, mm));
        if (!res) return {};
        const next = { grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs };
        return live ? next : { ...cabHist(s), ...next };
      }),
    gridAddCol: (run, rowId) =>
      set((s) => {
        const g0 = s.grids[run];
        if (!g0) return {};
        const g = reconcileTalls(g0, s.cabs);
        const j = rowIndex(g, rowId);
        if (j < 0) return {};
        const res = editSheet(s.cabs, addColumn(g, j));
        if (!res) return {};
        return { ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs };
      }),
    gridDropCol: (run, rowId) =>
      set((s) => {
        const g0 = s.grids[run];
        if (!g0) return {};
        const g = reconcileTalls(g0, s.cabs);
        const j = rowIndex(g, rowId);
        if (j < 0) return {};
        const next = dropColumn(g, j);
        if (!next) return {};
        const gone = lastFillColId(g.rows[j]);
        const removed = gone ? s.cabs.find((c) => c.cell?.c === gone && c.cell?.r === rowId && (c.run ?? 0) === run) : undefined;
        const cabs = removed ? s.cabs.filter((c) => c.id !== removed.id) : s.cabs;
        const res = editSheet(cabs, next);
        if (!res) return {};
        const selIdx = removed ? Math.min(s.selIdx, res.cabs.length - 1) : s.selIdx;
        return { ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs, selIdx };
      }),
    gridFillReach: (run, rowId, reachIdx) =>
      set((s) => {
        const g = s.grids[run];
        const j = g ? rowIndex(g, rowId) : -1;
        if (!g || j < 0) return {};
        const row = g.rows[j];
        const reach = row.cols[reachIdx];
        if (!reach || !reach.lock || reach.dead || reach.tall) return {};
        const endCorner = !!row.cols[reachIdx + 1]?.dead;
        const startCorner = !!row.cols[reachIdx - 1]?.dead;
        if (!endCorner && !startCorner) return {};
        const startIdx = (c: Cabinet) =>
          c.cell && c.cell.r === rowId && (c.run ?? 0) === run && c.px == null ? locate(g, c.cell).i : -1;
        const spanner = s.cabs.find((c) => {
          const i = startIdx(c);
          return i >= 0 && reachIdx >= i && reachIdx < i + (c.cell!.cs ?? 1);
        });
        let cabs: Cabinet[];
        if (spanner) {
          const i = startIdx(spanner);
          const cs = spanner.cell!.cs ?? 1;
          if (cs <= 1) return {};
          const cell = endCorner
            ? { ...spanner.cell!, cs: cs - 1 }
            : { ...spanner.cell!, c: row.cols[i + 1].id, cs: cs - 1 };
          cabs = s.cabs.map((c) => (c.id === spanner.id ? { ...c, cell } : c));
        } else {
          const nbIdx = endCorner ? reachIdx - 1 : reachIdx + 1;
          const nb = s.cabs.find((c) => {
            const i = startIdx(c);
            const cs = c.cell?.cs ?? 1;
            return i >= 0 && (endCorner ? i + cs - 1 === nbIdx : i === nbIdx);
          });
          if (!nb) return {};
          const cs = nb.cell!.cs ?? 1;
          const cell = endCorner
            ? { ...nb.cell!, cs: cs + 1 }
            : { ...nb.cell!, c: reach.id, cs: cs + 1 };
          cabs = s.cabs.map((c) => (c.id === nb.id ? { ...c, cell } : c));
        }
        const res = editSheet(cabs, g);
        if (!res) return {};
        return { ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs };
      }),
    // ── corner units + rows ──
    addCornerCab: (run, rowId) =>
      set((s) => {
        const room = { points: s.roomPoints, waterWall: s.waterWall, layout: s.runLayout, openings: s.openings, reveal: s.reveal };
        const g = s.grids[run];
        const j = g ? rowIndex(g, rowId) : -1;
        if (!g || j < 0 || g.rows[j].kind !== "wall") return {};
        const ys = rowEdges(g);
        const y0 = ys[j];
        const y1 = ys[j + 1];
        const depth = g.rows[j].depth;
        const side = cornerSideFor(depth);
        const seats = cornerUnits(s.roomPoints, s.waterWall, s.runLayout, s.openings, side);
        if (!seats.length) return {};
        const look = styleOf(s.cabs, "upper");
        const cands = seats.map((cs) =>
          mk({
            ...look, kind: "upper", corner: true,
            px: cs.px, pz: cs.pz, rot: cs.rot, w: cs.w, depth: cs.depth,
            armDepth: depth, h: y1 - y0, mountY: y0, fill: "shelves", count: 1, door: 0, handle: 0, run: 0,
          }),
        );
        const L = resolveLayout([...s.cabs, ...cands], room);
        const onWall = (c: Cabinet) => L.elevation(run).some((rc) => rc.id === c.id);
        const fresh = cands.filter(
          (c) =>
            onWall(c) &&
            !s.cabs.some(
              (e) =>
                e.corner && e.kind === "upper" && Math.abs((e.mountY ?? 0) - y0) < 20 &&
                Math.hypot((e.px ?? 0) - (c.px ?? 0), (e.pz ?? 0) - (c.pz ?? 0)) < 40,
            ),
        );
        if (!fresh.length) return {};
        const withCorners = reanchorAfterCorner(s.cabs, [...s.cabs, ...fresh], s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal);
        return { ...cabHist(s), cabs: withCorners, selIdx: s.cabs.length, selIds: [fresh[0].id] };
      }),
    placeCornerInBand: (run, rowId, tpl) =>
      set((s) => {
        const room = { points: s.roomPoints, waterWall: s.waterWall, layout: s.runLayout, openings: s.openings, reveal: s.reveal };
        const g = s.grids[run];
        const j = g ? rowIndex(g, rowId) : -1;
        if (!g || j < 0 || g.rows[j].kind === "void") return {};
        const ys = rowEdges(g);
        const y0 = ys[j];
        const y1 = ys[j + 1];
        const depth = g.rows[j].depth;
        const isFloor = g.rows[j].kind === "floor";
        const kind: Cabinet["kind"] = isFloor ? (tpl?.kind === "tall" ? "tall" : "base") : "upper";
        const side = cornerSideFor(depth);
        const seats = cornerUnits(s.roomPoints, s.waterWall, s.runLayout, s.openings, side);
        if (!seats.length) return { toast: "В этой кухне нет угла" };
        const look = styleOf(s.cabs, kind);
        const cands = seats.map((cs) =>
          mk({
            ...look, ...tpl, kind, corner: true,
            px: cs.px, pz: cs.pz, rot: cs.rot, w: cs.w, depth: cs.depth,
            armDepth: depth, h: y1 - y0, mountY: y0, run: 0, cell: undefined, x: undefined,
          }),
        );
        const L = resolveLayout([...s.cabs, ...cands], room);
        const onWall = (c: Cabinet) => L.elevation(run).some((rc) => rc.id === c.id);
        const fresh = cands.filter(
          (c) =>
            onWall(c) &&
            !s.cabs.some(
              (e) =>
                e.corner && e.kind === c.kind && Math.abs((e.mountY ?? 0) - y0) < 20 &&
                Math.hypot((e.px ?? 0) - (c.px ?? 0), (e.pz ?? 0) - (c.pz ?? 0)) < 40,
            ),
        );
        if (!fresh.length) return { toast: "Здесь уже стоит угловой шкаф" };
        let combined: Cabinet[] = [...s.cabs, ...fresh];
        for (const fc of fresh) combined = completeCornerL(combined, fc, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal);
        const withCorners = reanchorAfterCorner(s.cabs, combined, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal);
        return { ...cabHist(s), cabs: withCorners, selIdx: s.cabs.length, selIds: [fresh[0].id] };
      }),
    gridSetRowH: (run, j, mm, live) =>
      set((s) => {
        const g = s.grids[run];
        if (!g) return {};
        const res = editSheet(s.cabs, setRowHeight(g, j, mm));
        if (!res) return {};
        let cabs = res.cabs;
        const grids: Grids = { ...s.grids, [run]: res.grid };
        const hung = rehangCorners(cabs, g, res.grid, s.ceiling);
        if (hung) cabs = hung;
        if (g.rows[j].kind === "floor") {
          const fh = res.grid.rows[j].h;
          for (const key of Object.keys(grids)) {
            const r = Number(key);
            if (r === run) continue;
            const og = grids[r];
            const fj = og.rows.findIndex((x) => x.kind === "floor");
            if (fj < 0) continue;
            const r2 = editSheet(cabs, setRowHeight(og, fj, fh));
            if (r2) {
              grids[r] = r2.grid;
              cabs = r2.cabs;
              const h2 = rehangCorners(cabs, og, r2.grid, s.ceiling);
              if (h2) cabs = h2;
            }
          }
          const level = setBasesH(cabs, fh - PLINTH - WORKTOP);
          if (level) cabs = level;
        }
        const next = { grids, cabs };
        return live ? next : { ...cabHist(s), ...next };
      }),
    gridSplitRow: (run, j, atMm, kind) =>
      set((s) => {
        const g = s.grids[run];
        if (!g) return {};
        const res = editSheet(s.cabs, splitRow(g, j, atMm, kind));
        if (!res) return {};
        const cabs = rehangCorners(res.cabs, g, res.grid, s.ceiling) ?? res.cabs;
        return { ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs };
      }),
    gridSetRowKind: (run, j, kind) =>
      set((s) => {
        const g = s.grids[run];
        if (!g) return {};
        const res = editSheet(s.cabs, setRowKind(g, j, kind));
        if (!res) return {};
        const cabs = rehangCorners(res.cabs, g, res.grid, s.ceiling) ?? res.cabs;
        return { ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs };
      }),
    // ── width / fill-wall / cell-add / resize / row-height / add-at ──
    gridSetCabW: (id, w, edge, live) =>
      set((s) => {
        const cab = s.cabs.find((c) => c.id === id);
        const run = cab?.run ?? 0;
        const g = s.grids[run];
        if (!cab?.cell || cab.px != null || !g) return {};
        const { j, i } = locate(g, cab.cell);
        if (j < 0 || i < 0) return {};
        const row = g.rows[j];
        const cs = Math.max(1, cab.cell.cs ?? 1);
        const delta = Math.round(w) - cab.w;
        if (!delta) return {};
        const target = edge === "right" ? i + cs - 1 : i - 1;
        if (target < 0 || target >= row.cols.length) return {};
        const want = edge === "right" ? row.cols[target].w + delta : row.cols[target].w - delta;
        const res = editSheet(s.cabs, setColWidth(g, j, target, want));
        if (!res) return {};
        const next = { grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs };
        return live ? next : { ...cabHist(s), ...next };
      }),
    fillWallRow: (id) =>
      set((s) => {
        const seed = s.cabs.find((c) => c.id === id);
        if (!seed || seed.px != null || !seed.cell) return {};
        const run = seed.run ?? 0;
        const rowId = seed.cell.r;
        const room = { points: s.roomPoints, waterWall: s.waterWall, layout: s.runLayout, openings: s.openings, reveal: s.reveal };
        const look = styleOf(s.cabs, seed.kind);
        const tpl: Partial<Cabinet> = seed.appliance
          ? { kind: seed.kind, fill: "shelves", count: 2, door: 0 }
          : { kind: seed.kind, fill: seed.fill, count: seed.count, door: seed.door, handle: seed.handle, front: frontOf(seed), finish: seed.finish };
        let cabs = s.cabs;
        let grids = s.grids;
        for (let guard = 0; guard < 40; guard++) {
          const g = grids[run];
          const j = g ? rowIndex(g, rowId) : -1;
          if (!g || j < 0) break;
          const L = resolveLayout(cabs, room);
          const cells = openCells(g, j, cabs, L, run, s.ceiling, s.openings, s.fittings);
          if (!cells.length) break;
          const cell = cells[0];
          const cab = mk({ ...look, ...tpl, run, cell: { c: cell.c, r: rowId, cs: cell.cs }, px: undefined, pz: undefined, rot: undefined });
          const res = editSheet([...cabs, cab], g);
          if (!res) break;
          cabs = res.cabs;
          grids = { ...grids, [run]: res.grid };
        }
        if (cabs === s.cabs) return {};
        return { ...cabHist(s), cabs, grids };
      }),
    addCabInCell: (run, cell, tpl) => {
      const s = get();
      const g = s.grids[run];
      const loc = g ? locate(g, cell) : { j: -1, i: -1 };
      if (!g || loc.i < 0) return null;
      // #4 · a cabinet lives ONLY in the carcass ("floor") or a wall band — never in the tsokol/worktop
      // (plinth/worktop) or void blocks, which are structural run-spanning bands, not fillable cells.
      const bandKind = g.rows[loc.j]?.kind;
      if (bandKind !== "floor" && bandKind !== "wall") return null;
      const look = styleOf(s.cabs, (tpl?.kind as Cabinet["kind"]) ?? undefined);
      const cab = mk({ ...look, ...tpl, run, cell, px: undefined, pz: undefined, rot: undefined });
      const res = editSheet([...s.cabs, cab], g);
      if (!res) return null;
      set({ ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs, selIdx: s.cabs.length, selIds: [cab.id] });
      return cab.id;
    },
    addCabInTopVoid: (run, tpl) => {
      const s = get();
      const g = s.grids[run];
      if (!g) return null;
      const ys = rowEdges(g);
      let voidJ = -1;
      for (let j = 0; j < g.rows.length; j++) {
        if (g.rows[j].kind === "void" && ys[j + 1] - ys[j] >= ROW_MIN + 50) voidJ = j;
      }
      if (voidJ < 0) return null;
      const g1 = setRowKind(g, voidJ, "wall");
      if (!g1) return null;
      const row = g1.rows[voidJ];
      const col = row.cols.find((c) => !c.dead && !c.lock);
      if (!col) return null;
      const look = styleOf(s.cabs, (tpl?.kind as Cabinet["kind"]) ?? undefined);
      const cab = mk({ ...look, ...tpl, run, cell: { c: col.id, r: row.id, cs: 1 }, px: undefined, pz: undefined, rot: undefined });
      const res = editSheet([...s.cabs, cab], g1);
      if (!res) return null;
      set({ ...cabHist(s), grids: { ...s.grids, [run]: res.grid }, cabs: res.cabs, selIdx: s.cabs.length, selIds: [cab.id] });
      return cab.id;
    },
    resizeCab: (id, newW, edge, bounds) =>
      set((s) => {
        const cabs = resizeCabs(s.cabs, id, newW, edge, bounds);
        return cabs ? { ...cabHist(s), cabs } : {};
      }),
    resizeCabLive: (id, newW, edge, bounds) =>
      set((s) => {
        const cabs = resizeCabs(s.cabs, id, newW, edge, bounds);
        return cabs ? { cabs } : {};
      }),
    setBaseHeight: (mm) =>
      set((s) => {
        const cabs = setBasesH(s.cabs, mm);
        return cabs ? { ...cabHist(s), cabs } : {};
      }),
    setBaseHeightLive: (mm) =>
      set((s) => {
        const cabs = setBasesH(s.cabs, mm);
        return cabs ? { cabs } : {};
      }),
    setRows: (edits) =>
      set((s) => {
        const cabs = editRows(s.cabs, edits, s.ceiling);
        return cabs ? { ...cabHist(s), cabs } : {};
      }),
    setRowsLive: (edits) =>
      set((s) => {
        const cabs = editRows(s.cabs, edits, s.ceiling);
        return cabs ? { cabs } : {};
      }),
    addCabAt: (tpl, run, x, w) => {
      const s = get();
      const cab = mk({ ...styleOf(s.cabs, tpl.kind), ...tpl });
      if (cab.kind === "base") {
        const baseH = s.cabs.find((c) => c.kind === "base")?.h;
        if (baseH != null) cab.h = baseH;
      }
      const placed: Cabinet = { ...cab, run, x: Math.round(x), w: Math.round(w), px: undefined, pz: undefined, rot: undefined };
      set({ ...cabHist(s), cabs: [...s.cabs, placed], selIdx: s.cabs.length, selIds: [placed.id] });
      return placed.id;
    },
    healRows: () =>
      set((s) => {
        let cabs = s.cabs;
        // 1. a corner unit that was resized no longer fills the zone both walls clear for it, so a
        //    gap opens beside it that nothing can close — restore its structural size and re-seat it
        const corners = healCornerUnits(cabs, s.roomPoints, s.waterWall, s.runLayout, s.openings);
        if (corners) cabs = corners;
        // 2. …and any row that slid INTO a corner zone gets shifted back out of it
        const { runs } = planRuns(s.roomPoints, s.waterWall, s.runLayout, s.openings, cabs, s.reveal);
        const rows = healRunStarts(cabs, (c) => runFloor(runs[c.run ?? 0], cabDepth(c)));
        if (rows) cabs = rows;
        return cabs === s.cabs ? {} : { cabs };
      }),
    dockCab: (id, run, x) =>
      set((s) => ({
        cabs: s.cabs.map((c) =>
          // a CORNER is free by design (the 3D needs px/pz/rot for the diagonal body) — never
          // dock one, it would collapse into a flat box on the wall
          c.id === id && !c.corner && !c.furniture && !c.island
            ? { ...c, run, x: Math.round(x), px: undefined, pz: undefined, rot: undefined }
            : c,
        ),
      })),
    moveCabsX: (updates) =>
      set((s) => ({
        ...cabHist(s),
        cabs: s.cabs.map((c) => {
          const u = updates.find((x) => x.id === c.id);
          // corners + furniture live free (px/pz) and the 3D NEEDS those coords — don't
          // dock/clear them (that made a corner vanish when nudged in the elevation).
          if (!u || c.corner || c.furniture || c.island) return c;
          // Moving a module in the front elevation DOCKS it to that wall: set run-local x (+
          // the wall run) and CLEAR any free transform, so the 3D honours the move instead of
          // keeping the old px/pz (which made a dragged free cab snap back).
          return {
            ...c,
            x: u.x,
            ...(u.run != null ? { run: u.run } : {}),
            px: undefined,
            pz: undefined,
            rot: undefined,
            ...(u.mountY != null ? { mountY: u.mountY } : {}),
          };
        }),
      })),
    // Dragging a module out into the room takes it OFF the sheet and onto the floating layer — so it
    // SURRENDERS ITS CELL. (Excel does the same when you drag a cell's content out onto the canvas: it
    // stops being a cell and becomes a shape.) Without this it kept squatting on a cell it no longer
    // stood in, the "+" under it never came back, and the grid went on rewriting the x/w of a module
    // that is now positioned by px/pz. Re-dock it and `sheet.adopt` gives it a fresh address.
    moveCabPlan: (id, patch) =>
      set((s) => ({
        cabs: s.cabs.map((c) => {
          if (c.id !== id) return c;
          const next: Cabinet = { ...c, ...patch, cell: patch.px != null || patch.pz != null ? undefined : c.cell };
          // An OUTER (reverse-L) corner is positioned by hand: as it's dragged / rotated, keep its open
          // faces pointing "forward" (the +u,+i local corner) so the L stays oriented with the user's
          // grab instead of snapping back to whatever it was seated toward.
          //
          // …unless the gesture SEATED it (a drag onto a reflex vertex — the L-room elbow this shape
          // exists to wrap). The seat knows which way the room is; deriving the facing from the
          // rotation instead would only be right by accident.
          if (patch.cornerFace) return next;
          if (isOuterCorner(next) && (patch.rot != null || patch.px != null || patch.pz != null)) {
            const r = ((next.rot ?? 0) * Math.PI) / 180;
            const fx = Math.cos(r) - Math.sin(r); // (u + i) direction in world
            const fy = Math.sin(r) + Math.cos(r);
            next.cornerFace = { x: Math.round((next.px ?? 0) + fx * 2000), y: Math.round((next.pz ?? 0) + fy * 2000) };
          }
          return next;
        }),
      })),
    duplicateCab: (id) => {
      const s = get();
      const src = s.cabs.find((c) => c.id === id);
      if (!src) return null;
      // drop the copy into the first gap in its row that fits (so duplicating fills
      // empty space directly), else at the row end — never overlapping a sibling
      const { id: _drop, ...rest } = src;
      void _drop;
      const dup = mk({ ...rest, x: src.x != null ? parkX(s.cabs, src, src.w) : undefined });
      set({ ...cabHist(s), cabs: [...s.cabs, dup], selIdx: s.cabs.length, selIds: [dup.id] });
      return dup.id;
    },
    replaceCab: (id, tpl) =>
      set((s) => {
        const i = s.cabs.findIndex((c) => c.id === id);
        if (i < 0) return {};
        const old = s.cabs[i];
        const tiled = isTiled(old); // sits in a run slot vs free-floating
        const base = mk(tpl);
        const sameKind = base.kind === old.kind;
        // A SWAP CHANGES WHAT A MODULE IS, NOT HOW BIG IT IS. This used to take the template's
        // size, so swapping a base for another base reset its carcass height and left a step in
        // the worktop. Keep the module's own dimensions whenever the swap stays in the same kind.
        const h = sameKind
          ? old.h
          : base.kind === "base"
            ? // changing kind INTO a base → adopt the kitchen's counter height, not the template's,
              // so the worktop stays level
              (s.cabs.find((c) => c.kind === "base" && c.id !== id)?.h ?? base.h)
            : base.h;
        // A SWAP CHANGES WHAT A MODULE IS, NOT WHAT IT LOOKS LIKE.
        //
        // A catalog template says "drawer bank" or "sink base"; it almost never says which front
        // profile or handle the kitchen uses, so `mk()` filled those with its own defaults and the
        // swapped module came out flat-fronted and bar-handled in a fluted, knob-handled run. The user
        // then had to restyle it by hand to put back what it should never have lost.
        //
        // Read the look off the module being REPLACED — by definition it already matches its
        // neighbours. `tpl.X ?? old.X` and not `base.X ?? old.X`, because `base` has been through mk()
        // and its defaults are indistinguishable from a deliberate choice. Only a template that
        // EXPLICITLY sets a field (the hood, which has no front and no handle) overrides the kitchen.
        let next: Cabinet = {
          ...base,
          front: tpl.front ?? frontOf(old),
          handle: tpl.handle ?? old.handle,
          door: tpl.door ?? old.door,
          handlePos: tpl.handlePos ?? old.handlePos,
          opening: tpl.opening ?? old.opening,
          id: old.id, // keep the id so the selection stays valid
          run: old.run,
          cell: old.cell, // it stays in the same cell — the grid still owns its geometry
          x: old.x,
          px: old.px,
          pz: old.pz,
          rot: old.rot,
          // a wall unit keeps the height it was hung at; anything else re-derives its band
          mountY: base.kind === "upper" && old.kind === "upper" ? old.mountY : undefined,
          w: tiled ? old.w : base.w, // tiled → keep the slot width; free → take the new size
          h,
          depth: sameKind ? old.depth : base.depth,
          finish: { ...old.finish, ...tpl.finish },
        };
        // Same rule, applied to a CORNER's size: its square and its seat are not free numbers, they
        // follow from the depth of the runs beside it. Swapping the BODY (diagonal ↔ L) must not throw
        // that away — without this the swap took the template's default arm depth and left `w` and
        // `depth` disagreeing with each other.
        // OUTER (convex) end cap: a different seating from an inner corner — it caps the exposed run end
        // nearest the module, keeps the run's own depth, and reserves NOTHING (no complete-the-L, no
        // re-anchor). Without this branch a swap-to-outer fell through to inner seating and jumped the
        // unit to a wall vertex at the big 840 square — "can't convert to an outer corner".
        if (next.corner && next.cornerShape === "outer") {
          const foot = cabFootprints([old], s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal)[0];
          const seed = foot ? { px: foot.cx, pz: foot.cy } : {};
          const seated = seatOuterCorner(
            { ...next, ...seed, cell: undefined, x: undefined, run: 0, armDepth: old.armDepth ?? cabDepth(old) },
            s.roomPoints, s.waterWall, s.runLayout, s.openings, s.cabs,
          );
          return { ...cabHist(s), cabs: s.cabs.map((c, j) => (j === i ? seated : c)) };
        }
        if (next.corner) {
          // The constructor runs in the "all" shape — a run on EVERY wall — so every inside corner of
          // the room already exists. Turning a module into a corner just SEATS it at the nearest one;
          // there is no layout to grow (that old grow/remap dance was for the retired i/l/u constructor
          // and only corrupted things here). Seed at the module's true world position so it seats at the
          // corner beside IT, not the one nearest the room origin.
          const seats = cornerUnits(s.roomPoints, s.waterWall, s.runLayout, s.openings);
          if (!seats.length) return { toast: "В этой комнате нет угла" }; // a single-wall room has none
          const foot = cabFootprints([old], s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal)[0];
          const seed = foot ? { px: foot.cx, pz: foot.cy } : {};
          const seated = seatCorner(
            { ...next, ...seed, cell: undefined, x: undefined, run: 0, armDepth: old.armDepth ?? base.armDepth },
            s.roomPoints, s.waterWall, s.runLayout, s.openings,
          );
          // that corner already holds a same-kind corner unit AT THIS HEIGHT → a second one just goes red.
          // Refuse. The `mountY` guard is what lets a corner stack: an antresol (3rd-row) corner sits at
          // the same wall corner as the upper corner below it, so without it the height check reads the
          // lower corner as "occupied" and blocked every corner in the 3rd row (matches addCornerCab).
          const occupied = s.cabs.some(
            (c) => c.id !== id && c.corner && c.kind === seated.kind &&
              Math.abs((c.mountY ?? 0) - (seated.mountY ?? 0)) < 20 &&
              Math.hypot((c.px ?? 0) - (seated.px ?? 0), (c.pz ?? 0) - (seated.pz ?? 0)) < 60,
          );
          if (occupied) return { toast: "У этого угла уже есть угловой шкаф" };
          next = seated;
        }
        const swapped = s.cabs.map((c, j) => (j === i ? next : c));
        // COMPLETE THE L: turning one band into a corner converts the nearest OTHER-band cabinet at that
        // vertex into a corner too (see completeCornerL) — otherwise a lone upper corner mangles the end
        // base, and a lone base corner strands the upper reach strip.
        const completed = next.corner ? completeCornerL(swapped, next, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal) : swapped;
        // turning a module into (or out of) a corner can shift its wall's start frame — re-anchor the
        // neighbours so they stay put instead of sliding off the wall (only the touching one shrinks)
        const cabs = !!next.corner !== !!old.corner || completed !== swapped
          ? reanchorAfterCorner(s.cabs, completed, s.roomPoints, s.waterWall, s.runLayout, s.openings, s.reveal)
          : completed;
        return { ...cabHist(s), cabs };
      }),
    setMat: (i) =>
      set((s) => {
        const m = MATERIALS[i] ?? MATERIALS[0];
        return { ...cabHist(s), mat: i, runStyle: { ...s.runStyle, facade: parseInt(m.c.slice(1), 16) } };
      }),
    // continuous gesture (plan drag/rotate uses moveCabPlan live) → one snapshot up front
    beginCabEdit: () => set((s) => cabHist(s)),
    undoCab: () =>
      set((s) => {
        if (!s.cabsPast.length) return {};
        const prev = s.cabsPast[s.cabsPast.length - 1];
        return { cabsPast: s.cabsPast.slice(0, -1), cabsFuture: [...s.cabsFuture, cabNow(s)], ...prev };
      }),
    redoCab: () =>
      set((s) => {
        if (!s.cabsFuture.length) return {};
        const nxt = s.cabsFuture[s.cabsFuture.length - 1];
        return { cabsFuture: s.cabsFuture.slice(0, -1), cabsPast: [...s.cabsPast, cabNow(s)], ...nxt };
      }),
    setMode: (mode) => set({ mode }),
  };
}
