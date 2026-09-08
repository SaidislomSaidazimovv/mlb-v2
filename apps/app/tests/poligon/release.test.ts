// T11 — Release testlari. ASOS: 53§1/§2/§5 + 54§3 "T11 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { release, diffReleases, partIdentity, type InputPart, type ShopConvention } from "../../src/poligon/model/release.ts";

const bandTrim: ShopConvention = { subtractBanding: true };

function part(role: string, lines: string[], w: number, h: number, extra: Partial<InputPart> = {}): InputPart {
  return { role, boundingLines: lines, finishedW: w, finishedH: h, ...extra };
}

test("53§1: finished→cut — 2mm kromka (4 qirra) → cut 4mm kichik", () => {
  const p = part("fasad", ["v1", "v2"], 600, 720, { banding: { top: 2, bottom: 2, left: 2, right: 2 } });
  const r = release([p], bandTrim);
  assert.equal(r.parts[0]!.finishedW, 600);
  assert.equal(r.parts[0]!.cutW, 596); // 600 - 2 - 2
  assert.equal(r.parts[0]!.cutH, 716); // 720 - 2 - 2
});

test("53§1: konvensiya 'cut=finished' bo'lsa — cut o'zgarmaydi", () => {
  const p = part("fasad", ["v1", "v2"], 600, 720, { banding: { top: 2, bottom: 2, left: 2, right: 2 } });
  const r = release([p], { subtractBanding: false });
  assert.equal(r.parts[0]!.cutW, 600);
});

test("53§5: handedness va grain saqlanadi; 0.1mm", () => {
  const p = part("side", ["v1", "h1"], 560.05, 720, { grain: "L", handed: "left" });
  const r = release([p], bandTrim);
  assert.equal(r.parts[0]!.grain, "L");
  assert.equal(r.parts[0]!.handed, "left");
  assert.equal(r.parts[0]!.cutW, 560.1); // 0.1mm yaxlitlash
});

test("T11-GATE: qism raqami IDENTITY bo'yicha barqaror, yangi = keyingi bo'sh, qayta raqamlanmaydi", () => {
  const A = part("side", ["v1"], 560, 720);
  const B = part("shelf", ["h1"], 500, 560);
  const r1 = release([A, B], bandTrim);
  const numA = r1.parts.find((p) => p.id === partIdentity(A))!.num;
  const numB = r1.parts.find((p) => p.id === partIdentity(B))!.num;
  // B o'lchamini o'zgartiramiz + yangi C qo'shamiz
  const B2 = part("shelf", ["h1"], 480, 560);
  const C = part("top", ["h2"], 600, 560);
  const r2 = release([A, B2, C], bandTrim, r1);
  assert.equal(r2.parts.find((p) => p.id === partIdentity(A))!.num, numA); // A raqami o'zgarmadi
  assert.equal(r2.parts.find((p) => p.id === partIdentity(B2))!.num, numB); // B raqami o'zgarmadi
  assert.equal(r2.parts.find((p) => p.id === partIdentity(C))!.num, 3);     // C = keyingi bo'sh
  assert.equal(r2.number, 2);
});

test("T11-GATE: diffReleases — changed/appeared/vanished", () => {
  const A = part("side", ["v1"], 560, 720);
  const B = part("shelf", ["h1"], 500, 560);
  const r1 = release([A, B], bandTrim);
  const B2 = part("shelf", ["h1"], 480, 560); // o'zgargan
  const C = part("top", ["h2"], 600, 560);     // yangi
  const r2 = release([B2, C], bandTrim, r1);    // A endi yo'q (vanished)
  const d = diffReleases(r1, r2);
  const kind = (role: string, lines: string[]) => d.find((x) => x.id === partIdentity(part(role, lines, 0, 0)))?.kind;
  assert.equal(kind("shelf", ["h1"]), "changed");
  assert.equal(kind("top", ["h2"]), "appeared");
  assert.equal(kind("side", ["v1"]), "vanished");
});
