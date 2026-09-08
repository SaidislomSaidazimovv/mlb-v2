// BLOCK library scope — local (this project) vs global (all projects). A BLOCK is App-2's own thing to
// publish local/global; a COMPONENT is App-3's (App-2 only receives). Pure helpers (no localStorage).

import { describe, it, expect } from "vitest";
import { cabScope, visibleCabInProject, type SavedCab } from "../src/model/savedCabs";

const mk = (over: Partial<SavedCab> = {}): SavedCab => ({ id: "b1", name: "Блок", cab: {}, createdAt: 0, ...over });

describe("savedCabs scope — «Мои шкафы» (mine) vs «Локальные» (project)", () => {
  it("absent scope defaults to «mine» (visible in every project)", () => {
    const sc = mk();
    expect(cabScope(sc).scope).toBe("mine");
    expect(visibleCabInProject(sc, "projA")).toBe(true);
    expect(visibleCabInProject(sc, "projB")).toBe(true);
    expect(visibleCabInProject(sc, null)).toBe(true);
  });

  it("a «project» block is visible only in its own project", () => {
    const sc = mk({ scope: "project", projectId: "projA" });
    expect(cabScope(sc)).toEqual({ scope: "project", projectId: "projA" });
    expect(visibleCabInProject(sc, "projA")).toBe(true);
    expect(visibleCabInProject(sc, "projB")).toBe(false);
    expect(visibleCabInProject(sc, null)).toBe(false);
  });

  it("tolerates the first-cut values (legacy «local»→project, «global»→mine)", () => {
    // localStorage may still hold blocks saved with the old scope strings — read them correctly.
    expect(cabScope(mk({ scope: "global" as never }))).toEqual({ scope: "mine", projectId: undefined });
    expect(cabScope(mk({ scope: "local" as never, projectId: "projA" }))).toEqual({ scope: "project", projectId: "projA" });
  });
});
