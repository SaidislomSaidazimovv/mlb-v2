// Display units for lengths (CONSTRUCTION_FRAME_v4 §12.3). DISPLAY-ONLY — the engine
// stays mm10; only what the master READS on screen changes. cm shows value/10 (one
// decimal when needed), mm shows whole millimetres.

export type LenUnit = "cm" | "mm";

/** Short label for a unit. */
export const lenUnitLabel = (u: LenUnit): string => (u === "cm" ? "см" : "мм");

/** Format a length given in MILLIMETRES for display in the chosen unit.
 *  cm → value/10, whole when round else one decimal (600 → "60", 605 → "60.5");
 *  mm → whole mm ("600"). */
export function fmtLen(mm: number, unit: LenUnit): string {
  if (unit === "mm") return String(Math.round(mm));
  return (Math.round(mm) / 10).toString(); // one decimal falls out naturally (60, 60.5)
}

/** Format a length with its unit suffix ("60 см" / "600 мм"). */
export function fmtLenU(mm: number, unit: LenUnit): string {
  return `${fmtLen(mm, unit)} ${lenUnitLabel(unit)}`;
}
