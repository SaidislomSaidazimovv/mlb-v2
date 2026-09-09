// 50 Law C — pin orphan + promote. Sof funksiyalar (54§0).
// ASOS: 50 Law C ("pin part-identity'ga (role+bounding line IDs); pin PER PROPERTY; parti yo'qolgan pin =
//   ORPHAN — surfaced, jimgina tashlanmaydi HAM, qayta qo'llanmaydi HAM; pinlar sanaladigan/ro'yxatlanadigan;
//   BIR property BIR qiymatga UCH marta pin qilinsa → tizim uni RULE'ga ko'tarishни TAKLIF qiladi (preview bilan)").
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";
import type { Pin } from "./project.ts";

/** 50 Law C: parti yo'qolgan pin → orphan (surfaced). */
export function checkPinAlive(pin: Pin, livePartIds: Set<string>): Refusal | null {
  if (!livePartIds.has(pin.partId)) {
    return { rule: "pin.orphan", message: `pin '${pin.property}' → part '${pin.partId}' endi yo'q — ORPHAN (surfaced; jimgina tashlanmaydi/qayta qo'llanmaydi)` };
  }
  return null;
}

/** 50 Law C: bir property+qiymat >= minRepeat marta pin qilinsa → rule'ga ko'tarish taklifi (preview). */
export interface PromotionOffer { property: string; value: unknown; count: number; parts: string[]; }
export function offerPromotion(pins: Pin[], minRepeat = 3): PromotionOffer[] {
  const groups = new Map<string, Pin[]>();
  for (const p of pins) {
    const k = p.property + "=" + JSON.stringify(p.value);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  const offers: PromotionOffer[] = [];
  for (const g of groups.values()) {
    if (g.length >= minRepeat) offers.push({ property: g[0]!.property, value: g[0]!.value, count: g.length, parts: g.map((x) => x.partId) });
  }
  return offers;
}
