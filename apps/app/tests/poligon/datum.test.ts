// D3 — Datum / local-frame testlari. ASOS: 51 D3 (C1-C5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateParam, resolveSetback, ROLE_FRAMES, type DimParam } from "../../src/poligon/model/datum.ts";

const ok: DimParam = { name: "setback.front", role: "shelf", datum: "front", value: 50, composition: "absolute" };

test("C1: to'g'ri parametr (datum + frame + belgi) → null", () => {
  assert.equal(validateParam(ok), null);
});

test("C1: datumsiz → D3.datum RAD", () => {
  assert.equal(validateParam({ ...ok, datum: "" }).rule, "D3.datum");
});

test("C2: role frame'ida bo'lmagan yuza → D3.face RAD", () => {
  assert.equal(validateParam({ ...ok, datum: "inner" }).rule, "D3.face"); // shelf'da inner yo'q
  assert.ok(ROLE_FRAMES.side.includes("inner")); // side'da esa bor
});

test("C3: world-space → D3.world RAD", () => {
  assert.equal(validateParam({ ...ok, world: true }).rule, "D3.world");
});

test("C4: protrusion-as-negative → D3.protrusion RAD", () => {
  assert.equal(validateParam({ ...ok, protrusionAsNegative: true }).rule, "D3.protrusion");
});

test("C1 yechim: natija DEKLARATSIYA qilingan datumga bog'liq (taxmin yo'q)", () => {
  // carcass-opening datum (fasad qalinligidan MUSTAQIL): pozitsiya doim 0
  const carcassPos = 0;
  assert.equal(resolveSetback(carcassPos, ok), -50); // 18mm
  assert.equal(resolveSetback(carcassPos, ok), -50); // 22mm — O'ZGARMAYDI
  // fasad datum (fasad qalinligiga bog'liq): front face = -qalinlik
  assert.equal(resolveSetback(-18, ok), -68); // 18mm
  assert.equal(resolveSetback(-22, ok), -72); // 22mm — QALINLIK bilan siljiydi
});
