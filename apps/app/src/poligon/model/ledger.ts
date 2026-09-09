// 50§6 — Change ledger (diff-before-commit). Sof funksiyalar (54§0).
// ASOS: 50§6 ("derived facet foydalanuvchi ostida flip bo'lishi TO'G'RI, lekin E'LON qilinishi shart:
//   '12 part o'zgardi, 3 qirra kromkasiz, −4.20'; auto-grouping diff-before-commit'siz — professional pul
//   ishonmaydigan tizim"). diffReleases (53§2) part o'zgarishlarini beradi; ledger inson-o'qir xulosa.
// O'ylab topilgan hech narsa yo'q.

import type { PartDiff } from "./release.ts";

export interface Ledger { changed: number; appeared: number; vanished: number; priceDelta?: number; text: string; }

/** 50§6: change ledger — diffReleases natijasidan inson-o'qir xulosa (+ ixtiyoriy narx delta). */
export function changeLedger(diff: PartDiff[], priceDelta?: number): Ledger {
  const changed = diff.filter((d) => d.kind === "changed").length;
  const appeared = diff.filter((d) => d.kind === "appeared").length;
  const vanished = diff.filter((d) => d.kind === "vanished").length;
  const price = priceDelta !== undefined ? `, narx ${priceDelta >= 0 ? "+" : ""}${priceDelta}` : "";
  return { changed, appeared, vanished, priceDelta, text: `${changed} o'zgardi, ${appeared} paydo, ${vanished} g'oyib${price}` };
}
