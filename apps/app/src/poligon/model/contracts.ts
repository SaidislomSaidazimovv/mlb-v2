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

/** 48 L9: Reserved (appliance slot) metadatasi — o'lchamli, nomlangan, ko'chmas, equalize'dan ozod.
 *  clearance HAR YUZAda alohida, nominal ICHIGA SINGDIRILMAYDI (profildan keladi). */
export interface ReservedMeta {
  name: string;
  nominalW: number;   // asbob nominal eni (mm) — clearance qo'shilmagan
  nominalH: number;   // nominal balandligi
  clearance: number;  // har yuzaga bo'shliq (profildan; nominal ichiga BAKED emas)
  layer: string;      // qatlam tegi (behind/carcass/front/above)
}

/** 48 L3 / 50§1: qatlam — behind / carcass / front / above. FAQAT carcass to'la bo'lishi shart. */
export type Layer = "behind" | "carcass" | "front" | "above";

/** 48§0 / L4: bo'lak — kataklar to'rtburchagi, chegara chiziqlari id lari bilan.
 *  type: masalan "base"/"tall"/... yoki L9 maxsus: "void" (chin bo'shliq) / "reserved" (appliance slot).
 *  layer: 48 L3 qatlami (berilmasa carcass — strukturaviy tekis). */
export interface Block {
  id: string;
  type: string;
  vLo: LineId;
  vHi: LineId;
  hLo: LineId;
  hHi: LineId;
  layer?: Layer;           // 48 L3 (berilmasa carcass)
  reserved?: ReservedMeta; // type==="reserved" bo'lsa
}

/** 48 L15: devor UCHI holati. `into-corner` → Reserved ustun (qo'shni devor chuqurligi, tahrirlanmaydi). */
export type EndKind = "free" | "into-corner" | "against-wall";
export interface EndSpec {
  kind: EndKind;
  endPanel: Thickness;   // uch-panel qalinligi: 0 (wall-hung, panelsiz) yoki 16 (panel bilan)
  cornerDepth?: number;  // into-corner: Reserved ustun eni = qo'shni devor chuqurligi
}
export interface WallEnds { left: EndSpec; right: EndSpec; }
/** 48 L15: opening — devor tashqi chegarasi (outermost lines' OUTER faces shu bilan chegaralanadi). */
export interface Opening { width: number; height: number; }

/** 48§3: pozitsiya RELATION'i — `line` DERIVED: pos = ref.pos + offset. E'lon qilingan, ko'rinadigan,
 *  buziladigan (pin qilinsa relation olib tashlanadi → authored). Masalan fartuk: upper.pos = worktop.pos + offset. */
export interface PositionRelation { line: LineId; ref: LineId; offset: number; }

/** 48§0: Sheet — bitta devor. Chiziqlar + segment qalinliklari + bloklar. Qolgani (part, module) DERIVED. */
export interface Sheet {
  vLines: Line[]; // pos bo'yicha tartiblangan
  hLines: Line[]; // pos bo'yicha tartiblangan
  seg: Record<string, Thickness>; // segKey -> qalinlik (yozuv yo'q => 0)
  blocks: Block[];
  opening?: Opening;  // 48 L15: e'lon qilingan devor tashqi o'lchovi (bo'lsa)
  ends?: WallEnds;    // 48 L15: chap/o'ng uch holati (bo'lsa)
  relations?: PositionRelation[]; // 48§3: derived pozitsiyalar (tegilmagunча ref'ga ergashadi)
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
