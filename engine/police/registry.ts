// THE REGISTRY — the ONE place every rule is listed. Nothing else enumerates rules.
//
// Adding a rule is two steps and no more: write the file, import it here. The test
// `tests/police.test.ts` then proves three things automatically:
//
//   1. every rule ID in DB/20's catalog has a file here          (no missing rule)
//   2. every file here appears in DB/20's catalog or is a SENSE  (no phantom rule)
//   3. every rule carries a title, a why and a source            (no silent rule)
//
// This is deliberately the same shape as `settingsManifest.ts`, which already makes
// "the settings are getting half things" impossible. Same disease, same cure.

import type { PoliceContext, PoliceReport, Rule, Violation } from "./types.js";

import { CE_1 } from "./ce/CE-1_drill_depth_under_thickness.js";
import { CE_2 } from "./ce/CE-2_hole_on_panel.js";
import { CE_3 } from "./ce/CE-3_no_hole_collision.js";
import { CE_4 } from "./ce/CE-4_known_tools_only.js";
import { CE_5 } from "./ce/CE-5_groove_depth_under_thickness.js";
import { CE_6 } from "./ce/CE-6_contour_inside_panel.js";
import { CE_7 } from "./ce/CE-7_min_part_size.js";
import { CE_8 } from "./ce/CE-8_fits_a_real_sheet.js";

import { GEO_1 } from "./geo/GEO-1_no_interpenetration.js";
import { GEO_2 } from "./geo/GEO-2_mating_panels_touch.js";
import { GEO_3 } from "./geo/GEO-3_widths_sum_exactly.js";
import { GEO_4 } from "./geo/GEO-4_fits_a_real_sheet.js";
import { GEO_5 } from "./geo/GEO-5_fronts_cover_openings.js";
import { GEO_6 } from "./geo/GEO-6_assembly_convention_consistent.js";
import { GEO_7 } from "./geo/GEO-7_back_panel_math.js";
import { CONS_1 } from "./cons/CONS-1_model_cut_list_parity.js";
import { CONS_2 } from "./cons/CONS-2_model_hardware_parity.js";
import { CONS_3 } from "./cons/CONS-3_area_sanity.js";
import { CONS_4 } from "./cons/CONS-4_sheet_count_sanity.js";
import { CONS_5 } from "./cons/CONS-5_price_monotonic_positive.js";
import { CONS_6 } from "./cons/CONS-6_every_panel_has_a_material_edges_resolved.js";
import { DET_1 } from "./det/DET-1_byte_identical_output.js";
import { DET_2 } from "./det/DET-2_mirror_symmetry.js";
import { DET_3 } from "./det/DET-3_metamorphic_width.js";
import { DET_4 } from "./det/DET-4_order_independence.js";

import { SENSE_1 } from "./sense/SENSE-1_drawer_encloses_a_volume.js";
import { SENSE_2 } from "./sense/SENSE-2_cabinet_has_two_sides.js";
import { SENSE_3 } from "./sense/SENSE-3_wall_cabinet_has_no_plinth.js";
import { SENSE_4 } from "./sense/SENSE-4_shelf_fits_its_compartment.js";

export const ALL_RULES: Rule[] = [
  CE_1, CE_2, CE_3, CE_4, CE_5, CE_6, CE_7, CE_8,
  GEO_1, GEO_2, GEO_3, GEO_4, GEO_5, GEO_6, GEO_7, CONS_1, CONS_2, CONS_3, CONS_4, CONS_5, CONS_6, DET_1, DET_2, DET_3, DET_4,
  SENSE_1, SENSE_2, SENSE_3, SENSE_4,
];

export function rulesOfClass(cls: Rule["cls"]): Rule[] {
  return ALL_RULES.filter((r) => r.cls === cls);
}

export function findRule(id: string): Rule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}

/**
 * Run the police. Deterministic: rules run in registry order, violations come back in
 * that order, and a rule may not look outside its `PoliceContext`.
 *
 * `coverage` is returned on EVERY run, not hidden behind a flag. A report that says
 * "ok: true" while six rules never executed is a lie by omission, and that omission is
 * exactly how CE-1 stayed missing for months.
 */
export function runPolice(ctx: PoliceContext, only?: Rule["cls"][]): PoliceReport {
  const rules = only ? ALL_RULES.filter((r) => only.includes(r.cls)) : ALL_RULES;
  const violations: Violation[] = [];
  const notImplemented: string[] = [];

  for (const rule of rules) {
    if (rule.status === "not_implemented") { notImplemented.push(rule.id); continue; }
    violations.push(...rule.check(ctx));
  }

  return {
    ok: violations.length === 0,
    violations,
    coverage: {
      total: rules.length,
      active: rules.length - notImplemented.length,
      notImplemented,
    },
  };
}
