# 🔵→🔵 App-2 → App-3 HANDOFF — Carry + joriy target'lar (2026-08-26)

> Grounded — **o'zimdan qo'shмайман**. Har band manbasi ko'rsatilган (`35_FORGE_MODIFIER_LAW`, `GLOSSARY`,
> `engine/contracts/design.ts`). App-2 tomoni (import → joylash → aniq 3D → kesim → biblioteka gate) TUGADI;
> bu hujjat App-3'ning ochiq target'larini yig'adi.

---

## 0. Qayerdamiz (kontekst)

App-3 (Forge) yadrosi tayyor: 6 modifikator (hole·notch·bevel·round·laminate·viyemka) · classify · convert ·
client-gate · fit · pos+thicknessAxis eksport · A1 rod. App-2 komponentni **REAL kesim + aniq 3D**ga aylanтираpti
(`decomposeGroup`, §2.4 kanonik). **Yagona katta ochiq target = Carry** (buildable NOW). Qolgani = tasdiq/kutish.

---

## 1. 🎯 TARGET — «Carry» asbobi (HOZIR quriladi · founder shart EMAS)

### Spec (TO'LIQ topildi — App-3 §5.3 kutardi, lekin §5.3 = Material/Kromka, Carry EMAS)
- **`35_FORGE_MODIFIER_LAW.md:75`** (tool→op jadval, so'zма-so'z):
  `Carry | child DesignNode + anchor | that child's own Part + ops`
- **`GLOSSARY.md:146`:** *«**Носитель** — a child attached to a parent by an anchor rule (**decor box on a
  door**, **filler on a run end**). **Follows the parent when it resizes.**»*
- **`design.ts:262`:** *«a `carry` attachment (**decor riding on a face**) does **NOT consume depth**»* (redteam B8).
- **`design.ts:112`:** Carry = **child node biriktirish** — `modifiers[]` EMAS (Laminate kabi emas).

### Ma'nosi (aniq — taxmin emas)
- Carry = panelning **`children[]`**ига **DesignNode** (bola) + **`Anchor`** biriktirish. Bola parent resize'да ergашади.
- Bola = **MAVJUD** NodeKind — masalan **`filler`** (run-oxirига) yoki decor-box (eshикка). **Yangi "decor"
  NodeKind SHART EMAS** (PartRole "decor" bor; lekin bola filler/mavjud kind bo'la oladi).
- Yuzага minadi → **chuqurlik yemaydi** (design.ts:262).
- Bola **o'z Part'ига** decompose bo'ladi (35:75) — App-2/engine tomoni.

### App-3 nima quradi
- Forge asbobi: usta panelga bola (filler/box) qo'yadi → `children[]`ига DesignNode + `Anchor` yozadi.
- **Modifier EMAS · yangi NodeKind EMAS · founder PR EMAS · §5.3 EMAS.** Mavjud `children[]` + `Anchor` bilan.

### App-2 nima qiladi (iste'mol — sizga ma'lumot)
- `decomposeGroup`/`walk` bola'ni o'z Part'ига decompose qiladi (masalan filler → фальшпанель Part).
- ⚠️ Agar bola sof "decor" (накладка, o'z roli) bo'lishi kerak bo'lsa — o'sha **bitta** detal keyin
  aniqlanadi (PartRole "decor" tayyor, profiles.ts:46 kromka bor). Lekin **asosiy Carry (filler/box) hozir ishlaydi.**

---

## 2. ✅ TASDIQLANG — §2.4 + fit (har komponentда bormi?)

Bular bajarilган (siz aytdingiz) — faqat **HAR komponentда** ekanini tasdiqlang:
1. **`pos: {x_mm10, y_mm10, z_mm10}`** — har panel markazi, envelope freym (x=w·y=h·z=d). *(Kanonik §2.4 maydon —
   App-2 `panelPos` o'qiydi.)*
2. **`thicknessAxis: "x"|"y"|"z"`** — har panel qaysi o'q thickness. *(§2.4 maydon — App-2 `panelFace` oladi,
   "derive" o'rniga. Yo'q bo'lsa App-2 "eng kичик" derive qiladi — lekin aniq maydon afzal.)*
3. **`fit` (FitConstraint)** — har komponentда majburiy (siz `profileId` required qildingiz). App-2 F1
   accept-fit-check shunga tayanadi.
4. **profile-swap** — convert-vaqtida `checkProfileSwap` (siz qildingiz). App-2 gate «App-3 (конверт)» deб belgилайди.

---

## 3. 🟡 KUTISH / QAROR (founder yoki App-3 tavsiyasi)

- **#13 anchoring o'lcham-nuqтasi** — provizional (qirраdan-masофа); **founder ratifikatsiyaсi** kutadi (markaz/qirра/bbox).
- **drawer = fasad** (sizning tavsiyangiz) — App-2 decomposeGroup drawer'ни allaqачон фасад (front-thickness) qiladi. **Mos** — tavsiya founderга.
- **stoleshnitsa = hasWorktop flag / DB-34** (bitta-panel emas) — App-2 buni band/run orqali chiqаradi. **Mos.**

---

## 4. App-2 tomoni (sizga ma'lumot — TUGADI)

import (ingestion) · decomposeGroup (laminate→N · viyemka→paz · har panel) · preview (Раскрой) · placement
(＋В шкаф locked-en + drag-drop 📍) · aniq 3D+rasm (pos) · tanlash/o'chirish (partsForCab) · **F1 accept-fit-check**
(FitConstraint) · **F2 §10.3 gate pre-check** (schema·slot·decompose·invariant; profile-swap=App-3, ad-integrity=server) ·
**F3 local/global scope** (🌐/🔒). Gate: app tc 0 · app 272 · root 97 · golden 37.

---

## Xulosa (App-3 uchun)
1. **Carry'ni quring** — hozir, mavjud `children[]`+`Anchor`+filler/box bilan (§1). Founder shart emas.
2. **Tasdiqlang** — pos·thicknessAxis·fit·profile-swap har komponentда (§2).
3. **Kuting** — #13 anchoring (founder) · drawer/stoleshnitsa (tavsiyalar founderga) (§3).
