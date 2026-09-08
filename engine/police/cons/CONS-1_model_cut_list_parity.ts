// CONS-1 — Model ↔ cut list parity.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const CONS_1: Rule = {
  uid: "r-009",
  id: "CONS-1",
  severity: "BLOCK",
  cls: "CONS",
  title: "Model ↔ cut list parity.",
  why: "Every panel in the 3D model appears exactly once in the cut list, and vice versa. No orphans, no duplicates, no vanishing parts.",
  source: "DB/20 CONS-1",
  status: "not_implemented",
  blockedBy: "Требует сквозной связи модель ↔ раскрой ↔ фурнитура. Часть звеньев (список фурнитуры, смета) ещё не проходит через движок.",
  check() { return []; },
};
