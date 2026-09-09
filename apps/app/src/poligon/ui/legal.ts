// L11 — sudrash paytida QONUNIY oraliq. Engine HAQIQATAN hal qiladi (legalDomain); UI taxmin qilmaydi.
// Qonuniy to'plam uzluksiz interval (L1), joriy pozitsiya qonuniy (commit holati) → undan ikki tomonga
// binary-search bilan chekkalarni topamiz. O'ylab topilgan geometriya yo'q.
import { legalDomain, lineById } from "../index.ts";
import type { Sheet, LineId } from "../index.ts";

/** moveLine uchun qonuniy [min,max] (butun mm). Qo'shni parallel chiziqlar orasida. */
export function legalMoveRange(sheet: Sheet, lineId: LineId): { min: number; max: number } | null {
  const ln = lineById(sheet, lineId);
  if (!ln) return null;
  const lane = ln.axis === "V" ? sheet.vLines : sheet.hLines;
  const idx = lane.findIndex((l) => l.id === lineId);
  const lower = idx > 0 ? lane[idx - 1]!.pos : ln.pos - 5000;
  const upper = idx < lane.length - 1 ? lane[idx + 1]!.pos : ln.pos + 5000;

  const legal = (pos: number): boolean => legalDomain(sheet, { kind: "moveLine", line: lineId, pos }).legal;
  const cur = ln.pos; // commit holati → qonuniy

  // min: lower..cur oralig'ida eng kichik qonuniy (quyi chegaradan yuqoriga binary-search)
  let good = cur, bad = lower;
  while (good - bad > 1) { const mid = (good + bad) >> 1; if (legal(mid)) good = mid; else bad = mid; }
  const min = good;
  // max: cur..upper oralig'ida eng katta qonuniy
  good = cur; bad = upper;
  while (bad - good > 1) { const mid = (good + bad) >> 1; if (legal(mid)) good = mid; else bad = mid; }
  const max = good;

  return { min, max };
}
