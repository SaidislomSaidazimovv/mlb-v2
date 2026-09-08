// Purpose tags (Назначение, §8.4) — the boiler-hero purpose system + its mapping to the
// canonical DesignNode.purpose. Declared intent, appliance-derived fallback, never inferred.

import { describe, it, expect } from "vitest";
import { mk } from "../src/model/cabinet";
import { PURPOSE_TAGS, purposeTag, purposeClearanceMm, purposeOf } from "../src/model/purposeTags";
import { cabinetToDesignNode } from "../src/model/toDesign";

describe("purpose tags catalog", () => {
  it("the boiler is the hero: a utility tag with a ghost prop and a min-clearance", () => {
    const b = purposeTag("boiler");
    expect(b).toBeDefined();
    expect(b!.category).toBe("utility");
    expect(b!.prop.shape).toBe("cylinder");
    expect(b!.minClearanceMm).toBe(50);
  });

  it("every tag is unique and carries a bilingual label + a prop colour", () => {
    const ids = PURPOSE_TAGS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PURPOSE_TAGS) {
      expect(t.ru).toBeTruthy();
      expect(t.uz).toBeTruthy();
      expect(t.prop.color).toMatch(/^#/);
    }
  });

  it("clearance: boiler needs 50mm; an unknown / none purpose needs 0", () => {
    expect(purposeClearanceMm("boiler")).toBe(50);
    expect(purposeClearanceMm("dishes")).toBe(0);
    expect(purposeClearanceMm(undefined)).toBe(0);
    expect(purposeClearanceMm("nonsense")).toBe(0);
  });
});

describe("purposeOf — declared intent, appliance-derived fallback", () => {
  it("an explicit purpose tag wins", () => {
    expect(purposeOf(mk({ purpose: "boiler" }))).toBe("boiler");
  });

  it("a built-in appliance maps to its tag (cooktop → hob)", () => {
    expect(purposeOf(mk({ appliance: "fridge" }))).toBe("fridge");
    expect(purposeOf(mk({ appliance: "cooktop" }))).toBe("hob");
    expect(purposeOf(mk({ appliance: "sink" }))).toBe("sink");
  });

  it("none / filler / bare cabinet has no purpose", () => {
    expect(purposeOf(mk({ appliance: "none" }))).toBeUndefined();
    expect(purposeOf(mk({ appliance: "filler" }))).toBeUndefined();
    expect(purposeOf(mk({}))).toBeUndefined();
  });

  it("an unknown explicit purpose is ignored (never smuggled through)", () => {
    expect(purposeOf(mk({ purpose: "nonsense" }))).toBeUndefined();
  });
});

describe("adapter carries purpose to DesignNode.purpose", () => {
  it("a boiler-tagged cabinet → node.purpose = 'boiler'", () => {
    expect(cabinetToDesignNode(mk({ purpose: "boiler" })).purpose).toBe("boiler");
  });
  it("a fridge cabinet → node.purpose = 'fridge'", () => {
    expect(cabinetToDesignNode(mk({ appliance: "fridge" })).purpose).toBe("fridge");
  });
  it("a plain cabinet has no purpose on the node", () => {
    expect(cabinetToDesignNode(mk({})).purpose).toBeUndefined();
  });
});
