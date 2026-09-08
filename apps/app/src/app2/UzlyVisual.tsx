// The 14 joint schematics, keyed by `Setting.visual` (POSYLKA 2026-08-13 §2). LIVE (v9 `renderSectRules`
// inspiration, better): the drawing reacts to the CURRENT value — a setback's row slides, an offset's
// cam moves, the dimension label shows the live number, a toggle dims the grid, a row-mode drops/pairs
// the rows. Nothing invented: geometry + the number come from the setting's value/choice/bool.

import type { ReactNode } from "react";

const AC = "#00AC7A"; // app accent — the MEASURED feature / dimension
const HOLE = 3.2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 132 96" className="a2uz-svg" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  );
}
function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={AC} strokeWidth={1} />
      <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} stroke={AC} strokeWidth={1} />
      <line x1={x2} y1={y - 3} x2={x2} y2={y + 3} stroke={AC} strokeWidth={1} />
      <text x={(x1 + x2) / 2} y={y - 4} fill={AC} stroke="none" fontSize={9} textAnchor="middle">{label}</text>
    </>
  );
}
function DimV({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  return (
    <>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={AC} strokeWidth={1} />
      <line x1={x - 3} y1={y1} x2={x + 3} y2={y1} stroke={AC} strokeWidth={1} />
      <line x1={x - 3} y1={y2} x2={x + 3} y2={y2} stroke={AC} strokeWidth={1} />
      <text x={x + 5} y={(y1 + y2) / 2 + 3} fill={AC} stroke="none" fontSize={9}>{label}</text>
    </>
  );
}
const Hole = ({ cx, cy, r = HOLE, accent = false }: { cx: number; cy: number; r?: number; accent?: boolean }) => (
  <circle cx={cx} cy={cy} r={r} stroke={accent ? AC : "currentColor"} fill={accent ? AC : "none"} fillOpacity={accent ? 0.15 : 1} />
);

export interface VizProps { value?: number; choice?: string; bool?: boolean }

const VISUALS: Record<string, (p: VizProps) => ReactNode> = {
  // Стяжка корпуса — cam (Ø15 on the face) + dowel (Ø8 into the mating edge).
  joint_carcass_connector: () => (
    <Svg>
      <rect x="20" y="18" width="14" height="66" />
      <rect x="20" y="18" width="82" height="13" />
      <circle cx="27" cy="56" r="8.5" stroke={AC} />
      <Hole cx={27} cy={56} r={2.6} accent />
      <circle cx="66" cy="24.5" r="4" stroke={AC} />
      <text x="40" y="52" fill={AC} stroke="none" fontSize={9}>Ø15</text>
      <text x="58" y="44" fill={AC} stroke="none" fontSize={9}>Ø8</text>
    </Svg>
  ),
  // Отступ стяжки от торца — cam set back from the mating END edge (LIVE: cam slides + label).
  joint_connector_offset: ({ value = 34 }) => {
    const off = clamp(value * 0.55, 6, 44);
    const camX = 118 - off;
    return (
      <Svg>
        <rect x="14" y="34" width="104" height="34" />
        <line x1="118" y1="30" x2="118" y2="72" stroke="currentColor" strokeWidth={2} />
        <Hole cx={camX} cy={51} r={6} accent />
        <DimH x1={camX} x2={118} y={26} label={`${Math.round(value)}`} />
      </Svg>
    );
  },
  // Макс. шаг между стяжками — spacing cap (LIVE label).
  joint_connector_pitch: ({ value = 320 }) => (
    <Svg>
      <rect x="14" y="36" width="104" height="30" />
      <Hole cx={38} cy={51} r={5} accent />
      <Hole cx={94} cy={51} r={5} accent />
      <DimH x1={38} x2={94} y={28} label={`≤ ${Math.round(value)}`} />
    </Svg>
  ),
  // Система-32 — the grid ON/OFF (LIVE: dim when off).
  s32_grid_overview: ({ bool = true }) => (
    <Svg>
      <rect x="40" y="10" width="34" height="78" opacity={bool ? 1 : 0.4} />
      {[20, 32, 44, 56, 68, 80].map((y) => <circle key={y} cx={51} cy={y} r={HOLE} stroke={bool ? AC : "#bbb"} fill={bool ? AC : "none"} fillOpacity={bool ? 0.15 : 1} opacity={bool ? 1 : 0.5} />)}
      <text x="78" y="52" fill={bool ? AC : "#999"} stroke="none" fontSize={9}>{bool ? "Вкл" : "Выкл"}</text>
    </Svg>
  ),
  // Шаг сетки — 32mm between grid holes (LIVE: gap + label).
  s32_pitch: ({ value = 32 }) => {
    const gap = clamp(value * 0.7, 12, 34);
    const y0 = 48 - gap / 2;
    return (
      <Svg>
        <rect x="40" y="12" width="34" height="72" />
        <Hole cx={51} cy={y0} accent />
        <Hole cx={51} cy={y0 + gap} accent />
        <DimV x={70} y1={y0} y2={y0 + gap} label={`${Math.round(value)}`} />
      </Svg>
    );
  },
  // Начало сетки от торца — first grid hole from the panel END (LIVE: hole slides + label).
  s32_first_hole: ({ value = 37 }) => {
    const off = clamp(value * 0.5, 8, 40);
    return (
      <Svg>
        <rect x="30" y="14" width="34" height="72" />
        <line x1="26" y1="14" x2="68" y2="14" stroke="currentColor" strokeWidth={2} />
        <Hole cx={47} cy={14 + off} accent />
        <DimV x={70} y1={14} y2={14 + off} label={`${Math.round(value)}`} />
      </Svg>
    );
  },
  // Передний ряд от ПЕРЕДНЕЙ кромки — pin row set back from the front edge (LIVE: row slides + label).
  s32_front_row: ({ value = 65 }) => {
    const off = clamp(value * 0.32, 8, 46);
    const x = 16 + off;
    return (
      <Svg>
        <rect x="16" y="24" width="100" height="48" />
        <text x="18" y="86" fill="currentColor" stroke="none" fontSize={8}>перёд</text>
        {[34, 48, 62].map((y) => <Hole key={y} cx={x} cy={y} accent />)}
        <DimH x1={16} x2={x} y={20} label={`${Math.round(value)}`} />
      </Svg>
    );
  },
  // Задний ряд от ЗАДНЕЙ кромки — pin row set back from the back edge (LIVE: row slides + label).
  s32_back_row: ({ value = 65 }) => {
    const off = clamp(value * 0.32, 8, 46);
    const x = 116 - off;
    return (
      <Svg>
        <rect x="16" y="24" width="100" height="48" />
        <text x="96" y="86" fill="currentColor" stroke="none" fontSize={8}>зад</text>
        {[34, 48, 62].map((y) => <Hole key={y} cx={x} cy={y} accent />)}
        <DimH x1={x} x2={116} y={20} label={`${Math.round(value)}`} />
      </Svg>
    );
  },
  // Схема рядов — front+back / front-only / paired-32 (LIVE: reflects the choice).
  s32_row_mode: ({ choice = "front_and_back" }) => {
    const front = [32, 48, 64].map((y) => <Hole key={`f${y}`} cx={40} cy={y} accent />);
    const back = [32, 48, 64].map((y) => <Hole key={`b${y}`} cx={92} cy={y} accent />);
    const pairedFront = [32, 48, 64].flatMap((y) => [<Hole key={`p1${y}`} cx={36} cy={y} accent />, <Hole key={`p2${y}`} cx={46} cy={y} accent />]);
    return (
      <Svg>
        <rect x="16" y="22" width="100" height="52" />
        {choice === "paired_32" ? pairedFront : front}
        {choice === "front_and_back" ? back : null}
        <text x="30" y="88" fill={AC} stroke="none" fontSize={8}>
          {choice === "front_only" ? "1 ряд" : choice === "paired_32" ? "парами · 32" : "2 ряда"}
        </text>
      </Svg>
    );
  },
  // Опора полки — Ø5 pin the shelf rests on.
  shelf_support_types: ({ choice = "pin" }) => (
    <Svg>
      <rect x="18" y="16" width="12" height="64" />
      <rect x="30" y="44" width="80" height="10" />
      <line x1="30" y1="49" x2="24" y2="49" stroke={AC} strokeWidth={2} />
      <Hole cx={24} cy={49} r={2.4} accent />
      <text x="40" y="38" fill={AC} stroke="none" fontSize={9}>
        {choice === "fixed" ? "жёстко" : choice === "rafix" ? "rafix" : "Ø5 пин"}
      </text>
    </Svg>
  ),
  // Чашка петли от края двери — Ø35 cup from the door END (LIVE: cup slides + label).
  hinge_end_offset: ({ value = 100 }) => {
    const off = clamp(value * 0.28, 12, 46);
    return (
      <Svg>
        <rect x="30" y="12" width="40" height="76" />
        <line x1="30" y1="12" x2="70" y2="12" stroke="currentColor" strokeWidth={2} />
        <circle cx="50" cy={12 + off} r="9" stroke={AC} />
        <text x="72" y={15 + off} fill={AC} stroke="none" fontSize={9}>Ø35</text>
        <DimV x={22} y1={12} y2={12 + off} label={`${Math.round(value)}`} />
      </Svg>
    );
  },
  // Доп. петля каждые — hinge count ladder (LIVE label).
  hinge_count_ladder: ({ value = 600 }) => (
    <Svg>
      <rect x="42" y="8" width="30" height="82" />
      {[20, 49, 78].map((y) => <circle key={y} cx="49" cy={y} r="6" stroke={AC} />)}
      <DimV x={78} y1={20} y2={49} label={`${Math.round(value)}`} />
    </Svg>
  ),
  // Система ящиков — a drawer box on its side slide.
  drawer_system_compare: () => (
    <Svg>
      <rect x="20" y="26" width="92" height="46" />
      <rect x="20" y="60" width="92" height="8" stroke={AC} />
      <line x1="24" y1="64" x2="108" y2="64" stroke={AC} strokeWidth={1} />
      <text x="26" y="22" fill="currentColor" stroke="none" fontSize={8}>ящик + направляющая</text>
    </Svg>
  ),
  // Зазор ящика на сторону — the gap each side (LIVE label).
  drawer_side_clearance: ({ value = 12.5 }) => (
    <Svg>
      <rect x="14" y="18" width="104" height="60" />
      <rect x="30" y="24" width="72" height="48" stroke={AC} />
      <DimH x1={14} x2={30} y={90} label={`${value}`} />
      <DimH x1={102} x2={118} y={90} label={`${value}`} />
    </Svg>
  ),
};

export function UzlyVisual({ visual, value, choice, bool }: { visual: string } & VizProps) {
  const draw = VISUALS[visual];
  if (!draw) return <Svg><rect x="40" y="30" width="52" height="36" strokeDasharray="4 3" /></Svg>;
  return <>{draw({ value, choice, bool })}</>;
}
