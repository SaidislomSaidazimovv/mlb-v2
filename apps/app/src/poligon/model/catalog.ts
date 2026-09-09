// 52 — Catalog: fork / retire / collections. Sof funksiyalar (54§0).
// ASOS: 52§4 ("local edit FORK'laydi — origin.forked_from; publisher yangilanishi fork'ni ustiga yozmaydi,
//   uch tomonlama diff taklif qiladi; hech narsa O'CHIRILMAYDI — RETIRE qilinadi: picker'dan yo'qoladi, eski
//   loyihalarга hali resolve bo'ladi") + 52§10 ("Collections — Thing'larni tarqatish uchun bog'lash; Catalog
//   yoki Theme = imzolangan collection + manifest; bitta download, ko'p Thing, bitta lock entry"). fs walk emas.
// O'ylab topilgan hech narsa yo'q.

import type { Thing } from "./things.ts";

/** 52§4: local tahrir FORK'laydi — asl o'zgarmaydi, yangi Thing origin.forked_from bilan. */
export function forkThing(t: Thing, newUid: string): Thing {
  return {
    ...t,
    def: {
      ...t.def,
      uid: newUid,
      origin: { ...(t.def.origin ?? {}), forked_from: `${t.def.id}@${t.def.version}` },
    },
  };
}

/** 52§4: RETIRE — o'chirilmaydi, retired bayrog'i (picker'dan yo'qoladi, eski loyiha resolve qiladi). */
export function retireThing(t: Thing): Thing {
  return { ...t, def: { ...t.def, retired: true } };
}

/** 52§10: picker faqat retired BO'LMAGANlarни ko'rsatadi; resolve esa retired'ni ham topadi (eski loyiha). */
export function pickerList(things: Thing[]): Thing[] {
  return things.filter((t) => !t.def.retired);
}

/** 52§10: Collection — imzolangan bog'lam + manifest (bitta lock entry uchun). */
export interface Collection { id: string; kind: "catalog" | "theme"; signed: boolean; manifest: string[]; }
export function makeCollection(id: string, kind: "catalog" | "theme", things: Thing[], signed = false): Collection {
  return { id, kind, signed, manifest: things.map((t) => t.def.uid) };
}
