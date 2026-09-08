// Layer 0 — the material ADVISOR (DB/40 §4). Given a chosen colour and the background Eman
// catalogue, it answers ONE question: "what real material is closest to this colour?" — never a
// browse. Distance is CIEDE2000 in CIE L*a*b* (DB/40 §4: RGB distance does not match the eye —
// two decors 30 apart in RGB can look identical while another pair looks obviously wrong).
//
// Pure + deterministic — no UI, no network (F engine, DB/40 §6 Step 4). The catalogue itself is
// DATA, never code (dannye/katalogi/eman/<feed>.json, DB/17) — this file is only the maths + rank.

import type { ColorLab, MaterialFinish } from "../contracts/design.js";
import type { mm10 } from "../contracts/types.js";

/** One row of the background catalogue — a real supplier SKU (DB/40 §5). DATA, never code. */
export interface CatalogueEntry {
  sku: string;
  supplier: string;
  decorName: string;
  color: ColorLab;
  finish?: MaterialFinish;
  /** Thicknesses the SKU is made in — 16 and 18 are different SKUs (DB/40 §4). */
  thickness_mm10: mm10[];
  sheet_mm10: { length_mm10: mm10; width_mm10: mm10 };
  density_kg_m3: number;
  price: number;
  currency: string;
  pricedAt?: string;
  availability?: "in_stock" | "order" | "discontinued";
}

const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;
const pow7 = (x: number): number => x ** 7;

/** atan2 in degrees, normalised to [0, 360). */
function hueDeg(b: number, ap: number): number {
  if (b === 0 && ap === 0) return 0;
  const h = deg(Math.atan2(b, ap));
  return h >= 0 ? h : h + 360;
}

/**
 * CIEDE2000 colour difference between two CIE L*a*b* colours (Sharma, Wu & Dalal 2005).
 * 0 = identical; <1 invisible to a normal eye; >6 is a different colour (DB/40 §4). kL=kC=kH=1.
 */
export function ciede2000(s1: ColorLab, s2: ColorLab): number {
  const { L: L1, a: a1, b: b1 } = s1;
  const { L: L2, a: a2, b: b2 } = s2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(pow7(Cbar) / (pow7(Cbar) + pow7(25))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = hueDeg(b1, a1p);
  const h2p = hueDeg(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp: number;
  if (C1p * C2p === 0) dhp = 0;
  else {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let Hbarp: number;
  if (C1p * C2p === 0) Hbarp = h1p + h2p;
  else {
    const diff = Math.abs(h1p - h2p);
    if (diff <= 180) Hbarp = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) Hbarp = (h1p + h2p + 360) / 2;
    else Hbarp = (h1p + h2p - 360) / 2;
  }
  const T = 1 - 0.17 * Math.cos(rad(Hbarp - 30)) + 0.24 * Math.cos(rad(2 * Hbarp))
    + 0.32 * Math.cos(rad(3 * Hbarp + 6)) - 0.20 * Math.cos(rad(4 * Hbarp - 63));
  const dTheta = 30 * Math.exp(-(((Hbarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(pow7(Cbarp) / (pow7(Cbarp) + pow7(25)));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/** A ranked suggestion: a catalogue SKU and how far its decor is from the requested colour. */
export interface MaterialMatch {
  entry: CatalogueEntry;
  /** CIEDE2000 distance to the requested colour. */
  deltaE00: number;
}

export interface AdvisorOptions {
  /** Reject matches beyond this ΔE00 (DB/40 §4: >6 is a different colour). Default 6. */
  maxDeltaE00?: number;
  /** The project's thickness — an entry must be made in it to be a real match (16 ≠ 18). */
  thickness_mm10?: mm10;
  /** The finish the user asked for; a mismatch is penalised (a bigger perceptual error). */
  finish?: MaterialFinish;
  /** Cap the number of suggestions. Default 5. */
  limit?: number;
}

const FINISH_PENALTY = 2; // a matt/gloss mismatch costs ~2 ΔE (DB/40 §4: bigger than a small ΔE)
const AVAIL_RANK: Record<NonNullable<CatalogueEntry["availability"]>, number> = {
  in_stock: 0, order: 1, discontinued: 2,
};

/**
 * The N closest real materials to a colour, ranked per DB/40 §4: ΔE00 is the gate (beyond `max`
 * is not a match at all), then finish, then availability, then price — thickness coverage is a
 * hard filter. Returns [] when nothing is in range, so the caller shows the family and never binds
 * a material the user did not choose silently (DB/40 §4).
 */
export function closestMaterials(
  target: ColorLab, catalogue: CatalogueEntry[], opts: AdvisorOptions = {},
): MaterialMatch[] {
  const maxDe = opts.maxDeltaE00 ?? 6;
  const limit = opts.limit ?? 5;
  const matches: MaterialMatch[] = [];
  for (const entry of catalogue) {
    if (opts.thickness_mm10 !== undefined && !entry.thickness_mm10.includes(opts.thickness_mm10)) continue;
    const deltaE00 = ciede2000(target, entry.color);
    if (deltaE00 > maxDe) continue;
    matches.push({ entry, deltaE00 });
  }
  const finishPen = (e: CatalogueEntry): number =>
    opts.finish && e.finish && e.finish !== opts.finish ? FINISH_PENALTY : 0;
  matches.sort((x, y) => {
    const ex = x.deltaE00 + finishPen(x.entry);
    const ey = y.deltaE00 + finishPen(y.entry);
    if (ex !== ey) return ex - ey;
    const ax = AVAIL_RANK[x.entry.availability ?? "in_stock"] ?? 0;
    const ay = AVAIL_RANK[y.entry.availability ?? "in_stock"] ?? 0;
    if (ax !== ay) return ax - ay;
    return x.entry.price - y.entry.price;
  });
  return matches.slice(0, limit);
}
