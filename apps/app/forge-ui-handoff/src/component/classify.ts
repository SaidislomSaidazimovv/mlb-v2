import type { Panel } from "../contract/types";
import type { NodeKind, RoleSlot } from "../contract/design";

export type PanelGeom = Pick<Panel, "x" | "y" | "z" | "width" | "height" | "depth" | "orientation">;
export interface Envelope {w: number;h: number;d: number;}
export interface Classified {kind: NodeKind;roleSlot: RoleSlot;}

const EDGE = 400;
const ROD_MAX = 500;

function isRod(p: PanelGeom): boolean {
  return [p.width, p.height, p.depth].filter((d) => d <= ROD_MAX).length >= 2;
}

function thicknessAxis(p: PanelGeom): "x" | "y" | "z" {
  const face = [p.orientation?.xAxis, p.orientation?.yAxis].filter(Boolean) as string[];
  if (face.length === 2) {
    const dim = (["width", "height", "depth"] as const).find((d) => !face.includes(d));
    if (dim) return dim === "width" ? "x" : dim === "height" ? "y" : "z";
  }
  const dims = [["x", p.width], ["y", p.height], ["z", p.depth]] as const;
  return dims.reduce((a, b) => b[1] < a[1] ? b : a)[0];
}

export function panelThickness(p: PanelGeom): number {
  const axis = thicknessAxis(p);
  return axis === "x" ? p.width : axis === "y" ? p.height : p.depth;
}

export function panelThicknessAxis(p: PanelGeom): "x" | "y" | "z" {
  return thicknessAxis(p);
}

export function classifyPanel(p: PanelGeom, env: Envelope): Classified {
  if (isRod(p)) return { kind: "rod", roleSlot: "korpus" };
  const axis = thicknessAxis(p);
  if (axis === "y") return { kind: "shelf", roleSlot: "korpus" };
  if (axis === "x") return { kind: "divider", roleSlot: "korpus" };
  const front = p.z + p.depth >= env.d - EDGE;
  const back = p.z <= EDGE;
  if (front) return { kind: "door", roleSlot: "fasad" };
  if (back) return { kind: "filler", roleSlot: "orqa" };
  return { kind: "divider", roleSlot: "korpus" };
}

export function classifyPanels(panels: PanelGeom[], env: Envelope): Classified[] {
  const order = panels.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
  const result: Classified[] = new Array(panels.length);
  for (const { p, i } of order) result[i] = classifyPanel(p, env);
  return result;
}
