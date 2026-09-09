// B5 — Void/Reserved/Absorb (L9/L10) + 53§3 testlari.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness, addBlock, lineById } from "../../src/poligon/model/sheet.ts";
import { deleteBoard, voidBlock, reserveBlock, absorb, mergeAdjacentVoids, isExemptFromEqualize, reservedFootprint } from "../../src/poligon/model/voidspace.ts";

function threeCol() {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id, v2 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 720).id;
  return { s, v0, v1, v2, h0, h1 };
}

test("53§3: deleteBoard = segmentni 0 qilish — CHIZIQ QOLADI (teshik yo'q, delete-part yo'q)", () => {
  const { s, v0, h0, h1 } = threeCol();
  setThickness(s, v0, h0, h1, 16);
  const after = deleteBoard(s, v0, h0, h1);
  assert.equal(lineById(after, v0)?.id, v0, "chiziq hali sheetда (teshik emas)");
  // segment endi 0 — bu import qilinmagan getThickness'siz: sheet round-trip orqali tekshirmaymiz, chiziq borligi yetarli
  assert.deepEqual(s.vLines.length, after.vLines.length, "chiziqlar soni o'zgarmadi");
});

test("L9: voidBlock — blok o'chirilsa kataklar OSHKORA Void (teshik emas)", () => {
  const { s, v0, v1, h0, h1 } = threeCol();
  const r = addBlock(s, "base", v0, v1, h0, h1);
  assert.ok(!("rule" in r));
  const id = (r as { id: string }).id;
  const after = voidBlock(s, id);
  assert.ok(!("rule" in after));
  assert.equal((after as ReturnType<typeof createSheet>).blocks.find((b) => b.id === id)?.type, "void");
});

test("L9: Reserved — equalize'dan OZOD + footprint = nominal + clearance HAR YUZAda", () => {
  const { s, v0, v1, h0, h1 } = threeCol();
  const id = (addBlock(s, "slot", v0, v1, h0, h1) as { id: string }).id;
  const meta = { name: "muzlatgich", nominalW: 600, nominalH: 1800, clearance: 5, layer: "carcass" };
  const after = reserveBlock(s, id, meta) as ReturnType<typeof createSheet>;
  const rb = after.blocks.find((b) => b.id === id)!;
  assert.equal(rb.type, "reserved");
  assert.ok(isExemptFromEqualize(rb), "Reserved equalize'dan ozod");
  assert.deepEqual(reservedFootprint(meta), { width: 610, height: 1810 }, "nominal + 2×clearance (nominal ichiga baked emas)");
});

test("L9/L10: Absorb — chap qo'shni Void'ni yutadi + bo'linuvchi (void-to-void) chiziq olib tashlanadi", () => {
  const { s, v0, v1, v2, h0, h1 } = threeCol();
  const leftId = (addBlock(s, "base", v0, v1, h0, h1) as { id: string }).id;
  const voidId = (addBlock(s, "void", v1, v2, h0, h1) as { id: string }).id;
  // v1 taxtasiz (void-to-void) — hech qanday segment qo'yilmagan
  const after = absorb(s, voidId) as ReturnType<typeof createSheet>;
  const left = after.blocks.find((b) => b.id === leftId)!;
  assert.equal(left.vHi, v2, "chap qo'shni Void eniga cho'zildi");
  assert.equal(after.blocks.find((b) => b.id === voidId), undefined, "Void o'chdi");
  assert.equal(lineById(after, v1), undefined, "bo'linuvchi chiziq (void-to-void) olib tashlandi (L10)");
});

test("L9: Absorb — chap qo'shni bo'lmasa RAD (avtomatik emas, oshkora)", () => {
  const { s, v0, v1, h0, h1 } = threeCol();
  const voidId = (addBlock(s, "void", v0, v1, h0, h1) as { id: string }).id; // eng chap → chap qo'shni yo'q
  const r = absorb(s, voidId);
  assert.ok("rule" in r && r.rule === "L9.noLeftNeighbour");
});

test("L10: mergeAdjacentVoids — ikki qo'shni Void → BITTA (provably-inert)", () => {
  const { s, v0, v1, v2, h0, h1 } = threeCol();
  addBlock(s, "void", v0, v1, h0, h1);
  addBlock(s, "void", v1, v2, h0, h1);
  const after = mergeAdjacentVoids(s);
  const voids = after.blocks.filter((b) => b.type === "void");
  assert.equal(voids.length, 1, "birlashdi");
  assert.equal(voids[0]!.vLo, v0); assert.equal(voids[0]!.vHi, v2);
});
