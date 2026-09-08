// T4 — Modules (modullar). Sof funksiyalar (54§0).
// ASOS: 48§0 — "Modul = DERIVED: 32-segment bilan AJRATILMAGAN kataklarning MAKSIMAL to'plami".
//   L4 — "bloklar to'rtburchak, modullar YO'Q: baza + poldan-shiftgacha penal umumiy panel = L-shakl modul".
//   + 54§3 "T4 gate": bitta chokni ulasa (32→16) ikki modul → bitta; transport ogohlantirishi ishlaydi.
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, Refusal } from "./contracts.ts";
import { getThickness } from "./sheet.ts";

export interface Cell { vi: number; hi: number; } // vertikal/gorizontal interval indeksi
export interface Module {
  cells: Cell[];
  x0: number; x1: number; y0: number; y1: number;
  width: number; height: number;
}

/** 48§0: kataklarni union-find bilan komponentlarga ajratamiz — 32 segment CHEGARA (ajratadi),
 *  0 yoki 16 esa ULAYDI (bir modul). Modul ixtiyoriy shaklda (to'rtburchak bo'lishi shart emas). */
export function deriveModules(s: Sheet): Module[] {
  const V = s.vLines;
  const H = s.hLines;
  const nV = V.length - 1; // vertikal intervallar (ustunlar)
  const nH = H.length - 1; // gorizontal intervallar (qatorlar)
  if (nV < 1 || nH < 1) return [];

  const id = (vi: number, hi: number): number => vi * nH + hi;
  const parent: number[] = [];
  for (let k = 0; k < nV * nH; k++) parent[k] = k;
  const find = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]!]!;
      a = parent[a]!;
    }
    return a;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let vi = 0; vi < nV; vi++) {
    for (let hi = 0; hi < nH; hi++) {
      // gorizontal qo'shni: ular orasidagi V chiziq = V[vi+1], H-interval hi dagi segment
      if (vi + 1 < nV) {
        const vLine = V[vi + 1]!;
        if (getThickness(s, vLine.id, H[hi]!.id, H[hi + 1]!.id) !== 32) union(id(vi, hi), id(vi + 1, hi));
      }
      // vertikal qo'shni: ular orasidagi H chiziq = H[hi+1], V-interval vi dagi segment
      if (hi + 1 < nH) {
        const hLine = H[hi + 1]!;
        if (getThickness(s, hLine.id, V[vi]!.id, V[vi + 1]!.id) !== 32) union(id(vi, hi), id(vi, hi + 1));
      }
    }
  }

  const groups = new Map<number, Cell[]>();
  for (let vi = 0; vi < nV; vi++) {
    for (let hi = 0; hi < nH; hi++) {
      const r = find(id(vi, hi));
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r)!.push({ vi, hi });
    }
  }

  const mods: Module[] = [];
  for (const cells of groups.values()) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const c of cells) {
      x0 = Math.min(x0, V[c.vi]!.pos);
      x1 = Math.max(x1, V[c.vi + 1]!.pos);
      y0 = Math.min(y0, H[c.hi]!.pos);
      y1 = Math.max(y1, H[c.hi + 1]!.pos);
    }
    mods.push({ cells, x0, x1, y0, y1, width: x1 - x0, height: y1 - y0 });
  }
  return mods;
}

/** 54 T4: transport tekshiruvi — modulning gabarit o'lchovi profil maksimumidan oshsa ogohlantiradi. */
export interface TransportLimit { maxWidth: number; maxHeight?: number; }
export function transportCheck(m: Module, lim: TransportLimit): Refusal | null {
  if (m.width > lim.maxWidth) {
    return { rule: "transport", message: `Modul eni ${m.width} > ruxsat ${lim.maxWidth}` };
  }
  if (lim.maxHeight !== undefined && m.height > lim.maxHeight) {
    return { rule: "transport", message: `Modul balandligi ${m.height} > ruxsat ${lim.maxHeight}` };
  }
  return null;
}
