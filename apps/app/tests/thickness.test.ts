// Carcass board thickness — the per-cabinet choice (16 «Стандарт» / 18 «Усиленный») flows into BOTH the
// CUT LIST (production/cncExport) AND, since the founder approved `Module.boardThickness` (2026-08-10, §C1),
// the PRICING / PARTS path (cabToModule → carcassPanels). Before, the cut list already honoured 18 but pricing
// always used 16 — that gap is now closed. §5.3: contract = test.

import { describe, it, expect } from "vitest";
import { production } from "../src/model/cncExport";
import { cabToModule } from "../src/model/toProject";
import { mk } from "../src/model/cabinet";
import { modulePanels } from "@mebelchi/pricing";

const MATS = { carcassId: "c", facadeId: "f", edgeVisibleId: "k1", edgeHiddenId: "k2" };

const cutBottom = (thick: 16 | 18) =>
  (production([mk({ kind: "base", w: 600, h: 720, boardThickness: thick })])?.panels ?? [])
    .find((p) => p.partEn === "bottom");

const pricedBottom = (thick: 16 | 18) =>
  modulePanels(cabToModule(mk({ kind: "base", w: 600, h: 720, boardThickness: thick })), MATS)
    .find((p) => p.name === "bottom");

describe("carcass thickness follows the per-cabinet choice", () => {
  it("CUT LIST: an 18mm cabinet's carcass parts are 18mm thick (was always 16)", () => {
    expect(cutBottom(18)?.thicknessMm).toBe(18);
    expect(cutBottom(16)?.thicknessMm).toBe(16);
  });

  it("CUT LIST: 18mm eats 2×2mm more interior width than 16mm (bottom = W − 2t)", () => {
    expect(cutBottom(16)!.lengthMm - cutBottom(18)!.lengthMm).toBe(4);
  });

  it("PRICING/PARTS: boardThickness now flows into carcassPanels too — an 18mm box's bottom is 4mm narrower (§C1, founder-approved 2026-08-10)", () => {
    expect(pricedBottom(16)!.lengthMm - pricedBottom(18)!.lengthMm).toBe(4);
  });
});
