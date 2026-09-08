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
- **T11 · Release (P6)** — finished→cut arifmetikasi (sex konvensiyasi, kromka), handedness, grain, 0.1mm, o'zgarmas raqamlangan release, diffReleases, pre-flight. **Kesim ro'yxati chiqishi.** (`53`) — **keyingi (oxirgi engine task, keyin T16 korpus).**
- **T16 · Korpus** — `51`§6 dagi 8 fixture.

## Founderga bog'liq (→ FOUNDERGA.md)
- Teshik/сверловка (Q2), 10 mebel (Q3), natija formati (Q5), poligon kodi (Q1), 49-nom (Q4).
  Bular engine yadrosini (T1–T11) TO'SMAYDI; yakuniy solishtiruvga kerak.
