import { describe, it, expect } from "vitest";
import { convertToComponent, type ConvertMeta } from "./convert";
import { type PanelGeom } from "./classify";

const panels: PanelGeom[] = [
  { x: 0, y: 0, z: 0, width: 160, height: 7000, depth: 5000, orientation: { xAxis: "height", yAxis: "depth" } },
  { x: 0, y: 3000, z: 300, width: 5000, height: 160, depth: 5000, orientation: { xAxis: "width", yAxis: "depth" } },
  { x: 0, y: 0, z: 5420, width: 5000, height: 3500, depth: 180, orientation: { xAxis: "width", yAxis: "height" } },
];

const meta: ConvertMeta = { componentId: "comp1", name: "Test unit", author: "usta", rootKind: "filler", tags: ["demo"], profileId: "test_profile" };

describe("convertToComponent", () => {
  it("produces a schemaVersion-1 item, version = prev+1, root.kind = declared", () => {
    const item = convertToComponent(panels, { ...meta, prevVersion: 4 });
    expect(item.schemaVersion).toBe(1);
    expect(item.version).toBe(5);
    expect(item.root.kind).toBe("filler");
    expect(item.name).toBe("Test unit");
    expect(item.author).toBe("usta");
  });

  it("builds one child per panel with the nodeId convention and classified kind", () => {
    const item = convertToComponent(panels, meta);
    expect(item.root.children).toHaveLength(3);
    expect(item.root.children![0]).toMatchObject({ nodeId: "comp1:divider:0", kind: "divider", roleSlot: "korpus" });
    expect(item.root.children![1]).toMatchObject({ nodeId: "comp1:shelf:1", kind: "shelf", roleSlot: "korpus" });
    expect(item.root.children![2]).toMatchObject({ nodeId: "comp1:door:2", kind: "door", roleSlot: "fasad" });
  });

  it("exports each panel's center as pos and its thicknessAxis (canonical §2.4 fields)", () => {
    const item = convertToComponent(panels, meta);
    const c0 = item.root.children![0];
    expect(c0.pos).toEqual({ x_mm10: 80, y_mm10: 3500, z_mm10: 2500 });
    expect(c0.thicknessAxis).toBe("x");
    const c2 = item.root.children![2];
    expect(c2.pos).toEqual({ x_mm10: 2500, y_mm10: 1750, z_mm10: 5510 });
    expect(c2.thicknessAxis).toBe("z");
  });

  it("derives requiredSlots from the classified children (unique)", () => {
    const item = convertToComponent(panels, meta);
    expect(item.requiredSlots).toEqual(["korpus", "fasad"]);
  });

  it("always computes fit (profileId mandatory) and runs a clean client gate", () => {
    const item = convertToComponent(panels, meta);
    expect(item.fit).toBeDefined();
    expect(item.fit!.validatedProfileId).toBe("test_profile");
    expect(item.gate.ok).toBe(true);
    expect(item.gate.failures).toHaveLength(0);
  });

  it("computes a conservative FitConstraint under the given profile", () => {
    const item = convertToComponent(panels, { ...meta, profileId: "qorasu_eman_2026_07" });
    expect(item.fit).toBeDefined();
    expect(item.fit!.validatedProfileId).toBe("qorasu_eman_2026_07");
    expect(item.fit!.maxW_mm10).toBe(item.root.size!.w_mm10);
    expect(item.fit!.minW_mm10).toBeLessThanOrEqual(item.fit!.maxW_mm10);
    expect(item.fit!.validatedThicknesses_mm10.length).toBeGreaterThan(0);
    expect(item.gate.ok).toBe(true);
  });

  it("strips a construction-reading root purpose during convert", () => {
    const item = convertToComponent(panels, { ...meta, rootPurpose: "18mm carcass, drill dowels" });
    expect(item.root.purpose).toBeUndefined();
  });

  it("persists per-panel cuts as DesignNode.modifiers[] (closed enum)", () => {
    const cuts = [undefined, undefined, { windows: [{ w: 800, h: 600, radius: 0, cx: 1000, cy: 700 }], rounds: [{ cornerId: "c00", radius: 40 }] }];
    const item = convertToComponent(panels, meta, cuts);
    expect(item.root.children![0].modifiers).toBeUndefined();
    const doorMods = item.root.children![2].modifiers!;
    expect(doorMods.map((m) => m.type)).toEqual(["hole", "round_corner"]);
    expect(item.gate.ok).toBe(true);
  });

  it("attaches carry children to a panel's children[] (35:75, filler, no new field)", () => {
    const carries = [undefined, undefined, [{ w: 400, h: 200, d: 60, x: 100, y: 50, z: 0 }]];
    const item = convertToComponent(panels, meta, undefined, carries);
    const door = item.root.children![2];
    expect(door.children).toHaveLength(1);
    expect(door.children![0]).toMatchObject({ nodeId: "comp1:door:2:carry:0", kind: "filler", roleSlot: "korpus" });
    expect(item.gate.ok).toBe(true);
  });

  it("persists a viyemka groove as a viyemka modifier", () => {
    const cuts = [undefined, undefined, { viyemkas: [{ edgeId: "e0", pos: 1500, width: 40, depth: 90, run: 3000, rule: "fixed" as const }] }];
    const item = convertToComponent(panels, meta, cuts);
    const doorMods = item.root.children![2].modifiers!;
    expect(doorMods.map((m) => m.type)).toEqual(["viyemka"]);
    expect(item.gate.ok).toBe(true);
  });

  it("persists a laminate intent as a whole-face modifier (anchors empty)", () => {
    const cuts = [undefined, undefined, { laminate: 2 as const }];
    const item = convertToComponent(panels, meta, cuts);
    const doorMods = item.root.children![2].modifiers!;
    expect(doorMods).toEqual([{ type: "laminate", anchors: [], params: { layers: 2 } }]);
    expect(item.gate.ok).toBe(true);
  });
});
