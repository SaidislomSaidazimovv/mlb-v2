// DET-3 — Metamorphic width.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const DET_3: Rule = {
  uid: "r-017",
  id: "DET-3",
  severity: "BLOCK",
  cls: "DET",
  title: "Metamorphic width.",
  why: "Increasing a cabinet width by Δ changes only the predictable parts (the stretched panels, repeated shelves per stretch rules); fixed parts (e.g. a fixed-width drawer box) are byte-identical. Catches unintended global side effects.",
  source: "DB/20 DET-3",
  status: "not_implemented",
  blockedBy: "Это CI-правило, а не проверка одного вывода: сравнивает ДВА прогона между собой. Место для него — tests/, а не runPolice(). Файл существует, чтобы правило нельзя было забыть.",
  check() { return []; },
};
