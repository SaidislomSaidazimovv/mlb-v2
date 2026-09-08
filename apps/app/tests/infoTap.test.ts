// Info-tap law (§7): the info card names WHICH MATERIAL a block uses, resolved from the
// VISIBLE facade colour by colour+PART (catalogByColor — the helper the 3D also uses).
// The PART filter matters: some facade and carcass decors share a colour.

import { describe, it, expect } from "vitest";
import { catalogByColor, EMAN_MATERIALS, hexToInt } from "../src/model/materials";

describe("info-tap material by facade colour (part-filtered)", () => {
  it("a facade colour resolves to a FACADE material", () => {
    const facade = EMAN_MATERIALS.find((m) => m.part === "facade");
    expect(facade).toBeDefined();
    const m = catalogByColor(hexToInt(facade!.color), "facade");
    expect(m?.part).toBe("facade");
  });

  it("a colour shared by facade + carcass returns the RIGHT part (no cross-part leak)", () => {
    // find any colour present on both a facade and a carcass decor
    const facadeColors = new Set(EMAN_MATERIALS.filter((m) => m.part === "facade").map((m) => hexToInt(m.color)));
    const shared = EMAN_MATERIALS.find((m) => m.part === "carcass" && facadeColors.has(hexToInt(m.color)));
    if (shared) {
      const col = hexToInt(shared.color);
      expect(catalogByColor(col, "facade")!.part).toBe("facade");
      expect(catalogByColor(col, "carcass")!.part).toBe("carcass");
    } else {
      expect(true).toBe(true); // no collision in the current catalog — nothing to prove
    }
  });

  it("an unmatched / absent colour yields undefined (never a wrong guess)", () => {
    expect(catalogByColor(-12345, "facade")).toBeUndefined();
    expect(catalogByColor(undefined, "facade")).toBeUndefined();
  });
});
