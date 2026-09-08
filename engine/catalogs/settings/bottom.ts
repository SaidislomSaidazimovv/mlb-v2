// Секция настроек «bottom» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const BOTTOM_GROUP: SettingsGroup = {
    id: "bottom", label: "Дно", intro: "«Дно: накладное vs вкладное» — меняет высоту бока и ширину дна, то есть весь раскрой.",
    settings: [
      { path: "defaults.bottomPlacement", group: "bottom", label: "Дно", kind: "choice",
        why: "«Накладное» = бока стоят на дне (бок = H−t, дно = W). «Вкладное» = дно между боками (бок = H, дно = W−2t). Прямо влияет на раскрой.",
        source: "DB/28 A1 — перепись не смогла (4 пары); реплей решил: shelf_unit вкладное",
        options: [
          { value: "nakladnoe", label: "Накладное", effect: "бок = H−t; дно = W (во всю ширину)" },
          { value: "vkladnoe", label: "Вкладное", effect: "бок = H; дно = W−2t (между боками)" },
        ], affects: ["side", "bottom"] },
    ],
  };
