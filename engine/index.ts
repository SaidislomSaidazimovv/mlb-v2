// engine/index.ts — the ONLY public surface of the engine (13 v2.0 / 14 Part 1).
//
// The engine is UI-free: it imports no React, RN, Three.js, Zustand or Expo, and
// runs identically in a phone, a browser, a Node test, or a CLI. The UI reaches it
// through exactly these two functions. All internal coordinates are mm10 integers;
// floats appear only at the render/export edges.

import {
  SCHEMA_VERSION,
  type FullResult,
  type Part,
  type PreviewPart,
  type PreviewResult,
  type Project,
} from "./contracts/types.js";
import { FACE_TO_SWJ } from "./core/face.js";
import { validateParts } from "./core/validate.js";
import { exportSWJ008 } from "./postprocessors/swj008.js";

// Re-export the public model + the one exporter the UI/exporters consume.
export * from "./contracts/types.js";
// Layer-2 parametric drilling solver — builds Parts WITH operations from a cabinet
// description, ready for solveFull/export (the "later layer" solveFull anticipates).
export { solveBaseCabinet, type BaseCabinetInput } from "./solver/baseCabinet.js";
export { loadHardwareSpec, hardwareSpec } from "./catalogs/hardwareSpec.js";
export { exportSWJ008 } from "./postprocessors/swj008.js";
export { parseSWJ008, parseSWJ008Document } from "./postprocessors/swj008Parse.js";
export { canonicalizeParts, canonicalizePart } from "./core/canonical.js";
export type {
  CanonicalDoc,
  CanonicalPanel,
  CanonicalOp,
  CanonicalContour,
  CanonicalGroove,
} from "./core/canonical.js";
// Canonical design layer (POSYLKA) — the public surface for the design contract, the
// workshop profiles, and the decomposer. Consumers import these from here, not internals.
export * from "./contracts/design.js";
export { QORASU_PROFILE, OTHER_SHOP_PROFILE } from "./catalogs/profiles.js";
export { panelDecomposition } from "./solver/panelDecomposition.js";
export { ciede2000, closestMaterials } from "./catalogs/materialAdvisor.js";
export type { CatalogueEntry, MaterialMatch, AdvisorOptions } from "./catalogs/materialAdvisor.js";
// DB/22 Слияние (merge) — adjacent cabinets in a run share a carcass side.
export { planMerges, suppressedLeftSides, firstBlocker, findBlocker, ALL_BLOCKERS } from "./solver/merge/registry.js";
export type { MergeBlocker, MergeCandidate, MergeGroup, MergePlan } from "./solver/merge/types.js";
// DB/41 Police — the machine-safety + sense rule service (CE/GEO/CONS/DET/SENSE).
export { runPolice, rulesOfClass, findRule, ALL_RULES } from "./police/registry.js";
export type { Rule, Violation, PoliceReport, PoliceContext } from "./police/types.js";
// DB/41 Connectors — per-family стяжка geometry with a confidence level.
export { CONNECTOR_GEOMETRY, connectorGeometry, geometryCaveat, faceHoleOffset_mm10 } from "./catalogs/connectors/registry.js";
export type { ConnectorGeometry, GeometryConfidence } from "./catalogs/connectors/types.js";
export { derivePartId, deriveOpId } from "./core/ids.js";

/**
 * solvePreview(project): sync, cheap (~2ms), bounded per gesture tick.
 * Returns bounding boxes + LOD drill ZONES/COUNTS per face — never the individual
 * operation coordinates. Safe to call on every drag frame (14 topology rule 1).
 */
export function solvePreview(project: Project): PreviewResult {
  const parts: PreviewPart[] = project.parts.map((part) => {
    const counts = new Map<Part["operations"][number]["face"], number>();
    for (const op of part.operations) {
      counts.set(op.face, (counts.get(op.face) ?? 0) + 1);
    }
    const drillZones = [...counts.entries()].map(([face, count]) => ({
      face,
      count,
      // LOD region = the whole panel face; full coordinates are withheld here.
      region: { x: 0, y: 0, w: part.length_mm10, h: part.width_mm10 },
    }));
    // Stable order so the preview packet is deterministic.
    drillZones.sort((a, b) => FACE_TO_SWJ[a.face] - FACE_TO_SWJ[b.face]);

    return {
      id: part.id,
      bbox: {
        x: 0,
        y: 0,
        z: 0,
        w: part.length_mm10,
        h: part.width_mm10,
        d: part.thickness_mm10,
      },
      drillZones,
    };
  });

  return { parts };
}

/**
 * solveFull(project): async, heavy. Debounced after gesture / on commit / for export.
 * Produces the manufacturing-grade MachiningPlan plus the validation report; the
 * safety gate runs here and export is blocked unless it is clean. The execution
 * location is swappable behind this Promise (on-device async now); the contract
 * never changes (14 topology rules 2–3).
 */
export async function solveFull(project: Project): Promise<FullResult> {
  // In V1 the parts already carry their operations (solver/custom-authored).
  // Later layers (Layer 2 parametric solver) plug in here behind the same contract.
  const parts = project.parts;
  const validation = validateParts(parts);

  return {
    plan: { parts, schemaVersion: SCHEMA_VERSION },
    validation,
  };
}

/**
 * Convenience for exporters/tests: run the full solve and, only if the safety gate
 * passes, emit SWJ008. Mirrors GATE 1 → exporter ordering (nothing exports dirty).
 */
export async function solveAndExportSWJ008(project: Project): Promise<string> {
  const { plan, validation } = await solveFull(project);
  if (!validation.ok) {
    throw new Error(
      `MACHINING_VALIDATION_FAILED: ${validation.findings.map((f) => f.code).join(", ")}`,
    );
  }
  return exportSWJ008({ ...project, parts: plan.parts });
}
