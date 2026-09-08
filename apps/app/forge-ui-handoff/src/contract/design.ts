// ═══════════════════════════════════════════════════════════════════════════
//  APP-3 DESIGN CONTRACT — mirrored 1:1 from App-2. Do not extend this file.
// ═══════════════════════════════════════════════════════════════════════════
//
// Source of truth: App-2 repo `engine/contracts/design.ts` (30-226) + `types.ts:9`,
// delivered verbatim in `APP3_CONTRACT.md §1`. This is the shared contract between
// App-2 (Блок/Конструктор) and App-3 (Каркас/Forge). It is FROZEN (§2.4): never
// extend it here — if something is missing, show the founder and request an App-2 PR.
//
// Self-contained by design: no external imports; `mm10` is redeclared locally so the
// mirror stays a standalone contract package.

// ─────────────────────────────────────────────── mm10 (types.ts:9)
/** tenths of a millimetre — barcha ichki koordinata. 16mm = 160. Float faqat eksport/render chekkasida. */
export type mm10 = number;

// ─────────────────────────────────────────────── design layer (design.ts)
/** Qaysi material slotidan — sexning o'z lug'ati. `stoleshnitsa` = W guruh (DB/39, столешница band). */
export type RoleSlot = "fasad" | "korpus" | "orqa" | "stoleshnitsa";

/** Nima ekani (DIZAYN, qurilish emas). `byType` shuni scope qiladi. */
export type CabinetType =
  | "kitchen_base" | "kitchen_wall" | "tall" | "drawer_base" | "wardrobe" | "shelf_unit";

export type NodeKind = "cabinet" | "shelf" | "divider" | "door" | "drawer" | "filler" | "rod" | "group" | "run" | "band";

// ─────────────────────────────────────────────── Forge modifier (§3.1, DB/35) — non-destruktiv, envelopega anchor bilan
export type AnchorEdge = "top" | "bottom" | "left" | "right" | "front" | "back";

export type AnchorRule =
| { rule: "fixed"; mm10: mm10 }        // ⚠️ `value` EMAS — `mm10` (birlik yo'qolmasin)
| { rule: "ratio"; value: number }
| { rule: "locked"; mm10: mm10 };      // ⚠️ OCHIQ — founder qarori yo'q; UIда `locked` holatini CHIQARMANG

export interface Anchor {edge: AnchorEdge;distance: AnchorRule;}

export type ModifierType = "hole" | "notch" | "bevel" | "viyemka" | "round_corner" | "laminate";

export interface Modifier {
  type: ModifierType;
  anchors: Anchor[];                                 // ⚠️ `anchor` emas — massiv
  params: Record<string, mm10 | number | string>;   // ⚠️ `unknown` EMAS (qurilish sizmasin — DB/27)
}

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
  modifiers?: Modifier[];   // §3.1 Forge modifikatorlari — non-destruktiv, envelopega anchor bilan
  pos?: { x_mm10: mm10; y_mm10: mm10; z_mm10: mm10 };   // panel markazi, envelope (x=w·y=h·z=d)
  thicknessAxis?: "x" | "y" | "z";                       // qaysi o'q thickness (x=w·y=h·z=d)
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
