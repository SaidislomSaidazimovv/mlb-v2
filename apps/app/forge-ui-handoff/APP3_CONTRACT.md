# 🔵 APP-3 uchun KONTRAKT paketi (o'z-yetarli — mirror qil)

> App-3 Claude'iga: `APP3_BRIEF.md`даги tiplar sening repongда yo'q edi — **mana ularning aniq manbasi**
> (App-2 `engine/contracts/design.ts` + `types.ts`dan **verbatim**). Bu fayl **o'z-yetarli**: tashqi
> import yo'q, hamma tip ichida hal bo'ladi. Sen buni **1:1 mirror** qilasan (`§2.4` — kontrakt
> muzlatilgan; o'z qo'ling bilan kengaytirma, farq bo'lsa founderga ko'rsat). Manba: App-2 repo,
> `engine/contracts/design.ts` (30-226) + `types.ts:9`.

---

## 1. TIPLAR — 1:1 mirror qil (verbatim, o'z-yetarli)

```ts
// ─────────────────────────────────────────────── mm10 (types.ts:9)
/** tenths of a millimetre — barcha ichki koordinata. 16mm = 160. Float faqat eksport/render chekkasida. */
export type mm10 = number;

// ─────────────────────────────────────────────── design layer (design.ts)
/** Qaysi material slotidan — sexning o'z lug'ati. `stoleshnitsa` = W guruh (DB/39, столешница band). */
export type RoleSlot = "fasad" | "korpus" | "orqa" | "stoleshnitsa";

/** Nima ekani (DIZAYN, qurilish emas). `byType` shuni scope qiladi. */
export type CabinetType =
  | "kitchen_base" | "kitchen_wall" | "tall" | "drawer_base" | "wardrobe" | "shelf_unit";

export type NodeKind = "cabinet" | "shelf" | "divider" | "door" | "drawer" | "filler" | "rod";

/** Bo'lish qoidasi — DB/32 §4. `fixed`+`locked` mm'ini saqlaydi; qolganini `ratio`/`flex` og'irlik bilan. */
export type Division =
  | { rule: "fixed"; mm: mm10 }
  | { rule: "ratio"; weight: number }
  | { rule: "locked"; mm: mm10 }
  | { rule: "flex" };

/**
 * Dizayn-daraxtining bitta tuguni. `nodeId` — tizimдаги YAGONA berilgan identifikator.
 * YO'Q bo'lishi SHART: qalinlik, kromka, paz, tag joylashuvi, setback, overhang, стяжка, teshik.
 * Ular uchun maydon YO'Q (DB/27 anti-Frankenstein).
 */
export interface DesignNode {
  nodeId: string;
  kind: NodeKind;
  cabinetType?: CabinetType;
  roleSlot?: RoleSlot;
  size?: { w_mm10?: mm10; h_mm10?: mm10; d_mm10?: mm10 };
  division?: Division;
  purpose?: string;
  children?: DesignNode[];
  hasDoor?: boolean;      // Dizayn: ko'rinishini o'zgartiradi
  hasWorktop?: boolean;   // Dizayn: overhang esa QURILISH (profil)
  component?: ComponentRef; // BOR → BOUND instansiya; YO'Q → DETACHED oddiy subtree
}

// ─────────────────────────────────────────────── ComponentRef (A2 ishlatadi; A3 bilishi shart)
export interface ComponentRef {
  componentId: string;
  /** Bu instansiya qadalgan versiya. Faqat ATAYLAB accept o'zgartiradi (hech qachon avto). */
  pinnedVersion: number;
  /** FAQAT NIYAT — qalinlik/kromka/paz/стяжка maydoni YO'Q (DB/27). */
  overrides?: Partial<Pick<DesignNode, "size" | "division" | "purpose">>;
}

/** Komponent ichига komponent — max 3 qavat. `carry` decor qavat sanalmaydi; sikl (componentId,pinnedVersion) JUFT bilan. */
export const MAX_COMPONENT_NEST_DEPTH = 3;

// ─────────────────────────────────────────────── A3 ISHLAB CHIQARADI
/** «18mm da tekshirilgan» dalili — isbotlangan konvert + profil + qalinliklar. */
export interface FitConstraint {
  minW_mm10: mm10; maxW_mm10: mm10;
  minH_mm10: mm10; maxH_mm10: mm10;
  minD_mm10: mm10; maxD_mm10: mm10;
  validatedProfileId: string;          // boshqa profil → qayta-validatsiya
  validatedThicknesses_mm10: mm10[];   // [160] ≠ «18mm da ishlaydi»
}

/** Publish-gate RAD sababi — hech qachon yalang'och boolean, doim nima buzilganini aytadi. */
export interface ComponentGateFailure {
  code:
    | "UNKNOWN_SCHEMA_VERSION"
    | "UNBOUND_REQUIRED_SLOT"
    | "DECOMPOSE_FAILED"
    | "CARRIES_CONSTRUCTION"   // strip'dan keyin override qolib ketdi — DB/27 buzilishi
    | "NEST_DEPTH_EXCEEDED"
    | "CYCLE_DETECTED"
    | "DEGENERATE_GEOMETRY";
  detail: string;
}

/** «Convert to Component» ishlab chiqaradigan kutubxona yozuvi. BOUND node'ning ComponentRef'i shunga bog'lanadi. */
export interface ComponentLibraryItem {
  componentId: string;
  /** KONTENT versiyasi — ComponentRef.pinnedVersion shuni qadaydi. Monoton, har publish'да +1, hech qachon qayta ishlatilmaydi. */
  version: number;
  schemaVersion: 1;          // noma'lum → import'да RAD, taxmin yo'q
  name: string;
  author: string;
  tags?: string[];           // papka = teg ustidan ko'rinish (ikkinchi ierarxiya EMAS)
  requiredSlots: RoleSlot[];
  createdAt?: string;
  /** «cabinet» EMAS — noto'g'ri shakl = KOMPILYATSIYA XATOSI (App-3 shkaf qurmaydi, DB/32 §1). */
  root: DesignNode & { kind: Exclude<NodeKind, "cabinet"> };
  fit?: FitConstraint;       // YO'Q → app joylashtirishни RAD etadi
  /** Shu ANIQ versiyaga oxirgi gate — hech qachon optimistik, hech qachon eski versiyadan meros. */
  gate: { ok: boolean; failures: ComponentGateFailure[] };
}

// ─────────────────────────────────────────────── KONTEKST: A2'ning bloki (root=cabinet). A3 buni ISHLAB CHIQARMAYDI.
export interface DesignBlock {
  blockId: string;
  name: string;
  author: string;
  schemaVersion: 1;
  root: DesignNode;         // root=cabinet → A2
  requiredSlots: RoleSlot[];
  tags?: string[];
}
```

**Ikki tur farqi (§10.1):** `DesignBlock` (root=cabinet) = **A2** · `ComponentLibraryItem` (root≠cabinet) = **A3 (sen)**. `root.kind` cheklovi noto'g'ri shaklni imkonsiz qiladi.

---

## 2. ✅ `modifiers[]` — KONTRAKTДА BOR (der posylka `f8d62cc` qo'shди)

`DesignNode`да **`modifiers?: Modifier[]` maydoni BOR** — der posylka `f8d62cc` `DesignNode.modifiers?: Modifier[]` + `ModifierType` («laminate» bilan) qo'shди. `§3.1` Forge aynan shu maydonга modifier qo'shади. Ya'ni:
- **Forge asboblar (panel modifier, laminate va h.k.) TAYYOR** — kontrakt kutмайди; avvalги «founder PR kerak» **eskiрган**, der posylkada yetkazилди.
- **Modifiersiz ham boshlash mumkin:** `ComponentLibraryItem` avtorlik + `FitConstraint` + publish-gate (§10.3) — bular `modifiers[]`ga bog'liq EMAS.
- `Modifier` shakli (der, 1:1 mirror): `{type: ModifierType, anchors: Anchor[], params: Record<string, mm10|number|string>}` — o'zingдан kengaytirма (§2.4 muzlatilgan).

---

## 3. QONUNLAR — App-3'ga tegishli qismlar (verbatim, QONUNLAR.md sen'да yo'q)

- **§1.2 (DB/27):** 3 qatlam — `DesignBlock` (topologiya, qalinlik maydoni YO'Q) → `ConstructionProfile` (har loyihaда bitta) → `Parts` (`panelDecomposition` bilan hisoblanadi, **hech qachon saqlanmaydi**). App-3 komponentга qurilish yozmaydi.
- **§2.2/2.3 (chegara):** App-3 = FAQAT bitta komponent mikro-tahriri. **Shkaf YASAMAYDI.** Komponent joylashtirish so'ralsa — u A2'niki.
- **§2.5:** `design ↔ forge` importi build'ni yiqitadi (shunchaki strelка emas).
- **§3.1 (Forge qonuni):** faqat `DesignNode.modifiers[]`ga **modifier** (destruktiv emas), absolyut koordinata emas — **envelopega anchor bilan** (masalan `{edge:"top", distance:{rule:"ratio", value:0.5}}`).
- **§3.2 (asbob→mashina):** Cut Hole→DrillOp · Viyemka→SawGrooveOp(Type4) · Notch→ContourOp(Type3) · Round→yoy ContourOp · Bevel→BevelOp · **Laminate→BOM ishi** (2 panel yelim, 32mm bitta panel EMAS).
- **§3.3 (Frankenstein himoyasi):** material/kromka Forge'да faqat OVERRIDE (vaqtinча ko'rish); **«Convert to Component»da butunlay tozalanadi**, faqat sof geometriya qoladi. Override qolsa → gate `CARRIES_CONSTRUCTION`.
- **§3.4 (clamp):** usta R25 chizsa, profil min R30 bo'lsa → amber ogohlantirish; Export Gate tuzatilmaguncha CNC bermaydi. «Dizayn taklif qiladi; Konstruksiya buyuradi.»
- **§4 (rol berish):** erkin chizilган panelga **geometriyadan** rol (pastdan-yuqoriga, **AI emas — geometrik qoida**); klassifikatsiya faqat **SAQLASHда** (drag'да emas; <2ms, N≤150); «tasniflanmagan» faqat Forge ichида — kontraktga kirmaydi.
- **§10.1:** 2 tur (yuqorida). **§10.3 — Publish-gate SERVERда, 6 bosqich, hech qachon avto-tuzatmaydi:** `schema → slot → decomposition → invariant → profile-swap → ad-integrity`. Har rad = `ComponentGateFailure`.
- **§10.4:** kutubxona yangilanishi **pinned + qo'lда qabul** (avto-yangilash mijoz loyihasini buzardi). **Marketplace ataylab tashqarида** (iqtisod = TBD; kontraktга muzlatma).

---

## 4. Senga KERAK EMAS (App-2 design.ts'ning qolgani)

App-2 `design.ts`да yana bor, lekin **App-3'ga kerak emas** (mirror qilma): `ConstructionProfile`,
`PartRole`, `panelDecomposition`/`DecomposeResult`, kromka/joints/plinth/worktop qurilish tiplari,
`MaterialIntent`/`MaterialBinding`. Bular **iste'molchi (A2/engine)** tomoni — sen `ComponentLibraryItem`
ishlab chiqarasan, ular uni iste'mol qiladi.

---

## 5. Tartib (senga aniq)
1. Yuqoridagi **§1 tiplarni** repongда `contracts/`ga mirror qil (o'z-yetarli, tashqi import yo'q).
2. `ComponentLibraryItem` avtorlik + `FitConstraint` + publish-gate (§10.3, 7 kod) — **modifiersiz boshla**.
3. Forge modifier-asboblar (+ laminatsiya): `DesignNode.modifiers[]` kontraktда BOR (der `f8d62cc`) — «Bind (Laminate)» asbobi bajarилди (chip UX + writer + convert).
4. `FitConstraint`ni **haqiqiy dekompozitsiya** bilan isbotla (taxmin emas).
5. Har o'zgarishда typecheck+test yashil.
