// Секция настроек «worktop» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const WORKTOP_GROUP: SettingsGroup = {
    id: "worktop", label: "Столешница", intro: "Свесы столешницы над корпусом.",
    settings: [
      { path: "defaults.worktop.sideOverhang_mm10", group: "worktop", label: "Свес по бокам", kind: "number", unit: "mm",
        why: "На сколько столешница выступает за каждый бок. Ширина столешницы = W + 2×свес.", source: "DB/28 — 1100 vs 1020 → 40мм", affects: ["worktop"] },
      { path: "defaults.worktop.frontOverhang_mm10", group: "worktop", label: "Свес спереди", kind: "number", unit: "mm",
        why: "На сколько столешница выступает вперёд. Глубина = D + свес.", source: "DB/28 — 600 vs 520 → 80мм", affects: ["worktop"] },
    ],
  };
