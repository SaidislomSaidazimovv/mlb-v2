import { describe, it, expect } from "vitest";
import { computeFit } from "./fit";
import type { Envelope, PanelGeom } from "./classify";

const env: Envelope = { w: 2000, h: 2000, d: 500 };
const box: PanelGeom[] = [
  { x: 0, y: 0, z: 0, width: 160, height: 2000, depth: 500, orientation: { xAxis: "height", yAxis: "depth" } },
  { x: 1840, y: 0, z: 0, width: 160, height: 2000, depth: 500, orientation: { xAxis: "height", yAxis: "depth" } }
];

describe("computeFit (conservative fixed model)", () => {
  it("maxDim = authoring envelope (growth is not validated without a span rule)", () => {
    const fit = computeFit(box, env, "p1");
    expect(fit.maxW_mm10).toBe(2000);
    expect(fit.maxH_mm10).toBe(2000);
    expect(fit.maxD_mm10).toBe(500);
  });

  it("shrinks width down to where the opposite-edge side panels collide", () => {
    const fit = computeFit(box, env, "p1");
    expect(fit.minW_mm10).toBe(320);
  });

  it("stays rigid on an axis fully spanned by every panel", () => {
    const fit = computeFit(box, env, "p1");
    expect(fit.minH_mm10).toBe(2000);
    expect(fit.minD_mm10).toBe(500);
  });

  it("records the validated profile and distinct panel thicknesses", () => {
    const fit = computeFit(box, env, "qorasu_eman_2026_07");
    expect(fit.validatedProfileId).toBe("qorasu_eman_2026_07");
    expect(fit.validatedThicknesses_mm10).toEqual([160]);
  });
});
