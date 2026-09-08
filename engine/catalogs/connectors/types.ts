// СТЯЖКИ КОРПУСА — one physical file per connector family, per DB/41.
//
// WHY THIS REPLACED A REFUSAL. On 2026-08-15 the engine simply REFUSED to decompose
// when the profile chose any connector but cam_dowel, on the grounds that only
// cam_dowel had verified drilling geometry. The founder's answer was correct:
//
//     "confirmat: wtf? isn't it a variable? So please do write it with basic settings.
//      We could later edit that settings and physical file."
//
// A refusal was the wrong shape. Drilling geometry is DATA — the same class as a
// setting — so it gets a file with defaults, a confidence level, and a source. The
// master edits it; the engine reports how much to trust it. It never guesses silently
// and it never blocks work that a real shop is already doing.

import type { mm10 } from "../../contracts/types.js";
import type { CarcassConnector } from "../../contracts/design.js";

/**
 * HOW MUCH TO TRUST THESE NUMBERS. Deliberately four levels, not a boolean — the old
 * `verified: true/false` flag could not express "we can see it in 400 real holes but
 * the factory has not confirmed which fastener makes them".
 */
export type GeometryConfidence =
  /** Counted in the factory dump AND the pairing is unambiguous. Safe to cut. */
  | "measured"
  /** Seen in the factory dump; the pairing is inferred from geometry, not confirmed
   *  by the shop. Very likely right. Confirm before a first production run. */
  | "observed"
  /** From the fastener's published spec. Correct for the product, unconfirmed for
   *  this shop's habits. */
  | "standard"
  /** A guess. Present so the option exists and can be edited — not to be cut from. */
  | "placeholder";

/** Where the face hole sits, measured in from the joint's mating edge. */
export type FaceHoleOffset =
  | { kind: "fixed"; mm10: mm10 }
  /** Centred on the mating panel's edge — i.e. half the board thickness. Derived, not
   *  a constant, so it stays correct when the shop moves from 16mm to 18mm. */
  | { kind: "half_thickness" };

export interface ConnectorGeometry {
  id: CarcassConnector;
  label: string;
  confidence: GeometryConfidence;
  /** Where these numbers came from. Required — a dimension with no citation is a bug. */
  source: string;
  /** The hole in the RECEIVING panel's face. */
  faceHole: { diameter_mm10: mm10; depth_mm10: mm10; fromMatingEdge: FaceHoleOffset };
  /** The hole in the MATING panel's edge (end grain). Absent → this connector puts
   *  nothing in the edge (a screw driven straight through, for instance). */
  edgeHole?: { diameter_mm10: mm10; depth_mm10: mm10 };
  /** Anything a master needs to know that the numbers do not say. */
  notes?: string;
}
