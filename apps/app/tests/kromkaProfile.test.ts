// Kromka mm are single-sourced from the ConstructionProfile (DB/27 §3): the cut list's
// K1/K2 thickness come from QORASU_PROFILE.kromka.slots, never a local literal. This test
// pins that link and guards the old "2mm" census bug from ever coming back.

import { describe, it, expect } from "vitest";
import { KROMKA } from "../src/model/cncExport";
import { QORASU_PROFILE } from "../../../engine/catalogs/profiles.js";

describe("kromka mm come from the ConstructionProfile (single source of truth)", () => {
  it("KROMKA equals the profile's K1/K2 slot thickness (mm10 → mm)", () => {
    expect(KROMKA.k1Mm).toBe(QORASU_PROFILE.kromka.slots.K1.thickness_mm10 / 10);
    expect(KROMKA.k2Mm).toBe(QORASU_PROFILE.kromka.slots.K2.thickness_mm10 / 10);
  });

  it("keeps the census-verified values: K1 = 1.0mm visible, K2 = 0.4mm hidden", () => {
    expect(KROMKA.k1Mm).toBe(1.0);
    expect(KROMKA.k2Mm).toBe(0.4);
  });

  it("never the old 2mm facade-edge bug (37_MATERIALS §5 / DB/25 F2)", () => {
    expect(KROMKA.k1Mm).not.toBe(2.0);
    expect(KROMKA.k2Mm).not.toBe(2.0);
    // a profile swap is what changes these — swapping to OTHER_SHOP proves it flows
    expect(QORASU_PROFILE.kromka.slots.K1.thickness_mm10).toBe(10);
  });
});
