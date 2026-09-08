// The shape of a setting. Shared by every section file in this folder.
//
// FOUNDER'S LAW (2026-08-13): "every section/part should have a physical settings
// file. In every case possible." One folder, one file per section of the settings
// screen. A section that exists in the UI but has no file here is a bug you can see
// from `ls`, which is the point — the joints hole was invisible precisely because
// there was nowhere for a joints file to be missing FROM.

export type ControlKind =
  | "choice"   // one of a fixed option set
  | "number"   // a millimetre / count value
  | "toggle"   // boolean
  | "map"      // a per-role table (kromkaByRole) — rendered as its own screen
  | "list";    // a set of roles (grainPolicy.hiddenRoles)

export interface SettingOption {
  value: string;
  label: string;   // RU
  effect: string;  // what choosing this DOES, in one line
}

export interface Setting {
  /** Dot-path into the profile. MUST resolve to a real leaf (proven by the test). */
  path: string;
  group: string;         // the settings-screen section
  label: string;         // RU
  kind: ControlKind;
  unit?: "mm" | "kg" | "count";
  /** The LOGIC: what the engine does with this value. Required — no silent settings. */
  why: string;
  /** Provenance: DB/25 F1, DB/28 A2, R9… Required — no un-sourced settings. */
  source: string;
  options?: SettingOption[];    // for kind:"choice"
  affects?: string[];           // which part roles / behaviours this changes
  /** Some settings carry a decorative↔construction meaning the founder flagged. */
  facet?: "decorative_vs_structural";
  /**
   * Which drawing the settings screen shows beside this control.
   *
   * Founder, 2026-08-13: "every joint related should be in that settings page. With
   * visuals." A joint number without a picture of what it measures is unreviewable —
   * nobody can tell 37-from-the-front from 37-from-the-rear by reading a spinner.
   * The key names a diagram App-2 renders; it is deliberately NOT a file path, so the
   * two apps can not drift on asset locations.
   */
  visual?: string;
}

export interface SettingsGroup {
  id: string;
  label: string;
  intro: string;
  settings: Setting[];
}
