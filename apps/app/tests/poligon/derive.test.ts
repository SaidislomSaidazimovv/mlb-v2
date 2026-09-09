// derive() — §2 birlashtiruvchi testlari. ASOS: 54§2 + T2/T3 darvozalari (800-korpus, penal+baza 2400).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness } from "../../src/poligon/model/sheet.ts";
import { derive, type Profile } from "../../src/poligon/model/derive.ts";
import type { Role } from "../../src/poligon/model/junction.ts";

test("T3-GATE: penal + baza umumiy YON chiziqni bo'lishsa → BITTA 2400 taxta (T-birlashma, kesilmaydi)", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 600).id;    // umumiy o'rta yon — to'liq balandlik
  const v2 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id;      // pol
  const h1 = addLine(s, "H", 720).id;    // ish-stoli (faqat baza)
  const h2 = addLine(s, "H", 2400).id;   // shift
  // to'liq balandlik yon panellar
  setThickness(s, v0, h0, h1, 16); setThickness(s, v0, h1, h2, 16);
  setThickness(s, v1, h0, h1, 16); setThickness(s, v1, h1, h2, 16); // umumiy — 0..2400
  setThickness(s, v2, h0, h1, 16);                                   // baza o'ng yon (faqat 0..720)
  // gorizontallar
  setThickness(s, h0, v0, v1, 16); setThickness(s, h0, v1, v2, 16); // pol v0..v2
  setThickness(s, h1, v1, v2, 16);                                  // ish-stoli faqat baza (v1..v2)
  setThickness(s, h2, v0, v1, 16);                                  // penal shift (v0..v1)

  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [v2]: "side", [h0]: "bottom", [h1]: "worktop", [h2]: "top" };
  const d = derive(s, { roles });

  const onV1 = d.parts.filter((p) => p.board.line === v1);
  assert.equal(onV1.length, 1, "umumiy yon = BITTA taxta");
  assert.equal(onV1[0]!.board.length, 2400, "va uzunligi 2400 (ish-stolida kesilmaydi)");
  assert.deepEqual(d.refusals, [], "toza — rad yo'q");
});

test("X-KONTEST: worktop(5) > side(4) → H o'tadi, yon panel ish-stolida KESILADI (2 taxta)", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 600).id;   // ichki, to'liq balandlik
  const v2 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 800).id;   // ichki, to'liq en
  const h2 = addLine(s, "H", 1600).id;
  // to'liq to'r — har segment 16
  for (const v of [v0, v1, v2]) { setThickness(s, v, h0, h1, 16); setThickness(s, v, h1, h2, 16); }
  for (const h of [h0, h1, h2]) { setThickness(s, h, v0, v1, 16); setThickness(s, h, v1, v2, 16); }

  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [v2]: "side", [h0]: "bottom", [h1]: "worktop", [h2]: "top" };
  const d = derive(s, { roles });

  // v1×h1 haqiqiy X: worktop o'tadi
  const jx = d.junctions.find((j) => j.vLine === v1 && j.hLine === h1);
  assert.equal(jx?.through, "H", "worktop side'dan ustun → H o'tadi");
  // v1 (yon) ish-stolida kesiladi → 2 taxta
  assert.equal(d.parts.filter((p) => p.board.line === v1).length, 2);
  // h1 (worktop) to'liq o'tadi → bitta 1200 taxta
  const onH1 = d.parts.filter((p) => p.board.line === h1);
  assert.equal(onH1.length, 1);
  assert.equal(onH1[0]!.board.length, 1200);
});

test("48§2: X-kesishmada rutba TENGLIGI → junction.tie RAD (jimgina default yo'q)", () => {
  const s = createSheet();
  const [v0, v1, v2] = [addLine(s, "V", 0).id, addLine(s, "V", 600).id, addLine(s, "V", 1200).id];
  const [h0, h1, h2] = [addLine(s, "H", 0).id, addLine(s, "H", 800).id, addLine(s, "H", 1600).id];
  for (const v of [v0, v1, v2]) { setThickness(s, v, h0, h1, 16); setThickness(s, v, h1, h2, 16); }
  for (const h of [h0, h1, h2]) { setThickness(s, h, v0, v1, 16); setThickness(s, h, v1, v2, 16); }
  // v1=shelf(2), h1=shelf(2) → teng rutba (50§1 lug'atidan; 'divider' o'chirildi)
  const roles: Record<string, Role> = { [v0]: "side", [v1]: "shelf", [v2]: "side", [h0]: "bottom", [h1]: "shelf", [h2]: "top" };
  const d = derive(s, { roles });
  assert.ok(d.refusals.some((r) => r.rule === "junction.tie"));
});

test("48§2: X-kesishmada rol berilmagan → profile.roleMissing RAD", () => {
  const s = createSheet();
  const [v0, v1, v2] = [addLine(s, "V", 0).id, addLine(s, "V", 600).id, addLine(s, "V", 1200).id];
  const [h0, h1, h2] = [addLine(s, "H", 0).id, addLine(s, "H", 800).id, addLine(s, "H", 1600).id];
  for (const v of [v0, v1, v2]) { setThickness(s, v, h0, h1, 16); setThickness(s, v, h1, h2, 16); }
  for (const h of [h0, h1, h2]) { setThickness(s, h, v0, v1, 16); setThickness(s, h, v1, v2, 16); }
  const roles: Record<string, Role> = { [v0]: "side", [v2]: "side", [h0]: "bottom", [h2]: "top" }; // v1,h1 yo'q
  const d = derive(s, { roles });
  assert.ok(d.refusals.some((r) => r.rule === "profile.roleMissing"));
});

test("T4: transport — modul eni ruxsatdan katta → transport RAD", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 1500).id;
  const h0 = addLine(s, "H", 0).id;
  const h1 = addLine(s, "H", 720).id;
  setThickness(s, v0, h0, h1, 16); setThickness(s, v1, h0, h1, 16);
  setThickness(s, h0, v0, v1, 16); setThickness(s, h1, v0, v1, 16);
  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [h0]: "bottom", [h1]: "top" };
  const d = derive(s, { roles, transport: { maxWidth: 1200 } });
  assert.ok(d.refusals.some((r) => r.rule === "transport"));
});
