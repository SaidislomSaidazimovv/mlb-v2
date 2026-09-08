// CONS-2 — Model ↔ hardware parity.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const CONS_2: Rule = {
  uid: "r-010",
  id: "CONS-2",
  severity: "BLOCK",
  cls: "CONS",
  title: "Model ↔ hardware parity.",
  why: "Every fitting in the model appears in the hardware list and vice versa (feeds the Article Passport).",
  source: "DB/20 CONS-2",
  status: "not_implemented",
  blockedBy: "Требует сквозной связи модель ↔ раскрой ↔ фурнитура. Часть звеньев (список фурнитуры, смета) ещё не проходит через движок.",
  check() { return []; },
};
