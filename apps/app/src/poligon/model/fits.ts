// D6 — Hardware / Fit geometrik oqibatlari. Sof funksiyalar (54§0).
// ASOS: 51 D6 (overlay/gap/reveal/clearance = E'LON QILINGAN parametr — ilgak nomida yashirin doimiy
//   EMAS; o'zgarishi = P1 param, DERIVED part o'zgaradi, chiziq emas)
//   + 52§8 (Fit = part opening'ga qanday tegishi; `requires.hinge_class` mos kelmasa RAD — B1: inset Fit +
//   full-overlay ilgak → 33mm-xato eshik EMAS, nom bilan rad).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export type OverlayKind = "full-overlay" | "half-overlay" | "inset";
export interface Hinge { id: string; hingeClass: OverlayKind; }
export interface Fit {
  id: string;
  kind: "door" | "drawer-front" | "back" | "shelf" | "filler";
  gap: number;                      // har yon (mm) — e'lon qilingan
  overlay: OverlayKind;             // e'lon qilingan
  requiresHingeClass: OverlayKind;  // 52§8 requires
}

/** 52§8 (B1): Fit + ilgak mosligi. requires.hinge_class mos kelmasa RAD (33mm-xato eshik emas). */
export function checkFitHinge(fit: Fit, hinge: Hinge): Refusal | null {
  if (fit.requiresHingeClass !== hinge.hingeClass) {
    return { rule: "D6.fitHinge", message: `Fit '${fit.id}' ${fit.requiresHingeClass} ilgak talab qiladi, ilgak ${hinge.hingeClass} (B1) — rad` };
  }
  return null;
}

/** 51 D6 (B1): eshik eni = ochilma eni − DEKLARATSIYA qilingan overlay/gap oqibati (ilgak nomidan EMAS).
 *  full-overlay ~597, inset ~565 (600 ochilmada) — ~33mm farq, overlay TURIDAN kelib chiqadi. */
export function doorWidth(openingWidth: number, fit: Fit, carcassT = 16): number {
  if (fit.overlay === "full-overlay") return openingWidth - 2 * fit.gap;
  if (fit.overlay === "inset") return openingWidth - 2 * fit.gap - 2 * carcassT;
  return openingWidth - 2 * fit.gap - carcassT; // half-overlay
}
