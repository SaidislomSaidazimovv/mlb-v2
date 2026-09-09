// Law B — "no guessing" (50). Sof funksiyalar (54§0).
// ASOS: 50 Law B ("property'ni boshqaradigan facet part bo'ylab BIR QIYMATLI bo'lishi shart; part ikki
//   qiymatni qamrasa → resolution RAD va partni NOMLAYDI; tizim hech qachon TANLAMAYDI"). Kanonik xato: zone
//   geometrik banddan olinsa, tall penal base+upper bandlarини qamraydi → bir fasad ikki rang → uncuttable.
//   Tuzatish: blokда zone E'LON qilinsa geometrik derivatsiyani bekor qiladi (bir klik, doimiy to'g'ri).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export interface Band { name: string; from: number; to: number; }

/** [lo,hi] oralig'i qaysi bandlarni qamraydi. */
export function bandsSpanned(lo: number, hi: number, bands: Band[]): string[] {
  return bands.filter((b) => lo < b.to && hi > b.from).map((b) => b.name);
}

/** 50 Law B: geometrik-derived facet (mas. zone) part bo'ylab BIR QIYMATLI bo'lishi shart. Part ikki bandni
 *  qamrasa → RAD (partni nomlaydi). `declared` (blok-darajasida e'lon) berilsa — geometrik derivatsiya bekor,
 *  bir qiymatli (Law B tuzatishi). Bo'sh massiv/1 band → null (toza). */
export function checkSingleValued(partId: string, lo: number, hi: number, bands: Band[], declared?: string): Refusal | null {
  if (declared) return null; // blok e'lon qilган zone geometrikni bekor qiladi (50 Law B fix)
  const zs = bandsSpanned(lo, hi, bands);
  if (zs.length > 1) {
    return { rule: "LawB", message: `${partId}: '${zs.join("','")}' zonalarini qamraydi — bir facet ikki qiymatli, qoidalar kelishmaydi. Blokда zone e'lon qiling (50 Law B; tizim tanlamaydi)` };
  }
  return null;
}
