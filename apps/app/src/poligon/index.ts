// poligon — §2 MUZLATILGAN API (54§2). UI (Saidislom) FAQAT shu yuzadan chaqiradi; model/ ichki
// fayllariga hech qachon tegmaydi. Engine hech qachon React import qilmaydi (54§0 tikuv).
// Bu fayl yangi mantiq YOZMAYDI — isbotlangan model/ funksiyalarini bitta seam sifatida ochadi.

// ─ sheet ─────────────────────────────────────────────────────────────────────
export { createSheet, addLine, setThickness, getThickness, lineById, faces, commit, serialize, parse, segKey } from "./model/sheet.ts";
export { apply, legalDomain } from "./model/ops.ts";
export type { Op, ApplyResult } from "./model/ops.ts";

// ─ derivation (P0→P4) ────────────────────────────────────────────────────────
export { derive } from "./model/derive.ts";
export type { Derivation, DerivedPart, DerivedJunction, Profile } from "./model/derive.ts";

// ─ junctions / boards / modules (derivatsiya bo'laklari) ─────────────────────
export { resolveThrough, classify, carcassParts, RANK } from "./model/junction.ts";
export type { Role, Through, Override, JClass, CarcassParts } from "./model/junction.ts";
export { boardRuns } from "./model/board.ts";
export type { Board, ThroughAt } from "./model/board.ts";
export { deriveModules, transportCheck } from "./model/module.ts";
export type { Module, TransportLimit, Cell } from "./model/module.ts";

// ─ rules (cascade) ───────────────────────────────────────────────────────────
export { resolve, blastRadius, authorRule, LAYERS } from "./model/cascade.ts";
export type { Rule, Resolved, Layer, Part } from "./model/cascade.ts";
export { FACET_TIER, tierOf, isTier0, assertGeometricPredicate, computeFacet, computeAdjacency } from "./model/facets.ts";
export type { FacetName, Tier, Adjacency, PanelTopo } from "./model/facets.ts";

// ─ validation and output (P5→P6) ─────────────────────────────────────────────
export { checkColumnMinimum, checkMaterialDomain, checkCollisions } from "./model/validate.ts";
export type { Occupant, MaterialDomain, Box } from "./model/validate.ts";
export { release, diffReleases, partIdentity } from "./model/release.ts";
export type { Release, ReleasedPart, InputPart, Banding, ShopConvention, PartDiff } from "./model/release.ts";

// ─ things + lock ─────────────────────────────────────────────────────────────
export { canPublish, buildIndex } from "./model/things.ts";
export type { Thing, ThingDef, FieldDef, Ownership } from "./model/things.ts";
export { contentHash, lockOf, checkLock, reverseIndex } from "./model/lock.ts";
export type { Lock, LockEntry } from "./model/lock.ts";

// ─ derived-until-touched (48§3 · B7) ──────────────────────────────────────────
export { isDerived, declareRelation, resolvePositions, pinPosition } from "./model/relations.ts";
export type { PositionRelation } from "./model/contracts.ts";

// ─ wall length (L14 · B6) ─────────────────────────────────────────────────────
export { setWallLength } from "./model/wall.ts";
export type { RedistributePolicy } from "./model/wall.ts";

// ─ void / reserved / absorb (L9/L10 · B5) ────────────────────────────────────
export { deleteBoard, voidBlock, reserveBlock, absorb, mergeAdjacentVoids, isExemptFromEqualize, reservedFootprint } from "./model/voidspace.ts";
export type { ReservedMeta } from "./model/contracts.ts";

// ─ persist (project fayli) — SOF qismgina (fs I/O poligon/index'da YO'Q; brauzerga node:fs kirmaydi).
//   Haqiqiy save/load faqat Node'da: `model/project-fs.ts` dan to'g'ridan-to'g'ri import qilinadi.
export { serializeProject, parseProject, checkProjectIntegrity } from "./model/project.ts";
export type { Project, Pin, StoredRule } from "./model/project.ts";

// ─ asosiy tiplar ─────────────────────────────────────────────────────────────
export type { Axis, Thickness, LineId, Line, Block, Sheet, Refusal, EndKind, EndSpec, WallEnds, Opening } from "./model/contracts.ts";
export { EPS, DEFAULT_MIN } from "./model/contracts.ts";
