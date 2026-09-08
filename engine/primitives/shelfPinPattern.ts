// Layer-1 primitive: shelfPinPattern.
// Pure geometry. Every millimetre comes from the spec — NO numeric literals here.
//
// Convention (mm10, X along Length = cabinet height, Y along Width = depth):
// for each shelf position along X, drill a front-row and a back-row Ø-pin hole on
// Face A. The rows are set back from the panel's Y edges by the System-32 setbacks.

import type { mm10, DrillOp } from "../contracts/types.js";
import { mmToMm10 } from "../core/units.js";
import type { Panel, ShelfPinSpec } from "./types.js";

export function shelfPinPattern(
  sidePanel: Panel,
  shelfPositionsX: mm10[],
  // POSYLKA 2026-08-13: the System-32 row setback is no longer a hardware spec — it is a per-design PROFILE
  // setting (`profile.joints.system32.{front,back}RowSetback_mm10`, editable in Настройки → Узлы). There is
  // no factory constant to bless: 37mm is the GTV standard, the factory drills 91.5 / 114 / 65 per design.
  // The caller passes the mm10 values it read from the profile (or the panel's own per-design setback).
  spec: { pin: ShelfPinSpec; frontRowSetback_mm10: mm10; backRowSetback_mm10: mm10; rowMode?: "front_and_back" | "front_only" | "paired_32" },
): DrillOp[] {
  const diameter = mmToMm10(spec.pin.diameter);
  const depth = mmToMm10(spec.pin.depth);
  const frontY = spec.frontRowSetback_mm10;
  const backY = sidePanel.width_mm10 - spec.backRowSetback_mm10;
  // POSYLKA «Настройки → Узлы» rowMode: "front_only" drills just the front row (small shelves); the
  // default drills front+back so a shelf rests on 4 points. ("paired_32" needs the 32mm ladder — not wired.)
  const rows = spec.rowMode === "front_only" ? [frontY] : [frontY, backY];

  const ops: DrillOp[] = [];
  let seq = 0;
  for (const x of shelfPositionsX) {
    for (const y of rows) {
      ops.push({
        op: "drill",
        id: `pin_${sidePanel.id}_${seq++}`,
        face: "A",
        x_mm10: x,
        y_mm10: y,
        diameter_mm10: diameter,
        depth_mm10: depth,
        source: "auto",
      });
    }
  }
  return ops;
}
