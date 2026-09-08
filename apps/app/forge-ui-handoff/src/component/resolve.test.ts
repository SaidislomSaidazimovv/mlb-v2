import { describe, it, expect } from "vitest";
import { resolveAnchor, resolveInEnvelope, worseState, deriveResolved } from "./resolve";
import type { Anchor, ComponentLibraryItem } from "../contract/design";

const a = (edge: Anchor["edge"], distance: Anchor["distance"]): Anchor => ({ edge, distance });

describe("resolveAnchor (closed form)", () => {
  it("fixed measures from the named edge (min and max)", () => {
    expect(resolveAnchor(a("left", { rule: "fixed", mm10: 1000 }), 6000)).toBe(1000);
    expect(resolveAnchor(a("right", { rule: "fixed", mm10: 1000 }), 6000)).toBe(5000);
  });
  it("ratio is a fraction of the envelope dimension", () => {
    expect(resolveAnchor(a("bottom", { rule: "ratio", value: 0.5 }), 7200)).toBe(3600);
    expect(resolveAnchor(a("top", { rule: "ratio", value: 0.25 }), 4000)).toBe(3000);
  });
  it("locked carries mm10 from the edge", () => {
    expect(resolveAnchor(a("back", { rule: "locked", mm10: 500 }), 5600)).toBe(500);
  });
});

describe("resolveInEnvelope (four states, never drop)", () => {
  it("valid inside bounds", () => {
    const r = resolveInEnvelope(a("left", { rule: "fixed", mm10: 1000 }), 6000, 6000);
    expect(r).toMatchObject({ value: 1000, state: "valid", clamped: false });
  });
  it("degraded: clamps an out-of-bounds fixed anchor, never drops", () => {
    expect(resolveInEnvelope(a("left", { rule: "fixed", mm10: 8000 }), 6000, 8000)).toMatchObject({ value: 6000, state: "degraded", clamped: true });
    expect(resolveInEnvelope(a("right", { rule: "fixed", mm10: 8000 }), 6000, 8000)).toMatchObject({ value: 0, state: "degraded", clamped: true });
  });
  it("suspended: a locked anchor that no longer fits is refused, not moved", () => {
    const r = resolveInEnvelope(a("left", { rule: "locked", mm10: 7000 }), 6000, 8000);
    expect(r).toMatchObject({ value: 7000, state: "suspended", clamped: false });
  });
  it("valid: a locked anchor still inside bounds keeps its pin", () => {
    const r = resolveInEnvelope(a("left", { rule: "locked", mm10: 3000 }), 6000, 8000);
    expect(r).toMatchObject({ value: 3000, state: "valid" });
  });
  it("invalid: a non-positive envelope", () => {
    expect(resolveInEnvelope(a("left", { rule: "fixed", mm10: 100 }), 0, 6000).state).toBe("invalid");
  });
});

describe("worseState", () => {
  it("ranks invalid > suspended > degraded > valid", () => {
    expect(worseState("valid", "degraded")).toBe("degraded");
    expect(worseState("suspended", "degraded")).toBe("suspended");
    expect(worseState("invalid", "suspended")).toBe("invalid");
  });
});

describe("deriveResolved (recipe + resolved, resolved is derived)", () => {
  const item: ComponentLibraryItem = {
    componentId: "c",
    version: 1,
    schemaVersion: 1,
    name: "n",
    author: "u",
    requiredSlots: [],
    root: {
      nodeId: "c",
      kind: "group",
      size: { w_mm10: 6000, h_mm10: 7200, d_mm10: 5600 },
      children: [
        {
          nodeId: "c:door:0",
          kind: "door",
          roleSlot: "fasad",
          size: { w_mm10: 5000, h_mm10: 3500, d_mm10: 180 },
          modifiers: [
            {
              type: "hole",
              anchors: [
                { edge: "left", distance: { rule: "fixed", mm10: 600 } },
                { edge: "bottom", distance: { rule: "fixed", mm10: 400 } }
              ],
              params: {}
            }
          ]
        }
      ]
    },
    gate: { ok: true, failures: [] }
  };

  it("resolves each modifier anchor against its owning node's size", () => {
    const resolved = deriveResolved(item);
    expect(resolved).toEqual([
      { nodeId: "c:door:0", modifierType: "hole", edge: "left", resolved_mm10: 600 },
      { nodeId: "c:door:0", modifierType: "hole", edge: "bottom", resolved_mm10: 400 }
    ]);
  });
});
