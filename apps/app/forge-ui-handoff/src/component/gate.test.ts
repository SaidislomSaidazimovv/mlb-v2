import { describe, it, expect } from "vitest";
import { clientGate } from "./gate";
import type { ComponentLibraryItem, DesignNode } from "../contract/design";

const base = (root: DesignNode & { kind: Exclude<DesignNode["kind"], "cabinet"> }, over: Partial<ComponentLibraryItem> = {}): ComponentLibraryItem => ({
  componentId: "c", version: 1, schemaVersion: 1, name: "n", author: "a",
  requiredSlots: [], root, gate: { ok: false, failures: [] }, ...over,
});

const shelf = (over: Partial<Omit<DesignNode, "kind">> = {}): DesignNode & { kind: "shelf" } => ({ nodeId: "n", kind: "shelf", size: { w_mm10: 100, h_mm10: 100, d_mm10: 100 }, ...over });

describe("clientGate", () => {
  it("passes a clean item", () => {
    expect(clientGate(base(shelf())).ok).toBe(true);
  });

  it("UNKNOWN_SCHEMA_VERSION when schemaVersion is not 1", () => {
    const g = clientGate(base(shelf(), { schemaVersion: 2 as unknown as 1 }));
    expect(g.failures.map((f) => f.code)).toContain("UNKNOWN_SCHEMA_VERSION");
  });

  it("UNBOUND_REQUIRED_SLOT when a required slot is absent from the tree", () => {
    const g = clientGate(base(shelf(), { requiredSlots: ["fasad"] }));
    expect(g.failures.map((f) => f.code)).toContain("UNBOUND_REQUIRED_SLOT");
  });

  it("CARRIES_CONSTRUCTION when a purpose reads as construction", () => {
    const g = clientGate(base(shelf({ purpose: "drill 5 holes" })));
    expect(g.failures.map((f) => f.code)).toContain("CARRIES_CONSTRUCTION");
  });

  it("DEGENERATE_GEOMETRY on non-positive size", () => {
    const g = clientGate(base(shelf({ size: { w_mm10: 0, h_mm10: 100, d_mm10: 100 } })));
    expect(g.failures.map((f) => f.code)).toContain("DEGENERATE_GEOMETRY");
  });

  it("NEST_DEPTH_EXCEEDED beyond MAX_COMPONENT_NEST_DEPTH", () => {
    const bound = (id: string, child?: DesignNode): DesignNode => ({
      nodeId: id, kind: "filler", size: { w_mm10: 10, h_mm10: 10, d_mm10: 10 },
      component: { componentId: id, pinnedVersion: 1 }, children: child ? [child] : undefined,
    });
    const deep = bound("a", bound("b", bound("c", bound("d"))));
    const g = clientGate(base(deep as DesignNode & { kind: "filler" }));
    expect(g.failures.map((f) => f.code)).toContain("NEST_DEPTH_EXCEEDED");
  });

  it("CYCLE_DETECTED when a component ref repeats on the path", () => {
    const inner: DesignNode = { nodeId: "y", kind: "filler", size: { w_mm10: 10, h_mm10: 10, d_mm10: 10 }, component: { componentId: "X", pinnedVersion: 1 } };
    const outer: DesignNode & { kind: "filler" } = { nodeId: "x", kind: "filler", size: { w_mm10: 10, h_mm10: 10, d_mm10: 10 }, component: { componentId: "X", pinnedVersion: 1 }, children: [inner] };
    const g = clientGate(base(outer));
    expect(g.failures.map((f) => f.code)).toContain("CYCLE_DETECTED");
  });
});
