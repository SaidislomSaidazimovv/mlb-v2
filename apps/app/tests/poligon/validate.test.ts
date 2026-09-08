// T10 — Validation testlari. ASOS: 48 L8 + 51 D9/D11 + 54§3 "T10 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkColumnMinimum, checkMaterialDomain, checkCollisions } from "../../src/poligon/model/validate.ts";

test("L8: 3mm filler 150mm karkas minimumi bilan RAD ETILMAYDI (faqat filler bo'lsa)", () => {
  assert.equal(checkColumnMinimum(5, [{ min: 3, rule: "filler" }]), null); // 5 >= 3, ok
});

test("L8: karkas bor ustunda min=150, eni 100 → RAD (karkas qoidasini nomlaydi)", () => {
  const r = checkColumnMinimum(100, [{ min: 3, rule: "filler" }, { min: 150, rule: "carcass" }]);
  assert.equal(r?.rule, "carcass"); // eng katta min = carcass
});

test("L8: eni yetarli → null", () => {
  assert.equal(checkColumnMinimum(200, [{ min: 150, rule: "carcass" }]), null);
});

test("D9: 10mm shisha, maxSpan 800; span 900 → RAD (material qoidasi, resize yo'q)", () => {
  const r = checkMaterialDomain({ span: 900 }, { rule: "glass-10mm", maxUnsupportedSpan: 800 });
  assert.equal(r?.rule, "glass-10mm");
});

test("D9: span 700 ≤ 800 → null", () => {
  assert.equal(checkMaterialDomain({ span: 700 }, { rule: "glass-10mm", maxUnsupportedSpan: 800 }), null);
});

test("D11: bir qatlamda ustma-ust ikki front → to'qnashuv RAD", () => {
  const r = checkCollisions([
    { layer: "front", x0: 0, x1: 600, rule: "fasad-A" },
    { layer: "front", x0: 597, x1: 1200, rule: "fasad-B" }, // 597..600 ustma-ust
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0]!.rule, "D11.collision");
});

test("D11: boshqa qatlam yoki ustma-ust emas → to'qnashuv yo'q", () => {
  const r = checkCollisions([
    { layer: "front", x0: 0, x1: 600, rule: "a" },
    { layer: "carcass", x0: 500, x1: 700, rule: "b" }, // boshqa qatlam
    { layer: "front", x0: 600, x1: 900, rule: "c" },    // tegib turadi, ustma-ust emas
  ]);
  assert.equal(r.length, 0);
});
