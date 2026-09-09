// B — parity solishtiruvi: ESKI versiya (grid.ts pipeline: production→partsList) vs YANGI (poligon).
// ASOS: 54§1 parity gate — "every saved wall derives the same cut list through BOTH" (grid.ts va poligon).
// Founder: "bir xil mebel qanday bo'laklarga bo'ladi va teshadi". Bir xil mebelni ikkalasiga berib solishtiramiz.
// O'ylab topilgan hech narsa yo'q — eski chiqish real (mk→production→partsList), yangi real (carcassSheet→derive).
import { mk } from "../../src/model/cabinet";
import { production } from "../../src/model/cncExport";
import { partsList } from "../../src/model/partsList";
import { carcassSheet, derive } from "../../src/poligon/index.ts";

export interface Furniture { id: string; label: string; kind: "base" | "tall" | "upper"; width: number; height: number; depth: number; shelves: number; }
export interface NormPart { role: string; length: number; depth: number; thickness: number; qty: number; }
export interface CompareRow { role: string; old?: NormPart; neu?: NormPart; match: boolean; note: string; }
export interface FurnitureCompare { furniture: Furniture; old: NormPart[]; neu: NormPart[]; rows: CompareRow[]; conclusion: string; }

/** ESKI app part nomi (ruscha) → rol. */
function roleOfOld(name: string): string {
  if (name.startsWith("Бок")) return "side";
  if (name.startsWith("Дно")) return "bottom";
  if (name.startsWith("Крышка")) return "top";
  if (name.startsWith("Полка")) return "shelf";
  if (name.startsWith("Фасад")) return "facade";
  if (name.startsWith("Задняя")) return "back";
  if (name.startsWith("Цоколь")) return "plinth";
  return name;
}

/** ESKI versiya bo'laklari (grid.ts pipeline: production → partsList). */
export function oldParts(f: Furniture): NormPart[] {
  const cab = mk({ kind: f.kind, w: f.width, h: f.height, depth: f.depth, fill: "shelves", count: f.shelves, door: 0 });
  const prod = production([cab]);
  if (!prod) return [];
  const pl = partsList(prod, false);
  return pl.lines.map((r) => ({ role: roleOfOld(r.part), length: r.lengthMm, depth: r.widthMm, thickness: r.thicknessMm, qty: (r as { qty?: number }).qty ?? 1 }));
}

/** YANGI versiya bo'laklari (poligon: carcassSheet → derive). Teshik hozircha yo'q (founder Q2 — drilling). */
export function newParts(f: Furniture): NormPart[] {
  const shelfYs: number[] = [];
  for (let i = 1; i <= f.shelves; i++) shelfYs.push(Math.round((f.height * i) / (f.shelves + 1)));
  const { sheet, roles, rules } = carcassSheet({ width: f.width, height: f.height, depth: f.depth, shelfYs });
  const d = derive(sheet, { roles, rules });
  return d.parts.map((p) => ({ role: p.role, length: p.finishedLength, depth: p.depth ?? 0, thickness: p.board.thickness, qty: 1 }));
}

function pairByRole(oldL: NormPart[], newL: NormPart[]): CompareRow[] {
  const rows: CompareRow[] = [];
  const roles = [...new Set([...oldL.map((p) => p.role), ...newL.map((p) => p.role)])];
  for (const role of roles) {
    const o = oldL.filter((p) => p.role === role);
    const n = newL.filter((p) => p.role === role);
    for (let i = 0; i < Math.max(o.length, n.length); i++) {
      const oi = o[i], ni = n[i];
      let match = false, note = "";
      if (oi && ni) {
        match = oi.length === ni.length && oi.depth === ni.depth && oi.thickness === ni.thickness;
        note = match ? "bir xil bo'lak" : `farq: eski ${oi.length}×${oi.depth}×${oi.thickness}, yangi ${ni.length}×${ni.depth}×${ni.thickness}`;
      } else if (oi) note = "faqat ESKIда (yangi karkas Sheet bu bo'lakni bermaydi — mas. eshik/orqa/tsokol)";
      else note = "faqat YANGIда";
      rows.push({ role, old: oi, neu: ni, match, note });
    }
  }
  return rows;
}

export function compareFurniture(f: Furniture): FurnitureCompare {
  const old = oldParts(f);
  const neu = newParts(f);
  const rows = pairByRole(old, neu);
  const matched = rows.filter((r) => r.match).length;
  const oldOnly = rows.filter((r) => r.old && !r.neu).length;
  const conclusion =
    `${f.label}: eski ${old.length} bo'lak, yangi ${neu.length}; ${matched} bo'lak o'lchami BIR XIL (karkas); ` +
    `${oldOnly} bo'lak faqat eskida (eshik/orqa/tsokol — yangi karkas Sheet hali bermaydi); ` +
    `teshik: yangi yadroda drilling hali yo'q (founder Q2).`;
  return { furniture: f, old, neu, rows, conclusion };
}
