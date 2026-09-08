// Local library of Forge ComponentLibraryItems, ingested from App-3 over the interim JSON channel
// (until the server global library, DB_37 §3). App-3 exports listComponents() as JSON; App-2 imports
// here. The component's `root` carries its modifiers[] (laminate/viyemka), which panelDecomposition
// decomposes once the component is placed — so this is the App-2 half of the live end-to-end.
// Unknown schemaVersion is REJECTED at import, never guessed (design.ts ComponentLibraryItem:
// "Unknown version → REJECTED at import, never guessed").

import type { ComponentLibraryItem } from "../../../../engine/index.js";

/** The minimal storage surface — real localStorage in the app, a fake in tests (node env). */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "mebelchi.components.v1";
const NOOP: KeyValue = { getItem: () => null, setItem: () => {} };

function backend(store?: KeyValue): KeyValue {
  if (store) return store;
  try { if (typeof localStorage !== "undefined") return localStorage; } catch { /* blocked */ }
  return NOOP;
}

function readAll(store?: KeyValue): ComponentLibraryItem[] {
  try {
    const raw = backend(store).getItem(KEY);
    return raw ? (JSON.parse(raw) as ComponentLibraryItem[]) : [];
  } catch { return []; }
}

function writeAll(list: ComponentLibraryItem[], store?: KeyValue): void {
  try { backend(store).setItem(KEY, JSON.stringify(list)); } catch { /* quota / private */ }
}

export function listComponents(store?: KeyValue): ComponentLibraryItem[] {
  return readAll(store);
}

/** A well-formed, ACCEPTABLE component: schemaVersion is the known 1 (design.ts: unknown → rejected,
 *  never guessed), and the identity + design root are present. */
function isValid(x: unknown): x is ComponentLibraryItem {
  if (!x || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return c.schemaVersion === 1
    && typeof c.componentId === "string" && typeof c.version === "number"
    && typeof c.name === "string"
    && !!c.root && typeof c.root === "object";
}

export interface ImportResult {
  imported: ComponentLibraryItem[];
  rejected: { name: string; reason: string }[];
}

/** Import App-3's exported ComponentLibraryItem[] JSON (an array, or a single item). Valid items are
 *  merged into the store — same componentId+version replaces, a new version sits alongside. Invalid or
 *  unknown-version items are REJECTED with a reason, never coerced into the store. */
export function importComponents(json: string, store?: KeyValue): ImportResult {
  let parsed: unknown;
  try { parsed = JSON.parse(json); }
  catch { return { imported: [], rejected: [{ name: "(файл)", reason: "не JSON" }] }; }

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const imported: ComponentLibraryItem[] = [];
  const rejected: { name: string; reason: string }[] = [];
  for (const x of arr) {
    if (isValid(x)) { imported.push(x); continue; }
    const o = (x && typeof x === "object") ? (x as Record<string, unknown>) : {};
    const name = typeof o.name === "string" ? o.name : "(без имени)";
    rejected.push({
      name,
      reason: o.schemaVersion !== undefined && o.schemaVersion !== 1
        ? `неизвестная schemaVersion ${String(o.schemaVersion)}`
        : "неверная форма",
    });
  }
  if (imported.length) {
    const k = (c: ComponentLibraryItem) => `${c.componentId}:${c.version}`;
    const cur = readAll(store).filter((c) => !imported.some((i) => k(i) === k(c)));
    writeAll([...cur, ...imported], store);
  }
  return { imported, rejected };
}

export function removeComponent(componentId: string, version: number, store?: KeyValue): void {
  writeAll(readAll(store).filter((c) => !(c.componentId === componentId && c.version === version)), store);
}

/** §10.4 — the HIGHEST version of a component in the library (or undefined if it isn't there). A placement
 *  pinned below this has a newer version AVAILABLE to accept — never auto-applied (pinnedVersion law). */
export function latestComponentVersion(componentId: string, store?: KeyValue): number | undefined {
  const vs = readAll(store).filter((c) => c.componentId === componentId).map((c) => c.version);
  return vs.length ? Math.max(...vs) : undefined;
}

// NOTE (scope belongs to BLOCKS, not components): local↔global is App-2's own BLOCK library concern
// (savedCabs.ts) — App-2 AUTHORS blocks and publishes them local/global. A COMPONENT is App-3's; App-2 only
// RECEIVES it (the ones App-3 published GLOBAL reach App-2's «Компоненты»). So no local/global toggle here —
// an earlier version wrongly put one on components; it was moved to the block library where it belongs.

/** A ComponentRef (as placed on a Cell: componentId + the pinned version) → the stored library item,
 *  or undefined if it is not in the library. This is the placement resolver: the decompose path reads
 *  the bound component's `root` (and its modifiers[]) through here. Version is NEVER auto-advanced —
 *  a pinnedVersion that is not present resolves to undefined, it does not fall back to the latest
 *  (ComponentRef law: "the master accepts a newer version explicitly, after a fit-check"). */
export function resolveComponent(
  ref: { componentId: string; pinnedVersion: number },
  store?: KeyValue,
): ComponentLibraryItem | undefined {
  return readAll(store).find((c) => c.componentId === ref.componentId && c.version === ref.pinnedVersion);
}
