import type { Modifier, Anchor, AnchorEdge, mm10 } from "../contract/design";
import { anchorAxis } from "./resolve";

type Axis = "width" | "height" | "depth";

export interface Env3 {w_mm10: mm10;h_mm10: mm10;d_mm10: mm10;}
const AXIS_DIM: Record<"w" | "h" | "d", keyof Env3> = { w: "w_mm10", h: "h_mm10", d: "d_mm10" };

const AXIS_EDGES: Record<Axis, [AnchorEdge, AnchorEdge]> = {
  width: ["left", "right"],
  height: ["bottom", "top"],
  depth: ["back", "front"]
};

export interface Face {fa: Axis;fb: Axis;}

export function faceAxes(
orientation: {xAxis?: Axis;yAxis?: Axis;} | undefined,
dims: {width: mm10;height: mm10;depth: mm10;})
: Face {
  const AX: Axis[] = ["width", "height", "depth"];
  const thick = orientation?.xAxis && orientation?.yAxis ?
  AX.find((a) => a !== orientation.xAxis && a !== orientation.yAxis)! :
  dims.width <= dims.height && dims.width <= dims.depth ? "width" :
  dims.height <= dims.depth ? "height" : "depth";
  const face = AX.filter((a) => a !== thick);
  return { fa: face[0], fb: face[1] };
}

const fixed = (mm10: mm10): Anchor["distance"] => ({ rule: "fixed", mm10 });
const wholeEdge = (): Anchor["distance"] => ({ rule: "ratio", value: 0.5 });

function edgeAnchor(edgeId: string, face: Face): AnchorEdge {
  switch (edgeId) {
    case "e0":return AXIS_EDGES[face.fb][0];
    case "e1":return AXIS_EDGES[face.fb][1];
    case "e2":return AXIS_EDGES[face.fa][0];
    case "e3":return AXIS_EDGES[face.fa][1];
    default:return AXIS_EDGES[face.fb][0];
  }
}

export interface HoleSpec {w: mm10;h: mm10;radius: mm10;cx: mm10;cy: mm10;}
export function holeModifier(s: HoleSpec, face: Face): Modifier {
  return {
    type: "hole",
    anchors: [
    { edge: AXIS_EDGES[face.fa][0], distance: fixed(s.cx) },
    { edge: AXIS_EDGES[face.fb][0], distance: fixed(s.cy) }],

    params: { w: s.w, h: s.h, radius: s.radius }
  };
}

export interface ChamferSpec {edgeId: string;width: mm10;depth: mm10;}
export function chamferModifier(s: ChamferSpec, face: Face): Modifier {
  return {
    type: "bevel",
    anchors: [{ edge: edgeAnchor(s.edgeId, face), distance: wholeEdge() }],
    params: { width: s.width, depth: s.depth }
  };
}

export interface NotchSpec {edgeId: string;width: mm10;depth: mm10;radius: mm10;pos: mm10;}
export function notchModifier(s: NotchSpec, face: Face): Modifier {
  const alongMin = s.edgeId === "e0" || s.edgeId === "e1" ? AXIS_EDGES[face.fa][0] : AXIS_EDGES[face.fb][0];
  return {
    type: "notch",
    anchors: [{ edge: edgeAnchor(s.edgeId, face), distance: wholeEdge() }, { edge: alongMin, distance: fixed(s.pos) }],
    params: { width: s.width, depth: s.depth, radius: s.radius }
  };
}

export interface ViyemkaSpec {edgeId: string;pos: mm10;width: mm10;depth: mm10;run: mm10;rule: "fixed" | "ratio" | "locked";}
export function viyemkaModifier(s: ViyemkaSpec, face: Face, env?: Env3): Modifier {
  const edge = edgeAnchor(s.edgeId, face);
  let distance: Anchor["distance"];
  if (s.rule === "ratio") {
    const dim = env ? env[AXIS_DIM[anchorAxis(edge)]] : 0;
    distance = { rule: "ratio", value: dim > 0 ? Math.max(0, Math.min(1, s.pos / dim)) : 0 };
  } else {
    distance = { rule: s.rule, mm10: s.pos };
  }
  return {
    type: "viyemka",
    anchors: [{ edge, distance }],
    params: { width: s.width, depth: s.depth, run: s.run }
  };
}

export interface RoundSpec {cornerId: string;radius: mm10;}
export function roundModifier(s: RoundSpec, face: Face): Modifier {
  const sa = s.cornerId[1] === "1";
  const sb = s.cornerId[2] === "1";
  return {
    type: "round_corner",
    anchors: [
    { edge: AXIS_EDGES[face.fa][sa ? 1 : 0], distance: fixed(0) },
    { edge: AXIS_EDGES[face.fb][sb ? 1 : 0], distance: fixed(0) }],

    params: { radius: s.radius }
  };
}

export function laminateModifier(layers: 2 | 3): Modifier {
  return {
    type: "laminate",
    anchors: [],
    params: { layers }
  };
}

export interface PanelCuts {
  windows?: HoleSpec[];
  rounds?: RoundSpec[];
  chamfers?: ChamferSpec[];
  notches?: NotchSpec[];
  viyemkas?: ViyemkaSpec[];
  laminate?: 2 | 3;
}

export function panelModifiers(cuts: PanelCuts, face: Face, env?: Env3): Modifier[] {
  return [
  ...(cuts.windows ?? []).map((w) => holeModifier(w, face)),
  ...(cuts.rounds ?? []).map((r) => roundModifier(r, face)),
  ...(cuts.chamfers ?? []).map((c) => chamferModifier(c, face)),
  ...(cuts.notches ?? []).map((n) => notchModifier(n, face)),
  ...(cuts.viyemkas ?? []).map((v) => viyemkaModifier(v, face, env)),
  ...(cuts.laminate ? [laminateModifier(cuts.laminate)] : [])];

}
