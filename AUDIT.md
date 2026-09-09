# AUDIT — halol o'z-o'zini tekshiruv (2026-09-09)

> Foydalanuvchi so'radi: "o'zingdan qo'shib qoida yozib yuborgan ekansan, yana shunga o'xshash holatlar
> bo'lmaganmi aniqla; skip qilib o'tkazib yuborgan, unutgan qismlaring bordir — chuqur iteratsiya qil".
> Bu — kodni `48–54` hujjatlari bilan qator-ma-qator solishtirib chiqilgan **halol** ro'yxat. Aldov yo'q.

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
| B5 | **L9 Void/Reserved + Absorb** | delete→Void, Reserved slot, Absorb komandasi yo'q | 48 L9 + T12 gate. Op'lar faqat addLine/setThickness/moveLine. |
| B6 | **L14 wall length** | qayta taqsimlash op'i yo'q | 48 L14. |
| B7 | **48§3 derived-until-touched** | barcha pozitsiya authored; relation (fartuk=upper−worktop), pin ko'rinishi yo'q | 48§3. |
| B8 | **L3 qatlamlar** | Block'da layer (behind/carcass/front/above) yo'q; "faqat carcass to'la" tekshirilmaydi | 48 L3/L7. |
| B9 | **edge_exposure haqiqiy kromka** | Parts kromkasi rol bo'yicha soxta namuna | 50§1: kromka `edge_exposure` (Tier-3) + Theme'dan. |

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
