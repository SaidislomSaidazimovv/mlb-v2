// T5 — Ops + legal domain. Sof funksiyalar (54§0).
// ASOS: 48 L0 (har op = NOMLANGAN ATOMIK tranzaksiya; commitda tekshiriladi; butun-yoki-hech;
//   NUSXA ustida — asl Sheet o'zgarmaydi, 54§2: "apply yangi Sheet yoki Refusal qaytaradi, mutatsiya yo'q")
//   + L13 (legalDomain — MUTATSIYASIZ "hozir nima qabul qilinardi") + L16 (butun mm) + 54§3 "T5 gate".
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, Refusal, Thickness, LineId, Axis } from "./contracts.ts";
import { addLine, setThickness, lineById, commit } from "./sheet.ts";

export type Op =
  | { kind: "addLine"; axis: Axis; pos: number }
  | { kind: "setThickness"; line: LineId; lo: LineId; hi: LineId; t: Thickness }
  | { kind: "moveLine"; line: LineId; pos: number };

export type ApplyResult =
  | { ok: true; sheet: Sheet }
  | { ok: false; refusals: Refusal[] };

function clone(s: Sheet): Sheet {
  return JSON.parse(JSON.stringify(s)) as Sheet;
}

/** L0: apply — atomik nomlangan tranzaksiya. Nusxa ustida bajaradi (asl Sheet TEGILMAYDI),
 *  commit (invariant) tekshiradi; rad bo'lsa refusals qaytaradi (butun-yoki-hech). */
export function apply(sheet: Sheet, op: Op): ApplyResult {
  const s = clone(sheet);
  switch (op.kind) {
    case "addLine": {
      if (!Number.isInteger(op.pos)) return { ok: false, refusals: [{ rule: "L16", message: `pozitsiya butun mm emas: ${op.pos}` }] };
      addLine(s, op.axis, op.pos);
      break;
    }
    case "setThickness": {
      setThickness(s, op.line, op.lo, op.hi, op.t);
      break;
    }
    case "moveLine": {
      if (!Number.isInteger(op.pos)) return { ok: false, refusals: [{ rule: "L16", message: `pozitsiya butun mm emas: ${op.pos}` }] };
      const ln = lineById(s, op.line);
      if (!ln) return { ok: false, refusals: [{ rule: "op.moveLine", message: `chiziq topilmadi: ${op.line}` }] };
      ln.pos = op.pos;
      (ln.axis === "V" ? s.vLines : s.hLines).sort((a, b) => a.pos - b.pos);
      break;
    }
  }
  const refusals = commit(s); // L0: invariant SHU YERDA (commitda)
  if (refusals.length) return { ok: false, refusals };
  return { ok: true, sheet: s };
}

/** L13: legalDomain — MUTATSIYASIZ. apply nusxa ustida ishlagani uchun kiruvchi `sheet` o'zgarmaydi.
 *  "hozir nima qabul qilinardi" — legal + rad sabablari (qoida nomi bilan). UI shu bilan noqonuniyni
 *  RAD emas, O'CHIQ (greyed) qiladi. */
export function legalDomain(sheet: Sheet, op: Op): { legal: boolean; refusals: Refusal[] } {
  const r = apply(sheet, op);
  return r.ok ? { legal: true, refusals: [] } : { legal: false, refusals: r.refusals };
}
