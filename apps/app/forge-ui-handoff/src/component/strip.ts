import type { DesignNode, ComponentGateFailure } from "../contract/design";

const CONSTRUCTION_WORDS = [
  "thick", "kromka", "edgeband", "edge-band", "groove", "paz", "стяжка",
  "styazhka", "dowel", "hinge", "drill", "teshik", "rabbet", "chamfer", "styazka",
];
const DIMENSION = /\d+\s?mm\b/i;

function readsAsConstruction(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return DIMENSION.test(t) || CONSTRUCTION_WORDS.some((w) => t.includes(w));
}

export function stripConstruction(node: DesignNode): DesignNode {
  const overrides = node.component?.overrides;
  const cleanedOverrides = overrides ?
  { ...overrides, purpose: readsAsConstruction(overrides.purpose) ? undefined : overrides.purpose } :
  undefined;
  return {
    ...node,
    purpose: readsAsConstruction(node.purpose) ? undefined : node.purpose,
    component: node.component ? { ...node.component, overrides: cleanedOverrides } : undefined,
    children: node.children?.map(stripConstruction),
  };
}

export function detectConstruction(node: DesignNode, path: string = node.kind): ComponentGateFailure[] {
  const out: ComponentGateFailure[] = [];
  if (readsAsConstruction(node.purpose)) {
    out.push({ code: "CARRIES_CONSTRUCTION", detail: `${path}: purpose "${node.purpose}" reads as construction` });
  }
  if (readsAsConstruction(node.component?.overrides?.purpose)) {
    out.push({ code: "CARRIES_CONSTRUCTION", detail: `${path}: component override purpose reads as construction` });
  }
  node.children?.forEach((child, i) => {
    out.push(...detectConstruction(child, `${path}/${child.kind}[${i}]`));
  });
  return out;
}
