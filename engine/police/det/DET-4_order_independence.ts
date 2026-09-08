// DET-4 — Order independence.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const DET_4: Rule = {
  uid: "r-018",
  id: "DET-4",
  severity: "BLOCK",
  cls: "DET",
  title: "Order independence.",
  why: "Building the same kitchen by adding cabinets in a different order yields the same final model.",
  source: "DB/20 DET-4",
  status: "not_implemented",
  blockedBy: "Это CI-правило, а не проверка одного вывода: сравнивает ДВА прогона между собой. Место для него — tests/, а не runPolice(). Файл существует, чтобы правило нельзя было забыть.",
  check() { return []; },
};
