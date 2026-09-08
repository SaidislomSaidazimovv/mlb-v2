import { useState } from "react";
import { App2Materials } from "./App2Materials";
import { App2Uzly } from "./App2Uzly";
import { App2Library } from "./App2Library";
import { App2Kromka } from "./App2Kromka";
import { KROMKA } from "../model/cncExport";

// v9 «Разделы» slide-over — the ≡ menu's sections (CF4 §15.2): Материалы · Кромка · Правила · Библиотеки,
// under one glass shell (v9.html §sects). Материалы is the v18 design (App2Materials); Правила · Узлы is the
// interactive joint-rules screen (App2Uzly) — the POSYLKA 2026-08-13 joints module supplied the factory
// numbers the old stub was waiting on, so it is now a real editor (with visuals), not a note.

const TABS = [
  { k: "materials", label: "Материалы" },
  { k: "kromka", label: "Кромка · Jiyak" },
  { k: "rules", label: "Правила · Узлы" },
  { k: "libs", label: "Библиотеки" },
] as const;

export function App2Sections({ onClose, initialTab = "materials", onToast }: { onClose: () => void; initialTab?: string; onToast?: (m: string) => void }) {
  const [tab, setTab] = useState<string>(initialTab);
  return (
    <div className="a2-sects">
      <div className="a2-shead">
        <div className="a2-sr1">
          <button type="button" className="a2-sclose" onClick={onClose} aria-label="Закрыть">✕</button>
          <h2>{TABS.find((t) => t.k === tab)?.label}</h2>
        </div>
        <div className="a2-stabs">
          {TABS.map((t) => (<b key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>{t.label}</b>))}
        </div>
      </div>
      <div className="a2-sbody">
        {tab === "materials" && <App2Materials />}
        {tab === "kromka" && (
          <div className="a2-krm">
            <div className="a2-krm-row"><span className="a2-krm-k" style={{ background: "#e2483d" }}>K1</span><div><b>{KROMKA.k1Mm}мм</b> · ПВХ · <span className="a2-krm-dim">видимые кромки</span></div></div>
            <div className="a2-krm-row"><span className="a2-krm-k" style={{ background: "#18a999" }}>K2</span><div><b>{KROMKA.k2Mm}мм</b> · <span className="a2-krm-dim">скрытые кромки</span></div></div>
            <App2Kromka />
          </div>
        )}
        {tab === "rules" && <App2Uzly />}
        {tab === "libs" && <App2Library onClose={onClose} onToast={onToast} />}
      </div>
    </div>
  );
}
