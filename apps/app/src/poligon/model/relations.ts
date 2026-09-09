// B7 — "Derived-until-touched" (48§3). Sof funksiyalar (54§0).
// ASOS: 48§3 ("har pozitsiya tegilmaguncha DERIVED yoki E'LON QILINGAN relation'dan; tegilsa PIN qilinadi.
//   Fartuk = upper-bottom − worktop-top; hech kim yozmaydi. Worktop siljisa uppers ERGASHADI — kimdir pin
//   qilmaguncha; keyin ergashmaydi, pin EKRANda ko'rinadi. L10 ni buzmaydi: relation e'lon qilingan,
//   ko'rinadigan, buziladigan"). Butun mm (L16).
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, LineId, PositionRelation, Refusal } from "./contracts.ts";
import { lineById } from "./sheet.ts";

function clone(s: Sheet): Sheet { return JSON.parse(JSON.stringify(s)) as Sheet; }

/** 48§3: chiziq DERIVED (relation'i bor)mi yoki AUTHORED/pinned (yo'q)mi. */
export function isDerived(sheet: Sheet, line: LineId): boolean {
  return (sheet.relations ?? []).some((r) => r.line === line);
}

/** 48§3: relation e'lon qilish — `line` endi `ref` ga ergashadi (derived). Butun offset (L16). */
export function declareRelation(sheet: Sheet, line: LineId, ref: LineId, offset: number): Sheet | Refusal {
  if (!Number.isInteger(offset)) return { rule: "L16", message: `offset butun mm emas: ${offset}` };
  if (!lineById(sheet, line) || !lineById(sheet, ref)) return { rule: "rel.noLine", message: `chiziq topilmadi: ${line}/${ref}` };
  if (line === ref) return { rule: "rel.self", message: `chiziq o'ziga ergasholmaydi: ${line}` };
  const s = clone(sheet);
  s.relations = [...(s.relations ?? []).filter((r) => r.line !== line), { line, ref, offset }];
  return s;
}

/**
 * 48§3: DERIVED pozitsiyalarni ref'lardan hisoblab qo'yadi (chain'lar bo'ylab, memo bilan). Authored/pinned
 * chiziqlar o'zgarmaydi. Tsikl bo'lsa — RAD (jimgina to'xtamaydi). Worktop siljisa — bu qayta-hisobda uppers ergashadi.
 */
export function resolvePositions(sheet: Sheet): Sheet | Refusal {
  const s = clone(sheet);
  const rels = new Map<LineId, PositionRelation>();
  for (const r of s.relations ?? []) rels.set(r.line, r);
  const memo = new Map<LineId, number>();
  const state = new Map<LineId, 0 | 1>(); // 1 = hisoblanmoqda (tsikl aniqlash)

  const resolveOne = (id: LineId): number | Refusal => {
    if (memo.has(id)) return memo.get(id)!;
    const rel = rels.get(id);
    const ln = lineById(s, id);
    if (!ln) return { rule: "rel.noLine", message: `chiziq topilmadi: ${id}` };
    if (!rel) { memo.set(id, ln.pos); return ln.pos; } // authored/pinned — o'z pozitsiyasi
    if (state.get(id) === 1) return { rule: "rel.cycle", message: `48§3: tsiklik relation — ${id}` };
    state.set(id, 1);
    const refPos = resolveOne(rel.ref);
    if (typeof refPos === "object") return refPos;
    state.set(id, 0);
    const pos = refPos + rel.offset; // butun (offset+authored butun → butun, L16)
    memo.set(id, pos);
    return pos;
  };

  for (const lane of [s.vLines, s.hLines]) {
    for (const ln of lane) {
      const r = resolveOne(ln.id);
      if (typeof r === "object") return r;
      ln.pos = r;
    }
    lane.sort((a, b) => a.pos - b.pos);
  }
  return s;
}

/** 48§3: "touching pins it" — pozitsiyani PIN qilish: relation olib tashlanadi (joriy pos'da AUTHORED bo'ladi),
 *  endi ref'ga ERGASHMAYDI. (Pin ko'rinadigan holat — isDerived endi false.) Avval joriy derived pos hisoblanadi. */
export function pinPosition(sheet: Sheet, line: LineId): Sheet | Refusal {
  const resolved = resolvePositions(sheet); // avval derived pos'ni aniqlash
  if ("rule" in resolved) return resolved;
  const s = clone(resolved);
  s.relations = (s.relations ?? []).filter((r) => r.line !== line);
  if (s.relations.length === 0) delete s.relations;
  return s;
}
