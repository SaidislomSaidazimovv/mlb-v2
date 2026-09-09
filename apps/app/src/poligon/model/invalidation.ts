// 50§6 — Facet-keyed incremental invalidation. Sof funksiyalar (54§0).
// ASOS: 50§6 ("facet-keyed incremental invalidation. FAQAT resolve SOF va membership HECH QACHON saqlanmagani
//   uchun sog'lom — Law A ban emas, preference emasligining ikkinchi sababi"). Qoida o'zgarganda — HAMMANI
//   emas, faqat o'sha qoida TEGADIGAN partlarni (blast radius) qayta-resolve qilamiz.
// O'ylab topilgan hech narsa yo'q.

import type { Rule, Part } from "./cascade.ts";

/** Resolve keshi: (partKey | property) -> qiymat. Membership SAQLANMAYDI — faqat resolve natijasi keshlanadi. */
export interface ResolveCache { entries: Map<string, unknown>; }
export function newCache(): ResolveCache { return { entries: new Map() }; }
export function cacheKey(partKey: string, property: string): string { return `${partKey}|${property}`; }

export function getCached(c: ResolveCache, partKey: string, property: string): { hit: true; value: unknown } | { hit: false } {
  const k = cacheKey(partKey, property);
  return c.entries.has(k) ? { hit: true, value: c.entries.get(k) } : { hit: false };
}
export function setCached(c: ResolveCache, partKey: string, property: string, value: unknown): void {
  c.entries.set(cacheKey(partKey, property), value);
}

/**
 * 50§6: qoida o'zgarganda INCREMENTAL invalidatsiya — faqat o'sha qoida MOS KELADIGAN partlarning shu
 * property keshini o'chiramiz (blast radius). Qolgan hamma kesh saqlanadi. Membership saqlanmagani uchun
 * (part → facet qayta hisoblanadi) sog'lom. O'chirilgan entry'lar SONI qaytadi.
 */
export function invalidateByRule(c: ResolveCache, rule: Rule, parts: Part[], partKey: (p: Part) => string): number {
  let removed = 0;
  for (const p of parts) {
    if (rule.match(p)) {
      if (c.entries.delete(cacheKey(partKey(p), rule.property))) removed++;
    }
  }
  return removed;
}
