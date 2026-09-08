// E2 · swipe-cycle a section's content (DB/19 §C:70 + §5:170). Pure model — the swipe GESTURE is 2D/3D
// (verified in the browser); this locks the variant DETECTION + the founder-confirmed CYCLE ORDER, and
// proves a swipe never blows away a §A/§B nested construction or a bound component.

import { describe, it, expect } from "vitest";
import { mk } from "../src/model/cabinet";
import { cellVariant, cycleCellContent, CONTENT_CYCLE } from "../src/app2/FillEditor";
import type { Cell } from "../src/model/cabinet";

const at = (c: Cell, path: number[]): Cell => (path.length ? at(c.children![path[0]!]!, path.slice(1)) : c);
const base = (child0: Cell) => mk({ kind: "base", w: 800, h: 720, layout: { split: "cols", children: [child0, {}] } });

describe("cellVariant — 4 clean variants, null for protected structures", () => {
  it("detects open · door · drawer · shelves", () => {
    expect(cellVariant({})).toBe("open");
    expect(cellVariant({ front: "door", opening: "left", handle: "right" })).toBe("door");
    expect(cellVariant({ front: "drawer", handle: "top" })).toBe("drawer");
    expect(cellVariant({ split: "rows", sizes: [0.5, 0.5], children: [{}, {}] })).toBe("shelves");
  });
  it("returns null for structures a swipe must NOT blow away", () => {
    expect(cellVariant({ component: { componentId: "c1", pinnedVersion: 1 } })).toBeNull(); // bound component
    expect(cellVariant({ front: "door", children: [{ front: "drawer" }] })).toBeNull();      // §A door + inner
    expect(cellVariant({ split: "cols", children: [{}, {}] })).toBeNull();                    // Стойка (vertical)
    expect(cellVariant({ split: "rows", children: [{ front: "drawer" }, {}] })).toBeNull();   // drawer-stack ≠ shelves
  });
});

describe("cycleCellContent — founder order Открытый→Дверь→Ящик→Полки, wrapping", () => {
  it("cycles forward through the whole ring and wraps back to open", () => {
    let cab = base({});
    for (const expected of ["door", "drawer", "shelves", "open"] as const) {
      const root = cycleCellContent(cab, [0], 1)!;
      expect(cellVariant(at(root, [0]))).toBe(expected);
      cab = mk({ kind: "base", w: 800, h: 720, layout: root });
    }
  });

  it("cycles backward (dir −1): open → shelves", () => {
    const root = cycleCellContent(base({}), [0], -1)!;
    expect(cellVariant(at(root, [0]))).toBe("shelves");
  });

  it("leaves the sibling section untouched", () => {
    const root = cycleCellContent(base({}), [0], 1)!;
    expect(cellVariant(at(root, [1]))).toBe("open");
  });

  it("returns null (no wipe) on a protected cell", () => {
    expect(cycleCellContent(base({ component: { componentId: "c1", pinnedVersion: 1 } }), [0], 1)).toBeNull();
  });

  it("CONTENT_CYCLE is the founder-confirmed order", () => {
    expect(CONTENT_CYCLE).toEqual(["open", "door", "drawer", "shelves"]);
  });
});
