// D5 — Thickness class. Sof funksiyalar (54§0).
// ASOS: 51 D5 (+ A1/I4): qalinlik = GEOMETRIK material xususiyati; material sinf ICHIDA erkin o'zgaradi
//   (kaskad); sinfNI KESIB o'tish = MIGRATION (kaskad EMAS — geometriya o'zgaradi, jimgina resize yo'q);
//   Type o'z sinfini e'lon qiladi (cross-class instantiation = Migration).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export type ThicknessClass = string; // "t16", "t18", ...
export interface Material { id: string; thicknessClass: ThicknessClass; thickness: number; }

/** A1: material o'zgarishi — sinf ICHIDA → "cascade"; sinfNI KESIB → "migration". */
export function classifyMaterialChange(from: Material, to: Material): "cascade" | "migration" {
  return from.thicknessClass === to.thicknessClass ? "cascade" : "migration";
}

/** A1: KASKAD orqali material almashtirishga urinish — sinf kesib o'tsa RAD (Migration kerak; silent resize yo'q). */
export function checkCascadeMaterialChange(from: Material, to: Material): Refusal | null {
  if (classifyMaterialChange(from, to) === "migration") {
    return { rule: "D5.migration", message: `Qalinlik sinfi ${from.thicknessClass}->${to.thicknessClass}: bu MIGRATION, kaskad emas (A1) — jimgina resize yo'q` };
  }
  return null;
}

/** I4: Type loyihaga o'rnatilishi — Type sinfi loyiha sinfiga mos kelmasa Migration kerak (2mm-xato taxta emas). */
export function checkTypeInstantiation(typeClass: ThicknessClass, projectClass: ThicknessClass): Refusal | null {
  if (typeClass !== projectClass) {
    return { rule: "D5.crossClass", message: `Type sinfi ${typeClass} != loyiha ${projectClass}: cross-class o'rnatish = Migration (I4)` };
  }
  return null;
}
