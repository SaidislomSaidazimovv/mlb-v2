// B — screenshot uchun HTML+SVG: har OSHXONA kartasi (ESKI elevatsiya | YANGI elevatsiya + har mebel jadvali +
// xulosa). Puppeteer har kartani rasm qiladi → docs/screenshots/. Butun oshxona (base+worktop+upper+tall).
import { compareKitchen, ROLE_UZ, type Kitchen } from "./compare";
import { kitchenElevation, type Elevation } from "./drawing";

function svg(ev: Elevation, w: number, h: number): string {
  const sc = Math.min((w - 16) / ev.W, (h - 30) / ev.H);
  const dw = ev.W * sc, dh = ev.H * sc, ox = (w - dw) / 2, oy = 8;
  const px = (x: number) => ox + x * sc, py = (y: number) => oy + dh - y * sc;
  const lines = ev.lines.map((l) =>
    `<line x1="${px(l.x1).toFixed(1)}" y1="${py(l.y1).toFixed(1)}" x2="${px(l.x2).toFixed(1)}" y2="${py(l.y2).toFixed(1)}" stroke="${l.color ?? "#2a2a2a"}" stroke-width="${l.color ? 1 : 1.3}"${l.dash ? ' stroke-dasharray="3 2"' : ""}/>`
  ).join("");
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${lines}<text x="${ox + dw / 2}" y="${oy + dh + 12}" font-size="9" fill="#666" text-anchor="middle">kenglik ~${Math.round(ev.W)} mm - balandlik ${Math.round(ev.H)} mm</text></svg>`;
}

export function buildParityHtml(kitchens: Kitchen[]): string {
  const cards = kitchens.map((k, i) => {
    const c = compareKitchen(k);
    const cabBlocks = c.cabs.map((cc) => {
      const rows = cc.rows.map((r) => {
        const o = r.old ? `${r.old.length}×${r.old.depth}×${r.old.thickness}·${r.old.holes.length}` : "—";
        const n = r.neu ? `${r.neu.length}×${r.neu.depth}×${r.neu.thickness}·${r.neu.holes.length}` : "—";
        const cls = r.sizeMatch ? "ok" : r.old && !r.neu ? "old" : "diff";
        const st = r.sizeMatch ? "BIR XIL" : r.old && !r.neu ? "faqat eski" : "farq";
        return `<tr class="${cls}"><td>${ROLE_UZ[r.role] ?? r.role}</td><td>${o}</td><td>${n}</td><td>${st}</td></tr>`;
      }).join("");
      return `<div class="cab"><div class="cabh">${cc.cab.label} <span>(${cc.cab.kind} ${cc.cab.width}×${cc.cab.height}×${cc.cab.depth}, ${cc.cab.fill}${cc.cab.dividers ? ", pardevor" : ""})</span></div>
        <table><thead><tr><th>rol</th><th>eski (U×Ch×Q·t)</th><th>yangi (U×Ch×Q·t)</th><th>holat</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join("");
    return `<div class="card" id="f${i}">
      <h2>${i + 1}. ${k.label}</h2>
      <div class="spec">${k.cabs.length} ta mebel — <i>${k.note}</i></div>
      <div class="draw"><div class="lbl">ESKI (grid.ts) — butun oshxona</div>${svg(kitchenElevation(k, "old"), 680, 210)}</div>
      <div class="draw"><div class="lbl">YANGI (poligon) — butun oshxona</div>${svg(kitchenElevation(k, "new"), 680, 210)}</div>
      <div class="cabs">${cabBlocks}</div>
      <div class="concl"><b>Oshxona xulosasi:</b> ${c.conclusion}</div>
    </div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#f4f1ea;margin:0;padding:16px;color:#222}
    .card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:18px;margin:0 auto 24px;max-width:740px;box-shadow:0 1px 4px #0001}
    h2{margin:0 0 4px;font-size:18px}.spec{color:#777;font-size:12px;margin-bottom:12px}
    .draw{border:1px solid #eee;border-radius:8px;padding:6px;background:#fafafa;margin-bottom:10px}
    .lbl{font-size:11px;color:#555;margin-bottom:2px}
    .cabs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}
    .cab{flex:1 1 340px;border:1px solid #eee;border-radius:6px;padding:6px}
    .cabh{font-size:11px;font-weight:600;color:#333;margin-bottom:3px}.cabh span{font-weight:400;color:#999}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{text-align:left;color:#999;border-bottom:1px solid #ddd;padding:2px 4px;font-weight:600}
    td{padding:1px 4px;border-bottom:1px solid #f2f2f2}
    tr.ok td{color:#2e7d32}tr.old td{color:#b58a2e}tr.diff td{color:#c0392b}
    .concl{font-size:11.5px;line-height:1.5;color:#444;background:#f8f6f0;border-radius:6px;padding:10px}
  </style></head><body>${cards}</body></html>`;
}
