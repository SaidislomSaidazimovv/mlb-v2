// §2 MUZLATILGAN API smoke-test. ASOS: 54§2 — UI faqat poligon/index.ts dan chaqiradi.
// Re-eksportlar runtime'da yechiladimi + derive→release uchidan-uchiga oqim ishlaydimi.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../../src/poligon/index.ts";

test("§2: barcha asosiy funksiyalar index'dan chiqarilgan", () => {
  for (const fn of [
    "createSheet", "apply", "legalDomain", "derive", "resolve", "blastRadius",
    "release", "diffReleases", "buildIndex", "lockOf", "checkLock",
    "saveProject", "loadProject", "checkProjectIntegrity",
  ] as const) {
    assert.equal(typeof (P as Record<string, unknown>)[fn], "function", `${fn} funksiya bo'lishi kerak`);
  }
});

test("§2 oqim: createSheet → derive → release (uchidan-uchiga)", () => {
  const s = P.createSheet();
  const v0 = P.addLine(s, "V", 0).id;
  const v1 = P.addLine(s, "V", 600).id;
  const h0 = P.addLine(s, "H", 0).id;
  const h1 = P.addLine(s, "H", 720).id;
  P.setThickness(s, v0, h0, h1, 16); P.setThickness(s, v1, h0, h1, 16);
  P.setThickness(s, h0, v0, v1, 16); P.setThickness(s, h1, v0, v1, 16);

  const roles: Record<string, P.Role> = { [v0]: "side", [v1]: "side", [h0]: "bottom", [h1]: "top" };
  const d = P.derive(s, { roles });
  assert.equal(d.refusals.length, 0);
  assert.equal(d.parts.length, 4, "sodda quti = 4 taxta (2 yon + top + bottom)");

  // derive → release (kesim ro'yxati)
  const rel = P.release(
    d.parts.map((p) => ({ role: p.role, boundingLines: [p.board.line], finishedW: p.board.thickness, finishedH: p.board.length })),
    { subtractBanding: false },
  );
  assert.equal(rel.parts.length, 4);
  assert.ok(rel.parts.every((rp) => rp.num >= 1), "har taxta raqamlangan");
});
