// T3 — Board runs testlari. ASOS: 48 L6 + 54§3 "T3 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness } from "../src/poligon/model/sheet.ts";
import { boardRuns } from "../src/poligon/model/board.ts";
import type { Line } from "../src/poligon/model/contracts.ts";

const allThrough = () => true;

// 54 T3-GATE: baza (0-720) + penal (0-2400) BITTA vertikal chiziqni bo'lishsa,
// va kesishmalar V-through bo'lsa → o'sha side BITTA 2400 taxta (baza alohida o'ng side olmaydi).
test("T3-gate: umumiy vertikal chiziq → BITTA 2400 taxta (baza o'ng side yo'q)", () => {
  const s = createSheet();
  const vShared = addLine(s, "V", 500).id;
  const h0 = addLine(s, "H", 0).id;      // pol
  const hBase = addLine(s, "H", 720).id; // baza tepasi
  const hTop = addLine(s, "H", 2400).id; // shift
  setThickness(s, vShared, h0, hBase, 16);
  setThickness(s, vShared, hBase, hTop, 16);
  const boards = boardRuns(s, allThrough);
  const onShared = boards.filter((b) => b.line === vShared);
  assert.equal(onShared.length, 1);           // BITTA taxta, ikkita emas
  assert.equal(onShared[0]!.length, 2400);    // to'liq 2400
});

test("qalinlik o'zgarishi yugurishni tugatadi → 2 taxta (L6)", () => {
  const s = createSheet();
  const v = addLine(s, "V", 100).id;
  const h0 = addLine(s, "H", 0).id;
  const hMid = addLine(s, "H", 720).id;
  const hTop = addLine(s, "H", 2400).id;
  setThickness(s, v, h0, hMid, 16);
  setThickness(s, v, hMid, hTop, 32);
  const boards = boardRuns(s, allThrough).filter((b) => b.line === v);
  assert.equal(boards.length, 2);
  assert.deepEqual(boards.map((b) => b.length).sort((a, b) => a - b), [720, 1680]);
});

test("perpendikulyar-through kesadi → taxta bo'linadi (L6)", () => {
  const s = createSheet();
  const v = addLine(s, "V", 100).id;
  const h0 = addLine(s, "H", 0).id;
  const hMid = addLine(s, "H", 720).id;
  const hTop = addLine(s, "H", 2400).id;
  setThickness(s, v, h0, hMid, 16);
  setThickness(s, v, hMid, hTop, 16);
  const cutAt720 = (_ln: Line, pos: number) => pos !== 720; // 720 da kesilgan
  const boards = boardRuns(s, cutAt720).filter((b) => b.line === v);
  assert.equal(boards.length, 2);
  assert.deepEqual(boards.map((b) => b.length).sort((a, b) => a - b), [720, 1680]);
});

test("qalinlik 0 bo'shliq → o'sha oraliqda taxta yo'q", () => {
  const s = createSheet();
  const v = addLine(s, "V", 100).id;
  const h0 = addLine(s, "H", 0).id;
  const hMid = addLine(s, "H", 720).id;
  const hTop = addLine(s, "H", 2400).id;
  setThickness(s, v, h0, hMid, 16);   // faqat pastki oraliq
  // hMid-hTop = 0 (o'rnatilmagan)
  const boards = boardRuns(s, allThrough).filter((b) => b.line === v);
  assert.equal(boards.length, 1);
  assert.equal(boards[0]!.length, 720);
});
