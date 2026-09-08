// The connector registry — every carcass-connector geometry, in one lookup.
//
// Note the shape of the guarantee here, which is NOT a boolean gate. The engine no
// longer refuses to work with an unmeasured connector; it decomposes, and reports how
// far the numbers can be trusted. That is the founder's ruling of 2026-08-15: drilling
// geometry is a VARIABLE with defaults, not a permission.

import type { CarcassConnector } from "../../contracts/design.js";
import type { ConnectorGeometry, GeometryConfidence } from "./types.js";

import { CAM_DOWEL } from "./cam_dowel.js";
import { CONFIRMAT } from "./confirmat.js";
import { DOWEL } from "./dowel.js";
import { RAFIX } from "./rafix.js";
import { SCREW } from "./screw.js";

export const CONNECTOR_GEOMETRY: Record<CarcassConnector, ConnectorGeometry> = {
  cam_dowel: CAM_DOWEL,
  confirmat: CONFIRMAT,
  dowel: DOWEL,
  rafix: RAFIX,
  screw: SCREW,
};

export function connectorGeometry(id: CarcassConnector): ConnectorGeometry {
  return CONNECTOR_GEOMETRY[id];
}

/**
 * What the report should say about trusting this connector's numbers — or null when
 * they are measured and there is nothing to warn about.
 *
 * "observed" is deliberately NOT silent. It means the holes are in the factory's own
 * files but nobody has confirmed which fastener makes them, and that distinction has
 * to survive all the way to whoever presses Export.
 */
export function geometryCaveat(id: CarcassConnector): string | null {
  const g = CONNECTOR_GEOMETRY[id];
  const say: Record<GeometryConfidence, string | null> = {
    measured: null,
    observed:
      "числа взяты из реальных заводских файлов, но пара «пласть ↔ торец» цехом не подтверждена — " +
      "проверить штангенциркулем перед первым запуском",
    standard:
      "числа из паспорта изделия, а не из замера этого цеха — привычки цеха могут отличаться",
    placeholder:
      "числа НЕ проверены ничем. Резать по ним нельзя — сначала замер",
  };
  const s = say[g.confidence];
  return s ? `${g.label}: ${s} (${g.source})` : null;
}

/** Face-hole distance from the mating edge, resolved against the real board thickness. */
export function faceHoleOffset_mm10(id: CarcassConnector, boardThickness_mm10: number): number {
  const o = CONNECTOR_GEOMETRY[id].faceHole.fromMatingEdge;
  return o.kind === "fixed" ? o.mm10 : Math.round(boardThickness_mm10 / 2);
}
