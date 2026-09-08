// GEO-2 — Mating panels touch.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const GEO_2: Rule = {
  uid: "r-020",
  id: "GEO-2",
  severity: "BLOCK",
  cls: "GEO",
  title: "Mating panels touch.",
  why: "Panels that should join actually meet — no floating gaps, no impossible overhangs.",
  source: "DB/20 GEO-2",
  status: "not_implemented",
  blockedBy: "Требует полной 3D-раскладки деталей в пространстве. Движок сегодня отдаёт Part[] (габариты + операции) без мировых координат — проверять взаимное положение пока не на чем.",
  check() { return []; },
};
