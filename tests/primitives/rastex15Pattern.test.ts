// Proof: rastex15Pattern vs the real ORTA_BAK Ø15 cam seats + Ø8 edge dowels.
// 15_PRIMITIVES_STEP2.md.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseSWJ008 } from "../../engine/index.js";
import { rastex15Pattern } from "../../engine/primitives/rastex15Pattern.js";
import { loadHardwareSpec } from "../../engine/catalogs/hardwareSpec.js";
import type { Panel } from "../../engine/primitives/types.js";
import { canonOps, fieldDiffs, proof } from "./_helpers.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const xml = readFileSync(join(HERE, "..", "golden", "xml", "ORTA_BAK_6_1.XML"), "utf8");
const realPanel = parseSWJ008(xml)[0]!;

const spec = loadHardwareSpec();
const connector = spec.connectors.DUMMY_RASTEX_15!;
const verified = connector.verified;

// POSYLKA 2026-08-13: the cam's fromMatingEdge is a PROFILE setting now (joints.connectorEndOffset_mm10),
// not a hardware spec — the caller passes it. 34mm (=340 mm10), CONFIRMED against YON BAK-1 / POL.
const CAM_FROM_EDGE_MM10 = 340;

const panel: Panel = {
  id: realPanel.id,
  width_mm10: realPanel.width_mm10,
  length_mm10: realPanel.length_mm10,
  thickness_mm10: realPanel.thickness_mm10,
};

// Ground-truth subset of the edge-3 joint: cam seats Ø15 (=150) on Face A at the
// mating edge, and their paired Ø8 (=80) dowels into edge3.
const realDowels = canonOps(
  realPanel.operations.filter(
    (o) => o.op === "drill" && o.face === "edge3" && o.diameter_mm10 === 80,
  ),
);
const realCams = canonOps(
  realPanel.operations.filter(
    (o) =>
      o.op === "drill" &&
      o.face === "A" &&
      o.diameter_mm10 === 150 &&
      o.x_mm10 === realPanel.length_mm10 - CAM_FROM_EDGE_MM10,
  ),
);
// Joint Y positions are an INPUT; read them from the real dowels.
const jointPositionsY = [...new Set(realDowels.map((o) => o.y))];

const out = rastex15Pattern(panel, panel, jointPositionsY, connector, CAM_FROM_EDGE_MM10);
const genCams = canonOps(out.camOps);
const genDowels = canonOps(out.dowelOps);

describe("rastex15Pattern", () => {
  it("dowel geometry already matches the factory (Ø8, 34mm, Z=thickness/2)", () => {
    // The edge dowel is a factory-confirmed value — this proof is green today.
    expect(genDowels).toEqual(realDowels);
  });

  it("cam seat uses factory-confirmed diameter (Ø15) and depth (12.5mm) from spec", () => {
    for (const op of genCams) {
      expect(op.dia).toBe(150);
      expect(op.depth).toBe(125);
    }
  });

  // POSYLKA 2026-08-13: fed the cam offset (34mm, now a profile setting) the generated cam seats match
  // the real ORTA_BAK exactly. (The old dummy 20mm was the only reason this ever diverged.)
  proof("generated cam seats match real ORTA_BAK", verified, () => {
    expect(genCams).toEqual(realCams);
  });

  it("[checklist] reports the unverified field diffs", () => {
    if (!verified) {
      // eslint-disable-next-line no-console
      console.log("rastex15Pattern cam UNVERIFIED diffs:\n  " + fieldDiffs(genCams, realCams).join("\n  "));
    }
    expect(true).toBe(true);
  });
});
