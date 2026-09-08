// D5 — Thickness class testlari. ASOS: 51 D5 (+ A1/I4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyMaterialChange, checkCascadeMaterialChange, checkTypeInstantiation, type Material } from "../../src/poligon/model/thickness.ts";

const m16: Material = { id: "ldsp-white-16", thicknessClass: "t16", thickness: 16 };
const m16grey: Material = { id: "ldsp-grey-16", thicknessClass: "t16", thickness: 16 };
const m18: Material = { id: "mdf-18", thicknessClass: "t18", thickness: 18 };

test("A1: sinf ICHIDA (white16→grey16) → cascade (geometriya o'zgarmaydi)", () => {
  assert.equal(classifyMaterialChange(m16, m16grey), "cascade");
  assert.equal(checkCascadeMaterialChange(m16, m16grey), null);
});

test("A1: sinf KESIB (16→18) → migration, kaskad orqali RAD (D5.migration)", () => {
  assert.equal(classifyMaterialChange(m16, m18), "migration");
  assert.equal(checkCascadeMaterialChange(m16, m18)?.rule, "D5.migration");
});

test("I4: 18mm Type 16mm loyihaga → cross-class RAD (D5.crossClass)", () => {
  assert.equal(checkTypeInstantiation("t18", "t16")?.rule, "D5.crossClass");
  assert.equal(checkTypeInstantiation("t16", "t16"), null);
});
