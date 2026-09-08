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
