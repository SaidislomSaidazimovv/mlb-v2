# BAJARILGAN — tugallangan ishlar (testlar YASHIL)

> Faqat TO'LIQ tugab, testlar yashil bo'lgan ishlar shu yerda. Har band: nima · asos (manba) · test.
> Chala/jarayondagilar → `CHALA.md`. Founderga bog'liqlari → `FOUNDERGA.md`.

---

## 2026-09-08 — T1: Sheet primitives (yadro) ✅

**Nima qilindi** (sof TypeScript, `src/poligon/model/`, UI/I/O yo'q — 54§0):
- `contracts.ts` — `Line` (barqaror id + BUTUN mm pozitsiya), `Thickness` 0/16/32, segment kaliti, `Block`, `Sheet`, `Refusal`, `EPS=1`, `DEFAULT_MIN`.
- `sheet.ts` — `createSheet`; `addLine` (L16 butun-mm shart + L5b ε-snap, dublikatsiz); `setThickness`/`getThickness` (SEGMENT-da); `faces` (pos ± qalinlik/2); `checkL1` (yuza-tartiblash — manfiy ichki bo'shliqni "L1" nomi bilan rad); `addBlock` (L4); `commit` (L0 — invariant shu yerda tekshiriladi); `serialize`/`parse` (round-trip).

**Asos:** `48`§0-1 (model), qonunlar L0/L1/L4/L5b/L12/L16; `54`§3 "T1 gate"; `54`§0 (sof funksiya).

**Test:** `node --experimental-strip-types --test tests/*.test.ts` → **7/7 pass · 0 fail** (offline).
Qamrov: L16 (butun-mm rad), L5b (ε-snap, dublikat yo'q), faces, L1 (to'g'ri 600-korpus rad yo'q + manfiy bo'shliq → L1 rad), L4 (blok chiziqqa bog'liq), round-trip (serialize→parse aynan).

---

## 2026-09-08 — T2: Junctions (kesishmalar) ✅

**Nima qilindi** (`src/poligon/model/junction.ts`, sof funksiyalar):
- `RANK` (worktop>side>top/bottom>shelf) + `resolveThrough` — qaysi taxta o'tadi: override→rutba; `both` fizik imkonsiz → `junction.both` rad; rutba tengligi → `junction.tie` rad (jimgina default yo'q).
- `classify` — L(2)/T(3)/X(4); qalinlik X ni parchalaydi (kesishuv V-segment 32 bo'lsa → `X->2T`, ikki mustaqil T).
- `carcassParts` — 800-korpus o'lchov oqibati: V-through → top 768, side 720; H-through (flip) → top 800, side 688 (sidelar −32).
- `boardInsideSpanningBlock` — qamrab-oluvchi blok qoidasi: ish-stoli chizig'i penal ichida polka O'STIRMAYDI.

**Asos:** `48`§2 (L/T/X, ustunlik, 'both'-rad, qamrab-oluvchi-blok) + `54`§3 "T2 gate".

**Test:** butun suite **16/16 pass · 0 fail** (T1 7 + T2 9; offline). T2 gate raqamlari (768 / 800 / 688) tasdiqlandi.

---

## 2026-09-08 — T3: Board runs = "bo'laklarga bo'lish" (kesim) ✅

**Nima qilindi** (`src/poligon/model/board.ts`, sof funksiya):
- `boardRuns(sheet, throughAt)` — bir chiziq bo'ylab segmentlarni MAKSIMAL yugurishga (Board) yig'adi. Yugurish tugaydi: qalinlik o'zgarsa (L6), qalinlik 0 bo'lsa (bo'shliq), yoki perpendikulyar-through crossing kessa. Board: {line, axis, from, to, thickness, length}.

**Asos:** `48` L6 (taxta = collinear segmentlar maksimal yugurishi, through-junctionda birlashadi; qalinlik/material/tola o'zgarishi tugatadi) + `54`§3 "T3 gate".

**Test:** butun suite **20/20 pass · 0 fail** (T1 7 + T2 9 + T3 4). **T3-gate tasdiqlandi:** umumiy vertikal chiziq (baza 0-720 + penal 0-2400) → BITTA 2400 taxta (baza alohida o'ng side olmaydi); qalinlik-o'zgarishi va perp-through split; 0-bo'shliq.

---

## 2026-09-08 — UI reference (parallel) ✅
`docs/UI_REFERENCE.md` — founder bergan UI xulqi (L11/L13, `52`§2, `53`§6, `50`§6, `48`§5 — cited) + vizual did uchun O'RGANISH rejasi (o'rganiladigan applar ro'yxati, hali fakt emas deb belgilangan). To'qilmagan.

---

## 2026-09-08 — T4: Modules (modullar) ✅

**Nima qilindi** (`src/poligon/model/module.ts`, sof funksiya):
- `deriveModules(sheet)` — kataklarni union-find bilan komponentlarga ajratadi: **32 segment CHEGARA** (ajratadi), 0/16 esa **ULAYDI** (bir modul). Modul ixtiyoriy shaklda (to'rtburchak shart emas — L-shakl). Har modul: cells + bbox + width/height.
- `transportCheck(module, {maxWidth,maxHeight})` — gabarit profil maksimumidan oshsa `transport` ogohlantirishi.

**Asos:** `48`§0 (modul = 32-segment bilan ajratilmagan kataklarning maksimal to'plami) + L4 (modullar to'rtburchak EMAS) + `54`§3 "T4 gate".

**Test:** butun suite **23/23 pass · 0 fail** (T1 7 + T2 9 + T3 4 + T4 3). **T4-gate:** chok 32→16 → 2 modul fuse → 1; transport ogohlantirishi (1200>900); L-shakl modul (3+1 katak).

---

## 2026-09-08 — INTEGRATSIYA: eski system + poligon (mavjud systemaga ulash) ✅

**Nima qilindi:**
- Eski system (mebelchi-2app manba) `mebelchi-v2`ga ko'chirildi → v2 = eski system + yangi yadro.
- Poligon **T1–T4 `apps/app/src/poligon/model/`ga** ko'chdi — aynan `54`§1/§4 yo'li, **eski yadro `apps/app/src/model/grid.ts` YONIDA**. Testlar → `apps/app/tests/poligon/`. Import yo'llari tuzatildi.
- **ADDITIV:** mavjud hech qaysi fayl o'zgartirilmadi (yangi papka), grid.ts/eski kodga tegilmadi → konflikt yo'q.
- Tozalash: `mebelchi/` (270MB stale — CLAUDE.md "ignore"), `app-2/September 8` (dublikat), eski dump/research/UI-rasm papkalar o'chirildi (v2 nusxalari; originallar mebelchi-2app'da butun). **425MB → 190MB.**

**Asos:** `54`§1 (poligon grid.ts yonida, parity gate) + `54`§0 (sof engine, UI'siz).

**Test:** ko'chirishdan keyin **23/23 pass** (yangi joyda). Push: mlb-v2 `83897cd`. `.env.local` (KIE) gitignored — push bo'lmadi.

---

## 2026-09-09 — T5: Ops + legal domain ✅

**Nima qilindi** (`apps/app/src/poligon/model/ops.ts`, sof funksiya):
- `apply(sheet, op)` — har op NOMLANGAN atomik tranzaksiya (L0): NUSXA ustida bajaradi (asl Sheet tegilmaydi — 54§2 immutability), `commit` (invariant) tekshiradi; rad bo'lsa `refusals` (qoida nomi bilan), butun-yoki-hech. Op turlari: addLine, setThickness, moveLine.
- `legalDomain(sheet, op)` — MUTATSIYASIZ "hozir nima qabul qilinardi" (L13): legal + rad sabablari. UI shu bilan noqonuniyni RAD emas, O'CHIQ (greyed) qiladi.

**Asos:** `48` L0 (atomik tranzaksiya, commitda), L13 (legal domain), L16 (butun mm) + `54`§0/§2/§3 "T5 gate".

**Test:** butun poligon suite **29/29 pass · 0 fail** (T1 7 + T2 9 + T3 4 + T4 3 + T5 6). Immutability (asl o'zgarmaydi), L1-rad moveLine'da, L16-rad, legalDomain mutatsiyasiz, yo'q-chiziq rad — tasdiqlandi.

---

## 2026-09-09 — T6: Facet tiering ✅

**Nima qilindi** (`apps/app/src/poligon/model/facets.ts`, sof funksiya):
- `FACET_TIER` — 50§1 jadvali: Tier-0 (role/layer/axis/adjacency/zone/module/span/block.tags/size.outer — topologiyadan) vs Tier-3 (edge_exposure/size.clear — yakuniy o'lchov).
- `assertGeometricPredicate` — 51 D8: geometrik (P1) qoida Tier-3 facetga mos kelsa "D8" rad (statik).
- `computeAdjacency` — block-grafdan (block→abutting, wall→wall-facing, none→free-end), geomsiz.
- `computeFacet` — Tier-0 geomsiz hisoblanadi; Tier-3 (edge_exposure/size.clear) geom=null bo'lsa "facet.needsGeometry" rad.

**Asos:** `50`§1 (facet jadvali/tier) + `51` D8/E2 (stratifikatsiya) + `54`§3 "T6 gate".

**Test:** butun suite **35/35 pass · 0 fail** (+T6 6). **T6-gate:** adjacency GEOMSIZ hisoblandi; edge_exposure geomsiz RAD (facet.needsGeometry).

---

## 2026-09-09 — T7: Cascade + stratifikatsiya ✅

**Nima qilindi** (`apps/app/src/poligon/model/cascade.ts`, sof funksiya):
- `LAYERS` (system→catalog→theme→project→wall→module→block→pin) + `resolve(part, property, rules)` — past→yuqori; ENG YUQORI mos qatlam yutadi (specificity yo'q); bir qatlamda kelishmovchilik → `Conflict` rad (tiebreak yo'q); hech topilmasa → `Incomplete` rad.
- `authorRule(rule)` — 51 D8: geometrik (P1) qoida Tier-3 facetga tayansa → `D8` rad, YOZILISH paytida.
- `blastRadius(parts, rule)` — 50§6: qoida qaysi partlarga tegadi (mutatsiyasiz).

**Asos:** `50`§2 (kaskad/konflikt/incomplete) + `50`§6 (blast-radius) + `51` D8 + `54`§3 "T7 gate".

**Test:** butun suite **42/42 pass · 0 fail** (+T7 7). **T7-gate:** E1 (P1 qoida `size.clear` Tier-3 → D8 rad); E2 (P1 qoida `adjacency` Tier-0 → qabul); qatlam-yutish, Conflict, Incomplete tasdiqlandi.

---

## 2026-09-09 — T8: Thing loader / validator ✅

**Nima qilindi** (`apps/app/src/poligon/model/things.ts`, sof funksiya):
- `canPublish(thing, ownership)` — 52: diagram.svg majburiy (§2), examples/ (§2), uid/version/schema (§4), raqamli maydonga birlik (§4), FAQAT deklarativ — ifoda/kod rad (§7), o'zi egasi bo'lmagan maydon rad (§6). Har rad nomlangan.
- `buildIndex(things)` — namespaced uid-index (fs-walk emas, §10) + havolalar ASIKLIK (DFS) → tsikl bo'lsa `refs.cycle` rad.

**Asos:** `52` (§2/§4/§6/§7/§10) + `54`§3 "T8 gate".

**Test:** butun suite **49/49 pass · 0 fail** (+T8 7). **T8-gate:** diagramsiz → `publish.diagram` rad; o'zi egasi bo'lmagan maydon → `publish.ownership` rad; birliksiz/ifoda/tsikl ham rad.

---

## 2026-09-09 — T9: Lockfile ✅

**Nima qilindi** (`apps/app/src/poligon/model/lock.ts`, sof funksiya):
- `contentHash(thing)` — deterministik FNV-1a (mazmun o'zgarishini aniqlash).
- `lockOf(uids, index)` — loyiha tegган Thinglar qulfi `(uid, version, hash)`.
- `checkLock(lock, index)` — qulf mos kelmasa RAD: `lock.missing` / `lock.version` / `lock.hash` → cut list CHIQMAYDI (jimgina boshqa list emas). Mos → bo'sh (chiqadi).
- `reverseIndex(projects)` — qaysi loyihalar qaysi Thing'dan (52§9, blast radius).

**Asos:** `52`§5 (lock, reproducible) + `52`§9 (teskari indeks) + `54`§3 "T9 gate".

**Test:** butun suite **55/55 pass · 0 fail** (+T9 6). **T9-gate:** bir qulf → mos (reproducible); version/mazmun o'zgarsa → rad; yo'qolsa → rad; teskari indeks.

---

## 2026-09-09 — T10: Validation (P5) ✅

**Nima qilindi** (`apps/app/src/poligon/model/validate.ts`, sof funksiya):
- `checkColumnMinimum(available, occupants)` — L8: ustun min = egallovchilar maksimumi; kichik bo'lsa RAD (bog'lovchi egallovchining qoidasini nomlaydi); 3mm filler 150mm karkas bilan rad etilmaydi.
- `checkMaterialDomain(value, dom)` — D9: span/depth material ruxsatidan tashqarida → RAD (resize YO'Q), material qoidasini nomlaydi.
- `checkCollisions(boxes)` — D11: bir qatlamda ustma-ust x-oraliqlar → to'qnashuv RAD, nom bilan.

**Asos:** `48` L8 + `51` D9/D11 + `54`§3 "T10 gate".

**Test:** butun suite **62/62 pass · 0 fail** (+T10 7). **T10-gate:** har rad qoidani nomlaydi (carcass/glass-10mm/D11.collision); filler minimumdan ozod.
