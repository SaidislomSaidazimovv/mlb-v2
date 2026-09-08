// «Библиотеки» — the ≡ menu's reusable-content home. Structure follows the v9 mockup
// (v9.html `renderSectLibs`): three tabs — Блоки · Компоненты · Аксессуары — which is also
// what App2Shell's "блоки · комп. · аксесс." hint already promised.
//
// Bosqich-1 delivers the tab shell + a working БЛОКИ tab:
//   • Мои шкафы  — the real "My cabinets" library (savedCabs): saved config + thumbnail, deletable.
//   • Каталог    — the standard block catalog (CABINET_GROUPS), grouped exactly as the Add sheet.
// Inserting a block stays in the constructor's «＋» (same catalog); this screen is the browse/manage
// home, matching v9 (there the card tap was "вставка — след. итерация").
//
// АКСЕССУАРЫ is an honest REFERENCE catalog, NOT a functional selector: the shop's real connector is
// Rastex/Minifix-15 (Ø15×12.5, verified in hardware_specs), and selecting a SKU/type would not change
// the drilled geometry — the solver always cams+dowels. The connector TYPE lives in «Узлы»
// (carcassConnector) + the per-cabinet blueprint (V21BlueprintEditor jshelfHw); non-cam types need
// founder-verified geometry. So this tab shows the real specs and points at where the choice lives.

import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { useStore } from "../store";
import { listSavedCabs, cabScope, visibleCabInProject, setCabScope, type SavedCab } from "../model/savedCabs";
import { listComponents, importComponents, removeComponent } from "../model/componentLibrary";
import { previewParts, componentPanelLayout, fitCheckDefault, componentGate } from "../model/componentPreview";
import type { ComponentLibraryItem } from "../../../../engine/index.js";
import { CABINET_GROUPS } from "./addCatalog";
import { ACCESSORIES, accessoriesByFunction } from "../model/accessories";
import { cabHist } from "./storeHelpers";
import { mk, type Cabinet, type Cell } from "../model/cabinet";
import { cabToModule } from "../model/toProject";
import { fetchGlobalBlocks, fetchGlobalComponents, deleteGlobal, initialsAvatar, type GlobalItem } from "../lib/globalLibrary";
import { supabase } from "../lib/supabase";

/** «сегодня / вчера / N дн. назад» — a short relative date for a global card. */
function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return "сегодня";
  if (d < 2) return "вчера";
  if (d < 30) return `${Math.floor(d)} дн. назад`;
  return new Date(iso).toLocaleDateString("ru");
}

/** A small round avatar — the author's photo, or their initials on a stable colour when there's none. */
function AuthorAvatar({ g }: { g: GlobalItem }): ReactNode {
  if (g.avatar_url) return <img src={g.avatar_url} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover", flex: "none" }} />;
  const a = initialsAvatar(g.author_name);
  return <span style={{ width: 16, height: 16, borderRadius: "50%", background: a.color, color: "#fff", fontSize: 8, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{a.text}</span>;
}

const DEPTH_DEFAULT: Record<Cabinet["kind"], number> = { base: 560, tall: 560, upper: 350 };

// Role-binding badge colours (v9: a component stores ROLES, not materials — the badge is the slot
// it binds on insert). A/B/C/W = material slots (App2Materials), K1/K2 = kromka, H1 = hardware.
const ROLE_COLOR: Record<string, string> = {
  A: "#3068ed", B: "#d9822b", C: "#9a6fe0", W: "#5b6470", K1: "#e2483d", K2: "#18a999", H1: "#7b5cff",
};

function Roles({ badges }: { badges: string[] }) {
  return (
    <span className="a2lib-roles">
      {badges.map((b) => <i key={b} style={{ background: ROLE_COLOR[b] ?? "#9a9aa2" }}>{b}</i>)}
    </span>
  );
}

/**
 * A schematic front elevation for an IMPORTED component (App-3), drawn from its real panels — the same
 * card style the example components use. The component data carries panel KINDS + counts + an envelope
 * size, but NO positions, so the drawing is an honest schematic (evenly spaced), not a claimed layout:
 * divider → vertical line, shelf → horizontal line, a facade → a light fill, and a filled dot marks
 * that a panel carries a modifier (laminate/viyemka). The outer box keeps the envelope's real aspect.
 */
function CompThumb({ item }: { item: ComponentLibraryItem }) {
  const kids = item.root.children ?? [];
  const nV = kids.filter((k) => k.kind === "divider").length;
  const nH = kids.filter((k) => k.kind === "shelf").length;
  const nF = kids.filter((k) => k.kind === "door" || k.kind === "drawer").length;
  const hasMod = kids.some((k) => (k.modifiers?.length ?? 0) > 0) || (item.root.modifiers?.length ?? 0) > 0;
  const w = item.root.size?.w_mm10 ?? 0, h = item.root.size?.h_mm10 ?? 0;
  const aspect = w > 0 && h > 0 ? w / h : 1.5;
  // fill most of the card (like the block cards) while keeping the envelope's real aspect
  let bw = 92, bh = 58;
  if (aspect > bw / bh) bh = Math.round(bw / aspect); else bw = Math.round(bh * aspect);
  const bx = Math.round((100 - bw) / 2), by = Math.round((64 - bh) / 2);

  // EXACT front elevation when App-3's interim `pos` bridge is present on every panel — each panel is
  // drawn at its real place (y is flipped: envelope y-up → SVG y-down). Absent → the schematic below.
  const layout = componentPanelLayout(item);
  return (
    <svg viewBox="0 0 100 64" className="a2lib-svg" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
      {nF > 0 && !layout && <rect x={bx} y={by} width={bw} height={bh} fill="currentColor" stroke="none" opacity={0.09} />}
      <rect x={bx} y={by} width={bw} height={bh} rx={1.5} />
      {layout
        ? layout.map((p) => (
            <rect key={p.id} x={bx + p.x * bw} y={by + (1 - p.y - p.h) * bh} width={Math.max(0.6, p.w * bw)} height={Math.max(0.6, p.h * bh)}
                  fill={p.laminated ? "currentColor" : "none"} fillOpacity={p.laminated ? 0.18 : 0} />
          ))
        : <>
            {Array.from({ length: nV }, (_, i) => {
              const x = bx + Math.round((bw * (i + 1)) / (nV + 1));
              return <line key={`v${i}`} x1={x} y1={by} x2={x} y2={by + bh} />;
            })}
            {Array.from({ length: nH }, (_, i) => {
              const y = by + Math.round((bh * (i + 1)) / (nH + 1));
              return <line key={`h${i}`} x1={bx} y1={y} x2={bx + bw} y2={y} />;
            })}
          </>}
      {hasMod && <circle cx={bx + bw - 5} cy={by + 5} r={2.6} fill="currentColor" stroke="none" opacity={0.75} />}
    </svg>
  );
}

/** The publish-gate's App-2 client stages (§10.3) run against this component — schema · slot ·
 *  decomposition · invariant pass/fail here; profile-swap · ad-integrity are the server's (shown pending).
 *  So the master sees WHY a component would be rejected from the global library, never a bare boolean. */
function GateList({ item }: { item: ComponentLibraryItem }) {
  const gate = useMemo(() => { try { return componentGate(item); } catch { return null; } }, [item]);
  if (!gate) return null;
  return (
    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--line, #e3e3e8)", width: "100%", fontSize: 11, lineHeight: 1.5, textAlign: "left" }}>
      <div style={{ opacity: 0.6, marginBottom: 2 }}>Гейт §10.3 · {gate.ok ? "✓ клиент OK" : "✕ есть ошибки"}</div>
      {gate.stages.map((s) => (
        <div key={s.stage} style={{ display: "flex", justifyContent: "space-between", gap: 6, color: s.ok ? undefined : "#d64545" }}>
          <span>{s.ok ? "✓" : "✕"} {s.stage}</span>
          {s.detail && <span style={{ opacity: 0.65, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{s.detail}</span>}
        </div>
      ))}
    </div>
  );
}

/** The REAL cut parts the engine (panelDecomposition → decomposeGroup) produces from this component —
 *  shown so «import → real detail» is visible in the browser. Read-only: it decomposes a copy against
 *  a reference profile, never the live project. laminate shows as N identical blanks; a viyemka shows
 *  as ✂ паз on its part. */
function PartsList({ item }: { item: ComponentLibraryItem }) {
  const parts = useMemo(() => { try { return previewParts(item); } catch { return []; } }, [item]);
  if (!parts.length) return <div className="a2lib-cnote" style={{ marginTop: 6 }}>нет деталей раскроя</div>;
  return (
    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--line, #e3e3e8)", width: "100%", fontSize: 11, lineHeight: 1.5, textAlign: "left" }}>
      <div style={{ opacity: 0.6, marginBottom: 2 }}>Раскрой · {parts.length} дет. (движок)</div>
      {parts.map((p) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span>{p.name}</span>
          <span style={{ opacity: 0.75, whiteSpace: "nowrap" }}>{p.l_mm}×{p.w_mm}×{p.t_mm}{p.hasGroove ? " ✂" : ""}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A v9-style front-elevation schematic for a block card (v9 `blockCard(nm, sz, svg)`). Parametric from
 * the cab config instead of a hardcoded per-item drawing, so it covers every CABINET_GROUPS item (and any
 * saved cab): kind sets the proportions; fill/count draw the interior (drawers = fronts + handles, open =
 * shelves, closed = door + handle); corner/appliance/island change the outline.
 */
function blockSvg(cab: Partial<Cabinet>): ReactNode {
  const kind = cab.kind ?? "base";
  const y0 = kind === "tall" ? 5 : kind === "upper" ? 13 : 8;
  const y1 = kind === "tall" ? 59 : kind === "upper" ? 51 : 56;
  const wrap = (children: ReactNode) => (
    <svg viewBox="0 0 100 64" className="a2lib-svg" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  );

  // corner (diagonal / L) — an L-shaped footprint
  if (cab.corner && cab.cornerShape !== "outer") {
    return wrap(<path d={`M20 ${y0} H80 V${y1} H50 V${(y0 + y1) / 2} H20 Z`} />);
  }
  // outer (convex) corner — a chamfered end cap
  if (cab.corner && cab.cornerShape === "outer") {
    return wrap(<path d={`M22 ${y0 + 10} L40 ${y0} H78 V${y1} H22 Z`} />);
  }

  const x0 = cab.island ? 12 : 22;
  const x1 = cab.island ? 88 : 78;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const wide = (cab.w ?? 600) >= 780;
  const sink = cab.appliance === "sink";
  const n = Math.max(1, cab.count ?? 1);
  const inner: ReactNode[] = [<rect key="box" x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={1.5} />];

  if (cab.fill === "drawers") {
    const h = (y1 - y0) / n;
    for (let i = 1; i < n; i++) inner.push(<line key={`d${i}`} x1={x0} y1={y0 + h * i} x2={x1} y2={y0 + h * i} />);
    for (let i = 0; i < n; i++) inner.push(<line key={`p${i}`} x1={cx - 7} y1={y0 + h * i + h / 2} x2={cx + 7} y2={y0 + h * i + h / 2} strokeWidth={2.3} />);
  } else if (cab.fill === "open") {
    const h = (y1 - y0) / (n + 1);
    for (let i = 1; i <= n; i++) inner.push(<line key={`s${i}`} x1={x0} y1={y0 + h * i} x2={x1} y2={y0 + h * i} />);
    if (sink) inner.push(<circle key="sink" cx={cx} cy={cy} r={9} />);
  } else {
    // closed cabinet — one or two doors + handle(s)
    if (wide) {
      inner.push(<line key="div" x1={cx} y1={y0} x2={cx} y2={y1} />);
      inner.push(<line key="hl" x1={cx - 4} y1={cy - 6} x2={cx - 4} y2={cy + 6} strokeWidth={2.3} />);
      inner.push(<line key="hr" x1={cx + 4} y1={cy - 6} x2={cx + 4} y2={cy + 6} strokeWidth={2.3} />);
    } else {
      inner.push(<line key="h" x1={x1 - 6} y1={cy - 6} x2={x1 - 6} y2={cy + 6} strokeWidth={2.3} />);
    }
    if (sink) inner.push(<circle key="sink" cx={cx} cy={cy} r={9} />);
  }
  return wrap(inner);
}

/** WxHxD from a (partial) cabinet, using the kind's default depth when none is set. */
function sizeOf(cab: Partial<Cabinet>): string {
  const d = cab.depth ?? (cab.kind ? DEPTH_DEFAULT[cab.kind] : 560);
  const w = cab.w ?? "?";
  const h = cab.h ?? "?";
  return `${w}×${h}×${d}`;
}

type LibTab = "blocks" | "comps" | "acc";

export function App2Library({ onClose, onToast }: { onClose?: () => void; onToast?: (m: string) => void }) {
  const [tab, setTab] = useState<LibTab>("blocks");
  const savedRev = useStore((s) => s.savedCabsRev); // re-render the "My cabinets" list on save/delete
  const removeSavedCab = useStore((s) => s.removeSavedCab);
  const armComponent = useStore((s) => s.armComponent);
  const currentProjectId = useStore((s) => s.currentProjectId); // BLOCK library scope (local = this project)
  const [blockRev, setBlockRev] = useState(0); // re-render on a scope MOVE
  // BLOCKS are App-2's own — shown filtered by scope: «mine» (all my projects) + this project's «project» ones.
  const saved = useMemo(() => listSavedCabs().filter((sc) => visibleCabInProject(sc, currentProjectId)), [savedRev, currentProjectId, blockRev]);
  // 4 SECTIONS (DB/36 §3 · DB_37): ★ «Мои шкафы» (mine) · 🔒 «Локальные» (this project) · 🌐 «Глобальные»
  // (all USERS — server, not built → «скоро») · «Каталог». Scope lives in SECTIONS, never a per-card toggle.
  const mineCabs = useMemo(() => saved.filter((sc) => cabScope(sc).scope === "mine"), [saved]);
  const localCabs = useMemo(() => saved.filter((sc) => cabScope(sc).scope === "project"), [saved]);
  const moveCab = (id: string, to: "mine" | "project") => { setCabScope(id, to, currentProjectId); setBlockRev((n) => n + 1); };
  // one saved-block chip; `move` (or null) is the section-aware move action, e.g. ★ Мои шкафы ↔ 🔒 этот проект.
  const savedChip = (sc: SavedCab, move: { to: "mine" | "project"; icon: string; title: string } | null) => (
    <div key={sc.id} className="add-chip saved-chip a2lib-chip a2lib-ins" role="button" title="Загрузить блок в студию" onClick={() => loadBlock(sc.cab, sc.name)}>
      <span className="saved-del" role="button" aria-label="Удалить" onClick={(e) => { e.stopPropagation(); removeSavedCab(sc.id); }}>✕</span>
      {move && (
        <b role="button" title={move.title}
           style={{ position: "absolute", top: 2, left: 4, zIndex: 1, fontSize: 12, cursor: "pointer" }}
           onClick={(e) => { e.stopPropagation(); moveCab(sc.id, move.to); }}>
          {move.icon}
        </b>
      )}
      {sc.thumbnail ? <img className="add-img" src={sc.thumbnail} alt="" aria-hidden="true" /> : blockSvg(sc.cab)}
      <span className="add-name">{sc.name}</span>
      <span className="a2lib-csz" title="Параметрический диапазон ширины">{sc.fit ? `${sc.fit.minWmm}–${sc.fit.maxWmm}мм` : sizeOf(sc.cab)}</span>
    </div>
  );

  // Компоненты: ingested from App-3's exported JSON (interim channel). compRev re-reads the store
  // after an import / delete; the file input reads a picked .json → importComponents.
  const [compRev, setCompRev] = useState(0);
  const comps = useMemo(() => listComponents(), [compRev]); // components are RECEIVED (global) — App-3 owns their scope
  // 🌐 global library — published blocks + components from ALL masters (server). Fetched once on open.
  const [globalBlocks, setGlobalBlocks] = useState<GlobalItem[]>([]);
  const [globalComps, setGlobalComps] = useState<GlobalItem[]>([]);
  const [myUid, setMyUid] = useState<string | null>(null); // to show ✕ only on MY published items
  const refetchGlobal = () => { void fetchGlobalBlocks().then(setGlobalBlocks); void fetchGlobalComponents().then(setGlobalComps); };
  useEffect(() => { refetchGlobal(); void supabase?.auth.getUser().then(({ data }) => setMyUid(data.user?.id ?? null)); }, []);
  const delGlobal = async (id: string) => { if (await deleteGlobal(id)) refetchGlobal(); };
  const compFileRef = useRef<HTMLInputElement>(null);
  const [compDetail, setCompDetail] = useState<string | null>(null); // which component's раскрой is open
  const onImportComps = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const res = importComponents(await f.text());
      onToast?.(res.imported.length
        ? `Импортировано: ${res.imported.length}${res.rejected.length ? ` · отклонено ${res.rejected.length}` : ""}`
        : `Не импортировано${res.rejected.length ? `: ${res.rejected[0]!.reason}` : ""}`);
      setCompRev((n) => n + 1);
    }
    e.target.value = "";
  };

  // App-2 (studio.html, the Vercel entry) edits ONE block — cabs[0]. There is NO room to place into
  // (that is App-1 / ConfigScreen), so "adding" a Блок here means LOADING it as the block to edit:
  // it replaces the current block. We keep the block's own finish (saved cabs carry one), else the
  // current block's, so the material look survives the swap. cabHist(s) makes it one undoable step.
  const loadBlock = (cab: Partial<Cabinet>, name: string) => {
    useStore.setState((s) => ({
      ...cabHist(s),
      cabs: [mk({ ...cab, finish: cab.finish ?? s.cabs[0]?.finish })],
      selIdx: 0,
    }));
    onToast?.(`Загружен блок: ${name}`);
    onClose?.();
  };

  // Place a library component INTO the current block (cabs[0]) WITHOUT replacing it (the user's rule:
  // "add to the ready block, don't erase it"). DB_37 §4 / QONUNLAR §8.1: a component is placed into a
  // division CELL and OWNS its dimension — a `locked` rule (CONSTRUCTION_FRAME_v4 §4, solved by
  // solveSpans: fixed+locked keep their mm, flex absorbs the rest). So the component gets a column of
  // its OWN authored width — not a squished equal share — and the existing interior flexes into what is
  // left. If the component is wider than the block, solveSpans collapses the flex side (the §4
  // "nothing can absorb" case). cabHist → one undo step; the bound Cell.component drives both the cut
  // list (decomposeGroup) and the exact 3D panels (interim pos).
  const placeComponent = (item: ComponentLibraryItem) => {
    const ref = { componentId: item.componentId, pinnedVersion: item.version };
    const compW = Math.round((item.root.size?.w_mm10 ?? 0) / 10); // authored width, mm
    // B6 accept-fit-check — reject (with the reason) if the block can't host this proven range
    const cab0 = useStore.getState().cabs[0];
    if (cab0) {
      const fc = fitCheckDefault(item, { w_mm10: item.root.size?.w_mm10 ?? 0, h_mm10: cab0.h * 10, d_mm10: (cab0.depth ?? DEPTH_DEFAULT[cab0.kind]) * 10 });
      if (!fc.ok) { onToast?.(`Не помещается: ${fc.failures[0]}`); return; }
    }
    useStore.setState((s) => {
      const cab = s.cabs[0];
      if (!cab) return {};
      const current = cabToModule(cab).layout ?? {};
      const compCell: Cell = { component: ref };
      const next: Cell = compW > 0
        ? { split: "cols", children: [current, compCell], rules: [{ kind: "flex" }, { kind: "locked", mm: compW }] }
        : { split: "cols", children: [current, compCell] };
      return { ...cabHist(s), cabs: s.cabs.map((c, j) => (j === 0 ? { ...c, layout: next } : c)) };
    });
    onToast?.(`«${item.name}» добавлен в шкаф (${compW} мм) — детали в раскрое`);
    onClose?.();
  };

  return (
    <div className="a2lib">
      <div className="a2lib-tabs" role="tablist">
        <b role="tab" className={tab === "blocks" ? "on" : ""} onClick={() => setTab("blocks")}>Блоки</b>
        <b role="tab" className={tab === "comps" ? "on" : ""} onClick={() => setTab("comps")}>Компоненты</b>
        <b role="tab" className={tab === "acc" ? "on" : ""} onClick={() => setTab("acc")}>Аксессуары</b>
      </div>

      {tab === "blocks" && (
        <>
          {/* «С нуля» — a BLANK base cabinet the master builds up from scratch. Analog of App-1's variants
              «С нуля» (empty room), one level down (DB/32: App-2 = cabinet assembly). Not a template: an
              empty box (fill "open", no shelves/doors); mk fills the rest. loadBlock replaces the studio cab. */}
          <div className="a2lib-grp">С нуля <span className="a2lib-auto">пустой</span></div>
          <div className="add-grid">
            <div className="add-chip a2lib-card a2lib-ins" role="button" title="Пустой шкаф — соберу сам"
              onClick={() => loadBlock({ kind: "base", w: 600, h: 720, fill: "open", count: 0, door: 0 }, "Пустой шкаф")}>
              {blockSvg({ kind: "base", w: 600, h: 720, fill: "open", count: 0, door: 0 })}
              <span className="add-name">Пустой шкаф</span>
              <span className="a2lib-csz">соберу сам</span>
            </div>
          </div>

          {/* 🌐 Глобальные — barcha usta ko'radi (avatar + ism + sana), serverdan (global_library). */}
          <div className="a2lib-grp">🌐 Глобальные <span className="a2lib-auto">{globalBlocks.length || "—"}</span></div>
          {globalBlocks.length === 0 ? (
            <div className="a2-sstub" style={{ padding: "2px 4px 10px" }}>
              Пока пусто. Опубликуйте блок: ★ Сохранить → 🌐 Глобально (нужен вход).
            </div>
          ) : (
            <div className="add-grid">
              {globalBlocks.map((g) => (
                <div key={g.id} className="add-chip a2lib-card a2lib-ins" role="button" title={`Загрузить · ${g.author_name}`} onClick={() => loadBlock(g.payload as Partial<Cabinet>, g.name)}>
                  {g.author === myUid && <span className="saved-del" role="button" aria-label="Удалить" onClick={(e) => { e.stopPropagation(); void delGlobal(g.id); }}>✕</span>}
                  {blockSvg(g.payload as Partial<Cabinet>)}
                  <span className="add-name">{g.name}</span>
                  <span className="a2lib-csz" style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}><AuthorAvatar g={g} /> {g.author_name} · {timeAgo(g.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          {/* 🔒 Локальные — faqat SHU loyiha */}
          {localCabs.length > 0 && (
            <>
              <div className="a2lib-grp">🔒 Локальные <span className="a2lib-auto">{localCabs.length}</span></div>
              <div className="add-grid">
                {localCabs.map((sc) => savedChip(sc, { to: "mine", icon: "★", title: "★ Во все мои проекты" }))}
              </div>
            </>
          )}

          {/* ★ Мои шкафы — barcha loyiham */}
          {mineCabs.length > 0 && (
            <>
              <div className="a2lib-grp">★ Мои шкафы <span className="a2lib-auto">{mineCabs.length}</span></div>
              <div className="add-grid">
                {mineCabs.map((sc) => savedChip(sc, currentProjectId ? { to: "project", icon: "🔒", title: "🔒 Привязать к этому проекту" } : null))}
              </div>
            </>
          )}

          {CABINET_GROUPS.map((g) => (
            <div key={g.heading}>
              <div className="a2lib-grp">{g.heading} <span className="a2lib-auto">каталог</span></div>
              <div className="add-grid">
                {g.items.map((it) => (
                  <div key={it.id} className="add-chip a2lib-card a2lib-ins" role="button" title="Загрузить блок в студию" onClick={() => loadBlock(it.cab, it.name)}>
                    {blockSvg(it.cab)}
                    <span className="add-name">{it.name}</span>
                    <span className="a2lib-csz">{sizeOf(it.cab)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="a2-sstub" style={{ padding: "12px 4px 2px" }}>
            Тап по блоку — загрузить в студию. ✕ — удалить. 🔒/★ — раздел блока (этот проект ↔ все мои проекты). 🌐 Глобально (все мастера) — скоро.
          </div>
        </>
      )}

      {tab === "comps" && (
        <>
          <div className="a2-sstub" style={{ padding: "2px 4px 8px" }}>
            Компонент хранит <b>РОЛИ</b>, не материалы — бейджи ниже = слоты привязки при вставке
            («пятый материал» не появится).
          </div>
          <div className="a2lib-grp">Примеры <span className="a2lib-auto">ящики</span></div>
          <div className="a2lib-cgrid">
            <div className="a2lib-comp">
              <svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
                <rect x="14" y="14" width="72" height="36" />
                <rect x="20" y="20" width="60" height="24" />
              </svg>
              <span className="a2lib-cnm2">Sled простой</span>
              <span className="a2lib-cnote">h180</span>
              <Roles badges={["B", "A", "K1", "H1"]} />
            </div>
            <div className="a2lib-comp">
              <svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
                <rect x="14" y="10" width="72" height="44" />
                <rect x="20" y="16" width="60" height="14" />
                <rect x="26" y="34" width="48" height="12" />
              </svg>
              <span className="a2lib-cnm2">Sled 2-уровня</span>
              <span className="a2lib-cnote">внутр. sled ✅</span>
              <Roles badges={["B", "K2", "H1"]} />
            </div>
          </div>
          <div className="a2lib-grp">
            Мои компоненты <span className="a2lib-auto">{comps.length}</span>
            <b role="button" className="a2lib-imp" onClick={() => compFileRef.current?.click()}
               style={{ cursor: "pointer", marginLeft: 8, fontSize: 12, color: "var(--accent, #3b5bdb)", textDecoration: "underline" }}>
              ↧ Импорт (JSON из Forge)
            </b>
          </div>
          <input ref={compFileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onImportComps} />
          {comps.length > 0 ? (
            <div className="a2lib-cgrid">
              {comps.map((c) => {
                const key = `${c.componentId}:${c.version}`;
                const nodes = c.root.children?.length ?? 0;
                const mods = ((c.root.children ?? []).reduce((a, ch) => a + (ch.modifiers?.length ?? 0), 0)) + (c.root.modifiers?.length ?? 0);
                const open = compDetail === key;
                return (
                  <div key={key} className="a2lib-comp" style={{ cursor: "pointer" }}
                       title="Показать детали раскроя" onClick={() => setCompDetail(open ? null : key)}>
                    <span className="saved-del" role="button" aria-label="Удалить"
                          onClick={(e) => { e.stopPropagation(); removeComponent(c.componentId, c.version); setCompRev((n) => n + 1); }}>✕</span>
                    <CompThumb item={c} />
                    <span className="a2lib-cnm2">{c.name} · v{c.version}</span>
                    <span className="a2lib-cnote">{nodes} дет · {mods} модиф{c.fit ? "" : " · без fit"}</span>
                    {c.requiredSlots?.length ? <Roles badges={c.requiredSlots} /> : null}
                    <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
                      <b role="button" className="a2lib-ins" title="Добавить в текущий блок отдельной колонкой"
                         style={{ fontSize: 12, color: "var(--accent, #3b5bdb)", cursor: "pointer" }}
                         onClick={(e) => { e.stopPropagation(); placeComponent(c); }}>＋ В шкаф</b>
                      <b role="button" className="a2lib-ins" title="Выбрать место: коснитесь ячейки в 3D, чтобы поставить сюда"
                         style={{ fontSize: 12, color: "var(--accent, #3b5bdb)", cursor: "pointer" }}
                         onClick={(e) => { e.stopPropagation(); armComponent({ componentId: c.componentId, pinnedVersion: c.version }); onToast?.(`Коснитесь ячейки в 3D — поставить «${c.name}»`); onClose?.(); }}>📍 Выбрать место</b>
                    </div>
                    {open && <PartsList item={c} />}
                    {open && <GateList item={c} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="a2-sstub" style={{ padding: "10px 4px" }}>
              Пусто. Экспортируй библиотеку из Forge (App-3) как JSON и нажми <b>«Импорт»</b> выше —
              компонент несёт РОЛИ + модификаторы (ламинат/паз), которые движок раскроя
              (<b>panelDecomposition</b>) превратит в реальные детали при вставке.
            </div>
          )}
          {/* 🌐 global — komponentlar barcha ustadan (App-3 publish → server). avatar + ism + sana. */}
          {globalComps.length > 0 && (
            <>
              <div className="a2lib-grp">🌐 Глобальные компоненты <span className="a2lib-auto">{globalComps.length}</span></div>
              <div className="a2lib-cgrid">
                {globalComps.map((g) => {
                  const c = g.payload as ComponentLibraryItem;
                  return (
                    <div key={g.id} className="a2lib-comp" style={{ cursor: "pointer" }} title={`${g.author_name}`} onClick={() => placeComponent(c)}>
                      {g.author === myUid && <span className="saved-del" role="button" aria-label="Удалить" onClick={(e) => { e.stopPropagation(); void delGlobal(g.id); }}>✕</span>}
                      <CompThumb item={c} />
                      <span className="a2lib-cnm2">{c.name} · v{c.version}</span>
                      <span className="a2lib-cnote" style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}><AuthorAvatar g={g} /> {g.author_name} · {timeAgo(g.created_at)}</span>
                      <div style={{ marginTop: 6 }}>
                        <b role="button" className="a2lib-ins" title="Добавить в текущий блок" style={{ fontSize: 12, color: "var(--accent, #3b5bdb)", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); placeComponent(c); }}>＋ В шкаф</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === "acc" && (
        <>
          <div className="a2lib-grp">Эксцентрики <span className="a2lib-auto">тип — в «Узлы»</span></div>
          <div className="a2lib-cgrid">
            <div className="a2lib-comp">
              <svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
                <circle cx="34" cy="32" r="13" />
                <circle cx="34" cy="32" r="4" />
                <line x1="50" y1="32" x2="84" y2="32" />
                <circle cx="80" cy="32" r="4" fill="currentColor" />
              </svg>
              <span className="a2lib-cnm2">Rastex / Minifix 15</span>
              <span className="a2lib-cnote">Ø15×12.5 чашка · Ø8×34 шкант</span>
            </div>
            <div className="a2lib-comp">
              <svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
                <rect x="16" y="30" width="68" height="8" />
                <circle cx="40" cy="34" r="5" />
              </svg>
              <span className="a2lib-cnm2">VB 35/36</span>
              <span className="a2lib-cnote">полкодержатель-стяжка</span>
            </div>
          </div>
          <div className="a2-sstub" style={{ padding: "8px 4px" }}>
            Тип стяжки — в «Правила · Узлы» → <b>Стяжка корпуса</b>. Засверловка <b>Ø15×12.5</b> (эксцентрик)
            подтверждена по заводу; конфирмат / rafix — нужна заводская геометрия (у основателя).
          </div>

          <div className="a2lib-grp">Петли · Направляющие</div>
          <div className="a2lib-cgrid">
            <div className="a2lib-comp">
              <svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
                <circle cx="34" cy="32" r="14" strokeWidth={2} />
                <rect x="52" y="24" width="30" height="16" rx="3" />
              </svg>
              <span className="a2lib-cnm2">Петля чашка Ø35</span>
              <span className="a2lib-cnote">Ø35×13 · накладная · 110°</span>
            </div>
            <div className="a2lib-comp">
              <svg viewBox="0 0 100 64" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
                <rect x="14" y="26" width="72" height="6" />
                <rect x="14" y="36" width="52" height="6" />
              </svg>
              <span className="a2lib-cnm2">Направляющие</span>
              <span className="a2lib-cnote">скрытые · сверловка = F1</span>
            </div>
          </div>
          <div className="a2-sstub" style={{ padding: "8px 4px" }}>
            Ø35×13 (петля) и Ø5×11 (полкодержатель) — из профиля/spec, подтверждены. Сверловка ящика под
            направляющие — <b>F1</b> (отложена основателем).
          </div>

          {/* §8.5 «Accessories library — joints, hinges, slides, rods, lifts · grouped by function × brand».
              The full core pack, read verbatim (model/accessories.ts). REFERENCE only: every entry is
              verified:false (no SKU / no drilling); functional placement = holes = founder-deferred F1,
              resolved by the engine's Joints layer (§8.3), never App-2. */}
          <div className="a2lib-grp">Каталог аксессуаров <span className="a2lib-auto">browse · {ACCESSORIES.length}</span></div>
          <div className="a2-sstub" style={{ padding: "2px 4px 8px" }}>
            Полный каталог (GTV / Blum / Hettich…) — <b>справочно</b>. Все позиции <b>browse</b> (без SKU и
            сверловки): штанга, лифты, петли, направляющие. Установка со сверловкой — это <b>F1</b> (отложена
            основателем), её выполняет движок (слой «Узлы»), не App-2.
          </div>
          {accessoriesByFunction().map((g) => (
            <div key={g.code}>
              <div className="a2lib-grp" style={{ fontSize: 12, opacity: 0.8 }}>{g.label} <span className="a2lib-auto">{g.items.length}</span></div>
              <div className="add-grid">
                {g.items.map((a) => (
                  <div key={a.id} className="add-chip a2lib-card" title={`${a.brand} · ${a.name} · browse (verified:false — справочно)`}>
                    <span className="add-name">{a.name}</span>
                    <span className="a2lib-csz">{a.brand} · browse</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
