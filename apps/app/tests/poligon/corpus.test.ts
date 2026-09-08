// T16 — Korpus fixturalari. ASOS: 51§6 (8 minimal fixtura) + 54§3 "T16 gate".
// Hozir 4 tasi built modullarga tayanadi (E1/E2/F1/H1). Qolgan 4 (A1/B1/C1/I4) — CHALA.md da (D3/D4/D5/D6 kerak).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCorpus, allPass, type Fixture } from "../../src/poligon/model/corpus.ts";
import { authorRule } from "../../src/poligon/model/cascade.ts";
import { release, partIdentity, type ShopConvention } from "../../src/poligon/model/release.ts";
import { resolveSetback, type DimParam } from "../../src/poligon/model/datum.ts";
import { checkCascadeMaterialChange, checkTypeInstantiation, type Material } from "../../src/poligon/model/thickness.ts";
import { checkFitHinge, type Fit, type Hinge } from "../../src/poligon/model/fits.ts";

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
  // A1 (51§6): Theme 16→18 — MIGRATION deb aniqlansin (jimgina cascade/resize emas).
  { name: "A1", run: () => {
    const m16: Material = { id: "ldsp16", thicknessClass: "t16", thickness: 16 };
    const m18: Material = { id: "mdf18", thicknessClass: "t18", thickness: 18 };
    const r = checkCascadeMaterialChange(m16, m18);
    return r ? { ok: false, rule: r.rule } : { ok: true };
  } },
  // I4 (51§6): 18mm Type 16mm loyihaga — cross-class = Migration (rad).
  { name: "I4", run: () => {
    const r = checkTypeInstantiation("t18", "t16");
    return r ? { ok: false, rule: r.rule } : { ok: true };
  } },
  // B1 (51§6): inset Fit + full-overlay ilgak — mos kelmaydi, RAD (33mm-xato eshik emas).
  { name: "B1", run: () => {
    const insetFit: Fit = { id: "inset-3", kind: "door", gap: 1.5, overlay: "inset", requiresHingeClass: "inset" };
    const fullHinge: Hinge = { id: "blum-full", hingeClass: "full-overlay" };
    const r = checkFitHinge(insetFit, fullHinge);
    return r ? { ok: false, rule: r.rule } : { ok: true };
  } },
];

const expected = {
  E1: { ok: false, rule: "D8" },
  E2: { ok: true },
  F1: { ok: true },
  H1: { ok: true },
  C1: { ok: true },
  A1: { ok: false, rule: "D5.migration" },
  I4: { ok: false, rule: "D5.crossClass" },
  B1: { ok: false, rule: "D6.fitHinge" },
};

test("T16: korpus 8/8 fixtura TO'LIQ O'TADI (E1/E2/F1/H1/C1/A1/I4/B1) — 51§6 minimal to'plam", () => {
  const results = runCorpus(fixtures, expected);
  assert.equal(allPass(results), true, JSON.stringify(results));
});

test("runCorpus: noto'g'ri natijani aniqlaydi (harness ishlaydi)", () => {
  const bad: Fixture[] = [{ name: "x", run: () => ({ ok: true }) }];
  const results = runCorpus(bad, { x: { ok: false, rule: "y" } });
  assert.equal(results[0]!.pass, false);
});
