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
- **T7 · Cascade P1/P4 + stratifikatsiya** — resolve'ni geometrik(Tier-0)/appearance bosqichga bo'lish; konflikt=rad; qatlamlar (system→...→pin). (`50`§2 + `51` D8) — **keyingi.**
- **T8/T9 · Thing loader + Lockfile** — parallel. (`52`)
- **T10 · Validation** — egallovchi-minimumlar (L8; hozir T1 da min=0), to'qnashuvlar. (`51` D9-D11)
- **T11 · Release** — kesim ro'yxati chiqishi (parts). (`53`)
- **T16 · Korpus** — `51`§6 dagi 8 fixture.

## Founderga bog'liq (→ FOUNDERGA.md)
- Teshik/сверловка (Q2), 10 mebel (Q3), natija formati (Q5), poligon kodi (Q1), 49-nom (Q4).
  Bular engine yadrosini (T1–T11) TO'SMAYDI; yakuniy solishtiruvga kerak.
