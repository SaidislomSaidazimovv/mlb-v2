// Bridge: the app's Cabinet run → the engine's Layer-2 drilling solver → a machining
// plan, a safety report, and the SWJ008 machine file. Reuses the SAME engine the cut
// list/pricing use, so the holes are the real spec-driven operations (cams, dowels,
// shelf pins, hinge cups) gated by the engine's safety validator — nothing exports dirty.
//
// We import the engine SOURCE directly (Vite resolves the .js specifiers to .ts, exactly
// as @mebelchi/pricing already does) and load the hardware spec as a plain JSON import,
// avoiding the engine index's JSON import-attribute path.

import { solveBaseCabinet } from "../../../../engine/solver/baseCabinet.js";
import { QORASU_PROFILE } from "../../../../engine/index.js";
import { mmToMm10 } from "../../../../engine/core/units.js";
import { exportSWJ008 } from "../../../../engine/postprocessors/swj008.js";
import { validateParts } from "../../../../engine/core/validate.js";
import hardwareSpecRaw from "../../../../engine/catalogs/hardware_specs.dummy.json";
import type { HardwareSpec } from "../../../../engine/primitives/types.js";
import type { mm10 } from "../../../../engine/contracts/types.js";
import type { Cabinet } from "./cabinet";
import type { Settings } from "./settings";

export type { Part, Operation, DrillOp, ValidationFinding } from "../../../../engine/contracts/types.js";
import type { Part, ValidationFinding } from "../../../../engine/contracts/types.js";

const spec = hardwareSpecRaw as unknown as HardwareSpec;
const DEPTH: Record<Cabinet["kind"], number> = { base: 560, tall: 560, upper: 350 };

// POSYLKA 2026-08-13 «Настройки → Узлы»: the editable joint values (mm10) the drilling solver honours.
// The primitives became param-driven (Step-3/3b), so the setback + cam offset can come from an editable
// source. Defaults are the QORASU_PROFILE canon; the shop's Settings OVERRIDE them, so an edit in the Узлы
// screen reaches the CNC (SWJ008) and the 3D drill preview — not just a stored number.
export interface JointOverrides {
  connectorEndOffset_mm10: mm10;
  frontRowSetback_mm10: mm10;
  backRowSetback_mm10: mm10;
  hingeEndOffset_mm10: mm10;
  /** System-32 pin grid ON/OFF — off means no shelf-pin rows are drilled (fixed shelves). */
  s32Enabled: boolean;
  /** System-32 row mode — "front_only" drills just the front pin row. */
  rowMode: "front_and_back" | "front_only" | "paired_32";
}

/** The profile canon, used when no shop override is supplied (keeps the pre-Настройки behaviour byte-identical). */
const PROFILE_JOINTS: JointOverrides = {
  connectorEndOffset_mm10: QORASU_PROFILE.defaults.joints.connectorEndOffset_mm10,
  frontRowSetback_mm10: QORASU_PROFILE.defaults.joints.system32.frontRowSetback_mm10,
  backRowSetback_mm10: QORASU_PROFILE.defaults.joints.system32.backRowSetback_mm10,
  hingeEndOffset_mm10: QORASU_PROFILE.defaults.joints.hinge.endOffset_mm10,
  s32Enabled: QORASU_PROFILE.defaults.joints.system32.enabled,
  rowMode: QORASU_PROFILE.defaults.joints.system32.rowMode,
};

/** Map the shop's «Настройки → Узлы» values (mm) to the solver's mm10 joint overrides. */
export function jointOverridesFromSettings(s: Settings): JointOverrides {
  return {
    connectorEndOffset_mm10: mmToMm10(s.connectorEndOffsetMm),
    frontRowSetback_mm10: mmToMm10(s.s32FrontRowSetbackMm),
    backRowSetback_mm10: mmToMm10(s.s32BackRowSetbackMm),
    hingeEndOffset_mm10: mmToMm10(s.hingeEndOffsetMm),
    s32Enabled: s.s32Enabled,
    rowMode: s.s32RowMode,
  };
}

/** One cabinet → solver input (carcass + adjustable shelves + optional hinged door). */
function cabInput(c: Cabinet, joints: JointOverrides = PROFILE_JOINTS) {
  const shelves = c.fill === "shelves" ? Math.max(0, c.count) : 0;
  // a hinged door exists on a closed cabinet whose door style isn't "Без" (index 3);
  // drawers carry fronts (no hinges) and open units have no door — both skip the cup step
  const hasDoor = c.fill !== "drawers" && c.fill !== "open" && c.door !== 3;
  return {
    id: c.id,
    height_mm: c.h,
    width_mm: c.w,
    depth_mm: c.depth ?? DEPTH[c.kind] ?? 560,
    shelves,
    hasDoor,
    hingeEdge: "left" as const,
    // POSYLKA 2026-08-13: the System-32 setback + cam offset + hinge setback are editable «Настройки → Узлы»
    // values now, not hardware specs — the shop's overrides (or the profile canon) drive the drilling solver.
    // System-32 OFF (`s32Enabled: false`) → no `system32` block → the solver drills no shelf-pin rows.
    connectorEndOffset_mm10: joints.connectorEndOffset_mm10,
    hingeEndOffset_mm10: joints.hingeEndOffset_mm10,
    system32: joints.s32Enabled
      ? { frontRowSetback_mm10: joints.frontRowSetback_mm10, backRowSetback_mm10: joints.backRowSetback_mm10, rowMode: joints.rowMode }
      : undefined,
  };
}

/** Can the drilling solver handle this cabinet?
 *
 *  It cannot handle a CUSTOM INTERIOR. `solveBaseCabinet` takes a flat `{shelves, hasDoor}` and
 *  assumes evenly-spread shelves, ONE full-height door hinged on the left, and no drawers at all
 *  (it emits zero slide holes). Hand it a cell-tree cabinet and it drills confidently wrong: hinge
 *  cups where there is no door, shelf-pin rows where there is no shelf. Worse, `cabInput` reads
 *  `fill`/`count`, which the Fill Editor never updates — so it would work from the cabinet's
 *  PRE-EDIT shape.
 *
 *  Until the solver learns the tree, such a module is EXCLUDED and reported. A missing module in
 *  the machine file is a visible problem; a ruined panel is not. */
export const canDrill = (c: Cabinet): boolean => !c.layout && !c.combinedDoors?.length;

/** Solve the whole run into engine Parts WITH drill operations. Furniture and custom-interior
 *  modules excluded (see `canDrill`). */
export function solveRun(cabs: Cabinet[], joints: JointOverrides = PROFILE_JOINTS): Part[] {
  const parts: Part[] = [];
  for (const c of cabs.filter((c) => !c.furniture && canDrill(c))) parts.push(...solveBaseCabinet(cabInput(c, joints), spec));
  return parts;
}

export interface MachiningReport {
  parts: Part[];
  ok: boolean;
  findings: ValidationFinding[];
  holeCount: number;
  partCount: number;
  /** modules left out because the solver cannot drill a custom interior — surfaced in the UI so
   *  nobody ships a machine file that is quietly missing cabinets. */
  skipped: Cabinet[];
}

/** Solve + run the safety gate. The UI shows this before unlocking the machine file. */
export function machiningReport(cabs: Cabinet[], joints: JointOverrides = PROFILE_JOINTS): MachiningReport | null {
  const real = cabs.filter((c) => !c.furniture);
  if (!real.length) return null;
  const skipped = real.filter((c) => !canDrill(c));
  const parts = solveRun(real, joints);
  const v = validateParts(parts);
  const holeCount = parts.reduce((n, p) => n + p.operations.length, 0);
  return { parts, ok: v.ok, findings: v.findings, holeCount, partCount: parts.length, skipped };
}

/** SWJ008 machine file — ONLY if the safety gate passes (mirrors solveAndExportSWJ008). */
export function runSWJ008(cabs: Cabinet[], joints: JointOverrides = PROFILE_JOINTS): string | null {
  const rep = machiningReport(cabs, joints);
  // no parts = every module was skipped — don't hand the shop an empty machine file
  if (!rep || !rep.ok || !rep.parts.length) return null;
  return exportSWJ008({ id: "jihozla", name: "Jihozla kitchen", parts: rep.parts });
}
