// DET-1 — Byte-identical output.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const DET_1: Rule = {
  uid: "r-015",
  id: "DET-1",
  severity: "BLOCK",
  cls: "DET",
  title: "Byte-identical output.",
  why: "Same input → identical canonical model and identical export, every run. No randomness, no time-dependence, no float drift (mm10 integer discipline).",
  source: "DB/20 DET-1",
  status: "not_implemented",
  blockedBy: "Это CI-правило, а не проверка одного вывода: сравнивает ДВА прогона между собой. Место для него — tests/, а не runPolice(). Файл существует, чтобы правило нельзя было забыть.",
  check() { return []; },
};
