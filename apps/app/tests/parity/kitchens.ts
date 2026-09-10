// 10 BUTUN OSHXONA — founder: har biri ICHIDAGI mebellari bilan (54§1 "wall"). Har oshxona = devor bo'ylab
// joylashgan mebellar to'plami (napольный/навесной/пенал). ASOS: app arxetiplari (cabinet.ts archetype v0-3:
// open/drawers/tall aralash) + real oshxona kompozitsiyasi + standart o'lchamlar (layout.ts GEOM: base h720/
// chuqur560, upper h720/chuqur350, tall h2100-2400, upperBottom 1520). O'zimdan o'lcham to'qimadim.
import type { Furniture, Kitchen } from "./compare";

let _n = 0;
type Kind = "base" | "tall" | "upper";
const DEF: Record<Kind, { h: number; depth: number }> = {
  base: { h: 720, depth: 560 }, tall: { h: 2100, depth: 560 }, upper: { h: 720, depth: 350 },
};
function cab(kind: Kind, w: number, o: Partial<Furniture> & { label: string } = { label: "" }): Furniture {
  return {
    id: `c${++_n}`, label: o.label, kind, width: w,
    height: o.height ?? DEF[kind].h, depth: o.depth ?? DEF[kind].depth,
    fill: o.fill ?? "shelves", count: o.count ?? 1, door: o.door ?? 1, dividers: o.dividers,
    note: o.note ?? "",
  };
}
const base = (w: number, label: string, o: Partial<Furniture> = {}) => cab("base", w, { label, ...o });
const upper = (w: number, label: string, o: Partial<Furniture> = {}) => cab("upper", w, { label, ...o });
const tall = (w: number, label: string, o: Partial<Furniture> = {}) => cab("tall", w, { label, ...o });

export const KITCHENS: Kitchen[] = [
  { id: "k1", label: "1-oshxona — kichik to'g'ri", note: "3 napольный + 2 навесной, kompakt devor",
    cabs: [ base(800, "Rakovina 800", { fill: "open", count: 0, door: 2 }), base(600, "Tortma 600", { fill: "drawers", count: 3, door: 0 }), base(400, "Shkaf 400", { count: 1, door: 1 }),
            upper(800, "Osma 800", { count: 2, door: 2 }), upper(600, "Osma 600", { count: 1, door: 1 }) ] },
  { id: "k2", label: "2-oshxona — tortmali", note: "tortmaga boy napольный run + navesnoylar",
    cabs: [ base(600, "Tortma 600", { fill: "drawers", count: 3, door: 0 }), base(800, "Tortma 800", { fill: "drawers", count: 4, door: 0 }), base(500, "Shkaf 500", { count: 1, door: 1 }),
            upper(600, "Osma 600", { count: 1, door: 1 }), upper(800, "Osma 800", { count: 2, door: 2 }) ] },
  { id: "k3", label: "3-oshxona — penalli (arxetip 0)", note: "ochiq + tortma + penal-omborxona",
    cabs: [ base(600, "Ochiq 600", { fill: "open", count: 2, door: 0 }), base(600, "Shkaf 600", { count: 1 }), base(600, "Tortma 600", { fill: "drawers", count: 3, door: 0 }),
            tall(600, "Penal 2100", { height: 2100, fill: "shelves", count: 5, door: 1 }), upper(600, "Osma 600", { count: 1, door: 1 }) ] },
  { id: "k4", label: "4-oshxona — katta (arxetip 1)", note: "ikki penal + napольный + navesnoylar",
    cabs: [ base(600, "Ochiq 600", { fill: "open", count: 2, door: 0 }), base(600, "Tortma 600", { fill: "drawers", count: 3, door: 0 }),
            tall(600, "Penal-1 2100", { height: 2100, fill: "shelves", count: 5, door: 1 }), tall(600, "Penal-2 2100", { height: 2100, fill: "shelves", count: 6, door: 1 }),
            upper(600, "Osma-1 600", { count: 1, door: 1 }), upper(600, "Osma-2 600", { count: 1, door: 1 }) ] },
  { id: "k5", label: "5-oshxona — faqat tortmalar (arxetip 2)", note: "3 tortma bloki + penal-tortma",
    cabs: [ base(600, "Tortma-3 600", { fill: "drawers", count: 3, door: 0 }), base(800, "Tortma-4 800", { fill: "drawers", count: 4, door: 0 }), base(400, "Tortma-2 400", { fill: "drawers", count: 2, door: 0 }),
            tall(600, "Penal-tortma", { height: 2100, fill: "drawers", count: 4, door: 1 }), upper(800, "Osma 800", { count: 2, door: 2 }) ] },
  { id: "k6", label: "6-oshxona — galley (uzun)", note: "rakovina + tortma + 2 shkaf + 3 navesnoy",
    cabs: [ base(800, "Rakovina 800", { fill: "open", count: 0, door: 2 }), base(600, "Tortma 600", { fill: "drawers", count: 3, door: 0 }), base(600, "Shkaf 600", { count: 1, door: 1 }), base(600, "Shkaf 600", { count: 1, door: 1 }),
            upper(600, "Osma-1", { count: 1, door: 1 }), upper(600, "Osma-2", { count: 1, door: 1 }), upper(600, "Osma-3", { count: 1, door: 1 }) ] },
  { id: "k7", label: "7-oshxona — pardevorli keng", note: "pardevorli keng napольныйlar + navesnoy",
    cabs: [ base(1000, "Keng pardevor 1000", { count: 2, door: 2, dividers: 1 }), base(900, "Servant 900", { count: 2, door: 2, dividers: 1 }),
            upper(800, "Osma 800", { count: 2, door: 2 }) ] },
  { id: "k8", label: "8-oshxona — ochiq javonli", note: "shkaf + ochiq kitob-javon penal + navesnoy",
    cabs: [ base(600, "Shkaf 600", { count: 1, door: 1 }), base(800, "Rakovina 800", { fill: "open", count: 0, door: 2 }),
            tall(800, "Ochiq javon 2200", { height: 2200, depth: 320, fill: "shelves", count: 6, door: 0 }), upper(600, "Osma 600", { count: 1, door: 1 }) ] },
  { id: "k9", label: "9-oshxona — to'la devor navesnoy", note: "4 napольный + 4 navesnoy (to'liq devor)",
    cabs: [ base(600, "Shkaf-1", { count: 1, door: 1 }), base(600, "Tortma", { fill: "drawers", count: 3, door: 0 }), base(800, "Rakovina 800", { fill: "open", count: 0, door: 2 }), base(600, "Shkaf-2", { count: 1, door: 1 }),
            upper(600, "Osma-1", { count: 1, door: 1 }), upper(600, "Osma-2", { count: 2, door: 1 }), upper(800, "Osma-3", { count: 2, door: 2 }), upper(600, "Osma-4", { count: 1, door: 1 }) ] },
  { id: "k10", label: "10-oshxona — katta aralash", note: "hamma tur: rakovina, tortma, 2 penal, navesnoy",
    cabs: [ base(800, "Rakovina 800", { fill: "open", count: 0, door: 2 }), base(600, "Tortma 600", { fill: "drawers", count: 3, door: 0 }), base(600, "Shkaf 600", { count: 1, door: 1 }),
            tall(600, "Penal 2100", { height: 2100, fill: "shelves", count: 5, door: 1 }), tall(800, "Larder 2400", { height: 2400, depth: 600, fill: "shelves", count: 4, door: 2 }),
            upper(800, "Osma-1 800", { count: 2, door: 2 }), upper(600, "Osma-2 600", { count: 1, door: 1 }) ] },
];
