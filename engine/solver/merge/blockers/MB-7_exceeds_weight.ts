// MB-7 — Объединённый корпус тяжелее нормы
//
// Собранный корпус несут руками. Тяжелее нормы — его не поднять вдвоём, не занести в лифт и не поднять по лестнице.

import type { MergeBlocker } from "../types.js";

export const MB_7: MergeBlocker = {
  id: "MB-7",
  title: "Объединённый корпус тяжелее нормы",
  why: "Собранный корпус несут руками. Тяжелее нормы — его не поднять вдвоём, не занести в лифт и не поднять по лестнице.",
  source: "R9/R21 — 45кг, норма ручной переноски СНГ · merge.limits.maxWeightKg",
  blocks(c) {
    const lim = c.profile.defaults.merge.limits;
    const t = c.profile.material.carcass_mm10 / 10000;
    const LDSP = 680; // кг/м³ (R9). До подключения реальной плотности из каталога Eman.
    const kg = [...c.groupSoFar, c.right].reduce((s, n) => {
      const w = (n.size?.w_mm10 ?? 0) / 10000, h = (n.size?.h_mm10 ?? 0) / 10000, d = (n.size?.d_mm10 ?? 0) / 10000;
      return s + (2 * h * d + 2 * w * d) * t * LDSP;   // бока + дно/крышка, грубая оценка
    }, 0);
    if (kg > lim.maxWeightKg) return `объединённый корпус ~${kg.toFixed(0)}кг больше ${lim.maxWeightKg}кг`;
    return null;
  },
};
