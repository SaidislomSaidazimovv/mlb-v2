// 48§6 — Standards profile + "fill wall" gesture. Sof funksiyalar (54§0).
// ASOS: 48§6 ("standards profile loyiha darajasida: thickness, plinth 100, worktop 850, fartuk 600, upper 720,
//   gap'lar — har yangi blok meros oladi; + BITTA gesture: 'devorni ≤900 modul bilan to'ldir' → mo'tabar
//   holatga yetish; qonunlar undan keyin hammasini boshqaradi") + 48 L16 (butun mm, residual policy).
// O'ylab topilgan hech narsa yo'q — raqamlar 48§6 dagi aniq qiymatlar.

export interface StandardsProfile {
  thickness: 16 | 32;
  plinth: number;   // 48§6: 100
  worktop: number;  // 850
  fartuk: number;   // 600
  upper: number;    // 720
  gap: number;      // fasad gap
}

/** 48§6 dagi aniq default qiymatlar (o'ylab topilmagan). */
export const DEFAULT_STANDARDS: StandardsProfile = {
  thickness: 16, plinth: 100, worktop: 850, fartuk: 600, upper: 720, gap: 3,
};

/** 48§6: "devorni ≤maxModule modul bilan to'ldir" — enni teng-taxminan modullarga bo'ladi. Butun mm (L16);
 *  residual LEFTMOST-ABSORBS (48 L16 default). Tizim faqat mo'tabar holat beradi; keyin qonunlar boshqaradi. */
export function fillModules(width: number, maxModule = 900): number[] {
  if (width <= 0) return [];
  const n = Math.max(1, Math.ceil(width / maxModule));
  const base = Math.floor(width / n);
  const rem = width - base * n; // butun qoldiq
  // leftmost-absorbs: chapki `rem` modul 1mm ko'proq oladi (L16 residual, e'lon qilingan)
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}
