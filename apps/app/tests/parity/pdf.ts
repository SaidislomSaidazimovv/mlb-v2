// B — parity PDF hisoboti (founder yetkazish talabi): har mebel uchun ESKI chizma + YANGI chizma +
// solishtiruv jadvali + xulosa. jspdf (app dep) bilan. ASOS: 54§1 parity + founder "chizma+solishtiruv+xulosa PDF".
import { jsPDF } from "jspdf";
import { compareFurniture, type Furniture, type NormPart } from "./compare";
import { layoutParts } from "./drawing";

function drawParts(doc: jsPDF, title: string, parts: NormPart[], x0: number, y0: number, w: number): number {
  doc.setFontSize(9); doc.setTextColor(60); doc.text(title, x0, y0);
  // ixcham masshtab — bo'laklar qatorlarга o'ralib 1 sahifaga sig'sin (720mm ≈ 22mm)
  const dr = layoutParts(title, parts, { scale: 0.03, gap: 2.5, maxRowWidth: w - 2 });
  let maxY = y0 + 3;
  doc.setDrawColor(150); doc.setFontSize(5); doc.setTextColor(90);
  for (const r of dr.rects) {
    const rx = x0 + r.x, ry = y0 + 3 + r.y;
    doc.rect(rx, ry, r.w, r.h);
    doc.text(r.label, rx + 1, ry + Math.min(r.h - 1, 4), { maxWidth: r.w - 1 });
    maxY = Math.max(maxY, ry + r.h);
  }
  return maxY;
}

/** N mebel uchun parity PDF (bytes). Har mebel — bitta sahifa. */
export function buildParityPdf(furnitures: Furniture[]): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); // 210×297
  const M = 12, W = 210 - 2 * M;
  furnitures.forEach((f, i) => {
    if (i > 0) doc.addPage();
    const c = compareFurniture(f);
    doc.setFontSize(14); doc.setTextColor(20); doc.text(`${i + 1}. ${f.label}`, M, M);
    doc.setFontSize(8); doc.setTextColor(90);
    doc.text(`${f.kind} · ${f.width}×${f.height}×${f.depth} mm · ${f.shelves} polka`, M, M + 6);

    // ikki chizma yonma-yon
    const colW = (W - 6) / 2;
    const yEskiTop = drawParts(doc, "ESKI (grid.ts)", c.old, M, M + 14, colW);
    const yYangiTop = drawParts(doc, "YANGI (poligon)", c.neu, M + colW + 6, M + 14, colW);
    let y = Math.max(yEskiTop, yYangiTop) + 8;

    // solishtiruv jadvali
    doc.setFontSize(9); doc.setTextColor(20); doc.text("Solishtiruv (bo'laklar):", M, y); y += 5;
    doc.setFontSize(7); doc.setTextColor(60);
    doc.text("rol", M, y); doc.text("eski (U×Ch×Q)", M + 30, y); doc.text("yangi (U×Ch×Q)", M + 85, y); doc.text("holat", M + 140, y);
    y += 1; doc.setDrawColor(200); doc.line(M, y, M + W, y); y += 4;
    for (const r of c.rows) {
      const o = r.old ? `${r.old.length}×${r.old.depth}×${r.old.thickness}` : "—";
      const n = r.neu ? `${r.neu.length}×${r.neu.depth}×${r.neu.thickness}` : "—";
      doc.setTextColor(r.match ? 30 : 150, r.match ? 110 : 90, 60);
      doc.text(r.role, M, y); doc.text(o, M + 30, y); doc.text(n, M + 85, y);
      doc.text(r.match ? "BIR XIL" : (r.old && !r.neu ? "faqat eski" : "farq"), M + 140, y);
      y += 4;
      if (y > 270) { doc.addPage(); y = M; }
    }

    // xulosa
    y += 4; doc.setFontSize(9); doc.setTextColor(20); doc.text("Xulosa:", M, y); y += 5;
    doc.setFontSize(7.5); doc.setTextColor(60);
    doc.text(doc.splitTextToSize(c.conclusion, W), M, y);
  });
  return new Uint8Array(doc.output("arraybuffer"));
}
