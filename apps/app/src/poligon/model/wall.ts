// B6 — Wall length (L14). Sof funksiyalar (54§0).
// ASOS: 48 L14 ("devor uzunligi INPUT, invariant emas; 'devor 2980 chiqdi' = E'LON QILINGAN operatsiya:
//   proportsional qayta taqsimlash YOKI oxirgi-ustun-yutadi; nomlangan, deterministik; qayta taqsimlash
//   minimumni buzsa BALAND OVOZ bilan xato") + 48 L16 (butun mm; har bo'linish residual policy nomlaydi:
//   leftmost-absorbs / last-absorbs) + 48 L15 (outer face opening chegarasida — chap uch anchor).
// O'ylab topilgan hech narsa yo'q — L14 ikki siyosatini to'g'ridan bajaradi.

import type { Sheet, Refusal } from "./contracts.ts";

export type RedistributePolicy = "proportional" | "last-absorbs";

/**
 * L14: devorni yangi uzunlikka keltirish. Chap uch ANCHOR (outer face 0), o'ng outer face → newWidth.
 *  - "proportional": ichki chiziqlar oralig'i mutanosib masshtablanadi.
 *  - "last-absorbs": faqat oxirgi ustun farqni yutadi; qolganlari o'zgarmaydi.
 * Har oraliq minGap dan kichik bo'lsa — RAD (L14 "baland ovoz bilan xato"; L8 uslubida qoidani nomlaydi).
 * Butun mm (L16): pozitsiyalar yaxlitlanadi, outer aynan newWidth ga qo'yiladi (residual = last-absorbs).
 */
export function setWallLength(sheet: Sheet, newWidth: number, policy: RedistributePolicy, minGap = 0): Sheet | Refusal {
  if (!Number.isInteger(newWidth)) return { rule: "L16", message: `newWidth butun mm emas: ${newWidth}` };
  const s: Sheet = JSON.parse(JSON.stringify(sheet));
  const V = s.vLines;
  if (V.length < 2) return { rule: "L14.tooFew", message: "qayta taqsimlash uchun kamida 2 vertikal chiziq kerak" };

  const tL = s.ends?.left.endPanel ?? 0;
  const tR = s.ends?.right.endPanel ?? 0;
  const oldLeft = V[0]!.pos;
  const oldRight = V[V.length - 1]!.pos;
  const newLeft = oldLeft;                 // chap uch anchor (L15: outer face 0 da qoladi)
  const newRight = newWidth - tR / 2;      // o'ng outer face = newWidth (L15)
  const oldSpan = oldRight - oldLeft;
  const newSpan = newRight - newLeft;
  if (oldSpan <= 0) return { rule: "L14.badSpan", message: "eski oraliq noto'g'ri" };
  if (newSpan <= 0) return { rule: "L14.tooShort", message: `newWidth ${newWidth} juda kichik (chap uch ${newLeft}, o'ng ${newRight})` };

  const newPos: number[] = V.map((l) => l.pos);
  if (policy === "proportional") {
    for (let i = 1; i < V.length - 1; i++) {
      newPos[i] = Math.round(newLeft + (V[i]!.pos - oldLeft) * (newSpan / oldSpan)); // L16: butun
    }
  } else { // last-absorbs: ichki chiziqlar o'z joyida, faqat o'ng outer siljiydi (oxirgi ustun yutadi)
    // (i < n-1 o'zgarmaydi)
  }
  newPos[V.length - 1] = newRight; // outer aynan newWidth (residual last-absorbs, L16)

  // minimum tekshiruvi — L14: buzilsa RAD (baland ovoz, jimgina clamp EMAS)
  for (let i = 0; i + 1 < newPos.length; i++) {
    const face0 = newPos[i]! + (i === 0 ? tL / 2 : 0);          // chap uch ichki yuzasi
    const face1 = newPos[i + 1]! - (i + 1 === newPos.length - 1 ? tR / 2 : 0);
    if (face1 - face0 < minGap) {
      return { rule: "L14.minGap", message: `qayta taqsimlash minimumni buzadi: oraliq ${i}→${i + 1} = ${face1 - face0} < ${minGap} (${policy}) — rad` };
    }
  }

  for (let i = 0; i < V.length; i++) V[i]!.pos = newPos[i]!;
  V.sort((a, b) => a.pos - b.pos);
  if (s.opening) s.opening = { ...s.opening, width: newWidth };
  return s;
}
