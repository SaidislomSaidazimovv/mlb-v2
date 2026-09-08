// Accessories REFERENCE library (CONSTRUCTION_FRAME_v4 §8.5: "Accessories library — joints, hinges,
// slides, rods, lifts. Grouped by function × brand"). Loads the real browse-grade accessory catalog
// pack — nothing is invented here, every field comes from the JSON.
//
// IMPORTANT — this is REFERENCE / browse only, NOT functional placement. Every catalog entry is
// `verified:false` (browse-grade, no manufacturing SKUs), and an accessory's real placement means its
// joint requirements (a hinge's cup pattern, a rail-holder's holes) — i.e. DRILLING, which is the
// founder-deferred F1 (holes: "not this version and not the next", founder «variant A») resolved by the
// ENGINE's Joints layer (§8.3), never by App-2. So we can DISPLAY the catalog, never drill from it.

const raw = import.meta.glob("../../../../catalog/packs/core_2026_06/accessories/*.json", { eager: true });

export interface AccessoryItem {
  id: string;
  brand: string;
  name: string;
  family: string;
  functionGroup: string; // the pack's own F-code, e.g. "F12_wardrobe"
  category: string;
  grade: string; // "browse" for this pack — not manufacturing-ready
  verified: boolean; // all false in the core pack — reference only
}

type RawAccessory = { id?: unknown; brand?: unknown; name?: unknown; family?: unknown; function_group?: unknown; category?: unknown; grade?: unknown; verified?: unknown };
const str = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);

/** Every accessory in the core pack, read verbatim from the JSON, sorted by function group then brand. */
export const ACCESSORIES: AccessoryItem[] = Object.values(raw)
  .map((m) => {
    const a = ((m as { default?: RawAccessory }).default ?? m) as RawAccessory;
    return {
      id: str(a.id),
      brand: str(a.brand, "—"),
      name: str(a.name, str(a.id)),
      family: str(a.family),
      functionGroup: str(a.function_group, "F0_other"),
      category: str(a.category),
      grade: str(a.grade, "browse"),
      verified: a.verified === true,
    };
  })
  .filter((a) => a.id)
  .sort((x, y) => x.functionGroup.localeCompare(y.functionGroup) || x.brand.localeCompare(y.brand) || x.name.localeCompare(y.name));

/** A human label for an F-code, derived MECHANICALLY from the code itself (no invented names):
 *  "F12_wardrobe" → "wardrobe", "F5_door_hinged" → "door hinged". */
export function functionGroupLabel(code: string): string {
  return code.replace(/^F\d+_/, "").replace(/_/g, " ") || code;
}

/** Accessories grouped by function group (§8.5 "grouped by function"), each group's items brand-sorted. */
export function accessoriesByFunction(): { code: string; label: string; items: AccessoryItem[] }[] {
  const groups = new Map<string, AccessoryItem[]>();
  for (const a of ACCESSORIES) {
    const g = groups.get(a.functionGroup) ?? [];
    g.push(a);
    groups.set(a.functionGroup, g);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, items]) => ({ code, label: functionGroupLabel(code), items }));
}
