// D6 — Hardware/Fit testlari. ASOS: 51 D6 + 52§8 (+ B1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFitHinge, doorWidth, type Fit, type Hinge } from "../../src/poligon/model/fits.ts";

const insetFit: Fit = { id: "inset-3", kind: "door", gap: 1.5, overlay: "inset", requiresHingeClass: "inset" };
const fullFit: Fit = { id: "full-3", kind: "door", gap: 1.5, overlay: "full-overlay", requiresHingeClass: "full-overlay" };
const fullHinge: Hinge = { id: "blum-full", hingeClass: "full-overlay" };
const insetHinge: Hinge = { id: "blum-inset", hingeClass: "inset" };

test("52§8: Fit + mos ilgak → null; mos kelmasa → D6.fitHinge (B1)", () => {
  assert.equal(checkFitHinge(fullFit, fullHinge), null);
  assert.equal(checkFitHinge(insetFit, fullHinge)?.rule, "D6.fitHinge"); // inset Fit + full ilgak
});

test("51 D6: eshik eni DEKLARATSIYA qilingan overlay'dan (ilgak nomidan emas); full≠inset ~33mm", () => {
  const wFull = doorWidth(600, fullFit);   // 600 - 3 = 597
  const wInset = doorWidth(600, insetFit); // 600 - 3 - 32 = 565
  assert.equal(wFull, 597);
  assert.equal(wInset, 565);
  assert.equal(wFull - wInset, 32); // overlay turi ~33mm o'zgartiradi
});

test("mos ilgak bilan inset Fit → null", () => {
  assert.equal(checkFitHinge(insetFit, insetHinge), null);
});
