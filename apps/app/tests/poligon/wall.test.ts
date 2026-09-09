// B6 — Wall length (L14) testlari.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine } from "../../src/poligon/model/sheet.ts";
import { setWallLength } from "../../src/poligon/model/wall.ts";
import type { Sheet } from "../../src/poligon/model/contracts.ts";

function wall800() {
  const s = createSheet({ width: 800, height: 720 }, { left: { kind: "free", endPanel: 16 }, right: { kind: "free", endPanel: 16 } });
  addLine(s, "V", 400); // ichki chiziq
  return s; // vLines: @8 (chap), @400 (ichki), @792 (o'ng)
}
const ok = (r: Sheet | { rule: string }): Sheet => { assert.ok(!("rule" in r)); return r as Sheet; };

test("L14 proportional: 800→1000 — ichki chiziq mutanosib siljiydi, o'ng outer face = 1000", () => {
  const after = ok(setWallLength(wall800(), 1000, "proportional"));
  const xs = after.vLines.map((l) => l.pos);
  assert.equal(xs[0], 8, "chap uch anchor");
  assert.equal(xs[2]! + 16 / 2, 1000, "o'ng outer face = newWidth");
  assert.ok(xs[1]! > 400 && xs[1]! < xs[2]!, "ichki chiziq kattaroq oraliqqa mutanosib ko'chdi");
  assert.equal(after.opening?.width, 1000, "opening yangilandi");
});

test("L14 last-absorbs: 800→1000 — ichki chiziq JOYIDA, oxirgi ustun farqni yutadi", () => {
  const after = ok(setWallLength(wall800(), 1000, "last-absorbs"));
  const xs = after.vLines.map((l) => l.pos);
  assert.equal(xs[1], 400, "ichki chiziq o'zgarmadi");
  assert.equal(xs[2]! + 8, 1000, "o'ng outer = 1000 (oxirgi ustun yutdi)");
});

test("L14: qayta taqsimlash minimumni buzsa → L14.minGap RAD (baland ovoz, jimgina clamp emas)", () => {
  const r = setWallLength(wall800(), 120, "proportional", 200);
  assert.ok("rule" in r && r.rule === "L14.minGap");
});

test("L16: natija pozitsiyalari BUTUN mm; newWidth butun bo'lmasa → L16 RAD", () => {
  const after = ok(setWallLength(wall800(), 977, "proportional"));
  assert.ok(after.vLines.every((l) => Number.isInteger(l.pos)), "hammasi butun");
  assert.ok("rule" in setWallLength(wall800(), 977.5, "proportional"));
});

test("L14: deterministik — bir xil kirish → bir xil chiqish", () => {
  const a = ok(setWallLength(wall800(), 950, "proportional")).vLines.map((l) => l.pos);
  const b = ok(setWallLength(wall800(), 950, "proportional")).vLines.map((l) => l.pos);
  assert.deepEqual(a, b);
});
