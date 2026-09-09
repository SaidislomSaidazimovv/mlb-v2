// B8 — Layers + fullness (L3) testlari.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, addBlock } from "../../src/poligon/model/sheet.ts";
import { checkFullness, formsJunctions } from "../../src/poligon/model/layers.ts";
import type { Sheet, Layer } from "../../src/poligon/model/contracts.ts";

function grid2() {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id, v2 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 720).id;
  return { s, v0, v1, v2, h0, h1 };
}
function block(s: Sheet, type: string, vLo: string, vHi: string, hLo: string, hHi: string, layer?: Layer): void {
  const r = addBlock(s, type, vLo, vHi, hLo, hHi) as { id: string };
  if (layer) s.blocks.find((b) => b.id === r.id)!.layer = layer;
}

test("L3: carcass har katakni to'la qoplasa → to'la (rad yo'q)", () => {
  const { s, v0, v1, v2, h0, h1 } = grid2();
  block(s, "base", v0, v1, h0, h1);
  block(s, "base", v1, v2, h0, h1);
  assert.deepEqual(checkFullness(s), []);
});

test("L3: qoplanmagan katak → L3.hole (teshik, L9 buzilishi)", () => {
  const { s, v0, v1, h0, h1 } = grid2();
  block(s, "base", v0, v1, h0, h1); // (1,0) qoplanmagan
  assert.ok(checkFullness(s).some((r) => r.rule === "L3.hole"));
});

test("L3/L9: Void teshikni to'ldiradi → to'la (Void strukturaviy tekisda)", () => {
  const { s, v0, v1, v2, h0, h1 } = grid2();
  block(s, "base", v0, v1, h0, h1);
  block(s, "void", v1, v2, h0, h1); // oshkora bo'sh
  assert.deepEqual(checkFullness(s), []);
});

test("L3: ikki carcass ustma-ust → L3.overlap", () => {
  const { s, v0, v1, v2, h0, h1 } = grid2();
  block(s, "base", v0, v2, h0, h1); // ikkala katak
  block(s, "base", v0, v1, h0, h1); // (0,0) ikkinchi marta
  assert.ok(checkFullness(s).some((r) => r.rule === "L3.overlap"));
});

test("48 L7: in-plane (carcass) junction HOSIL QILADI; overlay (front plinth) HOSIL QILMAYDI; override ustun", () => {
  assert.equal(formsJunctions("carcass"), true, "in-plane → junction");
  assert.equal(formsJunctions("behind"), true);
  assert.equal(formsJunctions("front"), false, "overlay plinth → junction yo'q (fartuk/shapka ustidan o'tadi)");
  assert.equal(formsJunctions("above"), false);
  assert.equal(formsJunctions("front", true), true, "profil in-plane override → ustun (L7 'nomidan emas')");
});

test("L3: FRONT qatlamdagi plinth uch carcass ustidan o'tsa — QONUNIY (front tekshirilmaydi)", () => {
  const { s, v0, v1, v2, h0, h1 } = grid2();
  block(s, "base", v0, v1, h0, h1);
  block(s, "base", v1, v2, h0, h1);
  block(s, "plinth", v0, v2, h0, h1, "front"); // front — carcass ustidan o'tadi, lekin overlap emas
  assert.deepEqual(checkFullness(s), [], "front qatlam fullness'ni buzmaydi");
});
