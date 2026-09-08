import type { ComponentLibraryItem, DesignNode, NodeKind, RoleSlot } from "../contract/design";
import { classifyPanels, panelThicknessAxis, type PanelGeom, type Envelope } from "./classify";
import { stripConstruction } from "./strip";
import { clientGate } from "./gate";
import { panelModifiers, faceAxes, type PanelCuts } from "./modifiers";
import { carryChildren, type CarrySpec } from "./carry";
import { computeFit } from "./fit";

export interface ConvertMeta {
  componentId: string;
  name: string;
  author: string;
  rootKind: Exclude<NodeKind, "cabinet">;
  tags?: string[];
  rootPurpose?: string;
  prevVersion?: number;
  createdAt?: string;
  profileId: string;
}

function envelopeOf(panels: PanelGeom[]): Envelope {
  let w = 0,h = 0,d = 0;
  for (const p of panels) {
    w = Math.max(w, p.x + p.width);
    h = Math.max(h, p.y + p.height);
    d = Math.max(d, p.z + p.depth);
  }
  return { w, h, d };
}

function uniqueRoleSlots(children: DesignNode[]): RoleSlot[] {
  const out: RoleSlot[] = [];
  for (const c of children) if (c.roleSlot && !out.includes(c.roleSlot)) out.push(c.roleSlot);
  return out;
}

export function convertToComponent(panels: PanelGeom[], meta: ConvertMeta, cuts?: (PanelCuts | undefined)[], carries?: (CarrySpec[] | undefined)[]): ComponentLibraryItem {
  const env = envelopeOf(panels);
  const classes = classifyPanels(panels, env);
  const children: DesignNode[] = panels.map((p, i) => {
    const child: DesignNode = {
      nodeId: `${meta.componentId}:${classes[i].kind}:${i}`,
      kind: classes[i].kind,
      roleSlot: classes[i].roleSlot,
      size: { w_mm10: p.width, h_mm10: p.height, d_mm10: p.depth },
      pos: { x_mm10: p.x + p.width / 2, y_mm10: p.y + p.height / 2, z_mm10: p.z + p.depth / 2 },
      thicknessAxis: panelThicknessAxis(p)
    };
    const c = cuts?.[i];
    if (c) {
      const mods = panelModifiers(c, faceAxes(p.orientation, { width: p.width, height: p.height, depth: p.depth }), { w_mm10: p.width, h_mm10: p.height, d_mm10: p.depth });
      if (mods.length) child.modifiers = mods;
    }
    const cr = carries?.[i];
    if (cr && cr.length) child.children = carryChildren(cr, child.nodeId);
    return child;
  });

  const rawRoot: DesignNode & {kind: Exclude<NodeKind, "cabinet">;} = {
    nodeId: meta.componentId,
    kind: meta.rootKind,
    purpose: meta.rootPurpose,
    size: { w_mm10: env.w, h_mm10: env.h, d_mm10: env.d },
    children
  };
  const root = stripConstruction(rawRoot) as DesignNode & {kind: Exclude<NodeKind, "cabinet">;};

  const item: ComponentLibraryItem = {
    componentId: meta.componentId,
    version: (meta.prevVersion ?? 0) + 1,
    schemaVersion: 1,
    name: meta.name,
    author: meta.author,
    tags: meta.tags,
    requiredSlots: uniqueRoleSlots(children),
    createdAt: meta.createdAt,
    root,
    fit: computeFit(panels, env, meta.profileId),
    gate: { ok: false, failures: [] }
  };
  return { ...item, gate: clientGate(item) };
}
