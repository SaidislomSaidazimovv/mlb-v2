// T7 — Cascade + stratifikatsiya testlari. ASOS: 50§2/§6 + 51 D8 + 54§3 "T7 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, authorRule, blastRadius, type Rule, type Part } from "../../src/poligon/model/cascade.ts";

const anyPart: Part = { role: "fasad", zone: "base" };

test("resolve: ENG YUQORI mos qatlam yutadi (project vs module) (50§2)", () => {
  const rules: Rule[] = [
    { layer: "project", property: "fasad_color", value: "white", facets: ["role"], match: () => true },
    { layer: "module", property: "fasad_color", value: "oak", facets: ["module"], match: () => true },
  ];
  const r = resolve(anyPart, "fasad_color", rules);
  assert.deepEqual(r, { value: "oak", layer: "module" }); // module > project
});

test("resolve: bir qatlamda kelishmovchilik → Conflict RAD (tiebreak yo'q) (50§2)", () => {
  const rules: Rule[] = [
    { layer: "theme", property: "c", value: "red", facets: [], match: () => true },
    { layer: "theme", property: "c", value: "blue", facets: [], match: () => true },
  ];
  const r = resolve(anyPart, "c", rules);
  assert.equal((r as { rule: string }).rule, "Conflict");
});

test("resolve: hech topilmasa → Incomplete RAD (50§2)", () => {
  const r = resolve(anyPart, "yoq_property", []);
  assert.equal((r as { rule: string }).rule, "Incomplete");
});

test("T7-GATE E1: geometrik(P1) qoida Tier-3 (size.clear) → D8 RAD (yozilishda) (51 D8)", () => {
  const e1: Rule = {
    layer: "theme", property: "thickness", value: 18, pass: "P1",
    facets: ["size.clear"], match: () => true, // 900dan keng → tsikl
  };
  assert.equal(authorRule(e1)?.rule, "D8");
});

test("T7-GATE E2: geometrik(P1) qoida Tier-0 (adjacency) → QABUL (51 E2)", () => {
  const e2: Rule = {
    layer: "theme", property: "thickness", value: 18, pass: "P1",
    facets: ["adjacency"], match: () => true, // exposed end panel — topologiya
  };
  assert.equal(authorRule(e2), null);
});

test("appearance(P4) qoida Tier-3 facetga tayansa — RUXSAT (faqat P1 cheklangan)", () => {
  const p4: Rule = {
    layer: "theme", property: "kromka", value: "2mm", pass: "P4",
    facets: ["edge_exposure"], match: () => true,
  };
  assert.equal(authorRule(p4), null);
});

test("blastRadius: qoida qaysi partlarga tegadi (50§6)", () => {
  const parts: Part[] = [{ role: "fasad" }, { role: "side" }, { role: "fasad" }];
  const rule: Rule = { layer: "theme", property: "c", value: "x", facets: ["role"], match: (p) => p.role === "fasad" };
  assert.equal(blastRadius(parts, rule).length, 2);
});
