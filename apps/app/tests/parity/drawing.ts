// B — HAQIQIY chizma geometriyasi (founder tushunadigan): (1) yig'ilgan mebel elevatsiyasi (old ko'rinish,
// o'lchamlar bilan), (2) har panel yassi holda REAL teshiklari bilan. mm koordinatalar (y yuqoriga). ASOS:
// 53§6 (chizma), founder "chizmalar". O'ylab topilgan hech narsa yo'q — o'lcham furniture'dan, teshik solveRun'dan.
import type { Furniture, NormPart } from "./compare";

export interface Line2 { x1: number; y1: number; x2: number; y2: number; }
export interface Elevation { W: number; H: number; t: number; lines: Line2[]; shelfYs: number[]; door: boolean; }

/** Yig'ilgan mebel OLD ko'rinishi (elevatsiya): karkas + polkalar + eshik konturi. mm (y yuqoriga). */
export function elevation(f: Furniture): Elevation {
  const t = 16;
  const lines: Line2[] = [];
  const rect = (x1: number, y1: number, x2: number, y2: number) => {
    lines.push({ x1, y1, x2: x2, y2: y1 }, { x1: x2, y1, x2, y2 }, { x1: x2, y1: y2, x2: x1, y2 }, { x1, y1: y2, x2: x1, y2: y1 });
  };
  rect(0, 0, f.width, f.height);            // tashqi kontur
  rect(0, 0, t, f.height);                  // chap yon
  rect(f.width - t, 0, f.width, f.height);  // o'ng yon
  rect(t, 0, f.width - t, t);               // pastki (dno)
  rect(t, f.height - t, f.width - t, f.height); // ustki (kryshka)
  const shelfYs: number[] = [];
  for (let i = 1; i <= f.shelves; i++) {
    const y = Math.round((f.height * i) / (f.shelves + 1));
    shelfYs.push(y);
    lines.push({ x1: t, y1: y, x2: f.width - t, y2: y }); // polka chizig'i
  }
  return { W: f.width, H: f.height, t, lines, shelfYs, door: f.door > 0 };
}

// Panel yassi chizmasi: length (gorizontal) × depth (vertikal), teshiklar (x,y) — solveRun koordinatasi.
export interface PanelDraw { role: string; length: number; depth: number; holes: { x: number; y: number; dia: number }[]; }
export function panelDraw(p: NormPart): PanelDraw {
  return { role: p.role, length: p.length, depth: p.depth, holes: p.holes.map((h) => ({ x: h.x, y: h.y, dia: h.dia })) };
}
