// GEO-7 — Back-panel math.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const GEO_7: Rule = {
  uid: "r-025",
  id: "GEO-7",
  severity: "BLOCK",
  cls: "GEO",
  title: "Back-panel math.",
  why: "Back panel size = internal dims + 2×groove_depth (groove method) or correct overlay size; setback honored.",
  source: "DB/20 GEO-7",
  status: "not_implemented",
  blockedBy: "Требует полной 3D-раскладки деталей в пространстве. Движок сегодня отдаёт Part[] (габариты + операции) без мировых координат — проверять взаимное положение пока не на чем.",
  check() { return []; },
};
