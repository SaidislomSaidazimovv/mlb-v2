// T8 — Thing loader testlari. ASOS: 52 + 54§3 "T8 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { canPublish, buildIndex, type Thing, type Ownership } from "../../src/poligon/model/things.ts";

const ownership: Ownership = { overlay: "hinges", gap: "hinges", thickness: "materials" };

function valid(): Thing {
  return {
    def: {
      id: "blum.hinge.clip-110", uid: "01J8K2QF7M", version: "1.0.0", schema: 2, kind: "hinges",
      name: { en: "CLIP 110", uz: "CLIP 110" },
      fields: [{ name: "overlay", value: 16, unit: "mm", numeric: true }],
      refs: [],
    },
    hasDiagram: true, hasExamples: true,
  };
}

test("canPublish: to'g'ri Thing → bo'sh (publish OK)", () => {
  assert.deepEqual(canPublish(valid(), ownership), []);
});

test("T8-GATE: diagramsiz Thing → publish.diagram RAD", () => {
  const t = valid(); t.hasDiagram = false;
  const r = canPublish(t, ownership);
  assert.ok(r.some((x) => x.rule === "publish.diagram"));
});

test("T8-GATE: o'zi egasi bo'lmagan maydonni yozsa → publish.ownership RAD (52§6)", () => {
  const t = valid();
  t.def.fields.push({ name: "thickness", value: 18, unit: "mm", numeric: true }); // thickness = materials egaligida
  const r = canPublish(t, ownership);
  assert.ok(r.some((x) => x.rule === "publish.ownership"));
});

test("raqamli maydon birliksiz → publish.unit RAD (52§4)", () => {
  const t = valid();
  t.def.fields = [{ name: "overlay", value: 16, numeric: true }]; // unit yo'q
  assert.ok(canPublish(t, ownership).some((x) => x.rule === "publish.unit"));
});

test("ifoda/kod qiymati → publish.declarative RAD (52§7)", () => {
  const t = valid();
  t.def.fields = [{ name: "overlay", value: "x => x*2" }];
  assert.ok(canPublish(t, ownership).some((x) => x.rule === "publish.declarative"));
});

test("buildIndex: uid bo'yicha indeks + asiklik OK", () => {
  const a = valid(); a.def.id = "a"; a.def.uid = "uA"; a.def.refs = ["b"];
  const b = valid(); b.def.id = "b"; b.def.uid = "uB"; b.def.refs = [];
  const r = buildIndex([a, b]);
  assert.ok("index" in r);
  if ("index" in r) assert.equal(r.index.get("uA")!.def.id, "a");
});

test("buildIndex: tsiklik havola → refs.cycle RAD (52§10)", () => {
  const a = valid(); a.def.id = "a"; a.def.uid = "uA"; a.def.refs = ["b"];
  const b = valid(); b.def.id = "b"; b.def.uid = "uB"; b.def.refs = ["a"]; // tsikl
  const r = buildIndex([a, b]);
  assert.equal((r as { rule: string }).rule, "refs.cycle");
});
