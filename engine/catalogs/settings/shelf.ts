// Секция настроек «shelf» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const SHELF_GROUP: SettingsGroup = {
    id: "shelf", label: "Полка", intro: "«Полка мельче корпуса».",
    settings: [
      { path: "defaults.shelfSetback_mm10", group: "shelf", label: "Полка мельче на", kind: "number", unit: "mm",
        why: "Дополнительный зазор спереди СВЕРХ зоны задней стенки: полка не задевает задник и легче ставится.",
        source: "DB/28 — зона задней стенки уже съедает глубину; здесь только доп.зазор", affects: ["shelf"] },
    ],
  };
