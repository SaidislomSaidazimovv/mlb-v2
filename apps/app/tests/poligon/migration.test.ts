// D4 — Migration testlari. ASOS: 51 D4/H2 + 48 L0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness } from "../../src/poligon/model/sheet.ts";
import { runMigration, previewMigration, type Migration } from "../../src/poligon/model/migration.ts";

function base() {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 600).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 720).id;
  setThickness(s, v0, h0, h1, 16);
  setThickness(s, v1, h0, h1, 16);
  return { s, v0, v1, h0, h1 };
}

test("runMigration: tartibli op'lar hammasi to'g'ri → END-STATE, asl Sheet o'zgarmaydi", () => {
  const { s, v1 } = base();
  const before = s.vLines.length;
  const mig: Migration = { name: "widen", ops: [
    { kind: "addLine", axis: "V", pos: 300 },
    { kind: "moveLine", line: v1, pos: 800 },
  ] };
  const r = runMigration(s, mig);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.sheet.vLines.map((l) => l.pos).sort((a, b) => a - b), [0, 300, 800]);
  assert.equal(s.vLines.length, before); // asl tegilmadi (immutable)
});

test("runMigration: birorta op rad bo'lsa BUTUN migratsiya rad + failedAt (L0 butun-yoki-hech)", () => {
  const { s, v1 } = base();
  const posBefore = s.vLines.find((l) => l.id === v1)!.pos;
  const mig: Migration = { name: "bad", ops: [
    { kind: "addLine", axis: "V", pos: 300 }, // ok
    { kind: "moveLine", line: v1, pos: 5 },    // L1 (v0=0 t16 bilan ustma-ust) → rad
  ] };
  const r = runMigration(s, mig);
  assert.equal(r.ok, false);
  if (!r.ok) { assert.equal(r.failedAt, 1); assert.equal(r.refusals[0]!.rule, "L1"); }
  assert.equal(s.vLines.length, 2); // hech narsa qo'llanmadi
  assert.equal(s.vLines.find((l) => l.id === v1)!.pos, posBefore);
});

test("previewMigration: END-STATE beradi, asl Sheet'ni o'zgartirmaydi (D4)", () => {
  const { s, v1 } = base();
  const p = previewMigration(s, { name: "p", ops: [{ kind: "moveLine", line: v1, pos: 700 }] });
  assert.equal(p.ok, true);
  if (p.ok) assert.equal(p.sheet.vLines.find((l) => l.id === v1)!.pos, 700);
  assert.equal(s.vLines.find((l) => l.id === v1)!.pos, 600); // asl 600'da qoldi
});
