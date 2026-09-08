// Секция настроек «kromka» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const KROMKA_GROUP: SettingsGroup = {
    id: "kromka", label: "Кромка по ролям", intro: "«Кромка по ролям — автоматом»: какие торцы каждой роли оклеиваются, и почему. Логика показана.",
    settings: [
      { path: "kromka.slots.K1.thickness_mm10", group: "kromka", label: "K1 (видимая)", kind: "number", unit: "mm",
        why: "Толщина основной видимой кромки. Экспортируется как флаг; размеры отдаются чистовые (с кромкой).", source: "DB/25 F2 — 1.0мм (426 кромок)" },
      { path: "kromka.slots.K2.thickness_mm10", group: "kromka", label: "K2 (тонкая)", kind: "number", unit: "mm",
        why: "Тонкая кромка для менее заметных торцов.", source: "DB/25 F2 — 0.4мм (36 кромок); 2мм не встречается" },
      { path: "defaults.kromkaByRole", group: "kromka", label: "Карта кромки по ролям", kind: "map",
        why: "Для КАЖДОЙ роли детали — какие из её торцов клеятся. Логика (перепись 359 панелей): полка = только передний торец (9/9); дверь = 4 торца; цоколь-коробка не бывает голым; бок = 2 торца; нутро ящика — голое. Пользователь правит исключения, не расставляет вручную.",
        source: "DB/25 F2 + DB/28 A6",
        affects: ["side", "bottom", "top", "shelf", "divider", "stretcher", "door", "plinth", "worktop", "filler", "back"] },
    ],
  };
