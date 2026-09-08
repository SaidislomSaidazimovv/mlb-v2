// Rafix (скрытая разборная стяжка)
//
// Числа корректны для изделия, но не для привычек этого цеха. Перед первым запуском — замер.

import type { ConnectorGeometry } from "./types.js";

export const RAFIX: ConnectorGeometry = {
  id: "rafix",
  label: "Rafix (скрытая разборная стяжка)",
  confidence: "standard",
  source: "Спецификация Häfele Rafix 20: корпус Ø20 в пласть, болт Ø5 в торец. В дампе НЕ встречается — цех этой стяжкой не работает.",
  faceHole: { diameter_mm10: 200, depth_mm10: 125, fromMatingEdge: { kind: "fixed", mm10: 340 } },
  edgeHole: { diameter_mm10: 50, depth_mm10: 250 },
  notes: "Числа корректны для изделия, но не для привычек этого цеха. Перед первым запуском — замер.",
};
