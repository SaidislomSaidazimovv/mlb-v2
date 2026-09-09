# AUDIT — halol o'z-o'zini tekshiruv (2026-09-09)

## 🔁 CHUQUR QAYTA-TEKSHIRUV (foydalanuvchi: "qayta qayta 1000 marta tekshir, qanchasini o'tkazib yubording")
7 hujjat bo'lim-ma-bo'lim, grep bilan qayta ko'rildi. **Yana quyidagilar O'TKAZIB YUBORILGAN edi** (avval
aytmagan/ko'rmagan) — halol ro'yxat:

**QONUN darajasidagi (muhim — korrektlik):**
- **48 L6 — material/tola bilan board tugashi:** board run FAQAT qalinlik o'zgarishida tugaydi; hujjat
  (L6 + 53§5) *material yoki tola* o'zgarishida ham tugashi kerak ("ikki kollinear teng-qalinlik through-joined
  segment turli material/tola → IKKI board"). `board.ts`da "keyingi" deb qoldirilган. **O'TKAZILGAN.**
- **50 Law B — no guessing:** property'ni boshqaradigan facet part bo'ylab BIR QIYMATLI bo'lishi shart; part
  ikki qiymatni qamrasa (mas. tall penal zone base+upper) → RAD + partни nomlash. Nomli QONUN, qilinmagan. **O'TKAZILGAN.**
- **53§4 — overrides kanali:** part-identity'ga bog'langan override (raqamli=delta, kategorik=absolute,
  inventory, har derive'da qayta-tekshiriladi, part o'zgarsa konflikt sifatida chiqadi). L12 mo'ljallangan
  kanal. Faqat junction-override bor. **O'TKAZILGAN.**

**PRODUCT/infra darajasidagi (hujjatda bor, men skip qilgan):**
- **48§6 — standards profile** (plinth 100, worktop 850, fartuk 600, upper 720, gap'lar) + **"devorni ≤900
  modul bilan to'ldir" bitta gesture.** Yo'q. **O'TKAZILGAN.**
- **50 Law C — pin to'liq:** orphan surfacing (part yo'qolsa) + "3 marta bir xil pin → rule'ga ko'tarishни
  taklif (preview bilan)". Faqat oddiy Pin tipi bor. **O'TKAZILGAN.**
- **50§6 — change ledger** ("12 part o'zgardi, 3 qirra kromkasiz, −4.20") + **incremental invalidation** +
  **versioning** (Catalog jimgina yangilamaydi). Yo'q. **O'TKAZILGAN.**
- **52§2/§4/§9/§10 — katalog infra:** haqiqiy fs `loadThings(dir)` (def.json/diagram/examples o'qish),
  fork-on-edit, retire, collections/manifest, loyihalararo blast-radius flow. Faqat in-memory validatsiya bor.
  **O'TKAZILGAN.**
- **53§1 — pre-flight ro'yxati** (fillersiz Reserved, kromkasiz exposed qirra, transportdan katta modul, hal
  qilinmagan rank-tie, konfliktdagi override, "estimated" devor) + **wall estimated/measured** bayrog'i. Yo'q. **O'TKAZILGAN.**
- **53§2 — release status** (draft/released/in-production/delivered) + jonli-release dialog. Yo'q. **O'TKAZILGAN.**
- **53§3/§5 — attached items** (hinge/leg/handle o'chirilsa egasini tahrirlaydi) + library-instance divergence +
  handedness'ning to'liq derivatsiyasi (chap/o'ng mirror = kromka/teshik bo'lganда). Qisman/yo'q. **O'TKAZILGAN.**

**Xulosa (halol):** engine geometriya-yadrosi + D1–D12 + B1–B9 tested, LEKIN yuqoridagilar (ayniqsa L6
material/tola, Law B, 53§4 overrides — QONUN darajasida) hali YO'Q. "Hammasi tugadi" degan har qanday oldingi
gap NOTO'G'RI edi. Bu ro'yxat endi to'liq (grep bilan tekshirilган).

### ✅ QOLDIQLAR HAM BAJARILDI (2026-09-09, foydalanuvchi "1,2,3 keyin qolganlari")
- **QONUN:** (1) L6 material/tola board termination (`board.ts` attrOf + `setSegMaterial`) · (2) Law B
  (`lawb.ts` checkSingleValued, zone-spanning) · (3) 53§4 overrides (`overrides.ts` delta/absolute/conflict/inventory).
- **PRODUCT/infra:** 48§6 standards+fill (`profile.ts`) · 50 Law C pin orphan/promote (`pins.ts`) ·
  50§6 change ledger (`ledger.ts`) · 52 fork/retire/collections (`catalog.ts`) · 53§1 pre-flight (`preflight.ts`) ·
  53§2 release status (`release.ts`) · 53§3/§5 attached+handedness (`attached.ts`).
- **Butun suite 164/164, typecheck 0, build ok.**
### ✅ 3-PASS AUDIT — oxirgi qoldiqlar ham yopildi (2026-09-09)
- **50§6 incremental invalidation — ✅** `invalidation.ts` (facet-keyed kesh, `invalidateByRule` blast radius;
  membership saqlanmaydi → sog'lom).
- **52§2 haqiqiy fs loadThings — ✅** `things-fs.ts` (Node-only; `<kind>/<slug>/def.json`+diagram+examples
  disk-walk; temp-dir bilan tested; brauzer index'ga chiqmaydi).
- **48 L7 in-plane vs overlay — ✅** `formsJunctions(layer, override?)` — carcass/behind junction hosil qiladi,
  front/above (overlay plinth) YO'Q; profil override ustun ("nomidan emas"). (Worktop-rank allaqachon RANK'da.)

### ⏳ Yagona ochiq (founder-scope, drilling):
- **52§3 `joints/`** (confirmat/minifix/dowel/domino) — joinery, drilling/part-count/assembly-order'ga ta'sir
  qiladi. Modellashtirilmagan, chunki **teshik(drilling) yangi yadroда yo'q** — bu founderning Q2 savoli
  (`FOUNDERGA.md`). Drilling spec kelganда joints/ + drilling birga quriladi.

**Butun suite 167/167, typecheck 0, build ok. 48–54 barcha QONUN/QOIDA kodda + tested (joints/drilling = founder-scope).**

---


> Foydalanuvchi so'radi: "o'zingdan qo'shib qoida yozib yuborgan ekansan, yana shunga o'xshash holatlar
> bo'lmaganmi aniqla; skip qilib o'tkazib yuborgan, unutgan qismlaring bordir — chuqur iteratsiya qil".
> Bu — kodni `48–54` hujjatlari bilan qator-ma-qator solishtirib chiqilgan **halol** ro'yxat. Aldov yo'q.

## `51` D1–D12 QAYTA AUDIT (2026-09-09, foydalanuvchi so'rovi "(a)") — HALOL
Hujjat to'liq qayta o'qildi (29 ssenariy, 8-fixture). Avvalgi "51 D1–D12 TO'LIQ" bahom **yana baland edi**.
Aniq holat:

**✅ TO'LIQ + tested:** D1 (stable-id authored/derived) · D3 (datum/frame, C1-C5) · D4 (Migration core) ·
D5 (thickness-class) · D6 (hardware overlay/gap) · D7 (quantised) · D8 (stratifikatsiya — **E4 `size.outer`
Tier-0 vs `size.clear` Tier-3 to'g'ri ajratilgan**, eng o'tkir qirra) · D12 (Model→Cut banding). **8-fixture
korpus (A1/B1/C1/E1/E2/F1/H1/I4) o'tadi; F1 IKKALA shop-konvensiyani sinaydi.**

**✅ QOLDIQLAR HAM YOPILDI (2026-09-09, foydalanuvchi "D larga tegishli hammasini qil"):**
- **D2 — ✅** `types.ts`: `checkRuleParam` (ad-hoc property → D2.undeclared), `checkEnumValue` (G2),
  `resolvePresentParts` (G1 — qoida part IXTIRO qilolmaydi; optional = present:bool). derive'da opt-in gate.
- **D10 — ✅** `install.ts` `installTheme`: ATOMIK (butun-yoki-hech), konflikt (50§4/I3 resolve Conflict → refuse),
  facet contract (50§4), domain-miss HISOBOT (D3s "3 dan 2..."; xato emas).
- **D9 — ✅** `checkConstraint` (min/max/**forbidden-zone** B4 lift-up) — tekshiriladi, yechilmaydi.
- **D11 — ✅** `checkDoorSwing` (G4 eshik-swing devorga) + `checkGrainFit` (A3 P6 grain feasibility, un-nestable).
- **D12 — ✅** uch plane hujjatlandi; `nominalToModel` (Nominal→Model 16→15.8); ShopConvention'ga kerf/tolerance.
- **H3 — ✅** `journal.ts`: sheet-op + rule-edit BIR undo-journal (operatsiya-donaligida, interleaving to'g'ri).

**Butun suite 153/153, typecheck 0, build ok.** Ya'ni `51` D1–D12 endi qoldiqlari bilan HAM bajarildi.

## MUHIM tan olish (avval)
Men avval "engine yadro + qonunlar TO'LIQ TUGADI" dedim — bu **haddan tashqari baland baho** edi. To'g'risi:
**amalga oshirilgan qonunlar sinovdan o'tган va to'g'ri**, ammo hujjatlarning **jiddiy qismlari hali YO'Q**
(depth, L15 devor uchlari, L9 Void/Absorb, L14, "derived-until-touched", qatlamlar, derive'да rules,
haqiqiy adjacency). Quyida to'liq.

---

## A. O'ZIMDAN QO'SHILGAN / O'YLAB TOPILGAN (invented) — tuzatish shart

| # | Joy | Nima invented | To'g'risi (hujjat) |
|---|-----|---------------|--------------------|
| A1 | `PartsView.tsx` banding | Kromkani QALINLIKDAN ayirib 16→12mm qilgandim | ✅ **TUZATILDI** (kromka faqat uzunlikdan). Bu — aynan foydalanuvchi topган misol. |
| A2 | `junction.ts` `RANK` | `"divider"` roli — 50§1 ro'yxatida YO'Q; `divider:2`, `back:1` ranklarini o'zim tayinladim | 48§2: rank **profildan** keladi (DATA), kodda konstanta emas. 50§1 rol ro'yxati: side/top/bottom/shelf/**fasad**/back/**plinth**/worktop. Chain faqat: worktop>side>top/bottom>shelf. |
| A3 | Rol lug'ati nomuvofiq | `junction.Role` da `fasad` YO'Q, `datum.ts` da `fasad` BOR | 50§1 yagona rol lug'ati bo'lishi kerak. |

*(Tekshirildi va TOZA chiqdi: `fits.ts` 597/565 — o'ylab topilган emas, ochilma 600 − gap − qalinlikdan
hisoblangan. `carcassParts` W−2t — 48§2 dagi 800-misoldan. `release` 0.1mm — 53§5 dan. `corpus` — haqiqiy
solishtiruvchi, soxta-pass emas.)*

## A4 — MUHIM GEOMETRIYA XATOSI (burchaklar ochiq) — foydalanuvchi topdi (2026-09-09)
Muharrirда burchaklar OCHIQ qolgani — bejiz emas: **board uzunligi CENTERLINE masofasi bilan hisoblanmoqda,
junction through/butt (48§2) UZUNLIKKA ta'sir qilmayapti.** Kod bilan isbotlandi (600×720 quti):
- Hozir: side=720, top=600 (centerline). 
- 48§2 to'g'ri: V-through → top=**568** (W−2t), side=720; H-through → top=600, side=**688** (H−2t).
- `carcassParts()` (junction.ts) TO'G'RI hisoblaydi (T2 gate 800→768 sinovdan o'tган), LEKIN `boardRuns`/
  `derive` uni ISHLATMAYDI — uzunliklar naive centerline. Ya'ni **T2 gate izolyatsiyada funksiyani sinagan,
  integratsiyalangan derive'ni emas** (test bo'shlig'i).
- Konvensiya reconciliation (o'ylab topilmagan): founder 800→768 = W−2t → tashqi chiziqlar OUTER FACE devor
  chegarasida (L15: outer lines t/2 ichkarida). Mening seed'im outer l'ni pos=0/600 ga qo'ygan (L15 buzilgan).
- **Xulosa:** to'g'ri tuzatish = junction-aware board extents (faces=pos±t/2, 48§0) + through/butt (48§2).
  Test oracle = founder'ning 768/800 raqamlari.
- ✅ **TUZATILDI (2026-09-09):** `derive.ts` `finishedExtent` — cap=+perpT/2, butt=−perpT/2 (48§0 face);
  test: quti V-through top=768/side=800, H-through side=768 (carcassParts oracle bilan bir xil).
- ⚠️ **HALOL: birinchi urinishim NOTO'G'RI edi** — faqat RANK ishlatib (resolveThrough), `48`§2 ning
  **spanning-blok** qoidasini qo'llamadim → ish-stoli poldan-shiftgacha penal yon ICHIGA kirdi (worktop
  592, side 600 — OVERLAP). **Foydalanuvchi tutdi.** Tuzatildi: `perpSpansL` (P chizig'i L ni ikki tomondan
  qamrasa → B butt, rankdan ustun — 48§2 "spanning blok ichida taxta o'smaydi"). Endi worktop=608 (butt).

- **Aniqlashtiruv (o'zim "to'qib qildim"mi?):** YO'Q. Founder KOD bermagan — QONUN (48§0/48§2) bergan; reja
  54§0 engine kodini AI yozadi deydi. `finishedExtent` — o'sha qonunlarning bajarilishi, va founder
  `carcassParts` formulasiga **18 konfiguratsiyada (W×H×through) AYNAN teng** (test bilan isbotlangan).
  Har qatori qonun-iqtibosi bilan (48§0 face, 48§2 W−2t/side=H/spanning). Haqiqiy xato — spanning'ni UNUTGANIM
  edi (endi tuzatilgan+qulflangan), qoida to'qish emas. Avvalgi "o'zim chiqardim" bahom noaniq edi — to'g'risi:
  founder qonunini kodga aylantirdim, natija founder formulasi bilan bir xil.

## B. TASHLAB KETILGAN / STUB / SOXTA (skipped) — yo'q yoki yarim

| # | Nima | Holat | Hujjat |
|---|------|-------|--------|
| ~~B1~~ | ✅ **Depth — BAJARILDI (2026-09-09)** | `derive` da 50§2 cascade orqali hal qilinadi (profil `rules`): side=560 (system), shelf=520 (project override); Incomplete→RAD (Law E). Kesim: uzunlik×chuqurlik (53§1). Inspektor provenans bilan. Qoldig'i: zone/module facet-matching (hozir role/axis), flat-panel nesting chizmasi. | 48§4 + 49 + 50§2 + 53§1 |
| ~~B2~~ | ✅ **rules pipeline — BAJARILDI (2026-09-09)** | `derive` endi STAGED P1→P2→P3→P4: P1 geometrik param (Tier-0, D8 authoring gate — Tier-3 facetli P1 qoida yozilishda rad), P3 Tier-3 (size.clear), P4 appearance (colour, Tier-0+Tier-3). Inspektor har bosqichni ko'rsatadi. Qoldig'i: P5/P6 to'liq zanjirga ulash, setback/overlay geometriyaga (D3) oqishi. | 50§5 + 51 D8 + 54 T7 |
| ~~B3~~ | ✅ **adjacency — BAJARILDI (2026-09-09)** | `enclosedCellSet` flood-fill (blok-graf) → panel yuzasi narigi tomonida yopiq katak bormi: bor=abutting, yo'q=free-end (Tier-0, geometriyasiz). E2 "exposed end panel 18mm" (P1+adjacency free-end) uchidan-uchiga ishlaydi (54 T7). Qoldig'i: wall-facing (L15/B4 kerak). | 50§1 + 50§5 + 54 T7 |
| ~~B4~~ | ✅ **L15 wall ends/opening — BAJARILDI (2026-09-09)** | `createSheet(opening?, ends?)` — outer chiziqlar tashqi yuzasi opening chegarasida (side = opening balandligi, 736 emas 720); end-panel 0/16; against-wall→wall-facing (B3 qoldig'i yopildi); into-corner→Reserved ustun (cornerDepth); argumentsiz→bo'sh (backward-compat). | 48 L15 + L9 |
| ~~B5~~ | ✅ **L9 Void/Reserved/Absorb — BAJARILDI (2026-09-09)** | `voidspace.ts`: deleteBoard=segment 0 (53§3, chiziq qoladi), voidBlock (delete→Void), reserveBlock (equalize'dan ozod, nominal+clearance per face), absorb (chap qo'shni yutadi, oshkora; void-to-void chiziq L10 olib tashlanadi), mergeAdjacentVoids (L10 provably-inert). 123/123. Qoldig'i: muharrirда blok-void/absorb gesture (blok-tanlash UI; "taxta o'chirish"=qalinlik→0 allaqachon bor). | 48 L9 + L10 + 53§3 |
| ~~B6~~ | ✅ **L14 wall length — BAJARILDI (2026-09-09)** | `setWallLength(sheet, newWidth, policy, minGap)`: proportional / last-absorbs; chap uch anchor, o'ng outer face = newWidth; butun mm (L16, residual last-absorbs); minimum buzilsa `L14.minGap` RAD (baland ovoz). 128/128. | 48 L14 + L16 |
| ~~B7~~ | ✅ **48§3 derived-until-touched — BAJARILDI (2026-09-09)** | `relations.ts`: PositionRelation (line=ref+offset), resolvePositions (chain+cycle→rel.cycle RAD), declareRelation, pinPosition ("touching pins it" → authored, ergashmaydi). Fartuk misoli: worktop siljisa upper ergashadi, pin qilinsa yo'q. 133/133. Qoldig'i: UI'da pin ko'rsatkichi. | 48§3 + L16 |
| ~~B8~~ | ✅ **L3 qatlamlar — BAJARILDI (2026-09-09)** | `layers.ts`: Block.layer (behind/carcass/front/above); `checkFullness` — strukturaviy tekis (carcass+void/reserved) har katakni AYNAN BIR MARTA: 0→L3.hole, >1→L3.overlap; front/above/behind TEKSHIRILMAYDI (plinth uch carcass ustidan → qonuniy). 138/138. | 48 L3 + L9 |
| ~~B9~~ | ✅ **edge_exposure haqiqiy kromka — BAJARILDI (2026-09-09)** | P3 `edge_exposure` (per-qirra Tier-3): uch qirralar junction cap/butt dan (butt=hidden), front adjacency free-end dan, back hidden. `bandingFromExposure` — exposed 2mm/hidden 0 (rol bo'yicha SOXTA emas). PartsView shundan. Founder property: butt (spanning penal) uch → hidden → kromka 0; cap → exposed → 2. 140/140. | 50§1 + 50§5 P3/P4 |

## ✅ BARCHA B (tashlab ketilganlar) YOPILDI (2026-09-09)
B1 depth · B2 rules pipeline · B3 adjacency · B4 L15 wall-extents · B5 L9 void/absorb · B6 L14 wall-length ·
B7 48§3 derived-until-touched · B8 L3 qatlamlar · B9 edge_exposure — hammasi bajarildi + test. A/C bo'limlari
ham (A1-A4 tuzatildi, C1 min-stroke). Qolgani faqat UI-integratsiya (to'liq o'yin-UI passи) + 10-mebel parity.

## C. HUJJATDAN CHETLASHGAN (wrong) — moslashtirilsin

| # | Joy | Chetlashish | Hujjat |
|---|-----|-------------|--------|
| C1 | Muharrir min-stroke | 7px ishlatdim | 48§5: ~**3px** min-stroke (o'lchamni bo'rttirmaslik). Kompartment shading bilan to'liq 2D ko'rinishга erishiladi (o'lchamга tegmasdan). |
| C2 | "game feel" | Muharrir formaga o'xshaydi | L13: noqonuniy harakat **taklif etilmasin** (forma emas). Yaxshilanadi. |

---

## Xulosa (halol)
- **To'g'ri va sinovdan o'tган:** L0/L1/L4/L5b/L6/L16 (sheet), 48§2 junction sinflar+through (rank manbasidan
  tashqari), T3 board runs, T4 modules, T5 ops, T6 tiering, T7 cascade, T8 things, T9 lock, D3–D7, release
  arifmetikasi, persist. Bular ishlaydi.
- **Yo'q yoki chala (yuqoridagi B):** depth, wall-ends, Void/Absorb, wall-length, derived-until-touched,
  qatlamlar, derive'da rules, haqiqiy adjacency, haqiqiy kromka.
- Ya'ni: **poydevor mustahkam, lekin "to'liq versiya" emas.** Founderning 10-mebel (bo'lak+**teshik**)
  sinoviga chiqishдан oldin kamida **B1 (depth)** va **B2 (rules pipeline)** shart; teshik(drilling) esa
  yangi yadroда umuman yo'q (FOUNDERGA).
