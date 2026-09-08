// CONS-3 — Area sanity.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const CONS_3: Rule = {
  uid: "r-011",
  id: "CONS-3",
  severity: "BLOCK",
  cls: "CONS",
  title: "Area sanity.",
  why: "Total cut area ≈ furniture surface area within a sane waste band — catches a panel silently doubling or disappearing.",
  source: "DB/20 CONS-3",
  status: "not_implemented",
  blockedBy: "Требует сквозной связи модель ↔ раскрой ↔ фурнитура. Часть звеньев (список фурнитуры, смета) ещё не проходит через движок.",
  check() { return []; },
};
