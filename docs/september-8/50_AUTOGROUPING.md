# 50 — Auto-Grouping

Status: agreed. Companion documents: `48_SHEET_LOGIC.md`, `49_SHEET_REDTEAM.md`, `51_LAW_D_STRESS.md`.

---

## 0. What this document decides

How a value — a colour, a kromka, a material, an offset — reaches a board without anyone selecting that board.

The phrase "auto-grouping" hides two mechanisms that must never be merged:

- **Cascade** — a value flows down scopes and can be overridden lower. This is how *"change fasad colour"* touches every fasad.
- **Selection** — a set of specific things. This is how *"these five doors"* works, and it does not survive contact with editing.

Cascade scales. Selection does not. The whole design is the refusal of selection at the model level.

---

## Law A — a group is a predicate, never a list

> **A group is a query over derived parts. Membership is computed at resolve time and is never stored. Storing membership is forbidden anywhere in the model, in any file, in any shared Theme.**

The failure Law A prevents: store `group#3 = [P17, P22, P41]`, then add a cabinet and its side has no kromka; share a seam and a member silently vanishes; widen a column and the group is stale but still *looks* right. That last one is the dangerous case, because it reaches the workshop.

Consequence: the reach of auto-grouping is bounded entirely by **the vocabulary a part carries about itself**. If a user cannot say their intent as a predicate, they will hand-select, and every hand-selection is a future wrong cut. The facet vocabulary is therefore not a detail — it is the feature.

---

## 1. Facets

Facets are derived beside the part. None are typed in by the user. They are the only things a predicate may match on.

| Facet | Tier | Derived from | Values |
|---|---|---|---|
| `role` | 0 | Type part recipe | side, top, bottom, shelf, fasad, back, plinth, worktop, … |
| `layer` | 0 | Type | behind, carcass, front, above |
| `axis` | 0 | geometry | vertical, horizontal |
| `adjacency` | 0 | block graph | free-end, abutting, wall-facing |
| `zone` | 0 | owning block (declared, see Law B) | base, upper, tall, island |
| `module` | 0 | module partition | id |
| `span` | 0 | junction runs | terminating, spanning |
| `block.tags` | 0 | **user, on the block** | free labels |
| `edge_exposure[4]` | 3 | final geometry | exposed, hidden, semi |
| `size` | 3 | final geometry | for range predicates |

**Tier matters and is not cosmetic.** Tier-0 facets are knowable from the sheet's topology before any geometry is computed. Tier-3 facets require the final dimensions. A rule that sets a geometry-bearing parameter may match Tier-0 facets only. See §5 and `51_LAW_D_STRESS.md` §E — this is what makes resolution provably terminate.

**`edge_exposure` is the facet that proves the design.** The real industry rule is not "sides get 2mm kromka", it is *"exposed edges get 2mm ABS, hidden edges 0.4 or none"*. Share a seam between two carcasses and that panel's faces stop being exposed; the banding rule re-fires; the cut list and the price both change. No stored group could ever do that.

**Tags live on blocks and modules — never on parts.** Blocks are authored and persist. Parts are derived and have no stable existence between edits. A rule matches a part *through* its block's tags. Break this and every tag orphans on the first drag.

---

## 2. The cascade — strict layers, no specificity

```
system defaults
  → catalog        (ships with a Type)
    → theme        (rule pack)
      → project profile
        → wall
          → module
            → block
              → pin (part-identity exception)
```

```
resolve(part, property):
    winner = none
    for layer in LAYERS:                       # low → high
        m = [r for r in layer.rules
             if r.property == property and r.predicate(part)]
        if m:
            if not all_equal(v.value for v in m):
                raise Conflict(layer, property, part, m)   # refuse, name both rules
            winner = m[0]
    if winner is none:
        raise Incomplete(property)             # system layer must be total
    return winner
```

Two decisions carry the weight:

**The highest matching layer wins outright.** A narrower predicate does not beat a higher layer. `all fasads white` at project level loses to `module M fasads oak` at module level regardless of how specific the project rule was. One axis of authority, readable by a human in three seconds. CSS specificity arithmetic is explicitly rejected.

**Within a layer, disagreement is a Conflict, not a tiebreak.** No source order, no last-wins. It surfaces, names both rules, and refuses. This is Law 8 (refusals, not clamps) applied to values instead of dimensions, and it is the only thing that keeps shared Themes sane.

The system layer must be **total** — it defines every property for every part — so resolution can never return null.

---

## Law B — no guessing, ever

> **A facet that drives a property must be single-valued for the whole part. If a part spans two values of a facet a rule matches on, resolution refuses and names the part. The system never picks.**

The canonical failure: `zone` derived from geometric bands. A tall pantry crosses the base band and the upper band, but its front is **one door — one physical board**. Under geometric derivation it resolves to two colours, which is not merely wrong, it is uncuttable.

Refusal message: *"P-118 (fasad, 2100mm) spans zones `base` and `upper`; rules disagree. Declare zone on block B-14."* The fix is a block-level zone declaration overriding the geometric derivation — one click, permanently correct.

This generalises into the project-wide stance:

**Law E — nothing is inferred.**

> Every value that reaches an output is declared somewhere a user can see and change. When the system needs a value it does not have, it refuses and points at the setting that would supply it. There is no heuristic, no default-by-context, no "usually people mean".

Two enforceable corollaries:

- **Diagram contract.** Every dimensional parameter ships a diagram showing: the datum face highlighted, the direction arrow, the sign convention, and two states (value = 0 and value ≠ 0). A parameter without a diagram cannot be published to the marketplace. This is a publication gate, not a documentation aspiration.
- **Every refusal names the rule that fired and links to the setting that would resolve it.** A refusal that cannot be acted on in one click is a bug.

---

## 3. Two-tone — solved as two rules, not an exception

Two-tone feels like an exception to auto-grouping. It is not; the user's own sentence is already a predicate.

```
rule fasad_color = white  where role=fasad AND zone=upper
rule fasad_color = oak    where role=fasad AND zone=base
rule fasad_color = green  where role=fasad AND block.tag="island"
```

Add a cabinet tomorrow and it is painted correctly the moment it exists. Three-tone, accent column, island in another finish — all the same shape. No selection anywhere, so nothing can go stale.

---

## Law C — isolation by pin, and pins are promotable

- A pin attaches to **part identity**, defined as `role + bounding line IDs` — **IDs, not positions** (see `51` §H: identity by position orphans every pin on the first migration).
- A pin is **per property**. Pinning depth must not freeze colour. Part-level pins are how a model becomes unmaintainable in six months.
- A pin whose part no longer exists becomes an **orphan**: surfaced, never silently dropped, never silently reapplied to whatever moved into its place.
- Pins are **countable and listable**. "This project has 9 exceptions" is a first-class view; a foreman will ask for it.

> **When the same property is pinned to the same value three times, the system offers to lift it into a rule — showing the predicate it inferred and everything else that predicate would newly capture.**

Under Law E the promotion is an *offer with a preview*, never an automatic action, and the inferred predicate is editable before acceptance.

---

## Law D — the geometry firewall (summary; full treatment in `51`)

> **Rules supply parameters to derivation. Rules never write an authored number. Resolution is pure and may never move a line; any rule change that would require a line to move is a Migration — explicit, previewed, atomic, refusable.**

A shelf 50mm shallower is not `depth = 500`; it is `setback.front = 50`, a declared parameter consumed by part derivation. The sheet remains the sole authority over geometry.

Law D as first stated does not survive contact with material thickness, kromka, or hinges. `51_LAW_D_STRESS.md` breaks it in six places and rebuilds it as D1–D12. **Read `51` before implementing anything in this section.**

---

## 4. Nouns

Locked before app 2 exists, because names leak into files and files become a format that cannot be changed.

| Noun | Is | Authored in |
|---|---|---|
| **Part** | one physical board | derived, never authored |
| **Block** | one rectangle in a sheet | app 1 |
| **Module** | blocks combined into one assembly | app 1 |
| **Sheet** | one wall | app 1 |
| **Type** | a parametric block definition | app 2 |
| **Profile** | the standards a project runs on | either |
| **Rule** | one cascade entry | either |

### The shippable split

> **A Catalog ships geometry. A Theme ships rules.**

- **Catalog** — a set of Types plus the Profile they assume. The downloadable-blocks library.
- **Theme** — predicates and values only. Materials, decors, kromka, hardware, finishes. Kids' room, Scandi, matte-black, budget-LDSP.

Because a Theme targets *facets* rather than named parts, it composes across Catalogs it has never seen. This property exists **only** because of Law A. The first Theme in the store that ships a stored selection list ends the composability story for everyone.

**A Theme declares its facet contract.** If it references `tag="island"` and the target project has no such tag, it fails visibly at install — *"this Theme expects 3 tags you do not use"* — and never matches nothing while appearing to work. Silently matching nothing is the number one reason rule systems feel haunted.

**Theme install is atomic.** Partial application — some parts themed, some not, silently — is the cardinal sin. Install produces a full diff, applies entirely, or does not apply.

**Two Themes are the same layer.** Cross-layer conflicts are settled by layer order; two installed Themes both setting `fasad_color` are not. Resolution: refuse at install with a conflict report. Themes are chosen rarely; conflicts are cheap to resolve once and expensive to override silently forever.

---

## 5. The resolution pipeline

The order is not an implementation detail. It is what makes the system terminate.

```
P0  Sheet          lines (stable id + position), segments, junctions, blocks, modules
P1  Resolve GEOMETRIC parameters      predicates may match Tier-0 facets ONLY
                                      thickness class, setbacks, overlays, gaps,
                                      part presence, counts
P2  Derive geometry                   junction resolution → board runs → model dims
P3  Compute Tier-3 facets             edge_exposure, final size
P4  Resolve APPEARANCE parameters     predicates may match Tier-0 and Tier-3
                                      colour, decor, kromka spec, hardware finish
P5  Validate                          minimums, collisions, domains, feasibility
P6  Project to CUT plane              banding subtraction, kerf, tolerance, grain, nesting
```

Feedback from P4 into P1 is impossible by construction. Rule authoring statically rejects any P1 rule whose predicate references a Tier-3 facet — checked when the rule is written, not when it runs.

The apparent casualty is *"exposed end panels use 18mm"*, which looks like a P1 property matching a P3 facet. It is not: coarse exposure — *does a block sit on the other side of this panel* — is **topology**, computable from the block graph with no geometry at all. That is the Tier-0 `adjacency` facet. Fine per-edge exposure, which needs final dimensions, stays Tier-3 and only drives appearance. The stratification costs nothing real.

---

## 6. Standing requirements

- **Blast radius before commit.** Editing one rule can change 200 parts. The rule editor answers *"what would this change"* without mutating — a full speculative resolve. Build it into the resolve API from day one; it cannot be retrofitted.
- **Change ledger.** A derived facet flipping under the user is correct but must be announced: *"12 parts changed, 3 edges unbanded, −4.20."* Auto-grouping without a diff-before-commit is a system professionals will not trust with money.
- **Corpus.** The regression corpus holds `(wall × profile × theme)` triples, not walls. Any law or rule change re-derives all of them; any changed board is a diff a human signs off.
- **Invalidation.** Facet-keyed incremental invalidation. Only sound because resolve is pure and membership is never stored — a second reason Law A is a ban and not a preference.
- **Versioning.** A Catalog update never silently upgrades a project. Types are versioned, projects pin them, upgrade is an explicit operation with a part-level diff.

---

## 7. Open

- Cross-Theme composition beyond refusal (ordered install lists?) — deferred until a real conflict is observed.
- Sampling strategy for the combinatorial corpus.
- Whether `zone` should be *only* block-declared, deleting geometric derivation entirely. Law E argues yes. Ergonomics argue for a derived suggestion the user confirms. Unresolved.
