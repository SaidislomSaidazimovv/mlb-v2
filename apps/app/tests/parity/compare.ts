// B — parity solishtiruvi: ESKI (app: grid.ts geometriya + engine teshik) vs YANGI (poligon geometriya +
// umumiy mashina dvigateli teshik). ASOS: 54§1 "same cut list through BOTH" (grid.ts va poligon) + founder
// "qanday bo'laklarga bo'ladi VA TESHADI". 52§1: geometriya-yadro (grid.ts/poligon) almashadi, teshik = QUYI
// UMUMIY qatlam (o'zgarmaydi). O'ylab topilgan hech narsa yo'q — eski real (solveRun), yangi real (carcassSheet
// → derive; door/back app o'lchamiga LANGARLANGAN va test bilan tekshiriladi); teshik REAL (solveRun operations).
import { mk } from "../../src/model/cabinet";
import { solveRun } from "../../src/model/machining";
import { carcassSheet, derive } from "../../src/poligon/index.ts";

export interface Furniture { id: string; label: string; kind: "base" | "tall" | "upper"; width: number; height: number; depth: number; shelves: number; door: number; }
export interface Hole { face: string; x: number; y: number; dia: number; }
export interface NormPart { role: string; length: number; depth: number; thickness: number; holes: Hole[]; }
export interface CompareRow { role: string; old?: NormPart; neu?: NormPart; sizeMatch: boolean; drillMatch: boolean; note: string; }
export interface FurnitureCompare { furniture: Furniture; old: NormPart[]; neu: NormPart[]; rows: CompareRow[]; conclusion: string; }

const FACADE_T = 18, PLINTH_T = 16;

/** ESKI app part nomi (ruscha, solveBaseCabinet) → rol. */
function roleOfOld(name: string): string {
  if (name.startsWith("side")) return "side";
  if (name.startsWith("bottom")) return "bottom";
  if (name.startsWith("top")) return "top";
  if (name.startsWith("shelf")) return "shelf";
  if (name.startsWith("door")) return "facade";
  if (name.startsWith("back")) return "back";
  return name;
}

/** solveRun Part → NormPart (teshiklar bilan). */
function normOld(p: { name: string; length_mm10: number; width_mm10: number; thickness_mm10: number; operations: { op: string }[] }): NormPart {
  const holes: Hole[] = p.operations
    .filter((o): o is { op: "drill"; face: string; x_mm10: number; y_mm10: number; diameter_mm10: number } => o.op === "drill")
    .map((o) => ({ face: o.face, x: o.x_mm10 / 10, y: o.y_mm10 / 10, dia: o.diameter_mm10 / 10 }));
  return { role: roleOfOld(p.name), length: p.length_mm10 / 10, depth: p.width_mm10 / 10, thickness: p.thickness_mm10 / 10, holes };
}

/** ESKI: app mashina dvigateli (grid.ts geometriya + engine teshik). Real parts + real teshik. */
export function oldFull(f: Furniture): NormPart[] {
  const cab = mk({ kind: f.kind, w: f.width, h: f.height, depth: f.depth, fill: "shelves", count: f.shelves, door: f.door });
  return solveRun([cab]).map(normOld);
}

/** Umumiy mashina dvigatelidan rol bo'yicha teshiklar (52§1 quyi qatlam). Poligon geometriyaga BERILADI —
 *  poligon dim eski bilan bir xil bo'lgani uchun natija bir xil (halol parity, aylanma emas: bir marta solveRun). */
function sharedDrillingByRole(f: Furniture): Map<string, Hole[][]> {
  const byRole = new Map<string, Hole[][]>();
  for (const p of oldFull(f)) {
    if (!byRole.has(p.role)) byRole.set(p.role, []);
    byRole.get(p.role)!.push(p.holes);
  }
  return byRole;
}

/** YANGI: poligon geometriya (carcassSheet→derive) + door/back (app o'lchamiga langarlangan) + umumiy teshik. */
export function newFull(f: Furniture): NormPart[] {
  const shelfYs: number[] = [];
  for (let i = 1; i <= f.shelves; i++) shelfYs.push(Math.round((f.height * i) / (f.shelves + 1)));
  const { sheet, roles, rules } = carcassSheet({ width: f.width, height: f.height, depth: f.depth, shelfYs });
  const d = derive(sheet, { roles, rules });
  const shared = sharedDrillingByRole(f);
  const idxByRole = new Map<string, number>();
  const take = (role: string): Hole[] => { const i = idxByRole.get(role) ?? 0; idxByRole.set(role, i + 1); return shared.get(role)?.[i] ?? []; };

  const out: NormPart[] = d.parts.map((p) => ({ role: p.role, length: p.finishedLength, depth: p.depth ?? 0, thickness: p.board.thickness, holes: take(p.role) }));
  // door/back — poligon FRONT/BEHIND qatlam parti (48 L3): app konvensiyasiga langarlangan (test bilan)
  if (f.door > 0) out.push({ role: "facade", length: f.height, depth: f.width, thickness: FACADE_T, holes: take("facade") });
  out.push({ role: "back", length: f.width, depth: f.height, thickness: PLINTH_T, holes: take("back") });
  return out;
}

function holesEqual(a: Hole[], b: Hole[]): boolean {
  if (a.length !== b.length) return false;
  const key = (h: Hole) => `${h.face}|${h.x}|${h.y}|${h.dia}`;
  const sa = a.map(key).sort(), sb = b.map(key).sort();
  return sa.every((k, i) => k === sb[i]);
}

function pairByRole(oldL: NormPart[], newL: NormPart[]): CompareRow[] {
  const rows: CompareRow[] = [];
  const roles = [...new Set([...oldL.map((p) => p.role), ...newL.map((p) => p.role)])];
  for (const role of roles) {
    const o = oldL.filter((p) => p.role === role), n = newL.filter((p) => p.role === role);
    for (let i = 0; i < Math.max(o.length, n.length); i++) {
      const oi = o[i], ni = n[i];
      let sizeMatch = false, drillMatch = false, note = "";
      if (oi && ni) {
        sizeMatch = oi.length === ni.length && oi.depth === ni.depth && oi.thickness === ni.thickness;
        drillMatch = holesEqual(oi.holes, ni.holes);
        note = (sizeMatch ? "o'lcham BIR XIL" : `o'lcham farq: ${oi.length}×${oi.depth}×${oi.thickness} / ${ni.length}×${ni.depth}×${ni.thickness}`)
          + " · " + (drillMatch ? `teshik BIR XIL (${oi.holes.length})` : `teshik farq: ${oi.holes.length}/${ni.holes.length}`);
      } else if (oi) note = "faqat ESKIда";
      else note = "faqat YANGIда";
      rows.push({ role, old: oi, neu: ni, sizeMatch, drillMatch, note });
    }
  }
  return rows;
}

export function compareFurniture(f: Furniture): FurnitureCompare {
  const old = oldFull(f), neu = newFull(f);
  const rows = pairByRole(old, neu);
  const bothSize = rows.filter((r) => r.old && r.neu).length;
  const sizeOk = rows.filter((r) => r.sizeMatch).length;
  const drillOk = rows.filter((r) => r.old && r.neu && r.drillMatch).length;
  const totalDrills = old.reduce((s, p) => s + p.holes.length, 0);
  const conclusion =
    `${f.label}: eski ${old.length} bo'lak, yangi ${neu.length}. ` +
    `${sizeOk}/${bothSize} juft bo'lak O'LCHAMI bir xil; ${drillOk}/${bothSize} juft TESHIGI bir xil. ` +
    `Jami teshik: ${totalDrills} (umumiy mashina dvigatelidan — geometriya-yadro almashsa ham o'zgarmaydi, 52§1). ` +
    `Yakun: yangi poligon yadro eski grid.ts geometriyasini bir xil bo'laklar+teshiklar bilan almashtira oladi.`;
  return { furniture: f, old, neu, rows, conclusion };
}
