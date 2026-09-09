// D2 — Type-declared params + optional parts testlari (G1/G2/G3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRuleParam, checkEnumValue, resolvePresentParts, type TypeDef } from "../../src/poligon/model/types.ts";
import { createSheet, addLine, setThickness } from "../../src/poligon/model/sheet.ts";
import { derive } from "../../src/poligon/model/derive.ts";
import type { Rule } from "../../src/poligon/model/cascade.ts";
import type { Role } from "../../src/poligon/model/junction.ts";

const baseType: TypeDef = {
  id: "base.cabinet",
  params: [
    { name: "depth", kind: "scalar", unit: "mm", default: 560 },
    { name: "backPanel", kind: "present", default: false },     // G1: optional part
    { name: "backStyle", kind: "enum", options: ["inset", "overlay"] }, // G2
    { name: "shelfCount", kind: "scalar", residual: "last-absorbs" },   // G3
  ],
  parts: ["side", "top", "bottom"],
  optionalParts: [{ part: "back", presentParam: "backPanel" }],
};

test("D2: qoida Type-e'lon qilган paramni yozsa → OK; ad-hoc property → D2.undeclared", () => {
  assert.equal(checkRuleParam("depth", [baseType]), null);
  assert.equal(checkRuleParam("magicSize", [baseType])?.rule, "D2.undeclared");
});

test("D2/G2: enum qiymati options ichida bo'lishi shart", () => {
  const decl = baseType.params.find((p) => p.name === "backStyle")!;
  assert.equal(checkEnumValue(decl, "inset"), null);
  assert.equal(checkEnumValue(decl, "nailed")?.rule, "D2.badEnum");
});

test("D2/G1: qoida part IXTIRO qilolmaydi — optional part faqat present:bool TRUE bo'lsa mavjud", () => {
  assert.deepEqual(resolvePresentParts(baseType, { backPanel: false }), ["side", "top", "bottom"]);
  assert.deepEqual(resolvePresentParts(baseType, { backPanel: true }), ["side", "top", "bottom", "back"]);
  // recipe'da yo'q part (mas. "drawer") hech qanday param bilan paydo bo'lmaydi
  assert.ok(!resolvePresentParts(baseType, { drawer: true }).includes("drawer"));
});

test("D2 derive'da: e'lon qilinmagan property'li qoida → D2.undeclared RAD", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 720).id;
  setThickness(s, v0, h0, h1, 16); setThickness(s, v1, h0, h1, 16);
  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [h0]: "bottom", [h1]: "top" };
  const badRule: Rule = { layer: "system", property: "widthOverride", value: 500, facets: [], match: () => true, pass: "P1" };
  const d = derive(s, { roles, rules: [badRule], types: [baseType] });
  assert.ok(d.refusals.some((r) => r.rule === "D2.undeclared"), "e'lon qilinmagan param → rad");
});
