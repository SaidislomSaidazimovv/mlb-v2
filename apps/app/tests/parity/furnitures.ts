// 10 MURAKKAB mebel - real turlar (web: standart oshxona/shkaf o'lchamlari, mm ga aylantirilgan) + app
// mk() vokabulari (fill drawers/shelves/open, divider, count, door). O'zimdan o'lcham to'qimadim: base 720mm
// karkas / 560 chuqur, tall 2100-2400 / 560-600, upper 720-900 / 320 - kitchencabinetkings/fabuwood standartlari.
// Founder aniq 10 tasini bersa - shu ro'yxat almashtiriladi.
import type { Furniture } from "./compare";

export const FURNITURES: Furniture[] = [
  { id: "chest3", label: "3-tortmali komod", kind: "base", width: 600, height: 720, depth: 560, fill: "drawers", count: 3, door: 0, note: "drawer base - 3 tortma, 600mm keng (standart 12-36in)" },
  { id: "sink", label: "Rakovina tagi (ochiq)", kind: "base", width: 800, height: 720, depth: 560, fill: "open", count: 0, door: 2, note: "sink base - ichi ochiq, quvur uchun, 800mm (standart 30-42in)" },
  { id: "sideboard", label: "Servant (pardevorli)", kind: "base", width: 900, height: 720, depth: 560, fill: "shelves", count: 2, door: 2, dividers: 1, note: "sideboard - 1 pardevor, 2 bo'lim, har birida polka" },
  { id: "drawer4", label: "4-tortmali keng baza", kind: "base", width: 800, height: 720, depth: 560, fill: "drawers", count: 4, door: 0, note: "drawer base 4 tortma, 800mm keng" },
  { id: "pantry6", label: "Penal-omborxona (6 polka)", kind: "tall", width: 600, height: 2100, depth: 560, fill: "shelves", count: 6, door: 1, note: "tall pantry - 84in~2100mm, 6 polka" },
  { id: "wardrobe", label: "Shifoner (2 eshik, 5 polka)", kind: "tall", width: 1000, height: 2100, depth: 600, fill: "shelves", count: 5, door: 2, note: "wardrobe - 1000mm keng, 2 eshik, 5 polka" },
  { id: "bookcase", label: "Kitob javoni (ochiq, 6 polka)", kind: "tall", width: 800, height: 2200, depth: 320, fill: "shelves", count: 6, door: 0, note: "bookcase - ochiq, 2200mm baland, 6 polka" },
  { id: "upper2", label: "Osma shkaf (2 eshik)", kind: "upper", width: 800, height: 900, depth: 320, fill: "shelves", count: 2, door: 2, note: "wall upper - 800×900, 320 chuqur, 2 polka" },
  { id: "base2div", label: "Keng baza (pardevor+2 eshik)", kind: "base", width: 1000, height: 720, depth: 560, fill: "shelves", count: 2, door: 2, dividers: 1, note: "wide base - markaziy pardevor, 2 bo'lim polkali" },
  { id: "larder", label: "Baland larder (keng, 4 polka)", kind: "tall", width: 800, height: 2400, depth: 600, fill: "shelves", count: 4, door: 2, note: "larder - 2400mm (96in), keng, 4 polka" },
];
