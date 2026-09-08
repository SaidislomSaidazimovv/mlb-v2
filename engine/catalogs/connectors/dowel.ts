// Шкант на клею
//
// Неразборное соединение: собранный на клею корпус не разбирается без повреждения.

import type { ConnectorGeometry } from "./types.js";

export const DOWEL: ConnectorGeometry = {
  id: "dowel",
  label: "Шкант на клею",
  confidence: "observed",
  source: "НАБЛЮДЕНИЕ: Ø8×11 на пласти — 410 отверстий на 68 панелях; Ø8×34 в торец — 342. Классическая пара под шкант Ø8, но в дампе она пересекается с эксцентриковой присадкой, поэтому однозначно не выделяется.",
  faceHole: { diameter_mm10: 80, depth_mm10: 110, fromMatingEdge: { kind: "half_thickness" } },
  edgeHole: { diameter_mm10: 80, depth_mm10: 340 },
  notes: "Неразборное соединение: собранный на клею корпус не разбирается без повреждения.",
};
