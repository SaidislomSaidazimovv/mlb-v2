// GEO-6 — Assembly convention consistent.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const GEO_6: Rule = {
  uid: "r-024",
  id: "GEO-6",
  severity: "BLOCK",
  cls: "GEO",
  title: "Assembly convention consistent.",
  why: "Each carcass's bottom/top placement (between vs under, per Abzal's load-aware rule) is internally consistent — a panel isn't simultaneously inside and under.",
  source: "DB/20 GEO-6",
  status: "not_implemented",
  blockedBy: "Требует полной 3D-раскладки деталей в пространстве. Движок сегодня отдаёт Part[] (габариты + операции) без мировых координат — проверять взаимное положение пока не на чем.",
  check() { return []; },
};
