import { describe, it, expect } from "vitest";
import {
  faceAxes, holeModifier, chamferModifier, notchModifier, roundModifier, viyemkaModifier, laminateModifier, panelModifiers,
} from "./modifiers";

const frontFace = faceAxes({ xAxis: "width", yAxis: "height" }, { width: 5000, height: 3500, depth: 180 });
const sideFace = faceAxes({ xAxis: "height", yAxis: "depth" }, { width: 160, height: 7000, depth: 5000 });

describe("faceAxes", () => {
  it("front panel → fa=width, fb=height (thick=depth)", () => {
    expect(frontFace).toEqual({ fa: "width", fb: "height" });
  });
  it("side panel → fa=height, fb=depth (thick=width)", () => {
    expect(sideFace).toEqual({ fa: "height", fb: "depth" });
  });
});

describe("holeModifier → hole, 2 anchors (x from fa-min, y from fb-min)", () => {
  it("maps cx/cy to fixed anchors on the face min edges", () => {
    const m = holeModifier({ w: 800, h: 600, radius: 50, cx: 1000, cy: 700 }, frontFace);
    expect(m.type).toBe("hole");
    expect(m.anchors).toEqual([
      { edge: "left", distance: { rule: "fixed", mm10: 1000 } },
      { edge: "bottom", distance: { rule: "fixed", mm10: 700 } },
    ]);
    expect(m.params).toEqual({ w: 800, h: 600, radius: 50 });
  });
});

describe("chamferModifier → bevel, whole-edge", () => {
  it("e0 → fb-min edge (bottom on a front face)", () => {
    const m = chamferModifier({ edgeId: "e0", width: 200, depth: 80 }, frontFace);
    expect(m.type).toBe("bevel");
    expect(m.anchors).toEqual([{ edge: "bottom", distance: { rule: "ratio", value: 0.5 } }]);
    expect(m.params).toEqual({ width: 200, depth: 80 });
  });
  it("e2 → fa-min edge (left on a front face)", () => {
    expect(chamferModifier({ edgeId: "e2", width: 100, depth: 40 }, frontFace).anchors[0].edge).toBe("left");
  });
});

describe("notchModifier → notch, edge + position", () => {
  it("e0 → bottom edge + position from fa-min (left)", () => {
    const m = notchModifier({ edgeId: "e0", width: 220, depth: 50, radius: 30, pos: 2500 }, frontFace);
    expect(m.type).toBe("notch");
    expect(m.anchors).toEqual([
      { edge: "bottom", distance: { rule: "ratio", value: 0.5 } },
      { edge: "left", distance: { rule: "fixed", mm10: 2500 } },
    ]);
    expect(m.params).toEqual({ width: 220, depth: 50, radius: 30 });
  });
});

describe("roundModifier → round_corner, 2 edges", () => {
  it("c00 → fa-min + fb-min (left + bottom)", () => {
    expect(roundModifier({ cornerId: "c00", radius: 80 }, frontFace).anchors.map((a) => a.edge)).toEqual(["left", "bottom"]);
  });
  it("c10 → fa-max + fb-min (right + bottom)", () => {
    expect(roundModifier({ cornerId: "c10", radius: 80 }, frontFace).anchors.map((a) => a.edge)).toEqual(["right", "bottom"]);
  });
  it("c11 → fa-max + fb-max (right + top)", () => {
    expect(roundModifier({ cornerId: "c11", radius: 80 }, frontFace).anchors.map((a) => a.edge)).toEqual(["right", "top"]);
  });
});

describe("side-face mapping uses depth edges (front/back)", () => {
  it("hole on a side panel anchors y to back (fb=depth min)", () => {
    const m = holeModifier({ w: 100, h: 100, radius: 0, cx: 500, cy: 900 }, sideFace);
    expect(m.anchors).toEqual([
      { edge: "bottom", distance: { rule: "fixed", mm10: 500 } },
      { edge: "back", distance: { rule: "fixed", mm10: 900 } },
    ]);
  });
});

describe("viyemkaModifier → DecorativeViyemka (dado), 1 envelope-relative anchor (35 §10.7)", () => {
  it("e0 → single anchor (edge + fixed distance), params width/depth/run", () => {
    const m = viyemkaModifier({ edgeId: "e0", pos: 1500, width: 40, depth: 90, run: 3000, rule: "fixed" }, frontFace);
    expect(m.type).toBe("viyemka");
    expect(m.anchors).toEqual([{ edge: "bottom", distance: { rule: "fixed", mm10: 1500 } }]);
    expect(m.params).toEqual({ width: 40, depth: 90, run: 3000 });
  });
  it("ratio rule converts pos to a fraction of the envelope dimension (bottom → height axis)", () => {
    const m = viyemkaModifier({ edgeId: "e0", pos: 1500, width: 40, depth: 90, run: 3000, rule: "ratio" }, frontFace, { w_mm10: 5000, h_mm10: 3000, d_mm10: 180 });
    expect(m.anchors).toEqual([{ edge: "bottom", distance: { rule: "ratio", value: 0.5 } }]);
  });
  it("locked rule keeps the mm10 pin", () => {
    const m = viyemkaModifier({ edgeId: "e0", pos: 1500, width: 40, depth: 90, run: 3000, rule: "locked" }, frontFace);
    expect(m.anchors[0].distance).toEqual({ rule: "locked", mm10: 1500 });
  });
});

describe("laminateModifier → laminate, whole-face (anchors empty, layers in params)", () => {
  it("carries no anchor (non-positional) and records the layer count", () => {
    const m = laminateModifier(2);
    expect(m.type).toBe("laminate");
    expect(m.anchors).toEqual([]);
    expect(m.params).toEqual({ layers: 2 });
  });
  it("supports 3 layers", () => {
    expect(laminateModifier(3).params).toEqual({ layers: 3 });
  });
});

describe("panelModifiers aggregates all cut kinds with the closed enum mapping", () => {
  it("maps window→hole, round→round_corner, chamfer→bevel, notch→notch", () => {
    const mods = panelModifiers({
      windows: [{ w: 1, h: 1, radius: 0, cx: 1, cy: 1 }],
      rounds: [{ cornerId: "c00", radius: 10 }],
      chamfers: [{ edgeId: "e0", width: 10, depth: 5 }],
      notches: [{ edgeId: "e1", width: 10, depth: 5, radius: 0, pos: 100 }],
    }, frontFace);
    expect(mods.map((m) => m.type)).toEqual(["hole", "round_corner", "bevel", "notch"]);
  });

  it("appends a viyemka modifier from viyemkas[]", () => {
    const mods = panelModifiers({ viyemkas: [{ edgeId: "e2", pos: 800, width: 40, depth: 90, run: 2000, rule: "fixed" }] }, frontFace);
    expect(mods.map((m) => m.type)).toEqual(["viyemka"]);
  });

  it("appends a single laminate modifier when laminate is set", () => {
    const mods = panelModifiers({ laminate: 2 }, frontFace);
    expect(mods).toEqual([{ type: "laminate", anchors: [], params: { layers: 2 } }]);
  });

  it("emits no laminate modifier when laminate is unset", () => {
    expect(panelModifiers({ windows: [{ w: 1, h: 1, radius: 0, cx: 1, cy: 1 }] }, frontFace).some((m) => m.type === "laminate")).toBe(false);
  });
});
