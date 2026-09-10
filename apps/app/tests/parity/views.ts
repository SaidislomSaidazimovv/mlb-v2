// B — OSHXONA ko'rinishlari (founder: umumiy 3D + fasad + tepadan + 4 tomon, ICHKI qism, aniq o'lchamlar,
// DEVOR rang+yozuv; buzilish/ustma-ust matn YO'Q). Real mm (y yuqoriga). O'lchamlar chekka (margin)ga chiqadi
// (drawView/svg renderer joylaydi); yozuvlar faqat bo'sh joyga. GEOM layout.ts'dan: plinth 120, base 120..840,
// worktop 840..880, upper 1520..2240, base chuqur 560, upper chuqur 350. O'ylab topilgan hech narsa yo'q.
import type { Furniture, Kitchen } from "./compare";

export interface Shape { t: "rect" | "line"; x1: number; y1: number; x2: number; y2: number; stroke?: string; fill?: string; dash?: boolean }
export interface Label { x: number; y: number; text: string; color?: string; size?: number; mid?: boolean }
export interface View {
  title: string; W: number; H: number; shapes: Shape[]; labels: Label[];
  xLabel: string; yLabel: string; // o'lcham margin uchun (mas. "eni"/"balandlik"); W/H = real mm span
}

const T = 16, PLINTH = 120, BASE_TOP = 840, WT_TOP = 880, UPPER_BOT = 1520;
const WALL = "#e3d4b0", WALLSTROKE = "#c9b483", WT = "#8a837a", DRW = "#b8863c", DOOR = "#c8a25a", SHELF = "#666", CARC = "#333";
const GAP = 20, WALL_T = 90;

const isFloor = (c: Furniture) => c.kind !== "upper";
const rows = (f: Furniture): number[] => { const ys: number[] = []; for (let d = 1; d <= f.count; d++) ys.push(Math.round((f.height * d) / (f.count + 1))); return ys; };
const floorRunW = (k: Kitchen) => { let x = 0; for (const c of k.cabs) if (isFloor(c)) x += c.width + GAP; return Math.max(0, x - GAP); };
const upperRunW = (k: Kitchen) => { let x = 0; for (const c of k.cabs) if (!isFloor(c)) x += c.width + GAP; return Math.max(0, x - GAP); };
const topH = (k: Kitchen) => { let h = WT_TOP; for (const c of k.cabs) h = Math.max(h, isFloor(c) ? PLINTH + c.height : UPPER_BOT + c.height); return h; };

/** Mebel FASAD yuzasi lokal koordinatada (0..w × 0..h). Yozuvsiz — faqat chiziqlar. */
function face(f: Furniture, variant: "old" | "new"): Shape[] {
  const s: Shape[] = [
    { t: "rect", x1: 0, y1: 0, x2: f.width, y2: f.height, stroke: CARC },
    { t: "rect", x1: 0, y1: 0, x2: T, y2: f.height, stroke: CARC },
    { t: "rect", x1: f.width - T, y1: 0, x2: f.width, y2: f.height, stroke: CARC },
    { t: "rect", x1: T, y1: 0, x2: f.width - T, y2: T, stroke: CARC },
    { t: "rect", x1: T, y1: f.height - T, x2: f.width - T, y2: f.height, stroke: CARC },
  ];
  const divXs = variant === "old" ? (f.dividers === 1 ? [f.width / 2] : f.dividers === 2 ? [f.width / 3, (2 * f.width) / 3] : []) : [];
  for (const x of divXs) s.push({ t: "line", x1: x, y1: T, x2: x, y2: f.height - T, stroke: CARC });
  const sections = [0, ...divXs, f.width];
  if (f.fill === "drawers" || f.fill === "shelves") {
    const color = f.fill === "drawers" ? DRW : SHELF;
    for (let se = 0; se + 1 < sections.length; se++) {
      const x0 = se === 0 ? T : sections[se]! + (f.fill === "shelves" ? T / 2 : 0);
      const x1 = se + 2 === sections.length ? f.width - T : sections[se + 1]! - (f.fill === "shelves" ? T / 2 : 0);
      for (const yy of rows(f)) s.push({ t: "line", x1: x0, y1: yy, x2: x1, y2: yy, stroke: color });
    }
  }
  if (f.door) s.push({ t: "rect", x1: 3, y1: 3, x2: f.width - 3, y2: f.height - 3, stroke: DOOR, dash: true });
  return s;
}
const tr = (sh: Shape[], dx: number, dy: number): Shape[] => sh.map((s) => ({ ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }));

/** 0 — UMUMIY KO'RINISH (oblique 3D): butun oshxona hajmda. z (chuqurlik) → o'ng-yuqoriga siljish. */
export function viewIso(k: Kitchen): View {
  const K = 0.42; // oblique koeffitsient (45°)
  const runW = Math.max(floorRunW(k), upperRunW(k));
  const maxDepth = 600;
  const shapes: Shape[] = [];
  const P = (x: number, y: number, z: number): [number, number] => [x + z * K, y + z * K]; // z=chuqurlik (0=old)
  const boxFront = (x: number, y: number, w: number, h: number) => { shapes.push({ t: "rect", x1: x, y1: y, x2: x + w, y2: y + h, stroke: CARC }); };
  const boxTopRight = (x: number, y: number, w: number, h: number, dep: number, front: string) => {
    const [ax, ay] = P(x, y + h, 0), [bx, by] = P(x + w, y + h, 0), [cx, cy] = P(x + w, y + h, dep), [dx, dy] = P(x, y + h, dep);
    shapes.push({ t: "line", x1: ax, y1: ay, x2: dx, y2: dy, stroke: CARC }, { t: "line", x1: dx, y1: dy, x2: cx, y2: cy, stroke: CARC }, { t: "line", x1: cx, y1: cy, x2: bx, y2: by, stroke: CARC }); // tepa
    const [ex, ey] = P(x + w, y, 0), [fx, fy] = P(x + w, y, dep);
    shapes.push({ t: "line", x1: ex, y1: ey, x2: fx, y2: fy, stroke: CARC }, { t: "line", x1: fx, y1: fy, x2: cx, y2: cy, stroke: CARC }); // o'ng yon
    if (front === "door") shapes.push({ t: "rect", x1: x + 3, y1: y + 3, x2: x + w - 3, y2: y + h - 3, stroke: DOOR, dash: true });
    else if (front === "drawers") { /* front chiziqlari boxFront ichida emas — soddalik uchun tashqi kontur */ }
  };
  // DEVOR (orqa tekislik) — oblique fon
  const [w0x, w0y] = P(0, 0, maxDepth), [w1x, w1y] = P(runW, 0, maxDepth), [w2x, w2y] = P(runW, topH(k), maxDepth), [w3x, w3y] = P(0, topH(k), maxDepth);
  shapes.push({ t: "line", x1: w0x, y1: w0y, x2: w1x, y2: w1y, stroke: WALLSTROKE }, { t: "line", x1: w1x, y1: w1y, x2: w2x, y2: w2y, stroke: WALLSTROKE }, { t: "line", x1: w2x, y1: w2y, x2: w3x, y2: w3y, stroke: WALLSTROKE }, { t: "line", x1: w3x, y1: w3y, x2: w0x, y2: w0y, stroke: WALLSTROKE });
  let fx = 0, ux = 0;
  for (const c of k.cabs) {
    if (isFloor(c)) {
      boxFront(fx, PLINTH, c.width, c.height); boxTopRight(fx, PLINTH, c.width, c.height, c.depth, c.door ? "door" : c.fill);
      if (c.kind === "base") boxFront(fx, BASE_TOP, c.width, WT_TOP - BASE_TOP);
      fx += c.width + GAP;
    } else { boxFront(ux, UPPER_BOT, c.width, c.height); boxTopRight(ux, UPPER_BOT, c.width, c.height, c.depth, c.door ? "door" : c.fill); ux += c.width + GAP; }
  }
  const W = runW + maxDepth * K, H = topH(k) + maxDepth * K;
  return { title: "0) UMUMIY KO'RINISH (3D)", W, H, shapes, labels: [{ x: w3x + 20, y: (w2y + w3y) / 2, text: "DEVOR", color: WALLSTROKE, size: 30, mid: false }], xLabel: "eni", yLabel: "balandlik" };
}

/** 1 — FASAD. DEVOR fon; yozuv chizma tashqarisidagi margin'da (drawView joylaydi). */
export function viewFront(k: Kitchen, variant: "old" | "new"): View {
  const W = Math.max(floorRunW(k), upperRunW(k)), H = topH(k);
  const shapes: Shape[] = [{ t: "rect", x1: 0, y1: 0, x2: W, y2: H, fill: WALL, stroke: WALLSTROKE }];
  const labels: Label[] = [];
  let fx = 0, ux = 0;
  for (const c of k.cabs) {
    if (isFloor(c)) {
      shapes.push(...tr(face(c, variant), fx, PLINTH));
      if (c.kind === "base") shapes.push({ t: "rect", x1: fx, y1: BASE_TOP, x2: fx + c.width, y2: WT_TOP, stroke: WT, fill: "#eceae7" });
      labels.push({ x: fx + c.width / 2, y: PLINTH - 60, text: `${c.width}`, color: "#777", size: 20, mid: true }); // eni (pastda, mebel ostida)
      fx += c.width + GAP;
    } else { shapes.push(...tr(face(c, variant), ux, UPPER_BOT)); ux += c.width + GAP; }
  }
  return { title: "1) FASAD", W, H, shapes, labels, xLabel: "eni", yLabel: "balandlik" };
}

/** 2 — TEPADAN (plan). DEVOR band orqada (bo'sh joyga yozuv). */
export function viewTop(k: Kitchen): View {
  const W = Math.max(floorRunW(k), upperRunW(k)), maxDepth = 600, H = maxDepth + WALL_T;
  const shapes: Shape[] = [{ t: "rect", x1: 0, y1: maxDepth, x2: W, y2: maxDepth + WALL_T, fill: WALL, stroke: WALLSTROKE }];
  const labels: Label[] = [{ x: W / 2, y: maxDepth + WALL_T / 2, text: "DEVOR", color: WALLSTROKE, size: 30, mid: true }];
  let fx = 0, ux = 0;
  for (const c of k.cabs) {
    if (isFloor(c)) {
      shapes.push({ t: "rect", x1: fx, y1: maxDepth - c.depth, x2: fx + c.width, y2: maxDepth, stroke: CARC });
      if (c.kind === "base") shapes.push({ t: "line", x1: fx, y1: maxDepth - c.depth, x2: fx + c.width, y2: maxDepth - c.depth, stroke: DOOR, dash: true });
      labels.push({ x: fx + c.width / 2, y: maxDepth - c.depth / 2, text: `${c.width}×${c.depth}`, color: "#555", size: 20, mid: true });
      fx += c.width + GAP;
    } else { shapes.push({ t: "rect", x1: ux, y1: maxDepth - c.depth, x2: ux + c.width, y2: maxDepth, stroke: "#9a7", dash: true }); ux += c.width + GAP; }
  }
  return { title: "2) TEPADAN (plan) — dashed old chiziq = fasad; yashil dashed = osma", W, H, shapes, labels, xLabel: "eni", yLabel: "chuqurlik" };
}

/** Yon kesim: mebel + ustidagi osma DEVORGA (o'ngga) orqasi tekislangan; pol chizig'i; ichki polka. */
function sideView(title: string, floor: Furniture | undefined, up: Furniture | undefined): View {
  const maxDepth = Math.max(floor?.depth ?? 560, up?.depth ?? 0);
  const H = Math.max(floor ? PLINTH + floor.height : 0, up ? UPPER_BOT + up.height : 0, WT_TOP);
  const W = maxDepth + WALL_T;
  const wallX = maxDepth; // devor o'ngda
  const shapes: Shape[] = [
    { t: "rect", x1: wallX, y1: 0, x2: wallX + WALL_T, y2: H, fill: WALL, stroke: WALLSTROKE }, // DEVOR o'ngda
    { t: "line", x1: 0, y1: 0, x2: wallX + WALL_T, y2: 0, stroke: "#999" },                     // POL chizig'i
  ];
  const labels: Label[] = [{ x: wallX + WALL_T / 2, y: H / 2, text: "DEVOR", color: WALLSTROKE, size: 26, mid: true }];
  if (floor) {
    const yb = PLINTH, yt = PLINTH + floor.height, back = wallX, front = wallX - floor.depth; // orqa=devor, old=chapda
    shapes.push({ t: "rect", x1: front, y1: yb, x2: back, y2: yt, stroke: CARC });
    if (floor.kind === "base") shapes.push({ t: "rect", x1: front, y1: BASE_TOP, x2: back, y2: WT_TOP, stroke: WT, fill: "#eceae7" });
    shapes.push({ t: "rect", x1: front, y1: 0, x2: back, y2: yb, stroke: "#aaa" }); // plinth (tsokol)
    for (const yy of rows(floor)) shapes.push({ t: "line", x1: front, y1: yb + yy, x2: back, y2: yb + yy, stroke: floor.fill === "drawers" ? DRW : SHELF });
    if (floor.door) shapes.push({ t: "line", x1: front, y1: yb, x2: front, y2: yt, stroke: DOOR, dash: true });
    labels.push({ x: (front + back) / 2, y: yb + floor.height / 2, text: floor.fill === "drawers" ? "tortma" : floor.fill === "open" ? "ochiq" : "polka", color: "#777", size: 20, mid: true });
  }
  if (up) {
    const back = wallX, front = wallX - up.depth; // osma ORQASI devorga (tuzatildi)
    shapes.push({ t: "rect", x1: front, y1: UPPER_BOT, x2: back, y2: UPPER_BOT + up.height, stroke: CARC });
    for (const yy of rows(up)) shapes.push({ t: "line", x1: front, y1: UPPER_BOT + yy, x2: back, y2: UPPER_BOT + yy, stroke: SHELF });
    if (up.door) shapes.push({ t: "line", x1: front, y1: UPPER_BOT, x2: front, y2: UPPER_BOT + up.height, stroke: DOOR, dash: true });
    labels.push({ x: (front + back) / 2, y: UPPER_BOT + up.height / 2, text: "osma", color: "#777", size: 20, mid: true });
  }
  return { title, W, H, shapes, labels, xLabel: "chuqurlik", yLabel: "balandlik" };
}
export const viewLeft = (k: Kitchen): View => sideView("3) CHAP YON (kesim — ichki qism)", k.cabs.find(isFloor), k.cabs.find((c) => !isFloor(c)));
export const viewRight = (k: Kitchen): View => {
  const fl = k.cabs.filter(isFloor), up = k.cabs.filter((c) => !isFloor(c));
  return sideView("4) O'NG YON (kesim — ichki qism)", fl[fl.length - 1], up[up.length - 1]);
};

/** 5 — ORQA (devor tomoni): orqa panellar + DEVOR (yozuv tepada bo'sh joyga). */
export function viewBack(k: Kitchen): View {
  const W = Math.max(floorRunW(k), upperRunW(k)), H = topH(k);
  const shapes: Shape[] = [{ t: "rect", x1: 0, y1: 0, x2: W, y2: H, fill: WALL, stroke: WALLSTROKE }];
  let fx = 0, ux = 0;
  for (const c of k.cabs) {
    if (isFloor(c)) { shapes.push({ t: "rect", x1: fx, y1: PLINTH, x2: fx + c.width, y2: PLINTH + c.height, stroke: "#556", fill: "#f2efe8" }); fx += c.width + GAP; }
    else { shapes.push({ t: "rect", x1: ux, y1: UPPER_BOT, x2: ux + c.width, y2: UPPER_BOT + c.height, stroke: "#799", fill: "#eef2f0", dash: true }); ux += c.width + GAP; }
  }
  return { title: "5) ORQA (devor tomoni — orqa panellar)", W, H, shapes, labels: [], xLabel: "eni", yLabel: "balandlik" };
}
