// 53§1 — Pre-flight ro'yxati (release oldidan). Sof funksiyalar (54§0).
// ASOS: 53§1 ("pre-flight ro'yxati vizualizatsiyadan qimmatroq: har fillersiz Reserved; har kromkasiz exposed
//   qirra; har transportdan katta modul; har hal qilinmagan rank-tie; har konfliktdagi override; har hali
//   'estimated' devor. Oxirgisi faza emas — DATA SIFATI: estimated devorga release baland ovoz ogohlantiradi/rad").
// O'ylab topilgan hech narsa yo'q.

export interface PreflightInput {
  wallMeasured: boolean;         // 53§1: false → "estimated" (data sifati)
  rankTies: string[];            // hal qilinmagan rank-tie junction'lar
  exposedNoKromka: string[];     // kromkasiz exposed qirra part'lari
  reservedNoFiller: string[];    // filler/scriber hal qilinmagan Reserved
  modulesOverTransport: string[];
  overrideConflicts: string[];
}
export interface PreflightItem { rule: string; message: string; }

/** 53§1: release oldidan tekshiruvlar ro'yxati. Bo'sh massiv = release'ga tayyor. */
export function preflight(inp: PreflightInput): PreflightItem[] {
  const out: PreflightItem[] = [];
  if (!inp.wallMeasured) out.push({ rule: "preflight.wallEstimated", message: "devor hali 'estimated' (o'lchanmagan) — release baland ovoz bilan ogohlantiradi/rad (53§1 data sifati)" });
  for (const t of inp.rankTies) out.push({ rule: "preflight.rankTie", message: `hal qilinmagan rank-tie: ${t}` });
  for (const e of inp.exposedNoKromka) out.push({ rule: "preflight.noKromka", message: `exposed qirra kromkasiz: ${e}` });
  for (const r of inp.reservedNoFiller) out.push({ rule: "preflight.reserved", message: `Reserved filler/scriber hal qilinmagan: ${r}` });
  for (const m of inp.modulesOverTransport) out.push({ rule: "preflight.transport", message: `modul transportdan katta: ${m}` });
  for (const o of inp.overrideConflicts) out.push({ rule: "preflight.override", message: `konfliktdagi override: ${o}` });
  return out;
}
