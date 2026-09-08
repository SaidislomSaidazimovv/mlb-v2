import { describe, it, expect } from "vitest";
import { carryChild, carryChildren } from "./carry";

describe("carryChild (decor/filler child attached to a panel — 35:75)", () => {
  it("defaults to filler kind, computes centre pos and thicknessAxis", () => {
    const c = carryChild({ w: 400, h: 200, d: 60, x: 100, y: 50, z: 0 }, "comp:door:2", 0);
    expect(c).toEqual({
      nodeId: "comp:door:2:carry:0",
      kind: "filler",
      roleSlot: "korpus",
      size: { w_mm10: 400, h_mm10: 200, d_mm10: 60 },
      pos: { x_mm10: 300, y_mm10: 150, z_mm10: 30 },
      thicknessAxis: "z"
    });
  });

  it("honours an explicit kind (e.g. band)", () => {
    expect(carryChild({ kind: "band", w: 100, h: 100, d: 100, x: 0, y: 0, z: 0 }, "p", 1).kind).toBe("band");
  });

  it("carryChildren indexes nodeIds", () => {
    const kids = carryChildren([{ w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 }, { w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 }], "p");
    expect(kids.map((k) => k.nodeId)).toEqual(["p:carry:0", "p:carry:1"]);
  });
});
