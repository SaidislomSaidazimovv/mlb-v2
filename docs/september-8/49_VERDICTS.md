# 49 — Verdicts

Decision log for `48_SHEET_LOGIC.md`. Two red-team passes; this records what survived, what was
amended, what was cut, and what the founder ruled. Kept because `50`–`52` cite it, and because a
law nobody can trace the reasoning of gets re-litigated every six months.

---

## Original twelve laws — scorecard

| Law | Verdict | Where it went |
|---|---|---|
| 1 · Σ widths = wall length | **Rewritten** | L1 face ordering. Sum-of-widths cannot express a negative interior. |
| 2 · Σ heights = ceiling | **Rewritten** | L2 positions-not-widths, both axes. |
| 3 · Fullness | **Kept, amended** | L3 — fullness is now **per layer**; only carcass must be full. |
| 4 · Blocks are rectangles | **Kept** | L4 — but modules are explicitly *not* rectangles. |
| 5 · Vertical lines global | **Kept, amended** | L5 + L5a line locality + L5b ε-snap. The claim that it was *free* is **cut** — it costs cardinality, paid by L5a. |
| 6 · Vertical block never cut | **Absorbed** | Now a consequence of junction data (L6), not an assertion defended in code. Called "the best thing in the document" and it survives by becoming derivable. |
| 7 · Horizontal run stops at a crossing block | **Rewritten** | L7 — was wrong for plinth, shapka and fartuk (overlays run past). Panel-rows deleted entirely. |
| 8 · Refusals not clamps | **Kept, amended** | L8 — minimums belong to **occupants**, not columns. |
| 9 · Delete → Empty | **Kept, amended** | L9 — Void vs Reserved split; adjacent merge; explicit Absorb command. |
| 10 · Equalize is a command | **Generalised** | L10 — automatic behaviour is permitted iff provably inert and idempotent. A test, not a taste. |
| 11 · Neighbour absorbs | **Kept, amended** | L11 — legal range shown *during* the drag. |
| 12 · Parts are derived | **Kept** | L12 — with the override channel of `53` §4 as the designed exception. |

## Laws added

L0 transactions · L5a line locality · L5b ε-snap · L13 legal domain · L14 wall length is an input ·
L15 wall extents declared · L16 integers and named residuals.

---

## The two structural moves

Both **delete** rules rather than adding them, which is why they were adopted:

1. **The junction rule** — absorbs Law 6, the horizontal seam, and the panel-row concept. Two
   orthogonal mechanisms on both axes: thickness on segments (one board or two), priority on
   junctions (which runs through).
2. **Line locality (L5a)** — absorbs the scoped-equalize contradiction and the global-track
   interaction tax. Converts the cost the document was hiding into a cost that does not exist.

---

## Founder rulings

| Question | Ruling |
|---|---|
| Junctions | Adopted — **must be choosable**. Implemented as three tiers: profile rank → module convention → per-junction override (`48` §2). |
| Modules | Blocks combine into modules; inner sides shared; module edges uncut. Reconciled with derivation: a module is **derived** from shared seams, not authored — same outcome, one source of truth. Amended from "one row blocks" to arbitrary rectangles, then to arbitrary shapes, because base + pantry sharing a 2400 board is L-shaped. |
| Scribes | **Not geometry.** They are 3D components. The sheet still holds a Reserved column for the space they occupy. |
| Depth | **Not deferred.** Needed for 3D and because inner drawers and shelves differ. Modelled as a cascadable block attribute (`48` §4). |
| Table lines | Straightforward by default, **breakable** — became "derived until touched" (`48` §3). |
| Auto-grouping | Named the most important principle. Full treatment in `50`. |
| Exaggerated thickness | Requested as a lens; **cut** — it invents wall length. Replaced by a minimum screen-pixel stroke (`48` §5). |

---

## Still open

- Whether `zone` should be **only** block-declared, deleting geometric derivation entirely
  (`50` §7). Law E argues yes; ergonomics argue for a derived suggestion the user confirms.
- Cross-Theme composition beyond refusal.
- Sampling strategy for the combinatorial corpus.
