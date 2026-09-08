// T4 — Modules testlari. ASOS: 48§0 + L4 + 54§3 "T4 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness } from "../src/poligon/model/sheet.ts";
import { deriveModules, transportCheck } from "../src/poligon/model/module.ts";

// Ikki katakli sheet (ular orasida bitta chok). helper.
function twoCells() {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const vMid = addLine(s, "V", 600).id;
  const v1 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 720).id;
  return { s, v0, vMid, v1, h0, h1 };
}

test("T4-gate: chok 32 → 2 modul; 16 ga o'zgartirsa → 1 modul (fuse)", () => {
  const { s, vMid, h0, h1 } = twoCells();
  setThickness(s, vMid, h0, h1, 32); // modul chegarasi
  assert.equal(deriveModules(s).length, 2);
  setThickness(s, vMid, h0, h1, 16); // umumiy taxta → ulanadi
  const mods = deriveModules(s);
  assert.equal(mods.length, 1);
  assert.equal(mods[0]!.cells.length, 2);
});

test("T4-gate: fuse bo'lgan modul eni 1200 > 900 → transport ogohlantirishi", () => {
  const { s, vMid, h0, h1 } = twoCells();
  setThickness(s, vMid, h0, h1, 16);
  const m = deriveModules(s)[0]!;
  assert.equal(m.width, 1200);
  const warn = transportCheck(m, { maxWidth: 900 });
  assert.equal(warn?.rule, "transport");
  assert.equal(transportCheck(m, { maxWidth: 1300 }), null); // chegarada bo'lsa — yo'q
});

test("modul ixtiyoriy shakl — L-shakl qonuniy (L4)", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const vMid = addLine(s, "V", 600).id;
  const v1 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id;
  const hMid = addLine(s, "H", 720).id;
  const h1 = addLine(s, "H", 1440).id;
  // yuqori-o'ng katakni (vi=1,hi=1) 32 bilan ajratamiz → qolgan 3 katak L-shakl bitta modul
  setThickness(s, vMid, hMid, h1, 32);  // (0,1)|(1,1) orasida V chegara
  setThickness(s, hMid, vMid, v1, 32);  // (1,0)|(1,1) orasida H chegara
  const mods = deriveModules(s);
  assert.equal(mods.length, 2);
  const sizes = mods.map((m) => m.cells.length).sort((a, b) => a - b);
  assert.deepEqual(sizes, [1, 3]); // 1 alohida + 3 katakli L-modul
});
