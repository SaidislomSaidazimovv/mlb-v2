// derive() — §2 markaziy birlashtiruvchi (P0→P4). Sof funksiya (54§0).
// ASOS: 54§2 API — `derive(sheet, profile, rules): Derivation`, Derivation = {parts, modules, junctions,
//   facets, provenance}. Bu YANGI geometriya EMAS — mavjud isbotlangan bo'laklarni (boardRuns T3,
//   deriveModules T4, resolveThrough/classify T2, facets T6) BIR kirish nuqtasiga jamlaydi. Har qiymat
//   PROVENANS (qaysi qonun/qoida) bilan keladi (54§2 "provenance"; 50 Law E "har rad qoidani nomlaydi").
// O'ylab topilgan hech narsa yo'q — kompozitsiya.

import type { Sheet, Line, LineId, Axis, Refusal } from "./contracts.ts";
import { getThickness, lineById } from "./sheet.ts";
import { boardRuns, type Board, type ThroughAt } from "./board.ts";
import { deriveModules, transportCheck, type Module, type TransportLimit } from "./module.ts";
import { resolveThrough, classify, type Role, type Through, type Override, type JClass } from "./junction.ts";
import { computeAdjacency, type Adjacency, type PanelTopo } from "./facets.ts";
import { resolve, authorRule, type Rule, type Part as FacetPart } from "./cascade.ts";

/** Profil — devorga tuzilaviy rol beradi (48§2 rutba shundan). through = per-kesishma override.
 *  rules = 50§2 cascade qoidalari (B1 depth shu orqali: 48§4 "depth = profildan default, cascadable"). */
export interface Profile {
  roles: Record<LineId, Role>;          // chiziq → rol (worktop/side/top/...)
  through?: Record<string, Override>;   // "vLine|hLine" → V/H/neither/both override
  transport?: TransportLimit;
  rules?: Rule[];                       // 50§2 cascade (depth va boshqa parametrlar); yo'q → depth ishlatilmaydi
}

export interface DerivedPart {
  board: Board;
  role: Role | "unknown";
  /** A4/48§2: junction-aware FIZIK uzunlik (through=cap tashqariga, butt=ichkariga; face=pos±t/2, 48§0).
   *  centerline `board.length` dan farqli — bu HAQIQIY kesim uzunligi. */
  finishedFrom: number;
  finishedTo: number;
  finishedLength: number;
  /** B1/48§4: chuqurlik — cascade (50§2). `params.depth` bilan bir xil (qulaylik uchun alias). */
  depth?: number;
  /** B2/50§5 P1 — GEOMETRIK parametrlar (Tier-0 facetdan): depth, setback, overlay, gap, presence, count. */
  params: Record<string, unknown>;
  /** B2/50§5 P3 — Tier-3 facetlar (yakuniy geometriyadan): size.clear (real); edge_exposure → B3 (adjacency). */
  tier3: Record<string, unknown>;
  /** B2/50§5 P4 — APPEARANCE parametrlar (Tier-0+Tier-3): colour, decor, kromka, hardware finish. */
  appearance: Record<string, unknown>;
  facets: { role: Role | "unknown"; axis: Axis; adjacency: Record<string, Adjacency> };
  provenance: { thickness: string; role: string; length: string; depth?: string };
}
export interface DerivedJunction {
  vLine: LineId; hLine: LineId; pos: { x: number; y: number };
  through: Through; refusal?: Refusal; provenance: string;
}
export interface Derivation {
  parts: DerivedPart[];
  modules: Module[];
  junctions: DerivedJunction[];
  refusals: Refusal[];   // 50 Law E: har biri qoidani nomlaydi
  provenance: string[];  // global qonun izlari
}

const cKey = (v: LineId, h: LineId): string => `${v}|${h}`;

/** `line` chizig'i `at` perpendikulyar chizig'ining IKKI tomonida ham qalinlikka egami (= o'sha
 *  nuqtadan O'TIB ketadi, tugamaydi). Faqat shu holatda haqiqiy X-kontest bo'ladi (48§2). */
function crossesThrough(s: Sheet, line: Line, atIdx: number, perp: Line[]): boolean {
  if (atIdx <= 0 || atIdx + 1 >= perp.length) return false; // chetda — o'tolmaydi
  const before = getThickness(s, line.id, perp[atIdx - 1]!.id, perp[atIdx]!.id);
  const after = getThickness(s, line.id, perp[atIdx]!.id, perp[atIdx + 1]!.id);
  return before !== 0 && after !== 0;
}

/**
 * 54§2 + 50§5: derive — STAGED pipeline P0→P4 (P5 validate / P6 release keyin chaqiriladi).
 *  P0 sheet → P1 geometrik param (Tier-0 only) → P2 geometriya (junction→board→extent) →
 *  P3 Tier-3 facet (size.clear; edge_exposure→B3) → P4 appearance (Tier-0+Tier-3).
 * D8 (50§5): P1 qoida Tier-3 facetga tayansa — YOZILISHDA rad (run'da emas). Rol/tenglik/both → RAD, taxmin yo'q.
 */
export function derive(sheet: Sheet, profile: Profile, rules: Rule[] = profile.rules ?? []): Derivation {
  const refusals: Refusal[] = [];
  const provenance = ["48§0-1 model", "48§2 junctions", "48 L6 board runs", "48§0 modules", "50§5 P0→P4 pipeline"];
  const roleOf = (id: LineId): Role | "unknown" => profile.roles[id] ?? "unknown";

  // ── P1 AUTHORING GATE (50§5 / 51 D8 / 54 T7): P1 (geometrik) qoida Tier-3 facetga tayanolmaydi.
  //    YOZILISH paytida tekshiriladi (run'da emas) — E1 tsiklik rad, E2 exposed-end-panel qabul.
  for (const r of rules) { const a = authorRule(r); if (a) refusals.push(a); }
  const p1Props = [...new Set(rules.filter((r) => r.pass === "P1").map((r) => r.property))];
  const p4Props = [...new Set(rules.filter((r) => r.pass !== "P1").map((r) => r.property))]; // pass yo'q → appearance (P4)

  // ── Junctions (T2): faqat HAQIQIY X-kesishma (ikkala chiziq nuqtadan o'tadi) rutba-kontestga kiradi.
  //    T-birlashmada (bir chiziq tugaydi) — o'tuvchi chiziq davom etadi, tugovchi tabiiy yopiladi (boardRuns).
  const junctions: DerivedJunction[] = [];
  // goesThrough[lineId@perpPos] = shu chiziq shu kesishmada O'TIB ketadimi (board bo'linmaydi)
  const goesThrough = new Map<string, boolean>();
  const tk = (id: LineId, perpPos: number): string => `${id}@${perpPos}`;

  for (let vi = 0; vi < sheet.vLines.length; vi++) {
    const v = sheet.vLines[vi]!;
    for (let hi = 0; hi < sheet.hLines.length; hi++) {
      const h = sheet.hLines[hi]!;
      const vCrosses = crossesThrough(sheet, v, hi, sheet.hLines); // v h dan o'tadimi
      const hCrosses = crossesThrough(sheet, h, vi, sheet.vLines); // h v dan o'tadimi
      if (!vCrosses && !hCrosses) continue; // L-burchak yoki bo'sh — kontest yo'q

      const override = profile.through?.[cKey(v.id, h.id)];
      let through: Through = "neither";
      let refusal: Refusal | undefined;

      if (vCrosses && hCrosses) {
        // haqiqiy X — rutba (yoki override) hal qiladi; loser kesiladi
        const vRole = roleOf(v.id);
        const hRole = roleOf(h.id);
        if (vRole === "unknown" || hRole === "unknown") {
          refusal = { rule: "profile.roleMissing", message: `${v.id}×${h.id}: X-kesishmada rol berilmagan (V=${vRole}, H=${hRole}) — through aniqlanmaydi` };
          refusals.push(refusal);
        } else {
          const r = resolveThrough(vRole, hRole, override);
          if (typeof r === "object") { refusal = r; refusals.push(r); }
          else through = r;
        }
        if (through === "V") { goesThrough.set(tk(v.id, h.pos), true); goesThrough.set(tk(h.id, v.pos), false); }
        else if (through === "H") { goesThrough.set(tk(v.id, h.pos), false); goesThrough.set(tk(h.id, v.pos), true); }
      } else {
        // T-birlashma: o'tuvchi davom etadi (default true), tugovchini majburan kesmaymiz
        through = vCrosses ? "V" : "H";
      }

      junctions.push({
        vLine: v.id, hLine: h.id, pos: { x: v.pos, y: h.pos }, through, refusal,
        provenance: override ? "48§2 override" : (vCrosses && hCrosses ? "48§2 rutba" : "48§2 T-birlashma"),
      });
    }
  }

  // ── Board'lar (T3): through-aware ────────────────────────────────────────────
  // throughAt: chiziq shu perp-pozitsiyada DAVOM etadimi. Xaritada yozilgani ustun; yozilmagan
  // (kesishma yo'q / neither) → true (hech nima kesmadi → maksimal yugurish davom etadi).
  const throughAt: ThroughAt = (line, atPerpPos) => goesThrough.get(tk(line.id, atPerpPos)) ?? true;
  const boards = boardRuns(sheet, throughAt);

  const parts: DerivedPart[] = boards.map((b) => {
    const role = roleOf(b.line);
    const topo = panelTopo(b, role);
    const ext = finishedExtent(sheet, profile, b);
    const adjacency = computeAdjacency(topo);

    // ── P1 (50§5): GEOMETRIK parametrlar — Tier-0 facetlar (role, axis, adjacency). Topilmasa RAD (Law E). ──
    const tier0: FacetPart = { role, axis: b.axis, adjacency };
    const params: Record<string, unknown> = {};
    let depthProv: string | undefined;
    for (const prop of p1Props) {
      const r = resolve(tier0, prop, rules);
      if ("rule" in r) refusals.push(r);
      else { params[prop] = r.value; if (prop === "depth") depthProv = `50§2 cascade — '${r.layer}' qatlami (48§4)`; }
    }
    const depth = typeof params.depth === "number" ? params.depth : undefined;

    // ── P3 (50§5): Tier-3 facetlar — YAKUNIY geometriyadan. size.clear = finished uzunlik (real).
    //    edge_exposure haqiqiy adjacency talab qiladi (hozir stub) → B3 gача hisoblanmaydi. ──
    const tier3: Record<string, unknown> = { "size.clear": ext.length };

    // ── P4 (50§5): APPEARANCE parametrlar — Tier-0 + Tier-3 facetlar ruxsat. ──
    const tier0and3: FacetPart = { ...tier0, ...tier3 };
    const appearance: Record<string, unknown> = {};
    for (const prop of p4Props) {
      const r = resolve(tier0and3, prop, rules);
      if ("rule" in r) refusals.push(r);
      else appearance[prop] = r.value;
    }

    return {
      board: b, role,
      finishedFrom: ext.from, finishedTo: ext.to, finishedLength: ext.length,
      depth, params, tier3, appearance,
      facets: { role, axis: b.axis, adjacency },
      provenance: {
        thickness: `48 L6 — segment qalinligidan (${b.thickness})`,
        role: profile.roles[b.line] ? "profil roli" : "rol berilmagan",
        length: ext.provenance,
        depth: depthProv,
      },
    };
  });

  // ── Modul'lar (T4) + transport ───────────────────────────────────────────────
  const modules = deriveModules(sheet);
  if (profile.transport) {
    for (const m of modules) {
      const t = transportCheck(m, profile.transport);
      if (t) refusals.push(t);
    }
  }

  return { parts, modules, junctions, refusals, provenance };
}

/**
 * A4 — junction-aware FIZIK extent. Bu FOUNDER QONUNLARINING kodga aylantirilishi (reja 54§0: engine kodini
 * AI yozadi). O'zimdan formula TO'QIMADIM — har qadam founderning aniq qoidasi, va butun natija founder
 * `carcassParts` formulasiga (48§2) AYNAN teng (test: 18 konfiguratsiya W×H×through).
 *
 * Har qadam qaysi qonun:
 *  - face = pos ± t/2  →  48§0 ("segment faces are pos ± thickness/2").
 *  - BUTT uchi (perp o'tadi) → ichkariga −perpT/2  →  48§2 "top = W − 2t" (butting board perp qalinligicha qisqaradi).
 *  - CAP uchi (L o'tadi/erkin) → tashqariga +perpT/2  →  48§2 "side = H" (through board tashqi yuzagacha to'liq).
 *  - SPANNING → BUTT (rankdan ustun)  →  48§2 "high-rank horizontal crossing a vertical block that SPANS …
 *    the horizontal terminates" (perpSpansL).
 *  - rol yo'q / rank tenglik / both → tuzatilmaydi (centerline; taxmin YO'Q).
 * (Yagona implementatsiya tanlovи: perpT = P ning L ga yondosh segmentlaridan MAX — 0/16/32 mebelда bir ma'noli;
 *  asimmetrik nodir holat kelsa qayta ko'riladi.)
 */
function finishedExtent(sheet: Sheet, profile: Profile, b: Board): { from: number; to: number; length: number; provenance: string } {
  const L = lineById(sheet, b.line);
  if (!L) return { from: b.from, to: b.to, length: b.to - b.from, provenance: "chiziq topilmadi — centerline" };
  const perpLines = L.axis === "V" ? sheet.hLines : sheet.vLines;

  // P (perp chiziq) ning L ga yondosh segmentlari (L o'qi bo'yicha ikki tomon)
  const perpAdjSegs = (P: Line): { left: number; right: number } => {
    const axisLines = L.axis === "V" ? sheet.vLines : sheet.hLines; // L ga parallel chiziqlar
    const idx = axisLines.findIndex((l) => l.id === L.id);
    const left = idx > 0 ? getThickness(sheet, P.id, axisLines[idx - 1]!.id, L.id) : 0;
    const right = idx < axisLines.length - 1 ? getThickness(sheet, P.id, L.id, axisLines[idx + 1]!.id) : 0;
    return { left, right };
  };
  const perpAdjT = (P: Line): number => { const s = perpAdjSegs(P); return Math.max(s.left, s.right); };
  // 48§2 SPANNING-BLOK: P chizig'i L ni ikki tomondan qamrasa (ikkala segment ≠0) → P SPANS → B BUTT qiladi
  // (yuqori rank ham buni buzolmaydi; spanning blok ichida taxta o'smaydi — founder ta'kidlagan qoida).
  const perpSpansL = (P: Line): boolean => { const s = perpAdjSegs(P); return s.left !== 0 && s.right !== 0; };

  // uchdagi qaror: caps(true=cap/tashqari) | butt(false/ichkari) | null(aniqlanmadi → tuzatilmaydi)
  const decide = (perpPos: number): { caps: boolean | null; perpT: number } => {
    const P = perpLines.find((l) => l.pos === perpPos);
    if (!P) return { caps: null, perpT: 0 }; // perp yo'q (erkin uch) → tuzatmaymiz
    const perpT = perpAdjT(P);
    if (perpSpansL(P)) return { caps: false, perpT }; // 48§2 spanning → B butt (rankdan OLDIN, ustun)
    const roleL = profile.roles[L.id];
    const roleP = profile.roles[P.id];
    if (!roleL || !roleP) return { caps: null, perpT }; // rol yo'q → taxmin yo'q
    const dec = L.axis === "V" ? resolveThrough(roleL, roleP) : resolveThrough(roleP, roleL);
    if (typeof dec === "object" || dec === "neither") return { caps: null, perpT }; // tenglik/both → tuzatmaymiz
    return { caps: dec === L.axis, perpT }; // dec L o'qida bo'lsa L o'tadi (cap); aks holda butt
  };

  const lo = decide(b.from);
  const hi = decide(b.to);
  const from = lo.caps === null ? b.from : lo.caps ? b.from - lo.perpT / 2 : b.from + lo.perpT / 2;
  const to = hi.caps === null ? b.to : hi.caps ? b.to + hi.perpT / 2 : b.to - hi.perpT / 2;
  return { from, to, length: to - from, provenance: "48§2 through/butt + 48§0 face (carcassParts semantikasi)" };
}

/** Board uchun sodda topologiya (Tier-0). Blok-graf to'liq qo'shnilik T7/T10 da kengayadi. */
function panelTopo(b: Board, role: Role | "unknown"): PanelTopo {
  return {
    role: role === "unknown" ? "shelf" : role,
    axis: b.axis,
    neighbors: [{ side: "from", kind: "none" }, { side: "to", kind: "none" }],
  };
}

export { classify };
export type { JClass };
