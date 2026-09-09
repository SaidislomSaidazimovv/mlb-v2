// T10 — Validation (P5). Sof funksiyalar (54§0).
// ASOS: 48 L8 (minimumlar EGALLOVCHIga tegishli, ustunga emas: ustunning amaldagi min = egallovchilar
//   maksimumi; 3mm filler 150mm karkas minimumi bilan rad ETILMAYDI) + 51 D9 (material validlik domeni —
//   tashqarida RAD, resize EMAS; qoidani nomlaydi) + 51 D11 (qatlam bo'yicha to'qnashuv, nom bilan)
//   + 54§3 "T10 gate" (har rad qoida + sozlanadigan faylni nomlaydi).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

/** 48 L8: egallovchi — o'z minimumi + uni bergan qoida (sozlanadigan manba). */
export interface Occupant { min: number; rule: string; }

/** L8: ustunning amaldagi min = egallovchilar maksimumi. Mavjud eni undan kichik → RAD (bog'lovchi
 *  egallovchining qoidasini nomlaydi). Egallovchi bo'lmasa — cheklov yo'q. */
export function checkColumnMinimum(available: number, occupants: Occupant[]): Refusal | null {
  if (occupants.length === 0) return null;
  const eff = occupants.reduce((m, o) => Math.max(m, o.min), 0);
  if (available < eff) {
    const binding = occupants.find((o) => o.min === eff)!;
    return { rule: binding.rule, message: `L8: eni ${available} < minimum ${eff} (egallovchi qoidasi: ${binding.rule})` };
  }
  return null;
}

/** 51 D9: material validlik domeni. span (yoki o'lchov) ruxsatdan tashqarida → RAD (resize EMAS),
 *  material qoidasini nomlaydi. */
export interface MaterialDomain { rule: string; maxUnsupportedSpan?: number; minDepth?: number; }
export function checkMaterialDomain(value: { span?: number; depth?: number }, dom: MaterialDomain): Refusal | null {
  if (dom.maxUnsupportedSpan !== undefined && value.span !== undefined && value.span > dom.maxUnsupportedSpan) {
    return { rule: dom.rule, message: `D9: span ${value.span} > ruxsat ${dom.maxUnsupportedSpan} (material: ${dom.rule}) — resize yo'q, rad` };
  }
  if (dom.minDepth !== undefined && value.depth !== undefined && value.depth < dom.minDepth) {
    return { rule: dom.rule, message: `D9: depth ${value.depth} < min ${dom.minDepth} (material: ${dom.rule})` };
  }
  return null;
}

/** 51 D9 (B4 lift-up): parametr KONSTREYNT beradi — min / max / FORBIDDEN-RANGE — TEKSHIRILADI, YECHILMAYDI
 *  (constraint solver YO'Q). Qiymat konstreyntni buzsa → RAD (nom bilan), jimgina siljitmaydi. */
export interface Constraint { rule: string; min?: number; max?: number; forbidden?: [number, number][]; }
export function checkConstraint(value: number, c: Constraint): Refusal | null {
  if (c.min !== undefined && value < c.min) return { rule: c.rule, message: `D9: ${value} < min ${c.min} (${c.rule}) — tekshiriladi, yechilmaydi` };
  if (c.max !== undefined && value > c.max) return { rule: c.rule, message: `D9: ${value} > max ${c.max} (${c.rule})` };
  for (const [lo, hi] of c.forbidden ?? []) {
    if (value >= lo && value <= hi) return { rule: c.rule, message: `D9: ${value} taqiqlangan zonada [${lo},${hi}] (${c.rule}) — B4 lift-up forbidden zone` };
  }
  return null;
}

/** 51 D11/G4: eshik-swing devor/to'siqqa tegishi (standart holat, "birinchi versiyada shart"). Eshik 90°
 *  ochilishi uchun eni-cha bo'sh yoy kerak; ochilish tomonida to'siq shundan yaqin → RAD (yechilmaydi). */
export function checkDoorSwing(width: number, clearance: number, rule = "D11.swing"): Refusal | null {
  if (clearance < width) return { rule, message: `D11: eshik (eni ${width}) 90° ochilishiga ${clearance} bo'sh joy — devor/to'siqqa tegadi (kerak ≥ ${width})` };
  return null;
}

/** 51 D11/A3: grain feasibility (P6) — MAJBURIY tola bilan part faqat BITTA orientatsiyada; sheet'ga sig'masa
 *  → un-nestable RAD (jimgina qayta burmaydi). grain "L"=uzunlik sheet-uzunligi bo'ylab, "W"=en bo'ylab, "none"=erkin. */
export function checkGrainFit(partLen: number, partWid: number, grain: "L" | "W" | "none", sheetLen: number, sheetWid: number, rule = "D11.grain"): Refusal | null {
  if (grain === "none") {
    const fits = (partLen <= sheetLen && partWid <= sheetWid) || (partLen <= sheetWid && partWid <= sheetLen);
    return fits ? null : { rule, message: `D11: part ${partLen}×${partWid} sheet ${sheetLen}×${sheetWid} ga sig'maydi` };
  }
  const fits = grain === "L" ? (partLen <= sheetLen && partWid <= sheetWid) : (partLen <= sheetWid && partWid <= sheetLen);
  return fits ? null : { rule, message: `D11: part ${partLen}×${partWid} majburiy tola (${grain}) bilan sheet ${sheetLen}×${sheetWid} ga sig'maydi — un-nestable (jimgina burilmaydi)` };
}

/** 51 D11: qatlam bo'yicha to'qnashuv (front layer to'lа bo'lishi shart emas → sheet o'zi ushlamaydi).
 *  Bir qatlamdagi ustma-ust x-oraliqlar → RAD, nom bilan. */
export interface Box { layer: string; x0: number; x1: number; rule: string; }
export function checkCollisions(boxes: Box[]): Refusal[] {
  const out: Refusal[] = [];
  const byLayer = new Map<string, Box[]>();
  for (const b of boxes) {
    if (!byLayer.has(b.layer)) byLayer.set(b.layer, []);
    byLayer.get(b.layer)!.push(b);
  }
  for (const [layer, arr] of byLayer) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i]!;
        const c = arr[j]!;
        if (a.x0 < c.x1 && c.x0 < a.x1) {
          out.push({ rule: "D11.collision", message: `D11: '${layer}' qatlamida to'qnashuv (${a.rule} <-> ${c.rule})` });
        }
      }
    }
  }
  return out;
}
