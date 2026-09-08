// MB-3 — Разная высота
//
// То же, что и глубина, по другой оси. Общий бок — один щит одной высоты.

import type { MergeBlocker } from "../types.js";

export const MB_3: MergeBlocker = {
  id: "MB-3",
  title: "Разная высота",
  why: "То же, что и глубина, по другой оси. Общий бок — один щит одной высоты.",
  source: "Физика. НЕ настройка",
  blocks(c) {
    const a = c.left.size?.h_mm10 ?? 0, b = c.right.size?.h_mm10 ?? 0;
    if (a !== b) return `разная высота: ${a / 10}мм и ${b / 10}мм`;
    return null;
  },
};
