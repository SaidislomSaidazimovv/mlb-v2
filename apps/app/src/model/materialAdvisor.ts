// DB/40 §4 — the app's material advisor entry point. "What real Eman material is closest to this
// colour?" — it converts the picked colour to CIE L*a*b*, then hands it to the ENGINE's advisor
// (ciede2000 + the §4 ranking, engine/catalogs/materialAdvisor). The catalogue the advisor searches
// is the background feed; for now it is DERIVED from the real palette (the full thousands-SKU feed
// is the gather script). The advisor is NEVER a browse — it runs when the user picks a colour.

import {
  closestMaterials,
  type CatalogueEntry,
  type ColorLab,
  type MaterialMatch,
  type AdvisorOptions,
} from "../../../../engine/index.js";
import { EMAN_MATERIALS, densityForType, emanMatType } from "./materials";
import emanBigFeed from "./data/eman-catalogue.json";

/** One row of the gathered background feed (gather_eman.py → data/eman-catalogue.json). */
type FeedRow = {
  id: string; name: string; price: number | null; thicknessMm: number | null;
  sheetW: number | null; sheetH: number | null; weightKg: number | null; densityKgM3: number | null; color: string;
};

/** sRGB hex ("#rrggbb") → CIE L*a*b* (D65). The maths is exact; only the hex is approximate
 *  (eman.uz publishes swatch photos, not hex — see materials.ts). */
export function hexToLab(hex: string): ColorLab {
  const h = hex.replace("#", "");
  const to = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const R = lin(to(0)), G = lin(to(2)), B = lin(to(4));
  // sRGB → XYZ (D65)
  const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
  // XYZ → L*a*b* (D65 white point)
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X / 0.95047), fy = f(Y / 1.0), fz = f(Z / 1.08883);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** The gathered background feed → CatalogueEntry[]. The 286 real ЛДСП decors from eman.uz, each
 *  with the EXACT colour sampled from its swatch image. This is the real thousands-SKU background
 *  the advisor searches for the board roles; it supersets the small palette for ЛДСП. */
const BIG_FEED: CatalogueEntry[] = (emanBigFeed as FeedRow[]).map((e): CatalogueEntry => ({
  sku: `cat-${e.id}`,
  supplier: "Eman",
  decorName: e.name,
  color: hexToLab(e.color),
  thickness_mm10: e.thicknessMm ? [Math.round(e.thicknessMm * 10)] : [],
  sheet_mm10: { length_mm10: Math.round((e.sheetW ?? 0) * 10), width_mm10: Math.round((e.sheetH ?? 0) * 10) },
  density_kg_m3: e.densityKgM3 ?? densityForType("LDSP"),
  price: e.price ?? 0,
  currency: "UZS",
  availability: "in_stock",
}));

/** sku → original hex, for the UI swatch (a CatalogueEntry carries only Lab). */
const FEED_HEX: Record<string, string> = Object.fromEntries(
  (emanBigFeed as FeedRow[]).map((e) => [`cat-${e.id}`, e.color]),
);
function hexOf(sku: string): string {
  return FEED_HEX[sku] ?? EMAN_MATERIALS.find((m) => m.id === sku)?.color ?? "#cccccc";
}

/** Palette entries (the small curated set) for one role — the source for back/worktop, which the
 *  ЛДСП feed doesn't cover (backs are ХДФ, worktops are stone). */
function paletteEntries(part?: string): CatalogueEntry[] {
  return EMAN_MATERIALS
    .filter((m) => m.part !== "handle" && (part === undefined || m.part === part))
    .map((m): CatalogueEntry => ({
      sku: m.id, supplier: "Eman", decorName: m.name, color: hexToLab(m.color),
      thickness_mm10: m.thicknessMm ? [Math.round(m.thicknessMm * 10)] : [],
      sheet_mm10: { length_mm10: Math.round((m.sheetW ?? 0) * 10), width_mm10: Math.round((m.sheetH ?? 0) * 10) },
      density_kg_m3: m.densityKgM3 ?? densityForType(emanMatType(m)),
      price: m.price, currency: "UZS", availability: "in_stock",
    }));
}

/** The background catalogue the advisor searches. Board roles (facade/carcass) get the full 286-SKU
 *  ЛДСП feed; back/worktop get the palette (ХДФ/stone — the ЛДСП feed doesn't cover them). */
export function emanCatalogue(part?: string): CatalogueEntry[] {
  if (part === "back" || part === "worktop") return paletteEntries(part);
  if (part === "facade" || part === "carcass") return BIG_FEED;
  return [...BIG_FEED, ...paletteEntries("back"), ...paletteEntries("worktop")];
}

/** "Closest real material to this colour" (DB/40 §4) — the ranked matches, nearest first, or []
 *  when nothing is within ΔE00 range. `opts.part` scopes the search to one design role. */
export function suggestMaterials(hex: string, opts: AdvisorOptions & { part?: string } = {}): MaterialMatch[] {
  const { part, ...adv } = opts;
  return closestMaterials(hexToLab(hex), emanCatalogue(part), adv);
}

/** A UI-ready suggestion: the closest real material with its display hex + price. */
export interface Suggestion { sku: string; name: string; hex: string; deltaE00: number; price: number; }

/** The advisor's suggestions, enriched for the UI (swatch hex + name + price). */
export function suggestForUI(hex: string, opts: AdvisorOptions & { part?: string } = {}): Suggestion[] {
  return suggestMaterials(hex, opts).map((m) => ({
    sku: m.entry.sku, name: m.entry.decorName, hex: hexOf(m.entry.sku),
    deltaE00: m.deltaE00, price: m.entry.price,
  }));
}
