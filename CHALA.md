# CHALA — tugallanmagan / keyingi ishlar

> To'liq tugab, testlar YASHIL bo'lganda → `BAJARILGAN.md` ga o'tadi. Shu paytgacha bu yerda.
> Har band asos (manba) bilan.

---

## T1 qoldig'i (yadro ishlaydi, lekin kengaytiriladi)
- **Katak-grafi (cell adjacency) to'liq derivatsiyasi** hozircha yo'q — bloklar chiziq-id lari bilan
  saqlanadi (`addBlock`), ammo barcha kataklarni sanab, qo'shnilik grafini qurish T3/T4 da. (asos: `48`§0)

## Keyingi vazifalar (54§3 tartibi — HOZIR qilinadi, founderni kutmaydi)
- ~~**T2 · Junctions**~~ — ✅ BAJARILDI (junction.ts, 16/16 test). Qoldig'i: per-junction override
  saqlash + modul-konvensiya (2-bosqich) hozircha alohida funksiya emas — T5 (ops) da junctionga
  bog'lanadi.
- ~~**T3 · Board runs**~~ — ✅ BAJARILDI (board.ts, 20/20 test, T3-gate 2400). Qoldig'i: material/tola
  bilan tugatish (L6) hozircha faqat qalinlik bo'yicha — material/grain T3 kengaytmasi (T11 release'da kerak).
- ~~**T4 · Modules**~~ — ✅ BAJARILDI (module.ts, 23/23 test; 32=chegara, L-shakl, transport). Qoldig'i: og'irlik (weight) tekshiruvi — hozircha faqat gabarit; og'irlik material zichligi kelганда (T10/T11).
- ~~**T5 · Ops + legalDomain**~~ — ✅ BAJARILDI (ops.ts, 29/29 test; apply atomik+immutable, legalDomain). Qoldig'i: op turlari hozir 3 ta (addLine/setThickness/moveLine) — split/delete→Void/Absorb/flip-junction op'lari T12 (UI) bilan birga kengaytiriladi.
- ~~**T6 · Facet tiering**~~ — ✅ BAJARILDI (facets.ts, 35/35 test; Tier-0/Tier-3, D8, adjacency geomsiz, edge_exposure rad). Qoldig'i: qolgan Tier-0 facetlar (layer/zone/module/span/size.outer) real hisoblash — sheet/block-graf bilan T7/T10 da to'liq ulanadi.
- ~~**T7 · Cascade + stratifikatsiya**~~ — ✅ BAJARILDI (cascade.ts, 42/42 test; resolve/Conflict/Incomplete, authorRule D8, blastRadius). Qoldig'i: `pin` (part-identity istisno) va Theme-install konflikt-hisoboti (`50`§4) — T8/T9 (things) bilan ulanadi.
- ~~**T8 · Thing loader**~~ — ✅ BAJARILDI (things.ts, 49/49 test; canPublish diagram/unit/declarative/ownership, buildIndex asiklik). Qoldig'i: haqiqiy `loadThings(dir)` (fs — foldedan o'qish) — hozir Thing obyekt sifatida (validatsiya sof); fs-o'qish thin qatlam, keyin.
- ~~**T9 · Lockfile**~~ — ✅ BAJARILDI (lock.ts, 55/55 test; lockOf/checkLock missing/version/hash, reverseIndex). Qoldig'i: fs bilan real project fayliga (sheet+params+pins+lock) yozish/o'qish — T11/persist bilan.
- ~~**T10 · Validation (P5)**~~ — ✅ BAJARILDI (validate.ts, 62/62 test; L8 min, D9 material domeni, D11 to'qnashuv). Qoldig'i: eshik-swing devorga (real geometriya bilan) + feasibility (grain/nesting = P6, T11) — hozir box-overlap shakli.
- ~~**T11 · Release (P6)**~~ — ✅ BAJARILDI (release.ts, 67/67 test; finished→cut, raqamlangan/o'zgarmas, diffReleases, handed/grain/0.1mm). Qoldig'i: pre-flight ro'yxati (53§1 — o'lchanmagan devor/kromkasiz qirra ogohlantirishlari) + kerf/tolerance — persist/UI bilan.
- 🟡 **T16 · Korpus/CI** — harness + **4/8 fixtura** BAJARILDI (E1/E2/F1/H1, 69/69 test). QOLGANI:
  - **A1** (thickness migratsiya) + **I4** (18mm Type→16mm loyiha) → **D5 thickness-class** moduli kerak.
  - **B1** (hinge overlay flip) → **D6 hardware/fit** (`fits/`) moduli kerak.
  - **C1** (datum + fasad qalinligi) → **D3 datum/frame** moduli kerak.
  - **D4 migration** moduli (line ko'chishi = Migration, previewed) — H1 to'liq migratsiya uchun.
  - **10-mebel parity** — eski engine (panelDecomposition+SWJ008) chiqishini yangi bilan solishtirish (cross-repo, katta).

## Keyingi katta bloklar (54§3 dan tashqari, kelgusi)
- ✅ `51` **D1–D12 TO'LIQ** (D3/D4/D5/D6/D7 + D8 cascade + D9-D11 validation + D12 release). Geometriya
  devori butunligicha qurildi.

## ⚠️ HALOL HOLAT (2026-09-09 audit — to'liq `AUDIT.md` da)
Avvalgi "engine yadro + qonunlar TUGADI" — HADDAN BALAND baho edi. To'g'risi: amalga oshirilganlar
sinovdan o'tган, LEKIN hujjatning jiddiy qismlari HALI YO'Q. Yangi `AUDIT.md` — qator-ma-qator solishtiruv.
Eng muhim qolган (AUDIT §B), founder sinoviдан oldin shart:
- ~~**B1 Depth**~~ — ✅ BAJARILDI (2026-09-09): 50§2 cascade orqali (profil rules), side=560/shelf=520,
  Law E rad; kesim uzunlik×chuqurlik (53§1); UI+inspektor+test (107/107). Qoldig'i: zone/module facet.
- ~~**B2 derive() rules pipeline**~~ — ✅ BAJARILDI (2026-09-09): STAGED P1→P2→P3→P4 (D8 authoring gate,
  P3 size.clear, P4 colour appearance), 111/111 test. Qoldig'i: P5/P6 zanjirga to'liq ulash + setback/overlay
  geometriyaga oqishi (D3 bilan).
- ~~**B3 adjacency**~~ — ✅ BAJARILDI (2026-09-09): blok-graf flood-fill; free-end/abutting; E2 exposed-end-panel
  ishlaydi. wall-facing endi B4 bilan yopildi.
- ~~**B4 L15 wall-ends/opening**~~ — ✅ BAJARILDI (2026-09-09): createSheet(opening,ends), outer-face
  chegara (side=opening balandligi), against-wall→wall-facing, into-corner→Reserved; 117/117.
- ~~**B5 L9 Void/Reserved/Absorb**~~ — ✅ BAJARILDI (2026-09-09): voidspace.ts (deleteBoard=segment 0,
  voidBlock, reserveBlock, absorb, mergeAdjacentVoids), 123/123. Qoldig'i: muharrirда blok-void/absorb gesture.
- Qolgan: **B6 L14 wall-length**; **B7 48§3 derived-until-touched**; **B8 L3 qatlamlar**;
  **B9 haqiqiy edge_exposure kromka**.

## Endi qolган KATTA bloklar
- **10-mebel parity** — eski engine (mebelchi-2app/mebely `panelDecomposition` + SWJ008) vs yangi
  (poligon) kesim/**teshik** solishtiruvi. Founderning asosiy sinovi — LEKIN avval B1/B2 + teshik(drilling,
  yangi yadroда yo'q) kerak.
- ~~**Persist**~~ — ✅ BAJARILDI (project.ts, 92/92 test; sheet+params+pins+lock, round-trip, fs save/load,
  integritet=lock). Qoldig'i: haqiqiy `loadThings(dir)` fs-walk (T8 thin qatlam) + ko'p-loyiha teskari
  indeks bilan blast-radius UI — persist yadrosi tayyor, folder-o'qish keyin.
- ~~**UI (T12–T15)**~~ — ✅ BAJARILDI (poligon.html alohida sahifa; SheetEditor/Inspector/
  GeneratedSettings/PartsView; typecheck 0 xato, node-test 99/99, `vite build` muvaffaqiyat). Qoldig'i:
  T12 split/delete→Void/Absorb op'lari (hozir move + qalinlik-tsikl) · real pointer sudrashni qurilmada
  sinash · T15 400-part navigatsiya stress-testi.
- ✅ **T16 gate BAJARILDI** — korpus 8/8 (51§6 minimal to'plam to'liq).

## Founderga bog'liq (→ FOUNDERGA.md)
- Teshik/сверловка (Q2), 10 mebel (Q3), natija formati (Q5), poligon kodi (Q1), 49-nom (Q4).
  Bular engine yadrosini (T1–T11) TO'SMAYDI; yakuniy solishtiruvga kerak.
