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

/** Profil — devorga tuzilaviy rol beradi (48§2 rutba shundan). through = per-kesishma override. */
export interface Profile {
  roles: Record<LineId, Role>;          // chiziq → rol (worktop/side/top/...)
  through?: Record<string, Override>;   // "vLine|hLine" → V/H/neither/both override
  transport?: TransportLimit;
}

export interface DerivedPart {
  board: Board;
  role: Role | "unknown";
  /** A4/48§2: junction-aware FIZIK uzunlik (through=cap tashqariga, butt=ichkariga; face=pos±t/2, 48§0).
   *  centerline `board.length` dan farqli — bu HAQIQIY kesim uzunligi. */
  finishedFrom: number;
  finishedTo: number;
  finishedLength: number;
  facets: { role: Role | "unknown"; axis: Axis; adjacency: Record<string, Adjacency> };
  provenance: { thickness: string; role: string; length: string };
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
 * 54§2: derive — sheet + profil + qoidalardan to'liq derivatsiya.
 * Junction'lar (T2) → through yo'nalishi → board'lar (T3, through-aware) → modul'lar (T4) →
 * Tier-0 facet'lar (T6). Rol yetishmasa yoki 'both'/tenglik bo'lsa — RAD to'planadi, taxmin yo'q.
 */
export function derive(sheet: Sheet, profile: Profile, _rules: unknown[] = []): Derivation {
  const refusals: Refusal[] = [];
  const provenance = ["48§0-1 model", "48§2 junctions", "48 L6 board runs", "48§0 modules"];
  const roleOf = (id: LineId): Role | "unknown" => profile.roles[id] ?? "unknown";

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
    return {
      board: b, role,
      finishedFrom: ext.from, finishedTo: ext.to, finishedLength: ext.length,
      facets: { role, axis: b.axis, adjacency: computeAdjacency(topo) },
      provenance: {
        thickness: `48 L6 — segment qalinligidan (${b.thickness})`,
        role: profile.roles[b.line] ? "profil roli" : "rol berilmagan",
        length: ext.provenance,
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
 * A4 — junction-aware FIZIK extent. ASOS: 48§0 (face = pos ± t/2) + 48§2 (through=to'liq cap; butt=qisqaradi)
 * + carcassParts semantikasi (T2 gate, 800→768). O'ylab topilган formula EMAS — face + through/butt.
 * Har uchi (from/to) perp chiziqda: L o'sha junctionда O'TSA (cap) → tashqariga +perpT/2; BUTT bo'lsa
 * (perp o'tadi) → ichkariga −perpT/2. Rol yo'q / tenglik → tuzatilmaydi (centerline saqlanadi, taxmin yo'q).
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
