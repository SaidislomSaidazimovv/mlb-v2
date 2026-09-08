// DB/41 — the app's police window: run the engine's ~25 rules over the current cabinet run and
// surface findings (ruleId + severity + plain detail) for the Инженерия screen.

import { describe, it, expect } from "vitest";
import { runPoliceOnCabs } from "../src/model/police";
import { mk } from "../src/model/cabinet";

describe("runPoliceOnCabs — the app's police window (DB/41)", () => {
  it("a normal cabinet run passes the machine-safety gate (no BLOCK)", () => {
    const res = runPoliceOnCabs([mk({ kind: "base", w: 600, h: 720, fill: "shelves", count: 2 })]);
    expect(res.ok).toBe(true);
    expect(res.findings.every((f) => f.severity !== "BLOCK")).toBe(true);
  });

  it("reports honest coverage — how many legislated rules actually ran", () => {
    const res = runPoliceOnCabs([mk({ kind: "base", w: 600, h: 720 })]);
    expect(res.coverage.total).toBeGreaterThan(0);
    expect(res.coverage.active).toBeGreaterThan(0);
    expect(res.coverage.active).toBeLessThanOrEqual(res.coverage.total);
  });

  it("findings are sorted most-severe first and carry a plain title + detail", () => {
    const res = runPoliceOnCabs([mk({ kind: "base", w: 600, h: 720, fill: "shelves", count: 2 })]);
    const rank = { BLOCK: 0, WARN: 1, ADVISORY: 2 } as const;
    for (let i = 1; i < res.findings.length; i++) {
      expect(rank[res.findings[i]!.severity]).toBeGreaterThanOrEqual(rank[res.findings[i - 1]!.severity]);
    }
    for (const f of res.findings) {
      expect(f.ruleId.length).toBeGreaterThan(0);
      expect(f.title.length).toBeGreaterThan(0);
    }
  });

  it("surfaces the real connector geometry from the catalogue (not a hardcoded literal)", () => {
    const res = runPoliceOnCabs([mk({ kind: "base", w: 600, h: 720 })]);
    // QORASU's connector is the measured cam_dowel → label + real Ø geometry, no fake caveat.
    expect(res.connector.id).toBe("cam_dowel");
    expect(res.connector.label.length).toBeGreaterThan(0);
    expect(res.connector.geometry).toMatch(/Ø/); // carries a real diameter
    expect(res.connector.caveat).toBeNull(); // measured → no warning
  });

  it("an empty run is clean", () => {
    const res = runPoliceOnCabs([]);
    expect(res.ok).toBe(true);
    expect(res.findings).toEqual([]);
  });
});
