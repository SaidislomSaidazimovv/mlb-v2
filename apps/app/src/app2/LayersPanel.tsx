// LayersPanel — the Слои tree (CONSTRUCTION_FRAME_v4 §15.2 + §15.3:346): the wall runs, the
// blocks in each, and — expandable — each block's PARTS (Деталь) with their per-edge jiyak
// (Кромка, 4 edges). Tap a block or a part to select it (the scene highlights it). The part
// rows + their kromka come from the SAME cut-list the export uses, so the names and the per-edge
// tape are the profile's truth — never invented. Отверстия/Операции (drilling) are founder-gated
// (F1, deferred) and deliberately NOT shown here.

import { useMemo, useState } from "react";
import type { Cabinet } from "../model/cabinet";
import { cabDepth } from "../model/bands";
import { production } from "../model/cncExport";
import { fmtLen, lenUnitLabel, type LenUnit } from "../model/units";

interface Props {
  cabs: Cabinet[];
  selIds: string[];
  units: LenUnit;
  nameOf: (c: Cabinet) => string;
  runLabel: (run: number) => string;
  onSelect: (id: string) => void;
  onClose: () => void;
  title: string;
}

export function LayersPanel({ cabs, selIds, units, nameOf, runLabel, onSelect, onClose, title }: Props) {
  const real = cabs.filter((c) => c.appliance !== "filler");
  const runs = [...new Set(real.map((c) => c.run ?? 0))].sort((a, b) => a - b);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // §15.3:346 — Деталь rows come from the export cut-list (single-cabinet run), so part names +
  // per-edge kromka are the profile's truth. Computed only for EXPANDED blocks → the tree stays cheap.
  const partsByCab = useMemo(() => {
    const m: Record<string, { part: string; edge: string; lengthMm: number; widthMm: number }[]> = {};
    for (const c of real) {
      if (!expanded.has(c.id)) continue;
      m[c.id] = (production([c])?.panels ?? []).map((p) => ({ part: p.part, edge: p.edge, lengthMm: p.lengthMm, widthMm: p.widthMm }));
    }
    return m;
  }, [real, expanded]);

  return (
    <div className="layers-panel">
      <div className="layers-head">
        <span>{title}</span>
        <button className="layers-close" onClick={onClose} type="button" aria-label="✕">✕</button>
      </div>
      <div className="layers-body">
        {runs.length === 0 && <div className="layers-empty">—</div>}
        {runs.map((run) => (
          <div className="layers-run" key={run}>
            <div className="layers-run-head">{runLabel(run)}</div>
            {real
              .filter((c) => (c.run ?? 0) === run)
              .map((c) => {
                const open = expanded.has(c.id);
                const parts = partsByCab[c.id] ?? [];
                return (
                  <div className="layers-block" key={c.id}>
                    <div className={`layers-rowline${selIds.includes(c.id) ? " on" : ""}`}>
                      <button className="layers-expand" onClick={() => toggle(c.id)} type="button" aria-label={open ? "Свернуть" : "Развернуть"}>
                        {open ? "▾" : "▸"}
                      </button>
                      <button className="layers-row" onClick={() => onSelect(c.id)} type="button">
                        <span className="layers-row-name">{nameOf(c)}</span>
                        <span className="layers-row-dim">
                          {fmtLen(c.w, units)}×{fmtLen(c.h, units)}×{fmtLen(cabDepth(c), units)} {lenUnitLabel(units)}
                        </span>
                      </button>
                    </div>
                    {open && (
                      <div className="layers-parts">
                        {parts.length === 0 && <div className="layers-empty">—</div>}
                        {parts.map((p, i) => (
                          <button className="layers-part" key={i} onClick={() => onSelect(c.id)} type="button">
                            <span className="layers-part-top">
                              <span className="layers-part-name">{p.part}</span>
                              <span className="layers-part-dim">
                                {fmtLen(p.lengthMm, units)}×{fmtLen(p.widthMm, units)}
                              </span>
                            </span>
                            <span className="layers-part-kromka">Кромка: {p.edge}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
