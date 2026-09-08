// Sheet yadrosi — primitivlar. T1.
// ASOS: 48§0-1 (model), L0/L1/L4/L5b/L12/L16; 54§3 "T1 gate" (round-trip, L1 commitda buzilmaydi).
// Sof funksiyalar (54§0): UI yo'q, I/O yo'q.

import type { Axis, Thickness, LineId, Line, Sheet, Refusal } from "./contracts.ts";
import { EPS, DEFAULT_MIN } from "./contracts.ts";

let _seq = 0;
const newId = (p: string): string => `${p}${++_seq}`;

export function createSheet(): Sheet {
  return { vLines: [], hLines: [], seg: {}, blocks: [] };
}

const lanes = (s: Sheet, axis: Axis): Line[] => (axis === "V" ? s.vLines : s.hLines);

/** 48§0 segment kaliti: chiziq + uni chegaralagan ikki perpendikulyar chiziq (id). */
export function segKey(line: LineId, lo: LineId, hi: LineId): string {
  return `${line}|${lo}-${hi}`;
}

/** L16: butun mm shart. L5b: ε-snap — mavjud (committed) chiziqqa <EPS bo'lsa, YANGI chiziq emas, o'sha. */
export function addLine(s: Sheet, axis: Axis, pos: number): { id: LineId; snapped: boolean } {
  if (!Number.isInteger(pos)) {
    throw new Error(`L16: pozitsiya butun mm bo'lishi kerak, keldi: ${pos}`);
  }
  const lane = lanes(s, axis);
  for (const ln of lane) {
    if (Math.abs(ln.pos - pos) < EPS) return { id: ln.id, snapped: true }; // L5b
  }
  const id = newId(axis === "V" ? "v" : "h");
  lane.push({ id, axis, pos });
  lane.sort((a, b) => a.pos - b.pos);
  return { id, snapped: false };
}

export function lineById(s: Sheet, id: LineId): Line | undefined {
  return s.vLines.find((l) => l.id === id) ?? s.hLines.find((l) => l.id === id);
}

export function setThickness(s: Sheet, line: LineId, lo: LineId, hi: LineId, t: Thickness): void {
  s.seg[segKey(line, lo, hi)] = t;
}
export function getThickness(s: Sheet, line: LineId, lo: LineId, hi: LineId): Thickness {
  return s.seg[segKey(line, lo, hi)] ?? 0;
}

/** 48§0: chiziq yuzalari = pos ± qalinlik/2 (qalinlik juft: 0/16/32 → yarmi 0/8/16 butun). */
export function faces(pos: number, t: Thickness): { left: number; right: number } {
  return { left: pos - t / 2, right: pos + t / 2 };
}

/** 48 L1: yuza tartiblash. Har qo'shni chiziq juftligida, har perpendikulyar oraliqda (qatorda):
 *  rightFace(Lᵢ) + min ≤ leftFace(Lᵢ₊₁). Buzilsa — manfiy ichki bo'shliq → "L1" rad. */
export function checkL1(s: Sheet, min: number = DEFAULT_MIN): Refusal[] {
  const out: Refusal[] = [];
  const scan = (primary: Line[], perp: Line[]): void => {
    if (primary.length < 2 || perp.length < 2) return; // segment uchun ikki tomondan chegara kerak
    for (let r = 0; r + 1 < perp.length; r++) {
      const lo = perp[r]!;
      const hi = perp[r + 1]!;
      for (let i = 0; i + 1 < primary.length; i++) {
        const a = primary[i]!;
        const b = primary[i + 1]!;
        const rightA = a.pos + getThickness(s, a.id, lo.id, hi.id) / 2;
        const leftB = b.pos - getThickness(s, b.id, lo.id, hi.id) / 2;
        if (leftB - rightA < min) {
          out.push({
            rule: "L1",
            message: `L1: manfiy ichki bo'shliq ${a.id}<->${b.id} (qator ${lo.id}-${hi.id}): rightFace=${rightA} > leftFace=${leftB}`,
          });
        }
      }
    }
  };
  scan(s.vLines, s.hLines);
  scan(s.hLines, s.vLines);
  return out;
}

/** L4: bo'lak — mavjud chiziqlar chegaralagan to'rtburchak. */
export function addBlock(
  s: Sheet, type: string, vLo: LineId, vHi: LineId, hLo: LineId, hHi: LineId,
): { id: string } | Refusal {
  for (const id of [vLo, vHi, hLo, hHi]) {
    if (!lineById(s, id)) return { rule: "L4", message: `L4: chiziq topilmadi: ${id}` };
  }
  const id = newId("b");
  s.blocks.push({ id, type, vLo, vHi, hLo, hHi });
  return { id };
}

/** L0: commit — invariantlar SHU YERDA tekshiriladi. Bo'sh massiv => qabul. */
export function commit(s: Sheet): Refusal[] {
  return checkL1(s);
}

/** L12 / round-trip: Sheet sof ma'lumot — serialize→parse aynan bir xil bo'lishi kerak. */
export function serialize(s: Sheet): string {
  return JSON.stringify(s);
}
export function parse(str: string): Sheet {
  return JSON.parse(str) as Sheet;
}
