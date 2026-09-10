// B — OSHXONA ko'rinishlari (founder: fasad + tepadan + 4 tomon, ichki qismi bilan; DEVOR rang+yozuv bilan).
// Har oshxona = bitta devor bo'ylab mebellar run'i. Ko'rinishlar (real mm, y yuqoriga; DEVOR = jigarrang band + yozuv):
//   1 Fasad (front)   — x=devor bo'ylab, y=balandlik; osma tepada, base+worktop pastda, penal to'liq.
//   2 Tepadan (plan)  — x=devor bo'ylab, y=chuqurlik; DEVOR orqada band; base/penal footprint, osma dashed.
//   3 Chap yon        — x=chuqurlik, y=balandlik; kesim: base+worktop+osma+polka (ICHKI qism), DEVOR orqada.
//   4 O'ng yon        — o'ng uchdagi mebel kesimi.
//   5 Orqa (devor tomoni) — orqa panellar + DEVOR.
// O'lchamlar layout.ts GEOM'dan (plinth 120, base 120..840, worktop 840..880, upper 1520..2240, base chuqur 560,
// upper chuqur 350). O'ylab topilgan hech narsa yo'q.
import type { Furniture, Kitchen } from "./compare";

export interface Shape { t: "rect" | "line"; x1: number; y1: number; x2: number; y2: number; stroke?: string; fill?: string; dash?: boolean }
export interface Label { x: number; y: number; text: string; color?: string; size?: number; mid?: boolean }
export interface View { title: string; W: number; H: number; shapes: Shape[]; labels: Label[] }

const T = 16, PLINTH = 120, BASE_TOP = 840, WT_TOP = 880, UPPER_BOT = 1520;
const WALL = "#e3d4b0", WALLSTROKE = "#c9b483", WT = "#8a837a", DRW = "#b8863c", DOOR = "#c8a25a", SHELF = "#555";
const GAP = 20, WALL_T = 90; // plan/side'da devor qalinligi (ko'rgazma)

const isFloor = (c: Furniture) => c.kind !== "upper";
function rows(f: Furniture): number[] { const ys: number[] = []; for (let d = 1; d <= f.count; d++) ys.push(Math.round((f.height * d) / (f.count + 1))); return ys; }

/** Bitta mebel FASAD yuzasi lokal koordinatada (0..w × 0..h). */
function face(f: Furniture, variant: "old" | "new"): Shape[] {
  const s: Shape[] = [];
  s.push({ t: "rect", x1: 0, y1: 0, x2: f.width, y2: f.height });                 // tashqi
  s.push({ t: "rect", x1: 0, y1: 0, x2: T, y2: f.height });                       // chap yon
  s.push({ t: "rect", x1: f.width - T, y1: 0, x2: f.width, y2: f.height });       // o'ng yon
  s.push({ t: "rect", x1: T, y1: 0, x2: f.width - T, y2: T });                    // dno
  s.push({ t: "rect", x1: T, y1: f.height - T, x2: f.width - T, y2: f.height });  // kryshka
  const divXs = variant === "old" ? (f.dividers === 1 ? [f.width / 2] : f.dividers === 2 ? [f.width / 3, (2 * f.width) / 3] : []) : [];
  for (const x of divXs) s.push({ t: "line", x1: x, y1: T, x2: x, y2: f.height - T });
  const sections = [0, ...divXs, f.width];
  const color = f.fill === "drawers" ? DRW : f.fill === "shelves" ? SHELF : undefined;
  if (f.fill === "drawers" || f.fill === "shelves") {
    for (let se = 0; se + 1 < sections.length; se++) {
      const x0 = se === 0 ? T : sections[se]! + (f.fill === "shelves" ? T / 2 : 0);
      const x1 = se + 2 === sections.length ? f.width - T : sections[se + 1]! - (f.fill === "shelves" ? T / 2 : 0);
      for (const yy of rows(f)) s.push({ t: "line", x1: x0, y1: yy, x2: x1, y2: yy, stroke: color });
    }
  }
  if (f.door) s.push({ t: "rect", x1: 2, y1: 2, x2: f.width - 2, y2: f.height - 2, stroke: DOOR, dash: true });
  return s;
}
const tr = (sh: Shape[], dx: number, dy: number): Shape[] => sh.map((s) => ({ ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }));

function floorRunWidth(k: Kitchen): number { let x = 0; for (const c of k.cabs) if (isFloor(c)) x += c.width + GAP; return Math.max(0, x - GAP); }
function upperRunWidth(k: Kitchen): number { let x = 0; for (const c of k.cabs) if (!isFloor(c)) x += c.width + GAP; return Math.max(0, x - GAP); }
function topH(k: Kitchen): number { let h = WT_TOP; for (const c of k.cabs) h = Math.max(h, isFloor(c) ? PLINTH + c.height : UPPER_BOT + c.height); return h; }

/** 1 — FASAD (front) ko'rinish. */
export function viewFront(k: Kitchen, variant: "old" | "new"): View {
  const W = Math.max(floorRunWidth(k), upperRunWidth(k)), H = topH(k);
  const shapes: Shape[] = [{ t: "rect", x1: 0, y1: 0, x2: W, y2: H, fill: WALL, stroke: WALLSTROKE }]; // DEVOR fon
  let fx = 0, ux = 0;
  for (const c of k.cabs) {
    if (isFloor(c)) {
      shapes.push(...tr(face(c, variant), fx, PLINTH));
      if (c.kind === "base") shapes.push({ t: "rect", x1: fx, y1: BASE_TOP, x2: fx + c.width, y2: WT_TOP, stroke: WT, fill: "#eceae7" }); // worktop
      fx += c.width + GAP;
    } else { shapes.push(...tr(face(c, variant), ux, UPPER_BOT)); ux += c.width + GAP; }
  }
  return { title: "1) FASAD (old ko'rinish)", W, H, shapes, labels: [{ x: 8, y: H - 8, text: "DEVOR", color: WALLSTROKE, size: 34, mid: false }] };
}

/** 2 — TEPADAN (plan). x=devor bo'ylab, y=chuqurlik (0 old, orqada devor). */
export function viewTop(k: Kitchen): View {
  const W = Math.max(floorRunWidth(k), upperRunWidth(k));
  const maxDepth = 600, H = maxDepth + WALL_T;
  const shapes: Shape[] = [{ t: "rect", x1: 0, y1: maxDepth, x2: W, y2: maxDepth + WALL_T, fill: WALL, stroke: WALLSTROKE }]; // DEVOR orqada
  const labels: Label[] = [{ x: W / 2, y: maxDepth + WALL_T - 20, text: "DEVOR", color: WALLSTROKE, size: 30, mid: true }];
  let fx = 0, ux = 0;
  for (const c of k.cabs) {
    if (isFloor(c)) { // footprint: eni x chuqurlik, orqasi devorga tegib
      shapes.push({ t: "rect", x1: fx, y1: maxDepth - c.depth, x2: fx + c.width, y2: maxDepth, stroke: "#333" });
      if (c.kind === "base") shapes.push({ t: "line", x1: fx, y1: maxDepth - c.depth - 0, x2: fx + c.width, y2: maxDepth - c.depth, stroke: DOOR, dash: true }); // fasad chizig'i old
      labels.push({ x: fx + c.width / 2, y: maxDepth - c.depth / 2, text: c.label.split(" ")[0] ?? "", color: "#555", size: 22, mid: true });
      fx += c.width + GAP;
    } else { // osma — dashed, tepada (kichik chuqurlik 350)
      shapes.push({ t: "rect", x1: ux, y1: maxDepth - c.depth, x2: ux + c.width, y2: maxDepth, stroke: "#9a7", dash: true });
      ux += c.width + GAP;
    }
  }
  if (ux > 0) labels.push({ x: 4, y: 30, text: "(dashed = osma, tepada)", color: "#9a7", size: 20, mid: false });
  return { title: "2) TEPADAN (plan)", W, H, shapes, labels };
}

/** Yon kesim: berilgan mebel (base/tall) + uning ustidagi osma (bo'lsa). x=chuqurlik, y=balandlik. */
function sideView(title: string, floor: Furniture | undefined, up: Furniture | undefined): View {
  const maxDepth = Math.max(floor?.depth ?? 560, up?.depth ?? 0);
  const W = maxDepth + WALL_T, H = Math.max(topH0(floor, up), WT_TOP);
  const shapes: Shape[] = [{ t: "rect", x1: maxDepth, y1: 0, x2: maxDepth + WALL_T, y2: H, fill: WALL, stroke: WALLSTROKE }]; // DEVOR orqada (o'ngda)
  const labels: Label[] = [{ x: maxDepth + WALL_T / 2, y: H - 20, text: "DEVOR", color: WALLSTROKE, size: 26, mid: true }];
  if (floor) {
    const yb = PLINTH, yt = PLINTH + floor.height;
    shapes.push({ t: "rect", x1: 0, y1: yb, x2: floor.depth, y2: yt });                 // yon panel kesimi
    if (floor.kind === "base") shapes.push({ t: "rect", x1: 0, y1: BASE_TOP, x2: floor.depth, y2: WT_TOP, stroke: WT, fill: "#eceae7" }); // worktop
    for (const yy of rows(floor)) shapes.push({ t: "line", x1: 0, y1: yb + yy, x2: floor.depth, y2: yb + yy, stroke: floor.fill === "drawers" ? DRW : SHELF }); // ICHKI polka/tortma
    if (floor.door) shapes.push({ t: "line", x1: 0, y1: yb, x2: 0, y2: yt, stroke: DOOR, dash: true }); // fasad old tomonda
    labels.push({ x: 2, y: yb + 30, text: floor.label.split(" ")[0] ?? "", color: "#555", size: 22, mid: false });
  }
  if (up) {
    shapes.push({ t: "rect", x1: 0, y1: UPPER_BOT, x2: up.depth, y2: UPPER_BOT + up.height });
    for (const yy of rows(up)) shapes.push({ t: "line", x1: 0, y1: UPPER_BOT + yy, x2: up.depth, y2: UPPER_BOT + yy, stroke: SHELF });
    if (up.door) shapes.push({ t: "line", x1: 0, y1: UPPER_BOT, x2: 0, y2: UPPER_BOT + up.height, stroke: DOOR, dash: true });
    labels.push({ x: 2, y: UPPER_BOT + 30, text: "osma", color: "#555", size: 20, mid: false });
  }
  return { title, W, H, shapes, labels };
}
function topH0(floor?: Furniture, up?: Furniture): number {
  return Math.max(floor ? PLINTH + floor.height : 0, up ? UPPER_BOT + up.height : 0, WT_TOP);
}

export function viewLeft(k: Kitchen): View {
  const floor = k.cabs.find(isFloor), up = k.cabs.find((c) => !isFloor(c));
  return sideView("3) CHAP YON (kesim, ichki qism)", floor, up);
}
export function viewRight(k: Kitchen): View {
  const floors = k.cabs.filter(isFloor), ups = k.cabs.filter((c) => !isFloor(c));
  return sideView("4) O'NG YON (kesim, ichki qism)", floors[floors.length - 1], ups[ups.length - 1]);
}

/** 5 — ORQA (devor tomoni): orqa panellar + DEVOR. */
export function viewBack(k: Kitchen): View {
  const W = Math.max(floorRunWidth(k), upperRunWidth(k)), H = topH(k);
  const shapes: Shape[] = [{ t: "rect", x1: 0, y1: 0, x2: W, y2: H, fill: WALL, stroke: WALLSTROKE }];
  let fx = 0, ux = 0;
  for (const c of k.cabs) {
    if (isFloor(c)) { shapes.push({ t: "rect", x1: fx, y1: PLINTH, x2: fx + c.width, y2: PLINTH + c.height, stroke: "#556", fill: "#f2efe8" }); fx += c.width + GAP; }
    else { shapes.push({ t: "rect", x1: ux, y1: UPPER_BOT, x2: ux + c.width, y2: UPPER_BOT + c.height, stroke: "#799", fill: "#eef2f0", dash: true }); ux += c.width + GAP; }
  }
  return { title: "5) ORQA (devor tomoni)", W, H, shapes, labels: [{ x: W / 2, y: H / 2, text: "DEVOR (orqa panellar oldida)", color: WALLSTROKE, size: 30, mid: true }] };
}

export function kitchenViews(k: Kitchen, variant: "old" | "new"): View[] {
  return [viewFront(k, variant), viewTop(k), viewLeft(k), viewRight(k), viewBack(k)];
}
