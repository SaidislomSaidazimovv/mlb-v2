// Qonun-darajasidagi qoldiqlar: L6 material/tola board termination · Law B · 53§4 overrides.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness, setSegMaterial } from "../../src/poligon/model/sheet.ts";
import { derive } from "../../src/poligon/model/derive.ts";
import { checkSingleValued } from "../../src/poligon/model/lawb.ts";
import { makeOverride, applyOverride, checkOverrideAlive, overrideInventory } from "../../src/poligon/model/overrides.ts";
import type { Role } from "../../src/poligon/model/junction.ts";

test("48 L6/53§5: bir chiziq, teng qalinlik, LEKIN turli MATERIAL → IKKI board (bir board emas)", () => {
  const s = createSheet();
  const h0 = addLine(s, "H", 0).id;
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id, v2 = addLine(s, "V", 1200).id;
  // h0 bo'ylab ikki segment, ikkalasi 16, LEKIN turli material
  setThickness(s, h0, v0, v1, 16); setSegMaterial(s, h0, v0, v1, "ldsp-oq");
  setThickness(s, h0, v1, v2, 16); setSegMaterial(s, h0, v1, v2, "dub");
  // pastdan chegara (through uchun)
  const roles: Record<string, Role> = { [h0]: "bottom", [v0]: "side", [v1]: "side", [v2]: "side" };
  const d = derive(s, { roles });
  const onH0 = d.parts.filter((p) => p.board.line === h0);
  assert.equal(onH0.length, 2, "turli material → ikki board (bir 1200 emas)");
});

test("48 L6: bir xil material + teng qalinlik → BITTA board (regressiya himoyasi)", () => {
  const s = createSheet();
  const h0 = addLine(s, "H", 0).id;
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id, v2 = addLine(s, "V", 1200).id;
  setThickness(s, h0, v0, v1, 16); setSegMaterial(s, h0, v0, v1, "ldsp-oq");
  setThickness(s, h0, v1, v2, 16); setSegMaterial(s, h0, v1, v2, "ldsp-oq"); // bir xil
  const roles: Record<string, Role> = { [h0]: "bottom", [v0]: "side", [v1]: "side", [v2]: "side" };
  const d = derive(s, { roles });
  assert.equal(d.parts.filter((p) => p.board.line === h0).length, 1, "bir xil material → bitta board");
});

test("50 Law B: part ikki zonani qamrasa → LawB RAD (tall penal base+upper); blok e'lon qilsa → toza", () => {
  const bands = [{ name: "base", from: 0, to: 850 }, { name: "upper", from: 850, to: 2400 }];
  // tall fasad 0..2100 — ikkala zonani qamraydi → RAD
  assert.equal(checkSingleValued("P-118", 0, 2100, bands)?.rule, "LawB");
  // blok zone e'lon qilsa (declared) → geometrik derivatsiya bekor → toza
  assert.equal(checkSingleValued("P-118", 0, 2100, bands, "tall"), null);
  // bitta zonada → toza
  assert.equal(checkSingleValued("P-1", 0, 700, bands), null);
});

test("53§4: overrides — raqamli=delta, kategorik=absolute; part yo'qolsa konflikt; inventory", () => {
  const num = makeOverride("side#v0,v1", "depth", 50);
  const cat = makeOverride("side#v0,v1", "colour", "dub");
  assert.equal(num.kind, "delta"); assert.equal(cat.kind, "absolute");
  assert.equal(applyOverride(560, num), 610, "delta: 560+50");
  assert.equal(applyOverride("oq", cat), "dub", "absolute: almashtiradi");
  // part yo'qolsa → konflikt (jimgina qo'llanmaydi/yo'qolmaydi)
  assert.equal(checkOverrideAlive(num, new Set(["boshqa"]))?.rule, "override.conflict");
  assert.equal(checkOverrideAlive(num, new Set(["side#v0,v1"])), null);
  assert.equal(overrideInventory([num, cat]).length, 2, "inventory ro'yxatlanadi");
});
