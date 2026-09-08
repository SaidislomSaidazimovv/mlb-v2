// MB-9 — Мастер закрепил границу
//
// Мастер сказал «здесь не объединять». Его решение сильнее автоматики — и в отчёте это видно как осознанный выбор, а не как сбой.

import type { MergeBlocker } from "../types.js";

export const MB_9: MergeBlocker = {
  id: "MB-9",
  title: "Мастер закрепил границу",
  why: "Мастер сказал «здесь не объединять». Его решение сильнее автоматики — и в отчёте это видно как осознанный выбор, а не как сбой.",
  source: "DesignNode.mergeLeft = never · основатель 2026-08-15",
  blocks(c) {
    if (c.right.mergeLeft === "never") return "мастер закрепил границу открытой (mergeLeft: never)";
    return null;
  },
};
