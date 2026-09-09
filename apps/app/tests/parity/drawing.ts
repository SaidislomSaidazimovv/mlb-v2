// B — bo'laklar chizmasi joylashuvi (sof). Har bo'lak = nomlangan to'rtburchak (uzunlik×chuqurlik), qatorlarga
// joylanadi. ASOS: 53§6 (chizma + jadval); founder "chizmalar". Eski va yangi uchun BIR XIL renderer — solishtiruv
// halol bo'lsin. O'ylab topilgan hech narsa yo'q — faqat NormPart o'lchamlarini joylashtiradi.
import type { NormPart } from "./compare";

export interface DrawnRect { label: string; x: number; y: number; w: number; h: number; }
export interface Drawing { title: string; rects: DrawnRect[]; width: number; height: number; }

/** Bo'laklarni qatorlarga joylash (nesting emas — ko'rgazma uchun). scale = mm→birlik; gap = bo'shliq. */
export function layoutParts(title: string, parts: NormPart[], opts: { scale?: number; gap?: number; maxRowWidth?: number } = {}): Drawing {
  const scale = opts.scale ?? 0.08;      // mm → chizma birligi
  const gap = opts.gap ?? 8;
  const maxRowWidth = opts.maxRowWidth ?? 520;
  const rects: DrawnRect[] = [];
  let x = gap, y = gap, rowH = 0;
  for (const p of parts) {
    const w = Math.max(p.length * scale, 20); // uzunlik gorizontal
    const h = Math.max(p.depth * scale, 12);  // chuqurlik vertikal
    if (x + w + gap > maxRowWidth && x > gap) { x = gap; y += rowH + gap; rowH = 0; } // yangi qator
    rects.push({ label: `${p.role} ${p.length}×${p.depth}`, x, y, w, h });
    x += w + gap;
    rowH = Math.max(rowH, h);
  }
  const width = maxRowWidth;
  const height = y + rowH + gap;
  return { title, rects, width, height };
}
