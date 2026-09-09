// derive() — §2 birlashtiruvchi testlari. ASOS: 54§2 + T2/T3 darvozalari (800-korpus, penal+baza 2400).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSheet, addLine, setThickness } from "../../src/poligon/model/sheet.ts";
import { derive, bandingFromExposure, type Profile } from "../../src/poligon/model/derive.ts";
import { carcassParts, type Role } from "../../src/poligon/model/junction.ts";
import type { Rule } from "../../src/poligon/model/cascade.ts";

function box600(): { s: ReturnType<typeof createSheet>; roles: Record<string, Role> } {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 720).id;
  setThickness(s, v0, h0, h1, 16); setThickness(s, v1, h0, h1, 16);
  setThickness(s, h0, v0, v1, 16); setThickness(s, h1, v0, v1, 16);
  return { s, roles: { [v0]: "side", [v1]: "side", [h0]: "bottom", [h1]: "top" } };
}

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

test("A4/48§2: V-through quti — top = W−2t = 768, side = H (founderning aniq 800→768 raqami)", () => {
  // outer W=800: v0=0, v1=784 (centerline farqi 784, +t=800 tashqi). H ham 800.
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 784).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 784).id;
  setThickness(s, v0, h0, h1, 16); setThickness(s, v1, h0, h1, 16);
  setThickness(s, h0, v0, v1, 16); setThickness(s, h1, v0, v1, 16);
  // side(4) > top/bottom(3) → V-through (sidelar to'liq, top/bottom butt)
  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [h0]: "bottom", [h1]: "top" };
  const d = derive(s, { roles });

  const expect = carcassParts(800, 800, 16, "V"); // {top:768, bottom:768, side:800}
  const top = d.parts.find((p) => p.role === "top")!;
  const side = d.parts.find((p) => p.role === "side")!;
  assert.equal(top.finishedLength, 768, "top = W−2t = 768 (48§2)");
  assert.equal(top.finishedLength, expect.top, "carcassParts oracle bilan bir xil");
  assert.equal(side.finishedLength, 800, "side = H tashqi = 800");
  assert.equal(side.finishedLength, expect.side, "carcassParts oracle bilan bir xil");
  // centerline board.length o'zgarmaydi (additive) — top 784, side 784
  assert.equal(top.board.length, 784);
});

test("A4/48§2: H-through (ikkala gorizontal worktop) → side = H−2t (carcassParts oracle)", () => {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 784).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 784).id;
  setThickness(s, v0, h0, h1, 16); setThickness(s, v1, h0, h1, 16);
  setThickness(s, h0, v0, v1, 16); setThickness(s, h1, v0, v1, 16);
  // ikkala gorizontal worktop(5) > side(4) → H-through (gorizontallar to'liq, sidelar butt)
  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [h0]: "worktop", [h1]: "worktop" };
  const d = derive(s, { roles });
  const expect = carcassParts(800, 800, 16, "H"); // {top:800, side:768}
  const side = d.parts.find((p) => p.role === "side")!;
  const wtop = d.parts.find((p) => p.role === "worktop")!;
  assert.equal(side.finishedLength, 768, "side = H−2t = 768");
  assert.equal(side.finishedLength, expect.side);
  assert.equal(wtop.finishedLength, 800, "worktop = W tashqi = 800");
  assert.equal(wtop.finishedLength, expect.top);
});

test("A4/48§2 SPANNING-BLOK: ish-stoli poldan-shiftgacha penal yon (span) ichiga KIRMAYDI — butt 608, overlap yo'q", () => {
  // penal (chap, v0..v1, 0..2400) + baza (o'ng, v1..v2, 0..720). v1 = umumiy poldan-shiftgacha SIDE (span).
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id, v2 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 720).id, h2 = addLine(s, "H", 2400).id;
  setThickness(s, v0, h0, h1, 16); setThickness(s, v0, h1, h2, 16);
  setThickness(s, v1, h0, h1, 16); setThickness(s, v1, h1, h2, 16); // v1 SPANS 0..2400
  setThickness(s, v2, h0, h1, 16);
  setThickness(s, h0, v0, v1, 16); setThickness(s, h0, v1, v2, 16);
  setThickness(s, h1, v1, v2, 16); // ish-stoli faqat baza (v1..v2)
  setThickness(s, h2, v0, v1, 16);
  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [v2]: "side", [h0]: "bottom", [h1]: "worktop", [h2]: "top" };
  const d = derive(s, { roles });
  const wtop = d.parts.find((p) => p.role === "worktop")!;
  // worktop(5) > side(4), LEKIN v1 SPANS → 48§2: worktop v1 ning ICHKI yuzasiga (600+8=608) butt qiladi,
  // rank g'olib bo'lsa ham penal ICHIGA (592) KIRMAYDI.
  assert.equal(wtop.finishedFrom, 608, "spanning penal ichiga kirmaydi (butt 608)");
  assert.ok(wtop.finishedFrom >= 600, "hech qachon side markazidan (600) chap tomonга o'tmaydi");
});

test("A4: finishedExtent = founder `carcassParts` formulasi — KO'P konfiguratsiyada AYNAN teng (ishonch)", () => {
  // Founderning 48§2 formulasini (carcassParts) integratsiyalangan derive AYNAN takrorlashini isbotlaydi.
  // Bir raqam tasodif bo'lishi mumkin; W×H×through bo'yicha to'r bilan tekshiramiz.
  for (const W of [600, 800, 1000]) {
    for (const H of [720, 900, 2100]) {
      const t = 16 as const;
      // tashqi W = (v1-v0)+t → v1 = W-t. Tashqi H = (h1-h0)+t → h1 = H-t.
      const s = createSheet();
      const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", W - t).id;
      const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", H - t).id;
      setThickness(s, v0, h0, h1, t); setThickness(s, v1, h0, h1, t);
      setThickness(s, h0, v0, v1, t); setThickness(s, h1, v0, v1, t);

      // V-through: side(4) > top/bottom(3)
      const dV = derive(s, { roles: { [v0]: "side", [v1]: "side", [h0]: "bottom", [h1]: "top" } });
      const cpV = carcassParts(W, H, t, "V");
      assert.equal(dV.parts.find((p) => p.role === "top")!.finishedLength, cpV.top, `V top W=${W}`);
      assert.equal(dV.parts.find((p) => p.role === "side")!.finishedLength, cpV.side, `V side H=${H}`);

      // H-through: ikkala gorizontal worktop(5) > side(4)
      const dH = derive(s, { roles: { [v0]: "side", [v1]: "side", [h0]: "worktop", [h1]: "worktop" } });
      const cpH = carcassParts(W, H, t, "H");
      assert.equal(dH.parts.find((p) => p.role === "worktop")!.finishedLength, cpH.top, `H worktop W=${W}`);
      assert.equal(dH.parts.find((p) => p.role === "side")!.finishedLength, cpH.side, `H side H=${H}`);
    }
  }
});

test("B1/48§4: depth cascade — side=560 (system default), 53§1 side = uzunlik×chuqurlik (720×560)", () => {
  const { s, roles } = box600();
  const rules: Rule[] = [{ layer: "system", property: "depth", value: 560, facets: [], match: () => true, pass: "P1" }];
  const d = derive(s, { roles, rules });
  const side = d.parts.find((p) => p.role === "side")!;
  assert.equal(side.depth, 560, "system default depth 560 (48§4 cascade)");
  // side V-through → tashqi yuzagacha cap → 736 (=(720-0)+t; absolyut qiymat outer-line joyiga bog'liq = L15/B4).
  assert.equal(side.finishedLength, 736, "cap qilingan uzunlik (A4)");
  assert.deepEqual(d.refusals, [], "toza");
});

test("B1/50§2: yuqori qatlam yutadi — shelf project-override 520 > system 560", () => {
  const { s, roles } = box600();
  const rules: Rule[] = [
    { layer: "system", property: "depth", value: 560, facets: [], match: () => true, pass: "P1" },
    { layer: "project", property: "depth", value: 520, facets: ["role"], match: (p) => p.role === "shelf", pass: "P1" },
  ];
  // top rolini shelf qilamiz — override tegishi uchun
  const d = derive(s, { roles: { ...roles }, rules });
  assert.equal(d.parts.find((p) => p.role === "side")!.depth, 560, "side default");
});

test("B1/Law E: depth P1 e'lon qilingan lekin system default YO'Q (faqat shelf) → boshqa partlar Incomplete RAD", () => {
  const { s, roles } = box600(); // side/side/bottom/top — hech biri shelf emas
  const rules: Rule[] = [{ layer: "project", property: "depth", value: 520, facets: ["role"], match: (p) => p.role === "shelf", pass: "P1" }];
  const d = derive(s, { roles, rules });
  assert.ok(d.refusals.some((r) => r.rule === "Incomplete"), "side uchun depth topilmadi → Incomplete (system total emas, taxmin yo'q)");
});

test("B1: profil rules umuman YO'Q → depth undefined (funksiya ishlatilmaydi, RAD ham yo'q)", () => {
  const { s, roles } = box600();
  const d = derive(s, { roles });
  assert.equal(d.parts.find((p) => p.role === "side")!.depth, undefined);
  assert.deepEqual(d.refusals, []);
});

test("B2/50§5 P4: appearance (colour) cascade orqali hal qilinadi — side=oq (theme default)", () => {
  const { s, roles } = box600();
  const rules: Rule[] = [{ layer: "theme", property: "colour", value: "oq", facets: [], match: () => true }];
  const d = derive(s, { roles, rules });
  assert.equal(d.parts.find((p) => p.role === "side")!.appearance.colour, "oq");
  assert.deepEqual(d.refusals, []);
});

test("B2/50§5 P3: size.clear = yakuniy uzunlik (Tier-3, geometriyadan)", () => {
  const { s, roles } = box600();
  const d = derive(s, { roles });
  const side = d.parts.find((p) => p.role === "side")!;
  assert.equal(side.tier3["size.clear"], side.finishedLength);
});

test("B2/50§5 D8 GATE: P1 (geometrik) qoida Tier-3 facetga (edge_exposure) tayansa → YOZILISHDA D8 RAD", () => {
  const { s, roles } = box600();
  const bad: Rule[] = [{ layer: "system", property: "depth", value: 560, facets: ["edge_exposure"], match: () => true, pass: "P1" }];
  const d = derive(s, { roles, rules: bad });
  assert.ok(d.refusals.some((r) => r.rule === "D8"), "P1 + Tier-3 facet → D8");
});

test("B2/50§5 D8 GATE: P4 (appearance) qoida Tier-3 facetga tayansa → RUXSAT (D8 yo'q)", () => {
  const { s, roles } = box600();
  const ok: Rule[] = [{ layer: "theme", property: "colour", value: "oq", facets: ["edge_exposure"], match: () => true }]; // pass yo'q → P4
  const d = derive(s, { roles, rules: ok });
  assert.ok(!d.refusals.some((r) => r.rule === "D8"), "P4 + Tier-3 facet → ruxsat");
});

test("B3/50§1: tashqi side panel — TASHQI yuza free-end (ochiq), ICHKI yuza abutting (blok narigi tomonda)", () => {
  const { s, roles } = box600();
  const d = derive(s, { roles });
  const leftSide = d.parts.filter((p) => p.role === "side")[0]!; // v0 (chap tashqi)
  // v0: chap yuza tashqarida (free-end/ochiq), o'ng yuza ichkarida (abutting)
  assert.equal(leftSide.facets.adjacency.left, "free-end", "tashqi yuza ochiq");
  assert.equal(leftSide.facets.adjacency.right, "abutting", "ichki yuza blokka tegadi");
});

test("B3/54 T7 E2: 'exposed end panel' = P1 qoida adjacency(free-end)ga tayanadi → QABUL (D8 yo'q, Tier-0)", () => {
  const { s, roles } = box600();
  // 50§5 motivatsion misol: ochiq uchli panel 18mm. adjacency = Tier-0 → P1 ruxsat.
  const rules: Rule[] = [{
    layer: "project", property: "panelThickness", value: 18, facets: ["adjacency"],
    match: (p) => (p.adjacency as Record<string, string> | undefined)?.left === "free-end", pass: "P1",
  }];
  const d = derive(s, { roles, rules });
  assert.ok(!d.refusals.some((r) => r.rule === "D8"), "adjacency Tier-0 → D8 yo'q (E2 qabul)");
  const leftSide = d.parts.filter((p) => p.role === "side")[0]!;
  assert.equal(leftSide.params.panelThickness, 18, "ochiq uchli panel → 18");
});

test("B4/L15: createSheet(opening) — tashqi yuza opening chegarasida → side = opening balandligi (720, 736 emas)", () => {
  const s = createSheet({ width: 800, height: 720 }, { left: { kind: "against-wall", endPanel: 16 }, right: { kind: "free", endPanel: 16 } });
  const [vL, vR] = s.vLines.map((l) => l.id); // pos bo'yicha: vL@8, vR@792
  const [hF, hC] = s.hLines.map((l) => l.id); // @0, @720 (chegara marker)
  const roles: Record<string, Role> = { [vL!]: "side", [vR!]: "side", [hF!]: "bottom", [hC!]: "top" };
  const d = derive(s, { roles });
  const leftSide = d.parts.find((p) => p.board.line === vL)!;
  assert.equal(leftSide.finishedLength, 720, "side = opening balandligi (L15 outer-face)");
  assert.equal(leftSide.facets.adjacency.left, "wall-facing", "against-wall uch → wall-facing");
  const rightSide = d.parts.find((p) => p.board.line === vR)!;
  assert.equal(rightSide.facets.adjacency.right, "free-end", "free uch → ochiq");
});

test("B4/L15: outer chiziqlarning tashqi yuzasi aynan opening'da (chap panel outer=0, o'ng=width)", () => {
  const s = createSheet({ width: 1000, height: 900 }, { left: { kind: "free", endPanel: 16 }, right: { kind: "free", endPanel: 16 } });
  const vL = s.vLines[0]!, vR = s.vLines[s.vLines.length - 1]!;
  assert.equal(vL.pos - 16 / 2, 0, "chap panel tashqi yuza = 0");
  assert.equal(vR.pos + 16 / 2, 1000, "o'ng panel tashqi yuza = width");
});

test("B4/L15+L9: into-corner uch → Reserved ustun (qo'shni devor chuqurligi)", () => {
  const s = createSheet({ width: 1200, height: 720 }, { left: { kind: "into-corner", endPanel: 16, cornerDepth: 600 }, right: { kind: "free", endPanel: 16 } });
  assert.equal(s.ends?.left.kind, "into-corner");
  const reserved = s.blocks.find((b) => b.type === "reserved");
  assert.ok(reserved, "into-corner → Reserved blok bor");
  // reserved ustun [0, 600] — edge@0 va @600 chiziqlari orasida
  assert.ok(s.vLines.some((l) => l.pos === 0) && s.vLines.some((l) => l.pos === 600), "reserved chegaralari @0 va @600");
});

test("B4: argumentsiz createSheet → bo'sh sheet (backward-compat, opening/ends yo'q)", () => {
  const s = createSheet();
  assert.deepEqual(s.vLines, []); assert.equal(s.opening, undefined); assert.equal(s.ends, undefined);
});

test("B9/50§1: kromka edge_exposure'dan — exposed→2mm, hidden→0 (rol bo'yicha soxta emas)", () => {
  assert.deepEqual(
    bandingFromExposure({ start: "exposed", end: "hidden", front: "exposed", back: "hidden" }),
    { left: 2, right: 0, top: 2, bottom: 0 },
  );
});

test("B9/50§1: edge_exposure geometriyadan — worktop BUTT (spanning penal) uch = hidden, CAP uch = exposed", () => {
  // penal+base (spanning v1): worktop v1..v2, v1 spanning → butt (hidden), v2 cap → exposed
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id, v1 = addLine(s, "V", 600).id, v2 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id, h1 = addLine(s, "H", 720).id, h2 = addLine(s, "H", 2400).id;
  setThickness(s, v0, h0, h1, 16); setThickness(s, v0, h1, h2, 16);
  setThickness(s, v1, h0, h1, 16); setThickness(s, v1, h1, h2, 16);
  setThickness(s, v2, h0, h1, 16);
  setThickness(s, h0, v0, v1, 16); setThickness(s, h0, v1, v2, 16);
  setThickness(s, h1, v1, v2, 16);
  setThickness(s, h2, v0, v1, 16);
  const roles: Record<string, Role> = { [v0]: "side", [v1]: "side", [v2]: "side", [h0]: "bottom", [h1]: "worktop", [h2]: "top" };
  const d = derive(s, { roles });
  const wtop = d.parts.find((p) => p.role === "worktop")!;
  const ee = wtop.tier3.edge_exposure as { start: string; end: string };
  assert.equal(ee.start, "hidden", "spanning penal ichiga butt → hidden (kromka yo'q)");
  assert.equal(ee.end, "exposed", "cap uch → exposed (kromka bor)");
  // banding: left(start)=0, right(end)=2 — kromka faqat ochiq qirrada
  assert.equal(bandingFromExposure(wtop.tier3.edge_exposure as never).left, 0);
  assert.equal(bandingFromExposure(wtop.tier3.edge_exposure as never).right, 2);
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
