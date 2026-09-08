// Deleting a PLACED component: it must be selectable+removable like any other part. deletePartGroup
// gained a "component" case, and componentPartsForCab makes the component a real pickable part; this
// locks the removal (the pick-slab + selection are 3D, verified in the browser).

import { describe, it, expect } from "vitest";
import { mk } from "../src/model/cabinet";
import { deletePartGroup, leavesForCab, setCellComponent } from "../src/app2/FillEditor";
import type { Cell } from "../src/model/cabinet";

const hasComponent = (c: Cell): boolean => !!c.component || (c.children ?? []).some(hasComponent);

describe("setCellComponent — drag-drop binds a component to the tapped cell", () => {
  it("binds the ref to the leaf at the given path, leaving other cells alone", () => {
    const cab = mk({ kind: "base", w: 800, h: 720, layout: { split: "cols", children: [{ front: "door" }, {}] } });
    // tap the empty second cell → bind
    const leaves = leavesForCab(cab);
    const empty = leaves.find((l) => !l.cell.front && !l.cell.component)!;
    const layout = setCellComponent(cab, empty.path, { componentId: "c9", pinnedVersion: 2 });
    // the component landed …
    const find = (c: Cell, path: number[]): Cell => path.length ? find(c.children![path[0]!]!, path.slice(1)) : c;
    expect(find(layout, empty.path).component).toEqual({ componentId: "c9", pinnedVersion: 2 });
    // … and the door survived
    const hasDoor = (c: Cell): boolean => c.front === "door" || (c.children ?? []).some(hasDoor);
    expect(hasDoor(layout)).toBe(true);
  });
});

describe("deletePartGroup — remove a placed component", () => {
  it("empties the component's cell but keeps the rest of the block", () => {
    const cab = mk({ kind: "base", w: 800, h: 720, layout: {
      split: "cols", children: [{ front: "door" }, { component: { componentId: "c1", pinnedVersion: 1 } }],
    } });
    // the group the 3D picker/list uses for this component (from the same leaf walk)
    const leaf = leavesForCab(cab).find((l) => l.cell.component);
    expect(leaf).toBeTruthy();
    const res = deletePartGroup(cab, `component@${leaf!.path.join(".")}`);

    expect(res).not.toBeNull();
    expect(hasComponent(res!.layout)).toBe(false); // the component binding is gone
    // the door survives somewhere in the tree
    const hasDoor = (c: Cell): boolean => c.front === "door" || (c.children ?? []).some(hasDoor);
    expect(hasDoor(res!.layout)).toBe(true);
  });

  it("returns null for a carcass part (no @ — not a Cell node)", () => {
    const cab = mk({ kind: "base", w: 600, h: 720, fill: "shelves", count: 1 });
    expect(deletePartGroup(cab, "side")).toBeNull();
  });
});
