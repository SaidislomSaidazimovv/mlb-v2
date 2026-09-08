// CE-4 — every diameter, depth and groove width exists in the workshop's tool set.
//
// NOT IMPLEMENTED, and the file says so rather than the rule silently not existing.

import type { Rule } from "../types.js";

export const CE_4: Rule = {
  uid: "r-004",
  id: "CE-4",
  severity: "BLOCK",
  cls: "CE",
  title: "Только известные инструменты",
  why: "Фантомный Ø13.7 машина не сделает: пост-процессор подставит ближайшее сверло или остановит станок посреди детали.",
  source: "DB/20 CE-4",
  status: "not_implemented",
  blockedBy:
    "Нет объявленного набора инструментов цеха. Нужен ToolSet в ConstructionProfile " +
    "(Ø · макс.глубина · тип) либо в catalog/packs. Пока его нет, правило может только " +
    "угадывать — а угаданный список инструментов хуже отсутствующего.",
  check() { return []; },
};
