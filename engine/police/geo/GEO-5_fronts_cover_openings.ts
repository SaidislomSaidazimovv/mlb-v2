// GEO-5 — Fronts cover openings.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const GEO_5: Rule = {
  uid: "r-023",
  id: "GEO-5",
  severity: "BLOCK",
  cls: "GEO",
  title: "Fronts cover openings.",
  why: "Each door/drawer front covers its opening within tolerance; reveals/gaps within spec.",
  source: "DB/20 GEO-5",
  status: "not_implemented",
  blockedBy: "Требует полной 3D-раскладки деталей в пространстве. Движок сегодня отдаёт Part[] (габариты + операции) без мировых координат — проверять взаимное положение пока не на чем.",
  check() { return []; },
};
