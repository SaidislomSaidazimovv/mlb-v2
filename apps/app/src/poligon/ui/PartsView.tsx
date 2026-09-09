// T15 — Parts ekrani. ASOS: 54§3 T15 gate (chizma + jadval ikki tomonlama tanlash; HAQIQIY masshtab,
// minimal chiziq qalinligi YO'Q; kromka vektori kesim to'rtburchagi TASHQARISIDA; o'chirish = segment
// tahriri, hech qachon delete emas — 53§3). §2 API: derive → release. Elevatsiya ko'rinishi (2D model).
import { useState } from "react";
import { derive, release, bandingFromExposure } from "../index.ts";
import type { Sheet, Profile, InputPart, Banding, EdgeExposure } from "../index.ts";
import { sheetExtent, makeView, PAL, ROLE_COLOR } from "./view.ts";

const W = 560, H = 520;

/** B9/50§1: kromka edge_exposure'dan (exposed 2mm, hidden 0) — rol bo'yicha SOXTA emas. */
function bandingFor(ee: EdgeExposure | undefined): Banding {
  if (!ee) return { top: 0, bottom: 0, left: 0, right: 0 };
  return bandingFromExposure(ee);
}

export function PartsView({ sheet, profile }: { sheet: Sheet; profile: Profile }) {
  const d = derive(sheet, profile);
  const ext = sheetExtent(sheet);
  const view = makeView(ext, W, H);
  const [sel, setSel] = useState<number | null>(null);

  // derive → release: raqamlangan, o'zgarmas kesim ro'yxati (53§2). boundingLines = identity.
  // 53§1: panel = uzunlik × chuqurlik (masalan side 720 × 560); qalinlik alohida. depth yo'q bo'lsa (profil
  // rules bermagan) — chuqurlik o'rniga "—" (jimgina taxmin YO'Q).
  const inputs: InputPart[] = d.parts.map((p) => ({
    role: p.role,
    boundingLines: [p.board.line, `${p.board.from}`, `${p.board.to}`],
    finishedW: p.finishedLength,         // A4: junction-aware uzunlik
    finishedH: p.depth ?? 0,             // B1/48§4: cascade chuqurlik (0 = berilmagan)
    thickness: p.board.thickness,
    banding: bandingFor(p.tier3.edge_exposure as EdgeExposure | undefined),
    grain: p.board.axis === "V" ? "L" : "W",
  }));
  const rel = release(inputs, { subtractBanding: true }); // band-then-trim (53§1)

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${W + 24}px 1fr`, gap: 12 }}>
      {/* CHIZMA — haqiqiy masshtab, minimal stroke yo'q (true-scale) */}
      <div style={{ background: PAL.panel, borderRadius: 10, padding: 12 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: PAL.bg, borderRadius: 8, display: "block" }}>
          {d.parts.map((p, i) => {
            const b = p.board;
            const t = b.thickness;
            // elevatsiya: V taxta = tik (pos±t/2 × finished uzunlik); H = yotiq. A4: finished extent (burchak yopiladi)
            const X0 = b.axis === "V" ? view.sx(lineX(sheet, b.line) - t / 2) : view.sx(p.finishedFrom);
            const X1 = b.axis === "V" ? view.sx(lineX(sheet, b.line) + t / 2) : view.sx(p.finishedTo);
            const Y0 = b.axis === "V" ? view.sy(p.finishedTo) : view.sy(lineY(sheet, b.line) + t / 2);
            const Y1 = b.axis === "V" ? view.sy(p.finishedFrom) : view.sy(lineY(sheet, b.line) - t / 2);
            const band = bandingFor(p.tier3.edge_exposure as EdgeExposure | undefined);
            const selHere = sel === i;
            return (
              <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
                <rect x={Math.min(X0, X1)} y={Math.min(Y0, Y1)} width={Math.abs(X1 - X0)} height={Math.abs(Y1 - Y0)}
                  fill={p.role === "unknown" ? PAL.dim : ROLE_COLOR[p.role]}
                  stroke={selHere ? PAL.accent : PAL.line} strokeWidth={selHere ? 2 : 0.5} />
                {/* kromka — kesim to'rtburchagi TASHQARISIDA (53§3), ko'rinadigan qirrada */}
                {band.left > 0 && <line x1={Math.min(X0, X1) - 2} y1={Math.min(Y0, Y1)} x2={Math.min(X0, X1) - 2} y2={Math.max(Y0, Y1)} stroke={PAL.accent} strokeWidth={1.5} />}
              </g>
            );
          })}
        </svg>
        <div style={{ color: PAL.dim, fontSize: 11, marginTop: 8 }}>
          Haqiqiy masshtab · oltin chiziq = kromka (kesim to'rtburchagi tashqarisida, 53§3) · o'chirish = segmentни 0 qilish (muharrirда), hech qachon delete emas.
        </div>
      </div>

      {/* JADVAL — ikki tomonlama tanlash */}
      <div style={{ background: PAL.panel, borderRadius: 10, padding: 8, maxHeight: H + 24, overflowY: "auto" }}>
        <div style={{ color: PAL.dim, fontSize: 11, padding: "4px 6px" }}>KESIM RO'YXATI · Release #{rel.number} ({rel.parts.length})</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: PAL.dim, textAlign: "left" }}>
              <th style={{ padding: "4px 6px" }}>#</th><th>rol</th><th>uzunlik×chuqurlik</th><th>qal.</th><th>tola</th>
            </tr>
          </thead>
          <tbody>
            {rel.parts.map((rp, i) => (
              <tr key={rp.id} onClick={() => setSel(i)}
                style={{ background: sel === i ? PAL.line : "transparent", cursor: "pointer", color: PAL.ink }}>
                <td style={{ padding: "5px 6px", fontFamily: "monospace", color: PAL.accent }}>{rp.num}</td>
                <td>{d.parts[i]?.role}</td>
                <td style={{ fontFamily: "monospace" }}>{rp.cutW}×{rp.cutH > 0 ? rp.cutH : "—"}</td>
                <td style={{ fontFamily: "monospace", color: PAL.dim }}>{rp.thickness ?? "—"}</td>
                <td>{rp.grain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// chiziq pozitsiyasi (elevatsiya koordinatasi uchun)
function lineX(sheet: Sheet, id: string): number {
  return sheet.vLines.find((l) => l.id === id)?.pos ?? sheet.hLines.find((l) => l.id === id)?.pos ?? 0;
}
function lineY(sheet: Sheet, id: string): number {
  return sheet.hLines.find((l) => l.id === id)?.pos ?? 0;
}
