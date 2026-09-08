// Секция настроек «grain» — один физический файл на одну секцию.
// Выделено из settingsManifest.ts 2026-08-13 по закону основателя:
// «every section/part should have a physical settings file».
// Содержимое перенесено ДОСЛОВНО — сплит механический, значения не менялись.

import type { SettingsGroup } from "./types.js";

export const GRAIN_GROUP: SettingsGroup = {
    id: "grain", label: "Текстура", intro: "«Резать скрытое поперёк ради листа — если это не текстура».",
    settings: [
      { path: "defaults.grainPolicy.mode", group: "grain", label: "Политика текстуры", kind: "choice",
        why: "«Блокировать всё» = каждая деталь текстурно-фиксирована, нельзя вращать в раскрое (перепись: L на 359/359). «Свободно скрытые» = скрытые детали без декор-пласти можно вращать ради экономии листа.",
        source: "DB/25 — Grain=L на 359/359 (спросить Улугбека: его выбор или дефолт Bazis)",
        options: [
          { value: "lock_all", label: "Блокировать всё", effect: "txt=true у всех; вращение запрещено" },
          { value: "free_hidden", label: "Свободно скрытые", effect: "скрытые нетекстурные детали вращаются в нестинге" },
        ], affects: ["back", "bottom", "divider", "stretcher"] },
      { path: "defaults.grainPolicy.hiddenRoles", group: "grain", label: "Скрытые роли", kind: "list",
        why: "Какие роли считаются «скрытыми» и потому вращаемыми при «Свободно скрытые».", source: "DB/25 — роли без видимой пласти" },
    ],
  };
