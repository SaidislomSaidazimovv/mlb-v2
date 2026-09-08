// T2 — Junctions testlari. ASOS: 48§2 + 54§3 "T2 gate" (800-korpus).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RANK, resolveThrough, classify, carcassParts, boardInsideSpanningBlock,
} from "../../src/poligon/model/junction.ts";

test("RANK: worktop > side > top/bottom > shelf (48§2)", () => {
  assert.ok(RANK.worktop > RANK.side);
  assert.ok(RANK.side > RANK.top);
  assert.equal(RANK.top, RANK.bottom);
  assert.ok(RANK.top > RANK.shelf);
});

test("resolveThrough: yuqori rutba o'tib ketadi", () => {
  assert.equal(resolveThrough("side", "shelf"), "V");     // side(4) > shelf(2)
  assert.equal(resolveThrough("side", "worktop"), "H");   // worktop(5) > side(4)
});

test("resolveThrough: rutba tengligi → rad (junction.tie)", () => {
  const r = resolveThrough("top", "bottom"); // ikkalasi rank 3
  assert.equal(typeof r === "object" && "rule" in r, true);
  assert.equal((r as { rule: string }).rule, "junction.tie");
});

test("resolveThrough: override 'both' → rad (junction.both)", () => {
  const r = resolveThrough("side", "shelf", "both");
  assert.equal((r as { rule: string }).rule, "junction.both");
});

test("resolveThrough: override o'zi ustun", () => {
  assert.equal(resolveThrough("side", "worktop", "V"), "V");
});

test("classify: L/T/X va X qalinlik bilan parchalanadi (48§2)", () => {
  assert.equal(classify(2, 16), "L");
  assert.equal(classify(3, 16), "T");
  assert.equal(classify(4, 16), "X");       // umumiy 16 segment → haqiqiy X
  assert.equal(classify(4, 32), "X->2T");   // 32 modul chegarasi → ikki mustaqil T
});

test("carcassParts: 800-korpus V-through → top 768, side 720 (54 T2-gate)", () => {
  assert.deepEqual(carcassParts(800, 720, 16, "V"), { top: 768, bottom: 768, side: 720 });
});

test("carcassParts: flip → H-through → top 800, side 688 (sidelar -32) (54 T2-gate)", () => {
  assert.deepEqual(carcassParts(800, 720, 16, "H"), { top: 800, bottom: 800, side: 688 });
});

test("qamrab-oluvchi blok: ish-stoli chizig'i penal ichida polka O'STIRMAYDI (48§2)", () => {
  assert.equal(boardInsideSpanningBlock(true), false);  // qamrab olsa — board yo'q
  assert.equal(boardInsideSpanningBlock(false), true);  // qamrab olmasa — board bor
});
