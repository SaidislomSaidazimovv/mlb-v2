// D10 — atomik Theme install testlari (50§4 + D2s/D3s).
import { test } from "node:test";
import assert from "node:assert/strict";
import { installTheme, type Theme } from "../../src/poligon/model/install.ts";
import type { Rule, Part } from "../../src/poligon/model/cascade.ts";

const parts: Part[] = [{ role: "fasad" }, { role: "side" }, { role: "fasad" }];

test("D10/50§4: ikki qoida bir qatlam bir property turli qiymat (co-match) → install.conflict (atomik refuse)", () => {
  const theme: Theme = {
    id: "t.conflict",
    rules: [
      { layer: "theme", property: "colour", value: "oq", facets: [], match: () => true },
      { layer: "theme", property: "colour", value: "dub", facets: [], match: () => true }, // ikkalasi ham hamma partga
    ],
  };
  const r = installTheme(theme, [], parts, new Set());
  assert.ok("rule" in r && r.rule === "install.conflict", "konflikt → butun install refuse");
});

test("D10/50§4: facet contract — Theme kutgan facet loyihada yo'q → install.facetContract", () => {
  const theme: Theme = { id: "t.island", rules: [], requiresFacets: ["tag:island"] };
  const r = installTheme(theme, [], parts, new Set(["role", "zone"]));
  assert.ok("rule" in r && r.rule === "install.facetContract");
});

test("D10/D3s: domain-miss HISOBOT — qoida ba'zi partга mos, qolgani fall-through (xato EMAS)", () => {
  const theme: Theme = {
    id: "t.fasad",
    rules: [{ layer: "theme", property: "colour", value: "oq", facets: ["role"], match: (p) => p.role === "fasad" }],
  };
  const r = installTheme(theme, [], parts, new Set(["role"]));
  assert.ok(!("rule" in r), "domain-miss xato emas — install o'tadi");
  if (!("rule" in r)) {
    assert.deepEqual(r.report, [{ property: "colour", matched: 2, total: 3 }], "3 dan 2 fasad; 1 fall-through");
    assert.equal(r.rules.length, 1, "atomik: butun ruleset");
  }
});
