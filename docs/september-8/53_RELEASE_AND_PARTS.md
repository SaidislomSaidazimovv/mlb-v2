# 53 — Release and Parts

The step where the model stops being a design and becomes wood. Companion to `48`, `50`–`52`.

---

## 0. What this step is

The founder asked for a stage where "all the furniture is really cut — all parts split, named,
final sizes visible, deep zoom, kromka drawn as vector, print files out of it."

All of that is right. But the visualisation is the byproduct:

> **Release is where the model is audited and bound to real material. The drawing is what falls out
> of it.**

If we build only the deep zoom and the vector kromka, we have built a nicer picture of the same
uncertainty.

**Name it Release, not Split.** "Split" already means splitting a column (`48` operations). Reusing
it for a phase transition would collide in the UI, the docs and the code. The step is **Release**,
the screen is **Parts**, the output is the **cut list**.

---

## 1. Three things happen here that cannot happen during design

**Nominal becomes actual.** During design a board is symbolic — "16mm". At release it is 15.8mm of
a named decor from a named supplier, with 0.4 or 2.0 kromka on named edges. Real LDSP is not 16.

**Finished becomes cut.** This is the single most common real-world error in furniture CAD, and it
will bite us: a fasad banded 2mm on four edges is **cut 4mm smaller** than its finished size. Some
shops enter finished, some enter cut, and the convention differs between two workshops using the
same file.

> **The model stores FINISHED dimensions. The Parts view emits CUT dimensions, and shows both, side
> by side, always.** The convention is a shop setting on the output stage.

Kromka is drawn as vector **outside** the cut rectangle, so the picture itself states the
convention and cannot be misread.

**Completeness is checked.** The pre-flight list is worth more than the visualisation:

- every Reserved space with no filler or scriber decided
- every exposed edge with no kromka assigned
- every module over transport width or weight
- every junction where a rank tie was never resolved
- every override now in conflict
- **every wall still marked *estimated* rather than *measured***

That last one is not a phase, it is data quality. Two different things are fuzzy during design and
only one of them is a stage:

| Fuzzy thing | What it is | Resolved by |
|---|---|---|
| Junctions, kromka, material undecided | a real phase | Release |
| The wall has not been measured yet | data quality | a flag; release against an estimated wall warns loudly or refuses |

Conflating them is how a job gets cut against a guessed wall — a whole sheet of material.

---

## 2. The design stays live

Three ways to handle "the design changed after the cut", and only one is right:

- *Snapshot* — dead copy; all part-level work lost on re-cut. Useless.
- *Bake and detach* — design becomes read-only. Too rigid.
- **Live derivation with an immutable release.** ✔

> **Parts are always derived. A Release is a signed, numbered, immutable snapshot of that
> derivation. The design stays live. Changing the design never mutates a release — it produces
> Release 2, and the app shows the diff against Release 1.**

**That diff is the most valuable artefact in the product.** The expensive question in a working
shop is never "what are the sizes" — it is *"we already cut forty of these; what actually
changed?"* Boards that grew, boards that appeared, boards that vanished.

**Part numbers are assigned at release and never reused within a job.** A part with the same
structural identity keeps its number across releases; a new part takes the next free number;
nothing is ever renumbered. Staff write those numbers on the wood in pencil — renumbering is not a
UI annoyance, it is scrap.

Identity is `role + bounding line IDs` (**IDs, not positions** — `51` §H1: identity by position
orphans every pin on the first migration).

---

## 3. There is no "delete part"

Deleting a shelf is harmless. Deleting a **side panel** is not: the sheet still says there is a
16mm segment there, so the parts document and the model disagree, L12 dies, and no cut list is ever
trustworthy again.

> **There is no delete-part operation. There is only "set this segment to no board" — and the Parts
> view is a way of tapping it.**

Delete a side → that vertical segment goes to thickness 0. Delete a shelf → that horizontal segment
goes to 0. The sheet stays the single source of truth, the deletion survives every future
re-derive, undo works, and the Parts view becomes **an editor of the same model at finer
granularity** rather than a second document that drifts.

The overlay then carries only things with no geometric representation — a manual note, a label,
*"cut this one 2mm short, the wall is out of square"*. A much smaller and safer surface.

Two exceptions to write down:

- **Attached items** — hinges, legs, handles, connectors. Not sheet geometry; they belong to the
  archetype or module, and deleting one edits its owner. Still no free-floating deletion anywhere.
- **Library instances that diverge** — remove a part from a marketplace block and that instance is
  modified: flag it and exclude it from auto-update, or a library revision silently restores the
  part you deleted, six months later, on a job you already quoted.

---

## 4. Overrides

Law 12 ("nothing stored that could disagree") breaks on day three, when one board must be 5mm short
for a reason no model captures. That must arrive as a designed channel, not a workaround.

- Keyed to **part identity**, rendered as *overridden*, re-validated on every derive.
- If the underlying part changes or vanishes, the override **surfaces as a conflict** — never
  silently applies, never silently disappears.
- **Numeric overrides default to deltas; categorical overrides default to absolute.** "50 less than
  its group" survives a later global change; "510" orphans the moment the group moves.
- **An override inventory** — one panel, every override in the project, clearable in one click.
  A cascade without one is unmaintainable by build 500; that is the specific way these systems die.

Refusals name the right thing: *"shelf in module B has a −50 override and would be 150 (min 180)"*,
never "invalid depth".

---

## 5. Attributes that are wrong-output-guaranteed if missed

- **Handedness.** A left side and a right side are mirror parts the moment one edge is banded or
  one face is drilled. `2× side 720×560` with no handedness means the shop bands the wrong edge on
  one of them. Required, not optional.
- **Grain direction.** Mandatory at release. Without it nesting is wrong and matched fronts are
  ruined.
- **Unit change at the boundary.** Design positions are integers in mm. Cut arithmetic introduces
  15.8, 0.4, 2.0 — the parts layer needs **0.1mm resolution**. Declare the change, or accumulate
  rounding across a twelve-cabinet wall.
- **Material gating on runs.** Two collinear, equal-thickness, through-joined segments of different
  material or grain are **two boards**, not one.

---

## 6. The Parts screen

- **Drawing plus table, always, with two-way selection.** At 1000% zoom you cannot find a part; at
  wall zoom you cannot hit an edge. Four hundred parts × four edges is sixteen hundred selectable
  entities — the table is what a workshop reads anyway.
- **True scale, no minimum stroke** (`48` §5). The design view's screen-pixel minimum must never
  leak here.
- **1:1 template prints and fit-to-page cut lists are different documents.** One view must not try
  to be both.
- **Release status** — draft / released / in production / delivered — and one dialog when someone
  edits a design with a live release. Not a workflow app; just enough that a human sees the diff
  before more wood is cut.
