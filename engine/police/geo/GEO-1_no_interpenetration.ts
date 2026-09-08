// GEO-1 — No interpenetration.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const GEO_1: Rule = {
  uid: "r-019",
  id: "GEO-1",
  severity: "BLOCK",
  cls: "GEO",
  title: "No interpenetration.",
  why: "No two panels occupy the same physical space (beyond declared joint overlap).",
  source: "DB/20 GEO-1",
  status: "not_implemented",
  blockedBy: "Требует полной 3D-раскладки деталей в пространстве. Движок сегодня отдаёт Part[] (габариты + операции) без мировых координат — проверять взаимное положение пока не на чем.",
  check() { return []; },
};
