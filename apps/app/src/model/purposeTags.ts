// Purpose tags (Назначение) — CONSTRUCTION_FRAME_v4 §8.4.
//
// A Space (Пространство) can carry a PURPOSE: what it is FOR. The purpose drives two
// things — Application mode's ghost contents (a low-poly prop appears) and, for some, a
// min-clearance constraint. This is DESIGN intent (§8.4): the app DECLARES the role, it
// never infers it from geometry (doc-34 §8). It maps to the canonical DesignNode.purpose.
//
// The HERO is the BOILER: hiding the wall water-heater is one of the top reasons Uzbek
// clients order custom kitchens (§8.4). Building mode must show it in one tap.
//
// Props are COMMUNICATION, not CAD: a small library of low-poly silhouettes (§8.4),
// ghosted, one per tag — never a realistic model.

import type { Cabinet } from "./cabinet";

export type PurposeCategory = "appliance" | "content" | "utility";
export type PropShape = "box" | "cylinder" | "stack";

export interface PurposeTag {
  id: string;
  ru: string;
  uz: string;
  category: PurposeCategory;
  /** Low-poly ghost prop for Application mode (silhouette, not CAD). */
  prop: { shape: PropShape; color: string };
  /** Minimum interior clearance the purpose needs, mm (absent = none). */
  minClearanceMm?: number;
}

export const PURPOSE_TAGS: PurposeTag[] = [
  // ── the hero (the selling feature) ──
  { id: "boiler", ru: "Бойлер", uz: "Boyler", category: "utility", prop: { shape: "cylinder", color: "#d8dbe0" }, minClearanceMm: 50 },
  // ── appliances (mapped from ApplianceKind) ──
  { id: "sink", ru: "Мойка", uz: "Rakovina", category: "appliance", prop: { shape: "box", color: "#c4c9cf" } },
  { id: "hob", ru: "Варочная", uz: "Pech yuzasi", category: "appliance", prop: { shape: "box", color: "#3a3d42" } },
  { id: "oven", ru: "Духовка", uz: "Duxovka", category: "appliance", prop: { shape: "box", color: "#4a4d52" }, minClearanceMm: 20 },
  { id: "fridge", ru: "Холодильник", uz: "Muzlatgich", category: "appliance", prop: { shape: "box", color: "#e8eaed" } },
  { id: "dishwasher", ru: "Посудомойка", uz: "Idish yuvgich", category: "appliance", prop: { shape: "box", color: "#dcdfe3" } },
  { id: "washer", ru: "Стиралка", uz: "Kir yuvgich", category: "appliance", prop: { shape: "box", color: "#e8eaed" } },
  { id: "hood", ru: "Вытяжка", uz: "So'rg'ich", category: "appliance", prop: { shape: "box", color: "#c9ccd1" } },
  // ── contents (what a cabinet holds) ──
  { id: "dishes", ru: "Посуда", uz: "Idish-tovoq", category: "content", prop: { shape: "stack", color: "#eceae4" } },
  { id: "pots", ru: "Кастрюли", uz: "Kostryulka", category: "content", prop: { shape: "cylinder", color: "#b8bcc2" } },
  { id: "spices", ru: "Специи", uz: "Ziravor", category: "content", prop: { shape: "stack", color: "#c9a36b" } },
  { id: "bottles", ru: "Бутылки", uz: "Shishalar", category: "content", prop: { shape: "cylinder", color: "#9fb8a8" } },
];

const BY_ID = new Map(PURPOSE_TAGS.map((t) => [t.id, t]));

/** Look up a purpose tag by id (undefined if not a known purpose). */
export function purposeTag(id?: string): PurposeTag | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The minimum interior clearance (mm) a purpose needs, or 0 if none / unknown. */
export function purposeClearanceMm(id?: string): number {
  return purposeTag(id)?.minClearanceMm ?? 0;
}

/** The purpose of a cabinet's space: an EXPLICIT tag wins; otherwise a built-in
 *  appliance maps to its tag ("cooktop" shares the "hob" prop). `none`/`filler` and a
 *  bare cabinet have no purpose. Declared intent — never inferred from geometry. */
export function purposeOf(cab: Cabinet): string | undefined {
  if (cab.purpose && BY_ID.has(cab.purpose)) return cab.purpose;
  const a = cab.appliance;
  if (a && a !== "none" && a !== "filler") return a === "cooktop" ? "hob" : a;
  return undefined;
}
