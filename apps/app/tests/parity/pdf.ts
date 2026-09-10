// B - parity PDF (founder yetkazish talabi). TARTIBLI: qat'iy y-kursor, bo'limlar ustma-ust CHIQMAYDI, joy
// yetmasa yangi sahifa; BARCHA matn ASCII-ga sanitize qilinadi (jspdf non-ASCII kengligini xato o'lchaydi ->
// kesilishni oldini oladi). Har mebel: yig'ilgan ko'rinish (ESKI|YANGI) + bo'lak+teshik jadvali + real teshikli
// panellar + batafsil xulosa. Oxirida: UMUMIY solishtiruv + qaysi versiya kuchli + poligon.html.
import { jsPDF } from "jspdf";
import { compareFurniture, overallSummary, type Furniture, type NormPart } from "./compare";
import { elevationOld, elevationNew, panelDraw, type Elevation, type PanelDraw } from "./drawing";

const PAGE_W = 210, PAGE_H = 297, M = 14, W = PAGE_W - 2 * M, BOTTOM = PAGE_H - 14;
function hex(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
/** jspdf faqat WinAnsi kengligini to'g'ri biladi -> barcha matnni ASCII-ga o'tkazamiz (kesilish yo'q). */
function san(s: string): string {
  return s.replace(/§/g, ".").replace(/[Øø]/g, "d").replace(/×/g, "x").replace(/·/g, "-")
    .replace(/[—–]/g, "-").replace(/[«»]/g, '"').replace(/→/g, "->").replace(/≈/g, "~")
    .replace(/[’‘]/g, "'").replace(/[^\x20-\x7E]/g, "");
}

export function buildParityPdf(furnitures: Furniture[]): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;
  const T = (t: string, x: number, opts?: { angle?: number; maxWidth?: number }) => doc.text(san(t), x, y, opts as never);
  const nl = (dy: number) => { y += dy; };
  const ensure = (need: number) => { if (y + need > BOTTOM) { doc.addPage(); y = M; } };
  const heading = (t: string, size: number, col: [number, number, number] = [20, 20, 20]) => { doc.setFontSize(size); doc.setTextColor(col[0], col[1], col[2]); T(t, M); };
  const wrap = (t: string, size: number, col: [number, number, number], lh = 3.6, w = W) => {
    doc.setFontSize(size); doc.setTextColor(col[0], col[1], col[2]);
    for (const ln of doc.splitTextToSize(san(t), w) as string[]) { ensure(lh + 1); doc.text(ln, M, y); nl(lh); }
  };

  furnitures.forEach((f, i) => {
    doc.addPage(); y = M;
    if (i === 0) doc.deletePage(1);
    const c = compareFurniture(f);

    heading(`${i + 1}. ${f.label}`, 14); nl(6);
    doc.setFontSize(8); doc.setTextColor(90);
    T(`${f.kind} · ${f.width}x${f.height}x${f.depth} mm · fill: ${f.fill} · ${f.count} · ${f.door ? f.door + " eshik" : "eshiksiz"}`, M); nl(4.5);
    doc.setFontSize(7); doc.setTextColor(120); T(`Tur: ${f.note}`, M); nl(6);

    heading("Yig'ilgan ko'rinish (old ko'rinish, mm):", 9); nl(5);
    const boxTop = y, boxH = 56, boxW = 46;
    drawElevation(doc, elevationOld(f), M + 8, boxTop, boxW, boxH, "ESKI (grid.ts) - to'liq mebel");
    drawElevation(doc, elevationNew(f), M + 8 + boxW + 30, boxTop, boxW, boxH, "YANGI (poligon) - karkas");
    y = boxTop + boxH + 12;

    ensure(14 + c.rows.length * 3.6);
    heading("Bo'laklar + teshik solishtiruvi:", 9); nl(5);
    doc.setFontSize(6.5); doc.setTextColor(70);
    T("rol", M); T("eski (Uz.Ch.Q - teshik)", M + 28); T("yangi (Uz.Ch.Q - teshik)", M + 92); T("holat", M + 156);
    nl(1.5); doc.setDrawColor(200); doc.setLineWidth(0.1); doc.line(M, y, M + W, y); nl(3.4);
    for (const r of c.rows) {
      ensure(4);
      const o = r.old ? `${r.old.length}x${r.old.depth}x${r.old.thickness} - ${r.old.holes.length}` : "-";
      const n = r.neu ? `${r.neu.length}x${r.neu.depth}x${r.neu.thickness} - ${r.neu.holes.length}` : "-";
      const ok = r.sizeMatch, onlyOld = r.old && !r.neu;
      doc.setTextColor(ok ? 30 : onlyOld ? 170 : 190, ok ? 120 : onlyOld ? 120 : 80, ok ? 60 : 40);
      doc.setFontSize(6.5);
      T(r.role, M); T(o, M + 28); T(n, M + 92); T(ok ? "BIR XIL" : onlyOld ? "faqat eski" : "farq", M + 156);
      nl(3.6);
    }
    nl(4);

    ensure(42);
    heading("Karkas panellari (real teshik joyi):", 9); nl(5);
    const sc = 0.045; let px = M, rowMaxH = 0;
    for (const role of ["side", "top", "bottom", "facade"]) {
      const part = c.old.find((p) => p.role === role);
      if (!part) continue;
      const pd = panelDraw(part);
      const pw = pd.length * sc, ph = pd.depth * sc;
      if (px + pw > M + W) { px = M; y += rowMaxH + 8; rowMaxH = 0; ensure(ph + 8); }
      drawPanel(doc, pd, px, y, sc);
      px += pw + 10; rowMaxH = Math.max(rowMaxH, ph);
    }
    y += rowMaxH + 8;
    doc.setFontSize(5.5); doc.setTextColor(120);
    T("Teshik: qizil d15 (cam), ko'k d8 (dowel), yashil d35 (ilgak petlasi), kulrang d3-5 (pin/pilot)", M); nl(6);

    ensure(10);
    heading("Xulosa (asos bilan):", 9); nl(5);
    wrap(c.conclusion, 7, [50, 50, 50]);
  });

  // ── YAKUNIY UMUMIY XULOSA + VERDIKT ──
  summarySection(doc, furnitures, { T, nl, ensure, heading, wrap, setY: (v) => (y = v), getY: () => y });
  return new Uint8Array(doc.output("arraybuffer"));
}

interface Ctx { T: (t: string, x: number, o?: { angle?: number }) => void; nl: (d: number) => void; ensure: (n: number) => void; heading: (t: string, s: number, c?: [number, number, number]) => void; wrap: (t: string, s: number, c: [number, number, number], lh?: number, w?: number) => void; setY: (v: number) => void; getY: () => number; }

function summarySection(doc: jsPDF, furnitures: Furniture[], ctx: Ctx): void {
  const ov = overallSummary(furnitures);
  const hline = () => { doc.setLineWidth(0.1); doc.line(M, ctx.getY(), M + W, ctx.getY()); };
  doc.addPage(); ctx.setY(M);
  ctx.heading("YAKUNIY UMUMIY XULOSA - 10 mebel bo'yicha", 15); ctx.nl(8);

  // umumiy jadval
  ctx.heading("1) Umumiy solishtiruv jadvali:", 10); ctx.nl(6);
  doc.setFontSize(7); doc.setTextColor(70);
  ctx.T("mebel", M); ctx.T("eski b.", M + 70); ctx.T("yangi b.", M + 92); ctx.T("mos", M + 116); ctx.T("faqat eski", M + 134); ctx.T("teshik", M + 162);
  ctx.nl(1.5); doc.setDrawColor(200); hline(); ctx.nl(4);
  for (const r of ov.rows) {
    doc.setFontSize(7); doc.setTextColor(40);
    ctx.T(r.label, M); ctx.T(String(r.oldN), M + 70); ctx.T(String(r.newN), M + 92); ctx.T(String(r.matched), M + 116); ctx.T(String(r.oldOnly), M + 134); ctx.T(String(r.drills), M + 162);
    ctx.nl(4);
  }
  doc.setDrawColor(160); hline(); ctx.nl(4);
  doc.setFontSize(7.5); doc.setTextColor(20);
  ctx.T(`JAMI: eski ${ov.totalOld} bo'lak, yangi ${ov.totalNew}; o'lchami mos ${ov.totalMatched}; faqat eskida ${ov.totalOldOnly}; karkas teshigi ${ov.totalDrills}`, M); ctx.nl(8);

  ctx.heading("2) BIR XILLIKLAR (ikkala versiya bir xil chiqaradi):", 10, [30, 110, 60]); ctx.nl(6);
  ctx.wrap("- Tashqi karkas bo'laklari: yon (side=balandlik), ust va past (=en-2xqalinlik) - o'lcham AYNAN bir xil (48.0 Sheet konvensiyasi).", 8, [50, 50, 50]);
  ctx.wrap("- Eshik va orqa panel o'lchami mos.", 8, [50, 50, 50]);
  ctx.wrap("- Karkas teshigi (cam d15, dowel d8, ilgak d35) - umumiy mashina dvigatelidan, bir xil (52.1: teshik geometriya-yadrodan MUSTAQIL quyi qatlam).", 8, [50, 50, 50]);
  ctx.wrap("- Pardevorsiz mebelda full-width polka o'lchami mos.", 8, [50, 50, 50]); ctx.nl(4);

  ctx.ensure(60);
  ctx.heading("3) FARQLAR (faqat ESKI versiyada; yangi poligon hali modellamaydi):", 10, [180, 100, 40]); ctx.nl(6);
  ctx.wrap("- Tortma qutisi va tortma fasadi (drawer) - app'ning layout-daraxti.", 8, [50, 50, 50]);
  ctx.wrap("- Pardevor (divider) va per-bo'lim polka (mas. 900mm servantda 4 polka 434mm).", 8, [50, 50, 50]);
  ctx.wrap("- Tsokol (plinth band).", 8, [50, 50, 50]);
  ctx.wrap("- 3D ko'rinish, narx hisobi (pricing), SWJ008 CNC eksport, o'rnatma jihoz (appliance), burchak (L) shkaf.", 8, [50, 50, 50]);
  ctx.wrap("SABAB: poligon Sheet-yadrosi HOZIRCHA tashqi karkasni modellaydi (48.0); ichki to'ldirma = keyingi bosqich (48.0 modul, 52.3 joints, founder Q2 teshik).", 8, [90, 90, 90]); ctx.nl(4);

  ctx.ensure(70);
  ctx.heading("4) QAYSI VERSIYA KUCHLI (halol baho, asos bilan):", 11, [20, 20, 20]); ctx.nl(6);
  ctx.wrap("Ikki o'lchovda baholanadi:", 9, [40, 40, 40]);
  ctx.wrap("A. BUGUNGI TO'LIQLIK -> ESKI KUCHLI. Eski versiya to'liq mebelni chiqaradi: tortma, pardevor, eshik, appliance, burchak; teshik -> SWJ008 CNC; 3D; narx. Yangi versiya hozircha faqat tashqi karkasni.", 8.5, [50, 50, 50]);
  ctx.wrap("B. ARXITEKTURA va TO'G'RILIK -> YANGI KUCHLI. Founderning 48-54 qonunlari asosida: noqonuniy holatga gesture bilan yetib bo'lmaydi (L0-L16); rad etish 'clamp' emas, qoidani nomlaydi; natija takrorlanuvchi (lockfile); avto-guruhlash (cascade); bitta haqiqat manbai; har qiymat qaysi qoida hal qilganini ko'rsatadi. Founderning O'ZI (54.1) yangi yadro grid.ts o'rnini bosishini yozgan - chunki eski per-band model cheklangan.", 8.5, [50, 50, 50]);
  ctx.nl(2);
  ctx.wrap("YAKUN: ESKI - bugun to'liq ishlaydigan mahsulot (feature bo'yicha kuchli). YANGI - kelajakning to'g'ri poydevori (arxitektura bo'yicha kuchli), hali karkas bosqichida. Reja (54.1): yangi yadro parity isbotlangach ilova ekranlarini bittalab o'ziga oladi; teshik esa har ikkisiga umumiy quyi qatlam bo'lib qoladi. Ya'ni ular RAQOBAT emas - yangi eskining to'g'rilangan davomi.", 8.5, [30, 30, 30]); ctx.nl(4);

  ctx.ensure(40);
  ctx.heading("5) YANGI VERSIYANING KO'RINISHI (poligon.html):", 10, [20, 20, 20]); ctx.nl(6);
  ctx.wrap("Yangi versiya UI-si alohida sahifa: poligon.html (eski grid.ts ilovasiga TEGMAYDI, 54.1). 4 ekran:", 8.5, [50, 50, 50]);
  ctx.wrap("- Muharrir: chiziqni sudrash, sudrash paytida qonuniy oraliq ko'rinadi (noqonuniy holat taklif etilmaydi).", 8.5, [50, 50, 50]);
  ctx.wrap("- Inspektor: har taxta o'lchami yonida QAYSI QOIDA uni hal qilgani yoziladi.", 8.5, [50, 50, 50]);
  ctx.wrap("- Sozlamalar: Thing-fayllaridan AVTOMATIK yaratiladi (qo'lda emas).", 8.5, [50, 50, 50]);
  ctx.wrap("- Parts: kesim ro'yxati (bo'laklar chizmasi + jadval).", 8.5, [50, 50, 50]);
  ctx.wrap("Ishga tushirish: cd apps/app && npm run dev -> brauzerda /poligon.html.", 8, [90, 90, 90]);
}

/** Yig'ilgan elevatsiya - box ichiga masshtablab (y-flip) + W x H o'lcham. */
function drawElevation(doc: jsPDF, ev: Elevation, x0: number, y0: number, boxW: number, boxH: number, title: string): void {
  doc.setFontSize(7.5); doc.setTextColor(70); doc.text(title, x0, y0 - 1);
  const sc = Math.min(boxW / ev.W, boxH / ev.H);
  const drawW = ev.W * sc, drawH = ev.H * sc;
  const px = (x: number) => x0 + x * sc, py = (yy: number) => y0 + drawH - yy * sc;
  doc.setLineWidth(0.2);
  for (const l of ev.lines) {
    if (l.color) { const c = hex(l.color); doc.setDrawColor(c[0], c[1], c[2]); } else doc.setDrawColor(40);
    doc.setLineDashPattern(l.dash ? [0.8, 0.8] : [], 0);
    doc.line(px(l.x1), py(l.y1), px(l.x2), py(l.y2));
  }
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6); doc.setTextColor(110);
  doc.text(`${ev.W}`, x0 + drawW / 2 - 3, y0 + drawH + 4);
  doc.text(`${ev.H}`, x0 - 6, y0 + drawH / 2, { angle: 90 });
}

/** Panel yassi + REAL teshiklar (rang diametr bo'yicha). */
function drawPanel(doc: jsPDF, pd: PanelDraw, x0: number, y0: number, sc: number): void {
  const w = pd.length * sc, h = pd.depth * sc;
  doc.setDrawColor(60); doc.setLineWidth(0.2); doc.rect(x0, y0, w, h);
  for (const hole of pd.holes) {
    const cx = x0 + hole.x * sc, cy = y0 + h - hole.y * sc;
    if (hole.dia >= 30) doc.setFillColor(60, 150, 70);
    else if (hole.dia >= 14) doc.setFillColor(200, 70, 60);
    else if (hole.dia >= 7) doc.setFillColor(60, 90, 200);
    else doc.setFillColor(130, 130, 130);
    doc.circle(cx, cy, Math.max(0.5, hole.dia * sc * 0.5), "F");
  }
  doc.setFontSize(5); doc.setTextColor(90);
  doc.text(`${pd.role} ${pd.length}x${pd.depth} - ${pd.holes.length} teshik`, x0, y0 + h + 3);
}
