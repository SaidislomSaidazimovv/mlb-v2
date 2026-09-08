// GEO-3 — Widths sum exactly.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const GEO_3: Rule = {
  uid: "r-021",
  id: "GEO-3",
  severity: "BLOCK",
  cls: "GEO",
  title: "Widths sum exactly.",
  why: "Sum of section widths = carcass internal width; sum of carcass widths + fillers = run length. No lost or gained millimeters (catches kerf/convention errors before the saw does).",
  source: "DB/20 GEO-3",
  status: "not_implemented",
  blockedBy: "Требует полной 3D-раскладки деталей в пространстве. Движок сегодня отдаёт Part[] (габариты + операции) без мировых координат — проверять взаимное положение пока не на чем.",
  check() { return []; },
};
