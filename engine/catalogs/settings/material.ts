// Секция настроек «material» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const MATERIAL_GROUP: SettingsGroup = {
    id: "material", label: "Материал", intro: "Толщины плит. Живут в переменной материала — отдельного тумблера 16/18 нет.",
    settings: [
      { path: "material.carcass_mm10", group: "material", label: "Корпус", kind: "number", unit: "mm",
        why: "Толщина боков/дна/верха/полок/перегородок. Все производные размеры считаются от неё (W−2t и т.д.).",
        source: "DB/25 F1 — 16мм, 0 из 359 панелей были 18", affects: ["side", "bottom", "top", "shelf", "divider", "plinth"] },
      { path: "material.back_mm10", group: "material", label: "Задняя стенка", kind: "number", unit: "mm",
        why: "Толщина задней панели. При пазе задаёт ширину паза (t+1). При накладной — толщину нахлёста.",
        source: "DB/28 A2 — 16мм ЛДСП (17 из 33 задников дампа)", affects: ["back"] },
      { path: "material.front_mm10", group: "material", label: "Фасад", kind: "number", unit: "mm",
        why: "Толщина дверей/фасадов — отдельный слой (профильные двери, ручки-планки).",
        source: "DB/25 — слой 22мм", affects: ["door"] },
    ],
  };
