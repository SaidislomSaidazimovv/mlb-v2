// T2 — Junctions (kesishmalar). Sof funksiyalar (54§0).
// ASOS: 48§2 (L/T/X sinf; ustunlik; 'both' rad; qamrab-oluvchi-blok qoidasi) + 54§3 "T2 gate" (800-korpus).
// O'ylab topilgan hech narsa yo'q — har qoida 48§2 dagi matnga mos.

import type { Refusal } from "./contracts.ts";

/** 50§1 rol lug'ati (yagona): side/top/bottom/shelf/fasad/back/plinth/worktop. */
export type Role = "worktop" | "side" | "top" | "bottom" | "shelf" | "fasad" | "back" | "plinth";

/** 48§2: rutba PROFILDAN keladi (DATA) — bu profil DEFAULT jadvali. Strukturaviy chain 48§2 dan sarih:
 *  `worktop > side > top/bottom > shelf`. Qolganlari (fasad/back/plinth — front/behind/above qatlam,
 *  odatda strukturaviy through-junction hosil qilmaydi) profil default; 48§2 chain'ida SARIH EMAS, profil
 *  bekor qila oladi. Tenglik → rad (jimgina default yo'q). O' zimdan qat'iy qonun sifatida qo'ymadim. */
export const DEFAULT_RANK: Record<Role, number> = {
  worktop: 5,
  side: 4,
  top: 3,
  bottom: 3,
  shelf: 2,
  plinth: 2,
  fasad: 1,
  back: 1,
};
/** Eski nom (moslik uchun) — DEFAULT_RANK. */
export const RANK = DEFAULT_RANK;

export type Through = "V" | "H" | "neither";
export type Override = "V" | "H" | "neither" | "both";

/** 48§2: qaysi taxta o'tib ketadi. 3 bosqich: override → rutba. 'both' fizik imkonsiz → rad; tenglik → rad. */
export function resolveThrough(vRole: Role, hRole: Role, override?: Override): Through | Refusal {
  if (override !== undefined) {
    if (override === "both") {
      return { rule: "junction.both", message: "48§2: 'both' fizik imkonsiz — LDSP da yarim-lap yo'q" };
    }
    return override;
  }
  const rv = RANK[vRole];
  const rh = RANK[hRole];
  if (rv === rh) {
    return { rule: "junction.tie", message: `48§2: rutba tengligi (${vRole} = ${hRole}) — rad, jimgina default yo'q` };
  }
  return rv > rh ? "V" : "H";
}

/** 48§2: topologik sinf. L=2 chorak, T=3, X=4. Qalinlik X ni parchalaydi:
 *  kesishuvdagi vertikal segment 32 (modul chegarasi) bo'lsa — X emas, ikki mustaqil T. */
export type JClass = "L" | "T" | "X" | "X->2T";
export function classify(filledQuadrants: 2 | 3 | 4, crossingVThickness: 0 | 16 | 32): JClass {
  if (filledQuadrants === 2) return "L";
  if (filledQuadrants === 3) return "T";
  return crossingVThickness === 32 ? "X->2T" : "X"; // faqat umumiy (16) segment haqiqiy X
}

/** 54 T2-gate: 800-korpus o'lchov oqibati. W=tashqi en, t=qalinlik, H=balandlik.
 *  V-through: sidelar to'liq yuguradi, top/bottom orasiga taqaladi → top=bottom=W-2t, side=H.
 *  H-through: top+bottom to'liq yuguradi, sidelar ular ostida → top=bottom=W, side=H-2t. */
export interface CarcassParts { top: number; bottom: number; side: number; }
export function carcassParts(W: number, H: number, t: 16 | 32, through: "V" | "H"): CarcassParts {
  if (through === "V") return { top: W - 2 * t, bottom: W - 2 * t, side: H };
  return { top: W, bottom: W, side: H - 2 * t };
}

/** 48§2 "jimgina buzadigan qoida": yuqori-rutbali gorizontal, o'sha balandlikni QAMRAB OLGAN
 *  vertikal blokni kessa → ichida taxta YO'Q (junction V-through, gorizontal tugaydi, blok hech nima olmaydi).
 *  Ya'ni poldan-shiftgacha penal yonida ish-stoli chizig'i polka O'STIRMAYDI. */
export function boardInsideSpanningBlock(spans: boolean): boolean {
  return spans ? false : true;
}
