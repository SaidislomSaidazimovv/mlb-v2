import type { FitConstraint, mm10 } from "../contract/design";
import { panelThickness, type Envelope, type PanelGeom } from "./classify";

type AxisKey = "w" | "h" | "d";

interface Span1D {
  c0: number;
  c1: number;
  anchorMax: boolean;
  gap: number;
  size: number;
}

type PanelSpans = Record<AxisKey, Span1D>;

const OVERLAP_EPS = 1;

function span1D(c0: number, size: number, dim: number): Span1D {
  const c1 = c0 + size;
  const gapMin = c0;
  const gapMax = dim - c1;
  const anchorMax = gapMax < gapMin;
  return { c0, c1, anchorMax, gap: anchorMax ? gapMax : gapMin, size };
}

function overlaps1D(a: Span1D, b: Span1D): boolean {
  return a.c1 - b.c0 > OVERLAP_EPS && b.c1 - a.c0 > OVERLAP_EPS;
}

function panelSpans(panels: PanelGeom[], env: Envelope): PanelSpans[] {
  return panels.map((p) => ({
    w: span1D(p.x, p.width, env.w),
    h: span1D(p.y, p.height, env.h),
    d: span1D(p.z, p.depth, env.d)
  }));
}

function axisFloor(spans: PanelSpans[], k: AxisKey, o1: AxisKey, o2: AxisKey): number {
  let floor = 0;
  for (const s of spans) floor = Math.max(floor, s[k].gap + s[k].size);
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const si = spans[i];
      const sj = spans[j];
      if (si[k].anchorMax === sj[k].anchorMax) continue;
      if (!overlaps1D(si[o1], sj[o1]) || !overlaps1D(si[o2], sj[o2])) continue;
      floor = Math.max(floor, si[k].gap + si[k].size + sj[k].gap + sj[k].size);
    }
  }
  return floor;
}

function distinctThicknesses(panels: PanelGeom[]): mm10[] {
  const set = new Set<number>();
  for (const p of panels) set.add(panelThickness(p));
  return [...set].sort((a, b) => a - b);
}

export function computeFit(panels: PanelGeom[], env: Envelope, profileId: string): FitConstraint {
  const spans = panelSpans(panels, env);
  const wFloor = axisFloor(spans, "w", "h", "d");
  const hFloor = axisFloor(spans, "h", "w", "d");
  const dFloor = axisFloor(spans, "d", "w", "h");
  return {
    minW_mm10: Math.min(wFloor, env.w),
    maxW_mm10: env.w,
    minH_mm10: Math.min(hFloor, env.h),
    maxH_mm10: env.h,
    minD_mm10: Math.min(dFloor, env.d),
    maxD_mm10: env.d,
    validatedProfileId: profileId,
    validatedThicknesses_mm10: distinctThicknesses(panels)
  };
}
