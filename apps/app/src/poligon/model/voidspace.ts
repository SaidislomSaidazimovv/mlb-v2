// B5 — Void / Reserved / Absorb (L9) + qo'shni-Void birlashuvi (L10). Sof funksiyalar (54§0).
// ASOS: 48 L9 (delete → Void, hech qachon teshik; Void=chin bo'shliq, Reserved=appliance slot: o'lchamli,
//   nomlangan, ko'chmas, equalize'dan OZOD, nominal+clearance per face [clearance profildan, nominal ichiga
//   singdirilmaydi]; "gap yopish" = OSHKORA Absorb komandasi, chap qo'shni oladi — hech qachon avtomatik EMAS)
//   + 48 L10 (avtomatik faqat provably-inert: qo'shni Void'lar birlashishi + har segmenti Void-to-Void chiziqni
//   olib tashlash — mumkin) + 53§3 ("delete-part YO'Q; faqat 'segmentni taxtasiz qil'; chiziq/sheet qoladi").
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, LineId, Thickness, Block, ReservedMeta, Refusal } from "./contracts.ts";
import { getThickness, setThickness } from "./sheet.ts";

function clone(s: Sheet): Sheet { return JSON.parse(JSON.stringify(s)) as Sheet; }

/** 53§3: taxtani "o'chirish" = segmentni 0 qilish. delete-part YO'Q — chiziq/sheet QOLADI (teshik emas). */
export function deleteBoard(sheet: Sheet, line: LineId, lo: LineId, hi: LineId): Sheet {
  const s = clone(sheet);
  setThickness(s, line, lo, hi, 0);
  return s;
}

/** 48 L9: blokni o'chirish → uning kataklari OSHKORA Void bo'ladi (teshik emas). */
export function voidBlock(sheet: Sheet, blockId: string): Sheet | Refusal {
  const s = clone(sheet);
  const b = s.blocks.find((x) => x.id === blockId);
  if (!b) return { rule: "L9.noBlock", message: `blok topilmadi: ${blockId}` };
  b.type = "void";
  delete b.reserved;
  return s;
}

/** 48 L9: Reserved (appliance slot) — o'lchamli/nomlangan/ko'chmas/equalize'dan ozod; nominal+clearance. */
export function reserveBlock(sheet: Sheet, blockId: string, meta: ReservedMeta): Sheet | Refusal {
  const s = clone(sheet);
  const b = s.blocks.find((x) => x.id === blockId);
  if (!b) return { rule: "L9.noBlock", message: `blok topilmadi: ${blockId}` };
  b.type = "reserved";
  b.reserved = meta;
  return s;
}

/** 48 L9: Reserved equalize'dan OZOD. */
export function isExemptFromEqualize(b: Block): boolean {
  return b.type === "reserved";
}

/** 48 L9: Reserved footprint = nominal + clearance HAR YUZAda (clearance nominal ichiga singdirilmaydi). */
export function reservedFootprint(m: ReservedMeta): { width: number; height: number } {
  return { width: m.nominalW + 2 * m.clearance, height: m.nominalH + 2 * m.clearance };
}

/** Chiziqning HAMMA segmenti 0 (Void-to-Void)mi — L10 chiziq olib tashlash sharti. */
function lineAllVoid(s: Sheet, line: LineId, axis: "V" | "H"): boolean {
  const perp = axis === "V" ? s.hLines : s.vLines;
  for (let i = 0; i + 1 < perp.length; i++) if (getThickness(s, line, perp[i]!.id, perp[i + 1]!.id) !== 0) return false;
  return true;
}

function removeLine(s: Sheet, line: LineId, axis: "V" | "H"): void {
  const lane = axis === "V" ? s.vLines : s.hLines;
  const idx = lane.findIndex((l) => l.id === line);
  if (idx >= 0) lane.splice(idx, 1);
  for (const k of Object.keys(s.seg)) if (k.startsWith(line + "|")) delete s.seg[k]; // shu chiziq segmentlari
}

/**
 * 48 L9: OSHKORA Absorb — chap qo'shni Void'ni yutadi (hech qachon avtomatik emas). Qo'shni topilmasa RAD.
 * L10: bo'linuvchi chiziq har segmenti Void-to-Void bo'lsa — olib tashlanadi (provably-inert).
 */
export function absorb(sheet: Sheet, voidId: string): Sheet | Refusal {
  const s = clone(sheet);
  const v = s.blocks.find((x) => x.id === voidId);
  if (!v) return { rule: "L9.noBlock", message: `blok topilmadi: ${voidId}` };
  if (v.type !== "void") return { rule: "L9.notVoid", message: `${voidId} Void emas (Absorb faqat Void'ni yutadi)` };
  // chap qo'shni: o'ng qirrasi (vHi) Void'ning chap qirrasiga (vLo) tegadi, bir xil h-oralig'i
  const left = s.blocks.find((x) => x.id !== voidId && x.vHi === v.vLo && x.hLo === v.hLo && x.hHi === v.hHi);
  if (!left) return { rule: "L9.noLeftNeighbour", message: `${voidId} uchun chap qo'shni yo'q — Absorb bo'lmaydi` };
  const dividing = v.vLo;               // yutilgandan keyingi ortiqcha chiziq
  left.vHi = v.vHi;                     // chap qo'shni Void'ning eniga cho'ziladi
  s.blocks = s.blocks.filter((x) => x.id !== voidId);
  // L10: bo'linuvchi chiziq endi hech qanday blokka chegara emas VA taxtasiz bo'lsa — olib tashlanadi
  const stillBoundary = s.blocks.some((x) => x.vLo === dividing || x.vHi === dividing);
  if (!stillBoundary && lineAllVoid(s, dividing, "V")) removeLine(s, dividing, "V");
  return s;
}

/** 48 L10: qo'shni Void'larni birlashtirish — provably-inert (parts o'zgarmaydi). Gorizontal + vertikal. */
export function mergeAdjacentVoids(sheet: Sheet): Sheet {
  const s = clone(sheet);
  let merged = true;
  while (merged) {
    merged = false;
    const voids = s.blocks.filter((b) => b.type === "void");
    for (const a of voids) {
      // gorizontal qo'shni (bir xil h-oralig'i, a.vHi === b.vLo)
      const hNbr = voids.find((b) => b !== a && b.hLo === a.hLo && b.hHi === a.hHi && a.vHi === b.vLo);
      if (hNbr) { a.vHi = hNbr.vHi; s.blocks = s.blocks.filter((x) => x.id !== hNbr.id); merged = true; break; }
      // vertikal qo'shni (bir xil v-oralig'i, a.hHi === b.hLo)
      const vNbr = voids.find((b) => b !== a && b.vLo === a.vLo && b.vHi === a.vHi && a.hHi === b.hLo);
      if (vNbr) { a.hHi = vNbr.hHi; s.blocks = s.blocks.filter((x) => x.id !== vNbr.id); merged = true; break; }
    }
  }
  return s;
}
