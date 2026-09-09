// D2 — Type-declared parameters + optional parts. Sof funksiyalar (54§0).
// ASOS: 51 D2 ("rules FAQAT Type-e'lon qilган parametrni yozadi — har biri type/unit/datum/sign/domain/
//   default/diagram bilan; ad-hoc property YO'Q; rules part IXTIRO qilolmaydi; optional part = e'lon qilingan
//   `present:bool` parametr") + G1 ("hamma shkafga orqa panel" — part qo'shadi → faqat Type-declared present)
//   + G2 (inset/overlay orqa = bitta Type enum) + G3 (shelf_count Type param, residual Type e'lon qiladi).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export type ParamKind = "scalar" | "present" | "enum";
export interface ParamDecl {
  name: string;
  kind: ParamKind;
  unit?: string;               // 52§4: raqamli param birligi majburiy
  options?: string[];          // enum uchun (G2: inset/overlay)
  default?: unknown;
  residual?: "leftmost-absorbs" | "last-absorbs" | "distribute"; // G3: bo'linish residual policy (Type e'lon qiladi)
}
export interface TypeDef {
  id: string;
  params: ParamDecl[];
  parts: string[];                                       // doimiy part rollari (recipe)
  optionalParts?: { part: string; presentParam: string }[]; // present:bool bilan boshqariladigan
}

/** D2: qoida property'si Type-e'lon qilган parametr bo'lishi SHART. Aks holda `D2.undeclared` (authoring). */
export function checkRuleParam(property: string, types: TypeDef[]): Refusal | null {
  const declared = new Set<string>();
  for (const t of types) for (const p of t.params) declared.add(p.name);
  if (!declared.has(property)) {
    return { rule: "D2.undeclared", message: `qoida '${property}' ni yozmoqchi, ammo hech qaysi Type uni e'lon qilmagan (D2: ad-hoc property yo'q; qoida faqat Type-param yozadi)` };
  }
  return null;
}

/** D2/G2: enum param qiymati e'lon qilingan options ichida bo'lishi shart. */
export function checkEnumValue(decl: ParamDecl, value: unknown): Refusal | null {
  if (decl.kind !== "enum") return null;
  if (!decl.options || !decl.options.includes(String(value))) {
    return { rule: "D2.badEnum", message: `'${decl.name}' = '${String(value)}' — e'lon qilingan options ({${(decl.options ?? []).join(",")}}) ichida yo'q` };
  }
  return null;
}

/** D2/G1: MAVJUD partlar = Type recipe (doimiy) + optional (present:bool TRUE bo'lganlari). Qoida present'ni
 *  o'zgartira oladi, lekin recipe'da YO'Q partni IXTIRO qilolmaydi. */
export function resolvePresentParts(type: TypeDef, params: Record<string, unknown>): string[] {
  const out = [...type.parts];
  for (const op of type.optionalParts ?? []) {
    if (params[op.presentParam] === true) out.push(op.part);
  }
  return out;
}
