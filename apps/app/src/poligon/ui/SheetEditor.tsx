// T12 — Sheet muharrir (yangi yadroda). ASOS: 54§3 T12 gate (chiziqni sudrash; L11 sudrash paytida
// QONUNIY oraliq; L5a hech nimani tugatmagan chiziq XIRA; gesture bilan noqonuniy holatga yetib bo'lmaydi;
// sudrash JIMGINA clamp qilmaydi). Faqat §2 API (poligon/index.ts) orqali — model/ ichiga tegmaydi.
import { useRef, useState } from "react";
import { apply, getThickness, derive } from "../index.ts";
import type { Sheet, Profile, LineId, Thickness, Refusal } from "../index.ts";
import { enumerateSegments, enclosedCells, sheetExtent, makeView, PAL, ROLE_COLOR } from "./view.ts";
import { legalMoveRange } from "./legal.ts";

interface Props {
  sheet: Sheet;
  profile: Profile;
  selLine: LineId | null;
  onSelectLine: (id: LineId | null) => void;
  onSheet: (s: Sheet) => void;
  onRefusals: (r: Refusal[]) => void;
}

const W = 680, H = 520;
const CYCLE: Record<Thickness, Thickness> = { 0: 16, 16: 32, 32: 0 };

export function SheetEditor({ sheet, profile, selLine, onSelectLine, onSheet, onRefusals }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ line: LineId; axis: "V" | "H"; min: number; max: number; pos: number } | null>(null);

  const ext = sheetExtent(sheet);
  const view = makeView(ext, W, H);
  const segs = enumerateSegments(sheet);
  const cells = enclosedCells(sheet); // ichki bo'shliqlar (shading uchun; o'lchamга tegmaydi)
  const parts = derive(sheet, profile).parts; // A4: junction-aware finished extent (burchaklar yopiladi)
  const committedPos = (id: LineId): number => {
    const ln = sheet.vLines.find((l) => l.id === id) ?? sheet.hLines.find((l) => l.id === id);
    return ln ? ln.pos : 0;
  };

  // L5a: chiziq biror segmentда taxtaga egami (tugatadimi)?
  const hasBoard = (id: LineId, axis: "V" | "H"): boolean => {
    const perp = axis === "V" ? sheet.hLines : sheet.vLines;
    for (let i = 0; i + 1 < perp.length; i++) if (getThickness(sheet, id, perp[i]!.id, perp[i + 1]!.id) !== 0) return true;
    return false;
  };

  const roleColor = (id: LineId): string => {
    const r = profile.roles[id];
    return r ? ROLE_COLOR[r] : PAL.dim;
  };

  // MUHARRIR affordance: taxta ekranда kamida MINPX px ko'rinsin — 16mm ~3px "chiziqli" ko'rinmasin,
  // to'liq 2D panel bo'lsin. Bu FAQAT muharrir; Parts (T15) true-scale saqlaydi.
  const MINPX = 4;

  // ── qalinlik tsikli (setThickness, L0 commit) ──────────────────────────────
  const cycleSeg = (line: LineId, lo: LineId, hi: LineId, t: Thickness): void => {
    const res = apply(sheet, { kind: "setThickness", line, lo, hi, t: CYCLE[t] });
    if (res.ok) { onSheet(res.sheet); onRefusals([]); }
    else onRefusals(res.refusals); // jimgina yutilmaydi — rad ko'rsatiladi
  };

  // ── chiziq sudrash (moveLine, L11 oraliq) ──────────────────────────────────
  const startDrag = (line: LineId, axis: "V" | "H", e: React.PointerEvent): void => {
    e.stopPropagation();
    const range = legalMoveRange(sheet, line);
    if (!range) return;
    onSelectLine(line);
    const ln = (axis === "V" ? sheet.vLines : sheet.hLines).find((l) => l.id === line)!;
    setDrag({ line, axis, min: range.min, max: range.max, pos: ln.pos });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent): void => {
    if (!drag || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const raw = drag.axis === "V" ? view.inv.x(e.clientX - r.left) : view.inv.y(e.clientY - r.top);
    const clamped = Math.max(drag.min, Math.min(drag.max, Math.round(raw))); // ko'rinishда chegara BAND bilan ko'rinadi
    setDrag({ ...drag, pos: clamped });
  };
  const endDrag = (): void => {
    if (!drag) return;
    const res = apply(sheet, { kind: "moveLine", line: drag.line, pos: drag.pos });
    if (res.ok) { onSheet(res.sheet); onRefusals([]); }
    else onRefusals(res.refusals);
    setDrag(null);
  };

  // sudrash paytida chiziq pozitsiyasini preview bilan almashtiramiz
  const linePos = (id: LineId, base: number): number => (drag && drag.line === id ? drag.pos : base);

  return (
    <div style={{ background: PAL.panel, borderRadius: 12, padding: 12 }}>
      <svg
        ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ touchAction: "none", display: "block", background: PAL.bg, borderRadius: 8 }}
        onPointerMove={moveDrag} onPointerUp={endDrag} onPointerLeave={endDrag}
        onClick={() => onSelectLine(null)}
      >
        {/* mebel ICHKI bo'shliqlari — shading (to'liq 2D ko'rinish; o'lchamга tegmaydi, 48§5) */}
        {cells.map((c, i) => (
          <rect key={"cell" + i} x={view.sx(c.x0)} y={view.sy(c.y1)}
            width={view.sx(c.x1) - view.sx(c.x0)} height={view.sy(c.y0) - view.sy(c.y1)}
            fill="#2a2318" opacity={0.85} />
        ))}

        {/* L11: sudrash paytida qonuniy oraliq BAND sifatida ko'rinadi */}
        {drag && (drag.axis === "V"
          ? <rect x={view.sx(drag.min)} y={view.pad} width={view.sx(drag.max) - view.sx(drag.min)} height={H - 2 * view.pad} fill={PAL.ok} opacity={0.12} />
          : <rect x={view.pad} y={view.sy(drag.max)} width={W - 2 * view.pad} height={view.sy(drag.min) - view.sy(drag.max)} fill={PAL.ok} opacity={0.12} />
        )}

        {/* taxtalar (RUN, junction-aware FINISHED extent — A4: burchaklar yopiladi, uzunlik to'g'ri) */}
        {parts.map((p, i) => {
          const b = p.board;
          const half = Math.max(view.scale * b.thickness / 2, MINPX / 2);
          let x0: number, x1: number, y0: number, y1: number;
          if (b.axis === "V") { const cx = view.sx(committedPos(b.line)); x0 = cx - half; x1 = cx + half; y0 = view.sy(p.finishedTo); y1 = view.sy(p.finishedFrom); }
          else { const cy = view.sy(committedPos(b.line)); y0 = cy - half; y1 = cy + half; x0 = view.sx(p.finishedFrom); x1 = view.sx(p.finishedTo); }
          return (
            <rect key={"board" + i} x={Math.min(x0, x1)} y={Math.min(y0, y1)}
              width={Math.abs(x1 - x0)} height={Math.abs(y1 - y0)}
              fill={roleColor(b.line)} stroke={b.thickness === 32 ? PAL.accent : "#00000066"} strokeWidth={b.thickness === 32 ? 2 : 1} />
          );
        })}

        {/* ko'rinmas bosish-zonasi: har segment ustida (qalinlik 0→16→32 tsikli) */}
        {segs.map((s, i) => {
          const half = Math.max(view.scale * s.t / 2, 6);
          let x0: number, x1: number, y0: number, y1: number;
          if (s.axis === "V") { const cx = view.sx(committedPos(s.line)); x0 = cx - half; x1 = cx + half; y0 = view.sy(committedPos(s.hi)); y1 = view.sy(committedPos(s.lo)); }
          else { const cy = view.sy(committedPos(s.line)); y0 = cy - half; y1 = cy + half; x0 = view.sx(committedPos(s.lo)); x1 = view.sx(committedPos(s.hi)); }
          return (
            <rect key={"hit" + i} x={Math.min(x0, x1)} y={Math.min(y0, y1)} width={Math.abs(x1 - x0)} height={Math.abs(y1 - y0)}
              fill="transparent" onClick={(e) => { e.stopPropagation(); cycleSeg(s.line, s.lo, s.hi, s.t); }} style={{ cursor: "pointer" }}>
              <title>{`qalinlik ${s.t} → bosilsa ${CYCLE[s.t]} (48 L0)`}</title>
            </rect>
          );
        })}

        {/* chiziq handle'lari — ko'rinmas keng ushlash zonasi + nozik ko'rsatkich; L5a xira; tanlangan = oltin */}
        {[...sheet.vLines.map((l) => ({ ...l, axis: "V" as const })), ...sheet.hLines.map((l) => ({ ...l, axis: "H" as const }))].map((l) => {
          const dim = !hasBoard(l.id, l.axis); // L5a — hech nimani tutmaydi
          const sel = selLine === l.id;
          const p = linePos(l.id, l.pos);
          // ko'rinadigan ko'rsatkich: tanlangan=oltin qalin, xira=nozik kulrang guide, aks holda deyarli ko'rinmas
          const stroke = sel ? PAL.accent : dim ? PAL.line : "#efe8da";
          const wVisible = sel ? 3 : dim ? 1 : 0.75;
          const opacity = sel ? 1 : dim ? 0.4 : 0.25;
          const A = l.axis === "V"
            ? { x1: view.sx(p), y1: view.pad, x2: view.sx(p), y2: H - view.pad }
            : { x1: view.pad, y1: view.sy(p), x2: W - view.pad, y2: view.sy(p) };
          return (
            <g key={l.id} onPointerDown={(e) => startDrag(l.id, l.axis, e)} style={{ cursor: "grab" }}>
              <line {...A} stroke="transparent" strokeWidth={14} />{/* ushlash zonasi */}
              <line {...A} stroke={stroke} strokeWidth={wVisible} opacity={opacity} strokeDasharray={dim ? "4 4" : undefined} />
            </g>
          );
        })}

        {/* umumiy o'lcham yozuvlari (en × balandlik) — 48§5 haqiqiy o'lcham */}
        {!drag && (
          <g fontFamily="monospace" fontSize={11} fill={PAL.dim}>
            <text x={(view.sx(ext.minX) + view.sx(ext.maxX)) / 2} y={H - view.pad + 20} textAnchor="middle">{ext.maxX - ext.minX} mm</text>
            <text x={view.pad - 12} y={(view.sy(ext.minY) + view.sy(ext.maxY)) / 2} textAnchor="middle" transform={`rotate(-90 ${view.pad - 12} ${(view.sy(ext.minY) + view.sy(ext.maxY)) / 2})`}>{ext.maxY - ext.minY} mm</text>
          </g>
        )}

        {/* sudrash paytida joriy pozitsiya (mm) — clamp ko'rinadi, jimgina emas */}
        {drag && (
          <text x={drag.axis === "V" ? view.sx(drag.pos) + 6 : view.pad + 6} y={drag.axis === "V" ? view.pad + 16 : view.sy(drag.pos) - 6}
            fill={PAL.ok} fontSize={13} fontFamily="monospace">{drag.pos}mm ∈ [{drag.min}, {drag.max}]</text>
        )}
      </svg>
      <div style={{ color: PAL.dim, fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
        Chiziqni <b style={{ color: PAL.ink }}>sudra</b> → yashil band = L11 qonuniy oraliq (hech qachon jimgina clamp emas).
        Segmentni <b style={{ color: PAL.ink }}>bos</b> → qalinlik 0→16→32 (oltin = 32, modul chegarasi). Xira chiziq = L5a (hech nimani tutmaydi).
      </div>
    </div>
  );
}
