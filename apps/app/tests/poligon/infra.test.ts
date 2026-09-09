// 50§6 incremental invalidation + 52§2 fs loadThings testlari.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { newCache, getCached, setCached, invalidateByRule } from "../../src/poligon/model/invalidation.ts";
import { loadThings } from "../../src/poligon/model/things-fs.ts";
import { buildIndex } from "../../src/poligon/model/things.ts";
import type { Rule, Part } from "../../src/poligon/model/cascade.ts";

test("50§6: incremental invalidation — qoida o'zgarganda FAQAT mos partlar keshi o'chadi (blast radius)", () => {
  const c = newCache();
  const parts: Part[] = [{ id: "a", role: "fasad" }, { id: "b", role: "side" }, { id: "c", role: "fasad" }];
  const key = (p: Part) => String(p.id);
  for (const p of parts) setCached(c, key(p), "colour", "oq");
  // fasad'ga tegadigan qoida → faqat a,c keshi o'chadi, b saqlanadi
  const rule: Rule = { layer: "theme", property: "colour", value: "dub", facets: ["role"], match: (p) => p.role === "fasad" };
  const removed = invalidateByRule(c, rule, parts, key);
  assert.equal(removed, 2, "faqat 2 fasad keshi o'chdi");
  assert.equal(getCached(c, "b", "colour").hit, true, "side keshi saqlandi (invalidatsiya emas)");
  assert.equal(getCached(c, "a", "colour").hit, false, "fasad keshi o'chdi → qayta-resolve kerak");
});

test("52§2: haqiqiy fs loadThings — <kind>/<slug>/def.json + diagram.svg + examples/ o'qiydi", () => {
  const dir = join(tmpdir(), `mlbv2-things-${Date.now()}`);
  mkdirSync(join(dir, "hinges", "clip-top", "examples"), { recursive: true });
  writeFileSync(join(dir, "hinges", "clip-top", "def.json"), JSON.stringify({
    id: "blum.hinge.clip-top", uid: "u1", version: "1.0.0", schema: 2, kind: "hinges", name: { en: "Clip top" }, fields: [],
  }));
  writeFileSync(join(dir, "hinges", "clip-top", "diagram.svg"), "<svg/>");
  writeFileSync(join(dir, "hinges", "clip-top", "examples", "600.json"), "{}");
  // diagramsiz Thing — hasDiagram false bo'lishi kerak
  mkdirSync(join(dir, "materials", "ldsp16"), { recursive: true });
  writeFileSync(join(dir, "materials", "ldsp16", "def.json"), JSON.stringify({
    id: "egger.material.ldsp16", uid: "u2", version: "1.0.0", schema: 2, kind: "materials", name: { en: "LDSP" }, fields: [],
  }));
  try {
    const things = loadThings(dir).sort((a, b) => a.def.uid.localeCompare(b.def.uid));
    assert.equal(things.length, 2, "ikki Thing o'qildi");
    assert.equal(things[0]!.def.id, "blum.hinge.clip-top");
    assert.equal(things[0]!.hasDiagram, true); assert.equal(things[0]!.hasExamples, true);
    assert.equal(things[1]!.hasDiagram, false, "diagramsiz → false (canPublish rad qiladi)");
    // buildIndex bilan namespaced index (52§10)
    const idx = buildIndex(things);
    assert.ok(!("rule" in idx) && idx.index.get("u1")?.def.id === "blum.hinge.clip-top");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
