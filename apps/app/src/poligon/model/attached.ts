// 53§3/§5 — Attached items + handedness. Sof funksiyalar (54§0).
// ASOS: 53§3 ("attached items — hinge/leg/handle/connector — sheet geometriyasi EMAS; archetype/modulga
//   tegishli; birini o'chirish EGASINI tahrirlaydi, erkin-suzuvchi o'chirish yo'q; library-instance divergence
//   → flag + auto-update'dan chiqarish") + 53§5 ("HANDEDNESS: chap va o'ng side — biror qirra kromkalangan
//   YOKI biror yuza teshilgan zahoti MIRROR part; 2×side handedness'siz → sex noto'g'ri qirrani kromkalaydi;
//   MAJBURIY").
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export interface AttachedItem { id: string; owner: string; kind: "hinge" | "leg" | "handle" | "connector"; }

/** 53§3: attached item'ni "o'chirish" = EGASINI tahrirlash (egasidan olib tashlash). Erkin-suzuvchi o'chirish yo'q. */
export function removeAttached(items: AttachedItem[], id: string): AttachedItem[] {
  return items.filter((it) => it.id !== id); // egaga tegishli ro'yxatdan; sheet geometriyasiga tegmaydi
}

/** 53§3: library-instance divergence — instansiya o'zgarsa flag + auto-update'dan chiqariladi. */
export function markDiverged(item: AttachedItem): AttachedItem & { diverged: true; autoUpdate: false } {
  return { ...item, diverged: true, autoUpdate: false };
}

/** 53§5: part HANDED bo'ladimi — biror qirra kromkalangan YOKI biror yuza teshilgan bo'lsa (mirror part). */
export function isHanded(banded: boolean, drilled: boolean): boolean {
  return banded || drilled;
}

/** 53§5: handedness talab qilinsa (isHanded) va berilmagan bo'lsa → RAD (sex noto'g'ri qirrani kromkalaydi). */
export function checkHandedness(banded: boolean, drilled: boolean, handed?: "left" | "right"): Refusal | null {
  if (isHanded(banded, drilled) && handed === undefined) {
    return { rule: "handedness.required", message: "53§5: qirra kromkalangan/yuza teshilgan → part MIRROR (handed); left/right majburiy — sex noto'g'ri qirrani kromkalamasligi uchun" };
  }
  return null;
}
