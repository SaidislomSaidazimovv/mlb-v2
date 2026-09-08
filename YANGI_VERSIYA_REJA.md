# Mebelchi — Yangi Versiya · Reja va Qonunlar

> Bu hujjat `docs/september-8/48–54` (founder bergan spec) **asosida** tuzилган. Har band qayerdан
> olингани `(manba: …)` bilan ko'rsatилган. Bu yerда **o'ylab topilган, qo'shib yozилган hech narsa
> yo'q** — faqat founder hujjatlaridаgi qarorlar o'zbekчага jamlanган. Ziddiyat yoki bo'shliq bo'lса,
> "Ochiq savollar" (§10) da belgиланган, hal qilinмаган holда.

---

## 0. Vazifa (founder)

Founder `app-2/September 8/` papkасida 7 ta hujjat berди va dedi (mazmuн):
> «Shu asosida yangi versiyaни quring. Keyин eski va yangi versiya chiqаrган fayllarни solishtирамиз.
> Ikkала versiyadан **10 ta mebel**ning fayllari kerak. Bir xil mebelни ikkала versiya qanday
> **bo'laklarга bo'lади** (parts) va qanday **teshади** (drilling)?»

### Qat'iy qoidalar (foydalanuvchi, o'zgarmas)
- Yangi versiya **to'liq shu alohida repoда** (`mebelchi-v2`). Eski versiya (`mebelchi-2app` /
  `mebely`) — faqat **kerakли/yetishмаётган narsani olиб turадиган manba**, qurish joyи EMAS.
- Faqat yangi versiyaда ishlaymiz, foydalanuvchi «eskisiga o't» demагунча.
- `docs/september-8/48–54` — **QONUN**. Hammasиga amal qilинади. **O'ylab topма, o'zingdан qo'shма,
  to'qиб chiqарма.** Yetishмаса — butun repo + mebely'ni izlа, keyин founderдан so'ra.

---

## 1. Qamrov — bu faqat App-2 emas (manba: `50`§4, `51`J2, `54`§1)

`48`даgi **Sheet (List)** modeli — App-1 **va** App-2 ostiдаgi **bitta umumий yadro (engine)**:
- **App-1**: Sheet / Block / Module (devor, chiziq, bo'lak) — mualliflik (`50`§4 nomlar jadvali).
- **App-2**: Type / Rule / Parts / Release (parametrik turlar, qoidalar, qismlar, kesim) — (`50`§4).
- Yangi yadro eski `apps/app/src/model/grid.ts` ("per-band tracks")ning **asosий g'oyasини almashtирады**
  → global chiziqlar + pozitsiya + qalинlиk (`54`§1).

**Holat (tekshirilgan, 2026-09-08):** `grid.ts` eski repoда bor; `poligon/model` (roles/facets/
cascade.ts, "16 test" — `54`§4 "allaqачон qilинган" deydi) **na `mebelchi-2app`da, na `mebely`da yo'q**
→ yangi yadro noldан boshlanади. (Founder o'z muhitида qilган bo'lиши mumkin — §10 ga qara.)

---

## 2. Qonun hujjatlari indeksi (`docs/september-8/`)

| Fayl | Mazmuн (qisqa) |
|---|---|
| `48_SHEET_LOGIC.md` | Poydevor. Devor=List; List=chiziqlar; segment qalинlиgi 0/16/32; kesишма ustунlиgи. 17 qonun L0–L16. |
| `49_VERDICTS.md` | 12 dastlabki qonunнинг red-team hukmi + founder rulings jadvali. |
| `50_AUTOGROUPING.md` | Qoida=predikat (ro'yxat emas). Facet'lar; kaskad; Law A–E; rezolyutsiya konveyeri P0–P6. |
| `51_LAW_D_STRESS.md` | "Geometriya devori"ni 29 stsenariy bilan sinаб, D1–D12 qilиб qайta qurиш. |
| `52_MAGIC_SEPARATION.md` | Har sozlama/fizik narsa = fayl (diagram bilan). **Ma'lumot vs Kod chegарasи.** |
| `53_RELEASE_AND_PARTS.md` | Model→yog'och: Release (imzoланган, o'zgarmas snapshot), Parts ekrani, kesim ro'yxatи. |
| `54_ROADMAP.md` | **Reja.** Ish bo'lиниши, migratsiya, muzлатилган API, T1–T16 vazifalar. Saidislom uchun. |

---

## 3. Ma'lumot vs Kod chegарasи (manba: `52`§1, `54`§5)

- **Ma'lumot (fayl):** kesишма ustунlиk jadvali, qoldiq siyosatи, цоколь balandligi, ilgak overlay,
  kromka qalинlиgi, qalинlиk sinflari, minimumlar, kvantланган to'plamlar, validlik sohalari, sex
  kesim konvensiyalari.
- **Kod (invariant):** *aynan bitta taxta kesишмадан o'tади*; *har katak aynan bitta bo'lakка*;
  *resolve chiziqni siljitмайди*; *facet o'zidan quyi facetга bog'lanмайди*; *yuzalar ustma-ust
  tushмайди*.
- **Litmus:** agar tahrir qilинганда model **noto'g'ri** bo'lса (shunчаki boshqача emas) — bu **KOD**.

---

## 4. Ish bo'lиниши (manba: `54`§0)

| | Yozади | Tegмайди |
|---|---|---|
| **AI (Claude)** | engine — sof funksiyalar, UI yo'q, I/O yo'q, har biri test bilan | React, ekran, jest, uslub |
| **Saidislom** | ekranlar, jestlar, holat ulашь, foydalanuvchi tegадиган hamма narsa | engine ичи |

Chegara = **API (§6)**, ikki tomон boshlаshдан oldin muzлатилади. Engine hech qачон Reactни import
qилмайди.

---

## 5. Muzлатилган API (manba: `54`§2) — kelишув bilan o'zgarади

```ts
// sheet
createSheet(opening, ends): Sheet
apply(sheet, op): Result<Sheet, Refusal>            // L0: atomik, nomланган, butun-yoki-hech
legalDomain(sheet, opKind, target): Domain          // L13: nima qabul qilинарди

// derivation (P0→P4)
derive(sheet, profile, rules): Derivation           // { parts, modules, junctions, facets, provenance }

// rules
resolve(part, property, rules): Resolved            // 54: "✅ built" (bizda YO'Q — §10)
blastRadius(parts, rule, rules): BlastRadius         // 54: "✅ built" (bizda YO'Q)

// validation + output (P5→P6)
validate(d): Refusal[]
release(d, shop): Release
diffReleases(a, b): PartDiff[]

// things (fayllar)
loadThings(dir): ThingIndex
lockOf(project, index): Lock
checkLock(project, index): LockStatus
```
Uch qoida (`54`§2): har funksiya **sof**; hech narsa **mutatsiya qилмайди** (undo = Sheet stek);
har rad etиш ishga tushган **qoida + tuzатадиган sozlama havolasини** tashiydi.

---

## 6. Vazifalar T1–T16 (manba: `54`§3) — har birида "gate" (o'tиш sharti)

**Poydevor — Sheet yadro**
- **T1 · Sheet primitives** (AI). Barqaror id + butun pozitsiyали chiziqlar; 0/16/32 segment; katak;
  bo'lak; L1 yuza-invariant; L5b ε-snap; L16 butun qoldiq. *Gate:* sheet har operatsiyadан o'tади,
  L1 commitда hech qачон buzилмайди.
- **T2 · Junctions** (AI, T1 kerak). L/T/X; profil rutbаsidан ustунlиk; `both` rad; per-junction
  override; qamrаб-olувchi-bo'lak qoidasi (`48`§2). *Gate:* 800-korpus — V-through→ust 768;
  ag'darилса ust 800, sidelar −32; bitta derive, nol shox. Penal ish-stoli chizig'ini kessa polka
  o'smаydi.
- **T3 · Board runs** (AI, T2 kerak). O'tувчи-kesишмаda birlashgан bir xil-chiziqли yugurишlar;
  qalинlиk/material/tola o'zgаriши tugatади (L6). *Gate:* baza+penal umumий chiziqда **bitta** 2400
  taxta; bazaнinг o'ng sidesi yo'q.
- **T4 · Modules** (AI, T3 kerak). 32-segmentdан hosil; ixtiyorий shakl; transport tekshiruvи.
  *Gate:* bitta chokни ulасa ikki modul bittaга qo'shилади, transport ogohlantириши chiqади.

**Operatsiya qatlамi — "o'yинdek" his**
- **T5 · Ops + legal domain** (AI, T1 kerak). Har op = nomланган tranzaksiya (L0); har op turi uchun
  `legalDomain()` (L13); rad-etиш registrи qoida nomlari bilan. *Gate:* har op mutatsiyasiz "nima
  qabul qilинарди"ga javob berади.

**Qoida tizimи**
- **T6 · Facet tiering** (AI, qismán). Tier-0 (topologiya, geometriyasiz) va Tier-3 (yakuн o'lchov
  kerak). *Gate:* `adjacency` geometriyasiz hisoblanади; `edge_exposure` hisoblаshни rad etади.
- **T7 · Cascade P1/P4 + stratifikatsiya** (AI, T6 kerak). resolve'ни geometrik (faqat Tier-0
  predikat) va ko'rinиш bosqichlarига bo'lиш; Tier-3'ni ishlаtган P1 qoida **yozилган paytда** rad
  (`51` D8). *Gate:* `51` E1 tsiklik qoida yozганда rad; E2 (exposed end panel) qabul.

**Ma'lumot fayllar**
- **T8 · Thing loader** (AI, mustaqil — parallel). Folder-per-Thing; `def.json` header
  (`uid`/`version`/`schema`/`origin`); nomspacели indeks; asiklik tekshiruv; faqat deklarativ
  (`52`§7); birlиk majburий; `examples/` publishга o'tиши shart. *Gate:* diagramsiz Thing publish
  bo'lмайди; o'ziники bo'lмаган maydонни yozган Thing rad.
- **T9 · Lockfile** (AI, T8 kerak). Har Thing uchun `(uid, version, content-hash)`; lock mos kelмаса
  kesim ro'yxati chiqмайди; teskari indeks. *Gate:* bir loyiha + bir lock → boshqа mashinada
  bayt-bayt bir xil kesim ro'yxati.

**Chiqiш**
- **T10 · Validation (P5)** (AI, T3+T7 kerak). Egallовчи bo'yicha minimumlar; qatlам bo'yicha
  to'qнашувlar; material sohalari; bajarилувchanlик. *Gate:* har rad qoida + sozlanадиган faylни
  nomlaydi.
- **T11 · Release (P6)** (AI, T10 kerak). Finished→cut arifmetikasi (sex konvensiyasi bilan);
  qo'l tomonи (handedness); tola; 0.1mm aniqlиk; o'zgarmas raqamланган release; `diffReleases`;
  pre-flight ro'yxati (`53`§1). *Gate:* o'zgаrishdan keyин qайta-release qaysи taxta o'sди/paydo
  bo'lди/g'oyib bo'lди, va qism raqamlari siljимайди.

**Interfeys — Saidislom**
- **T12 · Sheet muharrири** (Saidislom, T1+T5). Chiziq surish, split, delete→Void, Absorb. Qonunий
  diapazon surish **davomида** (L11). Kursor balandligida hech nima tugatмаyдиган chiziqlar xira
  (L5a).
- **T13 · Inspektor** (Saidislom, T7). Taxtaга bosса: uzunlik, kesишмаlar, rang, kromka — har biri
  uni hal qilган qoida + havola bilan.
- **T14 · Generatsiyаланган sozlama ekranlari** (Saidislom, T8). Sozlama UI **Thing def'laridан**
  generatsiya qilинади. *Gate:* yangi Thing papkаsi qo'shsа, UI kodsiz yangi sozlama ekranи paydo.
- **T15 · Parts ekrani** (Saidislom, T11). Chizма + jadval, ikki tomonlама tanlov; haqiqий masshtab;
  kromka vektor; o'chириш = segment tahrирi (`53`§3).

**Ko'ndalang**
- **T16 · Korpus va CI** (ikkаласи, T3dан). Real devorlar; `(devor × profil × theme)` uchliklar;
  har qonun o'zgаriши qайta-derive + diff; `51`§6 dagi 8 ta minimal fixture. *Gate:* o'shа 8 tasi
  o'tади va o'tиб turади.

---

## 7. Hozir nimadан boshlаsh (manba: `54`§4)

Bloksiz, shu tartibда: **T1 → T2 → T3 → T5**. Parallel istалган payt: **T8, T9**.
Har safar yetkазиб berиш shakli: sof TypeScript `src/poligon/model/`da (bu repoда — yangi yadro),
test faylи `tests/`da, UI import yo'q. (`54`§4)

> **Diqqat:** `54`§4 "roles.ts, facets.ts, cascade.ts (16 test) allaqачон yetkазиб berilган" deydi —
> bizda YO'Q (§10). Demak T6/T7 "qismán qilинган" emas, **noldан**.

---

## 8. Kutиладиган natija + Qabul-sinovi (manba: founder + `54`§1 + T16 + `53`)

**Nima quramiz:** yangi engine — devorни (Sheet) olиб, **qismlar (parts / kesim ro'yxati)** va
(keyинroq) **teshиклар (drilling)** hosil qilади; Release/Parts chiqиши.

**Natija qanday bo'lиши kerak (founder sinovи):**
- **10 ta real mebel** olинади.
- Har biri **eski versiya** (hozirги engine → kesim + сверловка/SWJ008) **va yangi versiya**
  (Sheet-engine → qism + сверловка) orqали o'tказилади.
- **Solishtириш:** bir xil mebel har ikkала versiyada qanday **bo'laklarга bo'lин­ди** va qanday
  **teshилди** — farqlar jadvalи.
- `54`§1 "parity gate" + T16 korpus mantиğи: yangi versiya eski bilan **bir xil kesim ro'yxati**ни
  berса — o'tди; farq bo'lса, u **atayлаб** (yangi model eski `grid.ts` uddalай olмайдиган holatlarни
  to'g'ri qilади — masalan poldан-shiftgача penal yonида baza bilan **bitta 2400 taxta**, 850mmда
  **soxta polka yo'q** — `48`§2, `54` T3 gate).

---

## 9. Kelишilган jamlanма (bir qarashда)

| Savol | Javob | Manba |
|---|---|---|
| App-1 ham, App-2 ham? | Ha — ikkаласи ostiдаgi yangi Sheet-yadro | `50`§4, `54`§1 |
| Reja bormi? | Ha — `54` (T1–T16 + API + gate) | `54` |
| Qayerда? | Alohida repo `mebelchi-v2` (bu yerда) | foydalanuvchi |
| Eski versiya roli? | Faqat manba (kerakли narsani olamiz) | foydalanuvchi |
| Kim yozади? | AI=engine, Saidislom=UI | `54`§0 |
| Natija? | 10 mebel × (eski/yangi) → parts + drilling farqи | founder, `54`§1 |

---

## 10. Ochiq savollar (hal qilinмаган — foydalanuvchi/founderдан)

1. **`poligon` yadro (roles/facets/cascade.ts, 16 test)** — `54`§4 "allaqачон qilинган" deydi, ammо
   na `mebelchi-2app`da, na `mebely`da yo'q. Founder o'z muhitида qilганmi? Bersaми, yoki noldан
   yozамizми?
2. **Teshик / сверловка (drilling)** — "teshади" solishtируvи kerak, ammо `48–54` buни chuqur
   yozмайди (faqat `52` `joints/`, `50` P6). Eski engine SWJ008 chiqаради. Yangi versiyada teshик
   qayerdан keladi — eski engine primitivlariни ko'chирамizми, yoki founder yangi spec berадими?
3. **10 ta mebel** — qaysи 10 ta? (Eski versiyaда saqlangan real loyihalar? Golden misollar?)
4. **Parity ikki repoда** — eski/yangi ikki alohida repoда bo'lса, solishtириш eski engine'ni o'z
   repoсida, yangi engine'ni bu repoда ishlаtиб, chiqган fayllarни diff qilиш bilan bo'lади (bir
   korpusда emas). Tasdiqlаsh kerak.

---

*Keyingi qadam:* reja tasdiqlansa → `T1 (Sheet primitives)` + test, `src/poligon/model/`da. Undан
oldин engine loyiha skeletи (package.json, tsconfig, vitest) qo'yилади.
