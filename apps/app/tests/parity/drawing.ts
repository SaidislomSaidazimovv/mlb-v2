// B — HAQIQIY chizma geometriyasi: har VERSIYA o'zi chiqaradigan mebelni ko'rsatadi.
//  - elevationOld: ESKI (grid.ts) — karkas + tortma/polka + pardevor + eshik konturi (to'liq mebel).
//  - elevationNew: YANGI (poligon) — karkas + full-width polka + eshik (poligon modellaydigani; tortma/pardevor YO'Q).
// Farq VIZUAL ko'rinadi (halol). + panel yassi chizmasi real teshik bilan. mm (y yuqoriga).
import type { Furniture, NormPart } from "./compare";

export interface Line2 { x1: number; y1: number; x2: number; y2: number; color?: string; dash?: boolean; }
export interface Elevation { W: number; H: number; lines: Line2[]; }

const T = 16;
function carcass(f: Furniture, lines: Line2[]): void {
  const rect = (x1: number, y1: number, x2: number, y2: number, color?: string, dash?: boolean) =>
    lines.push({ x1, y1, x2, y2: y1, color, dash }, { x1: x2, y1, x2, y2, color, dash }, { x1: x2, y1: y2, x2: x1, y2, color, dash }, { x1, y1: y2, x2: x1, y2: y1, color, dash });
  rect(0, 0, f.width, f.height);                    // tashqi
  rect(0, 0, T, f.height);                          // chap yon
  rect(f.width - T, 0, f.width, f.height);          // o'ng yon
  rect(T, 0, f.width - T, T);                       // dno
  rect(T, f.height - T, f.width - T, f.height);     // kryshka
}

/** ESKI (grid.ts) — to'liq mebel: karkas + tortma/polka + pardevor + eshik. */
export function elevationOld(f: Furniture): Elevation {
  const lines: Line2[] = [];
  carcass(f, lines);
  const divXs: number[] = f.dividers === 1 ? [f.width / 2] : f.dividers === 2 ? [f.width / 3, (2 * f.width) / 3] : [];
  for (const x of divXs) lines.push({ x1: x, y1: T, x2: x, y2: f.height - T }); // pardevor
  const sections = [0, ...divXs, f.width];
  if (f.fill === "drawers") {
    for (let s = 0; s + 1 < sections.length; s++) {
      const x0 = s === 0 ? T : sections[s]!, x1 = s + 2 === sections.length ? f.width - T : sections[s + 1]!;
      for (let d = 1; d <= f.count; d++) { const yy = Math.round((f.height * d) / (f.count + 1)); lines.push({ x1: x0, y1: yy, x2: x1, y2: yy, color: "#b8863c" }); }
    }
  } else if (f.fill === "shelves") {
    for (let s = 0; s + 1 < sections.length; s++) {
      const x0 = s === 0 ? T : sections[s]! + T / 2, x1 = s + 2 === sections.length ? f.width - T : sections[s + 1]! - T / 2;
      for (let d = 1; d <= f.count; d++) { const yy = Math.round((f.height * d) / (f.count + 1)); lines.push({ x1: x0, y1: yy, x2: x1, y2: yy }); }
    }
  }
  if (f.door) lines.push({ x1: 2, y1: 2, x2: f.width - 2, y2: 2, color: "#c8a25a", dash: true }, { x1: f.width - 2, y1: 2, x2: f.width - 2, y2: f.height - 2, color: "#c8a25a", dash: true }, { x1: f.width - 2, y1: f.height - 2, x2: 2, y2: f.height - 2, color: "#c8a25a", dash: true }, { x1: 2, y1: f.height - 2, x2: 2, y2: 2, color: "#c8a25a", dash: true });
  return { W: f.width, H: f.height, lines };
}

/** YANGI (poligon) — karkas + FULL-WIDTH polka + TORTMA fasadi (poligon front-qatlam) + eshik. Pardevor YO'Q. */
export function elevationNew(f: Furniture): Elevation {
  const lines: Line2[] = [];
  carcass(f, lines);
  if (f.fill === "shelves") for (let d = 1; d <= f.count; d++) { const yy = Math.round((f.height * d) / (f.count + 1)); lines.push({ x1: T, y1: yy, x2: f.width - T, y2: yy }); }
  else if (f.fill === "drawers") for (let d = 1; d <= f.count; d++) { const yy = Math.round((f.height * d) / (f.count + 1)); lines.push({ x1: T, y1: yy, x2: f.width - T, y2: yy, color: "#b8863c" }); } // tortma fasadi
  if (f.door) lines.push({ x1: 2, y1: 2, x2: f.width - 2, y2: 2, color: "#c8a25a", dash: true }, { x1: f.width - 2, y1: 2, x2: f.width - 2, y2: f.height - 2, color: "#c8a25a", dash: true }, { x1: f.width - 2, y1: f.height - 2, x2: 2, y2: f.height - 2, color: "#c8a25a", dash: true }, { x1: 2, y1: f.height - 2, x2: 2, y2: 2, color: "#c8a25a", dash: true });
  return { W: f.width, H: f.height, lines };
}

export interface PanelDraw { role: string; length: number; depth: number; holes: { x: number; y: number; dia: number }[]; }
export function panelDraw(p: NormPart): PanelDraw {
  return { role: p.role, length: p.length, depth: p.depth, holes: p.holes.map((h) => ({ x: h.x, y: h.y, dia: h.dia })) };
}
