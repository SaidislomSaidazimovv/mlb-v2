// User/app settings for the B2B designer — profile, company (shown on the client
// quote + factory handoff), and preferences. Stored globally in localStorage (NOT
// per-project). This is the layer Supabase will later back: loadSettings/saveSettings
// become the local cache and the same Settings shape maps to a `profiles` row.

import type { ProductionOpts } from "@mebelchi/schema";
import type { QualityPref } from "../three/quality";

const KEY = "mebelchi.settings.v1";

/** The DISPLAY currency for prices. USD is the canonical BASE — the price list is stored in
 *  USD and сум/тенге are derived by the seller's exchange rate (see `fxRates`). This keeps
 *  prices stable against local inflation and means switching currency converts instead of
 *  forcing a re-type. */
export type Currency = "UZS" | "KZT" | "USD";

/** How many local units equal 1 USD, per currency (USD is 1 by definition). The seller sets
 *  these in Настройки ("1 USD = N сум/тенге"); every displayed price = its USD amount × rate. */
export interface FxRates {
  UZS: number;
  KZT: number;
}

export const DEFAULT_FX_RATES: FxRates = { UZS: 12600, KZT: 480 };

/** The seller's own price list — a flat set of the rates the pricing engine needs, all in
 *  USD (the base currency). Merged over the seed rate table at pricing time (model/rates.ts →
 *  ratesToTable), which produces a USD quote that the UI converts for display. Prices differ
 *  by region, so every seller sets these themselves; the defaults are only a starting point.
 *  Local-only for now (no rate columns in the Supabase `profiles` table yet). */
export interface RateOverrides {
  // Материалы (за м²)
  sheetPerM2: number; // ЛДСП корпус
  facadePerM2: number; // МДФ фасад (заготовка — без фрезеровки)
  backPerM2: number; // ХДФ задняя стенка
  glassPerM2: number; // стекло для витрин
  // Кромка и столешница
  edgeVisiblePerM: number; // видимая кромка
  edgeHiddenPerM: number; // скрытая кромка
  worktopPerM: number; // столешница
  // Фурнитура (за шт.)
  hingePerUnit: number; // петля
  slidePerUnit: number; // направляющая (комплект)
  /** Навес для навесного шкафа (комплект с планкой). Считается НА КОРПУС, не на модуль — ряд,
   *  объединённый в один корпус, вешается на один комплект вместо четырёх. */
  hangingPerUnit: number;
  // Работа (за операцию / модуль)
  cutPerPanel: number; // распил детали
  drillPerHole: number; // присадка (отверстие)
  /** Фрезеровка фасада — за метр контура (рамка, филёнка, вырез под стекло). 0 = не считается,
   *  пока продавец не включит: так ни одна существующая смета не меняется. */
  millPerM: number;
  /** Фрезеровка рифления (фрезерованные вертикальные рёбра) — за м² фасада. Тоже 0 по умолчанию. */
  flutePerM2: number;
  assemblyPerModule: number; // сборка модуля
  // Доставка
  deliveryBase: number; // базовая доставка
  deliveryPerModule: number; // за модуль
}

/** Starting-point price list in USD — the Chin Wood seed (UZS) ÷ ~12600. Each seller
 *  overrides these in Настройки; kept as sensible defaults so the engine never prices at 0. */
export const DEFAULT_RATE_OVERRIDES: RateOverrides = {
  sheetPerM2: 7.5,
  facadePerM2: 19,
  backPerM2: 3.3,
  glassPerM2: 9.5,
  edgeVisiblePerM: 0.44,
  edgeHiddenPerM: 0.28,
  worktopPerM: 14.7,
  hingePerUnit: 0.95,
  slidePerUnit: 3,
  hangingPerUnit: 0.55, // 7000 сум ÷ ~12600
  cutPerPanel: 0.17,
  drillPerHole: 0.06,
  millPerM: 0,
  flutePerM2: 0,
  assemblyPerModule: 6.3,
  deliveryBase: 12,
  deliveryPerModule: 1.6,
};

/** Default per-m² "overall work" price (USD per m² of facade) — a placeholder the seller
 *  replaces with their own client-facing rate. */
export const DEFAULT_SQM_RATE = 200;

/** Workshop fastener / joint family:
 *  `confirmat` = Евровинт Ø7×50mm screw (manual drill assembly default)
 *  `minifix` = Минификс Ø15×12.5mm cam + dowel Ø8×34mm (CNC factory standard)
 *  `dowel` = Шкант деревянный Ø8×30mm (glued non-demountable joint) */
export type JointFamily = "confirmat" | "minifix" | "dowel";

export interface Settings {
  // ... existing fields ...
  // Профиль (the designer's own contact — used on quotes/orders)
  name: string;
  phone: string;
  email: string;
  // Компания / мастерская (appears on the Смета + Передача documents)
  company: string;
  companyPhone: string;
  companyAddress: string;
  // Предпочтения
  currency: Currency; // DISPLAY currency (USD is the base)
  fxRates: FxRates; // local units per 1 USD
  language: "ru" | "uz";
  /** DISPLAY units for lengths — cm or mm. Display-only; the engine stays mm10 (CF4 §12.3). */
  units: "cm" | "mm";
  /** Shelf load for the deflection min-gate, kg per running metre (37_MIN §2.3; founder
   *  default 15, master-overridable). */
  shelfLoadKgPerM: number;
  /** Show prices anywhere in the app? OFF by default — sellers asked to keep the
   *  seller↔homeowner situation clean. Gates every price display and skips the Смета step. */
  showPricing: boolean;
  /** Pricing MODE toggles (both can be on → the Смета compares them). `pricingItems` = the
   *  detailed per-part cost; `pricingSqm` = a simple client price of facade m² × `sqmRate`. */
  pricingItems: boolean;
  pricingSqm: boolean;
  /** Per-m² "overall work" price in USD (multiplies the facade area). */
  sqmRate: number;
  /** The seller's own itemised price list, in USD (see RateOverrides). Local-only for now. */
  rates: RateOverrides;
  // Раскрой (cutting/nesting) — the workshop's board + saw config, set once. Local-only.
  sheetW: number; // standard sheet length (mm)
  sheetH: number; // standard sheet width (mm)
  kerf: number; // saw blade width between parts (mm)
  respectGrain: boolean; // don't rotate grained facades when nesting
  // Корпус (carcass conventions) — HOW this workshop builds a box, as opposed to what it charges
  // (rates) or what it builds out of (materials). Set once; travels onto every project quoted.
  /** Навесов на КОРПУС (не на модуль). A merged row hangs on one set — that is the point of
   *  merging. 2 is the normal pair. */
  hangingsPerCarcass: number;
  /** Ещё один комплект навесов на каждые N мм ширины корпуса. 0 = один комплект на корпус любой
   *  ширины (шкаф на монтажной планке) — так объединённый ряд 2400 берёт 2 навеса вместо 8.
   *  Мастерская, которая вешает пару на каждые 900 мм, ставит 900. */
  hangingSpanMm: number;
  /** Fastener / Joint family used by this workshop: "confirmat" | "minifix" | "dowel" */
  jointFamily: JointFamily;
  /** Distance from front edge to first joint fastener bore (mm, default 65mm). */
  jointSetbackMm: number;
  /** System-32 first shelf-pin / slide hole setback from the side panel's FRONT edge (mm, default 37 — the
   *  industry standard, founder-confirmed 2026-08-10 #6). Editable in «Настройки → Узлы»; the 3D/CNC read it
   *  as the shop's standing rule. Absent (old saved profiles) → 37. */
  system32SetbackMm: number;
  /** POSYLKA 2026-08-13 «Настройки → Узлы» (editable joint rules). These are the SHOP OVERRIDE layer over
   *  QORASU_PROFILE.defaults.joints — the drilling solver reads them (machining.ts) so an edit reaches the
   *  CNC + 3D. Distinct from `system32SetbackMm` (that is the first-hole/slide setback along the panel; these
   *  are the DEPTH-axis pin rows + the cam offset). Defaults = the profile values (65/65/34mm). */
  /** System-32 shelf-pin FRONT row, set back from the panel's FRONT depth-edge (mm, default 65 — profile
   *  `system32.frontRowSetback_mm10`; `visual: s32_front_row`). */
  s32FrontRowSetbackMm: number;
  /** System-32 shelf-pin BACK row, set back from the panel's BACK depth-edge (mm, default 65 — profile
   *  `system32.backRowSetback_mm10`; `visual: s32_back_row`). */
  s32BackRowSetbackMm: number;
  /** Carcass cam (эксцентрик) seat offset from the mating END edge (mm, default 34 — MEASURED, profile
   *  `joints.connectorEndOffset_mm10`; `visual: joint_connector_offset`). */
  connectorEndOffsetMm: number;
  /** Hinge cup setback from the door's near END (mm, default 100 — MEASURED, profile `joints.hinge.endOffset_mm10`;
   *  `visual: hinge_end_offset`). Reaches the drilling solver (hinge cup placement). */
  hingeEndOffsetMm: number;
  /** System-32 shelf-pin grid ON/OFF (default true — profile `joints.system32.enabled`; `visual: s32_grid_overview`).
   *  Off → the side panels get no pin rows (fixed shelves). Reaches the drilling solver. */
  s32Enabled: boolean;
  /** System-32 shelf-pin row mode (default "front_and_back" — profile `joints.system32.rowMode`; `visual: s32_row_mode`).
   *  "front_only" drills just the front row (small shelves). "paired_32" needs the 32mm ladder — not wired yet.
   *  Reaches the drilling solver. */
  s32RowMode: "front_and_back" | "front_only" | "paired_32";
  /** «Кромка · bo'yash rejimi» (talablar §4): per-part-role, per-edge kromka OVERRIDE над the profile's
   *  `kromkaByRole` census. `{ side: { front: "K1", back: null } }` — the master paints an edge with K1/K2
   *  or bare (null). Empty → the cut list uses the profile default. The cut list (cncExport) reads it. */
  kromkaOverride: Record<string, Partial<Record<"front" | "back" | "left" | "right" | "top" | "bottom", "K1" | "K2" | null>>>;
  /** Show the professional/advanced exports (CNC drilling SWJ008 + the CSV spec). OFF by
   *  default — ~95% of workshops cut manually and only need the cutting plan (PDF/DXF). */
  advancedExport: boolean;
  /** 3D QUALITY. `auto` measures the frame time on this device and steps down (pixel ratio, then the
   *  shadow map, then the ceiling lights) if it can't hold the budget — which is what a weak phone
   *  needs and what nobody should have to know to ask for. `high`/`low` pin it. See three/quality.ts. */
  quality: QualityPref;
}

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  phone: "",
  email: "",
  company: "",
  companyPhone: "",
  companyAddress: "",
  currency: "UZS",
  fxRates: { ...DEFAULT_FX_RATES },
  language: "uz", // Uzbekistan market default; user can switch to Русский in Настройки
  units: "mm", // matches the app's existing mm readout; toggle to cm in the constructor
  shelfLoadKgPerM: 15, // founder 2026-08-06 ("15, but masters can change it")
  showPricing: false,
  pricingItems: true, // the itemised calc is the default mode when pricing is shown
  pricingSqm: false,
  sqmRate: DEFAULT_SQM_RATE,
  rates: { ...DEFAULT_RATE_OVERRIDES },
  sheetW: 2750, // standard ЛДСП sheet
  sheetH: 1830,
  kerf: 4,
  respectGrain: true,
  hangingsPerCarcass: 2,
  hangingSpanMm: 0, // one set per box however wide — the mounting-rail build
  jointFamily: "confirmat",
  jointSetbackMm: 65,
  system32SetbackMm: 37, // System-32 standard first-hole setback (founder #6, 2026-08-10)
  // POSYLKA 2026-08-13 «Настройки → Узлы» — shop override over the profile joints (65/65/34mm = profile default).
  s32FrontRowSetbackMm: 65,
  s32BackRowSetbackMm: 65,
  connectorEndOffsetMm: 34,
  hingeEndOffsetMm: 100,
  s32Enabled: true,
  s32RowMode: "front_and_back",
  kromkaOverride: {},
  advancedExport: false,
  quality: "auto",
};

/** The shop's build conventions, in the shape the pricing engine takes. Rides on every Project. */
export function productionFrom(s: Settings): ProductionOpts {
  return { hangingsPerCarcass: s.hangingsPerCarcass, hangingSpanMm: s.hangingSpanMm };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, fxRates: { ...DEFAULT_FX_RATES }, rates: { ...DEFAULT_RATE_OVERRIDES } };
    const saved = JSON.parse(raw) as Partial<Settings>;
    // A save from BEFORE the USD-base model has no `fxRates`; its `rates` were in local
    // currency, so they'd be nonsense as USD — reset them to the USD defaults on migration.
    const preUsd = saved.fxRates == null;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      fxRates: { ...DEFAULT_FX_RATES, ...(saved.fxRates ?? {}) },
      rates: preUsd ? { ...DEFAULT_RATE_OVERRIDES } : { ...DEFAULT_RATE_OVERRIDES, ...(saved.rates ?? {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, fxRates: { ...DEFAULT_FX_RATES }, rates: { ...DEFAULT_RATE_OVERRIDES } };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full / unavailable — ignore */
  }
}

/** True once the designer has filled the essentials (name/phone) — drives the
 *  "complete your profile" nudge on the home screen. */
export function profileComplete(s: Settings): boolean {
  return s.name.trim().length > 0 && s.phone.trim().length > 0;
}
