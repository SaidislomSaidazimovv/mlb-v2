// CONS-5 — Price monotonic & positive.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const CONS_5: Rule = {
  uid: "r-013",
  id: "CONS-5",
  severity: "BLOCK",
  cls: "CONS",
  title: "Price monotonic & positive.",
  why: "Price > 0; a strictly larger cabinet costs ≥ a smaller identical-spec one. Catches pricing-logic inversions.",
  source: "DB/20 CONS-5",
  status: "not_implemented",
  blockedBy: "Требует сквозной связи модель ↔ раскрой ↔ фурнитура. Часть звеньев (список фурнитуры, смета) ещё не проходит через движок.",
  check() { return []; },
};
