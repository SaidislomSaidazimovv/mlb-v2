// B - parity PDF: 10 BUTUN OSHXONA (founder: har biri ichidagi mebellari bilan, 54§1 "wall"). Har oshxona:
// butun-oshxona elevatsiyasi (ESKI/YANGI) + har mebelning bo'lak+teshik jadvali (birortasi qoldirilmaydi) +
// oshxona xulosasi. Oxirida: umumiy jadval + verdikt + poligon.html. TARTIBLI: qat'iy y-kursor, bo'lim ustma-ust
// chiqmaydi, joy yetmasa yangi sahifa; barcha matn ASCII-ga sanitize (jspdf non-ASCII kengligini xato o'lchaydi).
import { jsPDF } from "jspdf";
import { compareKitchen, kitchensOverall, ROLE_UZ, type Kitchen, type CabCompare } from "./compare";
import { kitchenElevation, type Elevation } from "./drawing";

const PW = 210, PH = 297, M = 12, W = PW - 2 * M, BOTTOM = PH - 12;
function hex(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function san(s: string): string {
  return s.replace(/§/g, ".").replace(/[Øø]/g, "d").replace(/×/g, "x").replace(/·/g, "-").replace(/[—–]/g, "-")
    .replace(/[«»]/g, '"').replace(/→/g, "->").replace(/≈/g, "~").replace(/['']/g, "'").replace(/[^\x20-\x7E]/g, "");
}

export function buildParityPdf(kitchens: Kitchen[]): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;
  const T = (t: string, x: number, o?: { angle?: number }) => doc.text(san(t), x, y, o as never);
  const nl = (d: number) => { y += d; };
  const ensure = (need: number) => { if (y + need > BOTTOM) { doc.addPage(); y = M; } };
  const head = (t: string, s: number, c: [number, number, number] = [20, 20, 20]) => { doc.setFontSize(s); doc.setTextColor(c[0], c[1], c[2]); T(t, M); };
  const wrap = (t: string, s: number, c: [number, number, number], lh = 3.6) => {
    doc.setFontSize(s); doc.setTextColor(c[0], c[1], c[2]);
    for (const ln of doc.splitTextToSize(san(t), W) as string[]) { ensure(lh + 1); doc.text(ln, M, y); nl(lh); }
  };

  kitchens.forEach((k, i) => {
    doc.addPage(); y = M;
    if (i === 0) doc.deletePage(1);
    const c = compareKitchen(k);

    head(`${i + 1}. ${k.label}`, 15); nl(6);
    doc.setFontSize(8.5); doc.setTextColor(90); T(`${k.cabs.length} ta mebel — ${k.note}`, M); nl(6);

    // ESKI | YANGI yonma-yon, kattaroq (founder: chizmalar aniq-tiniq bo'lsin)
    const halfW = (W - 8) / 2, evH = 72;
    drawKitchen(doc, kitchenElevation(k, "old"), M, y, halfW, evH, "ESKI (grid.ts) — butun oshxona");
    drawKitchen(doc, kitchenElevation(k, "new"), M + halfW + 8, y, halfW, evH, "YANGI (poligon) — butun oshxona");
    y += evH + 16;

    ensure(12); head("Har mebelning bo'laklari + teshigi:", 10); nl(5.5);
    for (const cc of c.cabs) cabTable(cc);

    nl(3); ensure(12); head("Oshxona xulosasi:", 10); nl(5); wrap(c.conclusion, 7.5, [50, 50, 50]);

    function cabTable(cc: CabCompare): void {
      ensure(11);
      doc.setFontSize(8); doc.setTextColor(30, 30, 30);
      const cab = cc.cab;
      T(`  ${cab.label}  (${cab.kind} ${cab.width}x${cab.height}x${cab.depth}, fill:${cab.fill}${cab.dividers ? ", pardevor" : ""})`, M); nl(4);
      doc.setFontSize(6); doc.setTextColor(110);
      T("rol", M + 3); T("eski (UxChxQ-teshik)", M + 30); T("yangi (UxChxQ-teshik)", M + 92); T("holat", M + 154); nl(1.3);
      doc.setDrawColor(210); doc.setLineWidth(0.1); doc.line(M + 3, y, M + W, y); nl(3);
      for (const r of cc.rows) {
        ensure(3.6);
        const o = r.old ? `${r.old.length}x${r.old.depth}x${r.old.thickness}-${r.old.holes.length}` : "-";
        const n = r.neu ? `${r.neu.length}x${r.neu.depth}x${r.neu.thickness}-${r.neu.holes.length}` : "-";
        const ok = r.sizeMatch, onlyOld = r.old && !r.neu;
        doc.setFontSize(6); doc.setTextColor(ok ? 30 : onlyOld ? 170 : 190, ok ? 120 : onlyOld ? 120 : 80, 60);
        T(ROLE_UZ[r.role] ?? r.role, M + 3); T(o, M + 30); T(n, M + 92);
        T(ok ? "BIR XIL" : onlyOld ? "faqat eski" : "farq", M + 154); nl(3.4);
      }
      nl(2);
    }
  });

  summaryPage(doc, kitchens, { T, nl, ensure, head, wrap, getY: () => y, setY: (v) => (y = v) });
  return new Uint8Array(doc.output("arraybuffer"));
}

interface Ctx { T: (t: string, x: number) => void; nl: (d: number) => void; ensure: (n: number) => void; head: (t: string, s: number, c?: [number, number, number]) => void; wrap: (t: string, s: number, c: [number, number, number], lh?: number) => void; getY: () => number; setY: (v: number) => void; }

function summaryPage(doc: jsPDF, kitchens: Kitchen[], ctx: Ctx): void {
  const ov = kitchensOverall(kitchens);
  const hline = () => { doc.setDrawColor(200); doc.setLineWidth(0.1); doc.line(M, ctx.getY(), M + W, ctx.getY()); };
  doc.addPage(); ctx.setY(M);
  ctx.head("YAKUNIY UMUMIY XULOSA — 10 oshxona bo'yicha", 15); ctx.nl(8);

  ctx.head("1) Umumiy jadval (oshxona bo'yicha):", 10); ctx.nl(6);
  doc.setFontSize(7); doc.setTextColor(70);
  ctx.T("oshxona", M); ctx.T("mebel", M + 78); ctx.T("eski b.", M + 100); ctx.T("yangi b.", M + 122); ctx.T("mos/juft", M + 146); ctx.T("teshik", M + 174);
  ctx.nl(1.5); hline(); ctx.nl(4);
  for (const r of ov.rows) {
    doc.setFontSize(7); doc.setTextColor(40);
    ctx.T(r.label, M); ctx.T(String(r.cabN), M + 78); ctx.T(String(r.oldN), M + 100); ctx.T(String(r.newN), M + 122); ctx.T(`${r.matched}/${r.both}`, M + 146); ctx.T(String(r.drills), M + 174);
    ctx.nl(4);
  }
  doc.setDrawColor(160); hline(); ctx.nl(4);
  doc.setFontSize(7.5); doc.setTextColor(20);
  ctx.T(`JAMI: eski ${ov.tOld} bo'lak, yangi ${ov.tNew}; o'lchami mos ${ov.tMatched}/${ov.tBoth} juft; teshik ${ov.tDrills}`, M); ctx.nl(8);

  ctx.head("2) BIR XILLIKLAR (ikkala versiya AYNAN bir xil chiqaradi):", 10, [30, 110, 60]); ctx.nl(6);
  ctx.wrap("- Har oshxonaning har mebelida: karkas (yon/ust/past/polka), eshik, orqa, tsokol, tortma-fasadi - o'lcham bir xil.", 8, [50, 50, 50]);
  ctx.wrap("- Teshik (cam d15, dowel d8, ilgak d35) - bir xil (52.1: teshik geometriya-yadrodan MUSTAQIL umumiy quyi qatlam).", 8, [50, 50, 50]);
  ctx.wrap("=> Pardevorsiz mebellar uchun poligon TO'LIQ kesim ro'yxatini eski grid.ts bilan bir xil chiqaradi.", 8.5, [30, 110, 60]); ctx.nl(4);

  ctx.ensure(40);
  ctx.head("3) FARQLAR (halol):", 10, [180, 100, 40]); ctx.nl(6);
  ctx.wrap("A) PARDEVOR (divider) - MODEL FARQI, kamchilik emas: eski app pardevorni to'liq balandlik qilib, eshik/polkani per-bo'lim ajratadi; poligon Sheet'ning QAT'IY junction qonuni (48.2) fizik ustma-ustlikka yo'l qo'ymaydi (poligon ANIQROQ). Pardevorli mebellarga konvensiya qarori kerak (48.7).", 8, [50, 50, 50]);
  ctx.wrap("B) APP XUSUSIYATLARI (geometriya emas): 3D ko'rinish, narx (pricing), SWJ008 CNC eksport, appliance, burchak (L). Bular 48-54 geometriya-spetsifikatsiyasidan tashqari ilova qatlamlari - yangi yadro almashsa ham qoladi.", 8, [50, 50, 50]); ctx.nl(4);

  ctx.ensure(60);
  ctx.head("4) QAYSI VERSIYA KUCHLI (halol baho):", 11); ctx.nl(6);
  ctx.wrap("A. KESIM RO'YXATI (parts+drills) -> TENG. Yangi poligon har oshxonaning har mebeli uchun to'liq kesim ro'yxatini (karkas+polka+eshik+orqa+tsokol+tortma-fasadi+teshik) eski bilan bir xil chiqaradi; faqat pardevorli mebellarda konvensiya farqi.", 8.5, [50, 50, 50]);
  ctx.wrap("B. QO'SHIMCHA XUSUSIYATLAR -> ESKI KUCHLI (hozircha): 3D, narx, CNC-eksport, appliance, burchak - ilova qatlamlari.", 8.5, [50, 50, 50]);
  ctx.wrap("C. ARXITEKTURA va TO'G'RILIK -> YANGI KUCHLI: 48-54 qonunlari (L0-L16 noqonuniy holatga yo'l yo'q; rad 'clamp' emas qoidani nomlaydi; lockfile; cascade; bitta haqiqat manbai; har qiymat qaysi qoida hal qilganini ko'rsatadi). Founderning O'ZI (54.1) yangi yadro grid.ts o'rnini bosishini yozgan.", 8.5, [50, 50, 50]); ctx.nl(2);
  ctx.wrap("YAKUN: Kesim ro'yxati bo'yicha yangi poligon eskiga TENG keldi. Qo'shimcha ilova xususiyatlari (3D/narx/CNC) bo'yicha eski hali kuchli, LEKIN ular geometriya-yadro emas. Arxitektura bo'yicha yangi kuchli va founderning rejasidagi kelajak (54.1). Ular RAQOBAT emas - yangi = eskining to'g'rilangan yadrosi.", 8.5, [30, 30, 30]); ctx.nl(4);

  ctx.ensure(36);
  ctx.head("5) YANGI VERSIYANING KO'RINISHI (poligon.html):", 10); ctx.nl(6);
  ctx.wrap("Yangi versiya UI-si alohida sahifa: poligon.html (eski grid.ts ilovasiga TEGMAYDI, 54.1). 4 ekran: Muharrir (chiziqni sudrash, qonuniy oraliq ko'rinadi) - Inspektor (har taxta yonida qaysi qoida hal qilgani) - Sozlamalar (Thing-fayllaridan AVTOMATIK) - Parts (kesim ro'yxati). Ishga tushirish: cd apps/app && npm run dev -> /poligon.html.", 8, [50, 50, 50]);
}

/** Butun oshxona elevatsiyasini box ichiga masshtablab (y-flip) chizadi + o'lcham. */
function drawKitchen(doc: jsPDF, ev: Elevation, x0: number, y0: number, boxW: number, boxH: number, title: string): void {
  doc.setFontSize(8); doc.setTextColor(70); doc.text(san(title), x0, y0);
  const top = y0 + 3;
  const sc = Math.min(boxW / ev.W, boxH / ev.H);
  const dw = ev.W * sc, dh = ev.H * sc;
  const ox = x0 + (boxW - dw) / 2; // gorizontal markaz
  const px = (x: number) => ox + x * sc, py = (yy: number) => top + dh - yy * sc;
  doc.setLineWidth(0.15);
  for (const l of ev.lines) {
    if (l.color) { const cc = hex(l.color); doc.setDrawColor(cc[0], cc[1], cc[2]); } else doc.setDrawColor(45);
    doc.setLineDashPattern(l.dash ? [0.7, 0.7] : [], 0);
    doc.line(px(l.x1), py(l.y1), px(l.x2), py(l.y2));
  }
  doc.setLineDashPattern([], 0);
  doc.setFontSize(5.5); doc.setTextColor(120);
  doc.text(`kenglik ~${Math.round(ev.W)} mm, balandlik ${Math.round(ev.H)} mm`, ox, top + dh + 3);
}
