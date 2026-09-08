import type { ComponentLibraryItem, ComponentGateFailure, DesignNode } from "../contract/design";
import { MAX_COMPONENT_NEST_DEPTH } from "../contract/design";
import { detectConstruction } from "./strip";

export interface GateResult {ok: boolean;failures: ComponentGateFailure[];}

function checkSchema(item: ComponentLibraryItem): ComponentGateFailure[] {
  return item.schemaVersion === 1 ? [] : [{ code: "UNKNOWN_SCHEMA_VERSION", detail: `schemaVersion=${item.schemaVersion}` }];
}

function checkSlots(item: ComponentLibraryItem): ComponentGateFailure[] {
  const present = new Set<string>();
  const collect = (n: DesignNode) => {if (n.roleSlot) present.add(n.roleSlot);n.children?.forEach(collect);};
  collect(item.root);
  return item.requiredSlots.
  filter((s) => !present.has(s)).
  map((s) => ({ code: "UNBOUND_REQUIRED_SLOT", detail: `required slot "${s}" not present in tree` }));
}

function checkGeometry(root: DesignNode): ComponentGateFailure[] {
  const out: ComponentGateFailure[] = [];
  const walk = (n: DesignNode, path: string) => {
    const s = n.size;
    const bad = s && [s.w_mm10, s.h_mm10, s.d_mm10].some((v) => v !== undefined && v <= 0);
    if (bad) out.push({ code: "DEGENERATE_GEOMETRY", detail: `${path}: non-positive size` });
    n.children?.forEach((c, i) => walk(c, `${path}/${c.kind}[${i}]`));
  };
  walk(root, root.kind);
  return out;
}

function checkNestAndCycle(root: DesignNode): ComponentGateFailure[] {
  const out: ComponentGateFailure[] = [];
  const walk = (n: DesignNode, depth: number, ancestors: Set<string>, path: string) => {
    let nextDepth = depth;
    let nextAncestors = ancestors;
    if (n.component) {
      const key = `${n.component.componentId}:${n.component.pinnedVersion}`;
      if (ancestors.has(key)) {out.push({ code: "CYCLE_DETECTED", detail: `${path}: repeats ${key}` });return;}
      nextAncestors = new Set(ancestors).add(key);
      nextDepth = depth + 1;
      if (nextDepth > MAX_COMPONENT_NEST_DEPTH) {
        out.push({ code: "NEST_DEPTH_EXCEEDED", detail: `${path}: depth ${nextDepth} > ${MAX_COMPONENT_NEST_DEPTH}` });
      }
    }
    n.children?.forEach((c, i) => walk(c, nextDepth, nextAncestors, `${path}/${c.kind}[${i}]`));
  };
  walk(root, 0, new Set(), root.kind);
  return out;
}

export function clientGate(item: ComponentLibraryItem): GateResult {
  const failures = [
  ...checkSchema(item),
  ...checkSlots(item),
  ...detectConstruction(item.root),
  ...checkGeometry(item.root),
  ...checkNestAndCycle(item.root)];

  return { ok: failures.length === 0, failures };
}
