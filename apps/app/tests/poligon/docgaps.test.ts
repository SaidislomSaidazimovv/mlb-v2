// Qolgan hujjat qismlari: 48§6 standards+fill · 50 Law C pin · 50§6 ledger · 52 catalog · 53§1 preflight ·
// 53§2 status · 53§3/§5 attached/handedness.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STANDARDS, fillModules } from "../../src/poligon/model/profile.ts";
import { checkPinAlive, offerPromotion } from "../../src/poligon/model/pins.ts";
import { changeLedger } from "../../src/poligon/model/ledger.ts";
import { preflight } from "../../src/poligon/model/preflight.ts";
import { forkThing, retireThing, pickerList, makeCollection } from "../../src/poligon/model/catalog.ts";
import { removeAttached, isHanded, checkHandedness } from "../../src/poligon/model/attached.ts";
import { setReleaseStatus, type Release } from "../../src/poligon/model/release.ts";
import type { Pin } from "../../src/poligon/model/project.ts";
import type { Thing } from "../../src/poligon/model/things.ts";

test("48§6: standards profile aniq qiymatlar + fill gesture (≤900 modul, butun mm, leftmost-absorbs)", () => {
  assert.equal(DEFAULT_STANDARDS.plinth, 100);
  assert.equal(DEFAULT_STANDARDS.worktop, 850);
  assert.equal(DEFAULT_STANDARDS.fartuk, 600);
  assert.equal(DEFAULT_STANDARDS.upper, 720);
  const mods = fillModules(2500, 900); // 3 modul
  assert.equal(mods.length, 3);
  assert.equal(mods.reduce((a, b) => a + b, 0), 2500, "yig'indi = en (residual singidi)");
  assert.ok(mods.every((m) => m <= 900 && Number.isInteger(m)));
});

test("50 Law C: pin orphan (part yo'q) + 3x → promote taklifi", () => {
  const pin: Pin = { partId: "side#v0,v1", property: "colour", value: "dub" };
  assert.equal(checkPinAlive(pin, new Set(["boshqa"]))?.rule, "pin.orphan");
  assert.equal(checkPinAlive(pin, new Set(["side#v0,v1"])), null);
  const pins: Pin[] = [
    { partId: "a", property: "colour", value: "dub" },
    { partId: "b", property: "colour", value: "dub" },
    { partId: "c", property: "colour", value: "dub" },
  ];
  const offers = offerPromotion(pins, 3);
  assert.equal(offers.length, 1);
  assert.equal(offers[0]!.count, 3);
});

test("50§6: change ledger — diffdan inson-o'qir xulosa", () => {
  const l = changeLedger([{ id: "1", num: 1, kind: "changed" }, { id: "2", num: 2, kind: "appeared" }], -4.2);
  assert.equal(l.changed, 1); assert.equal(l.appeared, 1); assert.equal(l.priceDelta, -4.2);
  assert.ok(l.text.includes("narx -4.2"));
});

test("52§4/§10: fork (forked_from) · retire (picker'dan yo'qoladi) · collection manifest", () => {
  const t: Thing = { def: { id: "blum.hinge.x", uid: "u1", version: "1.0.0", schema: 2, kind: "hinges", name: { en: "x" }, fields: [] }, hasDiagram: true, hasExamples: true };
  const f = forkThing(t, "u2");
  assert.equal(f.def.origin?.forked_from, "blum.hinge.x@1.0.0");
  const r = retireThing(t);
  assert.equal(r.def.retired, true);
  assert.equal(pickerList([r]).length, 0, "retired picker'dan yo'qoladi");
  assert.deepEqual(makeCollection("c", "theme", [t]).manifest, ["u1"]);
});

test("53§1: pre-flight — estimated devor + kromkasiz exposed qirra ro'yxatga tushadi", () => {
  const items = preflight({ wallMeasured: false, rankTies: [], exposedNoKromka: ["P-3"], reservedNoFiller: [], modulesOverTransport: [], overrideConflicts: [] });
  assert.ok(items.some((i) => i.rule === "preflight.wallEstimated"));
  assert.ok(items.some((i) => i.rule === "preflight.noKromka"));
  assert.equal(preflight({ wallMeasured: true, rankTies: [], exposedNoKromka: [], reservedNoFiller: [], modulesOverTransport: [], overrideConflicts: [] }).length, 0);
});

test("53§2: release status draft→released", () => {
  const rel: Release = { number: 1, parts: [], status: "draft" };
  assert.equal(setReleaseStatus(rel, "released").status, "released");
});

test("53§3/§5: attached o'chirish egadan; handedness majburiy (kromkalangan/teshilgan → mirror)", () => {
  const items = [{ id: "h1", owner: "m1", kind: "hinge" as const }, { id: "h2", owner: "m1", kind: "hinge" as const }];
  assert.equal(removeAttached(items, "h1").length, 1);
  assert.equal(isHanded(true, false), true);
  assert.equal(checkHandedness(true, false, undefined)?.rule, "handedness.required");
  assert.equal(checkHandedness(true, false, "left"), null);
  assert.equal(checkHandedness(false, false, undefined), null, "kromkasiz+teshiksiz → handed shart emas");
});
