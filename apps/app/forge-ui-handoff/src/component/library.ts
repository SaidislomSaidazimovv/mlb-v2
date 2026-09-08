import type { ComponentLibraryItem } from "../contract/design";

export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "forge.componentLibrary.v1";

function backend(store?: KeyValue): KeyValue {
  if (store) return store;
  const g = globalThis as unknown as {localStorage?: KeyValue;};
  if (g.localStorage) return g.localStorage;
  const mem = new Map<string, string>();
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => {mem.set(k, v);} };
}

export function listComponents(store?: KeyValue): ComponentLibraryItem[] {
  const raw = backend(store).getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ComponentLibraryItem[] : [];
  } catch {
    return [];
  }
}

export function saveComponent(item: ComponentLibraryItem, store?: KeyValue): ComponentLibraryItem[] {
  const b = backend(store);
  const all = listComponents(b);
  const rest = all.filter((c) => !(c.componentId === item.componentId && c.version === item.version));
  const next = [...rest, item];
  b.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deleteComponent(componentId: string, version: number, store?: KeyValue): ComponentLibraryItem[] {
  const b = backend(store);
  const next = listComponents(b).filter((c) => !(c.componentId === componentId && c.version === version));
  b.setItem(KEY, JSON.stringify(next));
  return next;
}

export function latestVersion(componentId: string, store?: KeyValue): number {
  return listComponents(store).
  filter((c) => c.componentId === componentId).
  reduce((max, c) => Math.max(max, c.version), 0);
}

const SCOPE_KEY = "forge.componentScope.v1";
export type Scope = "local" | "global";

function scopeMap(store?: KeyValue): Record<string, string> {
  const raw = backend(store).getItem(SCOPE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

export function getScope(componentId: string, version: number, store?: KeyValue): Scope {
  return scopeMap(store)[`${componentId}:${version}`] === "global" ? "global" : "local";
}

export function setScope(componentId: string, version: number, scope: Scope, store?: KeyValue): void {
  const b = backend(store);
  const m = scopeMap(b);
  m[`${componentId}:${version}`] = scope;
  b.setItem(SCOPE_KEY, JSON.stringify(m));
}

const SNAP_KEY = "forge.componentSnapshot.v1";

function snapMap(store?: KeyValue): Record<string, unknown> {
  const raw = backend(store).getItem(SNAP_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function saveSnapshot(componentId: string, version: number, snapshot: unknown, store?: KeyValue): void {
  const b = backend(store);
  const m = snapMap(b);
  m[`${componentId}:${version}`] = snapshot;
  b.setItem(SNAP_KEY, JSON.stringify(m));
}

export function getSnapshot<T>(componentId: string, version: number, store?: KeyValue): T | null {
  const v = snapMap(store)[`${componentId}:${version}`];
  return v === undefined ? null : v as T;
}

export function deleteSnapshot(componentId: string, version: number, store?: KeyValue): void {
  const b = backend(store);
  const m = snapMap(b);
  delete m[`${componentId}:${version}`];
  b.setItem(SNAP_KEY, JSON.stringify(m));
}

export function exportLibrary(store?: KeyValue): string {
  return JSON.stringify(listComponents(store), null, 2);
}

export function importLibrary(json: string, store?: KeyValue): ComponentLibraryItem[] {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("ComponentLibraryItem[] kutilardi");
  const b = backend(store);
  for (const item of parsed as ComponentLibraryItem[]) saveComponent(item, b);
  return listComponents(b);
}
