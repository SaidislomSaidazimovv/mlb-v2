// 53§4 — Overrides kanali (Law 12 istisnosi). Sof funksiyalar (54§0).
// ASOS: 53§4 ("part-identity'ga bog'langan, 'overridden' deb ko'rsatiladi, HAR derive'da qayta-tekshiriladi;
//   part o'zgarsa/yo'qolsa override KONFLIKT sifatida chiqadi — jimgina qo'llanmaydi HAM, yo'qolmaydi HAM;
//   RAQAMLI override default DELTA, KATEGORIK default ABSOLUTE; override INVENTORY — bir panel, hamma override,
//   bir klik tozalanadi") + 50 Law C / 51 H1 (identity = role + bounding line IDs, pozitsiya emas).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export type OverrideKind = "delta" | "absolute";
export interface PartOverride {
  partId: string;    // 51 H1: role + bounding line IDs (pozitsiya emas)
  property: string;
  kind: OverrideKind;
  value: number | string;
}

/** 53§4: raqamli → default DELTA, kategorik → default ABSOLUTE. ("50 kam" global o'zgarishдан keyin ham
 *  yashaydi; "510" guruh siljishida orphan bo'ladi — shu sabab delta default.) */
export function makeOverride(partId: string, property: string, value: number | string): PartOverride {
  return { partId, property, kind: typeof value === "number" ? "delta" : "absolute", value };
}

/** 53§4: override'ni base qiymatga qo'llash — delta qo'shadi, absolute almashtiradi. */
export function applyOverride(base: unknown, ov: PartOverride): unknown {
  if (ov.kind === "delta" && typeof base === "number" && typeof ov.value === "number") return base + ov.value;
  return ov.value; // absolute
}

/** 53§4: har derive'da qayta-tekshirish — part endi mavjud bo'lmasa KONFLIKT (jimgina qo'llanmaydi/yo'qolmaydi). */
export function checkOverrideAlive(ov: PartOverride, livePartIds: Set<string>): Refusal | null {
  if (!livePartIds.has(ov.partId)) {
    return { rule: "override.conflict", message: `override '${ov.property}' → part '${ov.partId}' endi yo'q — konflikt (53§4: jimgina qo'llanmaydi ham, yo'qolmaydi ham)` };
  }
  return null;
}

/** 53§4: override inventory — bir panel, loyihadagi hamma override (sanaladigan/ro'yxatlanadigan). */
export function overrideInventory(overrides: PartOverride[]): PartOverride[] {
  return [...overrides];
}
