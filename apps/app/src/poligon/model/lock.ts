// T9 — Lockfile. Sof funksiyalar (54§0).
// ASOS: 52§5 — loyiha tegган har Thing'ning (uid, version, content-hash) QULFini saqlaydi; qulf mos
//   kelmasa cut list CHIQMAYDI (boshqa mashinada/kelasi yil bir xil natija = reproducible; o'zgargan/
//   yo'qolgan Thing → rad, jimgina boshqa list emas). + 52§9 (teskari indeks — blast radius loyihalararo)
//   + 54§3 "T9 gate".
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";
import type { Thing } from "./things.ts";

export interface LockEntry { uid: string; version: string; hash: string; }
export type Lock = LockEntry[];

/** Thing def'idan deterministik content-hash (bir mazmun → bir hash). FNV-1a (kriptografik emas —
 *  faqat O'ZGARISHNI aniqlash uchun, 52§5 "content-hash"). */
export function contentHash(thing: Thing): string {
  const s = JSON.stringify(thing.def);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** 52§5: loyiha resolve qilган Thinglarning qulfини hisoblaydi. */
export function lockOf(touchedUids: string[], index: Map<string, Thing>): Lock {
  const out: Lock = [];
  for (const uid of touchedUids) {
    const t = index.get(uid);
    if (t) out.push({ uid, version: t.def.version, hash: contentHash(t) });
  }
  return out;
}

/** 54 T9-gate: saqlangan qulfни joriy indeksга solishtiradi. Bo'sh = MOS (cut list chiqadi);
 *  aks holda rad sabablari (yo'qolgan/version/mazmun o'zgargan) — cut list CHIQMAYDI. */
export function checkLock(lock: Lock, index: Map<string, Thing>): Refusal[] {
  const out: Refusal[] = [];
  for (const e of lock) {
    const t = index.get(e.uid);
    if (!t) {
      out.push({ rule: "lock.missing", message: `Thing yo'qolgan: ${e.uid}@${e.version} — cut list chiqmaydi` });
      continue;
    }
    if (t.def.version !== e.version) {
      out.push({ rule: "lock.version", message: `${e.uid}: version ${e.version} → ${t.def.version} o'zgargan` });
    }
    if (contentHash(t) !== e.hash) {
      out.push({ rule: "lock.hash", message: `${e.uid}: mazmun o'zgargan (hash mos emas) — cut list chiqmaydi` });
    }
  }
  return out;
}

/** 52§9: teskari indeks — qaysi loyihalar qaysi Thing'dan foydalanadi (Thing tahririning blast radiusi). */
export function reverseIndex(projects: { id: string; lock: Lock }[]): Map<string, string[]> {
  const rev = new Map<string, string[]>();
  for (const p of projects) {
    for (const e of p.lock) {
      if (!rev.has(e.uid)) rev.set(e.uid, []);
      rev.get(e.uid)!.push(p.id);
    }
  }
  return rev;
}
