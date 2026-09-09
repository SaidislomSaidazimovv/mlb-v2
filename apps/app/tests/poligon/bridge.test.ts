// Parity ko'prigi (carcassSheet) testi — poligon parts eski engine konvensiyasiga mos (side=H, top=W−2t).
import { test } from "node:test";
import assert from "node:assert/strict";
import { carcassSheet } from "../../src/poligon/bridge.ts";
import { derive } from "../../src/poligon/model/derive.ts";

test("carcassSheet 600×720×560: side=720 (H), top/bottom=568 (W−2t) — eski engine bilan bir xil konvensiya", () => {
  const { sheet, roles, rules } = carcassSheet({ width: 600, height: 720, depth: 560 });
  const d = derive(sheet, { roles, rules });
  const sides = d.parts.filter((p) => p.role === "side");
  const top = d.parts.find((p) => p.role === "top")!;
  const bottom = d.parts.find((p) => p.role === "bottom")!;
  assert.equal(sides.length, 2);
  assert.equal(sides[0]!.finishedLength, 720, "side = H (tashqi balandlik)");
  assert.equal(top.finishedLength, 568, "top = W − 2t = 600−32");
  assert.equal(bottom.finishedLength, 568, "bottom = W − 2t");
  assert.equal(sides[0]!.depth, 560, "chuqurlik cascade'dan");
  assert.deepEqual(d.refusals, [], "toza");
});

test("carcassSheet polka bilan: shelf = W−2t (sidelar orasida butt)", () => {
  const { sheet, roles, rules } = carcassSheet({ width: 600, height: 720, depth: 560, shelfYs: [360] });
  const d = derive(sheet, { roles, rules });
  const shelf = d.parts.find((p) => p.role === "shelf")!;
  assert.equal(shelf.finishedLength, 568, "polka = W−2t");
});
