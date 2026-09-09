// T12 — Sheet muharrir (yangi yadroda). ASOS: 54§3 T12 gate (chiziqni sudrash; L11 sudrash paytida
// QONUNIY oraliq; L5a hech nimani tugatmagan chiziq XIRA; gesture bilan noqonuniy holatga yetib bo'lmaydi;
// sudrash JIMGINA clamp qilmaydi). Faqat §2 API (poligon/index.ts) orqali — model/ ichiga tegmaydi.
import { useRef, useState } from "react";
import { apply, getThickness } from "../index.ts";
import type { Sheet, Profile, LineId, Thickness, Refusal } from "../index.ts";
import { enumerateSegments, sheetExtent, makeView, PAL, ROLE_COLOR } from "./view.ts";
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
        {/* L11: sudrash paytida qonuniy oraliq BAND sifatida ko'rinadi */}
        {drag && (drag.axis === "V"
          ? <rect x={view.sx(drag.min)} y={view.pad} width={view.sx(drag.max) - view.sx(drag.min)} height={H - 2 * view.pad} fill={PAL.ok} opacity={0.12} />
          : <rect x={view.pad} y={view.sy(drag.max)} width={W - 2 * view.pad} height={view.sy(drag.min) - view.sy(drag.max)} fill={PAL.ok} opacity={0.12} />
        )}

        {/* segmentlar (taxtalar) — rol rangida */}
        {segs.map((s, i) => {
          const x0 = view.sx(s.axis === "V" ? linePos(s.line, s.x0 + s.t / 2) - s.t / 2 : s.x0);
          const x1 = view.sx(s.axis === "V" ? linePos(s.line, s.x1 - s.t / 2) + s.t / 2 : s.x1);
          const y0 = view.sy(s.axis === "H" ? linePos(s.line, s.y1 - s.t / 2) + s.t / 2 : s.y1);
          const y1 = view.sy(s.axis === "H" ? linePos(s.line, s.y0 + s.t / 2) - s.t / 2 : s.y0);
          return (
            <rect key={"seg" + i} x={Math.min(x0, x1)} y={Math.min(y0, y1)}
              width={Math.abs(x1 - x0)} height={Math.abs(y1 - y0)}
              fill={roleColor(s.line)} stroke={s.t === 32 ? PAL.accent : PAL.line} strokeWidth={s.t === 32 ? 1.5 : 0.5}
              onClick={(e) => { e.stopPropagation(); cycleSeg(s.line, s.lo, s.hi, s.t); }}
              style={{ cursor: "pointer" }}
            >
              <title>{`qalinlik ${s.t} → bosilsa ${CYCLE[s.t]} (48 L0)`}</title>
            </rect>
          );
        })}

        {/* chiziq handle'lari — sudraladi; L5a xira */}
        {[...sheet.vLines.map((l) => ({ ...l, axis: "V" as const })), ...sheet.hLines.map((l) => ({ ...l, axis: "H" as const }))].map((l) => {
          const dim = !hasBoard(l.id, l.axis); // L5a
          const sel = selLine === l.id;
          const p = linePos(l.id, l.pos);
          const common = { stroke: sel ? PAL.accent : (dim ? PAL.line : PAL.ink), strokeWidth: sel ? 3 : 1.5, opacity: dim ? 0.35 : 1, style: { cursor: "grab" as const } };
          return l.axis === "V"
            ? <line key={l.id} x1={view.sx(p)} y1={view.pad} x2={view.sx(p)} y2={H - view.pad} {...common} onPointerDown={(e) => startDrag(l.id, "V", e)} />
            : <line key={l.id} x1={view.pad} y1={view.sy(p)} x2={W - view.pad} y2={view.sy(p)} {...common} onPointerDown={(e) => startDrag(l.id, "H", e)} />;
        })}

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
