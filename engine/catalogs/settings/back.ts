// Секция настроек «back» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const BACK_GROUP: SettingsGroup = {
    id: "back", label: "Задняя стенка", intro: "3 мм/16 мм ХДФ/ЛДСП, в паз или внахлёст. Тот самый «3 мм ХДФ в паз».",
    settings: [
      { path: "defaults.back.treatment", group: "back", label: "Способ", kind: "choice",
        why: "Определяет, есть ли паз и как задняя стенка держится. «в паз» → каждый корпусный элемент получает паз 4×8 на отступе 12. «внахлёст» → задник крупнее, прикручен сверху. «нет» → шкаф без задника.",
        source: "DB/25 F3 (в паз универсально) · DB/28 (shelf_unit — накладной)",
        options: [
          { value: "groove", label: "В паз", effect: "паз 4×8 @12 на боках/дне/верхе/цоколе; задник = внутр.размер + 2×отступ" },
          { value: "overlay", label: "Внахлёст", effect: "задник во весь габарит, прикручен; пазов нет" },
          { value: "none", label: "Без задника", effect: "элементы полной глубины; задней стенки нет" },
        ], affects: ["back", "side", "bottom", "top", "divider", "plinth"] },
      { path: "defaults.back.grooveWidth_mm10", group: "back", label: "Ширина паза", kind: "number", unit: "mm",
        why: "Ширина фрезеровки паза. Обычно = толщина задника + 1мм зазор.", source: "DB/25 F3 — 4.0мм (70 из 71)", affects: ["back"] },
      { path: "defaults.back.grooveDepth_mm10", group: "back", label: "Глубина паза", kind: "number", unit: "mm",
        why: "Глубина фрезеровки паза в пласть.", source: "DB/25 F3 — 8.0мм (69 из 71)", affects: ["back"] },
      { path: "defaults.back.grooveSetback_mm10", group: "back", label: "Отступ паза от края", kind: "number", unit: "mm",
        why: "Насколько паз отодвинут от заднего торца. Задаёт зону задней стенки.", source: "DB/25 F3 — 12.0мм (50 из 71)", affects: ["back"] },
      { path: "defaults.backZone_mm10", group: "back", label: "Зона задней стенки", kind: "number", unit: "mm",
        why: "Насколько мельче корпуса режутся дно/полка/перегородка, чтобы дать место задней стенке (толщина задника + зазор).",
        source: "DB/28 A2 — 17мм (16мм задник + 1мм)", affects: ["bottom", "shelf", "divider"] },
    ],
  };
