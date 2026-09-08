# 48 — Sheet Logic

The building canvas. Foundation document; `49`–`53` extend it.

**Status:** amended. The original twelve laws were red-teamed twice; the verdicts are recorded in
`49_VERDICTS.md`. What follows is the surviving text, not the original. Where a law was rewritten,
the old form is named so nobody re-introduces it from memory.

---

## 0. The model in one page

A wall is a **Sheet**. A Sheet holds **lines**; everything else is derived.

- **Line** — vertical or horizontal, global to the wall, with a **stable id** and a **position**
  (its centreline, integer mm). Lines have no width.
- **Segment** — the piece of a line between two crossing lines. A segment carries **thickness**:
  `0` (no board), `16` (one shared board), `32` (two boards back to back). Thickness is per
  **segment**, on both axes — never per line.
- **Junction** — where a vertical segment crosses a horizontal segment, both with thickness > 0.
  Carries a **priority**: which board runs through.
- **Cell** — the area bounded by four lines.
- **Block** — a rectangle of cells, with a type that owns its part recipe.
- **Module** — derived, not authored: a maximal set of cells not separated by a 32 segment.
- **Part** — one physical board. Derived from segments and junctions. Never stored.

The two orthogonal decisions the whole model rests on:

| Question | Mechanism | Lives on |
|---|---|---|
| One board here, or two? | **thickness** (0 / 16 / 32) | the segment |
| Which board runs through? | **priority** (V-through / H-through / neither) | the junction |

Both axes, same mechanism. Everything else derives.

---

## 1. Laws

**L0 · Transactions.** Invariants hold *between* operations, never during them. Every operation is
one named atomic transaction; sums, fullness and minimums are checked at commit. A transaction
either commits whole or is refused whole.

**L1 · Face ordering, not sum-of-widths.** *(rewritten — the original "Σ widths = wall length" is
dead.)* Once lines have thickness, the invariant is in face coordinates: for every adjacent pair of
lines, `rightFace(Lᵢ) + minimum(interval) ≤ leftFace(Lᵢ₊₁)`. Sum-of-widths cannot express a
negative interior; face ordering can.

**L2 · Positions are authored; sizes are derived.** A line has a position. A block has **no width
of its own** — its dimensions come from the lines that bound it. Toggling a seam 32 → 16 grows both
interiors by 8, moves no line, and L1 holds for free.

**L3 · Fullness is per layer.** Layers: `behind / carcass / front / above`. Only the carcass layer
must be full — every carcass cell belongs to exactly one block. A plinth in the `front` layer
overlapping three carcasses is legal.

**L4 · Blocks are rectangles. Modules are not.** A block is a rectangle of whole cells. A module is
whatever the shared seams make it, and a base cabinet sharing a panel with a floor-to-ceiling
pantry is a legal L-shaped module.

**L5 · Vertical lines are global and unbroken.** A line runs the full height; a block may span it.
This costs nothing in expressiveness — a union of boundaries expresses anything per-band tracks
could — but it costs real **cardinality**, and that cost is paid by L5a, not denied.

**L5a · Line locality.** A line's position is physically meaningful only in the rows where a board
*terminates* on it. A block that spans a line is unaffected by that line moving. This is what makes
scoped equalize sound, restricts minimums to where blocks terminate, and lets the UI dim lines that
mean nothing at the height under the pointer.

**L5b · ε-snap.** Two lines closer than ε are the same line. ε is **model space (1mm)**, never
screen pixels; pointer targeting uses a separate, differently-named screen radius. Snapping
clusters against **committed** positions only, never chained within one operation. Minimums are
evaluated *after* snap, at commit (L0).

**L6 · A board is a run, and a run has a constant thickness.** *(absorbed into junctions.)* A board
is a maximal run of collinear segments joined at through-junctions. **A change of thickness
terminates the run**; so does a change of material or grain. Three stacked blocks and one tall
block therefore differ by junction data, not by an assertion anyone has to defend in code — and
they can never silently swap, because swapping requires a named, logged operation.

**L7 · Horizontals are lines, not rows.** *(rewritten.)* "Panel rows" do not exist. A worktop is a
horizontal segment with thickness, ranked above `side`, so the base's missing top board falls out
with no special case. Whether a plinth is *in-plane* (between the sides, forming junctions) or an
*overlay* (in front, forming none) is a property of the **panel instance set by the profile**, not
of its name.

**L8 · Refusals, never clamps.** An edit that breaches a minimum is refused whole and **names the
rule that refused it**. It never silently snaps to legal. Minimums belong to **occupants**, not
columns: a column's effective minimum is the max over whatever occupies it in any row, so a 3mm
filler is not refused by a 150mm carcass minimum.

**L9 · Delete produces Void, never a hole.** Deleting a block turns its cells into an explicit
**Void**. Two subtypes, because they are not the same fact:
- **Void** — genuinely nothing.
- **Reserved** — an appliance slot or obstacle. No parts, but dimensioned, named, immovable,
  **exempt from equalize**, carrying `nominal + clearance per face` (clearance from the profile,
  never baked into the number) and a layer tag.

"Delete and close the gap" exists as an explicit **Absorb** command — left neighbour takes it —
never as a consequence.

**L10 · Automatic normalization must be provably inert.** *(replaces "no consequences ever".)*
Automatic behaviour is permitted only if it **provably cannot change the part list** and is
idempotent. Merging adjacent Voids passes. Removing a line whose every segment is Void-to-Void
passes. Auto-equalize fails. This is a test, not a taste.

**L11 · Drag shows its legal range.** Resizing takes from the neighbour, per row, only where both
sides terminate (L5a). The legal range is shown *during* the drag — visible hard stops are neither
silent clamping nor refusal-after-the-fact.

**L12 · Parts are derived.** The Sheet stores geometry and decisions; parts are a pure function of
both. Nothing is stored that could disagree with the sheet. Overrides exist, but as first-class
annotations keyed to part identity (`53` §4), re-validated on every derive.

**L13 · Every operation reports its legal domain before it is attempted.** Split, delete, share a
seam, flip a junction, change a profile — each answers *"what would be accepted right now"* without
mutating. This is what makes illegal moves unavailable rather than refused, and it is why the app
can feel like a game instead of a form. **A refusal the legal-domain query could have prevented is
a UI bug, not a user error** — track that ratio.

**L14 · Wall length is an input, not an invariant.** "The wall turned out to be 2980" is a declared
operation: proportional redistribution or last-column-absorbs, named, deterministic, and allowed to
fail loudly when redistribution would breach a minimum.

**L15 · Wall extents are declared.** The wall is an **opening**; the outermost lines' **outer
faces** bound it. End-line thickness is a per-end choice (`0` for wall-hung with no end panel, `16`
with one). Each end is `free | into-corner | against-wall`; an `into-corner` end derives a Reserved
column equal to the adjoining wall's depth, not user-editable.

**L16 · Integers and named residuals.** Positions are integers in mm. Every division that leaves a
remainder names its residual policy (`leftmost-absorbs` / `last-absorbs` / declared per Type).
Never float, never silent rounding.

---

## 2. Junctions

Three topological classes:

- **L** — two quadrants filled. Both boards end. Four per box. Trivial.
- **T** — three quadrants. One runs through, one butts. Every shelf, divider and worktop meeting a
  pantry side. The bulk of a real kitchen.
- **X** — four quadrants, four boxes meeting at a point.

**Thickness decomposes X.** If the vertical segment at the crossing is 32 (a module boundary), it
is not an X — it is two independent T junctions, one per module. Only a shared (16) segment makes a
true X. **X junctions exist only inside a module**, so the hard case is rare and always local.

States: `V-through`, `H-through`, `neither`. **`both` is physically impossible and refused at
commit** — there is no half-lap in LDSP.

**Assignment, in three tiers:**
1. **Rank from the profile** — computed, covers ~98%. `worktop > side > top/bottom > shelf`.
   Ties are **refused**, never defaulted silently.
2. **Module convention** — flip a whole box at once.
3. **Per-junction override** — badged, listed, countable.

A flip changes dimensions (`V-through` at both top junctions: top = 800 − 32; flipped: top = 800,
sides shorter by 32), so it is a transaction that can be refused and belongs in the L13 legal-domain
query. **An override must not evaporate**: if a line moves so the crossing disappears, the override
surfaces as a conflict, never vanishes.

**The rule that silently wrecks three-level kitchens if wrong:**

> A high-rank horizontal crossing a vertical block that **spans** that height produces **no board
> inside it**. The junction is V-through, the horizontal terminates, the spanning block gets
> nothing.

Without it, every floor-to-ceiling pantry beside your bases quietly grows a shelf at 850.

---

## 3. Derived until touched

> **Every position is derived until it is touched. Touching it pins it.**

Fartuk height is upper-bottom minus worktop-top; nobody types it. So a position is either
**authored** or **derived from a declared relation**. Move the worktop and the uppers follow — until
someone pins one, and then it does not, and the pin is visible on screen.

This does not violate L10, because the relation is declared, visible and breakable.

---

## 4. Depth

Depth is **a block attribute defaulted from the profile**, and a cascadable one (project → zone →
module → part) — not sheet geometry. Stated explicitly because "the sheet derives the cut list" is
otherwise literally false: a side is 560 × 720 and the sheet gives only the 720.

---

## 5. Rendering — two laws, not one

- **Design view**: minimum stroke width in **screen pixels** (~3px), so a board is visible at wall
  zoom without distorting anything. Exaggerating 16 → 48 is **not** a lens: on eight panels it
  invents 256mm, and either the dimensions lie or the interiors do. A true ×2/×3 mode may exist,
  badged, and disabled in any dimensioned or print view.
- **Parts view** (`53`): true scale, no minimum stroke, because its job is dimensional truth and
  print output. If an exaggeration factor ever reaches a print file, every drawing off the printer
  is a lie.

---

## 6. Speed

The laws buy correctness and nothing else. Speed comes from never typing them: a **standards
profile** at project level (thickness, plinth 100, worktop 850, fartuk 600, upper 720, gaps) that
every new block inherits, plus one gesture — *"fill this wall with modules ≤ 900"* — to reach a
plausible state. The laws then govern everything after.

---

## 7. Earning "proved by thousands of builds"

It cannot be asserted, only earned, and the mechanism is cheap:

- **A corpus of real walls as sheet files.** Any law change re-derives every cut list; every board
  that changes is a diff a human signs off.
- **Every refusal logged with the rule that fired.** The most-hit refusal is not user error — it is
  the next design fix. Track refusals per session, and the L13 ratio, as product metrics.
