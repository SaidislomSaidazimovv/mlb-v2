import { describe, it, expect } from "vitest";
import { checkProfileSwap } from "./profileSwap";
import { type PanelGeom } from "./classify";
import { type ConvertMeta } from "./convert";

const panels: PanelGeom[] = [
  { x: 0, y: 0, z: 0, width: 160, height: 7000, depth: 5000, orientation: { xAxis: "height", yAxis: "depth" } },
  { x: 0, y: 3000, z: 300, width: 5000, height: 160, depth: 5000, orientation: { xAxis: "width", yAxis: "depth" } },
  { x: 0, y: 0, z: 5420, width: 5000, height: 3500, depth: 180, orientation: { xAxis: "width", yAxis: "height" } },
];
const meta: ConvertMeta = { componentId: "c", name: "n", author: "a", rootKind: "group", profileId: "qorasu_eman_2026_07" };

describe("checkProfileSwap (DB_37 §3.5 — profile-independent DesignNode)", () => {
  it("passes: root is identical across two profiles", () => {
    expect(checkProfileSwap(panels, meta)).toEqual([]);
  });

  it("passes with cuts too (modifiers are profile-independent)", () => {
    const cuts = [undefined, undefined, { viyemkas: [{ edgeId: "e0", pos: 1500, width: 40, depth: 90, run: 3000, rule: "fixed" as const }] }];
    expect(checkProfileSwap(panels, meta, cuts)).toEqual([]);
  });
});
