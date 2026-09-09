// Poligon UI qobig'i — yangi "Sheet" yadrosi ustidagi ko'rinish (T12–T15). grid.ts ilovasiga TEGMAYDI
// (alohida poligon.html sahifasi, 54§1). Barcha mantiq §2 API (poligon/index.ts) orqali.
import { useMemo, useState } from "react";
import type { LineId, Refusal, Sheet } from "../index.ts";
import { seedWall, SAMPLE_THINGS } from "./seed.ts";
import { PAL } from "./view.ts";
import { SheetEditor } from "./SheetEditor.tsx";
import { Inspector } from "./Inspector.tsx";
import { GeneratedSettings } from "./GeneratedSettings.tsx";
import { PartsView } from "./PartsView.tsx";

type Tab = "editor" | "inspector" | "settings" | "parts";
const TABS: { id: Tab; label: string; task: string }[] = [
  { id: "editor", label: "Muharrir", task: "T12" },
  { id: "inspector", label: "Inspektor", task: "T13" },
  { id: "settings", label: "Sozlamalar", task: "T14" },
  { id: "parts", label: "Parts", task: "T15" },
];

export function PoligonApp() {
  const seed = useMemo(() => seedWall(), []);
  const [sheet, setSheet] = useState<Sheet>(seed.sheet);
  const [tab, setTab] = useState<Tab>("editor");
  const [selLine, setSelLine] = useState<LineId | null>(null);
  const [refusals, setRefusals] = useState<Refusal[]>([]);
  const profile = seed.profile;

  return (
    <div style={{ position: "fixed", inset: 0, background: PAL.bg, color: PAL.ink, fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "auto" }}>
      {/* sarlavha */}
      <header style={{ padding: "14px 20px", borderBottom: `1px solid ${PAL.line}`, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Poligon</div>
        <div style={{ fontSize: 12, color: PAL.dim }}>yangi Sheet-yadro ustida · grid.ts tegilmaydi (54§1)</div>
      </header>

      {/* tablar */}
      <nav style={{ display: "flex", gap: 4, padding: "10px 20px 0" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? PAL.panel : "transparent", color: tab === t.id ? PAL.ink : PAL.dim,
              border: "none", borderRadius: "8px 8px 0 0", padding: "9px 16px", cursor: "pointer", fontSize: 14, fontWeight: 500,
            }}>
            {t.label} <span style={{ fontSize: 10, color: PAL.accent }}>{t.task}</span>
          </button>
        ))}
      </nav>

      {/* mazmun */}
      <main style={{ padding: 16, flex: 1 }}>
        {tab === "editor" && <SheetEditor sheet={sheet} profile={profile} selLine={selLine} onSelectLine={setSelLine} onSheet={setSheet} onRefusals={setRefusals} />}
        {tab === "inspector" && <Inspector sheet={sheet} profile={profile} />}
        {tab === "settings" && <GeneratedSettings things={SAMPLE_THINGS} />}
        {tab === "parts" && <PartsView sheet={sheet} profile={profile} />}
      </main>

      {/* rad-toast (L0/L11: jimgina yutilmaydi — qoida nomi bilan ko'rsatiladi) */}
      {refusals.length > 0 && (
        <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "#3a211e", border: `1px solid ${PAL.bad}`, borderRadius: 10, padding: "10px 16px", maxWidth: 520 }}>
          {refusals.map((r, i) => (
            <div key={i} style={{ fontSize: 13 }}>
              <b style={{ color: PAL.bad }}>{r.rule}</b> <span style={{ color: PAL.ink }}>{r.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
