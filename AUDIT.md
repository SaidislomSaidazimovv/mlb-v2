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

## B. TASHLAB KETILGAN / STUB / SOXTA (skipped) — yo'q yoki yarim

| # | Nima | Holat | Hujjat |
|---|------|-------|--------|
| B1 | **Depth (chuqurlik)** | UMUMAN yo'q — Sheet/Block da depth yo'q; kesim faqat qalinlik×uzunlik | 48§4 + 49: "Depth **NOT deferred**". Side 560×720, biz faqat 720 beramiz. **Kesim ro'yxati CHALA.** |
| B2 | `derive()` `rules` | E'TIBORGA OLINMAYDI (`_rules`) — cascade (resolve) va geometriya ALOHIDA | 50§5 P0→P6: P1 geometrik param → P2 geometriya → P4 appearance. §2 `derive(sheet,profile,rules)` — rules qismi ishlamaydi. |
| B3 | `derive()` adjacency | `panelTopo` qo'shnini HAR DOIM "none" beradi → adjacency har doim "free-end" (SOXTA) | 50§1: adjacency block-grafdan. |
| B4 | **L15 wall ends/opening** | `createSheet()` argumentsiz | Hujjat: `createSheet(opening, ends)` — free/into-corner/against-wall, into-corner→Reserved. Yo'q. |
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
