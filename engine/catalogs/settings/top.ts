// Секция настроек «top» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const TOP_GROUP: SettingsGroup = {
    id: "top", label: "Верх", intro: "«Верх: цельная крышка vs 2 царги».",
    settings: [
      { path: "defaults.topStyle", group: "top", label: "Верх корпуса", kind: "choice",
        why: "«Цельная» = крышка во всю глубину. «2 царги» = две узкие планки (перед/зад), экономят лист и дают место под мойку/варочную. «Нет» = сверху ляжет столешница.",
        source: "DB/25 F5 — 7 цельных, 0 царговых · DB/28 A4 (shelf_unit — нет, столешница)",
        options: [
          { value: "full", label: "Цельная крышка", effect: "одна деталь верха" },
          { value: "stretchers", label: "2 царги", effect: "две планки шириной stretcherWidth" },
          { value: "none", label: "Нет (столешница)", effect: "верх не режется; сверху столешница" },
        ], affects: ["top", "stretcher", "worktop"] },
      { path: "defaults.stretcherWidth_mm10", group: "top", label: "Ширина царги", kind: "number", unit: "mm",
        why: "Ширина каждой планки при «2 царги».", source: "R17 (теория ~80мм) — нет местных данных" },
    ],
  };
