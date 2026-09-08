// D4 — Migration. Sof funksiyalar (54§0).
// ASOS: 51 D4 (resolve chiziqni SILJITMAYDI; chiziq siljishini talab qiladigan qoida o'zgarishi =
//   MIGRATION: oshkora, END-STATE preview, ATOMIK, tartibli, refusable, sheet-op jurnali bilan)
//   + 51 H2 (bitta atomik tranzaksiya + deklaratsiya qilingan ichki TARTIB; preview END-STATE ko'rsatadi,
//   oraliq holatlarni emas) + 48 L0 (butun-yoki-hech). T5 `apply` ustida (immutable).
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, Refusal } from "./contracts.ts";
import { apply, type Op } from "./ops.ts";

export interface Migration { name: string; ops: Op[]; } // TARTIBLI op'lar (odatda line-move'lar)
export type MigrationResult =
  | { ok: true; sheet: Sheet }                              // END-STATE
  | { ok: false; refusals: Refusal[]; failedAt: number };   // butun-yoki-hech, qaysi op'da uzildi

/** 51 D4/H2 + L0: migratsiyani ATOMIK bajaradi — op'larni TARTIB bo'yicha bittalab `apply` qiladi
 *  (har biri commit-tekshiruvli, immutable); BIRORTASI rad bo'lsa BUTUN migratsiya rad va asl Sheet
 *  o'zgarmaydi (oraliq nusxalar tashlanadi). Muvaffaqiyatda — yakuniy END-STATE. */
export function runMigration(sheet: Sheet, mig: Migration): MigrationResult {
  let cur = sheet; // apply immutable → asl `sheet` hech qachon tegilmaydi
  for (let i = 0; i < mig.ops.length; i++) {
    const r = apply(cur, mig.ops[i]!);
    if (!r.ok) return { ok: false, refusals: r.refusals, failedAt: i };
    cur = r.sheet;
  }
  return { ok: true, sheet: cur };
}

/** 51 D4: PREVIEW — END-STATE (yoki rad), MUTATSIYASIZ. `apply` immutable bo'lgani uchun preview =
 *  run bilan bir xil sof hisob (asl `sheet` o'zgarmaydi); faqat yakuniy holat ko'rsatiladi, oraliq emas.
 *  Farqi — chaqiruvchi PREVIEW natijasini commit qilmaydi, RUN natijasini qiladi. */
export function previewMigration(sheet: Sheet, mig: Migration): MigrationResult {
  return runMigration(sheet, mig);
}
