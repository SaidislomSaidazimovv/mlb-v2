# APP3_HANDOFF_LIBRARY.md — App-3 (Forge) komponent kutubxonаси REJASI

> **Kimга:** App-3 (Forge) jamоаси.
> **Kimdan:** App-2 (Блок).
> **Sана:** 2026-08-26.
> **Maqsad:** App-3'да komponent kutubxonаси qanday bo'lishини oldindan kelishib olish —
> App-2'ning blok kutubxonаси bilan **bir xil qonun**, ammo **boshqa mazmun** (blok emas, komponent).
>
> Bu reja **to'qib chiqarilmagan** — founder DB (`DB/36 §3`, `DB_37`, `DB/21 §1.3`, `§10.3`) +
> App-2'да allaqачон qurilган ikki library (`savedCabs`, `componentLibrary`, `componentGate`) asosida.

---

## 0. Bir jumlada
App-3 o'z **komponent kutubxonаси**ни quradi: kirганда **🔒 Local** va **🌐 Global** ikki bo'lim,
ichida **faqat `ComponentLibraryItem`** — **blok YO'Q** (App-2niki), **aksessuar aralаshmaydi**.
Publish (Global) = **gate §10.3** → server. Local = client (server kerak emas, hozir quriladi).

---

## 1. Nega (context)
- App-3 hozir **convert → component** qiladi, ammo komponentларни saqlash/publish uchun **kutubxona umuman yo'q.**
- Founder qonuni: **`DB/36 §3` — ikki kutubxona** (bloklar App-2, komponentlar App-3), **bittа emas**.
- App-2 (biz) **blok** kutubxonани quramiz (`Global·Local·Мои шкафы·Каталог`).
  App-3 (siz) **komponent** kutubxonани quradi (`Local·Global`). **Aralаshmaydi.**

---

## 2. App-3 kutubxonаси — nima bo'ladi
```
App-3  →  Библиотека
┌───────────────┬───────────────┐
│  🔒 Local      │  🌐 Global     │
│  shu dizayn    │  barcha usta   │
└───────────────┴───────────────┘
        faqat ComponentLibraryItem
     (BLOK yo'q · AKSESSUAR yo'q)
```
- **🔒 Local** — shu dizayn/loyihага bog'langan komponentlar (faqat shu yerда ko'rinadi).
- **🌐 Global** — serverга publish qilинган, **barcha usta** ko'radi; kartaда **author (ism)** + **createdAt (sana)**.
- **Blok bo'lmaydi** — blok = App-2niki (`root.kind === "cabinet"`; DB_37 §identity). App-3 = `root.kind !== "cabinet"`.
- **Aksessuar aralаshmaydi** — komponent kutubxonаси sof komponent.

---

## 3. Local / Global = BO'LIM, per-karta toggle EMAS ⚠️
App-2 buni **noto'g'ri** qilib ko'rdi: har kartaга 🌐/🔒 toggle qo'ygan edik — **xato.**
`Global` va `Local` = **alohida BO'LIMLAR** (tab/section), kartaдаgi bayroq emas.
**App-3 shu xatoni takrorlamasin** — boshidан **ikki bo'lim** qiling.

---

## 4. App-3 nima quradi (aniq, birma-bir)
1. **Komponent-store** — App-2'ning `savedCabs.ts` analogi (komponентни saqlash: localStorage → keyin server).
2. **Local / Global bo'lim** — ikki tab; per-karta toggle YO'Q (§3).
3. **Publish amali** — convert/editordan **«🌐 Глобально»** → **gate §10.3** (§6) → `ComponentLibraryItem` → server.
4. **Local saqlash** — **«🔒 Local»** → shu dizaynга bog'lab (server kerak emas).
5. **Global karta** — `author` (usta ismi) + `createdAt` (sana) ko'rsatilادi (DB_37 maydonlari).
6. **Eksport** — `ComponentLibraryItem[]` JSON (App-2 hozir shuни **ingestion** qiladi — kanal ishlaydi) → server upload (keyin).

---

## 5. Kontrakt — allaqачон MUZЛАТИЛГАН (o'zgartmang) 🔒
`ComponentLibraryItem` (`engine/contracts/design.ts`, DB_37):
| Maydon | Izoh |
|---|---|
| `componentId: string` | identity |
| `version: number` | pinned versiya (auto-advance YO'Q) |
| `schemaVersion: number` | **noma'lum → REJECTED at import, guess YO'Q** (DB/35 §7.5) |
| `name`, `author` | ism + muallif (`author` = Global'да ko'rinadigan usta ismi) |
| `requiredSlots: RoleSlot[]` | qaysi `fasad/korpus/orqa` slot bog'lanishi shart |
| `createdAt?: string` (ISO) | **Global'да «qachon yuklangan»** (DB_37: UI/sort convenience) |
| `root: DesignNode` | dizayn ildizi + **`modifiers[]`** (laminate/viyemka) + **`pos`** + **`thicknessAxis`** (§2.4, founder-approved) |

- **`scope`/`visibility` = item maydoni EMAS** (DB_37 §2 «what's kept out»): Local/Global = **saqlash-metadata / server publish qatlami**, kontrakt tipiга tegmaydi. App-2 ham shunday qiladi.
- **Eslatма:** App-3 `root`даги panellarга **`pos` + `thicknessAxis`** to'ldirса — App-2 aynan 3D + kesim chiqаради (§2.4). Bu **eng muhim** — hозирча ba'zi komponentларда `pos` yo'q bo'lsa App-2 placeholder ko'rsatadi.

---

## 6. Gate — publish testlari (§10.3)
`ComponentLibraryItem` Global'га chiqishдан oldin **6 bosqich** (App-2'ning `componentGate` bilan bir xil):
| Bosqich | Kim | Nima |
|---|---|---|
| 1. schema | App-3 client | schemaVersion === 1, shakl to'g'ri |
| 2. slot | App-3 client | requiredSlots bog'langan |
| 3. decompose | App-3 client | engine `decomposeGroup` → part chiqаради (0 emas) |
| 4. invariant | App-3 client | DEGENERATE/EXCEEDS_SHEET/UNBOUND_SLOT/… bayroq yo'q |
| 5. profile-swap | App-3 (convert) | profil almashinuvi to'g'ri |
| 6. ad-integrity | **server** | reklama/nomuvofiqlик tekshiruvi |
- **Yiqilса → chiqmaydi.** Soxta «yuklandi» natija YO'Q (App-2 ham shunday: gate natijasi rost).

---

## 7. App-2 ↔ App-3 chegara (ARALASHMASIN)
- **App-3** komponentни **PUBLISH** qiladi (Global) → **server** → **App-2 QABUL** qiladi
  (App-2'ning «**Компоненты**» bo'limида, `author` + `createdAt` bilan).
- **App-2** komponent **AUTHOR qilmaydi**; **App-3** blok **AUTHOR qilmaydi**.
- **Bir server · bir gate (§10.3) · bir `LibraryItemMeta`** (author + createdAt) — ikki app uchun umumiy.

---

## 8. Server bog'liqlик (halol bo'linish)
| Qism | Kim quradi | Server kerakми |
|---|---|---|
| 🔒 Local komponent kutubxona | **App-3** | ❌ yo'q — **hozir quriladi** |
| Eksport JSON (App-2 ingestion) | **App-3** | ❌ yo'q — **kanal ishlaydi** |
| 🌐 Global (cross-user, ism+sana) | **umumiy server** | ✅ ha — qurилmагунча «скоро» |
| Gate 6-bosqич (ad-integrity) | **server** | ✅ ha |

**Ya'ni App-3 hozir qura oladi:** Local kutubxona + eksport (App-2 bilan e2e ishlaydi).
**Server kelганда:** Global (barcha usta, ism+sana).

---

## 9. Xulosa — App-3 uchun qadamlar
1. Komponent-store (Local, localStorage).
2. Библиотека UI: **🔒 Local · 🌐 Global** (ikki bo'lim, toggle emas).
3. Publish: convert → **gate §10.3** → `ComponentLibraryItem` (kontrakt o'zgarmaydi).
4. `root` panellariga **`pos` + `thicknessAxis`** to'ldirish (App-2 aynan 3D+kesim chiqarishi uchun).
5. Global = server kelганда; hozircha Local + eksport bilan e2e.

**Savol/muvofiqlashtirish:** kontrakt (`ComponentLibraryItem`) muzлатилган — kengaytirish kerak bo'lsa
founder PR (§2.4 kabi). App-2 tomoni (ingestion + `decomposeGroup` + gate) **tayyor va kutyapti.**
