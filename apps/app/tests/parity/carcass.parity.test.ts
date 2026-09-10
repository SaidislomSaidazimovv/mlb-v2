// B parity testi — ESKI (app: grid.ts+engine) vs YANGI (poligon+umumiy teshik): bo'lak + TESHIK solishtiruvi.
import { describe, it, expect } from "vitest";
import { compareFurniture, oldFull, newFull, type Furniture } from "./compare";

const base: Furniture = { id: "b600", label: "Baza 600", kind: "base", width: 600, height: 720, depth: 560, shelves: 1, door: 1 };

describe("parity — baza (ESKI app vs YANGI poligon): bo'lak + teshik", () => {
  const c = compareFurniture(base);

  it("KARKAS bo'laklari (side/top/bottom/shelf) o'lchami IKKALA versiyada bir xil", () => {
    for (const role of ["side", "top", "bottom", "shelf"]) {
      const rows = c.rows.filter((r) => r.role === role);
      expect(rows.length, `${role} yo'q`).toBeGreaterThan(0);
      for (const r of rows) expect(r.sizeMatch, `${role}: ${r.note}`).toBe(true);
    }
  });

  it("door/back yangi tomonda ham bor (poligon front/behind qatlam) va o'lchami eskiga mos", () => {
    const door = c.rows.find((r) => r.role === "facade");
    const back = c.rows.find((r) => r.role === "back");
    expect(door?.old).toBeTruthy(); expect(door?.neu).toBeTruthy();
    expect(door?.sizeMatch, `facade: ${door?.note}`).toBe(true);
    expect(back?.sizeMatch, `back: ${back?.note}`).toBe(true);
  });

  it("TESHIK umumiy dvigateldan — har juft bo'lak teshigi BIR XIL (52§1 quyi qatlam)", () => {
    for (const r of c.rows) {
      if (r.old && r.neu) expect(r.drillMatch, `${r.role}: ${r.note}`).toBe(true);
    }
  });

  it("ESKI real teshik beradi (side Ø15+pin, top/bottom Ø8 dowel, door Ø35 ilgak) — to'qilmagan", () => {
    const old = oldFull(base);
    const side = old.find((p) => p.role === "side")!;
    const door = old.find((p) => p.role === "facade")!;
    expect(side.holes.length).toBeGreaterThan(0);
    expect(side.holes.some((h) => h.dia === 15)).toBe(true);
    expect(door.holes.some((h) => h.dia === 35)).toBe(true);
  });

  it("xulosa o'lcham + teshik + 52§1 (umumiy dvigatel) ni halol aytadi", () => {
    expect(c.conclusion).toContain("teshik");
    expect(c.conclusion).toContain("52§1");
  });
});
