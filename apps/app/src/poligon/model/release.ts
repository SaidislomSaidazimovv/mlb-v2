// T11 — Release (P6): model → yog'och (kesim ro'yxati). Sof funksiyalar (54§0).
// ASOS: 53§1 (model FINISHED saqlaydi, Parts CUT chiqaradi; cut = finished − banding×konvensiya;
//   konvensiya = sex sozlamasi) + 53§2 (Release = o'zgarmas, RAQAMLANGAN snapshot; qism raqami IDENTITY
//   bo'yicha barqaror, hech qachon qayta ishlatilmaydi/qayta raqamlanmaydi; diffReleases = o'sgan/paydo/
//   g'oyib; identity = role + bounding LINE IDs, POZITSIYA emas — 51 H1) + 53§5 (handedness/grain/0.1mm)
//   + 54§3 "T11 gate".
// O'ylab topilgan hech narsa yo'q.

import type { LineId } from "./contracts.ts";

export interface Banding { top: number; bottom: number; left: number; right: number; } // mm, har qirra
export interface InputPart {
  role: string;
  boundingLines: LineId[]; // identity uchun (POZITSIYA emas)
  finishedW: number;       // panel o'lchovi 1 (mm) — 53§1: uzunlik
  finishedH: number;       // panel o'lchovi 2 (mm) — 53§1: chuqurlik (depth)
  thickness?: number;      // B1/53§1: material qalinligi (kesim o'lchovi emas — alohida ko'rsatiladi)
  banding?: Banding;
  grain?: "L" | "W" | "none";
  handed?: "left" | "right";
}
// 51 D12: UCH PLANE — Nominal (dizayn niyati, ramziy 16) / Model (derived haqiqiy geometriya, sheet haqiqati —
//   Law D SHU planeni boshqaradi) / Cut (ishlab chiqarish: cut = model − banding×konvensiya, + kerf/tolerance).
//   Banding/kerf/tolerance FAQAT Cut plane'da (terminal, hech narsaga qaytmaydi). kerf nesting'da (P6, F2).
export interface ShopConvention { subtractBanding: boolean; kerf?: number; tolerance?: number; }

/** 53§1 D12: Nominal → Model — ramziy nominal (16) haqiqiy materialga (mas. 15.8). Model = haqiqiy. */
export function nominalToModel(nominal: number, actual: number): number { return actual; }

export interface ReleasedPart {
  id: string; num: number;
  finishedW: number; finishedH: number;
  cutW: number; cutH: number;
  thickness?: number; // B1/53§1: material qalinligi (passthrough)
  grain: "L" | "W" | "none"; handed?: "left" | "right";
}
export interface Release { number: number; parts: ReleasedPart[]; }

/** 53§2 / 51 H1: identity = role + bounding line IDs (pozitsiya emas). */
export function partIdentity(p: InputPart): string {
  return `${p.role}#${[...p.boundingLines].sort().join(",")}`;
}

const round1 = (n: number): number => Math.round(n * 10) / 10; // 53§5: 0.1mm

/** 53§1: cut = finished − banding (sex "band-then-trim" bo'lsa); aks holda cut = finished. */
function cut(finished: number, bandA: number, bandB: number, conv: ShopConvention): number {
  return round1(conv.subtractBanding ? finished - bandA - bandB : finished);
}

/** 53§2: Release — raqamlangan, o'zgarmas. Qism raqami prev'dan barqaror; yangi qism = keyingi bo'sh
 *  raqam; HECH QACHON qayta raqamlanmaydi. */
export function release(parts: InputPart[], conv: ShopConvention, prev?: Release): Release {
  const prevNums = new Map<string, number>();
  let maxNum = 0;
  if (prev) for (const rp of prev.parts) { prevNums.set(rp.id, rp.num); if (rp.num > maxNum) maxNum = rp.num; }
  const out: ReleasedPart[] = [];
  for (const p of parts) {
    const id = partIdentity(p);
    const b: Banding = p.banding ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const num = prevNums.get(id) ?? ++maxNum; // barqaror yoki keyingi bo'sh
    out.push({
      id, num,
      finishedW: p.finishedW, finishedH: p.finishedH,
      cutW: cut(p.finishedW, b.left, b.right, conv),
      cutH: cut(p.finishedH, b.top, b.bottom, conv),
      thickness: p.thickness,
      grain: p.grain ?? "none",
      handed: p.handed,
    });
  }
  return { number: (prev?.number ?? 0) + 1, parts: out };
}

export interface PartDiff { id: string; num: number; kind: "changed" | "appeared" | "vanished"; }
/** 53§2: diffReleases — o'sgan/o'zgargan (changed), paydo (appeared), g'oyib (vanished). Raqam siljimaydi. */
export function diffReleases(a: Release, b: Release): PartDiff[] {
  const am = new Map(a.parts.map((p) => [p.id, p]));
  const bm = new Map(b.parts.map((p) => [p.id, p]));
  const out: PartDiff[] = [];
  for (const [id, bp] of bm) {
    const ap = am.get(id);
    if (!ap) out.push({ id, num: bp.num, kind: "appeared" });
    else if (ap.cutW !== bp.cutW || ap.cutH !== bp.cutH) out.push({ id, num: bp.num, kind: "changed" });
  }
  for (const [id, ap] of am) if (!bm.has(id)) out.push({ id, num: ap.num, kind: "vanished" });
  return out;
}
