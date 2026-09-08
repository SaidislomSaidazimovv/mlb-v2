// derive() — §2 markaziy birlashtiruvchi (P0→P4). Sof funksiya (54§0).
// ASOS: 54§2 API — `derive(sheet, profile, rules): Derivation`, Derivation = {parts, modules, junctions,
//   facets, provenance}. Bu YANGI geometriya EMAS — mavjud isbotlangan bo'laklarni (boardRuns T3,
//   deriveModules T4, resolveThrough/classify T2, facets T6) BIR kirish nuqtasiga jamlaydi. Har qiymat
//   PROVENANS (qaysi qonun/qoida) bilan keladi (54§2 "provenance"; 50 Law E "har rad qoidani nomlaydi").
// O'ylab topilgan hech narsa yo'q — kompozitsiya.

import type { Sheet, Line, LineId, Axis, Refusal } from "./contracts.ts";
import { getThickness } from "./sheet.ts";
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
  facets: { role: Role | "unknown"; axis: Axis; adjacency: Record<string, Adjacency> };
  provenance: { thickness: string; role: string };
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
    return {
      board: b, role,
      facets: { role, axis: b.axis, adjacency: computeAdjacency(topo) },
      provenance: {
        thickness: `48 L6 — segment qalinligidan (${b.thickness})`,
        role: profile.roles[b.line] ? "profil roli" : "rol berilmagan",
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
