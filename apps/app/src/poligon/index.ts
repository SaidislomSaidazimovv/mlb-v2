// poligon — §2 MUZLATILGAN API (54§2). UI (Saidislom) FAQAT shu yuzadan chaqiradi; model/ ichki
// fayllariga hech qachon tegmaydi. Engine hech qachon React import qilmaydi (54§0 tikuv).
// Bu fayl yangi mantiq YOZMAYDI — isbotlangan model/ funksiyalarini bitta seam sifatida ochadi.

// ─ sheet ─────────────────────────────────────────────────────────────────────
export { createSheet, addLine, setThickness, getThickness, setSegMaterial, getSegMaterial, lineById, faces, commit, serialize, parse, segKey } from "./model/sheet.ts";
export { apply, legalDomain } from "./model/ops.ts";
export type { Op, ApplyResult } from "./model/ops.ts";

// ─ parity ko'prigi (parametric karcass → Sheet) ──────────────────────────────
export { carcassSheet } from "./bridge.ts";
export type { CarcassSpec } from "./bridge.ts";

// ─ derivation (P0→P4) ────────────────────────────────────────────────────────
export { derive, bandingFromExposure } from "./model/derive.ts";
export type { Derivation, DerivedPart, DerivedJunction, Profile, EdgeExposure, KromkaSpec } from "./model/derive.ts";

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
export { checkColumnMinimum, checkMaterialDomain, checkCollisions, checkConstraint, checkDoorSwing, checkGrainFit } from "./model/validate.ts";
export type { Occupant, MaterialDomain, Box, Constraint } from "./model/validate.ts";
export { release, diffReleases, partIdentity, nominalToModel, setReleaseStatus } from "./model/release.ts";
export type { Release, ReleasedPart, InputPart, Banding, ShopConvention, PartDiff, ReleaseStatus } from "./model/release.ts";

// ─ qolgan hujjat qismlari (48§6 · 50 Law C · 50§6 · 52 · 53§1/§3/§5) ─────────────
export { DEFAULT_STANDARDS, fillModules } from "./model/profile.ts";
export type { StandardsProfile } from "./model/profile.ts";
export { checkPinAlive, offerPromotion } from "./model/pins.ts";
export type { PromotionOffer } from "./model/pins.ts";
export { changeLedger } from "./model/ledger.ts";
export type { Ledger } from "./model/ledger.ts";
export { preflight } from "./model/preflight.ts";
export type { PreflightInput, PreflightItem } from "./model/preflight.ts";
export { forkThing, retireThing, pickerList, makeCollection } from "./model/catalog.ts";
export type { Collection } from "./model/catalog.ts";
export { removeAttached, markDiverged, isHanded, checkHandedness } from "./model/attached.ts";
export type { AttachedItem } from "./model/attached.ts";

// ─ Law B (single-valued facet) + overrides kanali (53§4) ─────────────────────
export { checkSingleValued, bandsSpanned } from "./model/lawb.ts";
export type { Band } from "./model/lawb.ts";
export { makeOverride, applyOverride, checkOverrideAlive, overrideInventory } from "./model/overrides.ts";
export type { PartOverride, OverrideKind } from "./model/overrides.ts";

// ─ atomik Theme install (D10) ─────────────────────────────────────────────────
export { installTheme } from "./model/install.ts";
export type { Theme, DomainReport, InstallResult } from "./model/install.ts";

// ─ bitta undo-journal (H3) ────────────────────────────────────────────────────
export { initJournal, record, current, undo, redo, canUndo, canRedo } from "./model/journal.ts";
export type { Journal, JournalStep, JournalState, JournalKind } from "./model/journal.ts";

// ─ things + lock ─────────────────────────────────────────────────────────────
export { canPublish, buildIndex } from "./model/things.ts";
export type { Thing, ThingDef, FieldDef, Ownership } from "./model/things.ts";
export { contentHash, lockOf, checkLock, reverseIndex } from "./model/lock.ts";
export type { Lock, LockEntry } from "./model/lock.ts";

// ─ incremental invalidation (50§6) — sof, brauzerga xavfsiz ─────────────────────
export { newCache, cacheKey, getCached, setCached, invalidateByRule } from "./model/invalidation.ts";
export type { ResolveCache } from "./model/invalidation.ts";
// (52§2 haqiqiy fs `loadThings(dir)` — Node-only `model/things-fs.ts` dan to'g'ridan import; index brauzerga chiqarmaydi.)

// ─ Type-declared params + optional parts (D2) ─────────────────────────────────
export { checkRuleParam, checkEnumValue, resolvePresentParts } from "./model/types.ts";
export type { TypeDef, ParamDecl, ParamKind } from "./model/types.ts";

// ─ layers + fullness (L3 · B8) ────────────────────────────────────────────────
// Eslatma: 48 L3 fizik qatlam (behind/carcass/front/above) `Block.layer` tipida; nomi 50§2 cascade
// `Layer` (system/catalog/...) bilan to'qnashmasligi uchun index'da alohida eksport qilinmaydi.
export { checkFullness, blockLayer, formsJunctions } from "./model/layers.ts";

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
