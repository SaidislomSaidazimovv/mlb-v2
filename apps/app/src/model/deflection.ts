// Shelf deflection (прогиб) gate — 37_MINIMUM_SIZE_GATE §2.3.
//
// A shelf that spans too wide for its board + load sags past the acceptable limit. This
// is the "load-formula minimum": there is no single "too wide" number — fitness is a
// function of span, thickness AND declared load. Pure physics (no I/O), so the editor
// can call it on every gesture tick.
//
//   simply-supported beam, uniformly distributed load:
//     δ = 5·w·L⁴ / (384·E·I)        I = b·h³ / 12
//   gate: 1.5·δ_elastic ≤ L / 240   (1.5 = long-term creep; L/240 = CPA limit)
//
// LOAD q — the founder's decision (2026-08-06): **15 kg per running metre**, and a
// **master may override it per shelf** ("15. Lekin ustalar o'zgartira olsin").
// E: ЛДСП P2 (13–20mm) = 1600, МДФ = 2400 N/mm² (R33 shelf-deflection answer, §2.3).

// ── Blum LEGRABOX drawer minimum interior HEIGHT by class — 37_MINIMUM_SIZE_GATE §2.1 ──
// A drawer zone shorter than its class minimum cannot hold the mechanism (source: Blum Catalogue &
// technical manual 2024-2025, printed p.198, "Overview – applications"). Absent class → N, the
// smallest — every drawer placed before classes existed is an N and keeps its historic 80mm gate.
export type DrawerClass = "N" | "M" | "K";
export const DRAWER_CLASS_MIN_MM: Record<DrawerClass, number> = { N: 80, M: 106, K: 144 };
export const drawerMinMm = (cls?: DrawerClass): number => DRAWER_CLASS_MIN_MM[cls ?? "N"];

export type ShelfBoard = "LDSP" | "MDF";

export const SHELF_DEFLECTION = {
  /** Founder 2026-08-06: 15 kg/m default; a master may override per shelf. */
  defaultLoadKgPerM: 15,
  /** Elastic modulus, N/mm² (R33 / Composite Panel Association). */
  E: { LDSP: 1600, MDF: 2400 } as Record<ShelfBoard, number>,
  /** Acceptable sag = span / 240. */
  limitRatio: 240,
  /** Long-term creep multiplier on the elastic deflection. */
  creep: 1.5,
  /** g, N/kg — turns a kg/m line load into an N/mm one. */
  g: 9.81,
} as const;

export interface ShelfLoadOpts {
  /** kg per running metre; defaults to the founder value. A master override lands here. */
  loadKgPerM?: number;
  /** board material (sets E); defaults to LDSP (the census carcass board). */
  board?: ShelfBoard;
}

/** Line load (N/mm) from a kg-per-running-metre figure. */
function lineLoad(opts: ShelfLoadOpts): number {
  const q = opts.loadKgPerM ?? SHELF_DEFLECTION.defaultLoadKgPerM;
  return (q * SHELF_DEFLECTION.g) / 1000;
}

/** Long-term (creep) deflection of a shelf, in mm. `spanMm` = the free width it spans;
 *  `depthMm` = the board's depth (front-back); `thicknessMm` = the board thickness. */
export function shelfDeflectionMm(
  spanMm: number,
  depthMm: number,
  thicknessMm: number,
  opts: ShelfLoadOpts = {},
): number {
  const E = SHELF_DEFLECTION.E[opts.board ?? "LDSP"];
  const w = lineLoad(opts);
  const I = (depthMm * thicknessMm ** 3) / 12; // mm⁴
  if (I <= 0 || E <= 0) return Infinity;
  const elastic = (5 * w * spanMm ** 4) / (384 * E * I);
  return SHELF_DEFLECTION.creep * elastic;
}

/** The acceptable sag for a span, in mm (span / 240). */
export function shelfDeflectionLimitMm(spanMm: number): number {
  return spanMm / SHELF_DEFLECTION.limitRatio;
}

/** Does the shelf pass the deflection gate? */
export function shelfSpanOk(
  spanMm: number,
  depthMm: number,
  thicknessMm: number,
  opts: ShelfLoadOpts = {},
): boolean {
  return shelfDeflectionMm(spanMm, depthMm, thicknessMm, opts) <= shelfDeflectionLimitMm(spanMm);
}

/** The widest span (mm) that still passes, for a board + load — used for warnings.
 *  Solves 1.5·5wL⁴/(384EI) = L/240 for L. */
export function maxShelfSpanMm(
  depthMm: number,
  thicknessMm: number,
  opts: ShelfLoadOpts = {},
): number {
  const E = SHELF_DEFLECTION.E[opts.board ?? "LDSP"];
  const w = lineLoad(opts);
  const I = (depthMm * thicknessMm ** 3) / 12;
  if (I <= 0 || w <= 0) return Infinity;
  const L3 = (384 * E * I) / (SHELF_DEFLECTION.limitRatio * SHELF_DEFLECTION.creep * 5 * w);
  return Math.cbrt(L3);
}
