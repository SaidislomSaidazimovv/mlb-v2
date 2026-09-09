// Poligon UI seed — sahifa ochilishi bilan real devor ko'rinsin. Barchasi §2 API (poligon/index.ts)
// orqali quriladi; UI model/ ichiga tegmaydi.
import { createSheet, addLine, setThickness } from "../index.ts";
import type { Sheet, Profile, Role, Rule } from "../index.ts";
import type { Thing } from "../index.ts";

/** Penal (chap, to'liq balandlik) + baza (o'ng, ish-stoligacha) — umumiy o'rta yon (T3 darvozasi). */
export function seedWall(): { sheet: Sheet; profile: Profile } {
  const s = createSheet();
  const v0 = addLine(s, "V", 0).id;
  const v1 = addLine(s, "V", 600).id;    // umumiy o'rta yon — 0..2400
  const v2 = addLine(s, "V", 1200).id;
  const h0 = addLine(s, "H", 0).id;      // pol
  const h1 = addLine(s, "H", 720).id;    // ish-stoli (baza)
  const h2 = addLine(s, "H", 2400).id;   // shift
  setThickness(s, v0, h0, h1, 16); setThickness(s, v0, h1, h2, 16);
  setThickness(s, v1, h0, h1, 16); setThickness(s, v1, h1, h2, 16);
  setThickness(s, v2, h0, h1, 16);
  setThickness(s, h0, v0, v1, 16); setThickness(s, h0, v1, v2, 16);
  setThickness(s, h1, v1, v2, 16);
  setThickness(s, h2, v0, v1, 16);

  const roles: Record<string, Role> = {
    [v0]: "side", [v1]: "side", [v2]: "side",
    [h0]: "bottom", [h1]: "worktop", [h2]: "top",
  };
  // B1/48§4: depth cascade qoidalari — system default 560 (hamma part), shelf uchun project-override 520.
  // (48§4 "depth = profildan default, cascadable project→zone→module→part"; geometrik param = P1, Tier-0 role.)
  const rules: Rule[] = [
    // P1 (geometrik, Tier-0): depth
    { layer: "system", property: "depth", value: 560, facets: [], match: () => true, pass: "P1" },
    { layer: "project", property: "depth", value: 520, facets: ["role"], match: (p) => p.role === "shelf", pass: "P1" },
    // P4 (appearance, Tier-0+Tier-3): colour — 50§2 cascade (yuqori qatlam yutadi): theme=oq (hamma),
    // project=dub (faqat worktop) → worktop dub, qolgani oq. Turli qatlam → Conflict yo'q (50§3 two-tone).
    { layer: "theme", property: "colour", value: "oq", facets: [], match: () => true },
    { layer: "project", property: "colour", value: "dub", facets: ["role"], match: (p) => p.role === "worktop" },
  ];
  return { sheet: s, profile: { roles, transport: { maxWidth: 1200 }, rules } };
}

/** T14: sozlamalar ekranлари DEF'LARDAN yaratiladi — bu yerda namuna Thing'lar. Yangi Thing qo'shsang,
 *  hech qanday UI kod yozmасdan yangi ekran paydo bo'ladi (54§3 T14 gate). */
export const SAMPLE_THINGS: Thing[] = [
  {
    def: {
      id: "egger.material.ldsp16-white", uid: "u-ldsp16", version: "1.0.0", schema: 2, kind: "materials",
      name: { ru: "ЛДСП 16 — Белый", uz: "LDSP 16 — Oq" },
      fields: [
        { name: "thickness", value: 16, unit: "mm", numeric: true },
        { name: "density", value: 650, unit: "kg/m³", numeric: true },
        { name: "grain", value: "none" },
      ],
    },
    hasDiagram: true, hasExamples: true,
  },
  {
    def: {
      id: "blum.hinge.clip-top-110", uid: "u-hinge110", version: "1.0.0", schema: 2, kind: "hinges",
      name: { ru: "Петля Clip-top 110°", uz: "Ilgak Clip-top 110°" },
      fields: [
        { name: "overlay.full", value: 597, unit: "mm", numeric: true },
        { name: "overlay.inset", value: 565, unit: "mm", numeric: true },
        { name: "boss.diameter", value: 35, unit: "mm", numeric: true },
      ],
    },
    hasDiagram: true, hasExamples: true,
  },
  {
    def: {
      id: "shop.convention.band-then-trim", uid: "u-conv", version: "1.0.0", schema: 2, kind: "conventions",
      name: { ru: "Кромка → рез", uz: "Kromka → kesim" },
      fields: [
        { name: "subtractBanding", value: true },
        { name: "kerf", value: 3.2, unit: "mm", numeric: true },
      ],
    },
    hasDiagram: true, hasExamples: true,
  },
];
