import { convertToComponent, type ConvertMeta } from "./convert";
import type { PanelGeom } from "./classify";
import type { PanelCuts } from "./modifiers";
import type { ComponentGateFailure } from "../contract/design";

const PROBE_PROFILE = "__profileswap_probe__";

export function checkProfileSwap(panels: PanelGeom[], meta: ConvertMeta, cuts?: (PanelCuts | undefined)[]): ComponentGateFailure[] {
  const a = convertToComponent(panels, meta, cuts);
  const b = convertToComponent(panels, { ...meta, profileId: PROBE_PROFILE }, cuts);
  return JSON.stringify(a.root) === JSON.stringify(b.root) ?
  [] :
  [{ code: "CARRIES_CONSTRUCTION", detail: "profile-swap: root differs between profiles — profile-dependent (DB_37 §3.5)" }];
}
