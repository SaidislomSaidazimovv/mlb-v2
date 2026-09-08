// D7 — Kvantlangan parametrlar. Sof funksiyalar (54§0).
// ASOS: 51 D7 (+ B3): kvantlangan param RUXSAT ETILGAN to'plamini E'LON qiladi; tizim QONUNIY a'zolarni
//   KO'RSATADI, hech qachon O'ZI TANLAMAYDI (snap = tanlash, Law E taqiqlaydi); geometriya hech bir
//   a'zoni qabul qilmasa — RAD (jimgina snap yo'q).
// O'ylab topilgan hech narsa yo'q.

import type { Refusal } from "./contracts.ts";

export interface QuantizedParam {
  name: string;
  allowed: number[]; // e'lon qilingan to'plam (mas. slayd uzunliklari 250/300/.../600)
}

/** 51 D7/B3: chegaraga (max) sig'adigan QONUNIY a'zolar ro'yxati. Tizim TANLAMAYDI — foydalanuvchiga ko'rsatiladi. */
export function legalMembers(p: QuantizedParam, max: number): number[] {
  return p.allowed.filter((m) => m <= max).sort((a, b) => a - b);
}

/** 51 D7: geometriya hech bir a'zoni qabul qilmasa — `D7.noMember` RAD. */
export function checkQuantized(p: QuantizedParam, max: number): Refusal | null {
  if (legalMembers(p, max).length === 0) {
    return { rule: "D7.noMember", message: `${p.name}: '${max}' ga sig'adigan a'zo yo'q ({${p.allowed.join(",")}}) — tizim tanlamaydi, rad` };
  }
  return null;
}
