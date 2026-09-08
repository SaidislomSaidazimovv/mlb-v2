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

---

## 2026-09-09 — T11: Release (P6) — kesim ro'yxatining chiqishi ✅

**Nima qilindi** (`apps/app/src/poligon/model/release.ts`, sof funksiya):
- `release(parts, conv, prev?)` — FINISHED→CUT (cut = finished − kromka, sex konvensiyasi bilan); handedness + grain + 0.1mm; **o'zgarmas RAQAMLANGAN Release**; qism raqami identity (role+lineIDs) bo'yicha barqaror, yangi = keyingi bo'sh, hech qachon qayta raqamlanmaydi.
- `diffReleases(a, b)` — o'zgargan/paydo/g'oyib (changed/appeared/vanished).
- `partIdentity(p)` — role + bounding LINE IDs (pozitsiya emas, 51 H1).

**Asos:** `53`§1 (finished→cut), `53`§2 (raqamlangan/o'zgarmas/diff), `53`§5 (handed/grain/0.1mm) + `54`§3 "T11 gate".

**Test:** butun suite **67/67 pass · 0 fail** (+T11 5). **T11-gate:** kromka 2mm×4 → cut 4mm kichik; raqam barqaror + yangi keyingi bo'sh; diff changed/appeared/vanished; 0.1mm.

---

### ⏱ Engine holati: **11 / 12** task tugadi (T1–T11). Qolган engine: faqat **T16 (korpus/CI)**. Keyin UI (T12–T15, Saidislom).

---

## 2026-09-09 — T16: Korpus / CI (harness + 4/8 fixtura) 🟡

**Nima qilindi** (`apps/app/src/poligon/model/corpus.ts`, sof funksiya):
- `runCorpus(fixtures, expected)` + `allPass` — har fixtura natijasini (qabul yoki NOMLANGAN rad) kutilgan bilan solishtiradi (harness).
- **4/8 fixtura O'TADI** (built modullarga tayanadi): **E1** (P1 tsiklik `size.clear` → D8 rad), **E2** (P1 `adjacency` → qabul), **F1** (kromka vs cut, 2 sex konvensiyasi), **H1** (pin identity = role+lineID, migratsiyada omon).

**Asos:** `51`§6 (8 minimal fixtura) + `54`§3 "T16 gate".

**Test:** butun suite **69/69 pass · 0 fail** (+T16 2).

**HALOL — chala qismi (CHALA.md):** qolган 4 fixtura hali qurilmagan modullarga tayanadi — **A1** (thickness migratsiya → D5), **B1** (hinge overlay/fit → D6), **C1** (datum → D3), **I4** (18mm Type 16mm loyihaga → D5). Bular + **10-mebel parity** (eski engine chiqishi bilan, cross-repo) keyingi bosqich.

---

## ✅ ENGINE BACKBONE TO'LIQ (2026-09-09)
T1 Sheet · T2 Junctions · T3 Board runs · T4 Modules · T5 Ops · T6 Facets · T7 Cascade · T8 Things ·
T9 Lockfile · T10 Validation · T11 Release · T16 korpus-harness — **69/69 test yashil**, hammasi
`apps/app/src/poligon/model/`da, `48–54`ga asoslangan. Qolgan: T16ning 4 fixturasi (D3/D4/D5/D6) +
10-mebel parity + UI (T12–T15, Saidislom).

---

## 2026-09-09 — D3: Datum / local-frame (51 chuqur qonun) ✅

**Nima qilindi** (`apps/app/src/poligon/model/datum.ts`, sof funksiya):
- `ROLE_FRAMES` — role bo'yicha local frame yuza nomlari (C2: shelf "front"=chuqurlik, back "front"=qalinlik o'qi).
- `validateParam` — C1 datumsiz rad (D3.datum), C2 frame'da yo'q yuza rad (D3.face), C3 world-space rad (D3.world), C4 protrusion-as-negative rad (D3.protrusion).
- `resolveSetback` — setbackni DATUM yuzasiga nisbatan yechadi (ichkariga-musbat); natija deklaratsiya qilingan datumga bog'liq — taxmin yo'q.

**Asos:** `51` D3 (C1-C5).

**Test:** butun suite **75/75 pass · 0 fail** (+D3 6). **Korpus endi 5/8:** C1 (datum + fasad qalinligi — carcass-datum mustaqil, fasad-datum siljiydi, deterministik) qo'shildi.

---

## 2026-09-09 — D5: Thickness class (51 chuqur qonun) ✅

**Nima qilindi** (`apps/app/src/poligon/model/thickness.ts`, sof funksiya):
- `classifyMaterialChange(from,to)` — sinf ichida → "cascade"; sinf kesib → "migration".
- `checkCascadeMaterialChange` — kaskad orqali sinf kesib o'tishga urinish → `D5.migration` RAD (silent resize yo'q).
- `checkTypeInstantiation(typeClass, projectClass)` — cross-class o'rnatish → `D5.crossClass` RAD.

**Asos:** `51` D5 (+ A1/I4).

**Test:** butun suite **78/78 pass · 0 fail** (+D5 3). **Korpus endi 7/8:** A1 (16→18 = migration, kaskad emas) + I4 (18mm Type→16mm loyiha = migration) qo'shildi. Qolgan: **B1** (hinge overlay/fit → D6).

*(D4 Migration mexanizmi — T5 `apply` ustida quriladigan, oshkora/preview/atomik/refusable batch line-move; A1/I4 DETEKSIYASI D5 bilan bo'ldi, mexanizm D4 keyin.)*

---

## 2026-09-09 — D6: Hardware/Fit + KORPUS 8/8 (T16 gate BAJARILDI) ✅

**Nima qilindi** (`apps/app/src/poligon/model/fits.ts`, sof funksiya):
- `checkFitHinge(fit, hinge)` — 52§8: `requires.hinge_class` mos kelmasa `D6.fitHinge` RAD (B1: inset Fit + full-overlay ilgak → 33mm-xato eshik EMAS).
- `doorWidth(opening, fit)` — 51 D6: eshik eni DEKLARATSIYA qilingan overlay/gap'dan (ilgak nomida yashirin emas); full-overlay 597 vs inset 565 (~33mm farq).

**Asos:** `51` D6 + `52`§8 (+ B1).

**Test:** butun suite **81/81 pass · 0 fail** (+D6 3). Korpusga **B1** qo'shildi.

### 🎯 KORPUS 8/8 — `51`§6 minimal to'plam TO'LIQ: E1·E2·F1·H1·C1·A1·I4·B1. **T16 gate "sakkiztasi o'tadi va o'tib turadi" — BAJARILDI.**

---

## 2026-09-09 — D4: Migration (51 chuqur qonun) ✅

**Nima qilindi** (`apps/app/src/poligon/model/migration.ts`, sof funksiya):
- `runMigration(sheet, mig)` — chiziq siljishini talab qiladigan o'zgarishlar (line-move op'lar) TARTIB bo'yicha, ATOMIK (T5 `apply` ustida, immutable); birorta rad bo'lsa BUTUN migratsiya rad + `failedAt` (L0 butun-yoki-hech), asl Sheet o'zgarmaydi. Muvaffaqiyatda END-STATE.
- `previewMigration` — END-STATE, MUTATSIYASIZ (oraliq holatlar emas); farqi — preview commit qilinmaydi.

**Asos:** `51` D4 (resolve chiziqni siljitmaydi; migration = oshkora/preview/atomik/tartibli/refusable) + `51` H2 (tartib, end-state preview) + `48` L0.

**Test:** butun suite **84/84 pass · 0 fail** (+D4 3). Ordered ok → end-state (asl tegilmadi); 2-op'da uzilish → failedAt=1, butun rad; preview mutatsiyasiz.

---

## 2026-09-09 — D7: Kvantlangan parametr (51 chuqur qonun) ✅

**Nima qilindi** (`apps/app/src/poligon/model/quantized.ts`, sof funksiya):
- `legalMembers(p, max)` — chegaraga sig'adigan qonuniy a'zolar RO'YXATI (tizim tanlamaydi — ko'rsatadi).
- `checkQuantized(p, max)` — hech bir a'zo sig'masa `D7.noMember` RAD (jimgina snap yo'q).

**Asos:** `51` D7 (+ B3: slayd 250..600, 540-chuqur → 500 oladi, tizim tanlamaydi).

**Test:** butun suite **87/87 pass · 0 fail** (+D7 3).

---

## ✅ `51` D1–D12 TO'LIQ (2026-09-09)
D1/D2 (T1/contracts — authored/derived, Type-param) · D3 datum · D4 Migration · D5 thickness-class ·
D6 hardware/fit · D7 kvantlangan · D8 (T7 stratifikatsiya) · D9/D10/D11 (T10 validation) · D12
(T11 three-plane finished/model/cut). **Geometriya devori (Law D) to'liq D1–D12 sifatida qurildi.**
