// T5 — Ops + legalDomain testlari. ASOS: 48 L0/L13/L16 + 54§3 "T5 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness } from "../../src/poligon/model/sheet.ts";
import { apply, legalDomain } from "../../src/poligon/model/ops.ts";

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

test("apply addLine: yangi Sheet, ASL o'zgarmaydi (54§2 immutability)", () => {
  const { s } = base();
  const before = s.vLines.length;
  const r = apply(s, { kind: "addLine", axis: "V", pos: 300 });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.sheet.vLines.length, before + 1);
  assert.equal(s.vLines.length, before); // asl tegilmadi
});

test("apply setThickness: qabul", () => {
  const { s, v0, h0, h1 } = base();
  const r = apply(s, { kind: "setThickness", line: v0, lo: h0, hi: h1, t: 32 });
  assert.equal(r.ok, true);
});

test("apply moveLine: manfiy ichki bo'shliq → L1 rad, ASL o'zgarmaydi (L0 butun-yoki-hech)", () => {
  const { s, v1 } = base();
  const posBefore = s.vLines.find((l) => l.id === v1)!.pos;
  const r = apply(s, { kind: "moveLine", line: v1, pos: 10 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.refusals[0]!.rule, "L1");
  assert.equal(s.vLines.find((l) => l.id === v1)!.pos, posBefore); // asl tegilmadi
});

test("apply moveLine: butun mm emas → L16 rad", () => {
  const { s, v1 } = base();
  const r = apply(s, { kind: "moveLine", line: v1, pos: 300.5 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.refusals[0]!.rule, "L16");
});

test("legalDomain: MUTATSIYASIZ 'nima qabul qilinardi' (L13)", () => {
  const { s, v1 } = base();
  const vlen = s.vLines.length;
  const bad = legalDomain(s, { kind: "moveLine", line: v1, pos: 10 });
  assert.equal(bad.legal, false);
  assert.equal(bad.refusals[0]!.rule, "L1");
  const good = legalDomain(s, { kind: "addLine", axis: "V", pos: 300 });
  assert.equal(good.legal, true);
  assert.equal(s.vLines.length, vlen); // legalDomain asl Sheet'ni o'zgartirmadi
});

test("apply moveLine: yo'q chiziq → op.moveLine rad", () => {
  const { s } = base();
  const r = apply(s, { kind: "moveLine", line: "yoq", pos: 100 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.refusals[0]!.rule, "op.moveLine");
});
