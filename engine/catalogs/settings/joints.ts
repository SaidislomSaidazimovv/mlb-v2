// УЗЛЫ — the joints section. Every hole the engine drills, as an editable setting.
//
// WHY THIS FILE EXISTS (2026-08-13). The manifest header claimed:
//
//     manifest covers every profile field  ⟺  manifest covers every engine decision
//
// That biconditional was FALSE, and joints are how it failed. It holds only if every
// engine decision is a profile field — joints were not. They lived in
// `hardware_specs.dummy.json` and `catalog/rules/*.json`, entirely outside the
// profile, so the bijection test that was supposed to make half-ness impossible never
// covered them at all. The result was a settings screen with ten complete groups and
// a silent hole where the drilling lives.
//
// Moving joints into `TypeConstruction.joints` closes it MECHANICALLY: the bijection
// test now demands an entry here for every joint field, and forgetting one is a build
// failure rather than a discovery six months later.
//
// Every setting in this file carries a `visual` — the founder's requirement that joint
// settings be shown "with visuals". A setback number is meaningless without a drawing
// of which edge it is measured from; that ambiguity is the entire reason 37mm and 65mm
// looked like a contradiction for a week.

import type { SettingsGroup } from "./types.js";

/** Provenance shared by the System-32 rows — the sentence that settled the argument. */
const S32_STORY =
  "GTV catalogue (catalog/rules/shelf_pin.rules.json, placement_principles_from_source) " +
  "prescribes 37mm. The 350-panel dump does NOT follow it: row setbacks measure " +
  "64/64, 65/65, 78/64, 145/79, 115/65 — mode 64–65. Standard ≠ this factory; " +
  "therefore a SETTING, not a constant.";

export const JOINTS_GROUP: SettingsGroup = {
  id: "joints",
  label: "Узлы",
  intro:
    "Чем панели держатся друг за друга и где сверлятся отверстия. Каждое число " +
    "редактируется и показано на схеме — потому что «37мм» без картинки не говорит, " +
    "от какой кромки его мерить.",
  settings: [
    {
      path: "defaults.joints.carcassConnector", group: "joints", label: "Стяжка корпуса", kind: "choice",
      why: "Чем корпусная панель крепится к корпусной. Определяет, какие отверстия вообще сверлятся: эксцентрик даёт Ø15 чашку на пласти + Ø8 шкант в торец; конфирмат — сквозное Ø7 и Ø5 в торец; шкант — только Ø8.",
      source: "Замер 350 панелей: Ø15×12.5 чашка на 99 панелях (×357) + Ø8×34 торцевой на 97 (×342) — эксцентрик+шкант доминирует",
      visual: "joint_carcass_connector",
      options: [
        { value: "cam_dowel", label: "Эксцентрик + шкант", effect: "Ø15 чашка на пласти, Ø8×34 болт в торец — как на замере" },
        { value: "confirmat", label: "Конфирмат", effect: "сквозное Ø7 в пласть, Ø5 пилот в торец; головка видна" },
        { value: "dowel", label: "Шкант на клею", effect: "только Ø8; неразборно" },
        { value: "rafix", label: "Rafix", effect: "скрытая стяжка, разборная; Ø20 чашка" },
        { value: "screw", label: "Саморез", effect: "без присадки; бюджетный вариант" },
      ],
      affects: ["side", "bottom", "top", "divider", "shelf"],
    },
    {
      path: "defaults.joints.connectorEndOffset_mm10", group: "joints", label: "Отступ стяжки от торца", kind: "number", unit: "mm",
      why: "На сколько первая стяжка отодвинута от конца панели. Слишком близко — скол; слишком далеко — стык играет.",
      source: "ЗАМЕР: 34.0мм на 274 из 357 чашек Ø15 (77%). Заглушка hardware_specs.dummy.json угадывала 20мм и сама писала «factory shows ~34; CONFIRM» — подтверждено",
      visual: "joint_connector_offset",
      affects: ["side", "bottom", "top", "divider"],
    },
    {
      path: "defaults.joints.connectorMaxPitch_mm10", group: "joints", label: "Макс. шаг между стяжками", kind: "number", unit: "mm",
      why: "Предел расстояния между соседними стяжками одного стыка. Панель длиннее — движок добавляет ещё стяжку, а не растягивает шаг.",
      source: "R9 — практика цеха ~320мм; замер шага не выделен отдельно",
      visual: "joint_connector_pitch",
      affects: ["side", "bottom", "top", "divider"],
    },
    {
      path: "defaults.joints.system32.enabled", group: "joints", label: "Система-32", kind: "toggle",
      why: "Выключено — полки жёстко закреплены и сетка отверстий не сверлится вообще. Включено — сверлится сетка под переставные полки.",
      source: "Замер: Ø5×11 присадка на 27 панелях дампа",
      visual: "s32_grid_overview",
      affects: ["side", "divider", "shelf"],
    },
    {
      path: "defaults.joints.system32.pitch_mm10", group: "joints", label: "Шаг сетки", kind: "number", unit: "mm",
      why: "Расстояние между соседними отверстиями сетки по длине панели. 32мм — это и есть «Система-32».",
      source: "Система-32 и замер СОВПАДАЮТ: shelf_pin.rules.json — «Ø5 и шаг 32мм подтверждены обоими источниками»",
      visual: "s32_pitch",
      affects: ["side", "divider"],
    },
    {
      path: "defaults.joints.system32.firstHoleOffset_mm10", group: "joints", label: "Начало сетки от торца", kind: "number", unit: "mm",
      why: "Откуда начинается отсчёт сетки — от конца панели. Задаёт, куда попадут все последующие отверстия шага 32.",
      source: "Стандарт Системы-32 — 37мм. Локальный замер origin не разрешил (Ø4.5 на Y=32/64) — значение редактируемое",
      visual: "s32_first_hole",
      affects: ["side", "divider"],
    },
    {
      path: "defaults.joints.system32.frontRowSetback_mm10", group: "joints", label: "Передний ряд от передней кромки", kind: "number", unit: "mm",
      why: "На сколько передний ряд отверстий под полкодержатель отодвинут от ПЕРЕДНЕЙ кромки панели. Схема показывает, от какой именно кромки — иначе 37 и 65 выглядят противоречием, хотя это два разных отсчёта.",
      source: S32_STORY,
      visual: "s32_front_row",
      affects: ["side", "divider", "shelf"],
    },
    {
      path: "defaults.joints.system32.backRowSetback_mm10", group: "joints", label: "Задний ряд от задней кромки", kind: "number", unit: "mm",
      why: "То же для заднего ряда. Отдельная настройка, а не зеркало переднего: в дампе есть НЕсимметричные пары (145/79, 115/65) — один ряд подвинут под задник, другой нет.",
      source: S32_STORY,
      visual: "s32_back_row",
      affects: ["side", "divider", "shelf"],
    },
    {
      path: "defaults.joints.system32.rowMode", group: "joints", label: "Схема рядов", kind: "choice",
      why: "Сколько рядов и как они идут. В дампе встречаются ОБЕ схемы — и это ровно то, из-за чего спор «37 против 65» выглядел противоречием: панели с двумя рядами по глубине стоят на ~65, а панели с ПАРАМИ отверстий через 32 вдоль одного ряда — на 37. Две схемы, а не два ответа.",
      source: "Замер: 2-рядные (SHK CHAP BAK, Vertikalnaja) vs парные-32 (SHKOF ONG ORTA BAK: X=68/100, 724/756 …)",
      visual: "s32_row_mode",
      options: [
        { value: "front_and_back", label: "Передний и задний ряд", effect: "два ряда по глубине; полка опирается на 4 точки" },
        { value: "front_only", label: "Только передний", effect: "один ряд; для мелких полок" },
        { value: "paired_32", label: "Парами через 32", effect: "один ряд, но по 2 отверстия через 32мм на каждую позицию полки" },
      ],
      affects: ["side", "divider"],
    },
    {
      path: "defaults.joints.shelfSupport", group: "joints", label: "Опора полки", kind: "choice",
      why: "Чем полка держится на этих отверстиях. Меняет и диаметр присадки, и то, съёмная полка или нет.",
      source: "Замер: Ø5×11 на пласти, 12/12 в mined_cross_check (shelf_pin.rules.json)",
      visual: "shelf_support_types",
      options: [
        { value: "pin", label: "Полкодержатель Ø5", effect: "Ø5×11 присадка; полка снимается" },
        { value: "rafix", label: "Rafix (стяжка полки)", effect: "полка притянута — работает как связь жёсткости" },
        { value: "fixed", label: "Жёстко", effect: "полка на стяжках корпуса; сетка не сверлится" },
      ],
      affects: ["shelf", "side", "divider"],
    },
    {
      path: "defaults.joints.hinge.endOffset_mm10", group: "joints", label: "Чашка петли от края двери", kind: "number", unit: "mm",
      why: "Расстояние от верхнего/нижнего торца двери до центра крайней чашки. Диаметр и глубина чашки — свойство самой петли и живут в каталоге, а не здесь: цех о них не спорит.",
      source: "ЗАМЕР: 100.0мм на 37 из 94 чашек Ø35 — мода дампа",
      visual: "hinge_end_offset",
      affects: ["door"],
    },
    {
      path: "defaults.joints.hinge.extraHingeEveryLength_mm10", group: "joints", label: "Доп. петля каждые", kind: "number", unit: "mm",
      why: "Длина двери, после которой движок добавляет ещё одну петлю. Дверь тяжелее — петель больше, иначе провисает.",
      source: "catalog/rules/hinge_count.gtv.json",
      visual: "hinge_count_ladder",
      affects: ["door"],
    },
    {
      path: "defaults.joints.drawer.systemId", group: "joints", label: "Система ящиков", kind: "choice",
      why: "Какую систему ящиков закупает цех. Это КЛЮЧ КАТАЛОГА, а не буква высоты Blum: высоты N/M/K принадлежат LEGRABOX — у GTV VERSALITE и Hettich InnoTech другие имена и другие высоты. Минимальный проём и высоты берутся из записи каталога, а не зашиты в контракт (DB/17: каталоги — данные, никогда не код).",
      source: "catalog/packs/core_2026_06/accessories/ · slide.rules.json (GTV стр. 146-148, 152-153, 160-161; Hettich стр. 1086-1090)",
      visual: "drawer_system_compare",
      options: [
        { value: "gtv_bb_slide_h45", label: "GTV VERSALITE H45", effect: "шарикоподшипниковые, 250–550мм" },
        { value: "gtv_bb_slide_softclose", label: "GTV H45 soft-close", effect: "то же + доводчик" },
        { value: "gtv_roller_slide", label: "GTV роликовые", effect: "бюджет; меньше нагрузка" },
        { value: "het_ka270", label: "Hettich KA270", effect: "роликовые Hettich" },
      ],
      affects: ["side", "divider"],
    },
    {
      path: "defaults.joints.drawer.sideClearance_mm10", group: "joints", label: "Зазор ящика на сторону", kind: "number", unit: "mm",
      why: "Сколько цех оставляет с каждой стороны между коробом ящика и корпусом. Прямо задаёт ширину дна ящика (внутр.ширина − 2×зазор).",
      source: "НЕ ЗАМЕРЕНО — 12.5мм это класс шарикоподшипниковых; slide.rules.json цитирует только длины. Помечено честно, а не спрятано",
      visual: "drawer_side_clearance",
      affects: ["side"],
    },
  ],
};
