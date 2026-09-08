// App-2 (Конструктор / Блок) — public surface (barrel).
//
// The documented door for App-2's exclusive code. App-2's whole surface now lives in
// this folder (screen + editor panels + store slice + helpers); App.tsx mounts the
// feature by importing { ConfigScreen } from "../app2" here, so App-2's internal file
// layout can move freely behind this door.
//
// `store.ts` deliberately does NOT go through the barrel — it imports the slice straight
// from ./constructorSlice (the barrel re-exports UI that imports `useStore` back, so routing
// the state root through it would cycle and eager-load the whole App-2 UI on every screen).
// That is a load-isolation call.
//
// Yo'l B: this barrel exposes only App-2's OWN surface. Everything App-2 DEPENDS ON
// from the shared geometry kernel (cabinet / bands / grid / sheet / rowOps / …) stays
// in model/ and is imported there directly — it is NOT App-2's to re-export.

// ── the screen: App-2's entry component (App.tsx mounts it via this door) ──
export { ConfigScreen } from "./ConfigScreen";

// ── store: the Zustand constructor slice + its cabinet-history types ──
export { createConstructorSlice } from "./constructorSlice";
export type { CabSnap, CabHistState } from "./storeHelpers";

// ── editor UI: the store-free panels ConfigScreen mounts ──
export { ElevationGrid, type EditDim } from "./ElevationGrid";
export { FillEditor } from "./FillEditor";
export { FurnitureEditor, emptyCfg, type PartCfg } from "./FurnitureEditor";
export { V21Cabinet3DStudio } from "./V21Cabinet3DStudio";
