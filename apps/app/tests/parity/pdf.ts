// B — parity PDF (founder yetkazish talabi): har mebel — yig'ilgan ko'rinish (ESKI|YANGI elevatsiya + o'lcham),
// bo'lak+teshik jadvali, real teshikli panellar, xulosa. jspdf. ASOS: 54§1 parity + founder "chizma+solishtiruv+xulosa PDF".
import { jsPDF } from "jspdf";
import { compareFurniture, type Furniture } from "./compare";
import { elevation, panelDraw, type Elevation, type PanelDraw } from "./drawing";

/** Yig'ilgan elevatsiyani box ichiga masshtablab chizadi (y-flip) + W×H o'lcham yozuvlari. */
function drawElevation(doc: jsPDF, ev: Elevation, x0: number, y0: number, boxW: number, boxH: number, title: string): void {
  doc.setFontSize(8); doc.setTextColor(70); doc.text(title, x0, y0 - 1);
  const sc = Math.min(boxW / ev.W, boxH / ev.H);
  const drawW = ev.W * sc, drawH = ev.H * sc;
  const px = (x: number) => x0 + x * sc;
  const py = (y: number) => y0 + drawH - y * sc; // y-flip (mebel y yuqoriga)
  doc.setDrawColor(40); doc.setLineWidth(0.2);
  for (const l of ev.lines) doc.line(px(l.x1), py(l.y1), px(l.x2), py(l.y2));
  // eshik konturi (dashed, to'liq old)
  if (ev.door) { doc.setDrawColor(180, 140, 60); doc.setLineDashPattern([1, 1], 0); doc.rect(px(2), py(ev.H - 2), drawW - 4 * sc, drawH - 4 * sc); doc.setLineDashPattern([], 0); }
  // o'lcham yozuvlari
  doc.setFontSize(6); doc.setTextColor(110);
  doc.text(`${ev.W}`, x0 + drawW / 2 - 3, y0 + drawH + 4);
  doc.text(`${ev.H}`, x0 - 6, y0 + drawH / 2, { angle: 90 });
}

/** Panelni yassi chizadi (length×depth) + REAL teshiklar (rangi Ø bo'yicha). */
function drawPanel(doc: jsPDF, pd: PanelDraw, x0: number, y0: number, sc: number): number {
  const w = pd.length * sc, h = pd.depth * sc;
  doc.setDrawColor(60); doc.setLineWidth(0.2); doc.rect(x0, y0, w, h);
  for (const hole of pd.holes) {
    const cx = x0 + hole.x * sc, cy = y0 + h - hole.y * sc; // y-flip
    // rang: Ø15 cam (qizil), Ø8 dowel (ko'k), Ø35 ilgak (yashil), Ø3/Ø5 pin (kulrang)
    if (hole.dia >= 30) doc.setFillColor(60, 150, 70);
    else if (hole.dia >= 14) doc.setFillColor(200, 70, 60);
    else if (hole.dia >= 7) doc.setFillColor(60, 90, 200);
    else doc.setFillColor(130, 130, 130);
    doc.circle(cx, cy, Math.max(0.5, hole.dia * sc * 0.5), "F");
  }
  doc.setFontSize(5); doc.setTextColor(90);
  doc.text(`${pd.role} ${pd.length}×${pd.depth} · ${pd.holes.length} teshik`, x0, y0 + h + 3);
  return h;
}

export function buildParityPdf(furnitures: Furniture[]): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 12, W = 210 - 2 * M;
  furnitures.forEach((f, i) => {
    if (i > 0) doc.addPage();
    const c = compareFurniture(f);
    doc.setFontSize(13); doc.setTextColor(20); doc.text(`${i + 1}. ${f.label}`, M, M);
    doc.setFontSize(8); doc.setTextColor(90);
    doc.text(`${f.kind} · ${f.width}×${f.height}×${f.depth} mm · ${f.shelves} polka · ${f.door ? "eshikli" : "ochiq"}`, M, M + 5);

    // 1) Yig'ilgan ko'rinish — ESKI | YANGI elevatsiya (geometriya bir xil → bir xil ko'rinadi)
    const evTop = M + 12, evBoxH = 48, evBoxW = 42;
    drawElevation(doc, elevation(f), M + 6, evTop, evBoxW, evBoxH, "ESKI (grid.ts) — yig'ilgan");
    drawElevation(doc, elevation(f), M + 6 + evBoxW + 24, evTop, evBoxW, evBoxH, "YANGI (poligon) — yig'ilgan");

    // 2) Bo'lak + teshik jadvali
    let y = evTop + evBoxH + 10;
    doc.setFontSize(8.5); doc.setTextColor(20); doc.text("Bo'laklar + teshik solishtiruvi:", M, y); y += 5;
    doc.setFontSize(6.5); doc.setTextColor(70);
    doc.text("rol", M, y); doc.text("eski (U×Ch×Q · teshik)", M + 26, y); doc.text("yangi (U×Ch×Q · teshik)", M + 92, y); doc.text("holat", M + 158, y);
    y += 1; doc.setDrawColor(200); doc.line(M, y, M + W, y); y += 3.5;
    for (const r of c.rows) {
      const o = r.old ? `${r.old.length}×${r.old.depth}×${r.old.thickness} · ${r.old.holes.length}` : "—";
      const n = r.neu ? `${r.neu.length}×${r.neu.depth}×${r.neu.thickness} · ${r.neu.holes.length}` : "—";
      const ok = r.sizeMatch && (!r.old || !r.neu || r.drillMatch);
      doc.setTextColor(ok ? 30 : 160, ok ? 110 : 80, 60);
      doc.text(r.role, M, y); doc.text(o, M + 26, y); doc.text(n, M + 92, y);
      doc.text(r.sizeMatch ? (r.drillMatch ? "BIR XIL" : "o'lcham bir xil") : (r.old && !r.neu ? "faqat eski" : "farq"), M + 158, y);
      y += 3.5;
    }

    // 3) Panellar (real teshik) — side/top/facade
    y += 5; doc.setFontSize(8.5); doc.setTextColor(20); doc.text("Panellar (real teshik joyi):", M, y); y += 4;
    const sc = 0.05;
    let px = M;
    for (const role of ["side", "top", "facade"]) {
      const part = c.old.find((p) => p.role === role);
      if (!part) continue;
      const pd = panelDraw(part);
      if (px + pd.length * sc > M + W) { px = M; y += 30; }
      drawPanel(doc, pd, px, y, sc);
      px += pd.length * sc + 12;
    }
    y += 34;

    // 4) Xulosa
    doc.setFontSize(8.5); doc.setTextColor(20); doc.text("Xulosa:", M, y); y += 4.5;
    doc.setFontSize(7); doc.setTextColor(60);
    doc.text(doc.splitTextToSize(c.conclusion, W), M, y);
    // teshik legendasi
    doc.setFontSize(5.5); doc.setTextColor(120);
    doc.text("Teshik: qizil Ø15 (cam), ko'k Ø8 (dowel), yashil Ø35 (ilgak), kulrang Ø3-5 (pin/pilot)", M, 290);
  });
  return new Uint8Array(doc.output("arraybuffer"));
}
