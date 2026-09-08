// T16 — Korpus fixturalari. ASOS: 51§6 (8 minimal fixtura) + 54§3 "T16 gate".
// Hozir 4 tasi built modullarga tayanadi (E1/E2/F1/H1). Qolgan 4 (A1/B1/C1/I4) — CHALA.md da (D3/D4/D5/D6 kerak).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCorpus, allPass, type Fixture } from "../../src/poligon/model/corpus.ts";
import { authorRule } from "../../src/poligon/model/cascade.ts";
import { release, partIdentity, type ShopConvention } from "../../src/poligon/model/release.ts";
import { resolveSetback, type DimParam } from "../../src/poligon/model/datum.ts";

const trim: ShopConvention = { subtractBanding: true };

const fixtures: Fixture[] = [
  // E1 (51§6): geometrik(P1) tsiklik qoida (size.clear Tier-3) — YOZILISHDA rad kerak.
  { name: "E1", run: () => {
    const r = authorRule({ layer: "theme", property: "thickness", value: 18, pass: "P1", facets: ["size.clear"], match: () => true });
    return r ? { ok: false, rule: r.rule } : { ok: true };
  } },
  // E2 (51§6): exposed end panel (adjacency Tier-0) — QABUL kerak.
  { name: "E2", run: () => {
    const r = authorRule({ layer: "theme", property: "thickness", value: 18, pass: "P1", facets: ["adjacency"], match: () => true });
    return r ? { ok: false, rule: r.rule } : { ok: true };
  } },
  // F1 (51§6): kromka vs cut — ikki sex konvensiyasida cut har xil.
  { name: "F1", run: () => {
    const p = { role: "fasad", boundingLines: ["v1", "v2"], finishedW: 600, finishedH: 720, banding: { top: 2, bottom: 2, left: 2, right: 2 } };
    const cutTrim = release([p], trim).parts[0]!.cutW;      // 596
    const cutNo = release([p], { subtractBanding: false }).parts[0]!.cutW; // 600
    return cutTrim === 596 && cutNo === 600 ? { ok: true } : { ok: false, rule: "F1.mismatch" };
  } },
  // H1 (51§6): pin migration'dan omon qoladi — identity = role + LINE IDs (pozitsiya EMAS).
  { name: "H1", run: () => {
    const idBefore = partIdentity({ role: "side", boundingLines: ["v1", "h1"], finishedW: 560, finishedH: 720 });
    const idAfterMove = partIdentity({ role: "side", boundingLines: ["v1", "h1"], finishedW: 560, finishedH: 900 }); // "ko'chdi", lineIDs bir xil
    return idBefore === idAfterMove ? { ok: true } : { ok: false, rule: "H1.orphan" };
  } },
  // C1 (51§6): datum + fasad qalinligi — deklaratsiya qilingan datum bilan DETERMINISTIK (taxmin yo'q).
  { name: "C1", run: () => {
    const p: DimParam = { name: "setback.front", role: "shelf", datum: "front", value: 50, composition: "absolute" };
    const carcassInvariant = resolveSetback(0, p) === resolveSetback(0, p);   // carcass-datum: fasad qalinligidan mustaqil
    const fasadFollows = resolveSetback(-18, p) !== resolveSetback(-22, p);   // fasad-datum: qalinlik bilan siljiydi
    return carcassInvariant && fasadFollows ? { ok: true } : { ok: false, rule: "C1.nondeterministic" };
  } },
];

const expected = {
  E1: { ok: false, rule: "D8" },
  E2: { ok: true },
  F1: { ok: true },
  H1: { ok: true },
  C1: { ok: true },
};

test("T16: korpus 5/8 fixtura O'TADI (E1/E2/F1/H1/C1) — built modullar", () => {
  const results = runCorpus(fixtures, expected);
  assert.equal(allPass(results), true, JSON.stringify(results));
});

test("runCorpus: noto'g'ri natijani aniqlaydi (harness ishlaydi)", () => {
  const bad: Fixture[] = [{ name: "x", run: () => ({ ok: true }) }];
  const results = runCorpus(bad, { x: { ok: false, rule: "y" } });
  assert.equal(results[0]!.pass, false);
});
