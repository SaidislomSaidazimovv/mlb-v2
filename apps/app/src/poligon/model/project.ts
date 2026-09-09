// Persist — project fayli (SOF qism). ASOS: 52§5 ("project fayli = sheet + parameters + pins + lock";
//   lock mos kelmasa cut list CHIQMAYDI) + 50 Law C (pins = part-identity istisnolari, per-property) +
//   T1 (sheet round-trip) + T9 (lock). Bu fayl SOF — node:fs YO'Q (brauzer bundle'iga xavfsiz kiradi).
//   Haqiqiy fs yozish/o'qish alohida `project-fs.ts` da (faqat Node kontekstida ishlatiladi, index brauzerga
//   fs eksport qilmaydi). Qoidalar DEKLARATIV saqlanadi (52§7 — funksiya emas).
// O'ylab topilgan hech narsa yo'q.

import type { Sheet, Refusal } from "./contracts.ts";
import type { Lock } from "./lock.ts";
import type { Thing } from "./things.ts";
import { checkLock } from "./lock.ts";

/** 50 Law C: pin — part identity (role+lineIDs) + property bo'yicha istisno (qiymat). */
export interface Pin { partId: string; property: string; value: unknown; }

/** 52§7: qoida DEKLARATIV — predikat facet-triple sifatida (funksiya emas → serializable). */
export interface StoredRule {
  layer: string;
  property: string;
  value: unknown;
  where?: [string, string, unknown][]; // [facet, op, value] — 50§5/51
}

/** 52§5: project fayli. */
export interface Project {
  id: string;
  sheet: Sheet;
  params: StoredRule[];
  pins: Pin[];
  lock: Lock;
}

/** L12 / 52§5: project sof ma'lumot — serialize→parse aynan bir xil (round-trip). */
export function serializeProject(p: Project): string { return JSON.stringify(p); }
export function parseProject(s: string): Project { return JSON.parse(s) as Project; }

/** 52§5 / T9: project ochilganda integritet — lock joriy Thing-indeksga mos kelmasa RAD
 *  (cut list chiqmaydi, foydalanuvchi hal qilmaguncha). Bo'sh = toza. */
export function checkProjectIntegrity(p: Project, index: Map<string, Thing>): Refusal[] {
  return checkLock(p.lock, index);
}
