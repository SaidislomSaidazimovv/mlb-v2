// Shelf deflection gate — 37_MIN §2.3, founder q = 15 kg/m (master-overridable, 2026-08-06).

import { describe, it, expect } from "vitest";
import {
  shelfDeflectionMm,
  shelfDeflectionLimitMm,
  shelfSpanOk,
  maxShelfSpanMm,
  SHELF_DEFLECTION,
  drawerMinMm,
  DRAWER_CLASS_MIN_MM,
} from "../src/model/deflection";

describe("shelf deflection gate (progib, 37_MIN §2.3)", () => {
  it("a 600mm 16mm LDSP shelf (500 deep, 15 kg/m) passes", () => {
    expect(shelfSpanOk(600, 500, 16)).toBe(true);
  });

  it("an 800mm 16mm LDSP shelf fails — it sags past L/240", () => {
    expect(shelfSpanOk(800, 500, 16)).toBe(false);
    // and the sag is real (a few mm), not a rounding artefact
    expect(shelfDeflectionMm(800, 500, 16)).toBeGreaterThan(shelfDeflectionLimitMm(800));
  });

  it("the crossover span is ~735mm for 16mm LDSP / 500 deep / 15 kg/m", () => {
    const max = maxShelfSpanMm(500, 16);
    expect(max).toBeGreaterThan(720);
    expect(max).toBeLessThan(750);
    expect(shelfSpanOk(Math.floor(max) - 5, 500, 16)).toBe(true);
    expect(shelfSpanOk(Math.ceil(max) + 5, 500, 16)).toBe(false);
  });

  it("default load is the founder's 15 kg/m, and a MASTER OVERRIDE changes the gate", () => {
    expect(SHELF_DEFLECTION.defaultLoadKgPerM).toBe(15);
    // a lighter master override (5 kg/m) lets the 800mm shelf pass
    expect(shelfSpanOk(800, 500, 16, { loadKgPerM: 5 })).toBe(true);
    // a heavier one (30 kg/m) fails a 700mm span that passed at 15
    expect(shelfSpanOk(700, 500, 16)).toBe(true);
    expect(shelfSpanOk(700, 500, 16, { loadKgPerM: 30 })).toBe(false);
  });

  it("MDF (stiffer, E=2400) allows a wider span than LDSP", () => {
    expect(maxShelfSpanMm(500, 16, { board: "MDF" })).toBeGreaterThan(
      maxShelfSpanMm(500, 16, { board: "LDSP" }),
    );
  });

  it("the acceptable sag is span / 240", () => {
    expect(shelfDeflectionLimitMm(720)).toBe(3);
  });
});

describe("drawer class min-size gate (Blum LEGRABOX, 37_MIN §2.1)", () => {
  it("N/M/K map to the catalogue minimum interior heights (p.198)", () => {
    expect(DRAWER_CLASS_MIN_MM).toEqual({ N: 80, M: 106, K: 144 });
    expect(drawerMinMm("N")).toBe(80);
    expect(drawerMinMm("M")).toBe(106);
    expect(drawerMinMm("K")).toBe(144);
  });

  it("an absent class defaults to N (80mm) — a drawer drawn before classes existed keeps its old gate", () => {
    expect(drawerMinMm()).toBe(80);
    expect(drawerMinMm(undefined)).toBe(80);
  });

  it("the class raises the bar: an M needs 26mm more, a K 64mm more, than an N", () => {
    expect(drawerMinMm("M") - drawerMinMm("N")).toBe(26);
    expect(drawerMinMm("K") - drawerMinMm("N")).toBe(64);
  });
});
