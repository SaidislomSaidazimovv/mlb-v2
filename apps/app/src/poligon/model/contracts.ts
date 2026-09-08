// Sheet yadrosi — tiplar (kontraktlar). T1.
// ASOS: docs/september-8/48_SHEET_LOGIC.md §0-1 (model) + L1/L5b/L16.
// O'ylab topilgan hech narsa yo'q — har element 48§0-1 dagi ta'rifga mos.

/** 48§0: chiziq vertikal (V) yoki gorizontal (H), devorga global. */
export type Axis = "V" | "H";

/** 48§0: segment qalinligi — 0 (taxta yo'q), 16 (bitta), 32 (ikkita orqa-orqa). Har SEGMENT-da, har ikki o'qda. */
export type Thickness = 0 | 16 | 32;

export type LineId = string;

/** 48§0: chiziqning barqaror id + pozitsiya (markaz chizig'i, BUTUN son mm — L16). Chiziqlar enisiz. */
export interface Line {
  id: LineId;
  axis: Axis;
  pos: number; // butun mm (L16)
}

/** 48§0 / L4: bo'lak — kataklar to'rtburchagi, chegara chiziqlari id lari bilan. */
export interface Block {
  id: string;
  type: string;
  vLo: LineId;
  vHi: LineId;
  hLo: LineId;
  hHi: LineId;
}

/** 48§0: Sheet — bitta devor. Chiziqlar + segment qalinliklari + bloklar. Qolgani (part, module) DERIVED. */
export interface Sheet {
  vLines: Line[]; // pos bo'yicha tartiblangan
  hLines: Line[]; // pos bo'yicha tartiblangan
  seg: Record<string, Thickness>; // segKey -> qalinlik (yozuv yo'q => 0)
  blocks: Block[];
}

/** 48 L8/L13: rad etish — QAYSI qoida rad etganini nomlaydi. */
export interface Refusal {
  rule: string;
  message: string;
}

/** 48 L5b: ε — MODEL fazosi = 1mm (ekran piksel EMAS). */
export const EPS = 1;

/** L1 minimum interval (T1: 0 = manfiy ichki bo'shliqni aniqlash; egallovchi-minimumlar L8 = keyingi bosqich). */
export const DEFAULT_MIN = 0;
