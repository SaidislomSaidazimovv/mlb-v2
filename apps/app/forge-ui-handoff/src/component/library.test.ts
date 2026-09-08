import { describe, it, expect } from "vitest";
import { saveComponent, listComponents, latestVersion, deleteComponent, exportLibrary, importLibrary, getScope, setScope, type KeyValue } from "./library";
import type { ComponentLibraryItem } from "../contract/design";

function fakeStore(): KeyValue {
  const mem = new Map<string, string>();
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => {mem.set(k, v);} };
}

const item = (componentId: string, version: number): ComponentLibraryItem => ({
  componentId, version, schemaVersion: 1, name: componentId, author: "a",
  requiredSlots: [], root: { nodeId: componentId, kind: "shelf" }, gate: { ok: true, failures: [] },
});

describe("local component library", () => {
  it("saves then lists an item (roundtrip)", () => {
    const s = fakeStore();
    saveComponent(item("c1", 1), s);
    const all = listComponents(s);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ componentId: "c1", version: 1 });
  });

  it("keeps different versions and reports the latest", () => {
    const s = fakeStore();
    saveComponent(item("c1", 1), s);
    saveComponent(item("c1", 2), s);
    expect(listComponents(s)).toHaveLength(2);
    expect(latestVersion("c1", s)).toBe(2);
  });

  it("replaces the same id+version instead of duplicating", () => {
    const s = fakeStore();
    saveComponent({ ...item("c1", 1), name: "old" }, s);
    saveComponent({ ...item("c1", 1), name: "new" }, s);
    const all = listComponents(s);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("new");
  });

  it("returns [] on an empty store", () => {
    expect(listComponents(fakeStore())).toEqual([]);
  });

  it("deletes one id+version and leaves the rest", () => {
    const s = fakeStore();
    saveComponent(item("c1", 1), s);
    saveComponent(item("c1", 2), s);
    saveComponent(item("c2", 1), s);
    const after = deleteComponent("c1", 1, s);
    expect(after.map((c) => `${c.componentId}:${c.version}`).sort()).toEqual(["c1:2", "c2:1"]);
    expect(listComponents(s)).toHaveLength(2);
  });

  it("exports then imports (roundtrip) into another store", () => {
    const a = fakeStore();
    saveComponent(item("c1", 1), a);
    saveComponent(item("c2", 1), a);
    const json = exportLibrary(a);
    const b = fakeStore();
    const imported = importLibrary(json, b);
    expect(imported).toHaveLength(2);
    expect(listComponents(b).map((c) => c.componentId).sort()).toEqual(["c1", "c2"]);
  });

  it("importLibrary merges — replaces same id+version, keeps others", () => {
    const s = fakeStore();
    saveComponent(item("c1", 1), s);
    importLibrary(JSON.stringify([{ ...item("c1", 1), name: "new" }, item("c3", 1)]), s);
    const all = listComponents(s);
    expect(all).toHaveLength(2);
    expect(all.find((c) => c.componentId === "c1")!.name).toBe("new");
  });

  it("importLibrary rejects non-array json", () => {
    expect(() => importLibrary("{}", fakeStore())).toThrow();
  });

  it("scope defaults to local and toggles to global (per id+version)", () => {
    const s = fakeStore();
    expect(getScope("c1", 1, s)).toBe("local");
    setScope("c1", 1, "global", s);
    expect(getScope("c1", 1, s)).toBe("global");
    expect(getScope("c1", 2, s)).toBe("local");
  });
});
