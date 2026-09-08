// Phase Е — "Передача": turn the constructed run into a factory production package.
// Reuses the pricing engine's panel decomposition (modulePanels) + the quote's hardware
// lines, so the cut list / hardware list are REAL (the same data that prices the kitchen),
// not a mockup. Pure; the screen renders it and offers a CSV download.

import { carcassPanels, groupCarcasses, carcassWidth, panelAreaM2, panelThicknessMm, seedRateTable, priceProject, DEFAULT_PRODUCTION, type PanelRole } from "@mebelchi/pricing";
import type { ProductionOpts, MaterialType } from "@mebelchi/schema";
import { projectFromCabs } from "./toProject";
import { densityForType } from "./materials";
import type { Cabinet, FrontProfile } from "./cabinet";
import { loadSettings } from "./settings";
// The workshop's ConstructionProfile (POSYLKA) — the single source of construction
// truth. Kromka mm are read from it, not a local literal (DB/27 §3).
import { QORASU_PROFILE, panelDecomposition } from "../../../../engine/index.js";
import type { EdgeKromka, PartRole } from "../../../../engine/index.js";
// DB/39: the worktop is a RUN-level BAND. Its decomposition is the ENGINE's, never re-derived
// here ("panelDecomposition is the engine's, F writes this, not App-2" — 39_HORIZONTAL_BANDS §3),
// so the cut list reads the run's столешница from the bridge, not a hand-rolled per-box slab.
import { baseRuns, toDesignProject } from "./toDesign";

const matName = (ref: string): string => seedRateTable.materials[ref]?.name ?? ref;
const hwName = (sku: string): string => Object.values(seedRateTable.hardware).find((h) => h.sku === sku)?.name ?? sku;

// 45kg weight limit (DB/40 §5): a cut-list row's REAL weight = volume × the material's real
// density (from the eman.uz catalogue, resolved by TYPE). Glass is bought cut-to-size — a standard
// float-glass density, and it is excluded from the assembled-carcass weight below.
const GLASS_DENSITY = 2500; // float glass ≈ 2500 kg/m³ (standard)
function panelWeightKg(r: { role: PanelRole; partEn: string; lengthMm: number; widthMm: number; thicknessMm: number }): number {
  const type: MaterialType = r.partEn === "back" ? "HDF" : r.partEn === "worktop" ? "solid" : "LDSP";
  const density = r.role === "glass" ? GLASS_DENSITY : densityForType(type);
  return (r.lengthMm / 1000) * (r.widthMm / 1000) * (r.thicknessMm / 1000) * density;
}

// Jiyak (kromka, PVC edge banding) — the mm AND the per-edge assignment now come FROM the
// ConstructionProfile, the single source of construction truth (DB/27 §3 / §3.3). K1/K2
// thickness are read from QORASU_PROFILE.kromka.slots, and WHICH edge of each part is banded
// with WHICH tape from QORASU_PROFILE.defaults.kromkaByRole (the DB/25 census). Swap the
// profile → the cut list's jiyak follows, with zero edits here. (Census: K1 = 1.0mm visible,
// K2 = 0.4mm hidden; 2mm never appears in this market.)
export const KROMKA = {
  k1Mm: QORASU_PROFILE.kromka.slots.K1.thickness_mm10 / 10, // mm10 → mm (10 → 1.0)
  k2Mm: QORASU_PROFILE.kromka.slots.K2.thickness_mm10 / 10, // 4 → 0.4
};
const KROMKA_VISIBLE = `${KROMKA.k1Mm}мм ПВХ`; // one visible edge (K1) — for scribe fillers

/** K-slot → mm, from the profile (K1 = 1.0, K2 = 0.4). */
const K_MM: Record<string, number> = { K1: KROMKA.k1Mm, K2: KROMKA.k2Mm };

/** A cut panel's raw name (from carcassPanels) → the profile PartRole whose per-edge jiyak
 *  map applies. Fronts (door / drawer-front) band like a facade; a раскладка `mullion` strip is
 *  a thin decorative bar glued onto the front, NOT edge-banded → bare ("—"); a shared `stile`
 *  and an interior `divider` are the same internal-vertical role; glass takes none. */
function roleForPanel(name: string): PartRole | null {
  if (name === "side-left" || name === "side-right") return "side";
  if (name === "bottom") return "bottom";
  if (name === "top") return "top";
  if (name === "back") return "back";
  if (name.startsWith("shelf-")) return "shelf";
  if (name.startsWith("divider-") || name.startsWith("stile-")) return "divider";
  if (name === "door" || name.startsWith("door-") || name.startsWith("drawer-front-")) return "door"; // mullion → bare
  if (name === "plinth") return "plinth";
  if (name.startsWith("filler-")) return "filler";
  return null;
}

/** Russian edge labels, in EdgeKromka's declared order. */
const EDGE_RU: Record<keyof EdgeKromka, string> = {
  front: "перед", back: "зад", left: "лев", right: "прав", top: "верх", bottom: "низ",
};

/** The cut-list jiyak spec for a panel — WHICH edges get WHICH tape, from the profile's
 *  per-role, per-edge census map. E.g. side → "перед·зад: 1мм" · shelf → "перед: 1мм" ·
 *  back → "—" (bare) · door → "лев·прав·верх·низ: 1мм" · plinth → "лев·прав: 0.4мм · верх: 1мм".
 *  Uses the profile's aggregate `defaults`; per-type `byType` selection is a later step. */
/** Same spec keyed directly by ROLE (for the «Слои» panel, whose parts carry a role, not a cut-list name).
 *  Unknown role → "—". A drawer facade is banded like a door — the caller maps "drawer" → "door". */
/** The effective per-edge kromka for a role — the profile census merged with the «Кромка · bo'yash»
 *  store override. Used by the 3D edge-banding overlay + the «Слои» spec. Undefined for an unknown role. */
export function effectiveKromkaForRole(
  role: string,
  override?: Partial<Record<keyof EdgeKromka, "K1" | "K2" | null>>,
): EdgeKromka | undefined {
  const base = (QORASU_PROFILE.defaults.kromkaByRole as Record<string, EdgeKromka>)[role];
  if (!base) return undefined;
  return override ? { ...base, ...override } : base;
}

export function jiyakSpecForRole(
  role: string,
  override?: Partial<Record<keyof EdgeKromka, "K1" | "K2" | null>>,
): string {
  const base: EdgeKromka | undefined = (QORASU_PROFILE.defaults.kromkaByRole as Record<string, EdgeKromka>)[role];
  if (!base) return "—";
  // «Кромка · bo'yash rejimi» override merges over the profile census (an edge set to null → bare).
  const em: EdgeKromka = override ? { ...base, ...override } : base;
  const order: (keyof EdgeKromka)[] = ["front", "back", "left", "right", "top", "bottom"];
  const bySlot = new Map<string, string[]>();
  for (const e of order) {
    const slot = em[e];
    if (!slot) continue;
    const list = bySlot.get(slot);
    if (list) list.push(EDGE_RU[e]);
    else bySlot.set(slot, [EDGE_RU[e]]);
  }
  if (bySlot.size === 0) return "—"; // fully bare (e.g. the back panel)
  return [...bySlot.entries()].map(([slot, edges]) => `${edges.join("·")}: ${K_MM[slot]}мм`).join(" · ");
}
export function jiyakSpec(name: string): string {
  const role = roleForPanel(name);
  return role ? jiyakSpecForRole(role) : "—";
}

// Цоколь (plinth) — from the profile. The canonical panelDecomposition (engine/solver) emits
// ONE plinth front panel per box: length = (placement "between" ? innerW : W), width = the
// plinth HEIGHT, thickness = carcass. Census-confirmed 120mm (QONUNLAR §10.6). Wall (upper)
// cabinets have no plinth. Swap the profile → these follow.
const PLINTH_DEF = QORASU_PROFILE.defaults.plinth;
const PLINTH_H_MM = PLINTH_DEF.height_mm10 / 10;      // 1200 → 120
const CARCASS_T_MM = QORASU_PROFILE.material.carcass_mm10 / 10; // 160 → 16

const PART_RU: Record<string, string> = {
  "side-left": "Бок левый",
  "side-right": "Бок правый",
  bottom: "Дно",
  top: "Крышка",
  back: "Задняя стенка",
  door: "Фасад",
};
function partRu(name: string): string {
  if (PART_RU[name]) return PART_RU[name];
  const [base, n] = name.split(/-(?=\d+$)/);
  if (base === "shelf") return `Полка ${n}`;
  if (base === "divider") return `Перегородка ${n}`;
  // the vertical panel BETWEEN two bays of a merged box — it replaces the two side panels the
  // separate cabinets would each have had, and the shop must not cut it as one of those
  if (base === "stile") return `Стойка средняя ${n}`;
  // a cabinet with a custom interior can carry several doors — `door-1`, `door-2`… (a lone door
  // keeps the bare `door` name, handled by PART_RU above)
  if (base === "door") return `Фасад ${n}`;
  if (base === "glass") return `Стекло ${n}`;
  if (base === "mullion") return `Раскладка ${n}`;
  if (name.startsWith("drawer-front")) return `Фасад ящика ${name.split("-").pop()}`;
  return name;
}

const APPL: Record<string, string> = {
  sink: "Мойка",
  hob: "Плита",
  cooktop: "Варочная панель",
  oven: "Духовой шкаф",
  fridge: "Холодильник",
  dishwasher: "Посудомойка",
  washer: "Стиральная машина",
  hood: "Вытяжка",
};
/** «Навесной» / «Пенал» / «Напольный» — the module's kind, in the shop's words. */
export function kindRu(c: Cabinet): string {
  return c.kind === "upper" ? "Навесной" : c.kind === "tall" ? "Пенал" : "Напольный";
}

export function cabLabel(c: Cabinet): string {
  if (c.appliance && c.appliance !== "none" && c.appliance !== "filler") return APPL[c.appliance] ?? "Техника";
  if (c.corner) return "Угловой";
  return `${kindRu(c)} ${c.w}`;
}

/** what the CNC has to do to this panel's face — the shop cannot rout what the list doesn't say */
const PROFILE_RU: Record<FrontProfile, string> = {
  flat: "—",
  shaker: "Фрезеровка: рамка",
  raised: "Фрезеровка: рамка + филёнка",
  fluted: "Фрезеровка: рифление",
  glass: "Фрезеровка: под стекло",
  grid: "Фрезеровка: под стекло + раскладка",
  none: "—",
};

export interface PanelRow {
  module: string;
  part: string;
  /** carcass / facade / glass. A GLASS pane is bought cut to size — it is not sawn from a board and
   *  never goes on a saw plan or a CNC contour, which is why it carries its role this far. */
  role: PanelRole;
  /** raw ASCII panel name (side-left / bottom / door…) — for the DXF, which isn't UTF-8 */
  partEn: string;
  material: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  edge: string;
  /** the routed profile of this front (blank on a carcass panel) */
  profile: string;
  /** panel weight (kg): dimensions × thickness × the material's REAL density (DB/40 §5).
   *  Filled after all rows are built; present on every row of a Production. */
  weightKg?: number;
}
export interface HwRow {
  name: string;
  qty: number;
}
export interface Production {
  panels: PanelRow[];
  hardware: HwRow[];
  boardM2: number;
  moduleCount: number;
  /** CARCASSES the shop actually builds — fewer than `moduleCount` when rows are merged. */
  boxCount: number;
  /** assembled carcasses whose REAL weight exceeds the 45kg lift/transport limit (DB/40 §5 /
   *  merge.limits.maxWeightKg) — one line per over-limit box, empty when all are liftable. */
  warnings: string[];
}

/** The full production package for the run (cut list + hardware + board area).
 *
 *  ITERATES BOXES, NOT CABINETS. A merged row is one carcass: its outer sides, stiles and the one
 *  long top/bottom/back belong to the BOX and are listed against it, while each bay's shelves and
 *  fronts stay listed against the cabinet they go in. Send the shop a per-cabinet list for a merged
 *  row and it cuts eight side panels for a box that has two. */
export function production(cabs: Cabinet[], prod: ProductionOpts = DEFAULT_PRODUCTION): Production | null {
  const real = cabs.filter((c) => !c.furniture);
  if (!real.length) return null;
  const project = projectFromCabs(real, prod);
  const mats = project.materials;

  const panels: PanelRow[] = [];
  let boardArea = 0;
  const cabById = new Map(real.map((c) => [c.id, c]));
  const labelById = new Map(real.map((c, i) => [c.id, `${i + 1}. ${cabLabel(c)}`]));
  const boxes = groupCarcasses(project.run);

  // DB/39 Faza 1b: base cabinets in a wall-run of 2+ share ONE цоколь board — the run's tsokol
  // band (emitted from the engine below), not one plinth per box. Their per-box plinth is skipped
  // in the loop. SAME grouping as toDesignProject (baseRuns), so the engine and the cut list cover
  // exactly the same cabinets — no double plinth, none missed.
  const runMemberIds = new Set(baseRuns(real).flat().map((c) => c.id));

  for (const box of boxes) {
    // what the SHELL of this box is called on the cut list. A merged box is a thing in its own
    // right and needs its own name, or the shop cannot tell which row the 2400 top belongs to.
    const members = box.modules.map((m) => cabById.get(m.id)).filter((c): c is Cabinet => Boolean(c));
    const first = members[0];
    const shellLabel =
      members.length > 1
        ? `${labelById.get(first.id)?.split(".")[0] ?? "?"}. ${kindRu(first)} ряд ${carcassWidth(box)} — общий корпус (${members.length} секц.)`
        : (labelById.get(first.id) ?? cabLabel(first));

    // Carcass board thickness for THIS box — the per-cabinet choice (16 «Стандарт» / 18
    // «Усиленный»), which the 3D already honours but the cut list used to ignore (always 16).
    // Drives the inner-width math AND the shown thickness. Falls back to the profile's carcass.
    // (DB/27 note: this reads per-cabinet construction — the bridge model, not the profile.)
    const boxThickness = first.boardThickness ?? CARCASS_T_MM;

    for (const p of carcassPanels(box, mats, boxThickness)) {
      const owner = p.moduleId ? labelById.get(p.moduleId) : undefined;
      const ownerCab = p.moduleId ? cabById.get(p.moduleId) : first;

      // Back panel filter (if owner cabinet has no back panel or backMount === "none")
      if (p.name === "back") {
        if (ownerCab?.hasBack === false || ownerCab?.backMount === "none") {
          continue; // skip back panel
        }
      }

      panels.push({
        module: owner ?? shellLabel,
        part: partRu(p.name),
        role: p.role,
        partEn: p.name,
        material: matName(p.materialRef),
        lengthMm: Math.round(p.lengthMm),
        widthMm: Math.round(p.widthMm),
        // carcass parts follow THIS box's board thickness (16/18); facade & glass by role
        thicknessMm: p.role === "carcass" ? boxThickness : panelThicknessMm(p.role),
        edge: p.role === "glass" ? "—" : jiyakSpec(p.name),
        profile: p.profile && !p.name.startsWith("mullion") ? PROFILE_RU[p.profile] : "",
      });
      boardArea += panelAreaM2(p);
    }

    // ── Цоколь (plinth): one front panel per FLOOR box, dims from the profile (canonical
    //    panelDecomposition rule). Wall (upper) cabinets stand off the floor — no plinth.
    //    DB/39 Faza 1b: a box whose cabinet belongs to a 2+ base wall-run is skipped here — the
    //    run's tsokol band (below) owns ONE plinth board for the whole run, not one per box.
    if (PLINTH_DEF.style !== "none" && first.kind !== "upper" && !runMemberIds.has(first.id)) {
      const plinthW = PLINTH_DEF.placement === "between" ? carcassWidth(box) - 2 * boxThickness : carcassWidth(box);
      panels.push({
        module: shellLabel,
        part: "Цоколь",
        role: "carcass",
        partEn: "plinth",
        material: matName(mats.carcassId),
        lengthMm: Math.round(plinthW),
        widthMm: Math.round(PLINTH_H_MM),
        thicknessMm: boxThickness,
        edge: jiyakSpec("plinth"),
        profile: "",
      });
      boardArea += (plinthW * PLINTH_H_MM) / 1e6;
    }
  }

  // ── Столешница (worktop): a RUN-level BAND (DB/39). The app's carcass path emitted none at
  //    all — a real omission (the shop cut a kitchen with no worktop on the list). We take it
  //    from the engine's band decomposition (panelDecomposition), never re-derived here: band
  //    decomposition is the engine's (39_HORIZONTAL_BANDS §3 "F writes this, not App-2"). A
  //    wall-run of 2+ base cabinets yields ONE slab. Dimensions come from the engine; the
  //    material NAME is the project's worktop pick. (Lone-base worktop is deferred — toDesign v1.)
  const worktopName = seedRateTable.worktop[mats.worktopId ?? ""]?.name ?? "Столешница";
  const dec = panelDecomposition(toDesignProject(real), QORASU_PROFILE);
  let wi = 0;
  for (const p of dec.parts) {
    if (dec.provenance[p.id]?.role !== "worktop") continue;
    panels.push({
      module: `Ряд ${++wi}`,
      part: "Столешница",
      role: "carcass",
      partEn: "worktop",
      material: worktopName,
      lengthMm: Math.round(p.length_mm10 / 10),
      widthMm: Math.round(p.width_mm10 / 10),
      thicknessMm: p.thickness_mm10 / 10,
      edge: jiyakSpecForRole("worktop"),
      profile: "",
    });
    boardArea += (p.length_mm10 * p.width_mm10) / 1e8; // mm10² → m²
  }

  // ── Цоколь (plinth): a RUN-level BAND for wall-runs of 2+ (DB/39 Faza 1b). ONE board spans the
  //    run's front instead of one plinth per box (the box loop skipped run members). Taken from the
  //    engine's tsokol band (provenance nodeId `run:N:tsokol`), never re-derived here — same law as
  //    the worktop. Lone bases and tall units keep their per-box plinth above (toDesign v1 does not
  //    wrap them in a run).
  let pi = 0;
  for (const p of dec.parts) {
    const pv = dec.provenance[p.id];
    if (pv?.role !== "plinth" || !pv.nodeId.endsWith(":tsokol")) continue;
    panels.push({
      module: `Ряд ${++pi} — цоколь`,
      part: "Цоколь",
      role: "carcass",
      partEn: "plinth",
      material: matName(mats.carcassId),
      lengthMm: Math.round(p.length_mm10 / 10),
      widthMm: Math.round(p.width_mm10 / 10),
      thicknessMm: p.thickness_mm10 / 10,
      edge: jiyakSpecForRole("plinth"),
      profile: "",
    });
    boardArea += (p.length_mm10 * p.width_mm10) / 1e8; // mm10² → m²
  }

  // Emitting scribe filler panels (доборные фальш-панели)
  for (const c of real) {
    const lbl = labelById.get(c.id) ?? cabLabel(c);
    const boardMat = mats.facadeId ? matName(mats.facadeId) : "ЛДСП 16 мм";
    if (c.fillerLeft && c.fillerLeft > 0) {
      panels.push({
        module: lbl,
        part: "Фальш-панель слева",
        role: "facade",
        partEn: "filler-left",
        material: boardMat,
        lengthMm: Math.round(c.h),
        widthMm: Math.round(c.fillerLeft),
        thicknessMm: 16,
        edge: KROMKA_VISIBLE,
        profile: "—",
      });
      boardArea += (c.h * c.fillerLeft) / 1e6;
    }
    if (c.fillerRight && c.fillerRight > 0) {
      panels.push({
        module: lbl,
        part: "Фальш-панель справа",
        role: "facade",
        partEn: "filler-right",
        material: boardMat,
        lengthMm: Math.round(c.h),
        widthMm: Math.round(c.fillerRight),
        thicknessMm: 16,
        edge: KROMKA_VISIBLE,
        profile: "—",
      });
      boardArea += (c.h * c.fillerRight) / 1e6;
    }
    if (c.fillerTop && c.fillerTop > 0) {
      panels.push({
        module: lbl,
        part: "Фальш-панель сверху",
        role: "facade",
        partEn: "filler-top",
        material: boardMat,
        lengthMm: Math.round(c.w),
        widthMm: Math.round(c.fillerTop),
        thicknessMm: 16,
        edge: KROMKA_VISIBLE,
        profile: "—",
      });
      boardArea += (c.w * c.fillerTop) / 1e6;
    }
  }

  // hardware totals straight from the priced BOM (which counts hangers per BOX, not per cabinet)
  const hw = new Map<string, number>();
  for (const line of priceProject(project, seedRateTable).lines) {
    if (line.kind !== "hardware") continue;
    const name = hwName(line.ref);
    hw.set(name, (hw.get(name) ?? 0) + line.qty);
  }

  // Joint family fasteners count (4 fasteners per horizontal panel: shelves + bottom)
  try {
    const settings = loadSettings();
    const family = settings.jointFamily ?? "confirmat";
    let jointCount = 0;
    for (const c of real) {
      const horizontalPanels = (c.count ?? 0) + 1; // shelves + bottom
      jointCount += horizontalPanels * 4;
    }

    if (family === "confirmat") {
      hw.set("Конфирмат (евровинт) 7×50 мм", (hw.get("Конфирмат (евровинт) 7×50 мм") ?? 0) + jointCount);
    } else if (family === "minifix") {
      hw.set("Минификс (эксцентрик) Ø15×12.5 мм", (hw.get("Минификс (эксцентрик) Ø15×12.5 мм") ?? 0) + jointCount);
      hw.set("Шкант деревянный 8×30 мм", (hw.get("Шкант деревянный 8×30 мм") ?? 0) + jointCount);
    } else if (family === "dowel") {
      hw.set("Шкант деревянный 8×30 мм", (hw.get("Шкант деревянный 8×30 мм") ?? 0) + jointCount);
    }
  } catch (e) {
    // fallback if localStorage not available
  }

  // ── 45kg weight limit (DB/40 §5): give every panel its REAL weight (volume × the material's
  //    real density — ЛДСП 728 etc., from the eman.uz catalogue, not a hardcode), then flag any
  //    assembled carcass over the lift/transport limit. maxWeightKg comes from the profile.
  const maxKg = QORASU_PROFILE.defaults.merge.limits.maxWeightKg;
  for (const row of panels) row.weightKg = Math.round(panelWeightKg(row) * 10) / 10;
  const assembled = new Map<string, number>();
  for (const row of panels) {
    if (row.role === "glass") continue; // glass is bought cut-to-size, not part of the carcass
    assembled.set(row.module, (assembled.get(row.module) ?? 0) + (row.weightKg ?? 0));
  }
  const warnings: string[] = [];
  for (const [mod, kg] of assembled) {
    if (kg > maxKg) warnings.push(`${mod}: собранный вес ~${Math.round(kg)}кг > ${maxKg}кг — тяжело поднять/везти, разбить`);
  }

  return {
    panels,
    hardware: [...hw.entries()].map(([name, qty]) => ({ name, qty })),
    boardM2: Math.round(boardArea * 100) / 100,
    moduleCount: real.length,
    boxCount: boxes.length,
    warnings,
  };
}

/** A ;-separated CSV (Excel-friendly, Cyrillic) of the cut list + hardware. */
export function productionCSV(p: Production): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows: string[] = ["Тип;Модуль;Наименование;Материал;Длина, мм;Ширина, мм;Толщина, мм;Вес, кг;Кол-во;Кромка;Обработка"];
  for (const r of p.panels) {
    rows.push([ "Панель", r.module, r.part, r.material, r.lengthMm, r.widthMm, r.thicknessMm, r.weightKg ?? 0, 1, r.edge, r.profile ].map(esc).join(";"));
  }
  for (const h of p.hardware) {
    rows.push([ "Фурнитура", "", h.name, "", "", "", "", "", h.qty, "", "" ].map(esc).join(";"));
  }
  return rows.join("\r\n");
}
