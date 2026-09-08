// Length display units (CF4 §12.3) — display-only; the engine stays mm10.

import { describe, it, expect } from "vitest";
import { fmtLen, fmtLenU, lenUnitLabel } from "../src/model/units";

describe("length display units", () => {
  it("cm: value/10, whole when round, one decimal otherwise", () => {
    expect(fmtLen(600, "cm")).toBe("60");
    expect(fmtLen(605, "cm")).toBe("60.5");
    expect(fmtLen(0, "cm")).toBe("0");
  });

  it("mm: whole millimetres", () => {
    expect(fmtLen(600, "mm")).toBe("600");
    expect(fmtLen(605, "mm")).toBe("605");
  });

  it("labels and suffix form", () => {
    expect(lenUnitLabel("cm")).toBe("см");
    expect(lenUnitLabel("mm")).toBe("мм");
    expect(fmtLenU(720, "cm")).toBe("72 см");
    expect(fmtLenU(720, "mm")).toBe("720 мм");
  });
});
