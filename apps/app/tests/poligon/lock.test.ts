// T9 — Lockfile testlari. ASOS: 52§5/§9 + 54§3 "T9 gate".
import { test } from "node:test";
import assert from "node:assert/strict";
import { contentHash, lockOf, checkLock, reverseIndex } from "../../src/poligon/model/lock.ts";
import type { Thing } from "../../src/poligon/model/things.ts";

function thing(uid: string, version: string, overlay: number): Thing {
  return {
    def: {
      id: "blum.hinge." + uid, uid, version, schema: 2, kind: "hinges",
      name: { en: "h" }, fields: [{ name: "overlay", value: overlay, unit: "mm", numeric: true }], refs: [],
    },
    hasDiagram: true, hasExamples: true,
  };
}

test("contentHash: deterministik (bir mazmun → bir hash; o'zgarsa → boshqa)", () => {
  const a = thing("uA", "1.0.0", 16);
  assert.equal(contentHash(a), contentHash(thing("uA", "1.0.0", 16)));
  assert.notEqual(contentHash(a), contentHash(thing("uA", "1.0.0", 18)));
});

test("T9-GATE: bir loyiha + bir qulf → MOS (cut list chiqadi = reproducible)", () => {
  const idx = new Map<string, Thing>([["uA", thing("uA", "1.0.0", 16)]]);
  const lock = lockOf(["uA"], idx);
  assert.deepEqual(checkLock(lock, idx), []); // mos → cut list chiqadi
});

test("T9-GATE: Thing VERSION o'zgargan → lock.version RAD (cut list chiqmaydi)", () => {
  const lock = lockOf(["uA"], new Map([["uA", thing("uA", "1.0.0", 16)]]));
  const changed = new Map<string, Thing>([["uA", thing("uA", "1.1.0", 16)]]);
  const r = checkLock(lock, changed);
  assert.ok(r.some((x) => x.rule === "lock.version"));
});

test("T9-GATE: Thing MAZMUNI o'zgargan (version bir xil) → lock.hash RAD", () => {
  const lock = lockOf(["uA"], new Map([["uA", thing("uA", "1.0.0", 16)]]));
  const changed = new Map<string, Thing>([["uA", thing("uA", "1.0.0", 18)]]); // overlay 16→18
  const r = checkLock(lock, changed);
  assert.ok(r.some((x) => x.rule === "lock.hash"));
});

test("Thing YO'QOLGAN → lock.missing RAD", () => {
  const lock = lockOf(["uA"], new Map([["uA", thing("uA", "1.0.0", 16)]]));
  const r = checkLock(lock, new Map()); // bo'sh indeks
  assert.ok(r.some((x) => x.rule === "lock.missing"));
});

test("reverseIndex: qaysi loyihalar qaysi Thing'dan foydalanadi (52§9)", () => {
  const idx = new Map<string, Thing>([["uA", thing("uA", "1.0.0", 16)], ["uB", thing("uB", "1.0.0", 20)]]);
  const p1 = { id: "p1", lock: lockOf(["uA", "uB"], idx) };
  const p2 = { id: "p2", lock: lockOf(["uA"], idx) };
  const rev = reverseIndex([p1, p2]);
  assert.deepEqual(rev.get("uA"), ["p1", "p2"]);
  assert.deepEqual(rev.get("uB"), ["p1"]);
});
