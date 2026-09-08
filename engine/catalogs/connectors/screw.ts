// Саморез без присадки
//
// Самый дешёвый вариант и самый слабый: держит хуже всех и не рассчитан на повторную сборку.

import type { ConnectorGeometry } from "./types.js";

export const SCREW: ConnectorGeometry = {
  id: "screw",
  label: "Саморез без присадки",
  confidence: "standard",
  source: "Отраслевая практика: пилот Ø4.5 сквозь пласть, Ø3 направляющая в торец. Присадка как таковая не требуется — стяжка бюджетная.",
  faceHole: { diameter_mm10: 45, depth_mm10: 170, fromMatingEdge: { kind: "half_thickness" } },
  edgeHole: { diameter_mm10: 30, depth_mm10: 300 },
  notes: "Самый дешёвый вариант и самый слабый: держит хуже всех и не рассчитан на повторную сборку.",
};
