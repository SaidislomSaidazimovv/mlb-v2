// B7 — Derived-until-touched (48§3) testlari.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, lineById } from "../../src/poligon/model/sheet.ts";
import { isDerived, declareRelation, resolvePositions, pinPosition } from "../../src/poligon/model/relations.ts";
import type { Sheet } from "../../src/poligon/model/contracts.ts";

const ok = (r: Sheet | { rule: string }): Sheet => { assert.ok(!("rule" in r), "rule" in r ? (r as { message: string }).message : ""); return r as Sheet; };

function base() {
  const s = createSheet();
  const worktop = addLine(s, "H", 850).id;
  const upper = addLine(s, "H", 1150).id;
  return { s, worktop, upper };
}

test("48§3: DERIVED upper worktop'ga ERGASHADI — worktop siljisa upper ham (fartuk relation)", () => {
  const { s, worktop, upper } = base();
  let sheet = ok(declareRelation(s, upper, worktop, 300)); // upper = worktop + 300
  assert.ok(isDerived(sheet, upper), "upper derived");
  sheet = ok(resolvePositions(sheet));
  assert.equal(lineById(sheet, upper)!.pos, 1150, "850+300");
  // worktop'ni siljitamiz → 900
  lineById(sheet, worktop)!.pos = 900;
  sheet = ok(resolvePositions(sheet));
  assert.equal(lineById(sheet, upper)!.pos, 1200, "upper ergashdi: 900+300");
});

test("48§3: PIN — 'touching pins it': pin qilingach upper ergashmaydi (relation buzildi, authored)", () => {
  const { s, worktop, upper } = base();
  let sheet = ok(declareRelation(s, upper, worktop, 300));
  sheet = ok(pinPosition(sheet, upper)); // touch → pin
  assert.ok(!isDerived(sheet, upper), "pin → endi derived emas (authored)");
  assert.equal(lineById(sheet, upper)!.pos, 1150, "pin joriy derived pos'da (850+300)");
  // worktop siljisa upper QOTGAN
  lineById(sheet, worktop)!.pos = 900;
  sheet = ok(resolvePositions(sheet));
  assert.equal(lineById(sheet, upper)!.pos, 1150, "pin'dan keyin ergashmaydi");
});

test("48§3: chain A←B←C — hammasi hisoblanadi", () => {
  const s = createSheet();
  const c = addLine(s, "H", 100).id, b = addLine(s, "H", 200).id, a = addLine(s, "H", 300).id;
  let sheet = ok(declareRelation(s, b, c, 50));   // b = c+50
  sheet = ok(declareRelation(sheet, a, b, 70));   // a = b+70
  sheet = ok(resolvePositions(sheet));
  assert.equal(lineById(sheet, b)!.pos, 150, "c(100)+50");
  assert.equal(lineById(sheet, a)!.pos, 220, "b(150)+70");
});

test("48§3: tsiklik relation → rel.cycle RAD (jimgina to'xtamaydi)", () => {
  const s = createSheet();
  const x = addLine(s, "H", 100).id, y = addLine(s, "H", 200).id;
  let sheet = ok(declareRelation(s, x, y, 10));
  sheet = ok(declareRelation(sheet, y, x, 10)); // tsikl
  const r = resolvePositions(sheet);
  assert.ok("rule" in r && r.rule === "rel.cycle");
});

test("L16: butun bo'lmagan offset → RAD", () => {
  const { s, worktop, upper } = base();
  assert.ok("rule" in declareRelation(s, upper, worktop, 300.5));
});
