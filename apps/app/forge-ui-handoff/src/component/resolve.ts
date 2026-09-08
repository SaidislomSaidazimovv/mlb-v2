import type { Anchor, AnchorEdge, AnchorRule, ComponentLibraryItem, DesignNode, mm10 } from "../contract/design";

const EDGE_AXIS: Record<AnchorEdge, { axis: "w" | "h" | "d"; atMax: boolean }> = {
  left: { axis: "w", atMax: false },
  right: { axis: "w", atMax: true },
  bottom: { axis: "h", atMax: false },
  top: { axis: "h", atMax: true },
  back: { axis: "d", atMax: false },
  front: { axis: "d", atMax: true }
};

export type ResolveState = "valid" | "degraded" | "suspended" | "invalid";

const RANK: Record<ResolveState, number> = { valid: 0, degraded: 1, suspended: 2, invalid: 3 };

export interface Resolution {
  value: mm10;
  raw: mm10;
  state: ResolveState;
  clamped: boolean;
}

export interface ResolvedAnchor {
  nodeId: string;
  modifierType: string;
  edge: AnchorEdge;
  resolved_mm10: mm10;
}

export function anchorAxis(edge: AnchorEdge): "w" | "h" | "d" {
  return EDGE_AXIS[edge].axis;
}

export function ruleDistance(rule: AnchorRule, dim: mm10): mm10 {
  return rule.rule === "ratio" ? Math.round(rule.value * dim) : rule.mm10;
}

export function resolveAnchor(anchor: Anchor, dim: mm10): mm10 {
  const fromEdge = ruleDistance(anchor.distance, dim);
  return EDGE_AXIS[anchor.edge].atMax ? dim - fromEdge : fromEdge;
}

export function worseState(a: ResolveState, b: ResolveState): ResolveState {
  return RANK[a] >= RANK[b] ? a : b;
}

export function resolveInEnvelope(anchor: Anchor, targetDim: mm10, authoringDim: mm10): Resolution {
  const raw = resolveAnchor(anchor, targetDim);
  if (targetDim <= 0) return { value: 0, raw, state: "invalid", clamped: false };
  if (anchor.distance.rule === "locked") {
    const pinned = resolveAnchor(anchor, authoringDim);
    if (pinned < 0 || pinned > targetDim) return { value: pinned, raw, state: "suspended", clamped: false };
    return { value: pinned, raw, state: "valid", clamped: false };
  }
  if (raw < 0) return { value: 0, raw, state: "degraded", clamped: true };
  if (raw > targetDim) return { value: targetDim, raw, state: "degraded", clamped: true };
  return { value: raw, raw, state: "valid", clamped: false };
}

export function deriveResolved(item: ComponentLibraryItem): ResolvedAnchor[] {
  const out: ResolvedAnchor[] = [];
  const walk = (n: DesignNode) => {
    const dims = { w: n.size?.w_mm10 ?? 0, h: n.size?.h_mm10 ?? 0, d: n.size?.d_mm10 ?? 0 };
    for (const m of n.modifiers ?? []) {
      for (const a of m.anchors) {
        out.push({ nodeId: n.nodeId, modifierType: m.type, edge: a.edge, resolved_mm10: resolveAnchor(a, dims[anchorAxis(a.edge)]) });
      }
    }
    n.children?.forEach(walk);
  };
  walk(item.root);
  return out;
}
