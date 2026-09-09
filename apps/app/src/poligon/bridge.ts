// Parity ko'prigi: parametric karcasni Sheet ko'rinishida quradi (eski solveBaseCabinet BILAN bir xil
// mebel). ASOS: 48§0 (face=pos±t/2) + L15 (outer face devor chegarasida — outer chiziq t/2 ICHKARIDA) —
// aynan eski engine konvensiyasi (W/H = TASHQI o'lcham; side=H, top=W−2t). O'ylab topilmagan: eski chiqish
// (side-left W=560 L=720, top L=568=W−2t) bilan tekshirilган.
import { createSheet, addLine, setThickness } from "./model/sheet.ts";
import type { Sheet, Thickness } from "./model/contracts.ts";
import type { Role } from "./model/junction.ts";
import type { Rule } from "./model/cascade.ts";

export interface CarcassSpec { width: number; height: number; depth: number; thickness?: Thickness; shelfYs?: number[]; }

/**
 * Parametric karcass → Sheet + roles + rules (depth). Outer panellar TASHQI YUZASI 0/width, 0/height da
 * (t/2 ichkarida) — eski engine bilan bir xil: side=height, top/bottom=width−2t. shelfYs — ichki polka H
 * chiziqlari (butun mm). Rol: side/top/bottom/shelf (side rank>top/bottom → V-through, top/bottom butt).
 */
export function carcassSheet(spec: CarcassSpec): { sheet: Sheet; roles: Record<string, Role>; rules: Rule[] } {
  const t = spec.thickness ?? 16;
  const h = t / 2;
  const s = createSheet();
  // V (side) chiziqlari: tashqi yuza 0 va width → markaz t/2 va width−t/2
  const vL = addLine(s, "V", h).id;
  const vR = addLine(s, "V", spec.width - h).id;
  // H (bottom/top) + polkalar
  const hB = addLine(s, "H", h).id;               // bottom, tashqi yuza 0
  const hT = addLine(s, "H", spec.height - h).id; // top, tashqi yuza height
  const roles: Record<string, Role> = { [vL]: "side", [vR]: "side", [hB]: "bottom", [hT]: "top" };
  const shelfIds: string[] = [];
  for (const y of spec.shelfYs ?? []) { const id = addLine(s, "H", y).id; roles[id] = "shelf"; shelfIds.push(id); }

  // qalinliklar SEGMENT-ADJACENT bo'yicha (polka H chiziqlarini hisobga olib):
  // sidelar HAR qo'shni H-interval bo'ylab t (to'liq balandlik, polka orqali o'tadi);
  for (let i = 0; i + 1 < s.hLines.length; i++) {
    setThickness(s, vL, s.hLines[i]!.id, s.hLines[i + 1]!.id, t);
    setThickness(s, vR, s.hLines[i]!.id, s.hLines[i + 1]!.id, t);
  }
  // top/bottom/polkalar — yagona V-interval (vL..vR) bo'ylab t
  setThickness(s, hB, vL, vR, t); setThickness(s, hT, vL, vR, t);
  for (const id of shelfIds) setThickness(s, id, vL, vR, t);

  const rules: Rule[] = [{ layer: "system", property: "depth", value: spec.depth, facets: [], match: () => true, pass: "P1" }];
  return { sheet: s, roles, rules };
}
