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
- **T3 · Board runs** = *bo'laklarga bo'lish* (kesim ro'yxati). (asos: `48` L6; `54` T3) — **keyingi.**
- **T4 · Modules** — 32-segmentdan, ixtiyoriy shakl, transport tekshiruvi. (asos: `48` L4; `54` T4)
- **T5 · Ops + legalDomain** — har op nomlangan tranzaksiya (L0); legalDomain (L13). (T1 dagi `commit` — shu qatlamning urug'i.)
- **T6/T7 · Facet + cascade** — noldan (founder poligon kodi kelmasa ham). (`50`, `51`)
- **T8/T9 · Thing loader + Lockfile** — parallel. (`52`)
- **T10 · Validation** — egallovchi-minimumlar (L8; hozir T1 da min=0), to'qnashuvlar. (`51` D9-D11)
- **T11 · Release** — kesim ro'yxati chiqishi (parts). (`53`)
- **T16 · Korpus** — `51`§6 dagi 8 fixture.

## Founderga bog'liq (→ FOUNDERGA.md)
- Teshik/сверловка (Q2), 10 mebel (Q3), natija formati (Q5), poligon kodi (Q1), 49-nom (Q4).
  Bular engine yadrosini (T1–T11) TO'SMAYDI; yakuniy solishtiruvga kerak.
