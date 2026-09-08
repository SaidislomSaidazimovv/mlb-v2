# 🔵 App-3 (Каркас / Forge) — vazifa brifi

> Bu MD App-3 (alohida repo) ustida ishlaydigan Claude uchun. Maqsad: App-3 nima ekanini, qaysi
> **kontrakt**ni hurmat qilishi kerakligini va qaysi ishlarni bajarishini ko'rsatish — shundan
> keyin o'zing reja tuzib ishlayver. **Barcha da'volar App-2 repodagi `engine/contracts/design.ts`
> va `app-2/QONUNLAR.md`dan olingan** (manba har bandda ko'rsatilgan). O'zingdan qo'shma; App-3
> repongni o'zing organib chiq, lekin quyidagi kontrakt/qonunlardan chetga chiqma.

---

## 0. Kontekst — Mebelchi qaysi ikki app

Mebelchi = oshxona-mebel dizayn tizimi. Ikki mustaqil app bor (QONUNLAR §Header, §2):

- **App-2 (Блок / Конструктор) — 🟢 A2:** bitta SHKAF ichini bo'ladi (javon, bo'linma, materiallar)
  va **BARCHA grid/bo'lish matematikasi** (Fixed/Ratio/Locked/Flex). Panel geometriyasiga tegmaydi.
  Bu — hozirgi repo (`mebelchi-app-2`).
- **App-3 (Каркас / Forge) — 🔵 A3:** FAQAT **bitta komponent**ni mikro-tahrirlaydi va
  **Komponentlar kutubxonasi**ni yuritadi. **Shkaf YASAMAYDI.** — Bu SEN (alohida repo).

**Anti-Frankenstein (QONUNLAR §1, DB/27):** 3 qatlam — `DesignBlock` (topologiya, qalinlik maydoni
YO'Q) → `ConstructionProfile` (har loyihada bitta) → `Parts` (`panelDecomposition(block, profile)`
bilan **hisoblanadi, hech qachon saqlanmaydi**). App-3 ham shu qonunga bo'ysunadi: komponentga
qurilish (qalinlik/kromka/paz/стяжка) **yozilmaydi**.

**Chegara qoidasi (§2.3, CATCH_UP §1):** «App-2 shkaf yig'ish + barcha bo'lish matematikasini
egallaydi; App-3 bitta komponentni mikro-tahrirlaydi.» Agar vazifa **komponent joylashtirishni**
so'rasa — u **A2'niki**, App-3'niki emas.

---

## 1. App-3 ning ISHI — «Forge product → Kutubxona → App-2»

App-2 — App-3 mahsulotining **iste'molchisi** (§3.5). Oqim:

```
   [Forge tahrirchi]  →  Convert to Component  →  [ComponentLibraryItem]  →  publish gate (server)
        (A3)                    (A3)                       (A3)                     (A3, §10.3)
                                                                                       │
                                                                                       ▼
                                                                          Global kutubxona
                                                                                       │
                                                                                       ▼
                                                              App-2: ComponentRef bilan bog'lab qo'yadi
```

Ustalar bir-biriga komponent **share** qiladi; share'dan oldin **server publish-gate** bir necha
bosqichni tekshiradi (§10.3). Kutubxona global.

---

## 2. KONTRAKT — App-3 shuni ISHLAB CHIQARADI (bu tiplar allaqachon bor: `engine/contracts/design.ts`)

App-3 **`ComponentLibraryItem`** yaratadi; App-2 unga **`ComponentRef`** orqali ishora qiladi. Tiplar
kontraktda **tayyor** (POSYLKA 1308) — sen ularni o'zgartirmaysan, **ishlab chiqarasan**:

```ts
// A3 ISHLAB CHIQARADI — kutubxona yozuvi
export interface ComponentLibraryItem {
  componentId: string;
  version: number;          // KONTENT versiyasi — ComponentRef.pinnedVersion shuni qadaydi.
                            // Monoton, har publish'da +1, HECH QACHON qayta ishlatilmaydi.
  schemaVersion: 1;         // noma'lum versiya → import'da RAD (taxmin yo'q)
  name: string;
  author: string;
  tags?: string[];          // papka = teg ustidan ko'rinish (ikkinchi ierarxiya EMAS, DB/36)
  requiredSlots: RoleSlot[];
  createdAt?: string;
  root: DesignNode & { kind: Exclude<NodeKind, "cabinet"> };  // «cabinet» → KOMPILYATSIYA XATOSI
                            // (App-3 shkaf qurmaydi — DB/32 §1)
  fit?: FitConstraint;      // isbotlangan konvert; YO'Q bo'lsa → app joylashtirishni RAD etadi
  gate: { ok: boolean; failures: ComponentGateFailure[] };    // shu ANIQ versiyaga oxirgi gate
}

// A3 HISOBLAYDI — «18mm da tekshirilgan» dalili
export interface FitConstraint {
  minW_mm10; maxW_mm10; minH_mm10; maxH_mm10; minD_mm10; maxD_mm10;   // isbotlangan o'lcham oralig'i
  validatedProfileId: string;         // qaysi profilda o'lchandi — boshqa profil → qayta-validatsiya
  validatedThicknesses_mm10: mm10[];  // [160] ≠ «18mm da ishlaydi»
}

// A3 ning publish-gate RAD SABABI (hech qachon yalang'och boolean — doim nima buzilganini aytadi)
export interface ComponentGateFailure {
  code: "UNKNOWN_SCHEMA_VERSION" | "UNBOUND_REQUIRED_SLOT" | "DECOMPOSE_FAILED"
      | "CARRIES_CONSTRUCTION"    // strip'dan keyin override qolib ketdi — DB/27 buzilishi
      | "NEST_DEPTH_EXCEEDED" | "CYCLE_DETECTED" | "DEGENERATE_GEOMETRY";
  detail: string;
}

// A2 ISHLATADI (sen EMAS — lekin bilishing kerak): tugun kutubxona yozuviga qanday ishora qiladi
export interface ComponentRef {
  componentId: string;
  pinnedVersion: number;    // bu instansiya qadalgan versiya — faqat ATAYLAB accept o'zgartiradi
  overrides?: Partial<Pick<DesignNode, "size" | "division" | "purpose">>;
                            // FAQAT NIYAT — qalinlik/kromka/paz/стяжка maydoni YO'Q (DB/27)
}
export const MAX_COMPONENT_NEST_DEPTH = 3;
```

**Versiya intizomi (founder, 2026-08-04):** `pinnedVersion` **hech qachon avto-yangilanmaydi**
(«jimgina yangilanish mijozning tayyor loyihalarini buzadi»). Kutubxona badge ko'rsatadi; usta
**qo'lда** qabul qiladi, va **qabul avval fit-check qiladi**, mos kelmasa **sabab bilan rad etadi**
(redteam B6). Bir loyihada bir komponentning ikki instansiyasi turli versiyada bo'lishi mumkin —
lekin bir xil ko'rsatilmasin va cut-listда birlashmasin (B10).

---

## 3. QONUNLAR — App-3 buzmaydigan qoidalar (`app-2/QONUNLAR.md`)

- **§10.1** — 2 tur: `DesignBlock` (root=cabinet, **A2**) va `ComponentLibraryItem` (root≠cabinet,
  **A3**). Ikki alohida `root.kind` noto'g'ri shaklni **imkonsiz** qiladi.
- **§10.3** — **Publish gate SERVERда, 6 bosqich, hech qachon avto-tuzatmaydi:**
  `schema → slot → decomposition → invariant → profile-swap → ad-integrity`. Har rad = `ComponentGateFailure`.
- **§3.1 (Forge qonuni, DB/35)** — App-3 faqat `DesignNode.modifiers[]` ga **modifier** qo'shadi
  (destruktiv emas), absolyut koordinata emas — **envelopega anchor bilan** (masalan
  `{edge:"top", distance:{rule:"ratio", value:0.5}}`).
- **§3.3 — Frankenstein himoyasi:** material/kromka Forge'да faqat **OVERRIDE** (vaqtincha ko'rish);
  **«Convert to Component»da butunlay tozalanadi**, faqat sof geometriya qoladi. (Agar override
  qolib ketsa → gate `CARRIES_CONSTRUCTION` bilan rad etadi.)
- **§4 (34)** — Forge'да erkin chizilgan panelga **geometriyadan** rol beriladi (pastdan-yuqoriga,
  **AI emas — geometrik qoida**). Klassifikatsiya faqat **SAQLASHда** (drag'да emas — telefonда
  O(N²) imkonsiz; <2ms, N≤150). «Tasniflanmagan» faqat Forge ichida — kontraktga kirmaydi.
- **§1.2 (DB/27)** — komponentga qurilish maydoni yozilmaydi; `Parts` hech qachon saqlanmaydi.

---

## 4. ISH RO'YXATI (grounded — nima qilinadi)

1. **Forge tahrirchi** — bitta komponentni mikro-tahrirlash: panel chizish/o'zgartirish
   `modifiers[]` orqali (non-destruktiv, envelopega anchor bilan) — §3.1.
2. **Geometrik rol-klassifikator** — chizilgan panellarga pastdan-yuqoriga rol beradi (geometrik
   qoida, AI emas), faqat saqlashда — §4.
3. **«Convert to Component»** — override (material/kromka/qurilish)ni **butunlay tozalaydi**, sof
   geometriya qoldiradi (§3.3). Natija = `ComponentLibraryItem`.
4. **`ComponentLibraryItem` авторлик + versiyalash** — `version` monoton +1, `schemaVersion`,
   `requiredSlots`, `root.kind ≠ cabinet`, `author`, `tags`.
5. **`FitConstraint` hisoblash** — komponent qaysi konvert oralig'ida (`minW..maxD`), qaysi profil va
   qalinliklarда **dekompozitsiya qilinishi isbotlangan** — bu App-2'ning fit-check'i uchun asos.
6. **Server publish-gate (§10.3)** — 6 bosqich, hech qachon avto-tuzatmaydi; har rad
   `ComponentGateFailure` (7 kod). Bu global kutubxonaga chiqishdan oldingi darvoza.
7. **Global kutubxona / share** — ustalar komponent share qiladi; gate'дан o'tgan versiyalar chiqadi.
   ⚠️ **Marketplace iqtisodi** (ko'rinish, kuratsiya, daromad-ulush) **ATAYLAB tashqarida** — DB/21
   §7 iqtisodini «TBD» deb belgilagan; taxminni kontraktga muzlatish — bo'shliqni ochiq qoldirishdan
   yomonroq (`design.ts:153-156`).
8. **Laminatsiya (Forge «Bind (Laminate)» asbobi) — App-3, kontrakt tayyor — BAJARILDI.** «Televizor dekoratori»
   = qalin tepa (2 qavat LDSP). Bu **Forge modifikatori** — manba: `CATCH_UP:41` («DB/35 =
   FORGE_MODIFIER_LAW») + `QONUNLAR §3.2` («Laminate→BOM ishi: 2 panel yelim, 32mm bitta panel EMAS»).
   Aniq app-egaligi (taxmin emas):
   - **Kontrakt (tayyor):** `DesignNode.modifiers?: Modifier[]` + `ModifierType` («laminate») kontraktда
     **BOR** — der posylka `f8d62cc` qo'shди (avvalги «founder PR kerak» **eskiрган**). Kutиш yo'q.
   - **A3 (SEN):** «Bind (Laminate)» **Forge asbobi (chip UX + writer)** — **BAJARILDI** (anchor (A) `anchors:[]`,
     founder ratifikatsiyаsига provizional).
   - **A2/engine (iste'molchi):** modifikatorni o'qib **decompose** qiladi — `{layers}` → 2 panel +
     yelim/BOM (kesimda 2 bo'lak, 3D bitta yaxlit). Bu kod App-2'да (`pricing/parts.ts`,
     `cncExport.ts`), lekin faqat A3 modifikator + kontrakt maydoni bo'lgandagина ishga tushadi.
   - **Столешница istisno** (32mm alohida — CATCH_UP §3).
   *(Eslatma: QONUNLAR §13 «ixtiyoriy shakl» — bu ORDERED-GOODS uchun, A2 — Forge emas; adashtirma.)*

---

## 5. CHEGARA — App-3 nima QILMAYDI (A2'niki)

- **Shkaf qurmaydi** (`root.kind` da «cabinet» = kompilyatsiya xatosi) — §10.1, DB/32 §1.
- **Grid / bo'lish matematikasi (Fixed/Ratio/Locked/Flex)** — A2'niki (§2.2).
- **Komponentni joylashtirish / ratio bilan ko'paytirish** — A2 (`ComponentRef` orqali).
- **Fit-check'ni ACCEPT paytida ishga tushirish** — A2 (senъ bergan `FitConstraint`dan foydalanib).
- **`panelDecomposition` (Part[] hisoblash)** — engine/founder (App-3 emas).

App-2 tomonda allaqachon bor (sen bilishing uchun): `ComponentRef` kontraktda; «Библиотеки» ekrani
(v9 3-tab) — hozir **reference + «Мои шкафы»** (lokal), chunki haqiqiy `ComponentLibraryItem` hali
ishlab chiqarilmagan; «Группировать» = stub («у founder / App-3»). Sen `ComponentLibraryItem` ishlab
chiqara boshlaganingda, App-2 ularni ko'rsatadi va accept-fit-check'ni ulaydi.

---

## 6. Boshlash

1. App-3 repongni organib chiq (nima bor, nima yo'q).
2. `engine/contracts/design.ts` dagi yuqoridagi tiplarni App-3'да **mirror/import** qil — bu ikki
   app o'rtasidagi **yagona shartnoma**. O'z qo'ling bilan kengaytirma; farq bo'lsa founderga ko'rsat.
3. §10.3 gate 6 bosqichi + 7 `ComponentGateFailure` kodini asos qilib publish-oqimini qur.
4. `FitConstraint`ni haqiqiy dekompozitsiya bilan isbotla (taxmin emas).
5. Reja tuz, bosqichma-bosqich ishla; har o'zgarishда typecheck+test yashil bo'lsin.

**Manbalar:** `engine/contracts/design.ts` (91-226) · `app-2/QONUNLAR.md` (§1, §2, §3, §4, §10) ·
POSYLKA 1308 `README.md` (§1-3 ComponentRef/version/nest) · `DB/35_FORGE` (Forge modifikatorlari).
