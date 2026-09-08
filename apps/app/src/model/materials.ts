// Eman.uz material catalogue — REAL data from eman.uz (Toshkent supplier), gathered 2026-08.
// Per DB/17 / DB/40 §5 ("catalogues are data, never code — no SKU/price/decor is ever a TS
// literal"), the entries live in ./data/eman-palette.json and are loaded here; this file keeps
// only the type + helpers. This is the small PALETTE seed (DB/40 §1 — 2–8 per group), NOT the
// thousands-strong background catalogue (that + the ΔE00 advisor are the separate "B" work).
//
// HONESTY (App-2 audit 2026-08): codes / decor names / prices / sheet sizes are real eman.uz
// values — price is a SNAPSHOT (the live feed changes). `densityKgM3` for ЛДСП (728) is DERIVED
// from a real sheet weight (76 kg ÷ 2800×2070×18mm); ХДФ (850) and worktop (700) use the standard
// published board density (no eman.uz weight sampled for those). `color` is APPROXIMATE — eman.uz
// publishes swatch photos, not hex; exact colour needs image sampling (the "B" script, run where
// there is network). Handles (H) stay placeholder — real hardware is the factory-verified
// HardwareSpec, not this material catalogue.

import { fmtSum } from "./format";
import type { FinishKey } from "./cabinet";
import type { MaterialType } from "@mebelchi/schema";
import emanPalette from "./data/eman-palette.json";
import emanFeed from "./data/eman-catalogue.json";

export interface EmanMaterial {
  id: string;
  code?: string; // Role code tag: "A1", "A2", "B1", "C1", "W1"...
  name: string;
  desc: string; // e.g. "Ручка, черная"
  thickness: string; // e.g. "18mm"
  thicknessMm?: number; // e.g. 18
  sheetW?: number; // e.g. 2750
  sheetH?: number; // e.g. 1830
  stockSheets?: number; // e.g. 1.2
  price: number; // sum, per pack
  per: number; // pack size ("за N")
  color: string; // swatch
  part: FinishKey | "back"; // which render colour or part role this material drives
  en?: string; // English material descriptor for the AI render prompt
  tex?: string; // PBR texture key (three/pbr.ts TEX) — drives the live 3D surface
  weightKg?: number; // real sheet weight (eman.uz), where sampled — the source for densityKgM3
  densityKgM3?: number; // board density; feeds the 45kg sheet-weight limit (DB/40 §5, merge.limits)
}

/** The seed palette — REAL eman.uz materials, loaded from DATA (DB/17: catalogues are
 *  data, never code). `as unknown` because a JSON import widens `part`/`color` to string. */
export const EMAN_MATERIALS: EmanMaterial[] = emanPalette as unknown as EmanMaterial[];

/** hex string ("#rrggbb") → the colour int the renderer + finish overrides use. */
export const hexToInt = (hex: string) => parseInt(hex.replace("#", ""), 16);

/** the catalog material a finish colour came from (exact colour+part match), or undefined
 *  — lets the 3D recover the picked material's PBR texture from the stored finish. */
export function catalogByColor(colorInt: number | undefined, part: FinishKey): EmanMaterial | undefined {
  if (colorInt == null) return undefined;
  return EMAN_MATERIALS.find((m) => m.part === part && hexToInt(m.color) === colorInt);
}

// `money` defaults to UZS (`fmtSum`); pass a `useMoney()` formatter to honour the
// user's chosen currency (the price is a UZS base amount).
export const matPriceLabel = (m: EmanMaterial, money: (n: number) => string = fmtSum) => `${money(m.price)} за ${m.per}`;

// ── Material variables / project slots (§3 CONSTRUCTION_FRAME_v4, §9 QONUNLAR) ──
// The project defines named board-material slots — A·facade, B·carcass, C·back (orqa), W·worktop.
// A slot holds the SKU id; colour / price / thickness / density are READ from the catalog entry.
// A Cell/Module never carries a material — only a role that binds to one of these project slots
// (§27 anti-Frankenstein). Additive: the per-part `finish` colours keep working as before.
export type MaterialSlotKey = "facade" | "carcass" | "back" | "worktop";
export type MaterialSlots = Record<MaterialSlotKey, string>; // slot → EMAN material id

/** Default slot picks — the first catalog material of each role (seeds a project's variables). */
export function defaultMaterialSlots(): MaterialSlots {
  const first = (part: EmanMaterial["part"]): string => EMAN_MATERIALS.find((m) => m.part === part)?.id ?? "";
  return { facade: first("facade"), carcass: first("carcass"), back: first("back"), worktop: first("worktop") };
}

/** A row of the background feed (gather_eman.py), reachable when a slot is BOUND to a feed SKU the
 *  advisor suggested (id "cat-<eman-id>"). Built lazily on first lookup. The SLOT carries the role,
 *  so `part` here is just a ЛДСП placeholder (it never enters the palette list — DB/40 §1). */
type FeedRow = {
  id: string; name: string; price: number | null; thicknessMm: number | null;
  sheetW: number | null; sheetH: number | null; weightKg: number | null; densityKgM3: number | null; color: string;
};
let FEED_MAP: Map<string, EmanMaterial> | null = null;
function feedMaterialById(id: string): EmanMaterial | undefined {
  if (!id.startsWith("cat-")) return undefined;
  if (!FEED_MAP) {
    FEED_MAP = new Map();
    for (const e of emanFeed as FeedRow[]) {
      FEED_MAP.set(`cat-${e.id}`, {
        id: `cat-${e.id}`, name: e.name, desc: e.name, color: e.color,
        thickness: e.thicknessMm ? `${e.thicknessMm}mm` : "",
        ...(e.thicknessMm ? { thicknessMm: e.thicknessMm } : {}),
        ...(e.sheetW ? { sheetW: e.sheetW } : {}),
        ...(e.sheetH ? { sheetH: e.sheetH } : {}),
        ...(e.weightKg ? { weightKg: e.weightKg } : {}),
        price: e.price ?? 0, per: 1, part: "carcass",
        densityKgM3: e.densityKgM3 ?? densityForType("LDSP"),
      });
    }
  }
  return FEED_MAP.get(id);
}

/** Resolve a material id to its entry — the palette first, then a BOUND feed SKU ("cat-…"). This is
 *  how an advisor pick from the 286-SKU feed becomes the slot's real material (DB/40 §4). */
export function resolveMaterial(id: string | undefined): EmanMaterial | undefined {
  if (!id) return undefined;
  return EMAN_MATERIALS.find((m) => m.id === id) ?? feedMaterialById(id);
}

/** Resolve a project slot to its catalog material (id → entry), or undefined if unset/unknown. */
export function slotMaterial(slots: MaterialSlots, key: MaterialSlotKey): EmanMaterial | undefined {
  return resolveMaterial(slots[key]);
}

/** The rate-table material TYPE a catalog SKU prices as — read from its spec text (ЛДСП/МДФ/ХДФ/
 *  камень…), else defaulted by role. Lets the quote follow the picked material's TYPE via the
 *  seller's per-type rates (§3: price travels with the material). B (per-SKU catalog price) waits
 *  on the catalog-pack + ConstructionProfile (variant 3). */
export function emanMatType(m: EmanMaterial): MaterialType {
  const d = m.desc.toLowerCase();
  if (d.includes("хдф")) return "HDF";
  if (d.includes("мдф")) return "MDF";
  if (d.includes("лдсп")) return "LDSP";
  if (d.includes("камень") || d.includes("мрамор") || d.includes("гранит") || d.includes("массив")) return "solid";
  return m.part === "facade" ? "MDF" : m.part === "back" ? "HDF" : m.part === "worktop" ? "solid" : "LDSP";
}

/** Standard published board densities (kg/m³) — the fallback used ONLY when the catalogue holds
 *  no weighed material of a type. Real per-material values (e.g. ЛДСП 728, derived from a real
 *  eman.uz sheet weight) live on the catalogue entries and take precedence via densityForType(). */
const STANDARD_DENSITY: Record<MaterialType, number> = { LDSP: 700, MDF: 750, HDF: 850, solid: 700, GLASS: 2500 };

/** Density (kg/m³) for a material TYPE — averaged from the REAL catalogue entries of that type
 *  (each carries `densityKgM3`), falling back to the standard published density. This is how the
 *  real Eman density reaches the 45kg sheet-weight limit (DB/40 §5), instead of a hardcode. */
export function densityForType(type: MaterialType): number {
  const weighed = EMAN_MATERIALS.filter((m) => emanMatType(m) === type && m.densityKgM3);
  if (!weighed.length) return STANDARD_DENSITY[type];
  return Math.round(weighed.reduce((s, m) => s + (m.densityKgM3 ?? 0), 0) / weighed.length);
}
