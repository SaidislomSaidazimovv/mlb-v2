// Секция настроек «merge» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const MERGE_GROUP: SettingsGroup = {
    id: "merge", label: "Объединение секций", intro: "«Объединение секций» + «Границы: когда объединять нельзя». Экономия боковин (нуанс №1).",
    settings: [
      { path: "defaults.merge.allowed", group: "merge", label: "Разрешить объединение", kind: "toggle",
        why: "Можно ли предлагать объединять соседние шкафы в один корпус (2 бока → 1 общая перегородка, экономия панели).",
        source: "DB/22 N1 — нуанс №1 от Улугбека", affects: ["side", "divider"] },
      { path: "defaults.merge.strategy", group: "merge", label: "Способ", kind: "choice",
        why: "Как объединять. Сейчас — общая перегородка 16мм вместо двух боков (сверлится с двух пластей).",
        source: "DB/22 N1", options: [{ value: "shared_divider", label: "Общая перегородка", effect: "две боковины → одна деталь, присадка с двух сторон" }] },
      { path: "defaults.merge.limits.maxSheetLength_mm10", group: "merge", label: "Макс. длина листа", kind: "number", unit: "mm",
        why: "ГРАНИЦА: ни одна цельная деталь объединённого корпуса не длиннее листа. Превышение → предложить разделить.", source: "R9/R21 — лист 2750×1830" },
      { path: "defaults.merge.limits.maxSheetWidth_mm10", group: "merge", label: "Макс. ширина листа", kind: "number", unit: "mm",
        why: "ГРАНИЦА по ширине листа.", source: "R9/R21 — 1830" },
      { path: "defaults.merge.limits.maxCabinetsPerCarcass", group: "merge", label: "Макс. шкафов в одном корпусе", kind: "number", unit: "count",
        why: "ГРАНИЦА цеха, а не физики: 5 секций одним корпусом могут пройти и по листу, и по весу — и всё равно не занестись по лестнице. Остальные запреты на слияние — физика (глубина, высота, конструкция) и настройками не являются.",
        source: "Основатель 2026-08-15 — «слияние жизненно важно, и это должно быть в настройках»", affects: ["side", "divider"] },
      { path: "defaults.merge.limits.maxWeightKg", group: "merge", label: "Макс. вес блока", kind: "number", unit: "kg",
        why: "ГРАНИЦА: собранный корпус тяжелее — предупредить (не пройдёт по лестнице/в лифт, не поднять вдвоём).", source: "R9/R21 — 45 кг, норма ручной переноски СНГ" },
    ],
  };
