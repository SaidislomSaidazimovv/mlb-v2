// Single zustand store for the whole journey. Mirrors v7-journey.html's `S`
// object + actions, typed. Screens read slices from here; the price ticker reads
// the same state through model/toProject.ts → priceProject.

import { create } from "zustand";
import { MATERIALS, mk, dedupeIds, styleOf, frontOf, type Cabinet, type ComponentRef, type FinishKey, type FrontProfile } from "./model/cabinet";
import { fillGapSpan, firstFitX, parkX } from "./model/fill";
import { dockAll, cabFootprints, footsClash } from "./model/footprint";
import { generateVariants as solveVariants, type GenVariant, type KitchenStyle, type Zone, type FridgeType, type OvenType, type HoodType, type WallBand } from "./model/layout";
import { defaultMaterialSlots, type MaterialSlots } from "./model/materials";
import { isTiled, runFloor, resolveLayout, wallRows } from "./model/resolve";
import { maxCabH, cabDepth, isOuterCorner, bandsOverlap, FOOT_DEPTH_MM, MIN_H, D_MIN, D_MAX } from "./model/bands";
import { resizeCabs, setBasesH, editRows, seatCorner, seatOuterCorner, healRunStarts, healCornerUnits, type ResizeBounds, type RowEdit } from "./model/rowOps";
import { mergeRow, unmergeRow, healCarcassGroups, joinSeam, splitSeam, boxMates, hangersOn } from "./model/carcassGroups";
import {
  editSheet,
  setColWidth,
  setRowHeight,
  splitRow,
  setRowKind,
  addColumn,
  dropColumn,
  resizeSpan,
  resizeSpanLeft,
  equalizeSpan,
  lastFillColId,
  reconcileTalls,
  locate,
  rowIndex,
  rowEdges,
  ROW_MIN,
  type CellRef,
  type RowKind,
} from "./model/grid";
import { ensureSheet, rehangCorners, openCells, inSheet, type Grids } from "./model/sheet";
import { completeCornerL, reanchorAfterCorner } from "./model/cornerEdit";
import { GEOM } from "./model/layout";

const PLINTH = GEOM.plinth;
const WORKTOP = GEOM.worktop;

/** The kitchen's default finish — a warm light oak. The initial run wears it, and so does a
 *  from-scratch start, so a blank kitchen isn't a colourless one. */
const DEFAULT_RUN_STYLE: KitchenStyle = { carcass: 0xefe8da, facade: 0xe7ddc9, worktop: 0x7c756b, handle: 0x6f6a62, glassUppers: false };
import { planRuns, candidateLayouts, cornerUnits, cornerSideFor, interiorWallCabs, DEFAULT_REVEAL, type KitchenLayout } from "./model/runPlan";
import { roomOutlineMm, defaultOpenings, defaultOpeningHeight, fittingKind, wallSegments, interiorSegRef, polygonBoundsMm, type Pt, type Opening, type OpeningKind, type Fitting, type FittingCategory } from "./model/room";
import { defaultSurface, splitLeaf, colorLeaf, type Surface, type SurfPath } from "./model/walls";
import { PERSIST_KEYS, loadProjectState, upsertProject, deleteProject, updateProjectMeta, newProjectId, allProjects, replaceAllProjects, type DesignState } from "./model/projects";
import { runExport } from "./lib/handoffExport";
import { loadSettings, saveSettings, type Settings } from "./model/settings";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { pullProfile, pushProfile, pullProjects, pushProject, deleteProjectCloud, pullSavedCabs, pushSavedCab, deleteSavedCabCloud } from "./lib/sync";
import { addSavedCab, removeSavedCab as removeSavedCabLS, stripCab, allSavedCabs, replaceAllSavedCabs } from "./model/savedCabs";
import { captureCabinetThumbnail } from "./lib/cabThumb";
import { captureThumbnail } from "./lib/thumbnailCapture";
import { QUIZ } from "./quiz/questions";

const snap100 = (v: number) => Math.round(v / 100) * 100;
let fittingSeq = 0;
let openingSeq = 0;

interface RoomSnapshot {
  shape: "i" | "l";
  roomPoints: Pt[];
  openings: Opening[];
  interiorWalls: Pt[][];
  fittings: Fitting[];
}
const snapshot = (s: RoomSnapshot): RoomSnapshot => ({
  shape: s.shape,
  roomPoints: s.roomPoints,
  openings: s.openings,
  interiorWalls: s.interiorWalls,
  fittings: s.fittings,
});

// Faza 3a: constructor (App-2) store helpers moved to app2/storeHelpers.ts
// NB: the store imports App-2's slice DIRECTLY, not via the app2/ barrel. The barrel
// also re-exports the editor UI (which imports `useStore` back), so routing the state
// root through it would (a) form a store→UI→store cycle and (b) eager-load the whole
// App-2 UI (incl. Three.js) on every screen that touches the store. The barrel is the
// door for UI consumers (ConfigScreen); the store wires the slice at its source.
import type { CabSnap, CabHistState } from "./app2/storeHelpers";
// Faza 3b: constructor (App-2) action slice — grows batch by batch
import { createConstructorSlice } from "./app2/constructorSlice";
// Qadam 4 (ko'prik): App-2 OWNS its 58 action signatures — AppState includes them via
// `extends ConstructorActions` instead of declaring them inline. app2/ imports nothing from here.
import type { ConstructorActions } from "./app2/port";

// Faza 3a: remapCabRuns moved to app2/storeHelpers.ts


export type Screen =
  | "home"
  | "projects"
  | "settings"
  | "user"
  | "auth"
  | "quiz"
  | "space"
  | "details"
  | "variants"
  | "configure"
  | "preview"
  | "engineering"
  | "cost"
  | "handoff";

// ROOM FIRST. The quiz used to sit here as a hard gate — four questions, one of them ("what shape
// is your kitchen?") asked BEFORE the user had drawn a single wall, when the room itself answers
// most of it (see runPlan.candidateLayouts). For a seller redrawing a room per client that's four
// abstract questions they must answer before seeing anything.
//
// The questions still exist and still drive the generator; they now live on the VARIANTS screen as
// a «Параметры» sheet, where each choice is made while looking at the kitchen it changes. Unanswered
// ones fall back to sensible defaults, which `generateVariants` has always had.
export const FLOW: Screen[] = [
  // "space" (the standalone shape picker) was retired: a new project opens straight on the room
  // editor, which carries the same shape choice inline. The Screen type keeps "space" for legacy
  // saved projects — openProject coerces any that resume onto it (it's no longer in FLOW).
  "details",
  "variants",
  "configure",
  "preview", // «Рендер» — the payoff step. Always in the flow now; only the AI inside it is held.
  "engineering",
  "cost",
  "handoff",
];

/** Screens OUTSIDE the design journey — a project must never be saved with one of these as
 *  its resume point (otherwise reopening it can't find the design and falls back to onboarding). */
const MENU_SCREENS: Screen[] = ["home", "projects", "settings", "user", "auth"];
/** A sensible design screen to resume at, from the design's content (used when the saved
 *  screen is missing / a menu screen). Furthest sensible point given how far they got. */
function resumeScreen(state: Partial<AppState>): Screen {
  if (state.cabs && state.cabs.length > 0) return "configure"; // committed a layout
  if (state.genVariants && state.genVariants.length > 0) return "variants";
  return "details"; // nothing designed yet → start where a design starts: the room editor
}

/** Hardware grade picked in the Инженерия step (фаза Г). */
export type HwGrade = "eco" | "std" | "premium";

/** The signed-in user (Supabase auth). Null when signed out / auth disabled. */
export interface AuthUser {
  id: string;
  email: string;
}

/** RU labels for the hardware grade — shared by the Инженерия + Передача screens. */
export const HW_GRADE_LABEL: Record<HwGrade, string> = {
  eco: "Эконом",
  std: "Стандарт",
  premium: "Премиум",
};

export interface AppState extends ConstructorActions {
  // journey
  screen: Screen;
  qi: number;
  /** selected option(s) per quiz question (multi-select where the question allows) */
  quiz: Record<string, string[]>;
  /** true when a quiz question was opened from the summary to be changed */
  editing: boolean;
  // space (Phase A.2)
  shape: "i" | "l";
  /** the editable room outline (mm); seeded from `shape`, then freely edited */
  roomPoints: Pt[];
  openings: Opening[];
  /** free-drawn interior wall polylines (mm) */
  interiorWalls: Pt[][];
  /** wall fittings — sockets/switches, radiators, vents — placed on walls */
  fittings: Fitting[];
  /** per-wall paint surface (split tree); missing wall = unpainted */
  wallSurfaces: Record<number, Surface>;
  past: RoomSnapshot[];
  future: RoomSnapshot[];
  wallLen: number;
  ceiling: number;
  /** FILLER GAP (mm) reserved at each run end that butts a wall, and under the ceiling on a
   *  floor-to-ceiling run — the scribe «добор». 0 = cabinets go wall-to-wall. See model/runPlan. */
  reveal: number;
  water: "left" | "center" | "right" | "none";
  /** wall index the water supply comes from (drives dishwasher placement), null = unset */
  waterWall: number | null;
  constraints: string[];
  // room metadata
  roomName: string;
  roomType: string;
  floorCovering: number;
  // transient UI toast
  toast: string | null;
  // navbar hamburger drawer
  menuOpen: boolean;
  // Настройки popup — an overlay (not a screen) so it opens over any journey step
  // without unmounting the work in progress
  settingsOpen: boolean;
  // set when the variants "add water?" prompt sends the user to the room to place it →
  // RoomScene opens its water-picker on entry
  pendingWater: boolean;
  // persistence — the project this session is editing + a bump to refresh lists
  currentProjectId: string | null;
  projectsRev: number;
  // "My cabinets" reusable library — a bump to refresh the saved-cabinet list
  savedCabsRev: number;
  // global user/app settings (profile · company · preferences), Supabase-ready
  settings: Settings;
  // auth (Supabase). authReady = session checked; authUser = null when signed out.
  // The app is GUEST-FIRST: no login wall at launch — sign in from the menu / the nudge.
  authReady: boolean;
  authUser: AuthUser | null;
  recovery: boolean; // in a password-recovery session (opened from the reset email)
  authReturn: Screen; // where the auth screen returns to on close
  loginNudge: boolean; // one-time soft "sign in to sync" prompt after the first project
  // cloud sync status (for the subtle indicator): in-flight writes + last-write-failed
  syncBusy: number;
  syncError: boolean;
  // run
  variant: number;
  /** Phase-B generated layouts (empty until "Сгенерировать раскладки" runs). */
  genVariants: GenVariant[];
  cabs: Cabinet[];
  cabsFrom: number;
  /** A library component ARMED for drag-drop placement: the next tap on a 3D cell binds it there
   *  (DB_37 §4 / 37_MIN §295). null → nothing armed. Transient UI state, never persisted. */
  armedComponent: ComponentRef | null;
  armComponent: (ref: ComponentRef) => void;
  disarmComponent: () => void;
  selIdx: number;
  /** THE SELECTION (3D). A set of module ids — there is no separate "multi" mode: a tap toggles a
   *  module in/out, one selected reads as a single edit, several as a batch. `selIdx` tracks the
   *  PRIMARY (last-tapped) member for single-value readouts. */
  selIds: string[];
  /** EACH WALL'S SPREADSHEET — its column track and row track (model/grid.ts).
   *
   *  This, not `cabs`, is now what the front view and the 3D draw their cells from. It exists for a
   *  wall with nothing on it: an empty room already has columns and rows you can drag and fill.
   *  A module's x / w / h / mountY are PROJECTED out of it, which is why two of them can no longer
   *  overlap — they have no positions of their own to collide with. */
  grids: Grids;
  /** constructor edit history (cabs + grids + finish), separate from the room geometry undo */
  cabsPast: CabSnap[];
  cabsFuture: CabSnap[];
  /** layout + finish committed from the chosen variant (drives the constructor 3D) */
  runLayout: KitchenLayout;
  runStyle: KitchenStyle;
  /** project material variables (§3): board material per role slot (A·facade / B·carcass / C·back / W·worktop).
   *  Additive to runStyle — the SKU id; colour/price/thickness/density resolve from the catalog. */
  runMaterials: MaterialSlots;
  // configure view / materials
  view: "front" | "open" | "top";
  mat: number;
  mode: "real" | "xray" | "wire" | "application";
  // engineering / cost / handoff
  xray: boolean;
  hardened: boolean;
  hwGrade: HwGrade;
  recFixed: boolean;
  adviceApplied: boolean;
  exported: boolean;

  // actions — quiz
  pickQuiz: (id: string, v: string) => void;
  // actions — nav
  next: () => void;
  back: () => void;
  goTo: (s: Screen) => void;
  requestWater: () => void; // go to the room + auto-open the water picker
  clearPendingWater: () => void;
  // actions — space
  setShape: (v: "i" | "l") => void;
  setWater: (v: AppState["water"]) => void;
  toggleConstraint: (c: string) => void;
  setWall: (d: number) => void;
  setCeiling: (d: number) => void;
  /** Set the filler «добор» width (mm, absolute), clamped [0,120]. 0 removes the fillers. Rebuilds
   *  the wall sheets so the reserved dead zones move with it. */
  setReveal: (mm: number) => void;
  setRoomName: (v: string) => void;
  setRoomType: (v: string) => void;
  setFloorCovering: (i: number) => void;
  setHardened: (v: boolean) => void;
  setHwGrade: (v: HwGrade) => void;
  // room polygon editing
  beginEdit: () => void; // snapshot before a drag/edit gesture (for undo)
  undo: () => void;
  redo: () => void;
  moveCorner: (i: number, x: number, y: number) => void;
  setWallEndpoints: (i: number, a: Pt, b: Pt) => void;
  setWallLength: (i: number, length: number, endpoint: "a" | "b") => void;
  moveOpening: (id: string, t: number) => void;
  dragOpeningTo: (id: string, x: number, y: number) => void; // hop to the nearest wall
  setOpeningWidth: (id: string, width: number) => void;
  setOpeningHeight: (id: string, height: number) => void;
  setOpeningSill: (id: string, sill: number) => void;
  setOpeningFinish: (id: string, finish: string) => void;
  addOpening: (item: OpeningKind, wall?: number) => string;
  removeOpening: (id: string) => void;
  duplicateOpening: (id: string) => string | null;
  replaceOpening: (id: string, item: OpeningKind) => void;
  flipOpening: (id: string) => void;
  addInteriorWall: (poly: Pt[]) => void;
  moveInteriorPoint: (wi: number, pi: number, x: number, y: number) => void;
  /** resize a drawn-wall segment (global segment index) to `length`, moving its far endpoint */
  setInteriorWallLength: (globalSeg: number, length: number) => void;
  // wall paint / surfaces
  setWallColor: (wall: number, c: number) => void; // whole wall → one colour
  setAllWallsColor: (c: number) => void;
  splitWallSurface: (wall: number, path: SurfPath, dir: "h" | "v") => void;
  colorWallSurface: (wall: number, path: SurfPath, c: number) => void;
  // wall fittings (electric / heating / vent)
  addFitting: (category: FittingCategory, kind: string, wall?: number) => string;
  dragFittingTo: (id: string, x: number, y: number) => void; // slide along / hop to nearest wall
  moveFitting: (id: string, t: number) => void; // slide along its current wall
  setFittingWidth: (id: string, width: number) => void;
  setFittingHeight: (id: string, height: number) => void;
  dragFitting3D: (id: string, x: number, y: number, heightMm: number) => void; // 3D: nearest wall + along + height
  removeFitting: (id: string) => void;
  duplicateFitting: (id: string) => string | null;
  replaceFitting: (id: string, category: FittingCategory, kind: string) => void;
  // water supply
  setWaterWall: (i: number | null) => void;
  // phase B — variant generation
  generateVariants: () => void;
  selectVariant: (i: number) => void;
  /** START FROM SCRATCH — skip the generated options and open the constructor on a BARE room: no
   *  cabinets, just the empty grid on every wall, ready to fill. For the seller who is going to
   *  rebuild the auto-layout anyway (which is most of them). The room still decides the run shape;
   *  only the furniture is empty. */
  startBlank: () => void;
  // Qadam 4 (ko'prik): the 58 constructor (App-2) actions are declared in app2/port.ts as
  // `ConstructorActions`, which this interface `extends`. App-2 owns its action contract; the
  // store fulfils it. (Full list — selectCab … setMode — see app2/port.ts.)
  flash: (msg: string) => void;
  clearToast: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  // projects — saveCurrent persists the design; withThumb=true ALSO (re)captures the
  // project card image (only done once per constructor entry, not on every auto-save)
  saveCurrent: (withThumb?: boolean) => void;
  openProject: (id: string) => void;
  newProject: () => void;
  removeProject: (id: string) => void;
  renameProject: (id: string, patch: { name?: string; client?: string }) => void;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  // auth
  openAuth: () => void; // open the login/registration screen (remembers where to return)
  closeAuth: () => void;
  dismissNudge: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

// The default design slice — shared by the store's initial state and `newProject`
// (everything `newProject` should reset; transient UI + project id live outside).
function freshDesign() {
  return {
    screen: "details" as Screen, // a new project opens on the ROOM EDITOR, not a shape picker
    qi: 0,
    quiz: {} as Record<string, string[]>,
    editing: false,
    shape: "i" as "i" | "l",
    roomPoints: roomOutlineMm("i"),
    openings: defaultOpenings(roomOutlineMm("i")),
    interiorWalls: [] as Pt[][],
    fittings: [] as Fitting[],
    wallSurfaces: {} as Record<number, Surface>,
    past: [] as RoomSnapshot[],
    future: [] as RoomSnapshot[],
    wallLen: 2400,
    ceiling: 2700,
    reveal: DEFAULT_REVEAL,
    water: "left" as AppState["water"],
    waterWall: null as number | null,
    constraints: [] as string[],
    roomName: "Kitchen",
    roomType: "Кухня",
    floorCovering: 0,
    variant: 0,
    genVariants: [] as GenVariant[],
    cabs: [] as Cabinet[],
    cabsFrom: -1,
    armedComponent: null as ComponentRef | null,
    selIdx: -1,
    selIds: [] as string[],
    grids: {} as Grids, // built on first sight of a wall (sheet.ensureSheet)
    cabsPast: [] as CabSnap[],
    cabsFuture: [] as CabSnap[],
    runLayout: "i" as KitchenLayout,
    runStyle: DEFAULT_RUN_STYLE,
    runMaterials: defaultMaterialSlots(),
    view: "front" as AppState["view"],
    mat: 0,
    mode: "real" as AppState["mode"],
    xray: true,
    hardened: false,
    hwGrade: "std" as HwGrade,
    recFixed: false,
    adviceApplied: false,
    exported: false,
  };
}

let profileTimer: ReturnType<typeof setTimeout> | undefined; // debounces the profile cloud push

// one-time soft login nudge (shown once after a guest saves their first project)
const NUDGE_KEY = "mebelchi.nudged.v1";
const nudged = () => { try { return !!localStorage.getItem(NUDGE_KEY); } catch { return true; } };

// Track a cloud write for the sync indicator: bump busy, then clear + flip error on result.
function trackSync(p: Promise<unknown>): void {
  useStore.setState((s) => ({ syncBusy: s.syncBusy + 1 }));
  const done = (error: boolean) =>
    useStore.setState((s) => ({ syncBusy: Math.max(0, s.syncBusy - 1), syncError: error }));
  p.then(() => done(false), () => done(true));
}

export const useStore = create<AppState>((set, get) => ({
  ...freshDesign(),
  toast: null,
  // an editing MODE, not part of the design — never persisted, off at the start of every session
  menuOpen: false,
  settingsOpen: false,
  pendingWater: false,
  currentProjectId: null,
  projectsRev: 0,
  savedCabsRev: 0,
  settings: loadSettings(),
  // if Supabase isn't configured, auth is skipped (app runs on localStorage)
  authReady: !isSupabaseConfigured,
  authUser: null,
  recovery: false,
  authReturn: "home",
  loginNudge: false,
  syncBusy: 0,
  syncError: false,
  screen: "home", // guest-first: launch on the home hub (freshDesign's "quiz" is for New project)

  pickQuiz: (id, v) =>
    set((s) => {
      if (id === "layout") {
        // multi-select kitchen layout; the variants explore each chosen layout.
        // Room shape stays a rectangle unless the ONLY choice is L (then an
        // L-shaped room); a rectangle hosts every layout (incl. an L-run).
        const cur = s.quiz.layout ?? [];
        const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
        const sel = next.length ? next : [v];
        const shape: "i" | "l" = sel.length === 1 && sel[0] === "l" ? "l" : "i";
        const roomChanged = shape !== s.shape;
        return {
          quiz: { ...s.quiz, layout: sel },
          ...(roomChanged
            ? {
                shape,
                roomPoints: roomOutlineMm(shape),
                openings: defaultOpenings(roomOutlineMm(shape)),
                interiorWalls: [],
                fittings: [],
                wallSurfaces: {},
                waterWall: null,
                past: [],
                future: [],
              }
            : {}),
        };
      }
      const multi = QUIZ.find((q) => q.id === id)?.multi;
      const cur = s.quiz[id] ?? [];
      if (multi) {
        const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
        return { quiz: { ...s.quiz, [id]: next } };
      }
      return { quiz: { ...s.quiz, [id]: [v] } };
    }),

  next: () => {
    const s = get();
    switch (s.screen) {
      case "details":
        set({ screen: "variants" });
        break;
      case "variants": {
        const chosen = s.genVariants[s.variant];
        if (!chosen) return; // nothing generated yet — CTA is disabled anyway
        // commit the chosen layout + finish to the editable run on the way into the
        // constructor; re-commit only when the selection changed so edits survive
        if (s.cabsFrom !== s.variant) {
          // Commit the variant EXACTLY as solved — same layout, same run indices, so nothing re-anchors
          // or shifts on the way in. (An earlier remap to an "all-walls" shape is what moved cabinets.)
          set({ cabs: chosen.cabs.map((c) => ({ ...c })), cabsFrom: s.variant, selIdx: 0, runLayout: chosen.layout, runStyle: chosen.style, cabsPast: [], cabsFuture: [] });
        }
        set({ screen: "configure" });
        break;
      }
      case "configure":
        set({ screen: "preview" }); // → «Рендер»
        break;
      case "preview":
        set({ screen: "engineering" });
        break;
      case "engineering":
        // skip the Смета step entirely when the seller has pricing turned off
        set({ screen: s.settings.showPricing ? "cost" : "handoff" });
        break;
      case "cost":
        set({ screen: "handoff" });
        break;
      case "handoff":
        // actually run the export/share (send SWJ008 + DXF + CSV to production) — not just
        // flip a flag. Re-runnable, so a second tap shares again instead of doing nothing.
        runExport();
        if (!s.exported) set({ exported: true });
        break;
    }
  },

  back: () => {
    const s = get();
    // the Смета step drops out of the journey when pricing is off — so "back" from Передача
    // returns to Инженерия, not an unreachable price screen
    const flow = FLOW.filter((sc) => sc !== "cost" || s.settings.showPricing);
    const i = flow.indexOf(s.screen);
    if (i > 0) set({ screen: flow[i - 1] });
    // the room editor is the FIRST journey step now (the shape picker is gone) — so its ← has no
    // previous step; leave to the home hub instead of being a dead button. goTo saves on the way out.
    else if (i === 0) get().goTo("home");
  },

  goTo: (screen) => {
    const s = get();
    const toList = screen === "home" || screen === "projects";
    const fromMenu = s.screen === "home" || s.screen === "projects" || s.screen === "settings" || s.screen === "auth";
    const hasContent = s.cabs.length > 0 || Object.keys(s.quiz).length > 0;
    // leaving a design screen for the project list → flush a save NOW, while the 3D scene
    // is still mounted, so the card gets a freshly captured thumbnail (the debounced
    // auto-save would otherwise fire 30s later, after the scene is gone). Bump projectsRev
    // so the list re-reads the new thumbnail.
    if (toList && !fromMenu && hasContent) {
      s.saveCurrent();
      set((st) => ({ screen, projectsRev: st.projectsRev + 1 }));
    } else {
      set({ screen });
    }
  },
  armComponent: (ref) => set({ armedComponent: ref }),
  disarmComponent: () => set({ armedComponent: null }),
  requestWater: () => set({ pendingWater: true, screen: "details" }),
  clearPendingWater: () => set({ pendingWater: false }),

  setShape: (shape) =>
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      shape,
      roomPoints: roomOutlineMm(shape),
      openings: defaultOpenings(roomOutlineMm(shape)),
      interiorWalls: [],
      fittings: [],
      wallSurfaces: {},
      waterWall: null,
    })),
  setWater: (water) => set({ water }),
  toggleConstraint: (c) =>
    set((s) => ({
      constraints: s.constraints.includes(c)
        ? s.constraints.filter((x) => x !== c)
        : [...s.constraints, c],
    })),
  setWall: (d) =>
    set((s) => ({ wallLen: Math.min(4000, Math.max(1200, s.wallLen + d)) })),
  setCeiling: (d) =>
    set((s) => ({ ceiling: Math.min(3300, Math.max(2400, s.ceiling + d)) })),
  // clear the sheets so the reserved dead zones (which now include the reveal) rebuild against the
  // new width; the 3D/front views re-read `reveal` from the room and redraw the panels.
  setReveal: (mm) => set({ reveal: Math.max(0, Math.min(120, Math.round(mm))), grids: {} }),
  setRoomName: (roomName) => set({ roomName }),
  setRoomType: (roomType) => set({ roomType }),
  setFloorCovering: (floorCovering) => set({ floorCovering }),
  setHardened: (hardened) => set({ hardened }),
  setHwGrade: (hwGrade) => set({ hwGrade }),

  // snapshot the room before a continuous gesture so it's one undo step
  beginEdit: () => set((s) => ({ past: [...s.past.slice(-49), snapshot(s)], future: [] })),
  undo: () =>
    set((s) => {
      if (!s.past.length) return {};
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), future: [...s.future, snapshot(s)], ...prev };
    }),
  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const nxt = s.future[s.future.length - 1];
      return { future: s.future.slice(0, -1), past: [...s.past, snapshot(s)], ...nxt };
    }),

  moveCorner: (i, x, y) =>
    set((s) => {
      const p = s.roomPoints.slice();
      p[i] = { x: snap100(x), y: snap100(y) };
      return { roomPoints: p };
    }),

  // move a whole wall (both endpoints) — used for edge dragging
  setWallEndpoints: (i, a, b) =>
    set((s) => {
      const n = s.roomPoints.length;
      const p = s.roomPoints.slice();
      p[i] = { x: snap100(a.x), y: snap100(a.y) };
      p[(i + 1) % n] = { x: snap100(b.x), y: snap100(b.y) };
      return { roomPoints: p };
    }),

  // resize wall `i` (points[i]→points[i+1]) to `length`, moving endpoint a or b
  setWallLength: (i, length, endpoint) =>
    set((s) => {
      const n = s.roomPoints.length;
      const a = s.roomPoints[i];
      const b = s.roomPoints[(i + 1) % n];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const p = s.roomPoints.slice();
      if (endpoint === "b") {
        p[(i + 1) % n] = { x: snap100(a.x + ux * length), y: snap100(a.y + uy * length) };
      } else {
        p[i] = { x: snap100(b.x - ux * length), y: snap100(b.y - uy * length) };
      }
      return { roomPoints: p }; // history handled by the caller (beginEdit)
    }),

  // slide an opening along its wall segment (clamped so it stays on the wall)
  moveOpening: (id, t) =>
    set((s) => {
      const op = s.openings.find((o) => o.id === id);
      if (!op) return {};
      const seg = wallSegments(s.roomPoints, s.interiorWalls)[op.wall];
      if (!seg) return {};
      const wl = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1;
      const margin = (op.width / 2 + 60) / wl;
      const ct = Math.max(margin, Math.min(1 - margin, t));
      return { openings: s.openings.map((o) => (o.id === id ? { ...o, t: ct } : o)) };
    }),

  // drag an opening to whichever wall segment (room or drawn) is nearest, clamped onto it
  dragOpeningTo: (id, x, y) =>
    set((s) => {
      const op = s.openings.find((o) => o.id === id);
      if (!op) return {};
      const segs = wallSegments(s.roomPoints, s.interiorWalls);
      let best = { wall: op.wall, t: 0.5, d: Infinity };
      for (let i = 0; i < segs.length; i++) {
        const { a, b } = segs[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l2 = dx * dx + dy * dy;
        if (l2 < 1) continue; // ignore degenerate (e.g. loop-closing) segments
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
        const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
        if (d < best.d) best = { wall: i, t, d };
      }
      const seg = segs[best.wall];
      const wl = seg ? Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1 : 1;
      const margin = (op.width / 2 + 60) / wl;
      const ct = Math.max(margin, Math.min(1 - margin, best.t));
      return { openings: s.openings.map((o) => (o.id === id ? { ...o, wall: best.wall, t: ct } : o)) };
    }),

  setOpeningWidth: (id, width) =>
    set((s) => {
      const op = s.openings.find((o) => o.id === id);
      if (!op) return {};
      const seg = wallSegments(s.roomPoints, s.interiorWalls)[op.wall];
      const wl = seg ? Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1 : 4000;
      const w = Math.max(300, Math.min(wl - 200, snap100(width)));
      return { openings: s.openings.map((o) => (o.id === id ? { ...o, width: w } : o)) };
    }),
  setOpeningHeight: (id, height) =>
    set((s) => ({
      openings: s.openings.map((o) => (o.id === id ? { ...o, height: Math.max(300, Math.min(3000, snap100(height))) } : o)),
    })),
  // window sill — bottom above floor (mm), clamped to leave room under the ceiling
  setOpeningSill: (id, sill) =>
    set((s) => ({
      openings: s.openings.map((o) => (o.id === id ? { ...o, sill: Math.max(0, Math.min(s.ceiling - 300, snap100(sill))) } : o)),
    })),
  // window-frame / door-leaf finish (colour or wood) — see OPENING_FINISHES
  setOpeningFinish: (id, finish) =>
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      openings: s.openings.map((o) => (o.id === id ? { ...o, finish } : o)),
    })),
  // add a window / door / wall-opening from a catalog; seeds on the longest wall
  addOpening: (item, wall) => {
    const id = `o${++openingSeq}`;
    set((s) => {
      const n = s.roomPoints.length;
      let w = wall ?? 0;
      if (wall == null) {
        let best = -1;
        for (let i = 0; i < n; i++) {
          const a = s.roomPoints[i];
          const b = s.roomPoints[(i + 1) % n];
          const l = Math.hypot(b.x - a.x, b.y - a.y);
          if (l > best) {
            best = l;
            w = i;
          }
        }
      }
      const op: Opening = { id, wall: Math.min(w, n - 1), kind: item.kind, t: 0.5, width: item.width, height: item.height ?? defaultOpeningHeight(item.kind), design: item.design, name: item.name, desc: item.desc };
      return { past: [...s.past.slice(-49), snapshot(s)], future: [], openings: [...s.openings, op] };
    });
    return id;
  },
  removeOpening: (id) =>
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      openings: s.openings.filter((o) => o.id !== id),
    })),
  duplicateOpening: (id) => {
    const src = get().openings.find((o) => o.id === id);
    if (!src) return null;
    const nid = `o${++openingSeq}`;
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      openings: [...s.openings, { ...src, id: nid, t: Math.min(0.9, src.t + 0.12) }],
    }));
    return nid;
  },
  replaceOpening: (id, item) =>
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      openings: s.openings.map((o) =>
        o.id === id ? { ...o, kind: item.kind, width: item.width, height: item.height ?? defaultOpeningHeight(item.kind), design: item.design, name: item.name, desc: item.desc } : o,
      ),
    })),
  flipOpening: (id) =>
    set((s) => ({ openings: s.openings.map((o) => (o.id === id ? { ...o, flip: !o.flip } : o)) })),

  addInteriorWall: (poly) =>
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      interiorWalls: [...s.interiorWalls, poly.map((p) => ({ x: snap100(p.x), y: snap100(p.y) }))],
    })),
  moveInteriorPoint: (wi, pi, x, y) =>
    set((s) => ({
      interiorWalls: s.interiorWalls.map((w, i) =>
        i === wi ? w.map((p, j) => (j === pi ? { x: snap100(x), y: snap100(y) } : p)) : w,
      ),
    })),
  // resize a drawn segment by moving its far endpoint along the segment direction
  setInteriorWallLength: (globalSeg, length) =>
    set((s) => {
      const ref = interiorSegRef(s.roomPoints, s.interiorWalls, globalSeg);
      if (!ref) return {};
      const poly = s.interiorWalls[ref.wall];
      const a = poly[ref.seg];
      const b = poly[ref.seg + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nb = { x: snap100(a.x + ((b.x - a.x) / len) * length), y: snap100(a.y + ((b.y - a.y) / len) * length) };
      return {
        interiorWalls: s.interiorWalls.map((w, i) => (i === ref.wall ? w.map((p, j) => (j === ref.seg + 1 ? nb : p)) : w)),
      }; // history handled by the caller (beginEdit)
    }),

  // ---- wall paint / surfaces ----
  setWallColor: (wall, c) => set((s) => ({ wallSurfaces: { ...s.wallSurfaces, [wall]: { t: "leaf", c } } })),
  setAllWallsColor: (c) =>
    set((s) => {
      const next: Record<number, Surface> = {};
      for (let i = 0; i < s.roomPoints.length; i++) next[i] = { t: "leaf", c };
      return { wallSurfaces: next };
    }),
  splitWallSurface: (wall, path, dir) =>
    set((s) => ({ wallSurfaces: { ...s.wallSurfaces, [wall]: splitLeaf(s.wallSurfaces[wall] ?? defaultSurface(), path, dir) } })),
  colorWallSurface: (wall, path, c) =>
    set((s) => ({ wallSurfaces: { ...s.wallSurfaces, [wall]: colorLeaf(s.wallSurfaces[wall] ?? defaultSurface(), path, c) } })),

  // ---- wall fittings (electric / heating / vent) ----
  addFitting: (category, kind, wall = 0) => {
    const k = fittingKind(category, kind);
    const id = `f${++fittingSeq}`;
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      fittings: [...s.fittings, { id, category, wall: Math.min(wall, s.roomPoints.length - 1), t: 0.5, width: k?.width ?? 120, kind }],
    }));
    return id;
  },
  // slide along (or hop to) whichever wall segment (room or drawn) is nearest
  dragFittingTo: (id, x, y) =>
    set((s) => {
      const it = s.fittings.find((e) => e.id === id);
      if (!it) return {};
      const segs = wallSegments(s.roomPoints, s.interiorWalls);
      let best = { wall: it.wall, t: 0.5, d: Infinity };
      for (let i = 0; i < segs.length; i++) {
        const { a, b } = segs[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l2 = dx * dx + dy * dy;
        if (l2 < 1) continue;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
        const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
        if (d < best.d) best = { wall: i, t, d };
      }
      const seg = segs[best.wall];
      const wl = seg ? Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1 : 1;
      const margin = (it.width / 2 + 40) / wl;
      const ct = Math.max(margin, Math.min(1 - margin, best.t));
      return { fittings: s.fittings.map((e) => (e.id === id ? { ...e, wall: best.wall, t: ct } : e)) };
    }),
  // slide a fitting along its current wall segment (clamped)
  moveFitting: (id, t) =>
    set((s) => {
      const it = s.fittings.find((e) => e.id === id);
      if (!it) return {};
      const seg = wallSegments(s.roomPoints, s.interiorWalls)[it.wall];
      if (!seg) return {};
      const wl = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1;
      const margin = (it.width / 2 + 40) / wl;
      const ct = Math.max(margin, Math.min(1 - margin, t));
      return { fittings: s.fittings.map((e) => (e.id === id ? { ...e, t: ct } : e)) };
    }),
  setFittingWidth: (id, width) =>
    set((s) => {
      const it = s.fittings.find((e) => e.id === id);
      if (!it) return {};
      const seg = wallSegments(s.roomPoints, s.interiorWalls)[it.wall];
      const wl = seg ? Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1 : 4000;
      const w = Math.max(60, Math.min(wl - 200, snap100(width)));
      return { fittings: s.fittings.map((e) => (e.id === id ? { ...e, width: w } : e)) };
    }),
  setFittingHeight: (id, height) =>
    set((s) => ({
      fittings: s.fittings.map((e) => (e.id === id ? { ...e, height: Math.max(40, Math.min(2600, snap100(height))) } : e)),
    })),
  // 3D drag: hop to whichever wall segment is nearest (x,y in mm), set along + height
  dragFitting3D: (id, x, y, heightMm) =>
    set((s) => {
      const it = s.fittings.find((e) => e.id === id);
      if (!it) return {};
      const segs = wallSegments(s.roomPoints, s.interiorWalls);
      let best = { wall: it.wall, t: 0.5, d: Infinity };
      for (let i = 0; i < segs.length; i++) {
        const { a, b } = segs[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l2 = dx * dx + dy * dy;
        if (l2 < 1) continue;
        const tt = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
        const dd = Math.hypot(x - (a.x + dx * tt), y - (a.y + dy * tt));
        if (dd < best.d) best = { wall: i, t: tt, d: dd };
      }
      const seg = segs[best.wall];
      const wl = seg ? Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) || 1 : 1;
      const margin = (it.width / 2 + 40) / wl;
      const ct = Math.max(margin, Math.min(1 - margin, best.t));
      const mountY = Math.max(80, Math.min(3200, Math.round(heightMm)));
      return { fittings: s.fittings.map((e) => (e.id === id ? { ...e, wall: best.wall, t: ct, mountY } : e)) };
    }),
  removeFitting: (id) =>
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      fittings: s.fittings.filter((e) => e.id !== id),
    })),
  duplicateFitting: (id) => {
    const src = get().fittings.find((e) => e.id === id);
    if (!src) return null;
    const nid = `f${++fittingSeq}`;
    set((s) => ({
      past: [...s.past.slice(-49), snapshot(s)],
      future: [],
      fittings: [...s.fittings, { ...src, id: nid, t: Math.min(0.9, src.t + 0.12) }],
    }));
    return nid;
  },
  replaceFitting: (id, category, kind) =>
    set((s) => {
      const k = fittingKind(category, kind);
      return {
        past: [...s.past.slice(-49), snapshot(s)],
        future: [],
        fittings: s.fittings.map((e) => (e.id === id ? { ...e, category, kind, width: k?.width ?? e.width } : e)),
      };
    }),

  // ---- water supply: pick the wall it enters from; also derive the legacy
  // left/center/right marker so the plan + project stay consistent ----
  setWaterWall: (i) =>
    set((s) => {
      if (i == null) return { waterWall: null, water: "none" };
      const seg = wallSegments(s.roomPoints, s.interiorWalls)[i];
      if (!seg) return { waterWall: i, water: "center" };
      const mx = (seg.a.x + seg.b.x) / 2;
      const xs = s.roomPoints.map((p) => p.x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const f = (mx - minX) / (maxX - minX || 1);
      const water = f < 0.34 ? "left" : f > 0.66 ? "right" : "center";
      return { waterWall: i, water };
    }),

  // ---- phase B: generate the four layout variants from the current space ----
  // Geometry lives here (we have roomPoints/openings + helpers); the solver itself
  // is a pure function fed clean primitives. The water gate is enforced by the
  // screen before this runs, so `water` is always a real side by now.
  generateVariants: () =>
    set((s) => {
      const water: Zone = s.water === "none" ? "center" : s.water;
      // plan the runs for each SELECTED layout (the planner handles water-wall
      // priority, door avoidance, corners, island/peninsula); the solver spreads
      // these layouts across the variants
      const LAYOUTS = ["i", "galley", "l", "u", "peninsula"];
      const chosen = (s.quiz.layout ?? []).filter((v): v is KitchenLayout => LAYOUTS.includes(v));
      // No layout picked → ASK THE ROOM. The shape is mostly decided by the polygon the user drew
      // (you can't put a U in a corridor), and it used to fall back to a bare "i" regardless. Take
      // the two roomiest shapes that fit, so the variants span two real layouts instead of one.
      const fit = chosen.length ? chosen : candidateLayouts(s.roomPoints, s.waterWall, s.openings).slice(0, 2);
      const layouts = fit.map((lay) => {
        const { runs, waterRun } = planRuns(s.roomPoints, s.waterWall, lay, s.openings, undefined, s.reveal);
        return { layout: lay, runs: runs.map((r) => ({ kind: r.kind, len: r.len, cornerStart: r.cornerStart, cornerEnd: r.cornerEnd, openings: r.openings })), waterRun };
      });
      // the user's selected option SET per appliance dimension (multi-select → the
      // variants explore each choice); fall back to a sensible default when unanswered
      const sel = <T extends string>(id: string, map: (v: string) => T | null, fallback: T): T[] => {
        const vals = (s.quiz[id] ?? []).map(map).filter((x): x is T => x != null);
        return vals.length ? Array.from(new Set(vals)) : [fallback];
      };
      // Defaults for anything the user hasn't answered. They matter more than they used to: the
      // quiz is no longer a gate, so MOST kitchens are generated from these. They're set to what a
      // custom kitchen actually is — integrated fridge, oven in a tower — not to the cheapest box.
      const fridge = sel<FridgeType>("fridge", (v) => (v === "integ" ? "integ" : v === "free" ? "free" : null), "integ");
      const oven = sel<OvenType>("oven", (v) => (v === "tall" ? "tall" : v === "under" ? "under" : null), "tall");
      const hood = sel<HoodType>("hood", (v) => (v === "dome" ? "dome" : v === "integ" ? "integ" : null), "integ");
      // the wall band is an OVERRIDE, not a default: unpicked → each strategy keeps its own, so the
      // four variants show a standard wall, a full-height one and an antresol side by side
      const WALLS = ["single", "tall", "antresol", "antresolDeep"];
      const wall = (s.quiz.wall ?? []).filter((v): v is WallBand => WALLS.includes(v));
      // the front's body — same override rules as the wall band (unpicked → the strategies' own mix)
      const FRONTS = ["flat", "shaker", "raised", "fluted", "glass", "grid"];
      const front = (s.quiz.front ?? []).filter((v): v is FrontProfile => FRONTS.includes(v));
      const genVariants = solveVariants({
        layouts,
        ceiling: s.ceiling,
        reveal: s.reveal,
        water,
        hasGas: s.constraints.includes("Газовая труба"),
        fridge,
        oven,
        hood,
        wall,
        front,
      });
      // Inject a corner unit into every inside corner the runs cleared — an L has one, a U has two.
      //
      // ONE PER WALL BAND, not one in total. This used to add exactly one base + one upper corner
      // (hardcoded 840/613, `h: 720`, no mountY), so a kitchen with an antresol had a hole in its
      // corner on the top row. `gv.bands` is what the generator actually built, so the corners land
      // at the right height, height and DEPTH without re-deriving the banding here.
      //
      // The square follows the arm depth: a 350-deep wall row gets 613, a base-depth one gets 840.
      const withCorners = genVariants.map((gv) => {
        if (gv.layout !== "l" && gv.layout !== "u") return gv;
        const seatsFor = (side: number) => cornerUnits(s.roomPoints, s.waterWall, gv.layout, s.openings, side);
        const baseSide = cornerSideFor(FOOT_DEPTH_MM.base);
        const baseCorner = seatsFor(baseSide);
        if (!baseCorner.length) return gv;

        const corners: Cabinet[] = baseCorner.map((cs) =>
          mk({ kind: "base", corner: true, px: cs.px, pz: cs.pz, rot: cs.rot, w: cs.w, depth: cs.depth, armDepth: FOOT_DEPTH_MM.base, h: 720, fill: "shelves", count: 1, door: 0, handle: 0, run: 0 }),
        );
        for (const b of gv.bands) {
          for (const cs of seatsFor(cornerSideFor(b.depth))) {
            corners.push(
              mk({ kind: "upper", corner: true, px: cs.px, pz: cs.pz, rot: cs.rot, w: cs.w, depth: cs.depth, armDepth: b.depth, h: b.h, mountY: b.mountY, fill: "shelves", count: 1, door: 0, handle: 0, run: 0 }),
            );
          }
        }
        return { ...gv, cabs: [...gv.cabs, ...corners] };
      });
      // back a cabinet row against every wall the user DREW inside the room — placed free
      // (px/pz/rot) so it renders through the existing free-placement path; added to every
      // variant so a drawn wall is never ignored by the furniture generation
      const wallCabs = interiorWallCabs(s.roomPoints, s.interiorWalls);
      const withWalls = wallCabs.length
        ? withCorners.map((gv) => {
            // build the wall modules, then DROP any that clash with an existing same-layer
            // module (perimeter run / corner) or an already-accepted wall module — so a row
            // backed against a drawn wall never triggers the red overlap warning
            const objs = wallCabs.map((c) => mk({ kind: c.kind, px: c.px, pz: c.pz, rot: c.rot, w: c.w, depth: c.depth, h: 720, fill: "shelves", count: 2, door: 0, handle: 0 }));
            const foots = [...cabFootprints(gv.cabs, s.roomPoints, s.waterWall, gv.layout, s.openings, s.reveal)];
            const wallFoots = cabFootprints(objs, s.roomPoints, s.waterWall, gv.layout, s.openings, s.reveal);
            const keep: typeof objs = [];
            objs.forEach((cab, i) => {
              const f = wallFoots[i];
              if (f && !foots.some((o) => footsClash(o, f))) {
                keep.push(cab);
                foots.push(f);
              }
            });
            return { ...gv, cabs: [...gv.cabs, ...keep] };
          })
        : withCorners;
      // fresh layouts → force a re-commit on the way into the constructor
      return { genVariants: withWalls, variant: 0, cabsFrom: -1 };
    }),
  selectVariant: (i) => set({ variant: i }),
  startBlank: () =>
    set((s) => {
      // «С нуля» = build on any wall, in any shape, without being pre-committed to one. So it opens in
      // the "all" shape — EVERY wall is its own fillable run — instead of a fixed i/l/u picked before a
      // single cabinet is placed. Corner zones are DYNAMIC in "all": a wall stays fully fillable until
      // you drop a corner cabinet turning it, at which point that vertex's two walls reserve their
      // square (activeCorners). That is what lets you fill one wall, change the last unit to a corner,
      // and have the neighbouring wall's grid pick up from there — the "walk the walls" flow.
      return {
        cabs: [],
        grids: {}, // ensureSheet builds a fresh default grid per wall the moment the constructor opens
        // match next()'s "already committed this variant" guard, so stepping BACK to the options and
        // forward again doesn't silently overwrite the blank start with a generated layout
        cabsFrom: s.variant,
        selIdx: 0,
        runLayout: "all" as KitchenLayout,
        runStyle: DEFAULT_RUN_STYLE,
        runMaterials: defaultMaterialSlots(),
        cabsPast: [],
        cabsFuture: [],
        screen: "configure" as const,
      };
    }),

  // ---- phase C: constructor (per-module editing) ----
  ...createConstructorSlice(set, get),
  // Faza 3b: selection-ops (apply*/resizeSelected*) moved to app2/constructorSlice.ts
  // Faza 3b: dimSelected/equalizeSelected/patchCab(Live) moved to app2/constructorSlice.ts


  // ONE BOX, OR FOUR. A row of wall units can be built as four separate carcasses or as one long
  // one with shared stiles between the bays. The shop saves board, hangers, minifix, saw time and a
  // van slot; the client sees exactly the same fronts. Which of the two it is, is the seller's call
  // — so it is a toggle, not something the app decides for them.
  //
  // The tag is all this writes. What a merged box actually CUTS is pricing's business
  // (packages/pricing/src/carcass.ts), and the 3D, the cut list and the quote all read it from
  // there — so they cannot disagree about what the workshop is being sent.
  // Faza 3b: carcass merge/hangers → app2/constructorSlice.ts

  // Faza 3b: patchCabDims/applyFinishToAll/patchAllCabs → app2/constructorSlice.ts
  // Faza 3b: addCab → app2/constructorSlice.ts
  // Faza 3b: fillCabGap/saveCab/removeSavedCab/removeCab → app2/constructorSlice.ts
  // ── THE SHEET ────────────────────────────────────────────────────────────────────────────────
  // Every edit is: run a pure track op → hand it to editSheet → take the result, or take nothing.
  // editSheet re-anchors the modules, refuses anything that would put two of them in one cell, and
  // re-projects x/w/h/mountY from the new prefix sums. There is no "and then fix up the row"
  // step anywhere below, and there cannot be one: a refused edit returns {} and the sheet is
  // untouched. That is why the border stops instead of the cabinets piling up.
  // Faza 3b: grid ops (openSheet/ensureAllWalls/gridSetColW/gridAddCol/gridDropCol/gridFillReach) → app2/constructorSlice.ts
  // Faza 3b: corner units + rows (addCornerCab/placeCornerInBand/gridSetRowH/gridSplitRow/gridSetRowKind) → app2/constructorSlice.ts
  // Faza 3b: gridSetCabW/fillWallRow/addCabInCell/addCabInTopVoid → app2/constructorSlice.ts

  // Faza 3b: resizeCab(Live)/setBaseHeight(Live)/setRows(Live)/addCabAt → app2/constructorSlice.ts
  // Faza 3b: healRows, dockCab, moveCabsX, moveCabPlan, duplicateCab, replaceCab,
  //          setMat, beginCabEdit, undoCab, redoCab, setMode → app2/constructorSlice.ts
  flash: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  // settings is a popup overlay (keeps the current screen mounted) — close the menu on open
  openSettings: () => set({ settingsOpen: true, menuOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),

  // ---- projects (persisted to localStorage) ----
  saveCurrent: (withThumb = false) => {
    const s = get();
    let id = s.currentProjectId;
    const created = !id;
    if (!id) id = newProjectId();
    const design: DesignState = {};
    for (const k of PERSIST_KEYS) design[k] = (s as unknown as Record<string, unknown>)[k];
    // Never persist a menu screen (home/projects/…) as the project's resume point — the
    // 30s auto-save + leave-flush fire while on home, and reopening at "home" makes
    // openProject fall back to onboarding. Keep the last real design screen instead.
    if (MENU_SCREENS.includes(design.screen as Screen)) {
      const prev = loadProjectState(id) as Partial<AppState> | null;
      design.screen = prev?.screen && !MENU_SCREENS.includes(prev.screen) ? prev.screen : resumeScreen(s);
    }
    // Only (re)capture the thumbnail when asked (constructor entry). Otherwise pass null so
    // upsertProject KEEPS the existing image — the auto-save / leave-flush persist data
    // without disturbing the one consistent thumbnail captured on entry.
    upsertProject(id, design, undefined, withThumb ? captureThumbnail() : null);
    if (created) set({ currentProjectId: id });
    if (withThumb) set((st) => ({ projectsRev: st.projectsRev + 1 })); // refresh any open list
    if (s.authUser) {
      const p = allProjects().find((x) => x.id === id); // full record with fresh meta
      if (p) trackSync(pushProject(s.authUser.id, p)); // push to the cloud + track status
    } else if (isSupabaseConfigured && !nudged() && s.cabs.length > 0) {
      // a guest's first REAL project (a kitchen has been designed) → soft, one-time
      // "sign in to sync" nudge. Guarded by a flag so it appears exactly once, ever.
      try { localStorage.setItem(NUDGE_KEY, "1"); } catch { /* ignore */ }
      set({ loginNudge: true });
    }
  },
  openProject: (id) => {
    const state = loadProjectState(id);
    if (!state) return;
    // Never restore to a menu screen — resume in the design (at a screen matching how far
    // the project got, so an existing project doesn't drop back into onboarding).
    const restored = state as Partial<AppState>;
    // `!FLOW.includes(...)` also catches a RETIRED screen — a project saved on the old onboarding
    // quiz would otherwise resume onto a screen that no longer exists in the journey, with no way
    // forward (next() has no case for it any more).
    if (!restored.screen || MENU_SCREENS.includes(restored.screen) || !FLOW.includes(restored.screen)) {
      restored.screen = resumeScreen(restored);
    }
    // repair any duplicate cab ids from projects saved before ids were collision-proof
    if (Array.isArray(restored.cabs)) restored.cabs = dedupeIds(restored.cabs as Cabinet[]);
    set({ ...freshDesign(), ...restored, currentProjectId: id, menuOpen: false });
    set((s) => ({ projectsRev: s.projectsRev + 1 }));
  },
  newProject: () => set({ ...freshDesign(), currentProjectId: null, menuOpen: false }),
  removeProject: (id) => {
    deleteProject(id);
    if (get().authUser) trackSync(deleteProjectCloud(id));
    set((s) => ({
      projectsRev: s.projectsRev + 1,
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    }));
  },
  renameProject: (id, patch) => {
    updateProjectMeta(id, patch);
    const s = get();
    if (s.authUser) {
      const p = allProjects().find((x) => x.id === id);
      if (p) trackSync(pushProject(s.authUser.id, p));
    }
    set(() => ({ projectsRev: s.projectsRev + 1 }));
  },
  updateSettings: (patch) =>
    set((s) => {
      const settings = { ...s.settings, ...patch };
      saveSettings(settings);
      if (s.authUser) {
        clearTimeout(profileTimer); // debounce cloud push while typing
        const uid = s.authUser.id;
        profileTimer = setTimeout(() => trackSync(pushProfile(uid, useStore.getState().settings)), 800);
      }
      return { settings };
    }),

  openAuth: () => set((s) => ({ screen: "auth", authReturn: s.screen === "auth" ? s.authReturn : s.screen, loginNudge: false, menuOpen: false })),
  closeAuth: () => set((s) => ({ screen: s.authReturn })),
  dismissNudge: () => set({ loginNudge: false }),
  signIn: async (email, password) => {
    if (!supabase) return { error: "Supabase не настроен" };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error?.message };
  },
  signUp: async (email, password) => {
    if (!supabase) return { error: "Supabase не настроен" };
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: error.message };
    // no session back → the project requires email confirmation before first login
    return { needsConfirm: !data.session };
  },
  signOut: async () => {
    await supabase?.auth.signOut();
  },
  resetPassword: async (email) => {
    if (!supabase) return { error: "Supabase не настроен" };
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    return { error: error?.message };
  },
  updatePassword: async (password) => {
    if (!supabase) return { error: "Supabase не настроен" };
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) set({ recovery: false });
    return { error: error?.message };
  },
  deleteAccount: async () => {
    if (!supabase) return { error: "Supabase не настроен" };
    const { error } = await supabase.rpc("delete_own_account");
    if (error) return { error: error.message };
    // wipe the local cache so nothing lingers, then sign out
    try {
      localStorage.removeItem("mebelchi.projects.v1");
      localStorage.removeItem("mebelchi.settings.v1");
      localStorage.removeItem("mebelchi.savedcabs.v1");
      localStorage.removeItem("mebelchi.migrated.v1");
      localStorage.removeItem(NUDGE_KEY);
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    return {};
  },
}));

// auto-save the current design to localStorage (debounced) once it has content,
// so the journey is captured as a project without an explicit "save" step
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe(() => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = useStore.getState();
    if (s.cabs.length > 0 || Object.keys(s.quiz).length > 0) s.saveCurrent();
  }, 30_000);
});

// One-time-per-login sync: adopt the cloud profile + projects for this user.
// Cloud is the source of truth; on the very first login on this device we migrate any
// local-only projects up (so pre-account work isn't lost), guarded by a flag so a second
// account on the same device can't leak the first account's local projects.
const MIGRATED_KEY = "mebelchi.migrated.v1";
async function syncOnLogin(userId: string): Promise<void> {
  try {
    const profile = await pullProfile(userId);
    if (profile) {
      // the pricing settings (toggles, modes, per-m² rate, fx rates, USD price list) have no
      // cloud columns yet — keep the device's local values so login doesn't reset them
      const local = useStore.getState().settings;
      const merged = {
        ...profile,
        showPricing: local.showPricing,
        pricingItems: local.pricingItems,
        pricingSqm: local.pricingSqm,
        sqmRate: local.sqmRate,
        fxRates: local.fxRates,
        rates: local.rates,
        sheetW: local.sheetW,
        sheetH: local.sheetH,
        kerf: local.kerf,
        respectGrain: local.respectGrain,
        hangingsPerCarcass: local.hangingsPerCarcass,
        hangingSpanMm: local.hangingSpanMm,
        advancedExport: local.advancedExport,
        quality: local.quality,
      };
      saveSettings(merged);
      useStore.setState({ settings: merged });
    }
    const cloud = await pullProjects();
    try {
      if (!localStorage.getItem(MIGRATED_KEY)) {
        const cloudIds = new Set(cloud.map((p) => p.id));
        for (const lp of allProjects()) {
          if (!cloudIds.has(lp.id)) {
            await pushProject(userId, lp);
            cloud.push(lp);
          }
        }
        localStorage.setItem(MIGRATED_KEY, "1");
      }
    } catch {
      /* storage / push error — fall through with whatever cloud we have */
    }
    replaceAllProjects(cloud);
    useStore.setState((s) => ({ projectsRev: s.projectsRev + 1, screen: "home" }));
  } catch {
    /* offline / RLS error — keep the local cache, app still works */
  }

  // "My cabinets" library sync — INDEPENDENT of the projects sync above (its own try/catch),
  // so a projects hiccup never skips restoring the library. Union: cloud + any local-only cabs
  // (pushed up); the cloud is authoritative but a LOCAL cab is never dropped. If the pull errors
  // (returns null) we leave the local cache untouched rather than clobber it with nothing.
  try {
    const cloudCabs = await pullSavedCabs();
    if (cloudCabs) {
      const cloudIds = new Set(cloudCabs.map((c) => c.id));
      for (const lc of allSavedCabs()) if (!cloudIds.has(lc.id)) { await pushSavedCab(userId, lc); cloudCabs.push(lc); }
      replaceAllSavedCabs(cloudCabs);
      useStore.setState((s) => ({ savedCabsRev: s.savedCabsRev + 1 }));
    }
  } catch { /* library sync is best-effort */ }
}

// wire Supabase auth → store: pick up an existing session on load, then track changes;
// run the login sync once when a user appears (not on token refresh)
if (supabase) {
  let syncedUser: string | null = null;
  const toUser = (u: { id: string; email?: string } | undefined | null): AuthUser | null =>
    u ? { id: u.id, email: u.email ?? "" } : null;
  const handle = (event: string, session: { user?: { id: string; email?: string } } | null) => {
    const authUser = toUser(session?.user);
    useStore.setState({ authUser, authReady: true });
    // opened the reset link → show "set a new password" instead of the app
    if (event === "PASSWORD_RECOVERY") useStore.setState({ recovery: true });
    if (authUser) {
      if (syncedUser !== authUser.id) {
        syncedUser = authUser.id;
        trackSync(syncOnLogin(authUser.id));
      }
    } else {
      syncedUser = null;
    }
  };
  supabase.auth.getSession().then(({ data }) => handle("INITIAL_SESSION", data.session));
  supabase.auth.onAuthStateChange((event, session) => handle(event, session));
}

// ── A MERGED BOX IS A PROMISE ABOUT GEOMETRY ───────────────────────────────────────────────────
// Same kind, same height, same depth, adjacent on the same wall. Raise one member's height, drag it
// to another wall, or delete the cabinet in the middle of the row, and that promise is broken — the
// box can no longer be built, and a box that cannot be built must not be priced or sent to a shop.
//
// There are a dozen ways to edit the run (the sheet, the plan, the 3D arrows, the module editor,
// undo). Rather than make each of them remember the rule — which is how an invariant rots — the
// rule is enforced once, here, on any change to `cabs`. Dissolving a broken group is always safe:
// the worst case is the seller re-taps «Объединить».
//
// Idempotent (healing healed cabs returns the same array), so this cannot loop.
useStore.subscribe((s, prev) => {
  if (s.cabs === prev.cabs) return;
  const healed = healCarcassGroups(s.cabs);
  if (healed !== s.cabs) useStore.setState({ cabs: healed });
});

// dev-only: lets local tooling drive the store directly (stripped from prod builds)
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __store: typeof useStore }).__store = useStore;
}
