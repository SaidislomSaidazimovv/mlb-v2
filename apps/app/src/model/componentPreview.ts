// Read-only preview: run the engine's decomposer on a library component's root so the «Компоненты»
// tab can SHOW the real cut parts a placement would produce — laminate → N blanks, viyemka → a groove.
// Pure and side-effect-free: it never touches the store, the constructor, or the 3D scene, so opening
// a component's parts can never disturb the live project. The actual in-cabinet placement path is
// toDesign → panelDecomposition; this wraps the same decomposer against a reference profile for a
// standalone look.

import { panelDecomposition, QORASU_PROFILE } from "../../../../engine/index.js";
import type { ComponentLibraryItem, ConstructionProfile, DecomposeResult, DesignNode } from "../../../../engine/index.js";

// ───────────────────────────────── interim panel positions (App-3 ↔ App-2 channel, NOT the contract)
//
// App-3's export omits panel POSITIONS (the frozen DesignNode has no position field — the founder's
// flat "each panel = 1 child, group geometryless" model). Positions DO exist at convert time
// (PanelGeom x/y/z), so as an INTERIM bridge — exactly like the interim JSON channel itself — App-3 can
// write an EXTRA `pos` field onto each panel node in the exported JSON, which App-2 reads best-effort
// for an EXACT 3D + picture. This touches NO frozen contract type (read via a local cast) and is not a
// DB/27 breach: a position is GEOMETRY (same tier as `size`), never construction. Absent → the schematic
// / placeholder stays. The canonical fix is still the founder's §2.4 PR (position on DesignNode).
//
// AGREED SHAPE: `pos = { x_mm10, y_mm10, z_mm10 }` — the panel's CENTRE in the component ENVELOPE frame,
// origin at the envelope's min corner, +x = width, +y = height (up), +z = depth. Same mm10 units as size.

export interface PanelPos { x_mm10: number; y_mm10: number; z_mm10: number }

/** The panel's centre in the envelope frame — now the canonical `DesignNode.pos` (§2.4, 2026-08-26),
 *  not the earlier interim cast. Guarded against a malformed imported JSON. */
export function panelPos(node: DesignNode): PanelPos | undefined {
  const p = node.pos;
  return p && typeof p.x_mm10 === "number" && typeof p.y_mm10 === "number" && typeof p.z_mm10 === "number" ? p : undefined;
}

/** One panel as a MIN-CORNER box, every value a 0..1 fraction of the component envelope (x/y/z = corner,
 *  w/h/d = extent; y is UP). The picture uses x/y/w/h; the 3D uses all six. */
export interface NormBox { id: string; kind: string; x: number; y: number; z: number; w: number; h: number; d: number; laminated: boolean }

/** The exact panel layout of a component IN NORMALISED envelope space — but ONLY when the interim `pos`
 *  bridge is present on EVERY panel and the envelope has a size. Otherwise undefined, and callers fall
 *  back to the honest schematic / placeholder. Pure: reads the design data, computes no construction. */
export function componentPanelLayout(item: ComponentLibraryItem): NormBox[] | undefined {
  const env = item.root.size;
  const ew = env?.w_mm10 ?? 0, eh = env?.h_mm10 ?? 0, ed = env?.d_mm10 ?? 0;
  if (ew <= 0 || eh <= 0 || ed <= 0) return undefined;
  const kids = item.root.children ?? [];
  if (kids.length === 0) return undefined;
  const out: NormBox[] = [];
  for (const k of kids) {
    const pos = panelPos(k);
    const w = k.size?.w_mm10 ?? 0, h = k.size?.h_mm10 ?? 0, d = k.size?.d_mm10 ?? 0;
    if (!pos || w <= 0 || h <= 0 || d <= 0) return undefined; // need pos + size on ALL panels
    out.push({
      id: k.nodeId, kind: k.kind,
      x: (pos.x_mm10 - w / 2) / ew,
      y: (pos.y_mm10 - h / 2) / eh,
      z: (pos.z_mm10 - d / 2) / ed,
      w: w / ew, h: h / eh, d: d / ed,
      laminated: (k.modifiers ?? []).some((m) => m.type === "laminate"),
    });
  }
  return out;
}

/** Decompose a component's root on its own, against a reference profile (default QORASU — the demo's
 *  validatedProfileId). Slots are bound so a роль-carrying panel does not trip UNBOUND_SLOT in the
 *  preview. Returns the engine's parts/flags exactly as the real cut list would. */
export function decomposeComponent(
  item: ComponentLibraryItem,
  profile: ConstructionProfile = QORASU_PROFILE,
): DecomposeResult {
  return panelDecomposition(
    {
      projectId: item.componentId,
      name: item.name,
      nodes: [item.root],
      slotBindings: { fasad: "F", korpus: "K", orqa: "C", stoleshnitsa: "W" },
      overrides: [],
    },
    profile,
  );
}

/** A part flattened for the preview list: role name in Russian, its mm dimensions, and whether it
 *  carries a user-drawn groove (a viyemka) — so the card can mark it ✂. */
export interface PreviewPart {
  id: string;
  role: string;
  name: string;
  l_mm: number;
  w_mm: number;
  t_mm: number;
  hasGroove: boolean;
}

// ───────────────────────────────────────── B6 accept-fit-check (§10.3 / APP3_BRIEF §10 line 166)
//
// When the master places a component into their project, App-2 checks it FITS before binding — the
// component carries a FitConstraint (App-3 proves the range where decomposition holds: minW..maxD, the
// validated profile + carcass thicknesses). A target outside the proven range, or a different profile /
// thickness, is REJECTED WITH A REASON (never silently placed) — the local half of the publish gate.
// The full 6-stage global gate (schema·slot·decomposition·invariant·profile-swap·ad-integrity) is the
// SERVER's (§10.3); this is the client accept-check App-3 hands App-2 the FitConstraint for.

export interface FitCheckResult { ok: boolean; failures: string[] }

export function fitCheck(
  item: ComponentLibraryItem,
  target: { w_mm10: number; h_mm10: number; d_mm10: number },
  profile: ConstructionProfile,
): FitCheckResult {
  const fit = item.fit;
  if (!fit) return { ok: false, failures: ["компонент не проверен (нет FitConstraint) — его должен вычислить Forge (App-3)"] };
  const mm = (v: number) => Math.round(v / 10);
  const failures: string[] = [];
  if (target.w_mm10 < fit.minW_mm10 || target.w_mm10 > fit.maxW_mm10) failures.push(`ширина ${mm(target.w_mm10)} мм вне диапазона ${mm(fit.minW_mm10)}–${mm(fit.maxW_mm10)} мм`);
  if (target.h_mm10 < fit.minH_mm10 || target.h_mm10 > fit.maxH_mm10) failures.push(`высота ${mm(target.h_mm10)} мм вне диапазона ${mm(fit.minH_mm10)}–${mm(fit.maxH_mm10)} мм`);
  if (target.d_mm10 < fit.minD_mm10 || target.d_mm10 > fit.maxD_mm10) failures.push(`глубина ${mm(target.d_mm10)} мм вне диапазона ${mm(fit.minD_mm10)}–${mm(fit.maxD_mm10)} мм`);
  if (fit.validatedProfileId !== profile.profileId) failures.push(`проверен для профиля «${fit.validatedProfileId}», а не «${profile.profileId}»`);
  if (!fit.validatedThicknesses_mm10.includes(profile.material.carcass_mm10)) failures.push(`толщина корпуса ${mm(profile.material.carcass_mm10)} мм не в проверенных [${fit.validatedThicknesses_mm10.map(mm).join(", ")}]`);
  return { ok: failures.length === 0, failures };
}

/** The default reference profile the app decomposes + fit-checks against. */
export function fitCheckDefault(item: ComponentLibraryItem, target: { w_mm10: number; h_mm10: number; d_mm10: number }): FitCheckResult {
  return fitCheck(item, target, QORASU_PROFILE);
}

// ─────────────────────────────────── F2 · the publish gate's App-2 stages (§10.3 / APP3_BRIEF §10.3)
//
// The global publish gate is `schema → slot → decomposition → invariant → profile-swap → ad-integrity`,
// runs on the SERVER, and NEVER auto-fixes (each rejection is a reason). App-2 can run the first FOUR
// as a client pre-check — the shape is known, the slots are declared, and panelDecomposition proves the
// component builds cleanly. `profile-swap` is App-3's — it runs `checkProfileSwap` at CONVERT time
// (2026-08-26: converts under two profiles, rejects CARRIES_CONSTRUCTION if the roots differ), so a
// component that reached App-2 already cleared it; `ad-integrity` is the server's (marketplace
// sponsorship). Both are shown for context, not claimed as an App-2 pass. DB_37 §3: "any DecomposeFlag
// (EXCEEDS_SHEET, DEGENERATE_GEOMETRY, UNBOUND_SLOT, ORPHANED_OVERRIDE) fails the gate."

export interface GateStage { stage: string; ok: boolean; detail?: string }
export interface GateResult { ok: boolean; stages: GateStage[] }

const FATAL_FLAGS = ["DEGENERATE_GEOMETRY", "EXCEEDS_SHEET", "UNBOUND_SLOT", "ORPHANED_OVERRIDE", "EXCEEDS_WEIGHT"];

export function componentGate(item: ComponentLibraryItem, profile: ConstructionProfile = QORASU_PROFILE): GateResult {
  const stages: GateStage[] = [];

  // 1 · schema — the known shape (schemaVersion 1 + identity + a root)
  const schemaOk = item.schemaVersion === 1 && !!item.componentId && typeof item.version === "number" && !!item.name && !!item.root;
  stages.push({ stage: "schema", ok: schemaOk, detail: schemaOk ? undefined : "неверная схема (версия / поля)" });

  // 2 · slot — every roleSlot used in the tree is declared in requiredSlots
  const used = new Set<string>();
  const walk = (n: DesignNode): void => { if (n.roleSlot) used.add(n.roleSlot); (n.children ?? []).forEach(walk); };
  walk(item.root);
  const undeclared = [...used].filter((s) => !(item.requiredSlots as string[]).includes(s));
  stages.push({ stage: "slot", ok: undeclared.length === 0, detail: undeclared.length ? `необъявленные слоты: ${undeclared.join(", ")}` : undefined });

  // 3 · decomposition + 4 · invariant — panelDecomposition proves it builds; fatal flags fail
  let decompOk = true, invOk = true; let decDetail: string | undefined, invDetail: string | undefined;
  try {
    const r = decomposeComponent(item, profile);
    decompOk = r.parts.length > 0;
    if (!decompOk) decDetail = "0 деталей (нечего резать)";
    const fatal = r.flags.filter((f) => FATAL_FLAGS.includes(f.code));
    invOk = fatal.length === 0;
    if (!invOk) invDetail = fatal.map((f) => `${f.code}: ${f.detail}`).join(" · ");
  } catch { decompOk = false; decDetail = "ошибка декомпозиции"; }
  stages.push({ stage: "decomposition", ok: decompOk, detail: decDetail });
  stages.push({ stage: "invariant", ok: invOk, detail: invDetail });

  // 5 · profile-swap (App-3 runs checkProfileSwap at convert) + 6 · ad-integrity (server/marketplace)
  stages.push({ stage: "profile-swap", ok: true, detail: "App-3 (конверт)" });
  stages.push({ stage: "ad-integrity", ok: true, detail: "сервер (маркетплейс)" });

  // App-2 verdict = the four client stages; the two server stages are pending, not a pass we can claim
  const ok = stages.slice(0, 4).every((s) => s.ok);
  return { ok, stages };
}

export function previewParts(item: ComponentLibraryItem, profile?: ConstructionProfile): PreviewPart[] {
  const r = decomposeComponent(item, profile);
  return r.parts.map((p) => ({
    id: p.id,
    role: r.provenance[p.id]?.role ?? "?",
    name: p.name,
    l_mm: Math.round(p.length_mm10 / 10),
    w_mm: Math.round(p.width_mm10 / 10),
    t_mm: Math.round(p.thickness_mm10 / 10),
    hasGroove: (p.operations ?? []).some((o) => o.op === "saw_groove" && o.source === "user"),
  }));
}
