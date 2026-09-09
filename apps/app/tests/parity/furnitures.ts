// 10 mebel — app YASAYDIGAN standart kabinetlar (base/tall/upper, standart o'lchamlar). O'zimdan geometriya
// to'qimadim: bular app'ning mk() kind/o'lchamlaridan (grid.ts COL_DEFAULT 600, BASE, tall 2100 va h.k.).
// Founder aniq 10 tasini bersa — shu ro'yxat almashtiriladi.
import type { Furniture } from "./compare";

export const FURNITURES: Furniture[] = [
  { id: "b600", label: "Baza 600 (polkasiz)", kind: "base", width: 600, height: 720, depth: 560, shelves: 0 },
  { id: "b600s1", label: "Baza 600 (1 polka)", kind: "base", width: 600, height: 720, depth: 560, shelves: 1 },
  { id: "b800s2", label: "Baza 800 (2 polka)", kind: "base", width: 800, height: 720, depth: 560, shelves: 2 },
  { id: "b400", label: "Baza 400 (tor)", kind: "base", width: 400, height: 720, depth: 560, shelves: 1 },
  { id: "b1000", label: "Baza 1000 (keng)", kind: "base", width: 1000, height: 720, depth: 560, shelves: 2 },
  { id: "u600", label: "Osma 600", kind: "upper", width: 600, height: 720, depth: 320, shelves: 1 },
  { id: "u800", label: "Osma 800", kind: "upper", width: 800, height: 900, depth: 320, shelves: 2 },
  { id: "t2100s5", label: "Penal 2100 (5 polka)", kind: "tall", width: 600, height: 2100, depth: 560, shelves: 5 },
  { id: "t2100s6", label: "Penal 2100 (6 polka)", kind: "tall", width: 500, height: 2100, depth: 560, shelves: 6 },
  { id: "t2200", label: "Penal 2200 (keng)", kind: "tall", width: 800, height: 2200, depth: 600, shelves: 4 },
];
