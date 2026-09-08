import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Cabinet, Cell, ComponentRef } from "../model/cabinet";
import type { Settings } from "../model/settings";
import { GEOM, type KitchenStyle } from "../model/layout";
import { buildCabinetSolo } from "../three/kitchen3d";
import { V21BlueprintEditor } from "./V21BlueprintEditor";
import { DimSlider, GlyphD } from "./DimControls";
import { FillEditor, FILL_TOOLS, ToolIcon, leavesForCab, allFrontsForCab, interiorDivsForCab, moveDivider, flattenedLayout, snapLineFraction, deletePartGroup, detachPartGroup, duplicatePartGroup, setPartFrontProfile, partFrontProfile, acceptComponentUpdate, splitCellAt, setCellFront, setCellComponent, cycleCellContent, cellVariant, type Tool } from "./FillEditor";
import type { FrontProfile } from "../model/cabinet";
import { latestComponentVersion } from "../model/componentLibrary";
import { CARCASS_THICKNESS_MM } from "@mebelchi/pricing";
import { catalogByColor } from "../model/materials";
import { useStore } from "../store";
import { useT } from "../i18n/useT";
import { cabBand, cabDepth, D_MIN, D_MAX } from "../model/bands";
import { resolveComponent } from "../model/componentLibrary";
import { fitCheckDefault } from "../model/componentPreview";
import { fmtLen, lenUnitLabel, type LenUnit } from "../model/units";
import { drawerMinMm, maxShelfSpanMm } from "../model/deflection";
import { QORASU_PROFILE } from "../../../../engine/index.js"; // profile — back-zone for the shelf-sag depth (§4)
import { jiyakSpecForRole, effectiveKromkaForRole } from "../model/cncExport"; // §Слои · per-role Кромка (jiyak) for the parts panel + 3D banding
import type { EdgeKromka } from "../../../../engine/index.js";
import { purposeOf, purposeTag } from "../model/purposeTags";
import { IconUndo, IconRedo, IconLines } from "../components/icons";

/** Neutral fallback finish for the isolated studio when the caller supplies no kitchen style. */
const DEFAULT_SOLO_STYLE: KitchenStyle = { carcass: 0xeeece6, facade: 0xc8a878, worktop: 0xd8d8d8, handle: 0x8e9499, glassUppers: false };

/** Build the isolated cabinet mesh — one place so the mount + rebuild effects can't diverge.
 *  «2D Чертеж» still needs a 3D mesh behind the SVG overlay, so it maps to the solid 3D build. */
function makeSoloMesh(cab: Cabinet, viewMode: "3d" | "2d" | "outline", style: KitchenStyle | undefined, settings?: Settings): THREE.Group {
  return buildCabinetSolo(cab, style ?? DEFAULT_SOLO_STYLE, {
    outline: viewMode === "outline",
    hardwareOpts: { family: settings?.jointFamily, setbackMm: settings?.jointSetbackMm, system32SetbackMm: settings?.system32SetbackMm },
  });
}

/** Free a built group's geometries + materials — the studio makes a fresh mesh on every edit. */
function disposeGroup(g: THREE.Object3D): void {
  g.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const m = mesh.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
  });
}

/** APPLICATION MODE (Наполнение, §8.4): the furniture goes near-transparent and the
 *  space's CONTENTS appear — a low-poly ghost prop from the cabinet's purpose tag (the
 *  boiler is the hero). Props are communication, not CAD. The studio's materials are
 *  per-build (makeMats caches per call), so mutating opacity here is self-contained and
 *  freed by disposeGroup on the next rebuild. */
function applyApplicationMode(mesh: THREE.Group, cab: Cabinet): void {
  mesh.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const ghost = (mat: THREE.Material) => { mat.transparent = true; mat.opacity = 0.16; mat.depthWrite = false; };
    if (Array.isArray(m.material)) m.material.forEach(ghost);
    else if (m.material) ghost(m.material);
  });
  const tag = purposeTag(purposeOf(cab));
  if (!tag) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const s = Math.max(0.05, Math.min(size.x, size.y, size.z) * 0.5);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tag.prop.color), roughness: 0.8, metalness: 0.05 });
  const geo =
    tag.prop.shape === "cylinder" ? new THREE.CylinderGeometry(s * 0.4, s * 0.4, s * 1.2, 20) :
    tag.prop.shape === "stack" ? new THREE.BoxGeometry(s * 0.9, s * 0.5, s * 0.7) :
    new THREE.BoxGeometry(s * 0.8, s * 0.8, s * 0.8);
  const prop = new THREE.Mesh(geo, mat);
  prop.position.copy(center);
  mesh.add(prop);
}

/** RENDER MODE (v9 `matFor`): «Материалы» (mat) = the material colours at .45 opacity · «X-ray» = all
 *  translucent .16 (holes/joints would appear here once drilling F1 lands) · «Наполнение» (application)
 *  = §8.4 ghost + prop. real/Каркас(wire=outline)/Без фасадов are handled elsewhere. Mutating the
 *  per-build materials is self-contained — freed by disposeGroup on the next rebuild. */
function applyRenderMode(mesh: THREE.Group, mode: string, cab: Cabinet): void {
  if (mode === "application") { applyApplicationMode(mesh, cab); return; }
  if (mode === "nofront") { // «Без фасадов» — hide the openable subgroups (doors/drawers) → the interior shows
    mesh.traverse((obj) => { if (obj.userData && obj.userData.openable) obj.visible = false; });
    return;
  }
  if (mode !== "mat" && mode !== "xray") return;
  mesh.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const tune = (mat: THREE.Material) => {
      mat.transparent = true;
      mat.opacity = mode === "xray" ? 0.16 : 0.45;
      if (mode === "xray") mat.depthWrite = false;
    };
    if (Array.isArray(m.material)) m.material.forEach(tune);
    else if (m.material) tune(m.material);
  });
}

/** §15.2 «Аксесс.» op-mode — ghost the whole body so the metal HARDWARE (userData.accessory: handles/GOLA,
 *  tagged in kitchen3d) stands out. NOTE: only handles are modelled today; slide rails / hinges (v9's
 *  направляющие·петли) need their positions from the profile (F1 / FACTORY_CHECKLIST = founder) before they
 *  can be drawn here. Materials are per-build (freed by disposeGroup on the next rebuild), so this is safe. */
function applyAccessoryMode(mesh: THREE.Group): void {
  mesh.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh || m.userData?.accessory) return; // keep hardware bright
    const ghost = (mat: THREE.Material) => { mat.transparent = true; mat.opacity = 0.09; mat.depthWrite = false; };
    if (Array.isArray(m.material)) m.material.forEach(ghost);
    else if (m.material) ghost(m.material);
  });
}

/** «Узлы» op-mode · ghost the whole box translucent (v9's xray view) so the System-32 joint markers
 *  built inside it read clearly — the "different colour" the box takes on when you enter «Узлы».
 *  Per-build materials (freed by disposeGroup on the next rebuild), so mutating opacity here is safe. */
function applyUzlyMode(mesh: THREE.Group): void {
  mesh.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const ghost = (mat: THREE.Material) => { mat.transparent = true; mat.opacity = 0.18; mat.depthWrite = false; };
    if (Array.isArray(m.material)) m.material.forEach(ghost);
    else if (m.material) ghost(m.material);
  });
}

/** §A · «Эшик очилиб ичида тортма» — apply an open amount (0..1) to ONE openable subgroup (a door hinges,
 *  a drawer slides). kitchen3d tags each as userData.openable; ported from CabinetPreview3D so the studio
 *  opens exactly the way the room preview does. A combined door over drawer cells → the door swings and the
 *  drawers behind it show (they are their own openables, built by buildCells under the overlay). */
function applyOpenTo(o: THREE.Object3D, amount: number): void {
  const od = o.userData.openable as { kind: string; rad?: number; maxRad?: number; axis?: string; maxZ?: number };
  if (od.kind === "door") {
    const rad = od.rad ?? -(od.maxRad ?? 0);
    if (od.axis === "x") o.rotation.x = amount * rad;
    else o.rotation.y = amount * rad;
  } else o.position.z = amount * (od.maxZ ?? 0);
}

/** §Скрыть · ephemeral hide — set each front subgroup's visibility from the hidden-groups list (session-only,
 *  NO model field → §1.4 invariant). A hidden front's mesh vanishes; its pick-slab stays so it can be re-selected
 *  and shown again. Re-applied after every mesh rebuild (the build is fresh on each edit). An empty list resets
 *  everything to visible, so un-hide works without a rebuild. */
function applyHiddenTo(mesh: THREE.Group, hidden: string[]): void {
  mesh.traverse((o) => {
    const pp = o.userData.partPath as number[] | undefined;
    if (pp) o.visible = !hidden.includes(`${o.userData.partKind}@${pp.join(".")}`);
  });
}

const NO_HIDDEN: string[] = []; // §Скрыть · stable empty default for the hiddenGroups prop (avoids effect-dep churn)

type OpenableEntry = { o: THREE.Object3D; cur: number; target: number; wc: THREE.Vector3 };
/** Collect every openable subgroup of a freshly-built mesh, set it to `target` at once (so an open door
 *  stays open across the studio's per-edit rebuilds), and return the list the animation loop eases. Each
 *  entry keeps its own `target` (so ONE drawer can open — §A per-part) and its CLOSED world centre `wc`
 *  (so a selected Part can be matched to its openable by position). */
function collectOpenables(mesh: THREE.Group, target: number): OpenableEntry[] {
  const list: OpenableEntry[] = [];
  mesh.updateMatrixWorld(true);
  mesh.traverse((o) => {
    if (!o.userData.openable) return;
    const wc = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); // centre while still CLOSED
    applyOpenTo(o, target);
    list.push({ o, cur: target, target, wc });
  });
  return list;
}

/** §5 · Map an interior leaf rect (fractions, Y-up so fy1 = TOP) to a 3D box {size, pos} in the
 *  studio's WORLD frame. ONE source of truth for both the blue selection volume and the invisible
 *  raycast pick-slabs, so they can never drift apart (the earlier Y/Z bugs came from duplicated
 *  math). Mirrors buildCabinetSolo (kitchen3d.ts): X centred at 0, Y from plinth→carcass top, Z
 *  group-shifted −dM/2 (kitchen3d.ts:999). Reads geometry only; stores nothing. */
function leafToBox(rect: { fx0: number; fy0: number; fx1: number; fy1: number }, cab: Cabinet):
  { size: [number, number, number]; pos: [number, number, number] } {
  const wM = cab.w / 1000, dM = cabDepth(cab) / 1000, th = (cab.boardThickness ?? 16) / 1000;
  const band = cabBand(cab);
  const yBottom = cab.kind === "upper" ? 0 : GEOM.plinth / 1000;
  const yTop = cab.kind === "upper" ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
  const inW = wM - 2 * th, inH = yTop - th - (yBottom + th), inD = dM - th;
  const { fx0, fy0, fx1, fy1 } = rect;
  return {
    size: [Math.max(0.002, (fx1 - fx0) * inW), Math.max(0.002, (fy1 - fy0) * inH), Math.max(0.002, inD)],
    pos: [-wM / 2 + th + (fx0 + fx1) / 2 * inW, yBottom + th + inH * ((fy0 + fy1) / 2), -dM / 2 + th + inD / 2],
  };
}

/** §5 · one PART (Деталь) — as a world-space box + stable id + role + adaptive-GROUP. The group is the
 *  §5:104 "siblings" set: unique → itself; 2+ siblings → the type. Carcass parts group by role (the two
 *  sides are the only >1 role); interior shelves/dividers group by their PARENT split; fronts by their
 *  cell's parent — so tapping a shelf selects its column's shelves, not every shelf in the cabinet. */
type PartBox = { id: string; role: string; group: string; size: [number, number, number]; pos: [number, number, number] };

/** §5 · the CARCASS-SHELL parts of a cabinet — sides · bottom · top · back · plinth — each as a
 *  world-space box, mirroring buildCabinetSolo/hollowCarcass (kitchen3d.ts) EXACTLY (honouring
 *  vkladnoe bottom · topMode stretchers/none · back overlay/groove/none · plinth), plus the group's
 *  −dM/2 Z shift. Invisible pick-slabs built from these coincide with the visible panels → no drift.
 *  Interior shelves/dividers + fronts are a LATER slice. Reads geometry only; stores nothing. */
function shellPartsForCab(cab: Cabinet): PartBox[] {
  const wM = cab.w / 1000, dM = cabDepth(cab) / 1000, t = (cab.boardThickness ?? 16) / 1000;
  const band = cabBand(cab);
  const isUpper = cab.kind === "upper";
  const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
  const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
  const h = yTop - yBottom, yc = (yTop + yBottom) / 2;
  const z0 = -dM / 2; // group shifted −dM/2 (kitchen3d.ts:999): world z = local z − dM/2
  const parts: Omit<PartBox, "group">[] = []; // group = role for carcass ("side" pair — and "stretcher" pair when topMode==="stretchers")
  // sides — full envelope (t × h × dM); simple slab even for gola (a pick target, not the notched mesh)
  parts.push({ id: "side-left", role: "side", size: [t, h, dM], pos: [-wM / 2 + t / 2, yc, z0 + dM / 2] });
  parts.push({ id: "side-right", role: "side", size: [t, h, dM], pos: [wM / 2 - t / 2, yc, z0 + dM / 2] });
  // bottom — vkladnoe (inset between sides) vs nakladnoe (full width)
  const btmW = cab.bottomMode === "vkladnoe" ? wM - 2 * t : wM;
  parts.push({ id: "bottom", role: "bottom", size: [btmW, t, dM], pos: [0, yc - h / 2 + t / 2, z0 + dM / 2] });
  // top — full lid · two 80mm stretchers · none
  const topMode = cab.topMode ?? "full";
  if (topMode === "stretchers") {
    const stD = 0.08, stW = wM - 2 * t;
    parts.push({ id: "stretcher-front", role: "stretcher", size: [stW, t, stD], pos: [0, yc + h / 2 - t / 2, z0 + dM - stD / 2] });
    parts.push({ id: "stretcher-back", role: "stretcher", size: [stW, t, stD], pos: [0, yc + h / 2 - t / 2, z0 + stD / 2] });
  } else if (topMode !== "none") {
    parts.push({ id: "top", role: "top", size: [wM, t, dM], pos: [0, yc + h / 2 - t / 2, z0 + dM / 2] });
  }
  // back — overlay (16mm LDSP) vs groove (3mm HDF, set back) vs none
  const hasBack = cab.hasBack ?? (cab.backMount !== "none");
  if (hasBack) {
    if (cab.backMount === "overlay") parts.push({ id: "back", role: "back", size: [wM, h, t], pos: [0, yc, z0 + t / 2] });
    else { const g = (cab.grooveSetback ?? 12) / 1000; parts.push({ id: "back", role: "back", size: [wM - 2 * t, h - 2 * t, 0.003], pos: [0, yc, z0 + g + 0.0015] }); }
  }
  // plinth (base/tall only) — the recessed toe-kick
  if (!isUpper) parts.push({ id: "plinth", role: "plinth", size: [wM, GEOM.plinth / 1000, dM * 0.85], pos: [0, GEOM.plinth / 2000, z0 + dM / 2] });
  return parts.map((p) => ({ ...p, group: p.role })); // carcass: siblings = the role ("side" always 2; "stretcher" 2 when topMode==="stretchers")
}

const CARCASS_T = CARCASS_THICKNESS_MM / 1000; // interior dividers use this (kitchen3d.ts:50), NOT cab.boardThickness

/** §5 · the INTERIOR parts — shelves (Полка, a "rows" split) + vertical dividers (Стойка, a "cols"
 *  split) — from the cell tree, mirroring buildInterior/buildCells (kitchen3d.ts:1259-1260,1294-1295)
 *  EXACTLY: interior board t = CARCASS_T, depth zd = dM − t − 30mm, centred at world z = t/2. */
function interiorPartsForCab(cab: Cabinet): PartBox[] {
  const wM = cab.w / 1000, dM = cabDepth(cab) / 1000, t = CARCASS_T;
  const band = cabBand(cab);
  const isUpper = cab.kind === "upper";
  const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
  const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
  const h = yTop - yBottom;
  const iw = wM - 2 * t, ih = h - 2 * t, x0 = -wM / 2 + t, yb = yBottom + t;
  const zWorld = t / 2, zd = dM - t - 0.03; // world z = local (dM/2 + t/2) − dM/2 = t/2
  const parts: PartBox[] = [];
  let si = 0, vi = 0;
  for (const d of interiorDivsForCab(cab)) {
    const pk = d.parent.join("."); // siblings = dividers of the SAME split (same parent)
    if (d.kind === "shelf") parts.push({ id: `shelf-${si++}`, role: "shelf", group: `shelf@${pk}`, size: [iw * (d.b1 - d.b0), t, zd], pos: [x0 + iw * (d.b0 + d.b1) / 2, yb + ih * d.af, zWorld] });
    else parts.push({ id: `vertical-${vi++}`, role: "divider", group: `divider@${pk}`, size: [t, ih * (d.b1 - d.b0), zd], pos: [x0 + iw * d.af, yb + ih * (d.b0 + d.b1) / 2, zWorld] });
  }
  return parts;
}

/** §5 · the FRONT parts — per-cell doors/drawers (a leaf with `cell.front`) + combined-door overlays
 *  (cab.combinedDoors) — each as a thin slab at the module face, mirroring buildFront (kitchen3d.ts:
 *  1172-1186): outer edges reach the module edge, inner edges meet at the divider centre (REVEAL gap),
 *  front face at local z = dM → world z = dM/2. (Gola top-gap ignored — negligible for a pick target.) */
function frontPartsForCab(cab: Cabinet, includeInner = false): PartBox[] {
  const wM = cab.w / 1000, dM = cabDepth(cab) / 1000, t = CARCASS_T;
  const band = cabBand(cab);
  const isUpper = cab.kind === "upper";
  const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
  const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
  const h = yTop - yBottom, yc = (yTop + yBottom) / 2;
  const iw = wM - 2 * t, ih = h - 2 * t, REVEAL = 0.0025, z0 = -dM / 2;
  // group = the front's OWN full path → each front (drawer/door) is its own INDIVIDUAL selection, so it is
  // picked + opened + deleted on its own (v9 model). Identical siblings are still counted as a «Тип» in the
  // cut list (pricing/BOM) — that is a separate layer from the 3D picker. Each combined door is unique too.
  // `includeInner` also lists fronts NESTED behind another front (inner drawers) — for 3D-click select /
  // highlight / dims — but the PICK SLABS use the top-level list only, so they don't occlude the parent.
  const rects: { r: { fx0: number; fy0: number; fx1: number; fy1: number }; kind: "door" | "drawer"; group: string }[] = [];
  if (includeInner) for (const f of allFrontsForCab(cab)) rects.push({ r: { fx0: f.fx0, fy0: f.fy0, fx1: f.fx1, fy1: f.fy1 }, kind: f.kind, group: `${f.kind}@${f.path.join(".")}` });
  else for (const l of leavesForCab(cab)) if (l.cell.front) rects.push({ r: { fx0: l.fx0, fy0: l.fy0, fx1: l.fx1, fy1: l.fy1 }, kind: l.cell.front, group: `${l.cell.front}@${l.path.join(".")}` });
  let ci = 0;
  for (const cd of cab.combinedDoors ?? []) rects.push({ r: { fx0: cd.fx0, fy0: cd.fy0, fx1: cd.fx1, fy1: cd.fy1 }, kind: "door", group: `door@cd${ci++}` });
  const parts: PartBox[] = [];
  let di = 0;
  for (const { r, kind, group } of rects) {
    const outerL = r.fx0 <= 0.001, outerR = r.fx1 >= 0.999, outerB = r.fy0 <= 0.001, outerT = r.fy1 >= 0.999;
    const xL = (outerL ? -wM / 2 : -wM / 2 + t + iw * r.fx0) + (outerL ? REVEAL : REVEAL / 2);
    const xR = (outerR ? wM / 2 : -wM / 2 + t + iw * r.fx1) - (outerR ? REVEAL : REVEAL / 2);
    const yB = (outerB ? yc - h / 2 : yc - h / 2 + t + ih * r.fy0) + (outerB ? REVEAL : REVEAL / 2);
    const yT = (outerT ? yc + h / 2 : yc - h / 2 + t + ih * r.fy1) - (outerT ? REVEAL : REVEAL / 2);
    parts.push({ id: `front-${di++}`, role: kind, group, size: [Math.max(0.002, xR - xL), Math.max(0.002, yT - yB), 0.03], pos: [(xL + xR) / 2, (yB + yT) / 2, z0 + dM] });
  }
  return parts;
}

/** §B · a placed library component (a leaf with `cell.component`) as ONE pickable part — a box filling
 *  its cell, group `component@path`. This is what puts the component into the SAME pipeline the block's
 *  own parts use: a pick-slab so a 3D tap selects it, a «Слои · Детали» row so it shows its selection UI,
 *  and `deletePartGroup("component@…")` so it can be removed — none of which worked while it was drawn
 *  only as loose meshes. Coordinates mirror interiorPartsForCab, so the slab coincides with the panels
 *  kitchen3d draws (which are tagged `component@path` too, so the highlight matches). */
function componentPartsForCab(cab: Cabinet): PartBox[] {
  const wM = cab.w / 1000, dM = cabDepth(cab) / 1000, t = CARCASS_T;
  const band = cabBand(cab);
  const isUpper = cab.kind === "upper";
  const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
  const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
  const h = yTop - yBottom;
  const iw = wM - 2 * t, ih = h - 2 * t, x0 = -wM / 2 + t, yb = yBottom + t, zWorld = t / 2, zd = dM - t - 0.03;
  const parts: PartBox[] = [];
  for (const l of leavesForCab(cab)) {
    if (!l.cell.component) continue;
    const cellW = iw * (l.fx1 - l.fx0), cellH = ih * (l.fy1 - l.fy0);
    parts.push({
      id: `component-${l.path.join(".")}`, role: "component", group: `component@${l.path.join(".")}`,
      size: [Math.max(0.01, cellW), Math.max(0.01, cellH), zd],
      pos: [x0 + iw * (l.fx0 + l.fx1) / 2, yb + ih * (l.fy0 + l.fy1) / 2, zWorld],
    });
  }
  return parts;
}

/** §5 · ALL pickable parts = carcass shell + interior shelves/dividers + fronts + placed components.
 *  The adaptive group rule (CF4 §5:104) groups these by `role` (side · bottom · top · stretcher · back ·
 *  plinth · shelf · divider · door · drawer · component). */
function partsForCab(cab: Cabinet): PartBox[] {
  return [...shellPartsForCab(cab), ...interiorPartsForCab(cab), ...frontPartsForCab(cab), ...componentPartsForCab(cab)];
}

/** partsForCab PLUS the inner drawers nested behind a front (a §A door pull-out / §B sled). Used for
 *  3D-click SELECT · highlight · dims · open — NOT for the pick slabs (those stay top-level so a click on a
 *  parent front isn't stolen by an inner one coplanar with it). */
function allPartsForCab(cab: Cabinet): PartBox[] {
  return [...shellPartsForCab(cab), ...interiorPartsForCab(cab), ...frontPartsForCab(cab, true), ...componentPartsForCab(cab)];
}

/** «Кромка» op-mode 3D banding: thin coloured strips on a panel's banded perimeter edges. A panel's
 *  THINNEST axis is its thickness; the four perimeter edges of its large face map to the role's edges
 *  (thick-X = side → front/back/top/bottom · thick-Y = shelf/top/bottom → front/back/left/right ·
 *  thick-Z = door/back → left/right/top/bottom). Each edge with a K → a strip in that tape's colour. */
type PerimEdge = { edge: keyof EdgeKromka; center: [number, number, number]; axis: "x" | "y" | "z"; len: number };
function perimeterEdgesFor(part: PartBox): PerimEdge[] {
  const [sx, sy, sz] = part.size, [px, py, pz] = part.pos;
  const out: PerimEdge[] = [];
  if (sx <= sy && sx <= sz) { // thickness = X → side panel
    out.push({ edge: "front", center: [px, py, pz + sz / 2], axis: "y", len: sy });
    out.push({ edge: "back", center: [px, py, pz - sz / 2], axis: "y", len: sy });
    out.push({ edge: "top", center: [px, py + sy / 2, pz], axis: "z", len: sz });
    out.push({ edge: "bottom", center: [px, py - sy / 2, pz], axis: "z", len: sz });
  } else if (sy <= sz) { // thickness = Y → shelf / bottom / top / worktop
    out.push({ edge: "front", center: [px, py, pz + sz / 2], axis: "x", len: sx });
    out.push({ edge: "back", center: [px, py, pz - sz / 2], axis: "x", len: sx });
    out.push({ edge: "left", center: [px - sx / 2, py, pz], axis: "z", len: sz });
    out.push({ edge: "right", center: [px + sx / 2, py, pz], axis: "z", len: sz });
  } else { // thickness = Z → door / back / front
    out.push({ edge: "left", center: [px - sx / 2, py, pz], axis: "y", len: sy });
    out.push({ edge: "right", center: [px + sx / 2, py, pz], axis: "y", len: sy });
    out.push({ edge: "top", center: [px, py + sy / 2, pz], axis: "x", len: sx });
    out.push({ edge: "bottom", center: [px, py - sy / 2, pz], axis: "x", len: sx });
  }
  return out;
}
const bandDims = (axis: "x" | "y" | "z", len: number, cross: number): [number, number, number] =>
  axis === "x" ? [len, cross, cross] : axis === "y" ? [cross, len, cross] : [cross, cross, len];

/** §5 · a part role → its Russian name (GLOSSARY / CF4 §5 terms). RU-only, matching the RU-only
 *  material catalog (EMAN_MATERIALS) — so the info card reads in one language. */
const PART_RU: Record<string, string> = {
  side: "Бок", bottom: "Дно", top: "Крышка", stretcher: "Царга", back: "Задняя стенка", plinth: "Цоколь",
  shelf: "Полка", divider: "Стойка", door: "Дверь", drawer: "Фасад ящика", component: "Компонент",
};
/** §5 · which finish surface a part's colour comes from — fronts band like the facade, the rest is
 *  the carcass body (the app's finish model has no separate back/shelf colour; A/B/C isn't built). */
const partFinishKey = (role: string): "facade" | "carcass" => (role === "door" || role === "drawer" ? "facade" : "carcass");
/** colour int → CSS hex, for the info card's material bar when no exact catalog match is found. */
const intToHex = (n: number): string => `#${(n >>> 0).toString(16).padStart(6, "0").slice(-6)}`;

/** §5:106 · a resize HANDLE — grabbed to resize the selected part along ONE of its two editable axes
 *  (thickness = the material axis, never dragged). `dim` = which cabinet dimension it drives. */
type ResizeHandle = { dim: "h" | "w" | "d"; pos: [number, number, number] };

/** §5:106 · the resize handles for a selected carcass role, each on ONE of the part's TWO editable
 *  axes (a Бок is thin in X → its axes are H·D; Дно/Крышка/Царга thin in Y → W·D; Задняя стенка thin
 *  in Z → W·H). Positions are in the studio world frame (matches shellPartsForCab). Interior parts
 *  (shelf/divider/front) resize by moving Lines — a later step — so they get no envelope handles. */
function resizeHandlesFor(role: string, cab: Cabinet): ResizeHandle[] {
  const wM = cab.w / 1000, dM = cabDepth(cab) / 1000;
  const band = cabBand(cab);
  const isUpper = cab.kind === "upper";
  const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
  const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
  const yC = (yBottom + yTop) / 2;
  const H: ResizeHandle = { dim: "h", pos: [0, yTop, 0] };        // top-centre → height (plinth-anchored)
  const W: ResizeHandle = { dim: "w", pos: [wM / 2, yC, 0] };     // right-centre → width (centred → symmetric)
  const D: ResizeHandle = { dim: "d", pos: [0, yC, dM / 2] };     // front-centre → depth (centred → symmetric)
  if (role === "side") return [H, D];
  if (role === "top" || role === "bottom" || role === "stretcher") return [W, D];
  if (role === "back") return [W, H];
  return [];
}

/** §342 · a SPACE resize handle — sits on a bounding Line (interior divider) of the selected cell;
 *  dragging it MOVES that Line (never resizes the void directly). `parent`/`i` address the divider
 *  for `moveDivider`; `pf0..pf1` = the parent's span (fraction) along the split axis. */
type LineHandle = { parent: number[]; i: number; split: "rows" | "cols"; pf0: number; pf1: number; pos: [number, number, number] };
/** §342 · a CORNER handle — where a vertical Line and a horizontal Line meet at a cell corner. Drag
 *  moves BOTH ("resize like a table, X and Y"): one moveDivider per axis. */
type CornerHandle = { vLine: LineHandle; hLine: LineHandle; pos: [number, number, number] };

/** §342 · the movable Lines bounding a selected cell → an EDGE handle on each (single-axis, precise)
 *  and a CORNER handle where two Lines meet ("corner handles resize like a table, X and Y"). Carcass
 *  walls are not Lines, so no handle there (the envelope resizes via the carcass part handles). World
 *  frame matches the blue space volume (leafToBox); handles sit on the front face for grabbing. */
type SideBounds = { l: LineHandle | null; r: LineHandle | null; b: LineHandle | null; t: LineHandle | null };
function spaceResizeHandlesFor(rect: { fx0: number; fy0: number; fx1: number; fy1: number }, cab: Cabinet): { edges: LineHandle[]; corners: CornerHandle[]; bounds: SideBounds } {
  const wM = cab.w / 1000, dM = cabDepth(cab) / 1000, th = (cab.boardThickness ?? 16) / 1000;
  const band = cabBand(cab);
  const isUpper = cab.kind === "upper";
  const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
  const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
  const inW = wM - 2 * th, inH = yTop - th - (yBottom + th);
  const px = (fx: number) => -wM / 2 + th + fx * inW;
  const py = (fy: number) => yBottom + th + fy * inH;
  const zFront = dM / 2; // world front face — grabbable
  const { fx0, fy0, fx1, fy1 } = rect, eps = 3e-3;
  const edges: LineHandle[] = [];
  const bnd: SideBounds = { l: null, r: null, b: null, t: null };
  for (const d of interiorDivsForCab(cab)) {
    if (d.kind === "shelf") { // horizontal Line at y = af; bounds this cell's top/bottom if it spans its x-range
      if (d.b0 < fx1 - eps && d.b1 > fx0 + eps) {
        const onB = Math.abs(d.af - fy0) < eps, onT = Math.abs(d.af - fy1) < eps;
        if (onB || onT) {
          const lh: LineHandle = { parent: d.parent, i: d.i, split: "rows", pf0: d.pfy0, pf1: d.pfy1, pos: [px((fx0 + fx1) / 2), py(d.af), zFront] };
          edges.push(lh); if (onB) bnd.b = lh; else bnd.t = lh;
        }
      }
    } else { // vertical Line at x = af; bounds this cell's left/right
      if (d.b0 < fy1 - eps && d.b1 > fy0 + eps) {
        const onL = Math.abs(d.af - fx0) < eps, onR = Math.abs(d.af - fx1) < eps;
        if (onL || onR) {
          const lh: LineHandle = { parent: d.parent, i: d.i, split: "cols", pf0: d.pfx0, pf1: d.pfx1, pos: [px(d.af), py((fy0 + fy1) / 2), zFront] };
          edges.push(lh); if (onL) bnd.l = lh; else bnd.r = lh;
        }
      }
    }
  }
  const corners: CornerHandle[] = [];
  const addC = (v: LineHandle | null, h: LineHandle | null, xf: number, yf: number) => { if (v && h) corners.push({ vLine: v, hLine: h, pos: [px(xf), py(yf), zFront] }); };
  addC(bnd.l, bnd.b, fx0, fy0); addC(bnd.l, bnd.t, fx0, fy1); addC(bnd.r, bnd.b, fx1, fy0); addC(bnd.r, bnd.t, fx1, fy1);
  return { edges, corners, bounds: bnd };
}

/** ─── Interactive 2D Technical Vector CAD Drawing (Bazis / GOST) ─── */
type Projection2D = "front" | "side" | "top";

function V21Technical2DCADDrawing({ cab, settings }: { cab: Cabinet; settings?: Settings }) {
  const [proj, setProj] = useState<Projection2D>("front");

  // Zoom & pan state
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const lastTouchDist = useRef<number | null>(null);

  // Touch/mouse handlers for pan
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx / zoom, y: dragRef.current.panY + dy / zoom });
  };
  const onPointerUp = () => { dragRef.current = null; };

  // Wheel zoom (fast)
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(8, Math.max(0.2, z * (1 - e.deltaY * 0.003))));
  };

  // Pinch zoom (touch) — amplified for fast response
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist.current !== null) {
        const rawScale = dist / lastTouchDist.current;
        // Amplify: small finger movements → bigger zoom steps
        const amplified = rawScale > 1 ? Math.pow(rawScale, 2.2) : 1 / Math.pow(1 / rawScale, 2.2);
        setZoom((z) => Math.min(8, Math.max(0.2, z * amplified)));
      }
      lastTouchDist.current = dist;
    }
  };
  const onTouchEnd = () => { lastTouchDist.current = null; };

  // Measurements
  const w = cab.w;
  const h = cab.h;
  const d = cab.depth ?? 560;
  const t = cab.boardThickness ?? 16;
  const plinthH = cab.plinthMode === "box" || !cab.plinthMode ? 120 : cab.plinthMode === "legs" ? 100 : 0;
  const count = cab.count ?? 0;
  const hasBack = cab.hasBack ?? (cab.backMount !== "none");
  const isGroove = hasBack && (cab.backMount ?? "groove") === "groove";
  const grooveOff = cab.grooveSetback ?? 12;

  const INK = "#1c1b18";
  const FILL = "#ececec";
  const BLUE = "#2f6fe4";
  const GREY = "#8d8778";
  const HDF = "#e0dbcd";
  const HATCH = "#d8d3c5";

  // Shared dimension arrow helper
  const DimLine = ({ x1, y1, x2, y2, label, offset = 0 }: { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number }) => {
    const isVert = x1 === x2;
    const mx = (x1 + x2) / 2 + (isVert ? -14 - offset : 0);
    const my = (y1 + y2) / 2 + (isVert ? 0 : -6 - offset);
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={BLUE} strokeWidth="1" />
        {/* tick marks */}
        {isVert ? (
          <>
            <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke={BLUE} strokeWidth="1.5" />
            <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke={BLUE} strokeWidth="1.5" />
          </>
        ) : (
          <>
            <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke={BLUE} strokeWidth="1.5" />
            <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke={BLUE} strokeWidth="1.5" />
          </>
        )}
        <text
          x={mx} y={my}
          fontSize="11" fontWeight="700" fill={BLUE}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={isVert ? `rotate(-90 ${mx} ${my})` : undefined}
        >{label}</text>
      </g>
    );
  };

  // Scale factor so the drawing fills ~280px drawing area regardless of real mm dims
  const drawW = 260;
  const drawH = 240;

  // ─── Render one projection ───────────────────────────────
  const renderProjection = () => {
    if (proj === "front") {
      // Front elevation: width × height
      const sx = drawW / w;
      const sy = drawH / h;
      const s = Math.min(sx, sy) * 0.92;
      const pw = w * s;
      const ph = h * s;
      const ox = (drawW - pw) / 2 + 30;
      const oy = (drawH - ph) / 2 + 30;
      const bT = t * s;
      const plH = plinthH * s;

      return (
        <g>
          <text x={ox + pw / 2} y={14} fontSize="12" fontWeight="700" fill={INK} textAnchor="middle">ВИД СПЕРЕДИ (Фасад)</text>
          {/* Overall dims */}
          <DimLine x1={ox} y1={oy - 2} x2={ox + pw} y2={oy - 2} label={`${w}`} />
          <DimLine x1={ox - 2} y1={oy} x2={ox - 2} y2={oy + ph} label={`${h}`} />

          {/* Plinth */}
          {plinthH > 0 && <rect x={ox + bT} y={oy + ph - plH} width={pw - 2 * bT} height={plH} fill="#4a4740" stroke={INK} strokeWidth="1.2" />}

          {/* Left side */}
          <rect x={ox} y={oy} width={bT} height={ph - plH} fill={FILL} stroke={INK} strokeWidth="1.3" />
          {/* Right side */}
          <rect x={ox + pw - bT} y={oy} width={bT} height={ph - plH} fill={FILL} stroke={INK} strokeWidth="1.3" />

          {/* Bottom */}
          <rect x={ox + (cab.bottomMode === "vkladnoe" ? bT : 0)} y={oy + ph - plH - bT} width={pw - (cab.bottomMode === "vkladnoe" ? 2 * bT : 0)} height={bT} fill={FILL} stroke={INK} strokeWidth="1.3" />

          {/* Top */}
          {cab.topMode !== "none" && (
            <rect x={ox + bT} y={oy} width={pw - 2 * bT} height={bT} fill={FILL} stroke={INK} strokeWidth="1.3" />
          )}

          {/* Shelves + bore marks */}
          {count > 0 && Array.from({ length: count }).map((_, i) => {
            const innerH = ph - plH - 2 * bT;
            const sy2 = oy + bT + innerH * (i + 1) / (count + 1);
            return (
              <g key={i}>
                <rect x={ox + bT} y={sy2 - bT / 2} width={pw - 2 * bT} height={bT} fill={FILL} stroke={INK} strokeWidth="1" />
                {/* bore crosses */}
                <circle cx={ox + bT / 2} cy={sy2} r={2.5} fill="none" stroke={BLUE} strokeWidth="1.2" />
                <line x1={ox + bT / 2 - 4} y1={sy2} x2={ox + bT / 2 + 4} y2={sy2} stroke={BLUE} strokeWidth="0.8" />
                <line x1={ox + bT / 2} y1={sy2 - 4} x2={ox + bT / 2} y2={sy2 + 4} stroke={BLUE} strokeWidth="0.8" />
                <circle cx={ox + pw - bT / 2} cy={sy2} r={2.5} fill="none" stroke={BLUE} strokeWidth="1.2" />
                <line x1={ox + pw - bT / 2 - 4} y1={sy2} x2={ox + pw - bT / 2 + 4} y2={sy2} stroke={BLUE} strokeWidth="0.8" />
                <line x1={ox + pw - bT / 2} y1={sy2 - 4} x2={ox + pw - bT / 2} y2={sy2 + 4} stroke={BLUE} strokeWidth="0.8" />
              </g>
            );
          })}

          <text x={ox + pw / 2} y={oy + ph + 22} fontSize="10" fill={GREY} textAnchor="middle">ЛДСП {t} мм · Фасад · K1 торцы</text>
        </g>
      );
    }

    if (proj === "side") {
      // Side cross-section: depth × height
      const sx = drawW / d;
      const sy = drawH / h;
      const s = Math.min(sx, sy) * 0.92;
      const pd = d * s;
      const ph = h * s;
      const ox = (drawW - pd) / 2 + 30;
      const oy = (drawH - ph) / 2 + 30;
      const bT = t * s;
      const plH = plinthH * s;
      const gOff = grooveOff * s;

      return (
        <g>
          <text x={ox + pd / 2} y={14} fontSize="12" fontWeight="700" fill={INK} textAnchor="middle">РАЗРЕЗ СБОКУ (Паз / Задник)</text>
          <DimLine x1={ox} y1={oy - 2} x2={ox + pd} y2={oy - 2} label={`${d}`} />
          <DimLine x1={ox - 2} y1={oy} x2={ox - 2} y2={oy + ph} label={`${h}`} />

          {/* Side outline */}
          <rect x={ox} y={oy} width={pd} height={ph - plH} fill={FILL} stroke={INK} strokeWidth="1.3" />

          {/* Back panel */}
          {hasBack && (
            isGroove ? (
              <>
                <rect x={ox + pd - gOff} y={oy} width={Math.max(3, bT * 0.2)} height={ph - plH} fill={HDF} stroke={INK} strokeWidth="1" />
                <line x1={ox + pd - gOff} y1={oy - 6} x2={ox + pd - gOff} y2={oy + ph - plH + 6} stroke={BLUE} strokeWidth="0.8" strokeDasharray="3 2" />
                <DimLine x1={ox + pd - gOff} y1={oy + ph - plH + 10} x2={ox + pd} y2={oy + ph - plH + 10} label={`${grooveOff}`} />
              </>
            ) : (
              <rect x={ox + pd} y={oy} width={bT} height={ph - plH} fill={HDF} stroke={INK} strokeWidth="1.3" />
            )
          )}

          {/* Shelf lines */}
          {count > 0 && Array.from({ length: count }).map((_, i) => {
            const innerH = ph - plH - 2 * bT;
            const sy2 = oy + bT + innerH * (i + 1) / (count + 1);
            const shelfEnd = isGroove ? ox + pd - gOff - 2 : ox + pd - 2;
            return <line key={i} x1={ox + 2} y1={sy2} x2={shelfEnd} y2={sy2} stroke={INK} strokeWidth="1.5" />;
          })}

          {/* Hinge cups */}
          <circle cx={ox + bT + 6} cy={oy + 20} r={5} fill="none" stroke={BLUE} strokeWidth="1.4" strokeDasharray="2 1.5" />
          <text x={ox + bT + 16} y={oy + 23} fontSize="9" fontWeight="700" fill={BLUE}>Ø35</text>
          <circle cx={ox + bT + 6} cy={oy + ph - plH - 20} r={5} fill="none" stroke={BLUE} strokeWidth="1.4" strokeDasharray="2 1.5" />

          {/* Plinth */}
          {plinthH > 0 && <rect x={ox + 2} y={oy + ph - plH} width={pd - 4} height={plH} fill="#4a4740" stroke={INK} strokeWidth="1" />}

          <text x={ox + pd / 2} y={oy + ph + 22} fontSize="10" fill={GREY} textAnchor="middle">
            {isGroove ? `Паз 4×8 · Отступ ${grooveOff} мм · ХДФ 3 мм` : "Внахлёст 16 мм ЛДСП"}
          </text>
        </g>
      );
    }

    // Top / plan view: width × depth
    const sx = drawW / w;
    const sy = drawH / d;
    const s = Math.min(sx, sy) * 0.92;
    const pw = w * s;
    const pd = d * s;
    const ox = (drawW - pw) / 2 + 30;
    const oy = (drawH - pd) / 2 + 30;
    const bT = t * s;
    const gOff = grooveOff * s;

    return (
      <g>
        <text x={ox + pw / 2} y={14} fontSize="12" fontWeight="700" fill={INK} textAnchor="middle">ВИД СВЕРХУ (План)</text>
        <DimLine x1={ox} y1={oy - 2} x2={ox + pw} y2={oy - 2} label={`${w}`} />
        <DimLine x1={ox - 2} y1={oy} x2={ox - 2} y2={oy + pd} label={`${d}`} />

        {/* Left side */}
        <rect x={ox} y={oy} width={bT} height={pd} fill={FILL} stroke={INK} strokeWidth="1.3" />
        {/* Right side */}
        <rect x={ox + pw - bT} y={oy} width={bT} height={pd} fill={FILL} stroke={INK} strokeWidth="1.3" />

        {/* Back panel */}
        {hasBack && (
          isGroove ? (
            <rect x={ox + bT} y={oy + pd - gOff} width={pw - 2 * bT} height={Math.max(2, bT * 0.2)} fill={HDF} stroke={INK} strokeWidth="1" />
          ) : (
            <rect x={ox} y={oy + pd} width={pw} height={bT} fill={HDF} stroke={INK} strokeWidth="1.3" />
          )
        )}

        {/* Top lid / stretchers */}
        {cab.topMode === "stretchers" ? (
          <>
            <rect x={ox + bT} y={oy} width={pw - 2 * bT} height={bT * 3} fill={FILL} stroke={INK} strokeWidth="1" />
            <rect x={ox + bT} y={oy + pd - bT * 3} width={pw - 2 * bT} height={bT * 3} fill={FILL} stroke={INK} strokeWidth="1" />
            <text x={ox + pw / 2} y={oy + bT * 2} fontSize="8" fill={GREY} textAnchor="middle">Царга</text>
          </>
        ) : cab.topMode !== "none" ? (
          <rect x={ox + bT} y={oy} width={pw - 2 * bT} height={pd} fill={HATCH} fillOpacity="0.3" stroke={INK} strokeWidth="0.6" strokeDasharray="4 2" />
        ) : null}

        {/* Hatch crosshatch fill for interior */}
        <text x={ox + pw / 2} y={oy + pd + 22} fontSize="10" fill={GREY} textAnchor="middle">Вид сверху · {w}×{d} мм</text>
      </g>
    );
  };

  // Button style helper
  const projBtn = (p: Projection2D, label: string) => (
    <button
      onClick={() => { setProj(p); setZoom(1); setPan({ x: 0, y: 0 }); }}
      style={{
        border: "none",
        background: proj === p ? "#2f6fe4" : "rgba(255,255,255,0.7)",
        color: proj === p ? "#fff" : "#333",
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
      }}
      type="button"
    >{label}</button>
  );

  return (
    <div
      style={{ width: "100%", height: "100%", background: "#faf8f5", position: "relative", overflow: "hidden", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 320 300"
        style={{ width: "100%", height: "100%", display: "block", transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "center center" }}
      >
        {renderProjection()}
      </svg>

      {/* Projection switcher pills */}
      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)", padding: 3, borderRadius: 8, border: "1px solid #ddd" }}>
        {projBtn("front", "Спереди")}
        {projBtn("side", "Сбоку")}
        {projBtn("top", "Сверху")}
      </div>

      {/* Zoom indicator */}
      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 600, color: "#666", background: "rgba(255,255,255,0.8)", padding: "2px 6px", borderRadius: 4 }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}


/** ─── Main Studio Component ───────────────────────────────── */
export function V21Cabinet3DStudio({
  cab,
  patchCab,
  onClose,
  settings,
  style,
  embedded,
  viewMode: viewModeProp,
  onViewModeChange,
  renderMode,
  opMode,
  uzlySetbackMm,
  doorsOpen,
  onSelInfo,
  partDeleteRef,
  partToggleOpenRef,
  partInnersRef,
  partDetachRef,
  partDuplicateRef,
  partHideRef,
  partSetFrontRef,
  partAcceptUpdateRef,
  hiddenGroups: hiddenGroupsProp,
  onHiddenChange,
  onPartsList,
  partSelectRef,
}: {
  cab: Cabinet;
  patchCab: (patch: Partial<Cabinet>) => void;
  onClose: () => void;
  settings?: Settings;
  /** the kitchen-wide finish (colours) — falls back to a neutral default if the caller omits it */
  style?: KitchenStyle;
  /** Embedded inside the App-2 studio shell (App2Shell, v9): drop the fixed full-screen overlay and
   *  the top «Студия / Готово» bar so the shell owns the frame + chrome. Default (main app, ConfigScreen
   *  «Редактор») is unchanged — App-2-internal, per DB/36. */
  embedded?: boolean;
  /** Controlled view mode — App2Shell's v9 view-dropdown drives it. Uncontrolled (main app) → internal state. */
  viewMode?: "3d" | "2d" | "outline";
  onViewModeChange?: (v: "3d" | "2d" | "outline") => void;
  /** Render style driven by the App2Shell view-dropdown (real·mat·wire·nofront·xray·application). When
   *  omitted (main app) the store `mode` drives it as before. */
  renderMode?: string;
  /** v9 operating-mode tab (korpus·kromka·uzly·acc). Only «acc» changes the 3D today: ghost the body,
   *  highlight the metal hardware. kromka/uzly are founder-bound (schema field / joint numbers). */
  opMode?: string;
  /** «Узлы» op-mode · the LIVE System-32 front-row setback (mm) while the shell's slider is being dragged.
   *  Drives only the joint-marker overlay — NOT the cabinet mesh — so dragging repositions the узлы without
   *  rebuilding the box each tick (mobile-smooth). `null`/omitted → the marker reads the committed store value. */
  uzlySetbackMm?: number | null;
  /** §A · when true the doors swing + drawers slide open (so a door reveals the drawers behind it). */
  doorsOpen?: boolean;
  /** Reports the selected Part to the shell's poz card (label + W×H mm + type-count + deletable), or null
   *  when nothing is selected. In embedded mode the shell's poz card is the ONLY selection readout — V21's
   *  own top-centre info-card is suppressed (it duplicated the poz card and collided with it on mobile). */
  onSelInfo?: (info: { label: string; wMm: number; hMm: number; count: number; deletable: boolean; openable: boolean; inners?: string[]; componentId?: string; componentPinned?: number; componentLatest?: number; detachable?: boolean; boundInner?: number; duplicatable?: boolean; hideable?: boolean; hidden?: boolean; group?: string; frontProfile?: FrontProfile } | null) => void;
  /** Populated by V21 with the current Part's delete action (or null) so the shell's poz card can host the
   *  «✕ Удалить» affordance the suppressed info-card used to carry. */
  partDeleteRef?: React.MutableRefObject<(() => void) | null>;
  /** §A · populated by V21 with the selected door/drawer's open↔close toggle (or null) so the poz card can
   *  offer «Открыть/Закрыть» for THAT part (v9 per-part open). */
  partToggleOpenRef?: React.MutableRefObject<(() => void) | null>;
  /** §A/§B · populated by V21 with ONE open↔close toggle PER inner drawer of the selected outer — a §B nested
   *  sled, or the §A frontless pull-outs behind a door — in the same order as onSelInfo's `inners` labels.
   *  Opening one opens the outer too (the door swings / the drawer slides) so it's revealed (v9 openActions). */
  partInnersRef?: React.MutableRefObject<(() => void)[] | null>;
  /** §B4/B5 · Отвязать the selected front from its library Component (Figma-detach — the subtree stays). */
  partDetachRef?: React.MutableRefObject<(() => void) | null>;
  /** §Дублировать · duplicate the selected front — its slot splits into two equal copies (siblings untouched). */
  partDuplicateRef?: React.MutableRefObject<(() => void) | null>;
  /** §Скрыть · toggle the selected front's session-only visibility (Скрыть ↔ Показать; no model field). */
  partHideRef?: React.MutableRefObject<(() => void) | null>;
  /** PER-CELL фасад · set the selected front's own profile (Стекло/Шейкер…) — the shell's ДЕТАЛЬ card triggers it. */
  partSetFrontRef?: React.MutableRefObject<((profile: FrontProfile) => void) | null>;
  /** §10.4 · accept a newer component version on the selected placement (re-pin) — ДЕТАЛЬ card «Обновить». */
  partAcceptUpdateRef?: React.MutableRefObject<((newVersion: number) => void) | null>;
  /** §Скрыть · session-only hidden front groups, lifted to the shell so «Слои» can list + restore them. */
  hiddenGroups?: string[];
  onHiddenChange?: (next: string[]) => void;
  /** §Слои · V21 pushes the deduped list of 3D-selectable parts (group + role label + dims) up for the panel. */
  onPartsList?: (parts: { group: string; role: string; label: string; wMm: number; hMm: number; count: number; kromka: string }[]) => void;
  /** §Слои · select a part BY GROUP from the «Слои» list (App2Shell → V21) — highlights it in 3D. */
  partSelectRef?: React.MutableRefObject<((group: string) => void) | null>;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Group | null>(null);
  const bandingRef = useRef<THREE.Group | null>(null); // «Кромка» op-mode · coloured edge-banding strips
  const jointsRef = useRef<THREE.Group | null>(null); // «Узлы» op-mode · System-32 shelf-pin joint markers
  const opModeRef = useRef(opMode); opModeRef.current = opMode; // «kromka» tap-paint reads this in the []-deps 3D pick handler
  const hoverRef = useRef<THREE.Mesh | null>(null); // «Кромка» op-mode · the yellow highlight over the hovered edge
  const openTargetRef = useRef(0); // §A · GLOBAL default target (new/rebuilt openables inherit it)
  const openablesRef = useRef<OpenableEntry[]>([]);
  const highlightRef = useRef<THREE.Mesh | null>(null); // §5 blue space-volume
  const hitGroupRef = useRef<THREE.Group | null>(null); // §5 invisible per-leaf raycast pick-slabs (Space)
  const partHitGroupRef = useRef<THREE.Group | null>(null); // §5 invisible per-panel pick-slabs (Part)
  const partHlRef = useRef<THREE.Group | null>(null); // §5 red highlight of the selected Part(s)
  const hlFollowRef = useRef<{ box: THREE.Mesh; obj: THREE.Object3D; center: THREE.Vector3 }[]>([]); // §3D-select · red boxes GLUED to an opening/closing front — each frame the box takes that front subgroup's live world orientation+position (center = the front's local centre), so it swings/slides IDENTICALLY with the door/drawer (rigid, zero lag), never a loose AABB
  const flyToRef = useRef<{ center: THREE.Vector3; radius: number; dir: THREE.Vector3; desiredPos?: THREE.Vector3 } | null>(null); // §Слои · camera fly-to (dir = a role-aware viewing angle, not the current one)
  const handleGroupRef = useRef<THREE.Group | null>(null); // §5:106 resize handles for the selected part
  const selModeRef = useRef<"space" | "part">("space"); // read inside the mount-effect pointer handler
  const cabRef = useRef<Cabinet>(cab); // current cab, read at drag-start for the base dimension
  const selPartRef = useRef<{ role: string; group: string } | null>(null); // current part selection, for the handle build
  const fillIndexRef = useRef(0); // current cab index, for the width live-patch (patchCabLive by index)
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [viewModeLocal, setViewModeLocal] = useState<"3d" | "2d" | "outline">("3d");
  const viewMode = viewModeProp ?? viewModeLocal;           // controlled by App2Shell, else internal
  const setViewMode = onViewModeChange ?? setViewModeLocal; // v9 dropdown ⇄ V21's own view buttons stay in sync
  // §5: the selected interior SPACE — its PATH (stable identity, for the 3D↔2D round-trip) plus its
  // interior-fraction rect (drives the blue volume). Set by a 3D tap OR reported by the 2D editor.
  // Survives the 2D→3D switch; transient UI state only — never persisted (a Space has no stored identity).
  const [selSpace, setSelSpace] = useState<{ path: number[]; rect: { fx0: number; fy0: number; fx1: number; fy1: number } } | null>(null);
  const selSpaceRef = useRef(selSpace); // selected section, read inside the mount-effect pointer handler (E2-3D swipe)
  // §5 · the selected PART(s) (Деталь) — the adaptive GROUP (CF4 §5:104: a group with one member →
  // that panel; 2+ siblings → the type) + its `role` (for the card name). Boxes are recomputed from
  // `cab` by group so they never drift. Highlighted red. Transient UI only — nothing persisted.
  const [selPart, setSelPart] = useState<{ role: string; group: string } | null>(null);
  const hiddenGroups = hiddenGroupsProp ?? NO_HIDDEN; // §Скрыть · lifted to the shell (App2Shell owns it, «Слои» restores)
  const hiddenRef = useRef<string[]>([]); // read inside the mesh-build effects (which don't dep on hiddenGroups)
  const doorsOpenRef = useRef(false); // read inside the mount-effect pointer handler — an OPEN front is transparent to a SPACE pick
  // §5:115 · readout law — the live dimension while dragging a resize handle, shown top-centre.
  const [readout, setReadout] = useState<string | null>(null);
  // 37_MIN_GATE §6 · a transient amber warn shown the moment a tap-placed part breaks a min-size.
  const [warn, setWarn] = useState<string | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [partMenuOpen, setPartMenuOpen] = useState(false); // §5:113 · the info card's «⋯» menu
  // §15.3 · dock numpad — open when a dimension chip is tapped; `apply` commits the typed mm. One
  // bottom dock, no floating popups. Cleared on close.
  const [numpad, setNumpad] = useState<{ label: string; value: string; apply: (mm: number) => void } | null>(null);
  const units: LenUnit = settings?.units ?? "mm"; // §12.3 display unit (см⇄мм) — engine stays mm10
  const unitsRef = useRef<LenUnit>("mm"); unitsRef.current = units; // latest, read by the mount pointer handlers
  const shelfLoadRef = useRef(15); shelfLoadRef.current = settings?.shelfLoadKgPerM ?? 15; // 37_MIN §2.3 deflection load
  // §5:103 · Space-mode ADD toolset — armed tool («Полка·Стойка·Дверь·Ящик»); a 3D tap then places it.
  const [placeTool, setPlaceTool] = useState<"shelf" | "vertical" | "door" | "drawer" | null>(null);
  const placeToolRef = useRef<typeof placeTool>(null); // read inside the mount-effect tap handler
  const armedCompRef = useRef<ComponentRef | null>(null); // a library component armed for drag-drop placement
  // §5 · the two permanent selection modes (CF4 §5:101, QONUNLAR §8.3): ▢ Space-select (tap an empty
  // interior volume → blue volume) · ◇ Part-select (tap a carcass panel → red highlight + info card).
  // Selection is transient UI state only — nothing is persisted (neither a Space nor a Part is stored).
  const [selMode, setSelMode] = useState<"space" | "part">("space");
  // switch mode from the left rail; a real mode change clears BOTH selections (space & part) so the
  // viewport shows only the active mode's highlight. Re-tapping the current mode is a no-op.
  const pickSelMode = (m: "space" | "part") => { if (m === selMode) return; setSelMode(m); setSelSpace(null); setSelPart(null); setPlaceTool(null); };
  // the active interior tool — OWNED here so the viewport rail and the 2D edit canvas share it
  const [tool, setTool] = useState<Tool>("draw"); // default = draw (CONSTRUCTION_FRAME_v4:91 operative add-model; DB/19 §5 tool-less = v0 DRAFT). 3D add stays tool-less via placeTool=null; swipe/tap-cycle are locked verbs (10_UI_PRINCIPLES §2).
  // the bottom-left «Глубина» button expands a depth slider to its right
  const [depthOpen, setDepthOpen] = useState(false);
  // set by the embedded 2D editor when a divider/cell/front is selected → shows the delete button
  const [hasSel, setHasSel] = useState(false);
  const deleteFnRef = useRef<(() => void) | null>(null); // the 2D editor's delete action, for our button
  const t = useT();

  // store wiring for the embedded interior editor — it patches cab.layout by index; the studio's
  // 3D rebuilds on every `cab` change, so edits here appear live in the view above.
  const cabs = useStore((s) => s.cabs);
  const mode = useStore((s) => s.mode); // «Наполнение» (application) ghosts + shows contents
  const storePatchCab = useStore((s) => s.patchCab);
  const updateSettings = useStore((s) => s.updateSettings); // persist shop rules (Настройки → Узлы: System-32 setback)
  const storePatchCabLive = useStore((s) => s.patchCabLive);
  const patchCabDims = useStore((s) => s.patchCabDims);
  const beginCabEdit = useStore((s) => s.beginCabEdit);
  const undoCab = useStore((s) => s.undoCab);
  const redoCab = useStore((s) => s.redoCab);
  const canUndoCab = useStore((s) => s.cabsPast.length > 0);
  const canRedoCab = useStore((s) => s.cabsFuture.length > 0);
  const ceiling = useStore((s) => s.ceiling);
  const armedComponent = useStore((s) => s.armedComponent);
  const disarmComponent = useStore((s) => s.disarmComponent);
  const fillIndex = cabs.findIndex((c) => c.id === cab.id);

  // 1. Initialize Three.js scene ONCE on mount
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    // Embedded (App-2 studio) uses the APP's cool light viewport (Figma tokens), not v9's warm cream.
    scene.background = new THREE.Color(embedded ? 0xf1f4f7 : 0xf8fafc);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 20);
    camera.position.set(1.4, 1.2, 2.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, cab.h / 2000, 0);
    controls.update();
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(3, 4, 2);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);
    // Embedded floor: a subtle COOL grid, NO bright green centre axes; standalone keeps the app green/blue.
    scene.add(new THREE.GridHelper(4, 20, embedded ? 0xccd3da : 0x00ac7a, embedded ? 0xdde3e9 : 0xcbd5e1));

    const initialMesh = makeSoloMesh(cab, "3d", style, settings);
    applyRenderMode(initialMesh, renderMode ?? mode, cab);
    if (opMode === "acc") applyAccessoryMode(initialMesh);
    else if (opMode === "uzly") applyUzlyMode(initialMesh);
    meshRef.current = initialMesh;
    scene.add(initialMesh);
    openablesRef.current = collectOpenables(initialMesh, openTargetRef.current);
    applyHiddenTo(initialMesh, hiddenRef.current); // §Скрыть · re-apply session hides onto the fresh build

    // §5 · tap-to-select picking. Invisible slabs live in two groups — per-leaf (Space) and per-panel
    // (Part) — populated by the effects below. A TAP (press+release within 6px, so orbit-drags are
    // ignored) raycasts the ACTIVE mode's group. Both are added to `scene` (world frame) like the
    // highlights, so the leafToBox / shellPartsForCab −dM/2 Z matches the cabinet group (kitchen3d.ts:999).
    const hitGroup = new THREE.Group();      // Space: per-leaf slabs
    scene.add(hitGroup);
    hitGroupRef.current = hitGroup;
    const partHitGroup = new THREE.Group();  // Part: per-panel slabs
    scene.add(partHitGroup);
    partHitGroupRef.current = partHitGroup;
    // «Кромка» op-mode · a single reusable highlight box, scaled/positioned onto the hovered edge.
    const hoverMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.9, depthTest: false }));
    hoverMesh.renderOrder = 999; hoverMesh.visible = false;
    scene.add(hoverMesh);
    hoverRef.current = hoverMesh;
    const partHl = new THREE.Group();        // Part: red highlight boxes
    scene.add(partHl);
    partHlRef.current = partHl;
    const handleGroup = new THREE.Group(); // §5:106 resize handles for the selected part
    scene.add(handleGroup);
    handleGroupRef.current = handleGroup;
    const raycaster = new THREE.Raycaster();
    const down = { x: 0, y: 0 };
    const ndc = (e: PointerEvent) => { const r = renderer.domElement.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    // §5:106 handle=resize (PART carcass dim) · §342 handle=move-the-Line (SPACE). Grabbing a handle
    // suspends orbit; a plane through the handle (facing the camera) turns the pointer into a world Δ.
    // PART: Δ → a cabinet dimension. SPACE: the pointer → a boundary fraction → moveDivider (shared
    // with the 2D drag) → patch cab.layout, so the void resizes by its bounding Line moving. §5:115 live.
    const rs = { active: false, kind: "dim" as "dim" | "line" | "corner", dim: "h" as "h" | "w" | "d", base: 0, last: 0, moved: false, plane: new THREE.Plane(), start: new THREE.Vector3(), line: null as LineHandle | null, corner: null as CornerHandle | null, layout: null as ReturnType<typeof flattenedLayout> | null };
    const sw = { active: false, downX: 0 }; // E2-3D · a horizontal swipe on the selected section cycles its content (§5:170)
    const onDown = (e: PointerEvent) => {
      flyToRef.current = null; // §Слои · a touch on the canvas cancels an in-flight fly-to — the user takes over
      down.x = e.clientX; down.y = e.clientY; rs.active = false; rs.moved = false; rs.line = null; rs.corner = null; rs.layout = null;
      raycaster.setFromCamera(ndc(e), camera);
      const hit = raycaster.intersectObjects(handleGroup.children, false)[0];
      const data = hit?.object.userData.handle as { kind: "dim"; dim: "h" | "w" | "d" } | { kind: "line"; line: LineHandle } | { kind: "corner"; corner: CornerHandle } | undefined;
      // E2-3D · a horizontal swipe on the ALREADY-SELECTED section cycles its content (§5:170). Suspend orbit
      // (like a handle drag) so the camera does not rotate under the swipe. Only when the press lands on the
      // selected section's own pick-slab — empty space and other sections still orbit / tap-select as before.
      sw.active = false;
      if (!data && selModeRef.current === "space" && selSpaceRef.current) {
        const cellHit = raycaster.intersectObjects(hitGroup.children, false)[0];
        const leaf = cellHit?.object.userData.leaf as { path: number[] } | undefined;
        if (leaf && leaf.path.join(".") === selSpaceRef.current.path.join(".")) { sw.active = true; sw.downX = e.clientX; controls.enabled = false; return; }
      }
      if (!hit || !data) return; // not on a handle → let orbit / tap-select proceed
      controls.enabled = false; // suspend orbit for the resize drag
      const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
      rs.plane.setFromNormalAndCoplanarPoint(camDir, hit.object.position.clone());
      raycaster.ray.intersectPlane(rs.plane, rs.start);
      rs.kind = data.kind;
      if (data.kind === "dim") { rs.dim = data.dim; rs.base = data.dim === "w" ? cabRef.current.w : data.dim === "h" ? cabRef.current.h : cabDepth(cabRef.current); rs.last = rs.base; }
      else if (data.kind === "line") rs.line = data.line;
      else rs.corner = data.corner;
      rs.active = true;
    };
    const onMove = (e: PointerEvent) => {
      if (!rs.active && opModeRef.current === "kromka") {
        // «Кромка» op-mode · highlight the edge under the cursor + a pointer cursor, so you see what a tap paints.
        raycaster.setFromCamera(ndc(e), camera);
        const bg = bandingRef.current, hv = hoverRef.current;
        const hb = bg ? raycaster.intersectObjects(bg.children, false)[0] : undefined;
        const dims = (hb?.object.userData as { hoverDims?: [number, number, number] } | undefined)?.hoverDims;
        if (hv && dims && hb) { hv.position.copy(hb.object.position); hv.scale.set(dims[0], dims[1], dims[2]); hv.visible = true; renderer.domElement.style.cursor = "pointer"; }
        else if (hv) { hv.visible = false; renderer.domElement.style.cursor = ""; }
      }
      if (!rs.active) return;
      if (!rs.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) return; // ignore tap jitter
      raycaster.setFromCamera(ndc(e), camera);
      const pt = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(rs.plane, pt)) return;
      if (!rs.moved) { beginCabEdit(); rs.moved = true; }
      if (rs.kind === "dim") {
        // H: plinth-anchored (top follows the finger, Δy×1). W/D: render-centred → symmetric (grabbed
        // edge follows the finger → the dimension changes by ×2). 10 mm step.
        const raw = rs.dim === "h" ? rs.base + (pt.y - rs.start.y) * 1000
          : rs.dim === "w" ? rs.base + 2 * (pt.x - rs.start.x) * 1000
          : rs.base + 2 * (pt.z - rs.start.z) * 1000;
        const v = Math.round(raw / 10) * 10;
        if (rs.dim === "w") { const w = Math.max(150, Math.min(1200, v)); rs.last = w; storePatchCabLive(fillIndexRef.current, { w }); setReadout(`Ширина · ${fmtLen(w, unitsRef.current)} ${lenUnitLabel(unitsRef.current)}`); }
        else if (rs.dim === "h") { rs.last = v; patchCabDims(cabRef.current.id, { h: v }, true); setReadout(`Высота · ${fmtLen(v, unitsRef.current)} ${lenUnitLabel(unitsRef.current)}`); }
        else { rs.last = v; patchCabDims(cabRef.current.id, { depth: v }, true); setReadout(`Глубина · ${fmtLen(v, unitsRef.current)} ${lenUnitLabel(unitsRef.current)}`); }
      } else if (rs.line || rs.corner) {
        // §342 · pointer → interior fractions → boundary fraction(s) within the parent(s) → moveDivider
        // (shared with the 2D drag, reweights rules so it sticks) → patch cab.layout. A CORNER moves
        // BOTH its Lines ("resize like a table, X and Y"); an edge moves one. The void follows its Lines.
        const cab = cabRef.current;
        const wM = cab.w / 1000, th = (cab.boardThickness ?? 16) / 1000;
        const band = cabBand(cab);
        const isUpper = cab.kind === "upper";
        const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
        const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
        const inW = wM - 2 * th, inH = yTop - th - (yBottom + th);
        const xf = (pt.x - (-wM / 2 + th)) / inW, yf = (pt.y - (yBottom + th)) / inH;
        // move one Line to the pointer along its axis; returns [new root, mm position within its parent]
        const moveOne = (root: ReturnType<typeof flattenedLayout>, L: LineHandle): [ReturnType<typeof flattenedLayout>, number] => {
          const targetAf = snapLineFraction(cab, L.split, L.split === "rows" ? yf : xf, L.parent, L.i); // §5:106 magnetic
          const refMm = (L.pf1 - L.pf0) * (L.split === "rows" ? cab.h : cab.w);
          const r = moveDivider(root, L.parent, L.i, (targetAf - L.pf0) / (L.pf1 - L.pf0), refMm);
          return [r.layout, r.pos * refMm];
        };
        let root = flattenedLayout(cab), label = "";
        if (rs.corner) {
          const [l1, vmm] = moveOne(root, rs.corner.vLine); const [l2, hmm] = moveOne(l1, rs.corner.hLine);
          root = l2; label = `${fmtLen(vmm, unitsRef.current)} × ${fmtLen(hmm, unitsRef.current)} ${lenUnitLabel(unitsRef.current)}`;
        } else if (rs.line) {
          const [l1, mm] = moveOne(root, rs.line); root = l1;
          label = `${rs.line.split === "rows" ? "Полка" : "Стойка"} · ${fmtLen(mm, unitsRef.current)} ${lenUnitLabel(unitsRef.current)}`;
        }
        rs.layout = root; storePatchCabLive(fillIndexRef.current, { layout: root });
        setReadout(label);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (sw.active) { // E2-3D · finish a section content-swipe (orbit was suspended in onDown)
        sw.active = false; controls.enabled = true;
        const dx = e.clientX - sw.downX, dy = e.clientY - down.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4 && selSpaceRef.current) {
          const layout = cycleCellContent(cabRef.current, selSpaceRef.current.path, dx > 0 ? 1 : -1);
          if (layout) { beginCabEdit(); storePatchCab(fillIndexRef.current, { layout }); }
        }
        return;
      }
      if (rs.active) { // finish a resize / Line-move drag
        controls.enabled = true; rs.active = false; setReadout(null);
        if (rs.moved) { // commit once, for undo
          if (rs.kind === "line" || rs.kind === "corner") { if (rs.layout) storePatchCab(fillIndexRef.current, { layout: rs.layout }); }
          else if (rs.dim === "w") storePatchCab(fillIndexRef.current, { w: rs.last });
          else patchCabDims(cabRef.current.id, rs.dim === "h" ? { h: rs.last } : { depth: rs.last });
        }
        return;
      }
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; // an orbit-drag, not a tap
      raycaster.setFromCamera(ndc(e), camera);
      if (opModeRef.current === "kromka") {
        // «Кромка» op-mode · a tap on an edge hit-box cycles its tape: none → K1 → K2 → none (does NOT select).
        const bg = bandingRef.current;
        const hb = bg ? raycaster.intersectObjects(bg.children, false)[0] : undefined;
        const ud = hb?.object.userData as { kromkaRole?: string; kromkaEdge?: keyof EdgeKromka } | undefined;
        if (ud?.kromkaRole && ud.kromkaEdge) {
          const ov = useStore.getState().settings.kromkaOverride;
          const eff = effectiveKromkaForRole(ud.kromkaRole, ov[ud.kromkaRole]);
          const cur = eff?.[ud.kromkaEdge] ?? null;
          const next: "K1" | "K2" | null = cur === "K1" ? "K2" : cur === "K2" ? null : "K1";
          updateSettings({ kromkaOverride: { ...ov, [ud.kromkaRole]: { ...(ov[ud.kromkaRole] ?? {}), [ud.kromkaEdge]: next } } });
        }
        return;
      }
      if (armedCompRef.current) {
        // DRAG-DROP placement (37_MIN §295 "the master drags this Component into their project") — the
        // armed library component binds to the tapped cell; a tap on empty space just cancels the arming.
        const cellHit = raycaster.intersectObjects(hitGroup.children, false)[0];
        const leaf = cellHit?.object.userData.leaf as { path: number[] } | undefined;
        if (cellHit && leaf) {
          // B6 accept-fit-check — refuse to bind (with the reason) if the block can't host the proven range
          const cab = cabRef.current, item = resolveComponent(armedCompRef.current);
          const fc = item ? fitCheckDefault(item, { w_mm10: item.root.size?.w_mm10 ?? 0, h_mm10: cab.h * 10, d_mm10: cabDepth(cab) * 10 }) : { ok: true, failures: [] };
          if (!fc.ok) {
            setWarn(`Не помещается: ${fc.failures[0]}`);
            if (warnTimer.current) clearTimeout(warnTimer.current);
            warnTimer.current = setTimeout(() => setWarn(null), 3200);
          } else {
            const layout = setCellComponent(cab, leaf.path, armedCompRef.current);
            beginCabEdit(); storePatchCab(fillIndexRef.current, { layout }); setSelSpace(null);
          }
        }
        disarmComponent();
        return;
      }
      if (selModeRef.current === "part") {
        const hit = raycaster.intersectObjects(partHitGroup.children, false)[0]; // invisible panel slabs
        // §3D-select · ALSO raycast the real meshes: a drawer REVEALED behind an open door (its box is in the
        // scene; the door's mesh has swung away) is caught here even though the door's static pick-slab still
        // covers the front plane. Walk up to the nearest front subgroup (tagged in kitchen3d) → its group. If
        // that group is a NESTED inner front (not in the top-level parts list), prefer it over the slab.
        let innerHit: { role: "door" | "drawer"; group: string } | null = null;
        if (meshRef.current) {
          // Walk the raycast hits FRONT-TO-BACK. Two kinds of mesh are TRANSPARENT to the pick — we look past
          // them to the next hit: (a) CARCASS panels (no partPath tag); (b) a HIDDEN front (its mesh is still
          // raycast even though visible=false, so we must skip it explicitly). This makes an inner drawer that
          // a hidden/open door revealed reachable even when a divider/shelf sits in front. The first VISIBLE
          // FRONT decides: a top-level front is left to its own slab; a NESTED inner front (no slab) is selected.
          const parts = partsForCab(cabRef.current);
          for (const h of raycaster.intersectObject(meshRef.current, true)) {
            let o: THREE.Object3D | null = h.object, pk: "door" | "drawer" | undefined, pp: number[] | undefined;
            while (o) { pk = o.userData.partKind as "door" | "drawer" | undefined; pp = o.userData.partPath as number[] | undefined; if (pk && pp) break; o = o.parent; }
            if (!pk || !pp) continue; // carcass panel — see through it
            const grp = `${pk}@${pp.join(".")}`;
            if (hiddenRef.current.includes(grp)) continue; // §Скрыть · a hidden front is transparent to the pick
            if (!parts.some((p) => p.group === grp)) innerHit = { role: pk, group: grp }; // a nested inner front → select it
            break; // the first pickable FRONT along the ray decides
          }
        }
        if (innerHit) setSelPart(innerHit);
        else if (hit) { const p = hit.object.userData.part as PartBox; setSelPart({ role: p.role, group: p.group }); }
        else setSelPart(null); // §5 · tapped empty space → deselect (clear the red highlight + poz card)
      } else if (placeToolRef.current) {
        // §5:103 · an add-tool is armed → PLACE it at the tapped cell, at the tap position within it.
        const cellHit = raycaster.intersectObjects(hitGroup.children, false)[0];
        const leaf = cellHit?.object.userData.leaf as { path: number[]; rect: { fx0: number; fy0: number; fx1: number; fy1: number } } | undefined;
        if (!cellHit || !leaf) return;
        const cab = cabRef.current, tool = placeToolRef.current;
        const wM = cab.w / 1000, th = (cab.boardThickness ?? 16) / 1000;
        const band = cabBand(cab);
        const isUpper = cab.kind === "upper";
        const yBottom = isUpper ? 0 : GEOM.plinth / 1000;
        const yTop = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
        const inW = wM - 2 * th, inH = yTop - th - (yBottom + th), r = leaf.rect;
        const xf = (cellHit.point.x - (-wM / 2 + th)) / inW, yf = (cellHit.point.y - (yBottom + th)) / inH;
        const layout = tool === "shelf" ? splitCellAt(cab, leaf.path, "rows", (yf - r.fy0) / (r.fy1 - r.fy0))
          : tool === "vertical" ? splitCellAt(cab, leaf.path, "cols", (xf - r.fx0) / (r.fx1 - r.fx0))
          : setCellFront(cab, leaf.path, tool);
        beginCabEdit(); storePatchCab(fillIndexRef.current, { layout }); setSelSpace(null);
        // 37_MIN_GATE §6 · warn (non-blocking, §4 amber) the moment a Ящик lands on a cell shorter than
        // the Blum LEGRABOX N minimum interior height (80mm) — mirrors the 2D editor's drawerTooSmall.
        if (tool === "drawer") {
          const DRAWER_MIN_MM = drawerMinMm(); // freshly-placed Ящик is class N → 80mm (37_MIN §2.1, shared gate)
          const hMm = Math.round((r.fy1 - r.fy0) * inH * 1000);
          if (hMm < DRAWER_MIN_MM) {
            setWarn(`⚠ Ящик · ${fmtLen(hMm, unitsRef.current)} < ${fmtLen(DRAWER_MIN_MM, unitsRef.current)} ${lenUnitLabel(unitsRef.current)}`);
            if (warnTimer.current) clearTimeout(warnTimer.current);
            warnTimer.current = setTimeout(() => setWarn(null), 2800);
          }
        }
        // 37_MIN_GATE §2.3 · warn (non-blocking, §4 amber) when a tap-placed Полка is too WIDE for its
        // board + load — it would sag past L/240. Mirrors the 2D editor's shelfTooWide (maxShelfSpanMm).
        if (tool === "shelf") {
          const spanMm = Math.round((r.fx1 - r.fx0) * inW * 1000);
          const shelfDepthMm = Math.max(50, cabDepth(cab) - QORASU_PROFILE.defaults.backZone_mm10 / 10); // §2.3 · shelf depth = module depth − back zone
          const maxMm = Math.round(maxShelfSpanMm(shelfDepthMm, CARCASS_THICKNESS_MM, { loadKgPerM: shelfLoadRef.current }));
          if (spanMm > maxMm) {
            setWarn(`⚠ Полка · ${fmtLen(spanMm, unitsRef.current)} > ${fmtLen(maxMm, unitsRef.current)} ${lenUnitLabel(unitsRef.current)} (прогиб)`);
            if (warnTimer.current) clearTimeout(warnTimer.current);
            warnTimer.current = setTimeout(() => setWarn(null), 2800);
          }
        }
      } else {
        // §5:343 — Space mode: nearest of panels+cells; a solid PART in front auto-switches to Part. BUT an
        // OPEN door/drawer front (swung away — its static pick-slab still covers the front plane) is transparent
        // to a SPACE pick, so a tap on the revealed EMPTY interior selects the SPACE behind it, not the open front.
        const hits = raycaster.intersectObjects([...partHitGroup.children, ...hitGroup.children], false); // sorted near→far
        const hit = hits.find((h) => {
          const p = h.object.userData.part as PartBox | undefined;
          return !(p && doorsOpenRef.current && (p.role === "door" || p.role === "drawer")); // see past an open front
        });
        if (!hit) { setSelSpace(null); return; } // §5 · tapped empty space → deselect
        if (hit.object.userData.part) {
          const p = hit.object.userData.part as PartBox; setSelMode("part"); setSelSpace(null); setSelPart({ role: p.role, group: p.group });
        } else if (hit.object.userData.leaf) {
          setSelSpace(hit.object.userData.leaf as { path: number[]; rect: { fx0: number; fy0: number; fx1: number; fy1: number } });
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      // §Слои · ease the camera to FRAME a part picked from the panel — keep the current view direction,
      // move the orbit target to the part centre, pull back to a framing distance. Before controls.update()
      // so OrbitControls' damping picks up the new target/position instead of fighting them.
      const fly = flyToRef.current;
      if (fly) {
        if (!fly.desiredPos) {
          const dist = Math.max(0.45, (fly.radius / Math.sin((camera.fov * Math.PI / 180) / 2)) * 1.25);
          fly.desiredPos = fly.center.clone().add(fly.dir.clone().multiplyScalar(dist)); // role-aware angle
        }
        controls.target.lerp(fly.center, 0.14);
        camera.position.lerp(fly.desiredPos, 0.14);
        if (controls.target.distanceTo(fly.center) < 0.004 && camera.position.distanceTo(fly.desiredPos) < 0.004) flyToRef.current = null;
      }
      controls.update();
      for (const it of openablesRef.current) { // §A · ease each door/drawer toward ITS OWN target
        if (Math.abs(it.cur - it.target) > 0.001) { it.cur += (it.target - it.cur) * 0.16; applyOpenTo(it.o, it.cur); }
      }
      // §3D-select · keep the red highlight GLUED to its front: copy the front subgroup's live world
      // orientation + position onto the box every frame, so it swings/slides identically with the door/drawer
      // (rigid, zero lag). getWorldQuaternion refreshes the subgroup's world matrix; the centre rides with it.
      for (const f of hlFollowRef.current) {
        f.obj.getWorldQuaternion(f.box.quaternion);
        f.box.position.copy(f.center).applyMatrix4(f.obj.matrixWorld);
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const rw = container.clientWidth;
      const rh = container.clientHeight;
      if (rw === 0 || rh === 0) return;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      const freeKids = (g: THREE.Group) => g.children.forEach((ch) => { const m = ch as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material)?.dispose(); });
      freeKids(hitGroup); freeKids(partHitGroup); freeKids(partHl); freeKids(handleGroup);
      if (meshRef.current) disposeGroup(meshRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Rebuild the mesh when the cabinet / view / finish / settings change — camera preserved.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (meshRef.current) {
      scene.remove(meshRef.current);
      disposeGroup(meshRef.current); // free the old build's geometries + materials
    }
    const newMesh = makeSoloMesh(cab, viewMode, style, settings);
    applyRenderMode(newMesh, renderMode ?? mode, cab);
    if (opMode === "acc") applyAccessoryMode(newMesh);
    else if (opMode === "uzly") applyUzlyMode(newMesh);
    meshRef.current = newMesh;
    scene.add(newMesh);
    openablesRef.current = collectOpenables(newMesh, openTargetRef.current); // re-apply open state to the new build
    applyHiddenTo(newMesh, hiddenRef.current); // §Скрыть · re-apply session hides onto the fresh build
  }, [cab, viewMode, settings, style, mode, renderMode, opMode]);

  // «Кромка» op-mode · 3D edge-banding overlay — coloured strips on each part's painted edges (profile
  // census + «Кромка · bo'yash» store override). Rebuilds on paint / cab / op-mode change; cleared otherwise.
  useEffect(() => {
    const scene = sceneRef.current;
    if (bandingRef.current) { bandingRef.current.parent?.remove(bandingRef.current); disposeGroup(bandingRef.current); bandingRef.current = null; }
    if (opMode !== "kromka" && hoverRef.current) hoverRef.current.visible = false; // leaving «kromka» → drop the hover
    if (!scene || opMode !== "kromka") return;
    const override = settings?.kromkaOverride ?? {};
    const K_COL: Record<"K1" | "K2", number> = { K1: 0xe2483d, K2: 0x18a999 };
    const group = new THREE.Group();
    for (const part of partsForCab(cab)) {
      const rk = part.role === "drawer" ? "door" : part.role;
      const ek = effectiveKromkaForRole(rk, override[rk]);
      if (!ek) continue;
      for (const pe of perimeterEdgesFor(part)) {
        const k = ek[pe.edge];
        if (k === "K1" || k === "K2") { // visible coloured strip on a banded edge
          const d = bandDims(pe.axis, pe.len, 0.006);
          const strip = new THREE.Mesh(new THREE.BoxGeometry(d[0], d[1], d[2]), new THREE.MeshBasicMaterial({ color: K_COL[k] }));
          strip.position.set(pe.center[0], pe.center[1], pe.center[2]);
          group.add(strip);
        }
        // invisible fat hit-box on EVERY edge — a tap here cycles its tape (Bosqich-2)
        const hd = bandDims(pe.axis, pe.len, 0.03);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(hd[0], hd[1], hd[2]), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        hit.position.set(pe.center[0], pe.center[1], pe.center[2]);
        hit.userData = { kromkaRole: rk, kromkaEdge: pe.edge, hoverDims: bandDims(pe.axis, pe.len, 0.014) };
        group.add(hit);
      }
    }
    scene.add(group);
    bandingRef.current = group;
  }, [cab, settings?.kromkaOverride, opMode]);

  // «Узлы» op-mode · System-32 shelf-pin joint markers (v9's purple узлы). One marker per shelf pin
  // row-end: at each shelf's left/right end (where it meets a side/stile) and its front + back rows,
  // placed at the REAL setback from that edge (Настройки → Узлы). They slide live as the «отступ»
  // slider moves — the same setback that reaches the drilling solver — so the master SEES the rule on
  // the model. Only the wired System-32 rows are drawn; founder/F1 joints are not faked here. Rebuilds
  // on op-mode / cab / setback change; cleared otherwise. Mirrors the banding overlay above.
  useEffect(() => {
    const scene = sceneRef.current;
    if (jointsRef.current) { jointsRef.current.parent?.remove(jointsRef.current); disposeGroup(jointsRef.current); jointsRef.current = null; }
    if (!scene || opMode !== "uzly" || settings?.s32Enabled === false) return; // System-32 off → no pin rows
    // live drag value (uzlySetbackMm) wins while the slider is held → markers move without a mesh rebuild
    const frontSb = (uzlySetbackMm ?? settings?.s32FrontRowSetbackMm ?? 65) / 1000;
    const backSb = (settings?.s32BackRowSetbackMm ?? 65) / 1000;
    const rowMode = settings?.s32RowMode ?? "front_and_back";
    const geo = new THREE.SphereGeometry(0.008, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x7b5cff, depthTest: false }); // v9 purple, always on top
    const group = new THREE.Group();
    for (const p of interiorPartsForCab(cab)) {
      if (p.role !== "shelf") continue;
      const [w, , zd] = p.size;
      const [cx, cy, cz] = p.pos;
      const zs = rowMode === "front_only" ? [cz + zd / 2 - frontSb] : [cz + zd / 2 - frontSb, cz - zd / 2 + backSb];
      for (const x of [cx - w / 2, cx + w / 2]) for (const z of zs) {
        const s = new THREE.Mesh(geo, mat);
        s.position.set(x, cy, z);
        s.renderOrder = 999;
        group.add(s);
      }
    }
    scene.add(group);
    jointsRef.current = group;
  }, [cab, opMode, uzlySetbackMm, settings?.s32Enabled, settings?.s32FrontRowSetbackMm, settings?.s32BackRowSetbackMm, settings?.s32RowMode]);

  // §A · door/drawer open target — the RAF loop eases the live subgroups toward it.
  useEffect(() => { doorsOpenRef.current = !!doorsOpen; const t = doorsOpen ? 1 : 0; openTargetRef.current = t; for (const it of openablesRef.current) it.target = t; }, [doorsOpen]);

  // §5 · SPACE volume — the selected interior space (leaf rect, fractions) shown as a translucent
  // BLUE box inside the carcass (CF4 §5: "Space selection = translucent 3D volume, not dashed
  // lines"). Only in 3D/outline; the 2D canvas has its own SVG selection. Coordinates mirror
  // buildCabinetSolo (metres, X centred, Y from plinth to carcass top, Z back→front); fractions Y-up (fy=1 = TOP).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !selSpace || viewMode === "2d" || selMode !== "space") return; // Space-mode only
    const { size, pos } = leafToBox(selSpace.rect, cab); // shared mapping — see leafToBox (top of file)
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshBasicMaterial({ color: 0x2f80ed, transparent: true, opacity: 0.26, depthWrite: false }),
    );
    box.position.set(...pos);
    box.renderOrder = 999;
    scene.add(box);
    highlightRef.current = box;
    return () => { scene.remove(box); box.geometry.dispose(); (box.material as THREE.Material).dispose(); highlightRef.current = null; };
  }, [selSpace, cab, viewMode, selMode]);

  // §5 · pick-slabs — one INVISIBLE box per interior leaf so a 3D TAP can raycast-select that space.
  // Rebuilt on cab/view/mode change; opacity 0 (NOT visible=false — THREE.Raycaster skips invisible
  // objects). Only in Space-mode 3D — Part-mode and 2D leave the group empty, so taps hit nothing.
  // Uses the SAME leafToBox mapping as the blue volume, so a picked slab and its highlight coincide.
  useEffect(() => {
    const group = hitGroupRef.current;
    if (!group) return;
    for (const ch of [...group.children]) { group.remove(ch); const m = ch as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material)?.dispose(); }
    if (viewMode === "2d" || selMode !== "space") return;
    for (const l of leavesForCab(cab)) {
      const { size, pos } = leafToBox(l, cab);
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      slab.position.set(...pos);
      slab.userData.leaf = { path: l.path, rect: { fx0: l.fx0, fy0: l.fy0, fx1: l.fx1, fy1: l.fy1 } };
      group.add(slab);
    }
  }, [cab, viewMode, selMode]);

  // §5 · keep the refs live so the mount-effect's pointer handler reads current state.
  useEffect(() => { selModeRef.current = selMode; }, [selMode]);
  useEffect(() => { selSpaceRef.current = selSpace; }, [selSpace]);

  // Report the selected Part (label + W×H mm) up to the App2Shell poz card (v9). Box sizes are in the
  // studio's world frame (metres) → ×1000 = mm.
  useEffect(() => {
    if (partDeleteRef) partDeleteRef.current = null;
    if (partToggleOpenRef) partToggleOpenRef.current = null;
    if (partInnersRef) partInnersRef.current = null;
    if (partDetachRef) partDetachRef.current = null;
    if (partDuplicateRef) partDuplicateRef.current = null;
    if (partHideRef) partHideRef.current = null;
    if (partSetFrontRef) partSetFrontRef.current = null;
    if (partAcceptUpdateRef) partAcceptUpdateRef.current = null;
    if (!onSelInfo) return;
    if (!selPart) { onSelInfo(null); return; }
    const boxes = allPartsForCab(cab).filter((p) => p.group === selPart.group); // allParts → an inner drawer (behind a front) resolves too
    const box = boxes[0];
    const label = PART_RU[selPart.role] ?? selPart.role;
    const count = boxes.length;
    const deletable = selPart.group.includes("@"); // §5:113 · carcass envelope parts aren't Cell nodes
    // §A · per-part open (v9 model): each front is its OWN selection (unique full-path group) → «Открыть»
    // opens just THAT drawer/door, not its identical siblings. Match the selected front to its openable
    // subgroup by (closed) world-centre; a door-revealed recessed inner drawer (maxZ 0) can't slide, skipped.
    let openable = false;
    let innerLabels: string[] = [];
    if (selPart.role === "door" || selPart.role === "drawer") {
      // only a MOVING openable qualifies — a door, or a drawer that can slide. The INNER drawers (a §B sled,
      // or §A door pull-outs) are handled separately (their own toggle), so they're excluded here. Match by
      // the front's X/Y COLUMN (ignore depth Z): a deep nested drawer's bbox centre sits far behind its facade.
      const cands = openablesRef.current.filter((it) => {
        const od = it.o.userData.openable as { kind: string; maxZ?: number; sled?: boolean; doorInner?: boolean };
        if (od.sled) return false;                              // a §B sled = its parent drawer's inner toggle
        if (selPart.role === "door" && od.doorInner) return false; // a DOOR matches its own door, not the pull-outs
        return od.kind === "door" || (od.maxZ ?? 0) > 0.001;   // a selected door-pull-out (doorInner) matches itself
      });
      const matched: OpenableEntry[] = [];
      for (const bx of boxes) {
        let best: OpenableEntry | null = null, bestD = Infinity;
        for (const it of cands) { const dx = it.wc.x - bx.pos[0], dy = it.wc.y - bx.pos[1]; const d = dx * dx + dy * dy; if (d < bestD) { bestD = d; best = it; } }
        if (best && bestD < 0.05 && !matched.includes(best)) matched.push(best);
      }
      if (matched.length) {
        openable = true;
        // if the selected front IS a door pull-out (doorInner), opening it must swing its door open too, so it
        // is revealed and never fouls it. Find the door whose rect covers the pull-out's X/Y.
        const doors = openablesRef.current.filter((it) => (it.o.userData.openable as { kind: string }).kind === "door");
        const coverDoors = matched.some((m) => (m.o.userData.openable as { doorInner?: boolean }).doorInner)
          ? doors.filter((d) => matched.some((m) => Math.abs(d.wc.x - m.wc.x) < 0.4 && Math.abs(d.wc.y - m.wc.y) < 0.5)) : [];
        if (partToggleOpenRef) partToggleOpenRef.current = () => {
          const nt = matched.some((m) => m.target < 0.5) ? 1 : 0; // shut → open · open → close (this front only)
          for (const m of matched) m.target = nt;
          if (nt === 1) for (const d of coverDoors) d.target = 1;
        };
      }
      // §A/§B · the selected outer's INNER drawers — EACH gets its OWN toggle (not one «open-all» button). §B
      // (drawer): the nested `sled` inside the drawer subgroup. §A (door): the `doorInner` frontless pull-outs
      // within the door's rect (they live in the cabinet group, not the door). Opening one opens the outer
      // first — the door swings / the drawer slides — so the inner is revealed and never fouls it.
      const innerEntries: { label: string; e: OpenableEntry }[] = [];
      if (matched.length === 1 && box) {
        const m = matched[0]!;
        if (selPart.role === "drawer") {
          const sledObjs = new Set<THREE.Object3D>();
          m.o.traverse((ch) => { if (ch !== m.o && (ch.userData?.openable as { sled?: boolean } | undefined)?.sled) sledObjs.add(ch); });
          const sled = openablesRef.current.find((x) => sledObjs.has(x.o));
          if (sled) innerEntries.push({ label: "Внутренний ящик · 2-й ур.", e: sled });
        } else {
          const hw = box.size[0] / 2 + 0.02, hh = box.size[1] / 2 + 0.02;
          const found = openablesRef.current.filter((x) => !!(x.o.userData.openable as { doorInner?: boolean } | undefined)?.doorInner
            && Math.abs(x.wc.x - box.pos[0]) <= hw && Math.abs(x.wc.y - box.pos[1]) <= hh);
          found.sort((a, b) => b.wc.y - a.wc.y); // top → bottom, for stable numbering
          found.forEach((e, i) => innerEntries.push({ label: `Ящик ${i + 1}`, e }));
        }
      }
      const outer = matched[0] ?? null;
      innerLabels = innerEntries.map((x) => x.label);
      if (partInnersRef) partInnersRef.current = innerEntries.map(({ e }) => () => {
        const opening = e.target < 0.5;
        e.target = opening ? 1 : 0;
        if (opening && outer) outer.target = 1; // reveal it — open the door/outer too
      });
    }
    // §B · surface a BOUND Component (a nested sled etc.) on the selected front, so the poz card shows it.
    // §B4 · also count nested bound children — they SURVIVE a shallow detach → the «внутри: N» hint.
    let componentId: string | undefined;
    let componentPinned: number | undefined; // §10.4 · the placement's pinned version
    let componentLatest: number | undefined;  // §10.4 · the library's latest — newer → «Обновить» offered
    let boundInner = 0;
    if (box && (selPart.role === "door" || selPart.role === "drawer")) {
      const lf = leavesForCab(cab).find((x) => x.cell.front && `${x.cell.front}@${x.path.join(".")}` === selPart.group);
      const comp = lf?.cell.component;
      componentId = comp?.componentId;
      componentPinned = comp?.pinnedVersion;
      componentLatest = comp ? latestComponentVersion(comp.componentId) : undefined;
      if (lf?.cell) { const walk = (c: Cell) => { for (const ch of c.children ?? []) { if (ch.component) boundInner++; walk(ch); } }; walk(lf.cell); }
    }
    const detachable = !!componentId;
    const isFront = selPart.role === "door" || selPart.role === "drawer"; // only a front carries a mesh subgroup
    const hidden = hiddenGroups.includes(selPart.group);
    onSelInfo(box
      ? { label, wMm: Math.round(box.size[0] * 1000), hMm: Math.round(box.size[1] * 1000), count, deletable, openable, inners: innerLabels, componentId, componentPinned, componentLatest, detachable, boundInner, duplicatable: isFront, hideable: isFront, hidden, group: selPart.group, frontProfile: isFront ? partFrontProfile(cab, selPart.group) : undefined }
      : { label, wMm: 0, hMm: 0, count, deletable, openable: false });
    // §B4/§B5 · Отвязать — detach this front from its Component (subtree stays); selection kept, badge drops.
    if (partDetachRef && detachable) {
      const grp = selPart.group;
      partDetachRef.current = () => {
        const res = detachPartGroup(cab, grp);
        if (res) { beginCabEdit(); storePatchCab(fillIndex, { layout: res.layout }); }
      };
    }
    // §Дублировать / §Скрыть · fronts only. Duplicate = split this slot into two copies (siblings untouched);
    // Hide = toggle a session-only visibility flag (no model field, §1.4). Both keep the current selection.
    if (isFront) {
      const grp = selPart.group;
      if (partDuplicateRef) partDuplicateRef.current = () => {
        const res = duplicatePartGroup(cab, grp);
        if (res) { beginCabEdit(); storePatchCab(fillIndex, { layout: res.layout }); }
      };
      if (partHideRef && onHiddenChange) partHideRef.current = () => { onHiddenChange(hiddenGroups.includes(grp) ? hiddenGroups.filter((g) => g !== grp) : [...hiddenGroups, grp]); setSelPart(null); }; // §Скрыть · hide + deselect (v9); restore from «Слои»
      // PER-CELL фасад · set THIS front's own profile (ДЕТАЛЬ card «Фасад» row → picker)
      if (partSetFrontRef) partSetFrontRef.current = (profile: FrontProfile) => {
        const res = setPartFrontProfile(cab, grp, profile);
        if (res) { beginCabEdit(); storePatchCab(fillIndex, { layout: res.layout }); }
      };
      // §10.4 · accept a newer component version on THIS placement (re-pin → new cut-list on next solve)
      if (partAcceptUpdateRef) partAcceptUpdateRef.current = (newVersion: number) => {
        const res = acceptComponentUpdate(cab, grp, newVersion);
        if (res) { beginCabEdit(); storePatchCab(fillIndex, { layout: res.layout }); }
      };
    }
    if (partDeleteRef && deletable) {
      const grp = selPart.group;
      partDeleteRef.current = () => {
        const res = deletePartGroup(cab, grp);
        if (res) { beginCabEdit(); storePatchCab(fillIndex, { layout: res.layout, ...(res.combinedDoors ? { combinedDoors: res.combinedDoors } : {}) }); setSelPart(null); }
      };
    }
  }, [selPart, cab, onSelInfo, partDeleteRef, partToggleOpenRef, partInnersRef, partDetachRef, partDuplicateRef, partHideRef, partSetFrontRef, partAcceptUpdateRef, onHiddenChange, hiddenGroups, fillIndex]);
  useEffect(() => { cabRef.current = cab; }, [cab]);
  // §Слои · publish the deduped list of 3D-selectable parts (by group) up to the shell's «Слои» panel.
  useEffect(() => {
    if (!onPartsList) return;
    const seen = new Map<string, { group: string; role: string; label: string; wMm: number; hMm: number; count: number; kromka: string }>();
    for (const p of allPartsForCab(cab)) {
      const ex = seen.get(p.group);
      if (ex) ex.count++;
      else { const rk = p.role === "drawer" ? "door" : p.role; seen.set(p.group, { group: p.group, role: p.role, label: PART_RU[p.role] ?? p.role, wMm: Math.round(p.size[0] * 1000), hMm: Math.round(p.size[1] * 1000), count: 1, kromka: jiyakSpecForRole(rk, settings?.kromkaOverride?.[rk]) }); }
    }
    onPartsList([...seen.values()]);
  }, [cab, onPartsList]);
  // §Слои · select a part BY GROUP from the panel (App2Shell → here) — switch to Part mode + highlight it.
  useEffect(() => {
    if (!partSelectRef) return;
    partSelectRef.current = (group: string) => {
      const boxes = allPartsForCab(cabRef.current).filter((x) => x.group === group);
      const p0 = boxes[0];
      if (!p0) return;
      setSelMode("part"); setSelSpace(null); setSelPart({ role: p0.role, group });
      // §Слои · fly-to: frame the group's UNION bbox (pos/size are already scene-world coords, −dM/2 Z).
      let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
      for (const b of boxes) {
        mnx = Math.min(mnx, b.pos[0] - b.size[0] / 2); mxx = Math.max(mxx, b.pos[0] + b.size[0] / 2);
        mny = Math.min(mny, b.pos[1] - b.size[1] / 2); mxy = Math.max(mxy, b.pos[1] + b.size[1] / 2);
        mnz = Math.min(mnz, b.pos[2] - b.size[2] / 2); mxz = Math.max(mxz, b.pos[2] + b.size[2] / 2);
      }
      // §Слои · SMART viewing angle — a front-3/4 for every part EXCEPT the back panel (viewed from behind),
      // so the fly never lands on a random side/back angle just because the camera happened to sit there.
      const dir = (p0.role === "back" ? new THREE.Vector3(0.5, 0.4, -1) : new THREE.Vector3(0.5, 0.4, 1)).normalize();
      flyToRef.current = {
        center: new THREE.Vector3((mnx + mxx) / 2, (mny + mxy) / 2, (mnz + mxz) / 2),
        radius: Math.max(0.06, new THREE.Vector3(mxx - mnx, mxy - mny, mxz - mnz).length() / 2),
        dir,
      };
    };
  }, [partSelectRef]);
  useEffect(() => { hiddenRef.current = hiddenGroups; if (meshRef.current) applyHiddenTo(meshRef.current, hiddenGroups); }, [hiddenGroups]); // §Скрыть · apply a toggle without a full rebuild
  useEffect(() => { placeToolRef.current = placeTool; }, [placeTool]);
  // a library component armed for drag-drop → force Space-mode (so cells are tappable) and drop any add-tool
  useEffect(() => { armedCompRef.current = armedComponent; if (armedComponent) { setSelMode("space"); setPlaceTool(null); } }, [armedComponent]);
  useEffect(() => { selPartRef.current = selPart; setPartMenuOpen(false); }, [selPart]);
  useEffect(() => { fillIndexRef.current = fillIndex; }, [fillIndex]);

  // §5 · Part pick-slabs — one INVISIBLE box per carcass panel so a 3D TAP can raycast-select it.
  // Built in BOTH 3D modes (opacity 0, not visible=false): Part-mode uses them to select; Space-mode
  // raycasts them too for the §5:343 auto-switch. userData.part carries the PartBox (role for adaptive).
  useEffect(() => {
    const group = partHitGroupRef.current;
    if (!group) return;
    for (const ch of [...group.children]) { group.remove(ch); const m = ch as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material)?.dispose(); }
    if (viewMode === "2d") return;
    for (const p of partsForCab(cab)) {
      if (hiddenGroups.includes(p.group)) continue; // §Скрыть · a hidden front drops its pick-slab → no obstacle, taps reach what's behind
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(...p.size),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      slab.position.set(...p.pos);
      slab.userData.part = p;
      group.add(slab);
    }
  }, [cab, viewMode, hiddenGroups]);

  // §5 · Part highlight — the selected panel(s) as translucent RED boxes (CF4 §6:133 "red selection").
  // Boxes are recomputed from `cab` by role, so they follow dimension edits and never drift.
  useEffect(() => {
    const group = partHlRef.current;
    if (!group) return;
    for (const ch of [...group.children]) { group.remove(ch); const m = ch as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material)?.dispose(); }
    hlFollowRef.current = []; // drop any follow bindings from the previous selection
    if (!selPart || viewMode === "2d") return;
    if (hiddenGroups.includes(selPart.group)) return; // §Скрыть · a hidden front shows no red highlight
    if (meshRef.current) meshRef.current.updateMatrixWorld(true);
    for (const p of allPartsForCab(cab).filter((x) => x.group === selPart.group)) {
      // inflate each side so the red shell reads on a thin panel's faces without z-fighting
      const mkMat = () => new THREE.MeshBasicMaterial({ color: 0xe5484d, transparent: true, opacity: 0.45, depthWrite: false });
      // §3D-select · a FRONT (door/drawer, top-level OR inner) → highlight its ACTUAL subgroup so the whole
      // part reads red (facade AND box). The box is GLUED to that subgroup (see the animate loop) so it moves
      // identically with the door/drawer. Carcass/interior parts (no mesh subgroup) fall back to a static box.
      const isFront = p.role === "door" || p.role === "drawer";
      let found: THREE.Object3D | undefined;
      if (isFront && meshRef.current) {
        const key = p.group.slice(p.group.indexOf("@") + 1);
        meshRef.current.traverse((o) => { if (!found && o.userData.partPath && (o.userData.partPath as number[]).join(".") === key) found = o; });
      }
      if (found) {
        const f = found;
        // measure the front in its CLOSED pose (reset the animated fields, then restore) so the size is right
        // even if the front is already open when (re)selected. The cabinet root has no rotation/scale, so a
        // closed-pose world-AABB equals the front's own local box; worldToLocal gives its local centre.
        const rx = f.rotation.x, ry = f.rotation.y, pz0 = f.position.z;
        f.rotation.x = 0; f.rotation.y = 0; f.position.z = 0; f.updateWorldMatrix(true, true);
        const bb = new THREE.Box3().setFromObject(f);
        const size = bb.getSize(new THREE.Vector3());
        const centerL = f.worldToLocal(bb.getCenter(new THREE.Vector3()));
        f.rotation.x = rx; f.rotation.y = ry; f.position.z = pz0; f.updateWorldMatrix(true, true);
        const box = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.006, size.y + 0.006, size.z + 0.006), mkMat());
        box.renderOrder = 999;
        f.getWorldQuaternion(box.quaternion); box.position.copy(centerL).applyMatrix4(f.matrixWorld); // seed frame-0 at the front's current pose
        group.add(box);
        hlFollowRef.current.push({ box, obj: f, center: centerL });
      } else {
        const box = new THREE.Mesh(new THREE.BoxGeometry(p.size[0] + 0.004, p.size[1] + 0.004, p.size[2] + 0.004), mkMat());
        box.position.set(p.pos[0], p.pos[1], p.pos[2]);
        box.renderOrder = 999;
        group.add(box);
      }
    }
  }, [selPart, cab, viewMode, hiddenGroups]);

  // §5:106 / §342 · resize handles (green grab-spheres, depthTest off + high renderOrder so they read
  // over the cabinet). PART mode → one per editable carcass axis (side → H·D, top/bottom → W·D, back →
  // W·H; thickness never draggable). SPACE mode → one per bounding Line of the selected cell (drag =
  // move the Line, §342). userData.handle.kind distinguishes them for the pointer handler.
  useEffect(() => {
    const group = handleGroupRef.current;
    if (!group) return;
    for (const ch of [...group.children]) { group.remove(ch); const m = ch as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material)?.dispose(); }
    if (viewMode === "2d") return;
    const mk = (pos: [number, number, number], data: object, corner = false) => {
      // green sphere = single-axis edge/dim handle · amber cube = §342 corner (two-Line, table X/Y)
      const geo = corner ? new THREE.BoxGeometry(0.034, 0.034, 0.034) : new THREE.SphereGeometry(0.02, 16, 12);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: corner ? 0xf2994a : 0x00ac7a, depthTest: false }));
      mesh.position.set(...pos); mesh.renderOrder = 1000; mesh.userData.handle = data; group.add(mesh);
    };
    if (selMode === "part" && selPart) for (const h of resizeHandlesFor(selPart.role, cab)) mk(h.pos, { kind: "dim", dim: h.dim });
    else if (selMode === "space" && selSpace) {
      const { edges, corners } = spaceResizeHandlesFor(selSpace.rect, cab);
      for (const h of edges) mk(h.pos, { kind: "line", line: h });
      for (const c of corners) mk(c.pos, { kind: "corner", corner: c }, true);
    }
  }, [selPart, selSpace, selMode, cab, viewMode]);

  // 3. Bottom panel states:
  // - "collapsed": Panel minimized to 48px header at bottom -> 3D scene TAKES FULL SCREEN
  // - "normal": Default balanced view -> 3D scene takes 38vh, panel takes rest
  // - "expanded": Panel expanded UP -> panel takes majority of screen, 3D scene SHRINKS to 160px
  // Embedded (App2Shell / v9): start COLLAPSED so the 3D fills the frame (v9 has no permanent bottom
  // panel — construction lives on the profile, DB/27). The «Настройки» bar stays a tap away. Main app
  // (ConfigScreen «Редактор») is unchanged: «normal».
  const [panelState, setPanelState] = useState<"collapsed" | "normal" | "expanded">(embedded ? "collapsed" : "normal");

  // Use ResizeObserver to keep Three.js renderer in sync with the container size
  // at all times — during CSS transitions, panel toggles, and window resizes.
  useEffect(() => {
    const container = mountRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!container || !renderer || !camera) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rw = entry.contentRect.width;
        const rh = entry.contentRect.height;
        if (rw > 0 && rh > 0) {
          camera.aspect = rw / rh;
          camera.updateProjectionMatrix();
          renderer.setSize(rw, rh);
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Pull bottom panel UP (expands panel -> shrinks 3D scene)
  const expandPanelUp = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPanelState((prev) => (prev === "collapsed" ? "normal" : "expanded"));
  };

  // Push bottom panel DOWN (collapses panel -> enlarges 3D scene)
  const collapsePanelDown = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPanelState((prev) => (prev === "expanded" ? "normal" : "collapsed"));
  };

  const viewBtn = (mode: "3d" | "2d" | "outline", label: React.ReactNode) => (
    <button
      onClick={() => setViewMode(mode)}
      style={{
        border: "none",
        background: viewMode === mode ? "#00ac7a" : "transparent",
        color: viewMode === mode ? "#fff" : "#475569",
        width: 34,
        height: 34,
        padding: 0,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: viewMode === mode ? "0 2px 6px rgba(0,172,122,0.25)" : "none",
      }}
      type="button"
    >{label}</button>
  );

  // §5 · the two permanent selection-mode buttons (CF4 §5:101). Blue accent ties ▢ Space to the
  // blue space-volume it shows. Concepts: Пространство (Space) / Деталь (Part) — GLOSSARY canonical.
  const selBtn = (m: "space" | "part", label: React.ReactNode, title: string) => {
    const active = selMode === m;
    // Embedded (App2Shell / v9): a lrail CARD with an icon + label (Простр. / Деталь) and the v9 accent
    // border (blue Space / red Part). Uncontrolled main app (ConfigScreen «Редактор») keeps the small icon.
    if (embedded) {
      const accent = m === "space" ? "#3a8fe6" : "#e23b32";
      const short = m === "space" ? "Простр." : "Деталь";
      return (
        <button onClick={() => pickSelMode(m)} title={title} aria-label={title} type="button"
          style={{
            width: 54, height: 58, padding: 0, borderRadius: 14, cursor: "pointer",
            border: `1.5px solid ${active ? accent : "transparent"}`,
            background: active ? "rgba(251,248,241,0.86)" : "rgba(251,248,241,0.72)",
            backdropFilter: "saturate(1.7) blur(20px)", WebkitBackdropFilter: "saturate(1.7) blur(20px)",
            boxShadow: "0 2px 6px rgba(20,18,12,.10), 0 8px 22px rgba(20,18,12,.12), 0 0 0 .5px rgba(255,255,255,.5) inset",
            color: active ? accent : "#6a6256",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
            transition: "all 0.16s cubic-bezier(.34,1.42,.44,1)",
          }}>
          {label}<span style={{ fontSize: 9, fontWeight: 700 }}>{short}</span>
        </button>
      );
    }
    return (
      <button
        onClick={() => pickSelMode(m)}
        title={title}
        aria-label={title}
        style={{
          border: "none",
          background: active ? "#2f6fe4" : "transparent",
          color: active ? "#fff" : "#475569",
          width: 34,
          height: 34,
          padding: 0,
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.15s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: active ? "0 2px 6px rgba(47,111,228,0.25)" : "none",
        }}
        type="button"
      >{label}</button>
    );
  };

  return (
    <div className="v21-studio-overlay" style={{ position: embedded ? "relative" : "fixed", inset: embedded ? undefined : 0, width: embedded ? "100%" : undefined, height: embedded ? "100%" : undefined, zIndex: embedded ? undefined : 120, background: embedded ? "transparent" : "#0f172a", display: "flex", flexDirection: "column", fontFamily: "var(--sans, system-ui, sans-serif)" }}>
      {/* Top Header — light bar, black text; the green «Готово» is the only close affordance.
          Hidden when embedded: the App2Shell (v9) owns the top chrome. */}
      {!embedded && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "#f9fafc", color: "#0f172a", flex: "none" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Студия: {cab.w}×{cab.h}×{cab.depth ?? 560} мм</h2>
          <button onClick={onClose} style={{ border: "none", background: "#00ac7a", color: "#fff", padding: "8px 20px", borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,172,122,0.3)" }} type="button">Готово</button>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* Top Viewport — grows when panel is collapsed, shrinks when panel is expanded */}
        <div style={{
          flex: panelState === "collapsed" ? 1 : "none",
          height: panelState === "collapsed" ? undefined : panelState === "expanded" ? 160 : "38vh",
          minHeight: panelState === "collapsed" ? 0 : panelState === "expanded" ? 160 : undefined,
          width: "100%",
          position: "relative",
          background: "#f8fafc",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          {/* 3D canvas — ALWAYS mounted, just hidden when the 2D edit canvas is active */}
          <div
            ref={mountRef}
            style={{
              width: "100%",
              height: "100%",
              display: viewMode === "2d" ? "none" : "block",
              background: "#f8fafc",
            }}
          />

          {/* 2D editable interior canvas — the tools act HERE; the viewport rail (below) drives them,
              and every edit writes cab.layout so the 3D view reflects it the moment you switch back. */}
          {viewMode === "2d" && fillIndex >= 0 && (
            <div className="studio-fillwrap">
              <FillEditor
                embedded
                tool={tool}
                onToolChange={setTool}
                onSelChange={setHasSel}
                onSpaceSel={setSelSpace}
                onReadout={setReadout}
                lenUnit={units}
                initialSelPath={selSpace?.path ?? null}
                deleteRef={deleteFnRef}
                cab={cab}
                index={fillIndex}
                name=""
                style={style ?? DEFAULT_SOLO_STYLE}
                patchCab={storePatchCab}
                patchCabLive={storePatchCabLive}
                beginEdit={beginCabEdit}
                undo={undoCab}
                redo={redoCab}
                canUndo={canUndoCab}
                canRedo={canRedoCab}
                ceiling={ceiling}
                shelfLoadKgPerM={settings?.shelfLoadKgPerM ?? 15}
                onClose={() => setViewMode("3d")}
              />
            </div>
          )}

          {/* Bottom-LEFT: a vertical pill of 3D / 2D / Сетка, and — SEPARATE below it — a «Глубина»
              icon button that slides the depth slider out to its right (the one dim 2D can't do). */}
          <div className={`studio-views${embedded ? " a2emb" : ""}`}>
            {/* §5 · two selection modes — ▢ Space (Пространство) / ◇ Part (Деталь), CF4 §5:101. Only in
                3D/outline: the 2D editor drives its OWN selection, and these would overlap its «Bo'lish» bar. */}
            {viewMode !== "2d" && (
              <div className="studio-viewcol">
                {selBtn("space", (<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><rect x={4} y={4} width={16} height={16} rx={2} /></svg>), t.config.selSpace)}
                {selBtn("part", (<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><path d="M12 3 L21 12 L12 21 L3 12 Z" /></svg>), t.config.selPart)}
              </div>
            )}
            <div className="studio-viewcol">
              {viewBtn("3d", "3D")}
              {viewBtn("2d", "2D")}
              {viewBtn("outline", <IconLines />)}
            </div>
            <button type="button" className={`studio-depth-pill${depthOpen ? " on" : ""}`} onClick={() => setDepthOpen((o) => !o)} aria-label="Глубина" title="Глубина">
              <GlyphD />
            </button>
            {depthOpen && (
              <div className="studio-depth-slider">
                <DimSlider icon={null} label="Глубина" value={cabDepth(cab)} min={D_MIN} max={D_MAX} step={10} lenUnit={settings?.units ?? "mm"}
                  onBegin={beginCabEdit}
                  onLive={(v) => patchCabDims(cab.id, { depth: v }, true)}
                  onCommit={(v) => patchCabDims(cab.id, { depth: v })} />
              </div>
            )}
          </div>

          {/* §5:103 · Space-mode ADD toolset — «Полка · Стойка · Дверь · Ящик». Arm one, then tap a
              cell to place it there (§4:91 "tap each position"). Only in Space-mode 3D, when idle. */}
          {selMode === "space" && viewMode !== "2d" && !readout && !warn && (
            // Embedded: sits BELOW the left poz card (it is wider than the centred dim-chips and would
            // otherwise underlap the poz card on a narrow phone). Standalone keeps the top strip.
            <div style={{ position: "absolute", left: "50%", top: embedded ? 186 : 12, transform: "translateX(-50%)", display: "flex", gap: 6, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderRadius: 12, padding: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.14)", zIndex: 7 }}>
              {([["shelf", "Полка"], ["vertical", "Стойка"], ["door", "Дверь"], ["drawer", "Ящик"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => { setPlaceTool((p) => (p === k ? null : k)); setSelSpace(null); }}
                  style={{ border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", background: placeTool === k ? "#00ac7a" : "#f1f5f9", color: placeTool === k ? "#fff" : "#334155" }}>{label}</button>
              ))}
            </div>
          )}

          {/* §5:115 · readout law — while dragging a resize handle (3D) OR a divider (2D), the live
              dimension is the guaranteed-visible truth in a fixed top-centre strip, never under the finger. */}
          {readout && (
            <div style={{ position: "absolute", left: "50%", top: embedded ? 100 : 12, transform: "translateX(-50%)", background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 700, padding: "8px 16px", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", zIndex: 8, whiteSpace: "nowrap" }}>{readout}</div>
          )}

          {/* 37_MIN_GATE §6 · transient amber min-size warn after a tap-place (non-blocking, §4 amber). */}
          {warn && !readout && (
            <div style={{ position: "absolute", left: "50%", top: embedded ? 100 : 12, transform: "translateX(-50%)", background: "#b45309", color: "#fff", fontSize: 14, fontWeight: 700, padding: "8px 16px", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", zIndex: 8, whiteSpace: "nowrap" }}>{warn}</div>
          )}
          {armedComponent && (
            <div role="button" onClick={() => disarmComponent()} title="Нажмите, чтобы отменить"
                 style={{ position: "absolute", left: "50%", top: embedded ? 100 : 12, transform: "translateX(-50%)", background: "#3b5bdb", color: "#fff", fontSize: 14, fontWeight: 700, padding: "8px 16px", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", zIndex: 9, whiteSpace: "nowrap", cursor: "pointer" }}>
              📍 Коснитесь ячейки — поставить компонент · ✕ отмена
            </div>
          )}

          {/* §15.3 · dimension chips — a SEPARATE strip (never in the pill): a PART shows its 2 editable
              axes (Ш/В/Г), a SPACE shows Ш+В (editable only where a Line, not a wall, bounds it). Tap →
              dock numpad. Sits just below the top-centre card/toolset; hidden while dragging. */}
          {viewMode !== "2d" && !readout && !numpad && (selPart || selSpace) && (() => {
            type Chip = { label: string; value: number; apply?: (mm: number) => void };
            const chips: Chip[] = [];
            const th = (cab.boardThickness ?? 16) / 1000, band = cabBand(cab), isUpper = cab.kind === "upper";
            const yB = isUpper ? 0 : GEOM.plinth / 1000, yT = isUpper ? (band.carcass1 - band.carcass0) / 1000 : band.carcass1 / 1000;
            const iwMm = (cab.w / 1000 - 2 * th) * 1000, ihMm = (yT - th - (yB + th)) * 1000;
            const setLine = (L: LineHandle, targetAf: number) => { const refMm = (L.pf1 - L.pf0) * (L.split === "rows" ? cab.h : cab.w); const { layout } = moveDivider(flattenedLayout(cab), L.parent, L.i, (targetAf - L.pf0) / (L.pf1 - L.pf0), refMm); beginCabEdit(); storePatchCab(fillIndex, { layout }); };
            // §15.3:340 · the Ш+В chips for a CELL rect — shared by a selected SPACE and by a selected FRONT
            // (a Дверь/Ящик fills its cell). Each axis is editable only where a Line (not a wall) bounds it.
            const cellDimChips = (rect: { fx0: number; fy0: number; fx1: number; fy1: number }): Chip[] => {
              const { bounds } = spaceResizeHandlesFor(rect, cab);
              const { fx0, fy0, fx1, fy1 } = rect, vL = bounds.r ?? bounds.l, hL = bounds.t ?? bounds.b;
              return [
                { label: "Ш", value: Math.round((fx1 - fx0) * iwMm), apply: vL ? (mm) => setLine(vL, bounds.r ? fx0 + mm / iwMm : fx1 - mm / iwMm) : undefined },
                { label: "В", value: Math.round((fy1 - fy0) * ihMm), apply: hL ? (mm) => setLine(hL, bounds.t ? fy0 + mm / ihMm : fy1 - mm / ihMm) : undefined },
              ];
            };
            if (selMode === "part" && selPart) {
              const handles = resizeHandlesFor(selPart.role, cab);
              for (const hnd of handles) {
                if (hnd.dim === "h") chips.push({ label: "В", value: cab.h, apply: (mm) => { beginCabEdit(); patchCabDims(cab.id, { h: mm }); } });
                else if (hnd.dim === "w") chips.push({ label: "Ш", value: cab.w, apply: (mm) => { beginCabEdit(); storePatchCab(fillIndex, { w: mm }); } });
                else chips.push({ label: "Г", value: cabDepth(cab), apply: (mm) => { beginCabEdit(); patchCabDims(cab.id, { depth: mm }); } });
              }
              // §5:111 · an INTERIOR divider (Полка/Стойка) has no envelope handle — it's edited by MOVING its
              // own Line (§5:106). Show its ONE editable axis: the distance from the compartment's lower/left
              // edge → numpad → moveDivider. Only for a UNIQUE part (a sibling group shares no single value).
              if (!handles.length && (selPart.role === "shelf" || selPart.role === "divider")) {
                const mem = interiorDivsForCab(cab).filter((d) => `${d.kind === "shelf" ? "shelf" : "divider"}@${d.parent.join(".")}` === selPart.group);
                if (mem.length === 1) {
                  const d = mem[0]!;
                  const spanMm = d.kind === "shelf" ? ihMm : iwMm;
                  const p0 = d.kind === "shelf" ? d.pfy0 : d.pfx0, p1 = d.kind === "shelf" ? d.pfy1 : d.pfx1;
                  const refMm = (p1 - p0) * (d.kind === "shelf" ? cab.h : cab.w);
                  chips.push({ label: d.kind === "shelf" ? "В" : "Ш", value: Math.round((d.af - p0) * spanMm),
                    apply: (mm) => { const { layout } = moveDivider(flattenedLayout(cab), d.parent, d.i, (mm / spanMm) / (p1 - p0), refMm); beginCabEdit(); storePatchCab(fillIndex, { layout }); } });
                }
              }
              // §15.3:340 · a FRONT (Дверь/Ящик) fills its cell → show the cell's Ш+В (like a Space). Only for
              // a UNIQUE front (a drawer bank shares no single value) — the interior chip's front twin.
              if (!handles.length && (selPart.role === "door" || selPart.role === "drawer")) {
                const fr = leavesForCab(cab).filter((l) => l.cell.front && `${l.cell.front}@${l.path.join(".")}` === selPart.group);
                if (fr.length === 1) { const lf = fr[0]!; chips.push(...cellDimChips({ fx0: lf.fx0, fy0: lf.fy0, fx1: lf.fx1, fy1: lf.fy1 })); }
              }
            } else if (selMode === "space" && selSpace) {
              chips.push(...cellDimChips(selSpace.rect));
            }
            const spaceCtl = selMode === "space" && !!selSpace; // E1/E2-3D · on-selection split + content-cycle
            if (!chips.length && !spaceCtl) return null;
            const actBtn: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 8, padding: "5px 9px", fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.96)", color: "#0f172a", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", whiteSpace: "nowrap" };
            return (
              <div style={{ position: "absolute", left: 8, right: 8, top: embedded ? (partMenuOpen ? 300 : 236) : (partMenuOpen ? 108 : 60), display: "flex", gap: 6, zIndex: 7, flexWrap: "nowrap", overflowX: "auto", justifyContent: "center", padding: "0 2px", scrollbarWidth: "none", transition: "top 0.14s ease" }}>
                {/* dimension chips removed — the РАЗМЕР poz card (App2Shell) now edits the cabinet size via a
                    numpad (founder «poz card values clickable»); interior cells resize by dragging their line. */}
                {spaceCtl && (() => {
                  // DB/19 §C:56 «split affordance ON the section — replaces the + button» (E1) + §5:170 content
                  // cycle (E2). Buttons on the selected section, no armed tool, no orbit touch.
                  const path = selSpace!.path;
                  const leaf = leavesForCab(cab).find((l) => l.path.join(".") === path.join("."));
                  const cyclable = leaf ? cellVariant(leaf.cell) != null : false;
                  const cycle = (dir: 1 | -1) => { const layout = cycleCellContent(cab, path, dir); if (layout) { beginCabEdit(); storePatchCab(fillIndex, { layout }); } };
                  return (
                    <>
                      {cyclable && <button type="button" style={actBtn} onClick={() => cycle(-1)} title="Содержимое ← (Открытый·Дверь·Ящик·Полки)">◀</button>}
                      {cyclable && <button type="button" style={actBtn} onClick={() => cycle(1)} title="Содержимое → (Открытый→Дверь→Ящик→Полки)">содерж.&nbsp;▶</button>}
                      {/* ＋полка/＋стойка removed — the «Полка · Стойка» tool row already adds dividers (CONSTRUCTION_FRAME:91), so these duplicated it and overflowed the row. */}
                    </>
                  );
                })()}
              </div>
            );
          })()}

          {/* §15.3 · dock numpad — one bottom dock (no floating popups). Fixed to the screen bottom so it
              works over the settings sheet; responsive (full-width → max 380, centred). App styling. */}
          {numpad && (() => {
            const numBtn: React.CSSProperties = { border: "none", background: "#f1f5f9", borderRadius: 12, padding: "16px 0", fontSize: 19, fontWeight: 700, color: "#0f172a", cursor: "pointer" };
            const key = (d: string) => setNumpad((n) => (n ? { ...n, value: (n.value + d).slice(0, 5) } : n));
            return (
              <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 130, display: "flex", justifyContent: "center", padding: "0 8px 8px", boxSizing: "border-box" }}>
                <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, boxShadow: "0 -6px 30px rgba(0,0,0,0.22)", padding: "12px 14px 16px", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{numpad.label}</span>
                    <span style={{ flex: 1, textAlign: "right", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{numpad.value || "0"}<span style={{ fontSize: 13, color: "#94a3b8" }}> {lenUnitLabel(units)}</span></span>
                    <button type="button" onClick={() => setNumpad(null)} aria-label="Закрыть" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 34, height: 34, fontSize: 16, color: "#475569", cursor: "pointer", flex: "none" }}>✕</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (<button key={d} type="button" onClick={() => key(d)} style={numBtn}>{d}</button>))}
                    <button type="button" onClick={() => setNumpad((n) => (n ? { ...n, value: n.value.slice(0, -1) } : n))} style={numBtn} aria-label="Стереть">⌫</button>
                    <button type="button" onClick={() => key("0")} style={numBtn}>0</button>
                    <button type="button" onClick={() => { const raw = Number(numpad.value); const mm = units === "cm" ? Math.round(raw * 10) : Math.round(raw); if (mm > 0) numpad.apply(mm); setNumpad(null); }} style={{ ...numBtn, background: "#00ac7a", color: "#fff" }}>OK</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* §5 · Part info card (bottom sheet, §15.3-corrected): [material colour bar | name | ⋮] +
              state line «Уникальная деталь / Тип · N дет.» (§5:112). NO dimensions in the pill — dims
              live on the object (a later step). The «⋯» is the affordance; its menu is wired later.
              Hidden while resizing — the readout strip owns the top-centre. Suppressed in the embedded v9
              studio: the App2Shell poz card is the single selection readout there (no duplicate/collision). */}
          {selPart && viewMode !== "2d" && !readout && !embedded && (() => {
            const n = allPartsForCab(cab).filter((p) => p.group === selPart.group).length;
            const key = partFinishKey(selPart.role);
            const color = cab.finish?.[key] ?? (style ?? DEFAULT_SOLO_STYLE)[key];
            const mat = catalogByColor(color, key);
            return (
              <div style={{ position: "absolute", left: "50%", top: embedded ? 100 : 12, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.14)", zIndex: 6, maxWidth: "72%" }}>
                <span style={{ width: 5, height: 30, borderRadius: 3, background: mat?.color ?? intToHex(color), flex: "none" }} aria-hidden />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{PART_RU[selPart.role] ?? selPart.role}</div>
                  <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n > 1 ? `Тип · ${n} дет.` : "Уникальная деталь"}{mat ? ` · ${mat.name}` : ""}</div>
                </div>
                <div style={{ position: "relative", flex: "none" }}>
                  <button type="button" aria-label="Ещё" title="Ещё" onClick={() => setPartMenuOpen((o) => !o)} style={{ border: "none", background: "transparent", color: "#475569", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}>⋯</button>
                  {/* §5:113 · only DELETE is app-layer; the rest (Block/Hide/Rename/Hierarchy/Save-as/Ungroup) need
                      a Component or a persisted Cell field = founder-gated, so they're omitted, not faked. */}
                  {partMenuOpen && (() => {
                    const deletable = selPart.group.includes("@"); // carcass envelope parts aren't Cell nodes
                    return (
                      <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, background: "#fff", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.16)", overflow: "hidden", minWidth: 150, zIndex: 9 }}>
                        <button type="button" disabled={!deletable} onClick={() => {
                          const res = deletePartGroup(cab, selPart.group);
                          if (res) { beginCabEdit(); storePatchCab(fillIndex, { layout: res.layout, ...(res.combinedDoors ? { combinedDoors: res.combinedDoors } : {}) }); setSelPart(null); }
                          setPartMenuOpen(false);
                        }} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "10px 14px", fontSize: 13, fontWeight: 600, color: deletable ? "#c0392b" : "#cbd5e1", cursor: deletable ? "pointer" : "default" }}>✕ Удалить</button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
          {/* Bottom-CENTER: undo/redo — and, in 2D with a selection, the contextual delete sits INLINE
              here (never over the fe-optbar pill editor or the canvas → robust on mobile + desktop). */}
          {(!embedded || (viewMode === "2d" && hasSel)) && (
          <div className="studio-undoredo">
            {!embedded && (
              <>
                <button onClick={undoCab} disabled={!canUndoCab} type="button" aria-label={t.config.undo}><IconUndo /></button>
                <button onClick={redoCab} disabled={!canRedoCab} type="button" aria-label={t.config.redo}><IconRedo /></button>
              </>
            )}
            {viewMode === "2d" && hasSel && (
              <button type="button" onClick={() => deleteFnRef.current?.()} aria-label="Удалить" title="Удалить"
                style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 14, color: "#c0392b", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, lineHeight: 1 }}>✕ Удалить</button>
            )}
          </div>
          )}

          {/* Bottom-RIGHT TOOL RAIL — the 2D fill tools (Провести линии · Двигать · Двери · Ящики). In the
              main app it also lives in 3D (a tool tap jumps to 2D). In the embedded v9 studio 3D uses the
              top add-toolset instead, so the rail shows ONLY in 2D — right-edge, clear of Слои/Настройки. */}
          {(!embedded || viewMode === "2d") && (
          <div className={`studio-rail${embedded ? " a2emb" : ""}`}>
            {FILL_TOOLS.map((ft) => {
              const active = viewMode === "2d" && tool === ft.key;
              return (
                <button key={ft.key} className={`studio-tool${active ? " sel" : ""}`} type="button"
                  onClick={() => { setTool(ft.key); setViewMode("2d"); }}>
                  <span className="studio-tool-ic"><ToolIcon tool={ft.key} /></span>
                  <span className="studio-tool-lbl">{(t.fe as unknown as Record<string, string>)[ft.labelKey]}</span>
                </button>
              );
            })}
          </div>
          )}
        </div>

        {/* Bottom Collapsible Settings Sheet */}
        <div style={{
          flex: panelState === "collapsed" ? "none" : 1,
          height: panelState === "collapsed" ? 48 : undefined,
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderTop: "1px solid #e2e8f0",
          boxShadow: "0 -6px 20px rgba(0,0,0,0.05)",
          zIndex: 5,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
          {/* Handle / Header Bar */}
          <div
            onClick={panelState === "collapsed" ? expandPanelUp : collapsePanelDown}
            style={{
              height: 48,
              minHeight: 48,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 4, borderRadius: 2, background: "#cbd5e1" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Настройки</span>
            </div>

            {/* Directional arrow controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {(() => {
                const arrowBtn = (dir: "down" | "up", onClick: (e?: React.MouseEvent) => void, disabled: boolean, title: string) => (
                  <button onClick={onClick} disabled={disabled} title={title} type="button"
                    style={{
                      border: "1px solid #e2e8f0",
                      background: disabled ? "#f1f5f9" : "#ffffff",
                      color: disabled ? "#cbd5e1" : "#475569",
                      width: 34, height: 34, padding: 0, borderRadius: 8,
                      cursor: disabled ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={dir === "down" ? "M6 9 L12 15 L18 9" : "M6 15 L12 9 L18 15"} />
                    </svg>
                  </button>
                );
                return (
                  <>
                    {arrowBtn("down", collapsePanelDown, panelState === "collapsed", "Свернуть панели (увеличить 3D)")}
                    {arrowBtn("up", expandPanelUp, panelState === "expanded", "Расширить панели (уменьшить 3D)")}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Settings Content Body — construction (Безручковый/Задняя стенка/Дно/Верх/Цоколь · Узлы ·
              Кромка · Назначение). Dimensions live on the viewport: W/H/shelves via the tools, depth
              via the bottom-left «Глубина» button. */}
          {panelState !== "collapsed" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <V21BlueprintEditor cab={cab} patchCab={patchCab} onClose={onClose} settings={settings} updateSettings={updateSettings} hideHeader={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

