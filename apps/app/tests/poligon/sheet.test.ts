// T1 — Sheet primitives testlari. Node ichki test-runner (offline, npm install kerak emas).
// ASOS: 54§3 "T1 gate" — sheet har operatsiyadan o'tadi, L1 commitda buzilmaydi.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSheet, addLine, setThickness, faces, checkL1, addBlock, commit, serialize, parse,
} from "../../src/poligon/model/sheet.ts";

test("addLine: butun mm shart (L16)", () => {
  const s = createSheet();
  assert.throws(() => addLine(s, "V", 100.5));
});

test("addLine: ε-snap — <1mm mavjud chiziqqa yopishadi, dublikat yo'q (L5b)", () => {
  const s = createSheet();
  const a = addLine(s, "V", 100);
  const b = addLine(s, "V", 100);
  assert.equal(b.snapped, true);
  assert.equal(b.id, a.id);
  assert.equal(s.vLines.length, 1);
});

test("faces: pos ± qalinlik/2 (48§0)", () => {
  assert.deepEqual(faces(100, 16), { left: 92, right: 108 });
  assert.deepEqual(faces(100, 0), { left: 100, right: 100 });
});

test("checkL1: to'g'ri 600-korpus — rad yo'q", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 600).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 720).id;
  setThickness(s, v0, h0, h1, 16);
  setThickness(s, v1, h0, h1, 16);
  assert.deepEqual(commit(s), []);
});

test("checkL1: manfiy ichki bo'shliq — L1 rad, qoida nomlangan (L8/L13)", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 100).id;
  const v1 = addLine(s, "V", 110).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 720).id;
  setThickness(s, v0, h0, h1, 32);
  setThickness(s, v1, h0, h1, 32);
  const r = checkL1(s);
  assert.equal(r.length, 1);
  assert.equal(r[0]!.rule, "L1");
});

test("addBlock: mavjud bo'lmagan chiziq — L4 rad", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 600).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 720).id;
  const ok = addBlock(s, "base", v0, v1, h0, h1);
  assert.ok("id" in ok);
  const bad = addBlock(s, "base", v0, "yoq", h0, h1);
  assert.ok("rule" in bad);
});

test("round-trip: serialize→parse aynan bir xil (L12)", () => {
  const s = createSheet();
  addLine(s, "V", 0);
  addLine(s, "V", 600);
  addLine(s, "H", 0);
  addLine(s, "H", 720);
  const back = parse(serialize(s));
  assert.deepEqual(back, s);
});
