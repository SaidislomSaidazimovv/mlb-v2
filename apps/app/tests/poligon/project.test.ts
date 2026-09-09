// Persist — project fayli testlari. ASOS: 52§5 (sheet+params+pins+lock; lock mos kelmasa cut list yo'q) + T1 + T9.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync } from "node:fs";
import {
  serializeProject, parseProject, checkProjectIntegrity,
  type Project, type Pin, type StoredRule,
} from "../../src/poligon/model/project.ts";
import { saveProject, loadProject } from "../../src/poligon/model/project-fs.ts";
import { createSheet, addLine, setThickness, addBlock } from "../../src/poligon/model/sheet.ts";
import { lockOf } from "../../src/poligon/model/lock.ts";
import type { Thing } from "../../src/poligon/model/things.ts";

function hinge(uid: string, version: string, overlay: number): Thing {
  return {
    def: {
      id: "blum.hinge." + uid, uid, version, schema: 2, kind: "hinges",
      name: { en: "h" }, fields: [{ name: "overlay", value: overlay, unit: "mm", numeric: true }], refs: [],
    },
    hasDiagram: true, hasExamples: true,
  };
}

/** Kichik, ammo to'liq loyiha: sheet + params + pins + lock. */
function makeProject(index: Map<string, Thing>): Project {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 600).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 720).id;
  setThickness(s, v0, h0, h1, 16);
  setThickness(s, v1, h0, h1, 16);
  const blk = addBlock(s, "base", v0, v1, h0, h1);
  assert.ok(!("rule" in blk));
  const params: StoredRule[] = [
    { layer: "system", property: "carcass.thickness", value: 16, where: [["kind", "==", "base"]] },
  ];
  const pins: Pin[] = [{ partId: "top@v0-v1", property: "banding.front", value: true }];
  const lock = lockOf(["h.blum"], index);
  return { id: "proj-1", sheet: s, params, pins, lock };
}

test("52§5: project = sheet+params+pins+lock; serialize→parse AYNAN bir xil (round-trip)", () => {
  const idx = new Map<string, Thing>([["h.blum", hinge("h.blum", "1.0.0", 16)]]);
  const p = makeProject(idx);
  const back = parseProject(serializeProject(p));
  assert.deepEqual(back, p);
  // to'rt bo'lak ham saqlanadi
  assert.ok(back.sheet.blocks.length === 1);
  assert.equal(back.params[0]?.property, "carcass.thickness");
  assert.equal(back.pins[0]?.value, true);
  assert.equal(back.lock.length, 1);
});

test("fs: saveProject → loadProject aynan tiklaydi", () => {
  const idx = new Map<string, Thing>([["h.blum", hinge("h.blum", "1.0.0", 16)]]);
  const p = makeProject(idx);
  const path = join(tmpdir(), `mlbv2-proj-${Date.now()}.json`);
  try {
    saveProject(path, p);
    assert.deepEqual(loadProject(path), p);
  } finally {
    unlinkSync(path);
  }
});

test("T9: ochilganda Thing O'ZGARMAGAN → integritet TOZA (cut list chiqadi)", () => {
  const idx = new Map<string, Thing>([["h.blum", hinge("h.blum", "1.0.0", 16)]]);
  const p = makeProject(idx);
  assert.deepEqual(checkProjectIntegrity(p, idx), []);
});

test("T9: Thing MAZMUNI o'zgargan → integritet RAD (lock.hash — cut list chiqmaydi)", () => {
  const idx = new Map<string, Thing>([["h.blum", hinge("h.blum", "1.0.0", 16)]]);
  const p = makeProject(idx); // lock overlay=16 da olindi
  const changed = new Map<string, Thing>([["h.blum", hinge("h.blum", "1.0.0", 18)]]); // 16→18
  const r = checkProjectIntegrity(p, changed);
  assert.ok(r.some((x) => x.rule === "lock.hash"));
});

test("T9: Thing YO'QOLGAN → integritet RAD (lock.missing)", () => {
  const idx = new Map<string, Thing>([["h.blum", hinge("h.blum", "1.0.0", 16)]]);
  const p = makeProject(idx);
  const r = checkProjectIntegrity(p, new Map());
  assert.ok(r.some((x) => x.rule === "lock.missing"));
});
