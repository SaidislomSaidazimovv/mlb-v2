// MB-6 — Объединённый корпус длиннее листа
//
// Объединяя, мы делаем детали (дно, крышку) длиннее. Деталь длиннее листа не раскроить — и это выясняется на пиле, а не в приложении.

import type { MergeBlocker } from "../types.js";

export const MB_6: MergeBlocker = {
  id: "MB-6",
  title: "Объединённый корпус длиннее листа",
  why: "Объединяя, мы делаем детали (дно, крышку) длиннее. Деталь длиннее листа не раскроить — и это выясняется на пиле, а не в приложении.",
  source: "R9/R21 лист 2750×1830 · merge.limits.maxSheetLength_mm10",
  blocks(c) {
    const lim = c.profile.defaults.merge.limits;
    const total = [...c.groupSoFar, c.right].reduce((s, n) => s + (n.size?.w_mm10 ?? 0), 0);
    if (total > lim.maxSheetLength_mm10)
      return `объединённая ширина ${total / 10}мм больше листа ${lim.maxSheetLength_mm10 / 10}мм`;
    return null;
  },
};
