// DB/41 — the app's window onto the engine POLICE service. The engine legislates ~25 checks
// (CE machine-safety / GEO geometry / CONS consistency / DET determinism / SENSE furniture sense),
// each with a severity (BLOCK / WARN / ADVISORY). The old Инженерия screen showed only a single
// "✓ passed / errors" line; this surfaces WHICH rule fired, in plain words, with its severity.
//
// Runs the ONE canonical decomposition (panelDecomposition over the bridge) and hands its parts to
// runPolice — never a re-derived geometry. Pure; the screen renders the result.

import { QORASU_PROFILE, panelDecomposition, runPolice, findRule } from "../../../../engine/index.js";
import { geometryCaveat, connectorGeometry, faceHoleOffset_mm10 } from "../../../../engine/index.js";
import type { Cabinet } from "./cabinet";
import { toDesignProject } from "./toDesign";

export type Severity = "BLOCK" | "WARN" | "ADVISORY";

/** One police finding, enriched for the UI with the rule's human title + severity + class. */
export interface PoliceFinding {
  ruleId: string;
  severity: Severity;
  cls: string;
  title: string;
  where: string;
  detail: string;
}

/** The carcass стяжка (connector), from the engine catalogue — never a hardcoded literal. Its Ø /
 *  depth / offset drive the display; `caveat` says how trustworthy the numbers are (DB/41). */
export interface ConnectorSpec {
  id: string;
  label: string;
  confidence: string;
  /** e.g. "Ø7×17 пласть · Ø4.5×34 торец · отступ 8мм" — the real geometry, catalogue-sourced. */
  geometry: string;
  caveat: string | null;
}

export interface PoliceResult {
  /** No BLOCK-severity violation — the manufacturing-safety gate is clean. */
  ok: boolean;
  findings: PoliceFinding[];
  /** Honest coverage — how many legislated rules actually ran. */
  coverage: { total: number; active: number };
  /** The active carcass connector, catalogue-sourced (Ø/depth/offset + confidence + caveat). */
  connector: ConnectorSpec;
}

/** Human string of a connector's real geometry (mm), from the engine catalogue. Board thickness
 *  resolves a half-thickness face offset (the confirmat signature — centre of the mating edge). */
function connectorSpecOf(): ConnectorSpec {
  const id = QORASU_PROFILE.defaults.joints.carcassConnector;
  const g = connectorGeometry(id);
  const t = QORASU_PROFILE.material.carcass_mm10;
  const mm = (v: number) => `${v / 10}`;
  const off = faceHoleOffset_mm10(id, t);
  const face = `Ø${mm(g.faceHole.diameter_mm10)}×${mm(g.faceHole.depth_mm10)} пласть`;
  const edge = g.edgeHole ? ` · Ø${mm(g.edgeHole.diameter_mm10)}×${mm(g.edgeHole.depth_mm10)} торец` : "";
  return {
    id, label: g.label, confidence: g.confidence,
    geometry: `${face}${edge} · отступ ${mm(off)}мм`,
    caveat: geometryCaveat(id),
  };
}

const SEVERITY_RANK: Record<Severity, number> = { BLOCK: 0, WARN: 1, ADVISORY: 2 };

/** Run the engine police over the current cabinet run and return findings for the UI, most-severe
 *  first. A BLOCK is a real machine-safety stop; WARN/ADVISORY are sense/taste and never block. */
export function runPoliceOnCabs(cabs: Cabinet[]): PoliceResult {
  const real = cabs.filter((c) => !c.furniture && !c.corner);
  const design = toDesignProject(real);
  const dec = panelDecomposition(design, QORASU_PROFILE);
  const report = runPolice({ parts: dec.parts, profile: QORASU_PROFILE, design, provenance: dec.provenance });

  const findings: PoliceFinding[] = report.violations.map((v) => {
    const rule = findRule(v.ruleId);
    return {
      ruleId: v.ruleId,
      severity: (rule?.severity ?? "WARN") as Severity,
      cls: rule?.cls ?? "",
      title: rule?.title ?? v.ruleId,
      where: v.where,
      detail: v.detail,
    };
  });
  findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return {
    ok: !findings.some((f) => f.severity === "BLOCK"),
    findings,
    coverage: { total: report.coverage.total, active: report.coverage.active },
    connector: connectorSpecOf(),
  };
}
