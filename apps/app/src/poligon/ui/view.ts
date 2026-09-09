// Poligon UI — umumiy ko'rinish yordamchilari (mm↔px, palitra, rol ranglari). Sof, React'siz.
import type { Sheet, Role, LineId } from "../index.ts";
import { getThickness } from "../index.ts";

export const PAL = {
  bg: "#14110d", panel: "#1c1813", ink: "#efe8da", dim: "#9a9186", line: "#3a342c",
  accent: "#c8a25a", ok: "#5aa06a", bad: "#c05a4e",
  carcass: "#efe8da", worktop: "#7c756b", side: "#e7ddc9", back: "#b9ad98",
};

export const ROLE_COLOR: Record<Role, string> = {
  worktop: "#7c756b", side: "#e7ddc9", top: "#d8ccb2", bottom: "#d8ccb2",
  shelf: "#cbbd9f", divider: "#c3b494", back: "#b9ad98",
};

export interface Extent { minX: number; maxX: number; minY: number; maxY: number; }

export function sheetExtent(s: Sheet): Extent {
  const xs = s.vLines.map((l) => l.pos);
  const ys = s.hLines.map((l) => l.pos);
  return {
    minX: xs.length ? Math.min(...xs) : 0, maxX: xs.length ? Math.max(...xs) : 1000,
    minY: ys.length ? Math.min(...ys) : 0, maxY: ys.length ? Math.max(...ys) : 1000,
  };
}

/** Bir segment = to'rtburchak (qalinligi markaz-chizig'iga nisbatan). thickness>0 bo'lganlarigina. */
export interface SegRect {
  line: LineId; lo: LineId; hi: LineId; axis: "V" | "H"; t: 16 | 32;
  x0: number; x1: number; y0: number; y1: number; // mm
}
export function enumerateSegments(s: Sheet): SegRect[] {
  const out: SegRect[] = [];
  for (let i = 0; i + 1 < s.hLines.length; i++) {          // V chiziqlar: perp = hLines
    const lo = s.hLines[i]!, hi = s.hLines[i + 1]!;
    for (const v of s.vLines) {
      const t = getThickness(s, v.id, lo.id, hi.id);
      if (t !== 0) out.push({ line: v.id, lo: lo.id, hi: hi.id, axis: "V", t, x0: v.pos - t / 2, x1: v.pos + t / 2, y0: lo.pos, y1: hi.pos });
    }
  }
  for (let i = 0; i + 1 < s.vLines.length; i++) {          // H chiziqlar: perp = vLines
    const lo = s.vLines[i]!, hi = s.vLines[i + 1]!;
    for (const h of s.hLines) {
      const t = getThickness(s, h.id, lo.id, hi.id);
      if (t !== 0) out.push({ line: h.id, lo: lo.id, hi: hi.id, axis: "H", t, x0: lo.pos, x1: hi.pos, y0: h.pos - t / 2, y1: h.pos + t / 2 });
    }
  }
  return out;
}

/** mm→px transform. Y flip: mebel y=0 pol (pastda), SVG y pastga o'sadi → aylantiramiz. */
export function makeView(ext: Extent, w: number, h: number, pad = 48) {
  const spanX = Math.max(1, ext.maxX - ext.minX);
  const spanY = Math.max(1, ext.maxY - ext.minY);
  const scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const sx = (mm: number) => pad + (mm - ext.minX) * scale;
  const sy = (mm: number) => h - pad - (mm - ext.minY) * scale; // flip
  const inv = {
    x: (px: number) => ext.minX + (px - pad) / scale,
    y: (px: number) => ext.minY + (h - pad - px) / scale,
  };
  return { scale, sx, sy, inv, pad };
}
