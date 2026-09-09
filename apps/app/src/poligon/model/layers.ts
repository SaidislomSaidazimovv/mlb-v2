// B8 — Layers + fullness (L3). Sof funksiyalar (54§0).
// ASOS: 48 L3 ("fullness PER LAYER; layers behind/carcass/front/above; FAQAT carcass to'la bo'lishi shart —
//   har carcass katak AYNAN BITTA blokka tegishli; front qatlamдagi plinth uch carcass ustidan o'tsa — qonuniy")
//   + 48 L9 (Void/Reserved = oshkora bo'sh, teshik emas — strukturaviy tekisda o'rin egallaydi).
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, Block, Layer, Refusal, LineId } from "./contracts.ts";

/** Blokning qatlami (berilmasa carcass). */
export function blockLayer(b: Block): Layer {
  return b.layer ?? "carcass";
}

/** Strukturaviy tekis (carcass PLANE): carcass bloklari + Void/Reserved (oshkora bo'shliq). front/above/behind emas. */
function inCarcassPlane(b: Block): boolean {
  if (b.type === "void" || b.type === "reserved") return true;
  return blockLayer(b) === "carcass";
}

/**
 * 48 L3: FULLNESS — strukturaviy tekis (carcass + void/reserved) har katakni AYNAN BIR MARTA qoplashi shart.
 *  0 marta → teshik (L3.hole, L9 buzilishi); >1 → ustma-ust (L3.overlap). front/above/behind TEKSHIRILMAYDI
 *  (plinth uch carcass ustidan o'tsa — qonuniy). Bo'sh massiv = to'la.
 */
export function checkFullness(sheet: Sheet): Refusal[] {
  const nV = sheet.vLines.length - 1;
  const nH = sheet.hLines.length - 1;
  if (nV < 1 || nH < 1) return [];
  const vIdx = new Map<LineId, number>(sheet.vLines.map((l, i) => [l.id, i]));
  const hIdx = new Map<LineId, number>(sheet.hLines.map((l, i) => [l.id, i]));

  const out: Refusal[] = [];
  const count: number[][] = Array.from({ length: nV }, () => new Array<number>(nH).fill(0));
  for (const b of sheet.blocks) {
    if (!inCarcassPlane(b)) continue; // faqat strukturaviy tekis
    const v0 = vIdx.get(b.vLo), v1 = vIdx.get(b.vHi), h0 = hIdx.get(b.hLo), h1 = hIdx.get(b.hHi);
    if (v0 === undefined || v1 === undefined || h0 === undefined || h1 === undefined) continue;
    for (let vi = v0; vi < v1; vi++) for (let hi = h0; hi < h1; hi++) count[vi]![hi]!++;
  }
  for (let vi = 0; vi < nV; vi++) for (let hi = 0; hi < nH; hi++) {
    const c = count[vi]![hi]!;
    if (c === 0) out.push({ rule: "L3.hole", message: `48 L3: katak (${vi},${hi}) hech qanday carcass/void blokka tegishli emas — teshik (L9: Void bo'lishi kerak)` });
    else if (c > 1) out.push({ rule: "L3.overlap", message: `48 L3: katak (${vi},${hi}) ${c} ta carcass blok bilan ustma-ust — har katak aynan bitta bo'lishi kerak` });
  }
  return out;
}
