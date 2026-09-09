// T8 — Thing loader / validator. Sof funksiyalar (54§0).
// ASOS: 52 — folder-per-Thing (§2), def.json header uid/version/schema (§4), diagram.svg MAJBURIY (§2),
//   birlik har raqamli maydonda majburiy (§4), FAQAT deklarativ — ifoda/kod yo'q (§7), bir maydon bitta
//   EGAGA (§6), namespaced index — fs-walk emas (§10), havolalar ASIKLIK (§10), examples/ publish uchun (§2)
//   + 54§3 "T8 gate" (diagramsiz publish bo'lmaydi; o'ziники bo'lmagan maydonni yozgan Thing rad).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export interface FieldDef { name: string; value: unknown; unit?: string; numeric?: boolean; }
export interface ThingDef {
  id: string;      // vendor.kind.slug (namespaced, §10)
  uid: string;
  version: string;
  schema: number;
  kind: string;    // materials/hinges/types/... (§3)
  name: Record<string, string>;
  fields: FieldDef[];
  refs?: string[]; // boshqa Thing id lari (asiklik uchun)
  origin?: { source?: string; publisher?: string; signed?: boolean; forked_from?: string }; // 52§4
  retired?: boolean; // 52§4: retired — picker'dan yo'qoladi, eski loyihalarга hali resolve bo'ladi
}
export interface Thing {
  def: ThingDef;
  hasDiagram: boolean;  // diagram.svg bormi
  hasExamples: boolean; // examples/ bo'sh emasmi
}

/** 52§6: har maydon bitta EGAGA (kind). Boshqa kind yozsa — rad. fieldName -> owning kind. */
export type Ownership = Record<string, string>;

/** 52§7: deklarativ only — ifoda/formula/kod alomatlari. */
function looksLikeExpression(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return /^\s*=|=>|\bfunction\b|\$\{/.test(v) || v.includes("`");
}

/** 54 T8-gate + 52: Thing publish qilsa bo'ladimi? Bo'sh massiv = ha; aks holda rad sabablari (nomlangan). */
export function canPublish(thing: Thing, ownership: Ownership): Refusal[] {
  const out: Refusal[] = [];
  const d = thing.def;
  if (!thing.hasDiagram) out.push({ rule: "publish.diagram", message: `${d.id}: diagram.svg majburiy (52§2) — publish bo'lmaydi` });
  if (!thing.hasExamples) out.push({ rule: "publish.examples", message: `${d.id}: examples/ o'tishi shart (52§2)` });
  if (!d.uid || !d.version || !d.schema) out.push({ rule: "publish.header", message: `${d.id}: uid/version/schema majburiy (52§4)` });
  for (const f of d.fields) {
    if (f.numeric && !f.unit) out.push({ rule: "publish.unit", message: `${d.id}.${f.name}: raqamli maydonda birlik majburiy (52§4)` });
    if (looksLikeExpression(f.value)) out.push({ rule: "publish.declarative", message: `${d.id}.${f.name}: ifoda/kod taqiqlangan — faqat qiymat (52§7)` });
    const owner = ownership[f.name];
    if (owner !== undefined && owner !== d.kind) out.push({ rule: "publish.ownership", message: `${d.id}: '${f.name}' maydoni '${owner}' egaligida, '${d.kind}' yoza olmaydi (52§6)` });
  }
  return out;
}

/** 52§10: namespaced index (uid bo'yicha) + havolalar ASIKLIK tekshiruvi (DFS). fs-walk emas. */
export function buildIndex(things: Thing[]): { index: Map<string, Thing> } | Refusal {
  const index = new Map<string, Thing>();
  const byId = new Map<string, Thing>();
  for (const t of things) { index.set(t.def.uid, t); byId.set(t.def.id, t); }
  const state = new Map<string, number>(); // 0=oq,1=kulrang,2=qora
  const visit = (id: string): boolean => {
    const t = byId.get(id);
    if (!t) return false;
    state.set(id, 1);
    for (const r of t.def.refs ?? []) {
      const s = state.get(r) ?? 0;
      if (s === 1) return true;
      if (s === 0 && visit(r)) return true;
    }
    state.set(id, 2);
    return false;
  };
  for (const t of things) {
    if ((state.get(t.def.id) ?? 0) === 0 && visit(t.def.id)) {
      return { rule: "refs.cycle", message: `52§10: tsiklik havola aniqlandi — ${t.def.id}` };
    }
  }
  return { index };
}
