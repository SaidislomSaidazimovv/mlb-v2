// componentLibrary — App-2's ingestion of App-3's exported ComponentLibraryItem[] JSON (interim
// channel). Uses a fake KeyValue store (the app vitest env is node — no localStorage).

import { describe, it, expect } from "vitest";
import { importComponents, listComponents, removeComponent, resolveComponent, type KeyValue } from "../src/model/componentLibrary";

function fakeStore(): KeyValue {
  let v: string | null = null;
  return { getItem: () => v, setItem: (_k, val) => { v = val; } };
}

const valid = (over: Record<string, unknown> = {}) => ({
  componentId: "c1", version: 1, schemaVersion: 1, name: "Слайд", author: "u",
  requiredSlots: [], root: { nodeId: "r", kind: "group" }, ...over,
});

describe("componentLibrary — App-3 JSON ingestion", () => {
  it("imports a valid ComponentLibraryItem", () => {
    const s = fakeStore();
    const r = importComponents(JSON.stringify([valid()]), s);
    expect(r.imported).toHaveLength(1);
    expect(r.rejected).toHaveLength(0);
    expect(listComponents(s)).toHaveLength(1);
  });

  it("REJECTS an unknown schemaVersion, never guesses (design.ts law)", () => {
    const s = fakeStore();
    const r = importComponents(JSON.stringify([valid({ schemaVersion: 2 })]), s);
    expect(r.imported).toHaveLength(0);
    expect(r.rejected[0]!.reason).toContain("schemaVersion");
    expect(listComponents(s)).toHaveLength(0);
  });

  it("rejects non-JSON without throwing", () => {
    const s = fakeStore();
    expect(importComponents("{not json", s).rejected).toHaveLength(1);
  });

  it("same id+version replaces; a new version sits alongside", () => {
    const s = fakeStore();
    importComponents(JSON.stringify([valid()]), s);
    importComponents(JSON.stringify([valid({ name: "Слайд v1b" })]), s); // same c1:1 → replace
    importComponents(JSON.stringify([valid({ version: 2 })]), s); // c1:2 → alongside
    expect(listComponents(s)).toHaveLength(2);
  });

  it("removes by id+version", () => {
    const s = fakeStore();
    importComponents(JSON.stringify([valid()]), s);
    removeComponent("c1", 1, s);
    expect(listComponents(s)).toHaveLength(0);
  });

  it("resolveComponent finds the pinned version, and NEVER falls back to latest", () => {
    const s = fakeStore();
    importComponents(JSON.stringify([valid({ version: 1 }), valid({ version: 3 })]), s);
    expect(resolveComponent({ componentId: "c1", pinnedVersion: 1 }, s)?.version).toBe(1);
    expect(resolveComponent({ componentId: "c1", pinnedVersion: 3 }, s)?.version).toBe(3);
    // a pin that isn't in the library resolves to undefined — no silent auto-advance
    expect(resolveComponent({ componentId: "c1", pinnedVersion: 2 }, s)).toBeUndefined();
    expect(resolveComponent({ componentId: "zzz", pinnedVersion: 1 }, s)).toBeUndefined();
  });
});
