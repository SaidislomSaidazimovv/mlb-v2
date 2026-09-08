// D3 — Datum / local-frame (o'lchov parametrlari). Sof funksiyalar (54§0).
// ASOS: 51 D3 (C1-C5): har o'lchov parametri o'z FRAME'ini e'lon qiladi —
//   C1 datum yuzasi MAJBURIY (datumsiz parametr mavjud emas); C2 role bo'yicha LOCAL frame (yuza nomlari,
//   "front" shelf'da chuqurlik, back'da qalinlik o'qi); C3 WORLD-space o'lchov parametri TAQIQLANGAN
//   (mirror = frame transform); C4 setback ICHKARIGA-MUSBAT, protrusion = alohida 'overlay' (manfiy emas);
//   C5 kompozitsiya additive/absolute e'lon qilinadi.
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

/** C2: role -> o'sha role uchun haqiqiy yuza nomlari (local frame). */
export type RoleFrame = Record<string, string[]>;
export const ROLE_FRAMES: RoleFrame = {
  side: ["front", "back", "inner", "outer"],
  shelf: ["front", "back"],
  back: ["front", "back"],  // "front" = qalinlik o'qi (shelf'nikidan boshqa ma'no — C2)
  fasad: ["front", "back"],
};

export type Composition = "additive" | "absolute"; // C5
export interface DimParam {
  name: string;
  role: string;
  datum: string;          // role frame'idagi yuza nomi (C1/C2)
  value: number;          // ICHKARIGA-MUSBAT (C4)
  composition: Composition;
  world?: boolean;                 // true → world-space (taqiqlangan C3)
  protrusionAsNegative?: boolean;  // true → protrusion'ni manfiy setback qilish (taqiqlangan C4)
}

/** C1-C4: parametrni tekshirish. world / manfiy-protrusion / datumsiz / frame'da yo'q → nomlangan RAD. */
export function validateParam(p: DimParam): Refusal | null {
  if (p.world) return { rule: "D3.world", message: `${p.name}: world-space o'lchov parametri taqiqlangan (C3)` };
  if (p.protrusionAsNegative) return { rule: "D3.protrusion", message: `${p.name}: protrusion manfiy setback emas — alohida 'overlay' (C4)` };
  if (!p.datum) return { rule: "D3.datum", message: `${p.name}: datum yuzasi majburiy — datumsiz parametr mavjud emas (C1)` };
  const faces = ROLE_FRAMES[p.role];
  if (!faces) return { rule: "D3.role", message: `${p.name}: '${p.role}' frame'i yo'q` };
  if (!faces.includes(p.datum)) return { rule: "D3.face", message: `${p.name}: '${p.datum}' '${p.role}' frame'ida yo'q (C2): ${faces.join("/")}` };
  return null;
}

/** C1/C5: setbackni DATUM yuzasiga nisbatan yechish (ichkariga-musbat). datumPos = datum yuzaning joriy
 *  pozitsiyasi (qaysi yuza tanlangani + geometriya shunda). Natija DEKLARATSIYA qilingan datumga bog'liq —
 *  taxmin yo'q. absolute → datumdan; additive → base'ga qo'shiladi. */
export function resolveSetback(datumPos: number, p: DimParam, base = 0): number {
  return p.composition === "additive" ? base - p.value : datumPos - p.value;
}
