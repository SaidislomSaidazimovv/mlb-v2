import { useState } from "react";
import { useStore } from "../store";
import { EMAN_MATERIALS, emanMatType, hexToInt, matPriceLabel, type EmanMaterial, type MaterialSlotKey } from "../model/materials";
import { suggestForUI } from "../model/materialAdvisor";
import type { FinishKey } from "../model/cabinet";

// Материалы section — the v18 «2 цвета · быстрые имена» design, now WIRED to the real material model
// (founder #2, 2026-08-11): picking a material here is the SAME action the constructor picker runs
// (ConfigScreen:1600) — it sets the run-wide `runMaterials` slot (→ the смета / price via pickMaterials)
// AND repaints every cabinet through `applyFinishToAll` (→ the 3D). So «change colour = a different
// material», and the menu reflects the current selection (a green ✓ on the chosen SKU per role).
//
// Data is the app's real 16-SKU EMAN catalog (`EMAN_MATERIALS`), grouped by `part` into the four roles.
// The per-SKU catalog PRICE (variant B) still waits on the founder pack (F3); the quote follows the
// picked material's TYPE (emanMatType) meanwhile — unchanged.

const ROLES = [
  { k: "A", nm: "Фасад", glyph: "#3068ed", part: "facade" as MaterialSlotKey },
  { k: "B", nm: "Корпус", glyph: "#d9822b", part: "carcass" as MaterialSlotKey },
  { k: "C", nm: "Задняя", glyph: "#9a6fe0", part: "back" as MaterialSlotKey },
  { k: "W", nm: "Столешн.", glyph: "#5b6470", part: "worktop" as MaterialSlotKey },
] as const;

const TYPE_LABEL: Record<string, string> = { LDSP: "ЛДСП", MDF: "МДФ", HDF: "ХДФ", solid: "Камень", GLASS: "Стекло" };

// which parts carry a render finish colour (back is a hidden panel — no colour, only a priced SKU)
const FINISH_PARTS = new Set<string>(["facade", "carcass", "worktop"]);

function shade(hex: string, p: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + p));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + p));
  const b = Math.max(0, Math.min(255, (n & 255) + p));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// the render decor a SKU reads as — wood grain / stone speckle / flat — from its texture key + type
function texKind(m: EmanMaterial): "wood" | "stone" | "flat" {
  if (m.tex && m.tex.startsWith("wood")) return "wood";
  if (emanMatType(m) === "solid") return "stone";
  return "flat";
}

// texture tile — the render decor, drawn big so wood/stone reads (ported from v18 texFull)
function Tex({ color, tex }: { color: string; tex: string }) {
  if (tex === "wood") {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <rect width="100" height="100" fill={color} />
        <g stroke={shade(color, -16)} strokeWidth={2} fill="none" opacity={0.65}>
          <path d="M0 14 Q50 7 100 16" /><path d="M0 34 Q50 27 100 36" /><path d="M0 54 Q50 47 100 56" /><path d="M0 74 Q50 67 100 76" /><path d="M0 92 Q50 85 100 94" />
        </g>
      </svg>
    );
  }
  if (tex === "stone") {
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <rect width="100" height="100" fill={color} />
        <g fill={shade(color, -14)} opacity={0.65}>
          <circle cx="22" cy="30" r="3" /><circle cx="60" cy="18" r="2" /><circle cx="80" cy="46" r="3.2" /><circle cx="34" cy="64" r="2.4" /><circle cx="70" cy="78" r="2.8" /><circle cx="14" cy="82" r="1.9" /><circle cx="48" cy="42" r="1.6" />
        </g>
      </svg>
    );
  }
  return <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${shade(color, 7)}, ${shade(color, -7)})` }} />;
}

const GMODES = [{ k: "tabs", label: "Вкладки" }, { k: "sections", label: "Секции" }, { k: "accordion", label: "Гармошка" }] as const;

export function App2Materials() {
  const runMaterials = useStore((s) => s.runMaterials);
  const setRunMaterial = useStore((s) => s.setRunMaterial);
  const applyFinishToAll = useStore((s) => s.applyFinishToAll);

  const [gmode, setGmode] = useState<string>("tabs");
  const [roleFilter, setRoleFilter] = useState<string>("A");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [customHex, setCustomHex] = useState<Record<string, string>>({}); // per-role «свой цвет» → advisor

  const roleMats = (part: MaterialSlotKey) => EMAN_MATERIALS.filter((m) => m.part === part);

  // THE SYNC (founder #2): same effect as the constructor picker — run-wide slot (price) + repaint (3D).
  const pick = (m: EmanMaterial, slot: MaterialSlotKey) => {
    setRunMaterial(slot, m.id);
    if (FINISH_PARTS.has(slot)) applyFinishToAll({ [slot]: hexToInt(m.color) } as Partial<Record<FinishKey, number>>);
  };

  const allMats = ROLES.flatMap((r) => roleMats(r.part));
  const totalStock = allMats.reduce((a, m) => a + (m.stockSheets ?? 0), 0);
  const totalValue = allMats.reduce((a, m) => a + (m.stockSheets ?? 0) * m.price, 0) / 1e6;

  const Row = (m: EmanMaterial, role: (typeof ROLES)[number]) => {
    const on = runMaterials[role.part] === m.id;
    return (
      <div className="a2m-row" key={m.id} onClick={() => pick(m, role.part)}
        style={{ cursor: "pointer", borderRadius: 12, outline: on ? "2px solid #16a34a" : "none", outlineOffset: -1, background: on ? "rgba(22,163,74,0.06)" : undefined }}>
        <div className="a2m-tile"><Tex color={m.color} tex={texKind(m)} /></div>
        <div className="a2m-info">
          <div className="a2m-l1">
            <span className="a2m-qname" style={{ background: role.glyph, color: "#fff" }}>{m.code}</span>
            <span className="a2m-decor">{m.name}</span>
          </div>
          <div className="a2m-l2"><span className="a2m-type">{TYPE_LABEL[emanMatType(m)] ?? emanMatType(m)}</span><span className="a2m-dims">{m.sheetW}×{m.sheetH} · {m.thicknessMm}мм</span></div>
        </div>
        <div className={`a2m-stock${on ? "" : ""}`}>
          {on ? <b style={{ color: "#16a34a" }}>выбран&nbsp;✓</b> : <span style={{ fontSize: 11, color: "#64748b" }}>{matPriceLabel(m)}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="a2m">
      {/* grouping-panel switch */}
      <div className="a2m-segs">
        {GMODES.map((g) => (<b key={g.k} className={gmode === g.k ? "on" : ""} onClick={() => setGmode(g.k)}>{g.label}</b>))}
      </div>

      {gmode === "tabs" && (
        <>
          <div className="a2m-gtabs">
            {ROLES.map((r) => {
              const list = roleMats(r.part);
              return (
                <div key={r.k} className={`a2m-gt${roleFilter === r.k ? " on" : ""}`} onClick={() => setRoleFilter(r.k)}>
                  <span className="a2m-dots">{list.slice(0, 3).map((m) => (<i key={m.id} style={{ background: m.color }} />))}</span>
                  <span className="a2m-lb">{r.k}</span><span className="a2m-ct">{list.length}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const r = ROLES.find((x) => x.k === roleFilter) ?? ROLES[0];
            const hex = customHex[r.k] ?? "";
            const sugg = hex ? suggestForUI(hex, { part: r.part, limit: 3 }) : [];
            return (
              <>
                {/* DB/40 §4 — free colour → the advisor's closest REAL material (286-SKU feed).
                    Mobile-first: the picker sits on one line; suggestions are a horizontal-scroll
                    strip (no awkward wrap), each a compact chip with an ellipsised decor name. */}
                <div style={{ padding: "8px 4px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hex && sugg.length ? 8 : 0 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#475569" }}>
                      <input type="color" value={hex || "#cccccc"} aria-label="Свой цвет"
                        onChange={(e) => setCustomHex((c) => ({ ...c, [r.k]: e.target.value }))}
                        style={{ width: 40, height: 30, padding: 0, border: "1px solid #e2e8f0", borderRadius: 8, background: "none", cursor: "pointer" }} />
                      Свой цвет
                    </label>
                    {hex && sugg.length === 0 && <span style={{ fontSize: 12, color: "#94a3b8" }}>нет близкого совпадения</span>}
                  </div>
                  {hex && sugg.length > 0 && (
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" as const }}>
                      {sugg.map((s) => {
                        const on = runMaterials[r.part] === s.sku;
                        return (
                          <button key={s.sku} type="button" title={`${s.name} · ${matPriceLabel({ price: s.price, per: 1 } as EmanMaterial)}`}
                            onClick={() => {
                              // bind the slot to the SKU (palette OR the 286-SKU feed — resolveMaterial handles both)
                              setRunMaterial(r.part, s.sku);
                              if (FINISH_PARTS.has(r.part)) applyFinishToAll({ [r.part]: hexToInt(s.hex) } as Partial<Record<FinishKey, number>>);
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, border: on ? "2px solid #16a34a" : "1px solid #e2e8f0", background: on ? "rgba(22,163,74,0.08)" : "#fff", cursor: "pointer", fontSize: 12, flex: "0 0 auto", maxWidth: 190 }}>
                            <i style={{ width: 14, height: 14, borderRadius: 4, background: s.hex, flex: "0 0 auto" }} />
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                            <b style={{ color: "#16a34a", flex: "0 0 auto" }}>ΔE&nbsp;{s.deltaE00.toFixed(1)}</b>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="a2m-group">{roleMats(r.part).map((m) => Row(m, r))}</div>
              </>
            );
          })()}
        </>
      )}

      {gmode === "sections" && ROLES.map((r) => {
        const list = roleMats(r.part); if (!list.length) return null;
        return (
          <div key={r.k}>
            <div className="a2m-sechd"><span className="a2m-glyph" style={{ background: r.glyph }}>{r.k}</span><span className="a2m-nm">{r.nm}</span><span className="a2m-sct">{list.length} шт</span></div>
            <div className="a2m-group">{list.map((m) => Row(m, r))}</div>
          </div>
        );
      })}

      {gmode === "accordion" && ROLES.map((r) => {
        const list = roleMats(r.part); const isClosed = !!closed[r.k];
        return (
          <div key={r.k}>
            <div className={`a2m-sechd acc${isClosed ? " closed" : ""}`} onClick={() => setClosed((c) => ({ ...c, [r.k]: !c[r.k] }))}>
              <span className="a2m-glyph" style={{ background: r.glyph }}>{r.k}</span><span className="a2m-nm">{r.nm}</span><span className="a2m-sct">{list.length} шт</span><span className="a2m-chev">▾</span>
            </div>
            {!isClosed && <div className="a2m-group">{list.length ? list.map((m) => Row(m, r)) : <div className="a2m-empty">пусто</div>}</div>}
          </div>
        );
      })}

      <div className="a2m-foot">
        <div className="a2m-fa"><span className="a2m-fl">на складе</span><span className="a2m-fv">{totalStock.toFixed(1)} лист.</span></div>
        <div className="a2m-fa"><span className="a2m-fl">стоимость остатка</span><span className="a2m-fv">{totalValue.toFixed(1)} млн</span></div>
        <div className="a2m-hint">выбор синхронизируется с 3D и сметой</div>
      </div>
    </div>
  );
}
