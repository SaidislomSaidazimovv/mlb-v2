# 54 — Roadmap

How `48`–`53` become a working app. Written for Saidislom.

---

## 0. How the work splits

| | Writes | Does not touch |
|---|---|---|
| **AI (Claude)** | the engine — pure functions, no UI, no I/O, every one with tests | React, screens, gestures, styling |
| **Saidislom** | screens, gestures, state wiring, everything a user touches | engine internals |

The seam between us is **§2, the API**. It is frozen before either side starts. Neither side reads
the other's internals — Saidislom calls functions; the engine never imports React.

**Why this works here:** every law in `48`–`52` is a pure function of data. There is no law that
needs a screen. So the whole rule system can be written, tested and proven before a single pixel
moves — and then the UI is a thin thing over an engine that already cannot be wrong.

---

## 1. The migration strategy — read this before Task 1

The app today has `apps/app/src/model/grid.ts`: per-band column tracks, 301 passing tests, real
customers' geometry. `48` replaces its core idea (per-band tracks → global lines with positions and
thickness).

**Do not rewrite `grid.ts` in place.** The new core grows beside it, in `src/poligon/model/`, and
the app switches only when the corpus proves parity. Concretely:

```
today          apps/app/src/model/grid.ts        ← the app runs on this
building       apps/app/src/poligon/model/*      ← the new core grows here, tested
parity gate    corpus: every saved wall derives the same cut list through both
switch         the app's screens re-point at the new core, one screen at a time
retire         grid.ts deleted when nothing imports it
```

Полигон is where the new core lives while it grows. That is its whole purpose: a place to build the
real engine against real geometry without a customer-facing screen depending on it yet.

---

## 2. The API — frozen first, changed only by agreement

```ts
// ─ sheet ─────────────────────────────────────────────────────────────────────
createSheet(opening: Opening, ends: WallEnds): Sheet
apply(sheet: Sheet, op: Op): Result<Sheet, Refusal>   // L0: atomic, named, whole-or-nothing
legalDomain(sheet: Sheet, op: OpKind, target: Target): Domain   // L13: what would be accepted

// ─ derivation (P0→P4) ────────────────────────────────────────────────────────
derive(sheet: Sheet, profile: Profile, rules: Rule[]): Derivation
//  Derivation = { parts, modules, junctions, facets, provenance }

// ─ rules ─────────────────────────────────────────────────────────────────────
resolve(part: Part, property: Property, rules: Rule[]): Resolved   // ✅ built
blastRadius(parts: Part[], rule: Rule, rules: Rule[]): BlastRadius // ✅ built

// ─ validation and output (P5→P6) ─────────────────────────────────────────────
validate(d: Derivation): Refusal[]
release(d: Derivation, shop: ShopConvention): Release
diffReleases(a: Release, b: Release): PartDiff[]

// ─ things ────────────────────────────────────────────────────────────────────
loadThings(dir: string): ThingIndex
lockOf(project: Project, index: ThingIndex): Lock
checkLock(project: Project, index: ThingIndex): LockStatus
```

Three rules about the seam, all non-negotiable:

- **Every function is pure.** Same inputs, same outputs, no hidden state. This is what makes
  incremental invalidation sound (`50` §6) and the corpus meaningful.
- **Nothing mutates.** `apply` returns a new Sheet or a Refusal. Undo is a stack of Sheets.
- **Every refusal carries the rule that fired and a link to the setting that would resolve it**
  (`50` Law E). A refusal that cannot be acted on in one click is a bug.

---

## 3. Tasks

Ordered by dependency. Each has a **gate** — it is not done until the gate passes.

### Foundation — the sheet core

**T1 · Sheet primitives** — AI
Lines with stable IDs and integer positions; segments with thickness 0/16/32 on both axes; cells;
blocks. Face-coordinate invariant (L1), ε-snap (L5b), integer residuals (L16).
*Gate:* a sheet round-trips through every operation with L1 never violated at commit.

**T2 · Junctions** — AI · needs T1
L/T/X classification; priority from profile rank; `both` refused; per-junction override with
structural key; the spanning-block rule (`48` §2).
*Gate:* the 800-carcass case — `V-through` gives top 768, flipping gives top 800 and sides −32, one
derivation, zero branches. A pantry crossing a worktop line grows no shelf.

**T3 · Board runs** — AI · needs T2
Maximal collinear runs joined at through-junctions; terminated by a change of thickness, material
or grain (L6).
*Gate:* base + pantry sharing a line emit **one** 2400 board, and the base has no right side.

**T4 · Modules** — AI · needs T3
Derived from 32-segments; arbitrary shape; transport check against profile max width/weight.
*Gate:* toggling one seam fuses two modules into one and the transport warning fires.

### The operation layer — what makes it feel like a game

**T5 · Ops and legal domain** — AI · needs T1
Every operation as a named transaction (L0); `legalDomain()` for every op kind (L13); refusal
registry with rule names.
*Gate:* every op answers "what would be accepted" without mutating; the refusal log records the
rule that fired.

### The rule system

**T6 · Facet tiering** — AI · partly built
Split existing facets into Tier-0 (topology, no geometry) and Tier-3 (needs final dimensions).
*Gate:* `adjacency` computes with geometry stubbed out; `edge_exposure` refuses to.

**T7 · Cascade P1/P4 + stratification** — AI · partly built · needs T6
Split resolve into geometric (Tier-0 predicates only) and appearance passes; reject a P1 rule
matching a Tier-3 facet **at authoring time**, not at run time (`51` D8).
*Gate:* `51`'s E1 cyclic rule is rejected when written; E2 exposed-end-panel is accepted.

### Data as files

**T8 · Thing loader** — AI · independent, can run in parallel
Folder-per-Thing; `def.json` header with `uid`/`version`/`schema`/`origin`; namespaced index, never
a filesystem walk; acyclic reference check; declarative only, no expressions (`52` §7); units
mandatory; `examples/` must pass to publish.
*Gate:* a Thing missing its diagram cannot publish; a Thing writing a field it does not own is
rejected.

**T9 · Lockfile** — AI · needs T8
`(uid, version, content-hash)` for every Thing a project touched; refuse to emit a cut list when
the lock does not match; reverse index for blast radius across projects.
*Gate:* same project + same lock → byte-identical cut list on another machine. Changed Thing →
refusal, not a silently different list.

### Output

**T10 · Validation (P5)** — AI · needs T3, T7
Minimums by occupant, collisions per layer, material domains, feasibility.
*Gate:* every refusal names a rule and a settable file.

**T11 · Release (P6)** — AI · needs T10
Finished → cut arithmetic with shop convention; handedness; grain; 0.1mm parts resolution;
immutable numbered releases; `diffReleases`; the pre-flight list (`53` §1).
*Gate:* re-releasing after a change lists exactly which boards grew, appeared and vanished, and
part numbers never move.

### Interface — Saidislom

**T12 · Sheet editor on the new core** — Saidislom · needs T1, T5
Drag a line, split, delete → Void, Absorb. Legal range shown **during** the drag (L11). Lines that
terminate nothing at the pointer height are dimmed (L5a).
*Gate:* no illegal state reachable by gesture; the drag never clamps silently.

**T13 · One inspector** — Saidislom · needs T7
Tap any board: length, junctions, colour, kromka — each with the rule that decided it and a link to
that setting. One screen, every decision.
*Gate:* every value shown names its rule.

**T14 · Generated settings screens** — Saidislom · needs T8
The settings UI is **generated from Thing defs** — fields, units, domains, diagram. Never
hand-built per setting.
*Gate:* adding a new Thing folder makes a new settings screen appear with no UI code written.

**T15 · Parts view** — Saidislom · needs T11
Drawing + table with two-way selection; true scale, no minimum stroke; kromka vector drawn outside
the cut rectangle; deletion is a segment edit, never a delete (`53` §3).
*Gate:* 400 parts navigable; a print file never carries an exaggerated stroke.

### Cross-cutting

**T16 · Corpus and CI** — both · starts at T3
Real walls as sheet files; `(wall × profile × theme)` triples; every law change re-derives all and
diffs; the eight fixtures named in `51` §6 as the minimum first set.
*Gate:* those eight pass and stay passing.

---

## 4. What the AI writes right now

Ready to start immediately, no blockers, in this order:

1. **T1 Sheet primitives** — the whole file, with tests. Everything else waits on it.
2. **T2 Junctions** — the piece the founder asked about most. Small, local, high value.
3. **T3 Board runs** — where the cut list actually comes from.
4. **T5 Ops + legal domain** — turns refusals into greyed-out impossibilities.

Already delivered and passing (`apps/app/src/poligon/model/`, 16 tests):
`roles.ts` (closed vocabulary + rank), `facets.ts` (derivation, module partition, zone-at-block),
`cascade.ts` (layers, conflict, incomplete, blast radius).

Can also be written in parallel any time, since it depends on nothing:
**T8 Thing loader** and **T9 Lockfile**.

Delivery shape, every time: pure TypeScript in `src/poligon/model/`, a test file in
`apps/app/tests/`, no UI imports, no I/O outside T8/T9. Saidislom takes the file and calls it.

---

## 5. The three ways this fails

**The old core never dies.** Two geometry engines, both half-used, drifting. Mitigation: T16 parity
gate is a hard gate, and `grid.ts` is deleted the moment nothing imports it.

**The API drifts.** Saidislom needs one more field, adds it locally, the seam rots. Mitigation:
§2 changes by agreement only, and the engine never imports React — the compiler enforces the
direction.

**Rules become files that can break the engine.** `52` §1 draws the line: policies, tables and
catalogs are data; invariants are code. If a law ever becomes editable, every promise in `48`–`53`
evaporates. Litmus: *if editing it can produce a model that is wrong rather than merely different,
it is code.*
