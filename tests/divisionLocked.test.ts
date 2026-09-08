// Division.locked — the founder-approved contract addition (2026-08-06).
// App-2's B1 shipped `locked` in @mebelchi/schema; the founder ("Ok") approved landing
// it in the canonical design contract so App-1/App-3 honour it too. This pins the type.

import { describe, it, expect } from "vitest";
import type { Division } from "../engine/index.js";

describe("Division.locked — canonical contract (founder-approved 2026-08-06)", () => {
  it("accepts a locked rule carrying an mm10 dimension the component owns", () => {
    const locked: Division = { rule: "locked", mm: 800 }; // 80.0mm, resize can't change it
    expect(locked.rule).toBe("locked");
    expect(locked.mm).toBe(800);
  });

  it("keeps all four rule kinds constructible (fixed / ratio / locked / flex)", () => {
    const rules: Division[] = [
      { rule: "fixed", mm: 1000 },
      { rule: "ratio", weight: 1 },
      { rule: "locked", mm: 800 },
      { rule: "flex" },
    ];
    expect(rules.map((r) => r.rule)).toEqual(["fixed", "ratio", "locked", "flex"]);
  });
});
