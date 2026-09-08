// T16 — Korpus / CI harness. Sof funksiyalar (54§0).
// ASOS: 54§3 T16 (real devorlar fixtura sifatida; har qonun o'zgarishi qayta-derive + diff; 51§6 dagi
//   8 minimal fixtura o'tishi va o'tib turishi) + 51§6.
// Harness: har fixtura o'z natijasini beradi (qabul, yoki NOMLANGAN rad); runCorpus kutilgan bilan solishtiradi.
// O'ylab topilgan hech narsa yo'q — fixturalar built modullarni chaqiradi.

export type FixtureOutcome = { ok: true } | { ok: false; rule: string };
export interface Fixture { name: string; run: () => FixtureOutcome; }
export interface FixtureResult { name: string; pass: boolean; detail: string; }

export function runCorpus(
  fixtures: Fixture[],
  expected: Record<string, { ok: boolean; rule?: string }>,
): FixtureResult[] {
  const out: FixtureResult[] = [];
  for (const f of fixtures) {
    const got = f.run();
    const exp = expected[f.name];
    let pass = false;
    let detail = "OK";
    if (!exp) { detail = "kutilgan natija berilmagan"; }
    else if (got.ok !== exp.ok) { detail = `ok=${got.ok}, kutilgan ok=${exp.ok}`; }
    else if (!got.ok && exp.rule !== undefined && got.rule !== exp.rule) { detail = `rule=${got.rule}, kutilgan=${exp.rule}`; }
    else { pass = true; }
    out.push({ name: f.name, pass, detail });
  }
  return out;
}

export const allPass = (results: FixtureResult[]): boolean => results.every((r) => r.pass);
