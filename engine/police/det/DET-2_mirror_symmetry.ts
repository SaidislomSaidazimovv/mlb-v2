// DET-2 — Mirror symmetry.
//
// НЕ РЕАЛИЗОВАНО. Файл существует именно поэтому: отсутствующее правило должно быть
// строкой в отчёте о покрытии, а не тишиной. Ровно так CE-1 — «самое важное правило
// в системе» по DB/20 — отсутствовал в коде месяцами и никто этого не видел.

import type { Rule } from "../types.js";

export const DET_2: Rule = {
  uid: "r-016",
  id: "DET-2",
  severity: "BLOCK",
  cls: "DET",
  title: "Mirror symmetry.",
  why: "Mirroring a kitchen produces a mirrored output with identical part count and mirrored hole positions (catches face-A/B coordinate bugs — the documented risk class).",
  source: "DB/20 DET-2",
  status: "not_implemented",
  blockedBy: "Это CI-правило, а не проверка одного вывода: сравнивает ДВА прогона между собой. Место для него — tests/, а не runPolice(). Файл существует, чтобы правило нельзя было забыть.",
  check() { return []; },
};
