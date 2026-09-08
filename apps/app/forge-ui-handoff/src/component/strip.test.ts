import { describe, it, expect } from "vitest";
import { stripConstruction, detectConstruction } from "./strip";
import type { DesignNode } from "../contract/design";

const node = (over: Partial<DesignNode> = {}): DesignNode => ({ nodeId: "n", kind: "shelf", ...over });

describe("stripConstruction", () => {
  it("clears a construction-reading purpose", () => {
    const out = stripConstruction(node({ purpose: "16mm shelf, kromka on front" }));
    expect(out.purpose).toBeUndefined();
  });

  it("keeps a pure design purpose", () => {
    const out = stripConstruction(node({ purpose: "spice rack" }));
    expect(out.purpose).toBe("spice rack");
  });

  it("cleans override purpose and recurses into children", () => {
    const tree = node({
      purpose: "body",
      component: { componentId: "c", pinnedVersion: 1, overrides: { purpose: "add 18mm dowel" } },
      children: [node({ nodeId: "c1", kind: "divider", purpose: "groove here" })],
    });
    const out = stripConstruction(tree);
    expect(out.component?.overrides?.purpose).toBeUndefined();
    expect(out.children?.[0].purpose).toBeUndefined();
    expect(out.purpose).toBe("body");
  });
});

describe("detectConstruction", () => {
  it("flags surviving construction as CARRIES_CONSTRUCTION", () => {
    const fails = detectConstruction(node({ purpose: "drill 5 holes" }));
    expect(fails).toHaveLength(1);
    expect(fails[0].code).toBe("CARRIES_CONSTRUCTION");
  });

  it("flags construction hidden in a child override", () => {
    const tree = node({
      children: [node({ nodeId: "c1", kind: "door", component: { componentId: "x", pinnedVersion: 2, overrides: { purpose: "hinge cutout" } } })],
    });
    const fails = detectConstruction(tree);
    expect(fails).toHaveLength(1);
    expect(fails[0].code).toBe("CARRIES_CONSTRUCTION");
  });

  it("passes a clean tree", () => {
    const fails = detectConstruction(node({ purpose: "shelf", children: [node({ nodeId: "c1", kind: "door", purpose: "front door" })] }));
    expect(fails).toHaveLength(0);
  });
});
