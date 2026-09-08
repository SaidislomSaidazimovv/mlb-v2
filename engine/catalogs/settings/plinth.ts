// Секция настроек «plinth» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const PLINTH_GROUP: SettingsGroup = {
    id: "plinth", label: "Цоколь", intro: "Высота, тип, и — как вы просили — декоративный vs конструкционный.",
    settings: [
      { path: "defaults.plinth.style", group: "plinth", label: "Тип", kind: "choice",
        why: "«Коробка» = цоколь-каркас со своими деталями и пазом (несущий). «Планка» = клипсовая лицевая полоса на ножках. «Нет» = бока до пола.",
        source: "DB/25 F4 — коробка, 36/38 несут паз · DB/28 A5 (shelf_unit — планка 80)",
        options: [
          { value: "box", label: "Коробка", effect: "отдельные детали цоколя + паз задней стенки" },
          { value: "strip", label: "Планка", effect: "одна лицевая полоса; несущие — ножки" },
          { value: "none", label: "Нет", effect: "цоколя нет" },
        ] },
      { path: "defaults.plinth.height_mm10", group: "plinth", label: "Высота", kind: "number", unit: "mm",
        why: "Высота цоколя. Влияет на высоту перегородки (dividerH = sideH − цоколь − t).", source: "DB/25 F4 — 120мм (22×), не 100 (3×)" },
      { path: "defaults.plinth.placement", group: "plinth", label: "Размещение", kind: "choice",
        why: "«Между» = ширина цоколя W−2t (внутри боков). «Под» = во всю ширину под боками.",
        source: "DB/28 — shelf_unit: между (988 = W−2t)",
        options: [
          { value: "between", label: "Между боками", effect: "цоколь W−2t" },
          { value: "under", label: "Под боками", effect: "цоколь на всю ширину W" },
        ] },
      { path: "defaults.plinth.role", group: "plinth", label: "Назначение", kind: "choice", facet: "decorative_vs_structural",
        why: "ДЕКОРАТИВНЫЙ — лицевая накладка на регулируемых ножках (не несёт нагрузку). КОНСТРУКЦИОННЫЙ — цоколь-коробка, на которой стоит шкаф (несёт вес).",
        source: "Требование основателя: «опции декоративный и конструкционный»",
        options: [
          { value: "decorative", label: "Декоративный", effect: "накладка; нагрузку несут ножки" },
          { value: "structural", label: "Конструкционный", effect: "цоколь-коробка держит корпус" },
        ] },
    ],
  };
