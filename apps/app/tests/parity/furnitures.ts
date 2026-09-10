// 10 mebel — app YASAYDIGAN standart kabinetlar. O'zimdan geometriya to'qimadim: mk() kind/o'lchamlaridan.
// Founder aniq 10 tasini bersa — shu ro'yxat almashtiriladi.
import type { Furniture } from "./compare";

export const FURNITURES: Furniture[] = [
  { id: "b600", label: "Baza 600 (eshikli)", kind: "base", width: 600, height: 720, depth: 560, shelves: 1, door: 1 },
  { id: "b800", label: "Baza 800 (2 polka)", kind: "base", width: 800, height: 720, depth: 560, shelves: 2, door: 1 },
  { id: "b400", label: "Baza 400 (tor)", kind: "base", width: 400, height: 720, depth: 560, shelves: 1, door: 1 },
  { id: "b1000", label: "Baza 1000 (keng)", kind: "base", width: 1000, height: 720, depth: 560, shelves: 2, door: 1 },
  { id: "b600o", label: "Baza 600 (ochiq, eshiksiz)", kind: "base", width: 600, height: 720, depth: 560, shelves: 2, door: 0 },
  { id: "u600", label: "Osma 600", kind: "upper", width: 600, height: 720, depth: 320, shelves: 1, door: 1 },
  { id: "u800", label: "Osma 800", kind: "upper", width: 800, height: 900, depth: 320, shelves: 2, door: 1 },
  { id: "t2100s5", label: "Penal 2100 (5 polka)", kind: "tall", width: 600, height: 2100, depth: 560, shelves: 5, door: 1 },
  { id: "t2100s6", label: "Penal 2100 (6 polka)", kind: "tall", width: 500, height: 2100, depth: 560, shelves: 6, door: 1 },
  { id: "t2200", label: "Penal 2200 (keng)", kind: "tall", width: 800, height: 2200, depth: 600, shelves: 4, door: 1 },
];
