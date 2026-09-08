# 52 — Magic Separation

The architecture rule. Companion to `48`, `49`, `50`, `51`.

> **GOLDEN RULE — every setting and every physical thing is its own file, editable locally, and visible in the app's settings with a picture.**

This document says what that means precisely, where it must stop, and the eleven ways it breaks if built naively.

---

## 0. Why this is the right rule

Data-driven is how games ship a thousand items without a thousand code paths. Every weapon is a file. The engine reads files; designers edit files; nobody recompiles.

For furniture the payoff is bigger, because the *domain itself* is a catalog: hinges, slides, materials, kromka, joints, legs. Every one of them is a fact about the physical world that changes without your code changing. A shop switches hinge supplier — that is a file, not a release.

And it pays a second time: **the settings screen is generated from the files.** You never hand-build a settings UI. A Thing declares its fields, units, domains and diagram; the app renders the editor. That is the only way "every setting has a picture" survives to version 40 — the picture is not documentation, it is a required part of the file.

---

## 1. The boundary — where Magic Separation must stop

This is the one place I push back, and it is important.

> **Policies, tables and catalogs are data. Invariants are code.**

- **Data:** which board runs through a junction (the priority table), residual policy, plinth height, hinge overlay, kromka thickness, thickness classes, minimums, quantised sets, validity domains, shop cut conventions.
- **Code:** *exactly one board runs through a junction*. *Every cell belongs to exactly one block.* *Resolve never moves a line.* *No property may be matched by a facet downstream of itself.* *Faces may not overlap.*

If the laws become files, a user — or a marketplace download — can edit away the guarantees that make the cut list trustworthy, and every promise in `48`–`51` evaporates. The laws are what make the data safe to edit. They are not themselves editable.

Litmus test: **if editing it can produce a model that is wrong rather than merely different, it is code.** A hinge with overlay 47 is a strange kitchen. A junction with two boards running through is not a kitchen at all.

---

## 2. The unit — a Thing is a folder, not a file

```
hinges/blum-clip-top-110-full/
  def.json           declaration: fields, units, values
  diagram.svg        REQUIRED — datum faces, arrows, signs, two states
  examples/          expected outputs, used as regression fixtures
    600-carcass.json
  README.md          optional human notes
```

The diagram is not attached to the Thing, it **is part of** the Thing. Law E made a diagram a marketplace publication gate; folder-per-Thing is what makes that gate mechanical instead of aspirational.

`examples/` is the quiet win: publishing requires its examples to pass, so the regression corpus from `48` §"proved by thousands of builds" builds itself, one Thing at a time.

---

## 3. The kinds

```
materials/      one per board material          thickness class, decor, grain, sheet size, domains
edges/          one per kromka                  thickness, radius, colour, compatible materials
hardware/
  hinges/       one per hinge                   overlay, gaps, min carcass, drilling
  slides/       one per slide                   clearance/side, allowed lengths, load
  lifts/        one per lift                    min height, forbidden zone
  legs/         one per leg                     nominal, adjust range
  handles/      one per handle                  drilling, protrusion
joints/         one per joinery method          confirmat, minifix, dowel, domino — see §8
fits/           one per part-to-opening fit     NEW noun, see §8
roles/          one per part role               local frame, face names, default recipe
params/         one per parameter definition    datum, sign, unit, domain, composition
types/          one per parametric block         app 2's output
profiles/       one per standards set           project defaults
themes/         one per rule pack               predicates + values only
machines/       one per workshop convention     kerf, banding convention, tolerances, panel sizes
tables/         one per policy table            junction priority, residual policy, equalize strategy
```

`tables/` is where "the algorithms are in files" actually lands. The junction priority table is data. The junction *law* is code. §1.

---

## 4. Identity, version, fork

Every `def.json` opens with the same header:

```json
{
  "id":     "blum.hinge.clip-top-110-full",
  "uid":    "01J8K2QF7M3NRA9V",
  "version": "1.3.0",
  "schema":  2,
  "origin":  { "source": "marketplace", "publisher": "blum", "signed": true },
  "name":    { "en": "CLIP top 110° full overlay", "ru": "CLIP top 110° накладная", "uz": "CLIP top 110° ustma-ust" }
}
```

- **Reference by `uid`, never by filename.** Renaming a file must not break a project. The filename is a human convenience and nothing more.
- **Local edit forks.** Editing a downloaded Thing does not modify it in place; it creates `origin: { forked_from: "blum.hinge.clip-top-110-full@1.3.0" }`. A publisher update never overwrites a fork — it offers a three-way diff. This is exactly what "can be changed locally" requires in order to be safe rather than a trap.
- **Nothing is deleted, things are retired.** Retired Things vanish from pickers and still resolve for old projects. Deleting a material that 400 projects reference is not a feature.
- **`schema` is explicit and migrations are recorded.** A file missing a field added in schema 3 is migrated by a named migration, never by a silent default. Law E.
- **Units are mandatory per numeric field in the schema**, not conventional. A hinge spec from a US vendor is in inches and will arrive eventually.

---

## 5. The lockfile — the least obvious consequence, and the most important

If a project only *references* Things, then opening it on another machine, or in the workshop next year, can resolve different files and produce a **different cut list from the same project**. That is the failure that ends trust in a manufacturing tool.

> **Every saved project embeds a lock: the full set of `(uid, version, content-hash)` it resolved, for every Thing it touched.**

- Opening a project whose locked Things are missing or changed **refuses to produce a cut list** until the user explicitly resolves it — update the lock (with a part-level diff) or restore the Things.
- The lock is what makes a project a reproducible document rather than a query whose answer drifts.
- It also makes the corpus honest: a regression fixture is a project plus its lock, so a suite failure means the engine changed, not the catalog.

A project file is therefore: **sheet + parameters + pins + lock.**

---

## 6. One fact, one file, one owner

The danger of many files is the same number appearing in two of them and drifting apart. A hinge declares a 3mm gap; a profile declares a 3mm gap; six months later one changes.

> **Each parameter has exactly one owning kind. Every other file may reference it, never restate it.**

The ownership map is itself a table (`tables/ownership`), checked at publish: a Thing that writes a field it does not own is rejected. This is boring, mechanical, and it is the difference between a catalog and a swamp.

---

## 7. Files are declarative — no code, ever

A marketplace that ships expressions ships code execution: a security hole, a determinism hole, and an unfixable support burden.

> **Thing files contain values, enums, and references. No scripts, no formulas, no arbitrary expressions.**

Where computation is genuinely needed, the file **names an algorithm** from an enum implemented in code (`residual: "left-absorbs"`, `nesting: "guillotine-v2"`). New algorithms ship with the engine, not with a download. A downloaded Theme cannot invent behaviour — only choose among behaviours you have already proven.

This also keeps §1 honest: data can select from the laws' permitted space; it can never widen it.

---

## 8. `fits/` — the new noun, from your point 3

Your instinct that every door joint deserves its own name, sizes, settings page and file is right, and it generalises further than doors.

> **A Fit is a named, filed declaration of how a part meets its opening.**

```json
{
  "id": "std.fit.overlay-3",
  "name": { "ru": "Накладной 3 мм", "en": "Full overlay 3 mm" },
  "kind": "door",
  "datum": "carcass.outer.front",
  "gap":   { "top": 3, "bottom": 3, "left": 3, "right": 3, "unit": "mm" },
  "overlay_rule": "shared-gap",
  "requires": { "hinge_class": "full-overlay" },
  "diagram": "diagram.svg"
}
```

Kinds: `door`, `drawer-front`, `back`, `shelf`, `filler`. The same mechanism covers "накладной / полунакладной / вкладной", drawer front reveals, inset backs, and the 2mm shadow gap someone will want next year.

Two things this buys immediately:

- **It separates the two junction problems that `49` nearly merged.** A *junction* is board-to-board inside the carcass, governed by the priority table. A *Fit* is part-to-opening in the front layer, governed by a Fit file. Different physics, different files, different diagrams. Merging them was a latent bug.
- **`requires` catches the hinge/fit mismatch by construction.** An inset Fit with a full-overlay hinge is refused at resolve, by name, instead of producing a door 33mm wrong. This was scenario B1 in `51`, and Fits are what make it structurally impossible rather than merely detected.

`joints/` stays separate and means joinery — confirmat, minifix, dowel, domino — which affects drilling, part count and assembly order, not fit.

---

## 9. Local edit = global cascade. It needs the same brakes.

Editing a shared Thing is more dangerous than editing a rule, because a rule lives in one project and a Thing lives in all of them. Change `edges/abs-2mm` and every project using it changes.

> **The app maintains a reverse index: which projects use which Thing at which version. Editing a Thing shows blast radius across projects before commit, and cannot be committed blind.**

Locked projects (§5) are shielded automatically — they keep their locked version until the user updates the lock deliberately. So editing a Thing affects *new* resolution and *offers* to update existing projects, one diff at a time. Without the lock, this rule would be unenforceable; with it, local editability is safe.

---

## 10. Scale

A serious catalog is thousands of Things. Directory scans and eyeballing stop working early.

- **Namespaced ids** (`vendor.kind.slug`) and a built index; never a filesystem walk at runtime.
- **The reference graph must be acyclic**, checked at publish. Type A → Type B → Type A is rejected when published, not discovered when a customer opens it.
- **Collections** bundle Things for distribution (a Catalog or a Theme is a signed collection with its own manifest). One download, many Things, one lock entry.
- **Search by facet, not by folder.** Folders are storage; the index is the interface.

---

## 11. Red team — how Magic Separation fails if built naively

| # | Failure | Fix |
|---|---|---|
| R1 | Reference by filename; user renames; projects break | `uid` in header, filename cosmetic (§4) |
| R2 | Local edit overwritten by publisher update | Fork on edit, three-way diff (§4) |
| R3 | Deleting a referenced Thing breaks old projects | Retire, never delete (§4) |
| R4 | Same project → different cut list on another machine | Lockfile (§5) |
| R5 | Same number in two files, drifts | One fact, one owner, checked at publish (§6) |
| R6 | Setting ships without its diagram | Thing is a folder; diagram required to publish (§2) |
| R7 | Thousands of files, nobody can find anything | Namespaced index, facet search, collections (§10) |
| R8 | Circular references between Types | Acyclic check at publish (§10) |
| R9 | Editing a Thing silently changes 40 projects | Reverse index + blast radius + locks (§9) |
| R10 | Schema drift across versions | Explicit `schema`, named migrations, no silent defaults (§4) |
| R11 | Marketplace file contains executable logic | Declarative only; algorithms are named enums (§7) |
| R12 | Units assumed | Unit mandatory per numeric field (§4) |
| R13 | Laws become editable data | §1 boundary — invariants are code |
| R14 | Publishing something that has never been computed | `examples/` must pass to publish (§2) |

R4 and R13 are the two that would be fatal and are the two least likely to be noticed before they hurt.

---

## 12. What it buys

- A new hinge brand is a folder, not a release.
- The settings UI is generated, so a new setting cannot exist without its picture.
- The marketplace ships data that provably cannot break the engine.
- A cut list is reproducible in another city a year later, or it refuses to be produced.
- The regression corpus grows by itself, one `examples/` at a time.
- Every refusal can name a file, and every file opens to an editor with a diagram — which is the whole "no guessing" promise, made physical.
