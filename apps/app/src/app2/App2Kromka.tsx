// «Кромка · bo'yash rejimi» (talablar §4 · CONSTRUCTION_FRAME §3.3/§8.1): paint each part-role's edges
// with K1 (1.0mm visible) / K2 (0.4mm hidden) / bare. The profile's `kromkaByRole` census is the DEFAULT;
// painting writes a per-role/per-edge OVERRIDE into the store, which the cut list (cncExport) reads. No
// invented numbers — K1/K2 come from the profile, the edge map from `kromkaByRole`.

import { useStore } from "../store";
import { QORASU_PROFILE } from "../../../../engine/index.js";
import type { Settings } from "../model/settings";

const EDGES = ["front", "back", "left", "right", "top", "bottom"] as const;
type Edge = (typeof EDGES)[number];
type K = "K1" | "K2" | null;

const K_COLOR: Record<string, string> = { K1: "#e2483d", K2: "#18a999", none: "#d1d1d8" };
const EDGE_RU: Record<Edge, string> = { front: "перёд", back: "зад", left: "лев", right: "прав", top: "верх", bottom: "низ" };
const ROLE_RU: Record<string, string> = {
  side: "Боковина", shelf: "Полка", divider: "Стойка", stretcher: "Царга", bottom: "Дно", top: "Крыша",
  worktop: "Столешница", door: "Фасад", plinth: "Цоколь", filler: "Доборка", back: "Задняя", decor: "Декор",
};

export function App2Kromka() {
  const kromkaOverride = useStore((s) => s.settings.kromkaOverride);
  const updateSettings = useStore((s) => s.updateSettings);
  const byRole = QORASU_PROFILE.defaults.kromkaByRole as unknown as Record<string, Record<Edge, K>>;

  const effective = (role: string, edge: Edge): K => {
    const o = kromkaOverride[role]?.[edge];
    return o !== undefined ? o : (byRole[role]?.[edge] ?? null);
  };
  const cycle = (role: string, edge: Edge) => {
    const cur = effective(role, edge);
    const next: K = cur === "K1" ? "K2" : cur === "K2" ? null : "K1";
    const roleOv = { ...(kromkaOverride[role] ?? {}), [edge]: next };
    updateSettings({ kromkaOverride: { ...kromkaOverride, [role]: roleOv } } as Partial<Settings>);
  };

  // roles that carry at least one banded edge (skip fully-bare roles like `back`)
  const roles = Object.keys(byRole).filter((r) => EDGES.some((e) => byRole[r]?.[e] !== null || kromkaOverride[r]?.[e] != null));

  return (
    <div className="a2krm2">
      <div className="a2-sstub" style={{ padding: "2px 4px 12px" }}>
        Bo'yash rejimi: har detal-rolining qirrasini bosing — <b style={{ color: K_COLOR.K1 }}>K1</b> (1.0мм · видимая)
        → <b style={{ color: K_COLOR.K2 }}>K2</b> (0.4мм · скрытая) → нет. Кесим рўйхати shu bўyicha (profil override).
      </div>
      {roles.map((role) => {
        const edges = EDGES.filter((e) => byRole[role]?.[e] !== null || kromkaOverride[role]?.[e] != null);
        return (
          <div className="a2krm2-row" key={role}>
            <b className="a2krm2-role">{ROLE_RU[role] ?? role}</b>
            <div className="a2krm2-edges">
              {edges.map((e) => {
                const k = effective(role, e);
                return (
                  <button type="button" key={e} className="a2krm2-dot" onClick={() => cycle(role, e)} title={`${EDGE_RU[e]}: ${k ?? "нет"}`}>
                    <i style={{ background: K_COLOR[k ?? "none"] }} />
                    <span>{EDGE_RU[e]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
