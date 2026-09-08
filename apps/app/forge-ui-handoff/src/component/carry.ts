import type { DesignNode, NodeKind, mm10 } from "../contract/design";

export interface CarrySpec {
  kind?: Exclude<NodeKind, "cabinet">;
  w: mm10;
  h: mm10;
  d: mm10;
  x: mm10;
  y: mm10;
  z: mm10;
}

function smallestAxis(w: mm10, h: mm10, d: mm10): "x" | "y" | "z" {
  return w <= h && w <= d ? "x" : h <= d ? "y" : "z";
}

export function carryChild(spec: CarrySpec, parentId: string, i: number): DesignNode {
  return {
    nodeId: `${parentId}:carry:${i}`,
    kind: spec.kind ?? "filler",
    roleSlot: "korpus",
    size: { w_mm10: spec.w, h_mm10: spec.h, d_mm10: spec.d },
    pos: { x_mm10: spec.x + spec.w / 2, y_mm10: spec.y + spec.h / 2, z_mm10: spec.z + spec.d / 2 },
    thicknessAxis: smallestAxis(spec.w, spec.h, spec.d)
  };
}

export function carryChildren(specs: CarrySpec[], parentId: string): DesignNode[] {
  return specs.map((s, i) => carryChild(s, parentId, i));
}
