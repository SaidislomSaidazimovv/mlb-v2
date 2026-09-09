// B parity testi — ESKI (grid.ts app) vs YANGI (poligon) bir xil karcasni bir xil bo'laklarga bo'ladimi.
import { describe, it, expect } from "vitest";
import { compareFurniture, type Furniture } from "./compare";

const base: Furniture = { id: "base-600", label: "Baza 600×720", kind: "base", width: 600, height: 720, depth: 560, shelves: 0 };

describe("parity — baza karkass (ESKI grid.ts app vs YANGI poligon)", () => {
  const c = compareFurniture(base);

  it("KARKAS bo'laklari (side/top/bottom) IKKALA versiyada AYNAN bir xil", () => {
    for (const role of ["side", "top", "bottom"]) {
      const rows = c.rows.filter((r) => r.role === role);
      expect(rows.length, `${role} topilmadi`).toBeGreaterThan(0);
      for (const r of rows) expect(r.match, `${role}: ${r.note}`).toBe(true);
    }
    // aniq o'lchamlar: side 720×560, top/bottom 568×560
    const side = c.rows.find((r) => r.role === "side")!;
    expect(side.old).toEqual(side.neu);
    expect(side.neu!.length).toBe(720);
    expect(side.neu!.depth).toBe(560);
  });

  it("eshik/orqa/tsokol faqat ESKIда (yangi karkas Sheet bermaydi — halol farq)", () => {
    for (const role of ["facade", "back", "plinth"]) {
      const r = c.rows.find((x) => x.role === role);
      if (r) { expect(r.old).toBeTruthy(); expect(r.neu).toBeUndefined(); }
    }
  });

  it("xulosa teshik farqini halol aytadi", () => {
    expect(c.conclusion).toContain("teshik");
  });
});
