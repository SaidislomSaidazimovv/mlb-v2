// D10 — atomik Theme install. Sof funksiyalar (54§0).
// ASOS: 51 D10 ("application ATOMIK — Theme butun-yoki-hech, to'liq diff bilan; partial TAQIQLANGAN;
//   domain-miss HISOBOT qilinadi, xato emas") + D2s (partial fatal) + D3s (domain-miss → qoida MOS KELMAYDI,
//   pastki qatlamга tushadi, hisobot: "51 dan 42 shelf...") + D4s (domain-miss ≠ xato; haqiqiy violation = xato)
//   + 50§4 (Theme install atomik; ikki Theme bir qatlam bir property → install'da KONFLIKT refuse; facet
//   contract — Theme kutgan facet loyihada yo'q bo'lsa install'da ko'rinadigan xato).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";
import { resolve, type Rule, type Part } from "./cascade.ts";

export interface Theme { id: string; rules: Rule[]; requiresFacets?: string[]; }
/** D3s: qoida qancha partга MOS keldi (matched) vs jami (total). matched<total → domain-miss (fall-through). */
export interface DomainReport { property: string; matched: number; total: number; }
export type InstallResult = { ok: true; rules: Rule[]; report: DomainReport[] } | Refusal;

/**
 * D10: Theme'ni ATOMIK o'rnatish. Refuse bo'lsa — HECH NARSA qo'llanmaydi (butun-yoki-hech). Muvaffaqiyat →
 *  birlashgan ruleset + domain-miss hisobot. Konflikt (50§4/I3): birlashgan rulesetда biror part bir property'ga
 *  bir qatlamda turli qiymat olsa (resolve Conflict) → install.conflict. Facet contract (50§4): Theme kutgan
 *  facet loyihada yo'q → install.facetContract.
 */
export function installTheme(theme: Theme, existing: Rule[], parts: Part[], projectFacets: Set<string>): InstallResult {
  // 50§4: facet contract — kutilgan facet loyihada bo'lishi shart (jimgina hech nimaga mos kelmaslik = eng yomon)
  for (const f of theme.requiresFacets ?? []) {
    if (!projectFacets.has(f)) {
      return { rule: "install.facetContract", message: `Theme '${theme.id}' '${f}' facetini kutadi, loyihada yo'q — install'da ko'rinadigan xato (50§4)` };
    }
  }
  const all = [...existing, ...theme.rules];
  const props = [...new Set(theme.rules.map((r) => r.property))];

  // 50§4/I3: konflikt — biror part biror property'ga bir qatlamда turli qiymat olsa (resolve Conflict) → refuse
  for (const p of parts) {
    for (const prop of props) {
      const r = resolve(p, prop, all);
      if ("rule" in r && r.rule === "Conflict") {
        return { rule: "install.conflict", message: `Theme '${theme.id}' install konflikt: ${r.message} — atomik refuse (hech narsa qo'llanmadi)` };
      }
    }
  }

  // D3s: domain-miss HISOBOT (xato emas — mos kelmagan partlar pastki qatlam default'ini oladi)
  const report: DomainReport[] = props.map((prop) => {
    const rs = theme.rules.filter((r) => r.property === prop);
    const matched = parts.filter((p) => rs.some((r) => r.match(p))).length;
    return { property: prop, matched, total: parts.length };
  });

  return { ok: true, rules: all, report }; // atomik: butun ruleset qaytadi (yoki yuqorida refuse bo'lardi)
}
