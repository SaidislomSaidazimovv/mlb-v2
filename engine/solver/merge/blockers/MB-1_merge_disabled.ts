// MB-1 — Слияние выключено в профиле
//
// Цех может не собирать объединённые корпуса вообще — например, если сборка идёт на объекте, а не в цеху.

import type { MergeBlocker } from "../types.js";

export const MB_1: MergeBlocker = {
  id: "MB-1",
  title: "Слияние выключено в профиле",
  why: "Цех может не собирать объединённые корпуса вообще — например, если сборка идёт на объекте, а не в цеху.",
  source: "DB/22 N1 · profile.defaults.merge.allowed",
  blocks(c) {
    if (!c.profile.defaults.merge.allowed) return "слияние выключено в профиле (Настройки → Объединение секций)";
    return null;
  },
};
