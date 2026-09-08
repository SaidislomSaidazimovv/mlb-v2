// Per-edge JIYAK (kromka) spec — the cut-list edge-banding column is now built from the
// ConstructionProfile's per-role, per-edge census map (QORASU_PROFILE.defaults.kromkaByRole),
// not the old blanket "facade = K1 / carcass = K2" guess. This pins WHICH edges each part
// bands and with WHICH tape (K1 = 1mm visible, K2 = 0.4mm hidden; back is bare). §5.3: contract = test.

import { describe, it, expect } from "vitest";
import { jiyakSpec } from "../src/model/cncExport";

describe("jiyakSpec — per-edge banding from the profile (DB/25 census)", () => {
  it("a side bands its two visible verticals (front + back) with K1", () => {
    expect(jiyakSpec("side-left")).toBe("перед·зад: 1мм");
    expect(jiyakSpec("side-right")).toBe("перед·зад: 1мм");
  });

  it("a shelf / bottom / top / divider bands only its front edge with K1", () => {
    expect(jiyakSpec("shelf-1")).toBe("перед: 1мм");
    expect(jiyakSpec("bottom")).toBe("перед: 1мм");
    expect(jiyakSpec("top")).toBe("перед: 1мм");
    expect(jiyakSpec("divider-1")).toBe("перед: 1мм");
    expect(jiyakSpec("stile-1")).toBe("перед: 1мм"); // a shared stile is an internal vertical too
  });

  it("the BACK panel is bare — no banding (the old blanket rule wrongly banded it)", () => {
    expect(jiyakSpec("back")).toBe("—");
  });

  it("a facade (door / drawer front) bands all four edges with K1", () => {
    expect(jiyakSpec("door")).toBe("лев·прав·верх·низ: 1мм");
    expect(jiyakSpec("door-2")).toBe("лев·прав·верх·низ: 1мм");
    expect(jiyakSpec("drawer-front-1")).toBe("лев·прав·верх·низ: 1мм");
  });

  it("an unknown / glass panel gets no banding", () => {
    expect(jiyakSpec("glass-1")).toBe("—");
    expect(jiyakSpec("something-else")).toBe("—");
  });
});
