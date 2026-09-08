// GEO-4 — Fits a real sheet.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const GEO_4: Rule = {
  uid: "r-022",
  id: "GEO-4",
  severity: "BLOCK",
  cls: "GEO",
  title: "Fits a real sheet.",
  why: "Every panel fits within at least one declared sheet size (1830×2750 / 1830×2500 / 2070×2800 / acrylic 1220×2440…), accounting for grain lock.",
  source: "DB/20 GEO-4",
  status: "not_implemented",
  blockedBy: "Требует полной 3D-раскладки деталей в пространстве. Движок сегодня отдаёт Part[] (габариты + операции) без мировых координат — проверять взаимное положение пока не на чем.",
  check() { return []; },
};
