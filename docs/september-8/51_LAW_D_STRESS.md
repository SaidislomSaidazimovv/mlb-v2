# 51 — Law D under stress

Red-team of the geometry firewall. Companion to `50_AUTOGROUPING.md`.

**Verdict up front: Law D as written is false.** It is false in six independent ways, three of which fire on the very first Theme a user installs. The *intent* is correct and worth defending; the *formulation* — "rules never change a dimension" — is not survivable. §3 rebuilds it as D1–D12, which does survive every scenario in §2.

---

## 1. What Law D was trying to say

Original:

> Rules set material, finish, colour, banding, hardware, tolerance, and declared setbacks. Rules never set a dimension. A shelf 50mm shallower is `setback.front = 50`, not `depth = 500`.

The real content underneath is a split between two kinds of number:

- **Authored numbers** — the sheet's line positions. Moved only by a user, only in app 1.
- **Derived numbers** — every board dimension, computed from lines plus parameters.

So the law meant: *rules may supply parameters to derivation; rules may never write an authored number.* The word "setback" was one example, and stating it as the whole permitted set is what makes the law break. Everything below is the search for cases where a rule legitimately must reach geometry.

**Method.** Twenty-nine scenarios in ten attack classes, each taken from real kitchen practice. For each: the setup, what actually breaks, and whether the repaired law covers it. Anything marked ✗ was a genuine hole in the original.

---

## 2. Scenarios

### Class A — material properties that are secretly geometric

**A1 · Thickness. ✗ Fatal.**
A Theme swaps 16mm LDSP for 18mm MDF. Thickness is a material property; Themes ship materials; therefore a rule just changed thickness. But thickness *is* the sheet: it is line-segment thickness, it sets junction offsets, it changes every interior width and every board length. On a 600 carcass with `V-through` junctions, the top goes 568 → 564 and the interior loses 4mm. **A Theme install silently resized the entire kitchen.** Law D dies on the first Theme.
→ D5: thickness is a *geometric material property*. A rule may change material freely **within a thickness class**; crossing a thickness class is a Migration, never a cascade.

**A2 · Mixed thickness inside one carcass. ✗**
16mm sides, 18mm decorative end panel, 8mm HDF back, 10mm glass shelf. Thickness is therefore per-part-role, not per-project — so segment thickness must be *resolved*, not stored as a literal. Geometry now depends on the cascade, which is exactly the dependency Law D was trying to forbid.
→ D1 + P1/P2 pipeline: geometry depends on P1 parameters by design; it must not depend on P4 appearance. The firewall is between *stages*, not between rules and geometry.

**A3 · Grain direction. ✗ (feasibility, not size)**
Theme sets an oak decor with mandatory vertical grain. A 2100mm side on a 2800×2070 sheet now has exactly one legal orientation and may become un-nestable. No dimension changed; the part became unmakeable.
→ D11: feasibility is validated at P6 and refuses by name. Grain is a P4 property with a P6 consequence — never a silent re-orientation.

**A4 · Material minimum span. ✗**
Theme sets 10mm glass shelves. A 900 shelf in 10mm glass deflects; the shop rule is max 800 unsupported. The Theme did not change a size — it invalidated one.
→ D9: materials carry validity domains; a part outside the domain refuses and names the material rule, it does not resize.

**A5 · Decor swap inside a class. ✓ Clean.**
White 16mm → grey 16mm. Nothing geometric. This is the case Law D was designed for and it works perfectly. Worth noting that it is also 90% of real Theme use.

---

### Class B — hardware that dictates geometry

**B1 · Hinge overlay type. ✗ Fatal.**
600 carcass, 16mm sides, 3mm gaps. Full-overlay door ≈ 597 wide. Inset door ≈ 564. **A Theme that changes hinge type changes every door by ~33mm.** Hinge type is unambiguously a hardware property, and hardware was on Law D's permitted list.
→ D6: hardware carries *geometric consequences* declared as parameters (`overlay`, `gap`, `reveal`). Changing them is a P1 parameter change, allowed, previewed, and it changes derived parts only — never a line.

**B2 · Drawer slide brand. ✗**
Ball-bearing slides consume 12.5mm per side; the drawer box outer width = clear width − 25. A different brand consumes 13 or 10. Box widths shift by millimetres across the whole kitchen.
→ D6, same channel. Note it must be `clearance_per_side`, not a hardcoded 25, or the parameter cannot be shared.

**B3 · Drawer slide length quantisation. ✗ Distinct problem.**
Slides exist at 250/300/…/600 only. A 540-deep carcass admits a 500 slide, not a 540. This is not an offset — it is a *snap to an allowed set*, and snapping is choosing, which Law E forbids the system to do.
→ D7: quantised parameters are declared with their allowed set. The system never picks a member; it presents the legal members, and if the current geometry admits none it refuses. Type authors may declare which parameter absorbs quantisation, and that declaration is authored, not inferred.

**B4 · Lift-up fittings (Aventos and similar). ✗**
Impose a minimum carcass height and a forbidden internal zone the shelf cannot enter. A Theme that adds them can make an existing upper illegal.
→ D9: parameters may contribute *constraints* (min, max, forbidden range) that are **checked, never solved**. No constraint solver — validation only, refusal by name. (Solvers are how apps in this category die.)

**B5 · Legs and plinth. ✗**
Legs are 100mm with ±20 adjustment; plinth height is a Profile number. Change legs to 150 and the plinth line must move.
→ D4: this needs a *line* to move → Migration, previewed, refusable. It is not a cascade.

**B6 · Handles. ✓ Clean.**
Position and finish, no dimensional consequence — unless the handle is a gola profile, in which case see B1. The distinction is authored per hardware item, not inferred from its name.

---

### Class C — datum and frame ambiguity

**C1 · A setback with no datum is meaningless. ✗ Fatal.**
`setback.front = 50` — fifty from what? The front face of the side panel, the front face of the fasad, or the carcass opening? Those are three different numbers, separated by fasad thickness plus gap. Change fasad thickness 18 → 22 in a Theme and the shelf either moves or does not, depending on a datum nobody declared.
→ D3: **every dimensional parameter declares its datum face, its direction, and its sign** — and ships the diagram (Law E). A parameter without a datum cannot exist in the model, let alone be published.

**C2 · Local frame per role. ✗**
"Front" for a shelf is depth. "Front" for a back panel is its thickness axis. A Theme authored for shelves applied to backs produces nonsense.
→ D3: each `role` declares a local frame — length / width / thickness axes and named faces. Parameters reference face names in that frame, never world axes.

**C3 · Mirroring and handedness. ✗**
`setback.left = 20` on a module that is then mirrored. World-space setbacks break; local-space ones follow the mirror. Corner runs mirror constantly.
→ D3: parameters are local-frame by definition; mirroring is a frame transform. World-space dimensional parameters are forbidden outright.

**C4 · Sign convention. ✗**
Is a setback ever negative? A full-overlay fasad protrudes past the carcass, which is a negative setback under one reading. If some roles allow negatives and others do not, a shared Theme puts a door inside the box.
→ D3: **setbacks are inward-positive, always.** Protrusion is a separate named parameter (`overlay`) because it has different consequences — collisions (see G) rather than clearances.

**C5 · Setback stacking. ✗**
Shelf setback 50 (from the opening), plus an 8mm back panel, plus a 6mm groove. Do they compose? From which datum?
→ D3: composition is declared per parameter as `additive` or `absolute-from-datum`, and the diagram shows both parameters together. No implicit stacking.

---

### Class D — domain violations and partial application

**D1s · Negative geometry. ✗**
A marketplace Theme sets `setback.front = 550`. Applied to a 400-deep bathroom carcass the shelf has negative depth.
→ D9 + D10.

**D2s · Partial theme application. ✗ Fatal in practice.**
That Theme touches 500 parts and 3 go negative. If it applies to 497 and skips 3, the user has a half-themed kitchen and no way to know which parts are which.
→ D10: **install is atomic.** All, or none, with a report. Never partial.

**D3s · The over-refusal trap.**
But refusing the whole install because 3 of 500 parts are odd makes Themes unusable — the user will fight the app on every download.
→ D9: parameters declare a **validity domain** (`applies where depth ≥ 200`). Outside the domain the rule *does not match* and the value falls through to the next layer down. That is defined behaviour, not failure, and it is authored rather than guessed — Law E holds. Install reports it: *"shelf setback applies to 42 of 51 shelves; 9 are outside the declared domain and use the project default."*

**D4s · Domain interacts with the atomicity rule.**
A domain miss is not a failure, so it does not abort the install; a true violation (negative geometry with no domain declared) is a failure and does. The Theme author decides which they shipped, by declaring a domain or not.
→ Consistent. No change needed.

---

### Class E — cycles between rules and facets

**E1 · The direct cycle. ✗ Fatal and easy to write accidentally.**
Rule: *"parts wider than 900 use 18mm."* Thickness changes interior widths, which changes which parts are wider than 900, which changes thickness. Non-terminating, and the fixpoint may not exist.
→ D8: **stratification.** No property may be matched by a predicate over a facet that depends on that property. Enforced statically at rule-authoring time by walking the dependency graph — the bad rule is rejected when written, not discovered when run.

**E2 · The near-miss that must stay legal.**
*"Exposed end panels use 18mm."* Thickness is P1; `edge_exposure` is Tier-3; under E1's fix this looks forbidden — and it is a completely standard requirement.
→ Resolved by splitting the facet. Coarse exposure (*is there a block on the other side of this panel*) is **topology**, computable from the block graph with no geometry: that is Tier-0 `adjacency`, legal for P1 rules. Fine per-edge exposure needs final dimensions, stays Tier-3, and drives appearance only. The stratification costs nothing real. This scenario is the proof that D8 is workable rather than crippling.

**E3 · Indirect cycle through visibility.**
A setback recesses a panel, which exposes an edge, which changes kromka. Kromka is P4 and feeds nothing, so this terminates — but only because kromka is appearance. If kromka thickness ever fed back into a model dimension (see F1) the cycle would close.
→ D12 closes it: banding lives in the cut plane, which is terminal.

**E4 · Cycle through part presence.**
*"Cabinets over 900 wide get a centre divider."* The divider changes clear widths, but not the cabinet's outer width, which is what the predicate matched. Terminates.
→ Legal, but only by luck of what was matched. D8 must therefore be checked on the *facet*, not on the intent — `size.outer` is Tier-0-derivable from the bounding lines, `size.clear` is Tier-3. Predicate authors must be shown which is which. This is the sharpest edge in the whole document.

---

### Class F — the manufacturing plane

**F1 · Kromka changes cut dimensions. ✗ Fatal, and the most embarrassing one.**
Kromka is the flagship "non-geometric" property in `50`. But a 596 shelf banded 2mm on both long edges is *cut* at 592. Some shops band then trim; some cut undersize then band. The convention differs between workshops using the same file.
→ D12: **three dimension planes.**
  - *Nominal* — design intent.
  - *Model* — derived geometry, the sheet's truth. Law D governs this plane and only this plane.
  - *Cut* — manufacturing output: `cut = model − Σ(banding on that axis) × convention`, plus kerf and tolerance.
  Banding is non-geometric in the model and geometric in the output. The convention is a shop setting on the output stage, so the same file cuts correctly in two different workshops.

**F2 · Kerf and panel yield. ✓ once F1 is fixed.**
Saw kerf never enters the model; it enters nesting at P6.

**F3 · Machining allowances.** Groove depth for a back panel changes the side's *effective* length only if the back is inset. Declared as a parameter with a datum (C1), consumed at P2. ✓

---

### Class G — part count, topology, collisions

**G1 · A rule that changes part count. ✗**
*"All cabinets get a back panel."* That adds parts, which Law D never addressed at all.
→ D2: **a rule may set only parameters the Type has declared** — including declared-optional parts with a `present: bool` parameter. Rules cannot invent parts. Types own the recipe; this was already established and Law D failed to reference it.

**G2 · A rule that changes topology.**
Inset back (grooved) vs overlay back (nailed on) changes part sizes *and* adds a machining op *and* may change side lengths. It is one Type-declared enum, not a free-form rule.
→ D2. Legal, bounded, previewed.

**G3 · Shelf count and spacing. ✗ (residual)**
`shelf_count = 3` in a 1200 opening: spacing is 1200/4 with a remainder. Dividing is the system computing geometry from a rule.
→ Legal under D2 (count is a declared Type parameter), but the **residual policy must be declared by the Type** — top gap absorbs, or bottom, or distribute-then-round-down. Anything else is guessing, which Law E forbids. Same discipline as the equalize residual in `48`.

**G4 · Collisions produced by parameters. ✗**
Two adjacent fasads, each `overlay = 18`, with a 3mm gap: in the closed state they overlap. Or a door whose swing hits an adjacent wall. The front layer is not required to be full (fullness is per-layer), so the sheet's own invariants cannot catch this.
→ D11: **collision validation runs per layer at P5**, on the parameter-derived geometry, and refuses by name. Door swing against a return wall is the standard case and must be in the first version.

**G5 · Corner cabinet blind zones.**
An L-corner unit's reachable interior depends on the neighbour's door width — a parameter on a different module changing a constraint on this one.
→ D9 constraints are cross-part by necessity. Checked, never solved.

---

### Class H — identity, migration, undo

**H1 · Migration destroys pin identity. ✗ Fatal — and it invalidates a decision from `49`.**
`49` defined part identity as `role + bounding segments`, understood positionally. A Migration moves lines. Every pin in the project orphans at once, on an operation the user was told was safe.
→ D1 amendment: **lines carry stable IDs.** Identity is `role + bounding line IDs`. Moving a line preserves every identity; only deleting a line orphans the pins on parts it bounded. This is a correction to `49` §3.3, not an addition.

**H2 · Migration ordering. ✗**
Profile change (worktop 850 → 900) and Theme change (plinth 100 → 150) applied together: the refusal set depends on the order they are applied in.
→ D4: a Migration is one atomic transaction with a declared internal order, and the preview shows the **end state**, never intermediates. Law 0 from `48` already provides the transaction; this names the ordering requirement.

**H3 · Undo across a rule edit.**
One rule edit can change 200 parts. Undo must be at operation granularity, not part granularity.
→ Law 0 covers it, provided rule edits are operations in the same journal as sheet edits. **They must share one journal**, or undo interleaves incorrectly between the two apps.

**H4 · Type version upgrade. ✗**
A Catalog updates a Type. Does the new version rewrite line positions in projects that instantiated it?
→ D4: instantiation writes authored numbers (an operation, legal). Upgrade is a Migration with a part-level diff. Never silent, never automatic.

---

### Class I — the marketplace

**I1 · A Theme meeting geometry it has never seen.** Covered by D9 domains + D10 atomicity.

**I2 · A Theme referencing a facet the project lacks.** Covered by the facet contract in `50` §4.

**I3 · Two Themes setting the same parameter.** Same layer, so layer order cannot settle it → refuse at install with a conflict report. Covered in `50` §4.

**I4 · A Catalog Type assuming a thickness the project does not use. ✗**
A downloaded 18mm-based Type instantiated into a 16mm project. Its junction arithmetic, hinge overlays and slide clearances were all authored against 18.
→ D5: Types declare their thickness class. Cross-class instantiation is a Migration on the Type's parameters, previewed, refusable — **and this is precisely the case the Catalog/Theme split exists to make safe.** The downloaded block adapts or refuses; it never silently produces 2mm-wrong boards.

**I5 · A Theme that is geometrically empty. ✓**
Colour and decor only, inside one thickness class, no hardware. This is what the great majority of shared Themes should be, and it is provably incapable of changing a single dimension. Worth surfacing in the UI as a badge: *"appearance only — cannot change sizes."* That badge is the trust mechanism for the whole marketplace.

---

### Class J — human intent

**J1 · "Make this shelf 5cm less."**
Becomes `setback.front = 50` with a datum the user chose *at pin time*, from a diagram (Law E). If they later change fasad thickness, the shelf moves or does not — according to the datum they picked and can see. No guessing at any point. ✓

**J2 · "Make this cabinet 5cm narrower."**
Not a parameter. That is a line move — app 1, a sheet operation, refusable by minimums. The system must say so plainly rather than inventing a width override. ✓ — and the fact that the two requests sound identical to the user, yet resolve through completely different machinery, is the strongest argument for the diagram contract.

**J3 · "Everything 5mm smaller, the wall measured wrong."**
This is `48`'s wall-length change: proportional redistribution or last-column-absorbs, declared, allowed to fail loudly. Not a rule, not a parameter. ✓

---

## 3. Law D, repaired

**D1 · Two kinds of number.** Authored: line positions, each on a line with a **stable ID**. Derived: everything else. Rules write neither — rules write *parameters*.

**D2 · Rules set only Type-declared parameters.** Each with a declared type, unit, datum, sign, domain, default, and diagram. No ad-hoc properties. Rules cannot invent parts; optional parts are declared parameters.

**D3 · Every dimensional parameter declares its frame.** Local frame per role, named datum face, direction, inward-positive sign, and composition mode. Protrusion is a distinct parameter (`overlay`), never a negative setback. World-space dimensional parameters are forbidden.

**D4 · Resolve is pure and never moves a line.** Any rule change that would require a line to move is a **Migration**: explicit, previewed as an end state, atomic, ordered, refusable, journalled with sheet operations.

**D5 · Thickness is a geometric material property.** Rules may change material within a thickness class. Crossing a class is a Migration. Types declare their class.

**D6 · Hardware carries declared geometric consequences.** `overlay`, `gap`, `reveal`, `clearance_per_side` — parameters, not hidden constants inside a hinge's name.

**D7 · Quantised parameters declare their allowed set.** The system presents legal members and never picks one. If no member is legal, it refuses.

**D8 · Stratification.** No property may be matched by a predicate over a facet downstream of that property. Checked statically at rule-authoring time. Geometric parameters (P1) match Tier-0 facets only.

**D9 · Parameters may contribute constraints — min, max, forbidden range, validity domain — which are checked, never solved.** Outside its declared domain a rule does not match and falls through; it never clamps.

**D10 · Application is atomic.** A Theme installs entirely or not at all, with a full diff. Partial application is forbidden. Domain misses are reported, not failures.

**D11 · Validation at P5 covers minimums, collisions per layer, and material domains; feasibility (grain, nesting, yield) at P6.** All refusals name the rule and link to its setting.

**D12 · Three dimension planes.** Nominal / Model / Cut. Law D governs the Model plane. Banding, kerf and tolerance exist only in Cut, which is terminal and feeds nothing back.

---

## 4. Verification

Every scenario in §2 re-run against D1–D12:

| Class | Scenarios | Covered by | Unhandled |
|---|---|---|---|
| A material | A1–A5 | D5, D9, D11, pipeline | none |
| B hardware | B1–B6 | D6, D7, D9, D4 | none |
| C datum | C1–C5 | D3 | none |
| D domains | D1s–D4s | D9, D10 | none |
| E cycles | E1–E4 | D8 + facet tiering | none — but E4 is the sharpest edge; see §5 |
| F manufacturing | F1–F3 | D12 | none |
| G topology | G1–G5 | D2, D11, residual policy | none |
| H identity | H1–H4 | D1 (stable IDs), D4 | none |
| I marketplace | I1–I5 | D5, D10, facet contract | none |
| J intent | J1–J3 | D2, D3, sheet ops | none |

No two repaired laws contradict. D9 (fall-through outside domain) and D10 (atomicity) came closest and are reconciled by the distinction between a *domain miss* (defined, reported, not a failure) and a *violation* (failure, aborts install).

---

## 5. Remaining thin ice

Ranked by how likely it is to cost real money.

1. **E4 — Tier-0 vs Tier-3 size facets.** `size.outer` (from bounding lines, Tier-0) and `size.clear` (needs final geometry, Tier-3) look identical to a rule author and differ by exactly the thing that creates the cycle. The UI must make them impossible to confuse — different names, different colours, a warning when a predicate uses `size.clear` for a geometric parameter. Everything else in D8 is mechanical; this one is human.
2. **The parameter vocabulary is the real product.** D2 makes rules only as expressive as the parameters Types declare. A missing parameter drives users back to pins, and enough pins is hand-selection with extra steps. Track *pins per project* as a product metric: a rising number means a missing parameter, not careless users.
3. **Constraints are checked, never solved — and users will want solving.** B3/B4 will generate "why can't it just pick the 500 slide" constantly. The answer is Law E, and it must be defended in the UI with a good presentation of legal options, or it will read as the app being stupid rather than honest.
4. **Migration frequency.** If crossing a thickness class is a Migration and users cross it casually, Migration becomes routine and its preview becomes a dialog people dismiss. Watch the ratio of Migrations to cascades; if it climbs, the thickness-class boundaries are drawn wrong.
5. **One journal across two apps.** H3 requires rule edits and sheet edits in a single undo journal. Two apps, two data stores, one journal is an architectural constraint that gets harder to add every month.

## 6. Corpus additions

The scenarios above become fixtures, not prose. Each is a `(sheet, profile, theme)` triple plus an expected outcome — a cut list, or a named refusal.

Minimum first set: **A1** (thickness migration), **B1** (hinge overlay flip), **C1** (datum with fasad thickness change), **E1** (cyclic rule, must be rejected at authoring), **E2** (exposed end panel, must be accepted), **F1** (banding vs cut dimension, both shop conventions), **H1** (pin survives migration), **I4** (18mm Type into a 16mm project).

If those eight pass and stay passing, Law D holds.
