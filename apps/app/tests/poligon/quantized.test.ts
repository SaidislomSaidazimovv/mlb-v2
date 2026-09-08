// D7 — Kvantlangan param testlari. ASOS: 51 D7 + B3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { legalMembers, checkQuantized, type QuantizedParam } from "../../src/poligon/model/quantized.ts";

const slides: QuantizedParam = { name: "slide.length", allowed: [250, 300, 350, 400, 450, 500, 550, 600] };

test("B3: 540-chuqur korpus 500 oladi, 540/550/600 emas — ro'yxat (tizim tanlamaydi)", () => {
  const legal = legalMembers(slides, 540);
  assert.deepEqual(legal, [250, 300, 350, 400, 450, 500]);
  assert.ok(!legal.includes(550)); // 540 dan katta
  assert.ok(!legal.includes(540)); // 540 to'plamda ham yo'q
});

test("D7: sig'adigan a'zo bor → null (rad emas)", () => {
  assert.equal(checkQuantized(slides, 540), null);
});

test("D7: hech bir a'zo sig'masa (max 200 < min 250) → D7.noMember RAD", () => {
  assert.equal(checkQuantized(slides, 200)?.rule, "D7.noMember");
});
