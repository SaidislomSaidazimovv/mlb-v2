# 🔵→🔵 App-2 → App-3 HANDOFF — Laminatsiya (Forge «Bind (Laminate)» asbobi)

> **Kimдан:** App-2 (Блок). **Kimga:** App-3 (Каркас / Forge).
> **Sana:** 2026-08-23. **Holat:** 🟢 **App-3 to'liq boshlashi mumkin — founder-blok EMAS (kontrakt tayyor).**
> **Manba (so'zма-so'z):** `35_FORGE_MODIFIER_LAW.md` §0 (LOCKED) + §7.4 (DECIDED 2026-07-30) ·
> `APP3_BRIEF.md` #8 · QONUNLAR §14 + §3.1/§3.2 · `engine/contracts/design.ts` (der, `f8d62cc`) ·
> App-2 commit `3d9c563` (dekompozitsiya) + toggle-olib-tashlash commit.

---

## 0. Qisqacha (TL;DR)

- **Laminatsiya AVTORLIGI — bu SENING ishing (A3).** «Bind (Laminate)» — Forge asbobi (chip UX + writer),
  komponent node'ining `modifiers[]`ига `{type:"laminate", params:{layers:2}}` yozadi. Manba: 35 §0.
- **Dekompozitsiya** (niyat → 2 taxta + yelim + narх) — **App-2 qildi** (§14 🟢[A2], `3d9c563`). Tayyor turadi.
- **Kontrakt tayyor:** `DesignNode.modifiers?: Modifier[]` + `ModifierType` («laminate») der posylkada keldi.
  APP3_CONTRACT §2 va APP3_BRIEF #8'даги «avval founder PR kerak» **eskiрган** — kutmaysan.
- **Muhим tuzatish (A2 tomonида qilindi):** App-2 avval xato bilan furniture editorда to'g'ridan-to'g'ri
  laminat toggle qo'yган edi (§0 bo'yicha «chip UX» — bu SENING ishing). **U olib tashlandi.** Endi
  laminat AVTORLIGI faqat Forge orqali keladi — chegара toza.

---

## 1. Chegара (35 §0 — LOCKED, so'zма-so'z)

> satr 20: «**App 2 (Blocks):** Owns cabinet assembly, shelves, dividers, and ALL grid/division math.»
> satr 28: «**App 3 (Forge) Tools:** Round Corner, **Bind (Laminate/Carry)**, Rotate, Cut Hole, Bevel, Viyemka, Material, Kromka.»
> satr 30: «**Live Intent Chips:** non-blocking chip … tapping cycles the rule … Zero popup windows.»
> satr 46-49: «Forge `DesignNode`ни (Envelope + Modifiers + Intent) paketlab **ComponentLibrary**ga saqlaydi → App-2 uni joylashtiradi.»
> satr 298-299: «**App 2 assembles and divides; App 3 modifies one component and never assembles. A modifier is intent anchored to an envelope, never geometry baked.**»

**`APP3_BRIEF.md #8` (so'zма-so'z):** «**A3 (SEN):** laminate modifikatorini qo'llaydigan **Forge asbobi (chip UX + writer)**.»

➡️ Laminat = App-3 Forge asbobi. App-2 = faqat dekompozitsiya (2 Part + BOM). Chegара muzлаган.

---

## 2. SENING TO'LIQ VAZIFANG — «Bind (Laminate)» asbobi

| # | Qadam | Tafsilot |
|---|---|---|
| 1 | **Chip UX** | Live Intent Chip (35 §0, satr 30) — tanlangan node uchun laminat: qatlam soni 2/3, popup yo'q, chip bosса aylanadi/o'chadi. Butun kitchen emas — **bitta komponent** (§0). |
| 2 | **Writer** | node.`modifiers[]`ига laminate modifikator qo'shadi/olib tashlaydi (destruktiv emas, absolyut koordinata emas — §3.1). |
| 3 | **Convert → Component** | Trigger bosilганда Forge `DesignNode` (Envelope + Modifiers + Intent)ни paketlab `ComponentLibraryItem`ga saqlaydi (35 §0 satr 46). |
| 4 | **Test** | modifier to'g'ri yozилди · versiya monoton · publish-gate o'tади (§10.3). |

**MUHИM (35 §7.4, DECIDED 2026-07-30, founder):** «Lamination is **not a CNC operation**; it is a **BOM
operation** — cut 2 identical panels and glue them. 3D shows one solid; passport/output shows lamination.»
→ Sening writer'ing **operatsiya EMAS, NIYAT** yozadi. Panelга aylantirishни App-2/engine qiladi (§7 pastда).

---

## 3. Aniq kontrakt shakllar (`engine/contracts/design.ts` — copy-paste)

```ts
// DesignNode ичида ENDI bor (der posylka f8d62cc qo'shди):
modifiers?: Modifier[];   // «Forge modifiers, anchored (DB/35 §2). Non-destructive.»

export type ModifierType =
  | "hole" | "notch" | "bevel" | "viyemka" | "round_corner" | "laminate";   // "laminate" BOR

export interface Modifier {
  type: ModifierType;
  anchors: Anchor[];
  params: Record<string, mm10 | number | string>;   // {layers: 2} shu yerда
}

export type AnchorEdge = "top" | "bottom" | "left" | "right" | "front" | "back";
export type AnchorRule =
  | { rule: "fixed"; mm10: mm10 }
  | { rule: "ratio"; value: number }
  | { rule: "locked"; mm10: mm10 };
export interface Anchor { edge: AnchorEdge; distance: AnchorRule }
```

**Writer namunasi (reference — sen yakunlaysan):**
```ts
function applyLaminate(node: DesignNode, layers: 2 | 3): void {
  const rest = (node.modifiers ?? []).filter(m => m.type !== "laminate");
  node.modifiers = [...rest, {
    type: "laminate",
    anchors: [ /* §4 — anchor shakli */ ],
    params: { layers },
  }];
}
```

---

## 4. Anchor shakli — 2 variant (35 §299 asosида)

35 §299: «**A modifier is intent anchored to an envelope**, never geometry baked.» — ya'ni modifier
envelopega anchor qilinishi kutиlади. Laminat esa butun-yuza (pozitsiyasiz). Ikki o'qish:

- **(A) `anchors: []`** — laminat pozitsion emas → anchor yo'qligi halol. `layers:2` da baked koordinata
  yo'q, demak §299 ruhини («never baked») allaqачон qondiradi.
- **(B) to'liq-yuza envelope anchor**, masalan `[{edge:"front", distance:{rule:"ratio", value:1}}]` —
  §299 «anchored to an envelope» so'zига ko'proq mos, lekin `distance:ratio 1`ни «butun yuza» deб o'qish loyqa.

**Bu — kontrakt-detali, founder ratifikatsiyаsига muhtoj** (App-2 §4 to'qиmadi). Sen taklifингни (A yoki B)
founderга asosla; qайси tanlanса — **hамма laminate modifier shu shaklда** bo'lsin (izchillik). Hozir
iste'molчи yo'q (§7), shuning uchun tanlov funksional buzmaydi — faqat kelajак konvensiya.

---

## 5. App-2 nima qildi (dekompozitsiya — «iste'molchi» tayyor)

QONUNLAR §14.1 🟢[A2] («niyat `{layers}` → 2 panel + yelim/BOM; kod: schema, pricing/parts, cncExport»):

| Fayl | Nima |
|---|---|
| `packages/schema/src/module.ts` | `ModuleDoor.layers?: 2\|3` (dekompozitsiya input) |
| `packages/schema/src/rates.ts` + seed | `OperationRates.laminatePerM2` (seed 0) |
| `packages/pricing/src/parts.ts` | fasad blank loop `layers` marta chiqаради |
| `packages/pricing/src/buildBom.ts` | yelim = **(layers−1)** × yuza m² |
| `apps/app/src/model/cncExport.ts` | `carcassPanels`ни qayta ishlatadi → N blank avtomат kesim ro'yxatiga |
| test | `packages/pricing/test/cells.test.ts` — 2/3 qatlam sinov |

**Bu tayyor va sinalган** — lekin `ModuleDoor.layers`ни hozir hech nima o'rnатmaydi (A2 avtorlik olib tashlandi).

---

## 6. ⚠️ TO'LIQ ZANJIR — nima yetишmaydi (halol)

Sen modifier yozсang ham, mijoz kesim ro'yxatida laminatни **hali KO'RMAYDI**, chunki niyатни panelга
aylantiradiган **iste'molчи ulanмаган**:

1. ✅ **Kontrakt:** `DesignNode.modifiers[]` bor.
2. ⏳ **Iste'molчи:** engine `modifiers[]`ни **dekompoz qilmaydi** (tekshirilган) · App-2 `toDesign` ham **map qilmaydi**.
   → Kelajак: engine dekompoz qilса (founder/engine, §39:74), YOKI App-2 adapter `modifiers[laminate].layers →
   ModuleDoor.layers` map qilса (A2 ishi, sen komponent chiqаргандан keyin).
3. ⏳ **Sen:** ComponentLibraryItem'ни laminate modifier bilan chiqarasan.

Ya'ni sening asbобing **niyатни to'g'ri yozadi** (vazifang bajariladi), lekin **oxirги panel** iste'molчи
ulanганда chiqadi. Bu normal — bosqichma-bosqich.

---

## 7. Tuzatilishi kerak eskirgan hujjatlar (sen yoki founder)

- `app-2/APP3_CONTRACT.md §2` — «modifiers[] yo'q, founder PR kerak» → **der `f8d62cc` qo'shди.**
- `app-2/APP3_BRIEF.md #8` — «avval kontrakt kerak» → **kontrakt tayyor, boshla.**

---

## 8. Sening boshqa ishlaring (o'zgarmagan — bu handoff faqat laminate)

ComponentLibraryItem avtorlik + FitConstraint + server publish-gate (§10.3, 6 bosqich) — «modifiersiz boshla».

---

**Savol/aniqлаштириш — App-2'ga qaytar.**
