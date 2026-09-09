// D9 (constraint/forbidden-zone) + D11 (door-swing/grain) + D12 (planes/kerf) qoldiqlari testlari.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkConstraint, checkDoorSwing, checkGrainFit } from "../../src/poligon/model/validate.ts";
import { nominalToModel } from "../../src/poligon/model/release.ts";

test("D9: constraint — min/max/forbidden-zone TEKSHIRILADI, yechilmaydi (B4 lift-up)", () => {
  assert.equal(checkConstraint(500, { rule: "m", min: 300 }), null);
  assert.equal(checkConstraint(200, { rule: "m", min: 300 })?.rule, "m");
  assert.equal(checkConstraint(900, { rule: "m", max: 800 })?.rule, "m");
  // B4: lift-up taqiqlangan zona [400,600] — shelf 500 kirolmaydi
  assert.equal(checkConstraint(500, { rule: "lift", forbidden: [[400, 600]] })?.rule, "lift");
  assert.equal(checkConstraint(700, { rule: "lift", forbidden: [[400, 600]] }), null);
});

test("D11/G4: eshik-swing — ochilishga joy yetmasa (clearance < eni) → D11.swing RAD", () => {
  assert.equal(checkDoorSwing(400, 600), null, "600 joy ≥ 400 eni → ochiladi");
  assert.equal(checkDoorSwing(400, 300)?.rule, "D11.swing", "300 < 400 → devorga tegadi");
});

test("D11/A3: grain feasibility — majburiy tola bilan sheet'ga sig'masa → D11.grain (un-nestable)", () => {
  // 2100 side, majburiy L tola, sheet 2800×2070 → uzunlik 2100 ≤ 2800 OK, en ≤ 2070 kerak
  assert.equal(checkGrainFit(2100, 560, "L", 2800, 2070), null, "L tola: 2100≤2800, 560≤2070 → sig'adi");
  // agar en 2100 bo'lsa (majburiy L) → 2100 > 2070 → sig'maydi
  assert.equal(checkGrainFit(2100, 2100, "L", 2800, 2070)?.rule, "D11.grain");
  // erkin tola (none) — boshqa orientatsiya sinaladi
  assert.equal(checkGrainFit(2100, 2100, "none", 2800, 2070)?.rule, "D11.grain", "2100×2100 hech qanday orientatsiyada sig'maydi");
});

test("D12: Nominal → Model — ramziy 16 haqiqiy 15.8 ga (Model = haqiqiy material)", () => {
  assert.equal(nominalToModel(16, 15.8), 15.8);
});
