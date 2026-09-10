// B parity testi — murakkab mebel: ESKI (grid.ts to'liq) vs YANGI (poligon karkas). Farqlar halol ko'rsatiladi.
import { describe, it, expect } from "vitest";
import { compareFurniture, oldFull, newFull, type Furniture } from "./compare";
import { FURNITURES } from "./furnitures";

const sideboard = FURNITURES.find((f) => f.id === "sideboard")!;
const pantry = FURNITURES.find((f) => f.id === "pantry6")!;

describe("parity — murakkab mebel (ESKI grid.ts vs YANGI poligon)", () => {
  it("har mebelning tashqi karkasi (side/top/bottom) o'lchami IKKALA versiyada bir xil", () => {
    for (const f of FURNITURES) {
      const c = compareFurniture(f);
      for (const role of ["side", "top", "bottom"]) {
        for (const r of c.rows.filter((x) => x.role === role && x.old && x.neu)) {
          expect(r.sizeMatch, `${f.id} ${role}: ${r.note}`).toBe(true);
        }
      }
    }
  });

  it("pantry (pardevorsiz, polkali) — full-width polka ham mos", () => {
    const c = compareFurniture(pantry);
    for (const r of c.rows.filter((x) => x.role === "shelf" && x.old && x.neu)) {
      expect(r.sizeMatch, `shelf: ${r.note}`).toBe(true);
    }
  });

  it("tortma/pardevor/tsokol = FAQAT ESKIda (poligon hali modellamaydi) — halol farq ko'rsatiladi", () => {
    const chest = compareFurniture(FURNITURES.find((f) => f.id === "chest3")!);
    const drawerRow = chest.rows.find((r) => r.role === "drawerFront");
    expect(drawerRow?.old).toBeTruthy();
    expect(drawerRow?.neu).toBeUndefined();
    const sb = compareFurniture(sideboard);
    const divRow = sb.rows.find((r) => r.role === "divider");
    expect(divRow?.old).toBeTruthy();
    expect(divRow?.neu).toBeUndefined();
  });

  it("ESKI real teshik beradi (karkasda Ø15/Ø8/Ø35) — to'qilmagan", () => {
    const old = oldFull(pantry);
    const side = old.find((p) => p.role === "side")!;
    expect(side.holes.length).toBeGreaterThan(0);
  });

  it("xulosa batafsil + asosli (48§0, 52§1, 52§3, founder Q2)", () => {
    const c = compareFurniture(sideboard);
    expect(c.conclusion).toContain("48§0");
    expect(c.conclusion).toContain("52§1");
    expect(c.conclusion.length).toBeGreaterThan(300);
  });
});
