# UI — yondashuv va reference (yangi versiya)

> Maqsad: UI **AI qilgandek / shablon ko'rinmasin**, va eski versiyadagi *feature+UI chalkashligi*
> qaytarilmasin. Bu hujjat 2 qismdan: (1) founder hujjatlari BERGAN UI xulqi (cited, fakt),
> (2) vizual did uchun O'RGANISH rejasi (bu — o'rganiladigan, hozir da'vo emas — to'qilmagan).

---

## 0. Kim va qachon
- **Kim:** UI kodi — Saidislom (`54`§0). Engine — AI/Claude. Chegara = muzlatilgan API (`54`§2).
- **Qachon:** engine avval (T1–T11). *"UI — allaqachon xato bo'la olmaydigan engine ustidagi
  yupqa qatlam"* (`54`§0). Shuning uchun eski versiyaning chalkashligi (feature'lar UI bilan
  aralashib ketgan) qaytarilmaydi.

---

## 1. Founder BERGAN UI xulqi (fakt — hujjatdan)

| Xulq | Nima | Manba |
|---|---|---|
| **O'yin, forma emas** | Noqonuniy harakat **rad emas, o'chiq (greyed)** — har op oldin "nima qabul qilinardi"ni aytadi (legalDomain). "Refusal'ni legalDomain oldini olishi mumkin edi" = UI xatosi. | `48` L13 |
| **Drag legal-range** | Surish **davomida** qonuniy diapazon + qattiq to'xtovlar ko'rinadi; jimgina clamp yo'q. Kursor balandligida hech nima tugatmaydigan chiziqlar **xira**. | `48` L11, L5a |
| **Generatsiyalangan sozlamalar** | Sozlama UI **Thing-fayllardan** quriladi; har sozlama **rasmi (diagram)** bilan — qo'lda yasalmaydi. | `52`§2, `54` T14 |
| **Parts ekrani** | Chizma **+** jadval, ikki tomonlama tanlov; haqiqiy masshtab; kromka vektor. | `53`§6 |
| **O'zgarishni oldindan ko'rsatish** | Bir qoida 200 qismni o'zgartirishi mumkin → **blast-radius** + **diff-before-commit** ("12 qism o'zgardi, 3 qirra bandsiz, −4.20"). | `50`§6 |
| **Render 2 qonun** | Design view: min chiziq ~3px (ekran piksel). Parts view: haqiqiy masshtab, min stroke yo'q; bo'rttirish bosma faylga chiqmaydi. | `48`§5 |

Bular **o'ylab topilmagan** — hujjatda shunday yozilgan.

---

## 2. Vizual did — O'RGANISH rejasi (bu qism hali FAKT emas, o'rganiladi)

> Quyidagilar — *o'rganish uchun ro'yxat*, ular haqida hech nima da'vo qilinmaydi (to'qilmagan).
> Har birini haqiqatan ochib, ekranlarini ko'rib, naqshini yozib olish kerak.

**Ko'rib chiqiladigan dasturlar (mebel/oshxona CAD + zamonaviy canvas UI):**
- Mahsus mebel/oshxona: PRO100, KitchenDraw, Cabinet Vision, SketchList 3D, Blum (Dynaplan/Product configurator), IKEA/Leroy kabi web-planner'lar.
- Zamonaviy canvas/redaktor did uchun: Figma, tldraw, Linear kabi (o'yindek, tez, toza) — did namunasi sifatida.

**Har birida NIMAGA qaraladi (nusxa emas — tahlil):**
1. Devor/fasad tahririni qanday ko'rsatadi (2D canvas, panellar, o'lchov chiziqlari)?
2. Bo'lak qo'shish/o'chirish/o'lchov o'zgartirish jesti qanday (drag, snap, legal-range)?
3. Sozlamalar/katalog (material, kromka, ilgak) qanday tanlanadi — qancha bosishda?
4. Kesim/parts va chizma qanday chiqadi?
5. Nima YAXSHI, nima YOMON (biz undan yaxshi qilishimiz uchun).

**Natija:** har biri uchun 1 sahifa tahlil + skrinshot/eslatma → keyin bizning UI yo'nalishimiz.

---

## 3. Nimalardan QOCHISH
- Eski versiyaning kasali: **juda ko'p feature + UI bir-biriga chalkashib** buzilish/adashish. →
  Yangi bo'linish (engine/UI) + legalDomain (imkonsizni o'chiq qilish) buni oldini oladi.
- **Shablon/AI-generated ko'rinish** — tayyor komponentlarni o'ylamasdan tashlash. → Atayin dizayn.
- Bo'rttirilgan qalinlik bosma faylga (`48`§5) — o'lchov yolg'on bo'ladi. Yo'q.

---

## 4. Ish tartibi
1. Engine (T1–T11) — hozir, testlar bilan.
2. Muzlatilgan API (`54`§2) — chegara.
3. Bu reference bo'yicha 3–4 app o'rganiladi → UI yo'nalish hujjati.
4. Saidislom T12–T15 ni frozen API + shu yo'nalish ustiga quradi.

> Holat: bu — **boshlang'ich reja**. §2 dagi o'rganish hali qilinmagan (o'rgangach shu yerga
> haqiqiy tahlil yoziladi). Hech narsa to'qib qo'yilmadi.
