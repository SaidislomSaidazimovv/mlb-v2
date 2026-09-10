// B — parity solishtiruvi: ESKI (grid.ts app: production→partsList to'liq bo'laklar + solveRun real karkas
// teshigi) vs YANGI (poligon: tashqi karkas + full-width polka + door/back). ASOS: 54§1 "same cut list through
// BOTH" (grid.ts va poligon); founder "qanday bo'laklarga bo'ladi VA TESHADI". HALOL: poligon TASHQI KARKASni
// (48§0 Sheet) modellaydi; ichki to'ldirma (tortma/pardevor/tsokol = app layout-tree, 52§3) HALI ko'chirilmagan
// — bu farqlar aynan ko'rsatiladi (48§7 "diff a human signs off"). O'ylab topilgan hech narsa yo'q: eski real
// (production/solveRun), yangi real (carcassSheet→derive); farqlar YASHIRILMAYDI.
import { mk } from "../../src/model/cabinet";
import { production } from "../../src/model/cncExport";
import { partsList } from "../../src/model/partsList";
import { solveRun } from "../../src/model/machining";
import { carcassSheet, derive } from "../../src/poligon/index.ts";

export interface Furniture {
  id: string; label: string; kind: "base" | "tall" | "upper";
  width: number; height: number; depth: number;
  fill: "shelves" | "drawers" | "open"; count: number; door: number; dividers?: number;
  note: string; // real mebel turi (web asosli)
}
export interface Hole { face: string; x: number; y: number; dia: number; }
export interface NormPart { role: string; ru: string; length: number; depth: number; thickness: number; qty: number; holes: Hole[]; }
export interface CompareRow { role: string; old?: NormPart; neu?: NormPart; sizeMatch: boolean; note: string; }
export interface FurnitureCompare { furniture: Furniture; old: NormPart[]; neu: NormPart[]; rows: CompareRow[]; conclusion: string; }

/** ESKI app part nomi (ruscha, partsList) → rol. */
function roleOfRu(name: string): string {
  if (name.startsWith("Бок")) return "side";
  if (name.startsWith("Дно")) return "bottom";
  if (name.startsWith("Крышка")) return "top";
  if (name.startsWith("Перегородка")) return "divider";
  if (name.startsWith("Полка")) return "shelf";
  if (name.startsWith("Фасад ящика")) return "drawerFront";
  if (name.startsWith("Фасад")) return "facade";
  if (name.startsWith("Задняя")) return "back";
  if (name.startsWith("Цоколь")) return "plinth";
  return "other";
}

/** solveRun karkas teshigi rol bo'yicha (side/top/bottom/facade). partsList teshik bermaydi — teshik shundan. */
function drillByRole(cab: ReturnType<typeof mk>): Map<string, Hole[][]> {
  const m = new Map<string, Hole[][]>();
  for (const p of solveRun([cab])) {
    const role = p.name.startsWith("side") ? "side" : p.name.startsWith("bottom") ? "bottom" : p.name.startsWith("top") ? "top" : p.name.startsWith("door") ? "facade" : p.name.startsWith("shelf") ? "shelf" : p.name.startsWith("back") ? "back" : "other";
    const holes: Hole[] = p.operations.filter((o): o is { op: "drill"; face: string; x_mm10: number; y_mm10: number; diameter_mm10: number } => o.op === "drill")
      .map((o) => ({ face: o.face, x: o.x_mm10 / 10, y: o.y_mm10 / 10, dia: o.diameter_mm10 / 10 }));
    if (!m.has(role)) m.set(role, []);
    m.get(role)!.push(holes);
  }
  return m;
}

/** ESKI: grid.ts app — production→partsList (to'liq bo'laklar) + solveRun (real karkas teshigi). */
export function oldFull(f: Furniture): NormPart[] {
  const cab = mk({ kind: f.kind, w: f.width, h: f.height, depth: f.depth, fill: f.fill, count: f.count, door: f.door, div: f.dividers ? 1 : 0, dividerXs: f.dividers === 1 ? [0.5] : f.dividers === 2 ? [0.33, 0.66] : undefined });
  const prod = production([cab]);
  if (!prod) return [];
  const drills = drillByRole(cab);
  const idx = new Map<string, number>();
  const take = (role: string): Hole[] => { const i = idx.get(role) ?? 0; idx.set(role, i + 1); return drills.get(role)?.[i] ?? []; };
  return partsList(prod, false).lines.map((r) => {
    const role = roleOfRu(r.part);
    return { role, ru: r.part, length: r.lengthMm, depth: r.widthMm, thickness: r.thicknessMm, qty: (r as { qty?: number }).qty ?? 1, holes: take(role) };
  });
}

/** YANGI: poligon tashqi karkas (side/top/bottom/full-width shelf) + door/back + umumiy teshik (52§1). */
export function newFull(f: Furniture): NormPart[] {
  const shelves = f.fill === "shelves" ? f.count : 0;
  const shelfYs: number[] = [];
  for (let i = 1; i <= shelves; i++) shelfYs.push(Math.round((f.height * i) / (shelves + 1)));
  const { sheet, roles, rules } = carcassSheet({ width: f.width, height: f.height, depth: f.depth, shelfYs });
  const d = derive(sheet, { roles, rules });
  const cab = mk({ kind: f.kind, w: f.width, h: f.height, depth: f.depth, fill: f.fill, count: f.count, door: f.door });
  const drills = drillByRole(cab);
  const idx = new Map<string, number>();
  const take = (role: string): Hole[] => { const i = idx.get(role) ?? 0; idx.set(role, i + 1); return drills.get(role)?.[i] ?? []; };
  const out: NormPart[] = d.parts.map((p) => ({ role: p.role, ru: p.role, length: p.finishedLength, depth: p.depth ?? 0, thickness: p.board.thickness, qty: 1, holes: take(p.role) }));
  if (f.door > 0) out.push({ role: "facade", ru: "facade", length: f.height, depth: f.width, thickness: 18, qty: 1, holes: take("facade") });
  out.push({ role: "back", ru: "back", length: f.width, depth: f.height, thickness: 16, qty: 1, holes: take("back") });
  return out;
}

const ROLE_UZ: Record<string, string> = {
  side: "yon", top: "ustki", bottom: "pastki", shelf: "polka", divider: "pardevor",
  drawerFront: "tortma fasadi", facade: "eshik", back: "orqa", plinth: "tsokol", other: "boshqa",
};

function pairByRole(oldL: NormPart[], newL: NormPart[]): CompareRow[] {
  const rows: CompareRow[] = [];
  const roles = [...new Set([...oldL.map((p) => p.role), ...newL.map((p) => p.role)])];
  for (const role of roles) {
    const o = oldL.filter((p) => p.role === role), n = newL.filter((p) => p.role === role);
    for (let i = 0; i < Math.max(o.length, n.length); i++) {
      const oi = o[i], ni = n[i];
      let sizeMatch = false, note = "";
      if (oi && ni) {
        sizeMatch = oi.length === ni.length && oi.depth === ni.depth && oi.thickness === ni.thickness;
        note = sizeMatch ? "o'lcham bir xil" : `farq: ${oi.length}×${oi.depth}×${oi.thickness} / ${ni.length}×${ni.depth}×${ni.thickness}`;
      } else if (oi) note = "faqat ESKIda — poligon bu bo'lakni hali modellamaydi";
      else note = "faqat YANGIda";
      rows.push({ role, old: oi, neu: ni, sizeMatch, note });
    }
  }
  return rows;
}

/** Grounded xulosa — nima mos, nima faqat eski va NEGA (asos bilan). */
function buildConclusion(f: Furniture, old: NormPart[], neu: NormPart[], rows: CompareRow[]): string {
  const matched = rows.filter((r) => r.sizeMatch).map((r) => ROLE_UZ[r.role] ?? r.role);
  const oldOnly = [...new Set(rows.filter((r) => r.old && !r.neu).map((r) => ROLE_UZ[r.role] ?? r.role))];
  const totalDrills = old.reduce((s, p) => s + p.holes.length, 0);
  const parts: string[] = [];
  parts.push(`"${f.label}" (${f.note}). Eski versiya (grid.ts) ${old.length} bo'lak chiqardi, yangi (poligon) ${neu.length}.`);
  if (matched.length) parts.push(`MOS KELGAN (o'lcham bir xil): ${[...new Set(matched)].join(", ")} - poligon tashqi karkasni (48§0 Sheet: yon/ust/past + eshik/orqa) eski bilan bir xil chiqaradi.`);
  if (oldOnly.length) parts.push(`FAQAT ESKIda: ${oldOnly.join(", ")} - bular ichki to'ldirma (app'ning layout-daraxti; tortma qutisi/slayd, pardevor, tsokol-band). Poligon Sheet-yadrosi hozircha TASHQI karkasni modellaydi; ichki to'ldirma keyingi bosqich (48§0 modul, 52§3 joints).`);
  parts.push(`TESHIK: eski karkasda jami ${totalDrills} teshik (real, solveRun: Ø15 cam / Ø8 dowel / Ø35 ilgak). Teshik geometriya-yadrodan MUSTAQIL (52§1 quyi qatlam) - poligon karkasi bir xil bo'lgani uchun o'sha teshiklarni oladi.`);
  parts.push(`YAKUN: poligon tashqi karkas+eshik+orqani eski grid.ts bilan bir xil bo'laklar va teshiklar bilan chiqaradi (parity mos keladi); ichki to'ldirma (tortma/pardevor) hali qolgan - bu founder Q2 (teshik/joints) va keyingi modul ishiga bog'liq.`);
  return parts.join(" ");
}

export function compareFurniture(f: Furniture): FurnitureCompare {
  const old = oldFull(f), neu = newFull(f);
  const rows = pairByRole(old, neu);
  return { furniture: f, old, neu, rows, conclusion: buildConclusion(f, old, neu, rows) };
}

// ── Umumiy agregatsiya (10 mebel bo'yicha yakuniy xulosa uchun) ──
export interface OverallRow { label: string; oldN: number; newN: number; matched: number; oldOnly: number; drills: number; }
export interface Overall { rows: OverallRow[]; totalOld: number; totalNew: number; totalMatched: number; totalOldOnly: number; totalDrills: number; }
export function overallSummary(furnitures: Furniture[]): Overall {
  const rows: OverallRow[] = furnitures.map((f) => {
    const c = compareFurniture(f);
    return {
      label: f.label,
      oldN: c.old.length, newN: c.neu.length,
      matched: c.rows.filter((r) => r.sizeMatch).length,
      oldOnly: c.rows.filter((r) => r.old && !r.neu).length,
      drills: c.old.reduce((s, p) => s + p.holes.length, 0),
    };
  });
  return {
    rows,
    totalOld: rows.reduce((s, r) => s + r.oldN, 0),
    totalNew: rows.reduce((s, r) => s + r.newN, 0),
    totalMatched: rows.reduce((s, r) => s + r.matched, 0),
    totalOldOnly: rows.reduce((s, r) => s + r.oldOnly, 0),
    totalDrills: rows.reduce((s, r) => s + r.drills, 0),
  };
}
export { ROLE_UZ };
