// T3 — Board runs (taxta yugurishlari) = "bo'laklarga bo'lish". Sof funksiyalar (54§0).
// ASOS: 48 L6 — "taxta = bir xil chiziqli segmentlarning MAKSIMAL yugurishi, through-junctionda
//   birlashadi; QALINLIK o'zgarishi yugurishni tugatadi (material/tola ham — keyingi)".
//   + 54§3 "T3 gate": baza + penal umumiy chiziqni bo'lishsa → BITTA 2400 taxta, bazaning o'ng sidesi yo'q.
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, Line, Thickness, LineId } from "./contracts.ts";
import { getThickness } from "./sheet.ts";

/** Bitta fizik taxta (bir chiziq bo'ylab maksimal yugurish). length = yugurish uzunligi (mm). */
export interface Board {
  line: LineId;
  axis: "V" | "H";
  from: number; // yugurish boshi (perp chiziq pozitsiyasi)
  to: number;   // yugurish oxiri
  thickness: Thickness;
  length: number;
}

/** Shu chiziqning taxtasi berilgan crossing (perp chiziq pozitsiyasi)da DAVOM etadimi?
 *  true = davom etadi (bu chiziq through yoki crossing to'smaydi);
 *  false = perpendikulyar-through kesib o'tdi → taxta shu yerda bo'linadi (L6). */
export type ThroughAt = (line: Line, atPerpPos: number) => boolean;

/** 48 L6 + 53§5: segment MATERIAL/TOLA belgisi (token). O'zgarsa board run TUGAYDI (turli material/tola =
 *  ikki board). Berilmasa → bo'sh (material/tola farqlanmaydi, faqat qalinlik — eski xatti-harakat). */
export type AttrOf = (line: LineId, lo: LineId, hi: LineId) => string;

export function boardRuns(s: Sheet, throughAt: ThroughAt, attrOf: AttrOf = () => ""): Board[] {
  const boards: Board[] = [];

  const scan = (lines: Line[], perp: Line[]): void => {
    if (perp.length < 2) return;
    for (const ln of lines) {
      let startIdx = -1;
      let runThk: Thickness = 0;
      let runAttr = "";

      const close = (endIdx: number): void => {
        if (startIdx < 0) return;
        const from = perp[startIdx]!.pos;
        const to = perp[endIdx]!.pos;
        boards.push({ line: ln.id, axis: ln.axis, from, to, thickness: runThk, length: to - from });
        startIdx = -1;
        runThk = 0;
        runAttr = "";
      };

      for (let i = 0; i + 1 < perp.length; i++) {
        const lo = perp[i]!;
        const hi = perp[i + 1]!;
        const t = getThickness(s, ln.id, lo.id, hi.id);
        const attr = attrOf(ln.id, lo.id, hi.id);

        if (t === 0) {
          close(i); // taxta yo'q → yugurish yopiladi
          continue;
        }
        if (startIdx < 0) {
          startIdx = i;
          runThk = t; // yangi yugurish
          runAttr = attr;
        } else if (t !== runThk) {
          close(i); // L6: qalinlik o'zgarishi tugatadi
          startIdx = i; runThk = t; runAttr = attr;
        } else if (attr !== runAttr) {
          close(i); // L6/53§5: material/tola o'zgarishi tugatadi (ikki board)
          startIdx = i; runThk = t; runAttr = attr;
        } else if (!throughAt(ln, lo.pos)) {
          close(i); // perpendikulyar-through kesdi → bo'linadi
          startIdx = i; runThk = t; runAttr = attr;
        }
        // aks holda: bir xil qalinlik + material/tola + through → yugurish davom etadi
      }
      close(perp.length - 1);
    }
  };

  scan(s.vLines, s.hLines);
  scan(s.hLines, s.vLines);
  return boards;
}
