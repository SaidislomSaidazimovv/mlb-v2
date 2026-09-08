// «Правила · Узлы» — the interactive joint-rules screen (POSYLKA 2026-08-13 §2, §6.1).
//
// The founder's law: "every joint related should be in that settings page. With visuals." A
// setback number is meaningless without a drawing of what it measures — so each of the 14
// settings from `JOINTS_GROUP` (engine/catalogs/settings/joints.ts) renders WITH a schematic,
// keyed by its `visual` string (the key names a diagram App-2 draws — NOT a file path, so the
// two apps can not drift on asset locations).
//
// HONESTY (no silent settings): a control is only editable when its value actually reaches
// output. Three settings are wired to the drilling solver today (Bosqich-1) and carry a green
// «→ ЧПУ» badge; the rest are shown from the profile for review. Two need factory-verified
// drilling geometry or are the deferred F1 drilling pass — they carry a «founder / F1» badge
// and are deliberately NOT presented as if editing them changed the machine file.

import { useStore } from "../store";
import { JOINTS_GROUP } from "../../../../engine/catalogs/settings/joints.js";
import { QORASU_PROFILE } from "../../../../engine/index.js";
import type { Setting } from "../../../../engine/catalogs/settings/types.js";
import type { Settings } from "../model/settings";
import { UzlyVisual } from "./UzlyVisual";

// The three settings wired to the drilling solver (Bosqich-1): their profile path → the shop
// Settings field (mm) that overrides it. Editing these reaches the CNC (SWJ008) + 3D preview.
const STORE_FIELD: Record<string, keyof Settings> = {
  "defaults.joints.system32.frontRowSetback_mm10": "s32FrontRowSetbackMm",
  "defaults.joints.system32.backRowSetback_mm10": "s32BackRowSetbackMm",
  "defaults.joints.connectorEndOffset_mm10": "connectorEndOffsetMm",
  "defaults.joints.hinge.endOffset_mm10": "hingeEndOffsetMm",
  "defaults.joints.system32.enabled": "s32Enabled",
  "defaults.joints.system32.rowMode": "s32RowMode",
};

// For an editable CHOICE, which option values are actually wired to the solver (the rest are shown but
// not selectable). rowMode: front_and_back + front_only reach shelfPinPattern; paired_32 needs the 32mm
// ladder, which is not wired — so it stays visible but is not a pickable option (honest, not fake).
const CHOICE_WIRED: Record<string, string[]> = {
  "defaults.joints.system32.rowMode": ["front_and_back", "front_only"],
};

// Honest provenance of each setting's OUTPUT effect (not its value — its reach):
//   cnc     — reaches the drilling solver today (editable here).
//   founder — needs factory-verified drilling geometry (carcass connector TYPE) or is the
//             deferred F1 drawer-slide pass; shown, never fake-wired.
//   profile — a real profile value shown for review; solver wiring is a later step.
const FOUNDER_PATHS = new Set<string>([
  "defaults.joints.carcassConnector",
  "defaults.joints.drawer.systemId",
  "defaults.joints.drawer.sideClearance_mm10",
]);

type Reach = "cnc" | "founder" | "profile";
const reachOf = (path: string): Reach =>
  path in STORE_FIELD ? "cnc" : FOUNDER_PATHS.has(path) ? "founder" : "profile";

const BADGE: Record<Reach, { txt: string; cls: string }> = {
  cnc: { txt: "→ ЧПУ", cls: "a2uz-b-cnc" },
  founder: { txt: "founder / F1", cls: "a2uz-b-founder" },
  profile: { txt: "профиль", cls: "a2uz-b-profile" },
};

/** Walk a dot-path into an object (profile leaves are mm10 for number settings). */
function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

/** The display value + option label for one setting, sourced from the store (if wired) or the profile. */
function readValue(s: Setting, settings: Settings): { num?: number; choice?: string; bool?: boolean } {
  const field = STORE_FIELD[s.path];
  if (s.kind === "number") {
    // store-backed values are already mm; profile leaves are mm10 → /10 for the mm unit.
    const raw = field ? (settings[field] as number) : (getPath(QORASU_PROFILE, s.path) as number) / 10;
    return { num: raw };
  }
  if (s.kind === "toggle") {
    const b = field ? (settings[field] as boolean) : (getPath(QORASU_PROFILE, s.path) as boolean);
    return { bool: b };
  }
  return { choice: field ? (settings[field] as string) : (getPath(QORASU_PROFILE, s.path) as string) };
}

function NumberControl({ s, value, editable, onChange }: { s: Setting; value: number; editable: boolean; onChange: (v: number) => void }) {
  const step = s.unit === "mm" ? 1 : 1;
  if (!editable) return <span className="a2uz-val">{value}<i>{s.unit}</i></span>;
  return (
    <span className="a2uz-num">
      <button type="button" onClick={() => onChange(Math.max(0, value - step))} aria-label="−">−</button>
      <input
        type="number"
        value={value}
        onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.max(0, n)); }}
      />
      <i>{s.unit}</i>
      <button type="button" onClick={() => onChange(value + step)} aria-label="+">+</button>
    </span>
  );
}

export function App2Uzly() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="a2uz">
      <p className="a2uz-intro">{JOINTS_GROUP.intro}</p>
      <div className="a2uz-list">
        {JOINTS_GROUP.settings.map((s) => {
          const reach = reachOf(s.path);
          const field = STORE_FIELD[s.path];
          const v = readValue(s, settings);
          const badge = BADGE[reach];
          return (
            <div className="a2uz-card" key={s.path}>
              <div className="a2uz-viz">{s.visual ? <UzlyVisual visual={s.visual} value={v.num} choice={v.choice} bool={v.bool} /> : null}</div>
              <div className="a2uz-body">
                <div className="a2uz-top">
                  <b className="a2uz-label">{s.label}</b>
                  <span className={`a2uz-badge ${badge.cls}`}>{badge.txt}</span>
                </div>

                {s.kind === "number" && (
                  <NumberControl
                    s={s}
                    value={v.num ?? 0}
                    editable={!!field}
                    onChange={(n) => field && updateSettings({ [field]: n } as Partial<Settings>)}
                  />
                )}
                {s.kind === "toggle" && (
                  field ? (
                    <button
                      type="button"
                      className={`a2uz-tgl ${v.bool ? "on" : ""}`}
                      onClick={() => updateSettings({ [field]: !v.bool } as Partial<Settings>)}
                      aria-pressed={v.bool}
                    >
                      <i /><span>{v.bool ? "Вкл" : "Выкл"}</span>
                    </button>
                  ) : (
                    <span className="a2uz-val">{v.bool ? "Вкл" : "Выкл"}</span>
                  )
                )}
                {s.kind === "choice" && s.options && (
                  <div className="a2uz-opts">
                    {s.options.map((o) => {
                      const pickable = !!field && (CHOICE_WIRED[s.path]?.includes(o.value) ?? false);
                      return (
                        <div
                          className={`a2uz-opt ${o.value === v.choice ? "on" : ""} ${pickable ? "a2uz-opt-pick" : ""}`}
                          key={o.value}
                          role={pickable ? "button" : undefined}
                          onClick={pickable ? () => updateSettings({ [field as keyof Settings]: o.value } as Partial<Settings>) : undefined}
                        >
                          <b>{o.label}{field && !pickable ? " · позже" : ""}</b>
                          <span>{o.effect}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="a2uz-why">{s.why}</div>
                <div className="a2uz-src">{s.source}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
