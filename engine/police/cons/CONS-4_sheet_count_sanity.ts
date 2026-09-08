// CONS-4 — Sheet count sanity.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const CONS_4: Rule = {
  uid: "r-012",
  id: "CONS-4",
  severity: "BLOCK",
  cls: "CONS",
  title: "Sheet count sanity.",
  why: "Computed sheet count ≥ ceil(total area / usable) and ≥ the largest single part — never undercounts (protects margin; R-U0 §M5 small-group rule).",
  source: "DB/20 CONS-4",
  status: "not_implemented",
  blockedBy: "Требует сквозной связи модель ↔ раскрой ↔ фурнитура. Часть звеньев (список фурнитуры, смета) ещё не проходит через движок.",
  check() { return []; },
};
