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
