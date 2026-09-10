// B — screenshot uchun HTML+SVG: har OSHXONA kartasi — TO'LIQ chizmalar (fasad ESKI|YANGI, tepadan, chap/o'ng
// yon ichki kesim, orqa) DEVOR rang+yozuv bilan + har mebel bo'lak+teshik jadvali + xulosa.
import { compareKitchen, ROLE_UZ, type Kitchen } from "./compare";
import { viewFront, viewTop, viewLeft, viewRight, viewBack, type View } from "./views";

function svg(v: View, w: number, h: number): string {
  const sc = Math.min((w - 10) / v.W, (h - 10) / v.H);
  const dw = v.W * sc, dh = v.H * sc, ox = (w - dw) / 2, oy = (h - dh) / 2;
  const px = (x: number) => ox + x * sc, py = (y: number) => oy + dh - y * sc;
  const parts: string[] = [];
  for (const s of v.shapes) {
    const dash = s.dash ? ' stroke-dasharray="3 2"' : "";
    const stroke = s.stroke ?? "#2d2d2d";
    if (s.t === "rect") {
      const x = px(Math.min(s.x1, s.x2)), yy = py(Math.max(s.y1, s.y2)), rw = Math.abs(s.x2 - s.x1) * sc, rh = Math.abs(s.y2 - s.y1) * sc;
      parts.push(`<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${s.fill ?? "none"}" stroke="${stroke}" stroke-width="0.9"${dash}/>`);
    } else parts.push(`<line x1="${px(s.x1).toFixed(1)}" y1="${py(s.y1).toFixed(1)}" x2="${px(s.x2).toFixed(1)}" y2="${py(s.y2).toFixed(1)}" stroke="${stroke}" stroke-width="1"${dash}/>`);
  }
  for (const lb of v.labels) {
    const fs = (lb.size ?? 24) >= 30 ? 11 : 8;
    parts.push(`<text x="${px(lb.x).toFixed(1)}" y="${py(lb.y).toFixed(1)}" font-size="${fs}" fill="${lb.color ?? "#666"}"${lb.mid ? ' text-anchor="middle"' : ""}>${lb.text}</text>`);
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="background:#fff">${parts.join("")}</svg>`;
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
        <table><thead><tr><th>rol</th><th>eski·t</th><th>yangi·t</th><th>holat</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join("");
    return `<div class="card" id="f${i}">
      <h2>${i + 1}. ${k.label}</h2>
      <div class="spec">${k.cabs.length} ta mebel — <i>${k.note}</i></div>
      <div class="vrow"><div class="v"><div class="lbl">A) FASAD — ESKI (grid.ts)</div>${svg(viewFront(k, "old"), 340, 240)}</div>
        <div class="v"><div class="lbl">A) FASAD — YANGI (poligon)</div>${svg(viewFront(k, "new"), 340, 240)}</div></div>
      <div class="v full"><div class="lbl">B) TEPADAN (plan) — DEVOR orqada</div>${svg(viewTop(k), 700, 150)}</div>
      <div class="vrow"><div class="v"><div class="lbl">C) CHAP YON (kesim — ichki qism)</div>${svg(viewLeft(k), 340, 230)}</div>
        <div class="v"><div class="lbl">C) O'NG YON (kesim — ichki qism)</div>${svg(viewRight(k), 340, 230)}</div></div>
      <div class="v full"><div class="lbl">D) ORQA (devor tomoni)</div>${svg(viewBack(k), 700, 160)}</div>
      <div class="cabs">${cabBlocks}</div>
      <div class="concl"><b>Oshxona xulosasi:</b> ${c.conclusion}</div>
    </div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#f4f1ea;margin:0;padding:16px;color:#222}
    .card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:18px;margin:0 auto 24px;max-width:760px;box-shadow:0 1px 4px #0001}
    h2{margin:0 0 4px;font-size:18px}.spec{color:#777;font-size:12px;margin-bottom:12px}
    .vrow{display:flex;gap:12px;margin-bottom:10px}.v{flex:1;border:1px solid #eee;border-radius:8px;padding:6px;background:#fafafa}
    .v.full{margin-bottom:10px}.lbl{font-size:11px;color:#555;margin-bottom:3px;font-weight:600}
    .cabs{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
    .cab{flex:1 1 340px;border:1px solid #eee;border-radius:6px;padding:6px}
    .cabh{font-size:11px;font-weight:600;color:#333;margin-bottom:3px}.cabh span{font-weight:400;color:#999}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{text-align:left;color:#999;border-bottom:1px solid #ddd;padding:2px 4px}
    td{padding:1px 4px;border-bottom:1px solid #f2f2f2}
    tr.ok td{color:#2e7d32}tr.old td{color:#b58a2e}tr.diff td{color:#c0392b}
    .concl{font-size:11.5px;line-height:1.5;color:#444;background:#f8f6f0;border-radius:6px;padding:10px}
  </style></head><body>${cards}</body></html>`;
}
