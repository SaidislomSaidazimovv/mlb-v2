import { describe, it, expect } from "vitest";
import { classifyPanel, classifyPanels, type PanelGeom, type Envelope } from "./classify";

const ENV: Envelope = { w: 6000, h: 7200, d: 5600 };

const panel = (over: Partial<PanelGeom>): PanelGeom => ({
  x: 0, y: 0, z: 0, width: 100, height: 100, depth: 100, ...over,
});

describe("classifyPanel (geometric, v1)", () => {
  it("horizontal panel (thickness on Y) → shelf / korpus", () => {
    const p = panel({ width: 5000, height: 160, depth: 5000, y: 3000, z: 300, orientation: { xAxis: "width", yAxis: "depth" } });
    expect(classifyPanel(p, ENV)).toEqual({ kind: "shelf", roleSlot: "korpus" });
  });

  it("side panel (thickness on X) → divider / korpus", () => {
    const p = panel({ width: 160, height: 7000, depth: 5000, orientation: { xAxis: "height", yAxis: "depth" } });
    expect(classifyPanel(p, ENV)).toEqual({ kind: "divider", roleSlot: "korpus" });
  });

  it("front-facing panel at the front → door / fasad", () => {
    const p = panel({ width: 5000, height: 3500, depth: 180, z: ENV.d - 180, orientation: { xAxis: "width", yAxis: "height" } });
    expect(classifyPanel(p, ENV)).toEqual({ kind: "door", roleSlot: "fasad" });
  });

  it("front-facing panel at the back → filler / orqa", () => {
    const p = panel({ width: 5000, height: 3500, depth: 40, z: 0, orientation: { xAxis: "width", yAxis: "height" } });
    expect(classifyPanel(p, ENV)).toEqual({ kind: "filler", roleSlot: "orqa" });
  });

  it("front-facing panel inside → divider / korpus", () => {
    const p = panel({ width: 5000, height: 3500, depth: 160, z: 2500, orientation: { xAxis: "width", yAxis: "height" } });
    expect(classifyPanel(p, ENV)).toEqual({ kind: "divider", roleSlot: "korpus" });
  });

  it("thin bar (small in two axes) → rod / korpus", () => {
    const p = panel({ width: 300, height: 300, depth: 5000, orientation: { xAxis: "depth", yAxis: "width" } });
    expect(classifyPanel(p, ENV)).toEqual({ kind: "rod", roleSlot: "korpus" });
  });

  it("a real board (thin in one axis only) is never a rod", () => {
    const p = panel({ width: 5000, height: 160, depth: 5000, y: 3000, orientation: { xAxis: "width", yAxis: "depth" } });
    expect(classifyPanel(p, ENV).kind).toBe("shelf");
  });

  it("falls back to smallest extent when orientation is absent", () => {
    const p = panel({ width: 5000, height: 160, depth: 5000, y: 3000 });
    expect(classifyPanel(p, ENV)).toEqual({ kind: "shelf", roleSlot: "korpus" });
  });
});

describe("classifyPanels", () => {
  it("returns one classification per input panel, in input order", () => {
    const panels: PanelGeom[] = [
      panel({ width: 160, height: 7000, depth: 5000, orientation: { xAxis: "height", yAxis: "depth" } }),
      panel({ width: 5000, height: 160, depth: 5000, y: 3000, orientation: { xAxis: "width", yAxis: "depth" } }),
    ];
    const out = classifyPanels(panels, ENV);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ kind: "divider", roleSlot: "korpus" });
    expect(out[1]).toEqual({ kind: "shelf", roleSlot: "korpus" });
  });
});
