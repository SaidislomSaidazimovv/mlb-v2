// B — screenshot uchun HTML+SVG: har mebel kartasi (ESKI elevatsiya | YANGI elevatsiya + solishtiruv + xulosa).
// Puppeteer har kartani rasm qiladi → docs/screenshots/. ESKI = to'liq mebel (tortma/pardevor), YANGI = poligon karkas.
import { compareFurniture, ROLE_UZ, type Furniture } from "./compare";
import { elevationOld, elevationNew, type Elevation } from "./drawing";

function svg(ev: Elevation, w: number, h: number): string {
  const sc = Math.min((w - 20) / ev.W, (h - 44) / ev.H); // pastda o'lcham yozuvi uchun joy
  const dw = ev.W * sc, dh = ev.H * sc, ox = (w - dw) / 2, oy = 10;
  const px = (x: number) => ox + x * sc, py = (y: number) => oy + dh - y * sc; // y-flip
  const lines = ev.lines.map((l) =>
    `<line x1="${px(l.x1).toFixed(1)}" y1="${py(l.y1).toFixed(1)}" x2="${px(l.x2).toFixed(1)}" y2="${py(l.y2).toFixed(1)}" stroke="${l.color ?? "#2a2a2a"}" stroke-width="${l.color ? 1 : 1.4}"${l.dash ? ' stroke-dasharray="3 2"' : ""}/>`
  ).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${lines}<text x="${ox + dw / 2}" y="${oy + dh + 12}" font-size="10" fill="#666" text-anchor="middle">${ev.W} × ${ev.H} mm</text></svg>`;
}

export function buildParityHtml(furnitures: Furniture[]): string {
  const cards = furnitures.map((f, i) => {
    const c = compareFurniture(f);
    const rows = c.rows.map((r) => {
      const o = r.old ? `${r.old.length}×${r.old.depth}×${r.old.thickness} · ${r.old.holes.length}` : "—";
      const n = r.neu ? `${r.neu.length}×${r.neu.depth}×${r.neu.thickness} · ${r.neu.holes.length}` : "—";
      const cls = r.sizeMatch ? "ok" : r.old && !r.neu ? "old" : "diff";
      const st = r.sizeMatch ? "BIR XIL" : r.old && !r.neu ? "faqat eski" : "farq";
      return `<tr class="${cls}"><td>${ROLE_UZ[r.role] ?? r.role}</td><td>${o}</td><td>${n}</td><td>${st}</td></tr>`;
    }).join("");
    return `<div class="card" id="f${i}">
      <h2>${i + 1}. ${f.label}</h2>
      <div class="spec">${f.kind} · ${f.width}×${f.height}×${f.depth} mm · fill: ${f.fill} · ${f.count} · ${f.door ? f.door + " eshik" : "eshiksiz"} — <i>${f.note}</i></div>
      <div class="draws">
        <div class="draw"><div class="lbl">ESKI (grid.ts) — to'liq mebel</div>${svg(elevationOld(f), 300, 300)}</div>
        <div class="draw"><div class="lbl">YANGI (poligon) — karkas</div>${svg(elevationNew(f), 300, 300)}</div>
      </div>
      <table><thead><tr><th>rol</th><th>eski (U×Ch×Q·teshik)</th><th>yangi (U×Ch×Q·teshik)</th><th>holat</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="concl"><b>Xulosa:</b> ${c.conclusion}</div>
    </div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#f4f1ea;margin:0;padding:16px;color:#222}
    .card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:18px;margin:0 auto 24px;max-width:720px;box-shadow:0 1px 4px #0001}
    h2{margin:0 0 4px;font-size:18px}.spec{color:#777;font-size:12px;margin-bottom:12px}
    .draws{display:flex;gap:16px;justify-content:center;margin-bottom:12px}
    .draw{flex:1;text-align:center;border:1px solid #eee;border-radius:8px;padding:6px;background:#fafafa}
    .lbl{font-size:11px;color:#555;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px}
    th{text-align:left;color:#888;border-bottom:1px solid #ccc;padding:3px 5px;font-weight:600}
    td{padding:2px 5px;border-bottom:1px solid #f0f0f0}
    tr.ok td{color:#2e7d32}tr.old td{color:#b58a2e}tr.diff td{color:#c0392b}
    .concl{font-size:11.5px;line-height:1.5;color:#444;background:#f8f6f0;border-radius:6px;padding:10px}
  </style></head><body>${cards}</body></html>`;
}
