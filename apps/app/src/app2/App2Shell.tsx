import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { useMoney } from "../useMoney";
import { V21Cabinet3DStudio } from "./V21Cabinet3DStudio";
import { App2Sections } from "./App2Sections";
import { fmtLen, lenUnitLabel } from "../model/units";
import { publishToGlobal } from "../lib/globalLibrary";
import { supabase } from "../lib/supabase";
import { FRONT_PROFILES, frontOf, type Cabinet, type FrontProfile } from "../model/cabinet";
import type { Settings } from "../model/settings";
import type { KitchenStyle } from "../model/layout";

// App-2 studio shell — the founder's «Единый шелл» (v9.html), rebuilt 1:1 around the V21 block
// editor. Self-contained in src/app2/ per DB/36: imports ONLY the shared kernel (store, V21, model),
// never App-1 (details/variants/room). Mounted by studio-main (studio.html) and, later, by the
// colleague's 3-app integration. The V21 editor runs `embedded` so this shell owns the chrome.
//
// STEP 1 — top chrome (top-1 bar + top-2 operating-mode tabs).
// STEP 2 — the view dropdown (render styles, CF4 §15.2). 3 map to what V21 renders today
//          (Реалистично→3d · Каркас→outline · Наполнение→store mode «application»); Материалы /
//          Без фасадов / X-ray need new 3D render (CF4 §7 table) → shown but marked «скоро».

const OPMODES = [
  { k: "korpus", label: "Корпус" },
  { k: "kromka", label: "Кромка" },
  { k: "uzly", label: "Узлы" },
  { k: "acc", label: "Аксесс." },
] as const;

// Front-profil yorliqlari (App-2'ning `Module.front` atributи — ConfigScreen/FurnitureEditor bilan bir xil).
const FRONT_LABEL: Record<FrontProfile, string> = { flat: "Гладкий", shaker: "Шейкер", raised: "Филёнка", fluted: "Рифлёный", glass: "Стекло", grid: "Решётка", none: "—" };

// v9 view dropdown. `avail` = V21 already renders it; the rest need new 3D render (a later step).
const VIEWS = [
  { k: "real", label: "Реалистично", short: "Реал", avail: true },
  { k: "mat", label: "Материалы", short: "Матер.", avail: true },
  { k: "wire", label: "Каркас", short: "Каркас", avail: true },
  { k: "nofront", label: "Без фасадов", short: "Без фас.", avail: true },
  { k: "xray", label: "X-ray", short: "X-ray", avail: true },
  { k: "app", label: "Наполнение", short: "Наполн.", avail: true },
] as const;

// v9 render dropdown key → the V21 `renderMode`. wire = viewMode «outline».
const RENDER_MODE: Record<string, string> = { real: "real", mat: "mat", wire: "real", nofront: "nofront", xray: "xray", app: "application" };

// v9 ≡ menu-sheet section links (each opens App2Sections at that tab). Hints mirror v9.html §menu.
const MENU_SECTIONS = [
  { k: "materials", label: "Материалы", hint: "A/B/C · меняет 3D" },
  { k: "kromka", label: "Кромка · Jiyak", hint: "K1/K2, длины" },
  { k: "rules", label: "Правила · Узлы", hint: "интерактивные схемы" },
  { k: "libs", label: "Библиотеки", hint: "блоки · комп. · аксесс." },
] as const;

// ── Optional room-flow chrome (§A-migration) ────────────────────────────────────
// Supplied ONLY when App2Shell is mounted inside the main app's design FLOW (the
// `configure` screen). Undefined in the standalone studio (studio.html), so the studio
// stays a single-block editor — no price / nav / add-toolbar / plan. Fields are filled
// in step-by-step as the room flow migrates over from ConfigScreen.
export type App2Flow = {
  price?: number; // room total (USD) — shown centred in the top bar when settings.showPricing
  onBack?: () => void; // ← previous FLOW step (Варианты)
  onNext?: () => void; // → next FLOW step (Превью)
  backLabel?: string;
  nextLabel?: string;
};

export function App2Shell({ cab, patchCab, settings, style, flow, onClose }: {
  cab: Cabinet;
  patchCab: (patch: Partial<Cabinet>) => void;
  settings?: Settings;
  style?: KitchenStyle;
  flow?: App2Flow;
  // «Готово» — close the editor and return to the room. Passed by the main app (ConfigScreen
  // «Редактор»/qalam) where the studio replaces the bare V21; absent in the standalone studio.html.
  onClose?: () => void;
}) {
  const money = useMoney();
  const undoCab = useStore((s) => s.undoCab);
  const redoCab = useStore((s) => s.redoCab);
  const canUndo = useStore((s) => s.cabsPast.length > 0);
  const canRedo = useStore((s) => s.cabsFuture.length > 0);
  const updateSettings = useStore((s) => s.updateSettings);
  const saveCab = useStore((s) => s.saveCab);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const [opmode, setOpmode] = useState<string>("korpus");
  const [viewMode, setViewMode] = useState<"3d" | "2d" | "outline">("3d");
  const [renderView, setRenderView] = useState<string>("real");
  const [vopen, setVopen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]); // §Скрыть · session-only hidden front groups (studio ⋮ hides → «Слои» restores)
  const [partsList, setPartsList] = useState<{ group: string; role: string; label: string; wMm: number; hMm: number; count: number; kromka: string }[]>([]); // §Слои · 3D-selectable parts (from V21)
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [sectionsTab, setSectionsTab] = useState<string>("materials");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false); // ★ Сохранить blok → kutubxona («Мои шкафы» / 🔒 «В проект»)
  const [saveName, setSaveName] = useState("");
  const [dimEdit, setDimEdit] = useState<{ axis: "w" | "h" | "depth"; label: string; value: string } | null>(null); // РАЗМЕР karta → numpad (shkaf o'lchami)
  const [frontEdit, setFrontEdit] = useState<null | "cab" | "part">(null); // «Фасад» pikeri: "cab" = butun shkaf (РАЗМЕР) · "part" = tanlangan front (ДЕТАЛЬ). App-2 `front` atributи, App-3 emas.
  const [mlegOpen, setMlegOpen] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false); // §A · open doors/drawers → reveal what's behind
  const [uzlySb, setUzlySb] = useState<number | null>(null); // «Узлы» slider live drag value (commit on release → no per-tick mesh rebuild)
  const [selInfo, setSelInfo] = useState<{ label: string; wMm: number; hMm: number; count: number; deletable: boolean; openable: boolean; inners?: string[]; componentId?: string; componentPinned?: number; componentLatest?: number; detachable?: boolean; boundInner?: number; duplicatable?: boolean; hideable?: boolean; hidden?: boolean; group?: string; frontProfile?: FrontProfile } | null>(null);
  const partDeleteRef = useRef<(() => void) | null>(null);
  const partToggleOpenRef = useRef<(() => void) | null>(null);
  const partInnersRef = useRef<(() => void)[] | null>(null);
  const partDetachRef = useRef<(() => void) | null>(null);
  const partDuplicateRef = useRef<(() => void) | null>(null);
  const partHideRef = useRef<(() => void) | null>(null);
  const partSelectRef = useRef<((group: string) => void) | null>(null); // §Слои · select a part by group
  const partSetFrontRef = useRef<((profile: FrontProfile) => void) | null>(null); // per-cell фасад · set selected front's profile
  const partAcceptUpdateRef = useRef<((newVersion: number) => void) | null>(null); // §10.4 · accept newer component version
  // §3 · v9 «⋮ Действия» actions menu on the poz card (openActions). Toast surfaces the still-founder /
  // step-4 actions honestly instead of pretending they run.
  const [partMenuOpen, setPartMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = (m: string) => { setToast(m); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), 1900); };
  // ★ Save the assembled block to the library. "mine" → «Мои шкафы» (all my projects); "project" → 🔒
  // «Локальные» (this project only). The all-USERS «Global» tier needs the server — never faked here.
  const doSave = (scope: "mine" | "project") => {
    saveCab(cab.id, saveName.trim(), scope);
    setSaveOpen(false);
    setSaveName("");
    showToast(scope === "project" ? "Сохранено · 🔒 в проект" : "Сохранено · ★ Мои шкафы");
  };
  // 🌐 publish the block to the GLOBAL library (all masters) through the §10.3 gate. A rejection shows its
  // reason (never a bare boolean); "войдите" if not signed in (main-app login → studio inherits the session).
  const [publishing, setPublishing] = useState(false);
  // login state (from App-1's session, shared same-origin) — drives the 🌐 button label + reminder.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setLoggedIn(!!sess));
    return () => sub.subscription.unsubscribe();
  }, []);
  const doPublishGlobal = async () => {
    const name = saveName.trim() || "Блок";
    setPublishing(true);
    const res = await publishToGlobal("block", name, cab);
    setPublishing(false);
    if (res.ok) { setSaveOpen(false); setSaveName(""); showToast("🌐 Опубликовано для всех мастеров"); }
    else showToast(res.code === "auth" ? "Войдите, чтобы опубликовать" : `Не опубликовано: ${res.reason}`);
  };
  useEffect(() => { setPartMenuOpen(false); }, [selInfo]); // a new selection closes the actions menu
  const units = settings?.units ?? "mm";
  // material legend (v9 §15.2) — the ROLE key A/B/C/W. v9 (and our Материалы section, App2Materials.ROLES)
  // colour these abstractly (blue/amber/purple/slate) so the key stays legible on the light viewport; the
  // block's real finish is near-white and would vanish. Full per-role SKU tint needs the material pack (F3).
  const MATS = [
    { k: "A", label: "Фасад", color: "#3068ed" },
    { k: "B", label: "Корпус", color: "#d9822b" },
    { k: "C", label: "Задняя", color: "#9a6fe0" },
    { k: "W", label: "Столешн.", color: "#5b6470" },
  ];
  // «Слои · Детали»: the 3D-SELECTABLE parts (from V21 via onPartsList) — click a row → select + highlight.
  const hiddenLabel = (g: string) => { const [role, path] = g.split("@"); const nm = role === "door" ? "Дверь" : role === "drawer" ? "Ящик" : role; return path ? `${nm} · ${path}` : nm; };

  const activeView = viewMode === "2d" ? renderView : viewMode === "outline" ? "wire" : renderView;
  const pickView = (k: string) => {
    setVopen(false);
    setRenderView(k);
    setViewMode(k === "wire" ? "outline" : "3d");
  };
  const activeShort = VIEWS.find((v) => v.k === activeView)?.short ?? "Реал";

  return (
    <div className="a2shell">
      {/* viewport — the V21 block editor, embedded; its view mode is controlled by the shell dropdown */}
      <div className="a2-vp">
        <V21Cabinet3DStudio embedded cab={cab} patchCab={patchCab} onClose={() => {}} settings={settings} style={style} viewMode={viewMode} onViewModeChange={setViewMode} renderMode={RENDER_MODE[renderView]} opMode={opmode} uzlySetbackMm={uzlySb} doorsOpen={doorsOpen} onSelInfo={setSelInfo} partDeleteRef={partDeleteRef} partToggleOpenRef={partToggleOpenRef} partInnersRef={partInnersRef} partDetachRef={partDetachRef} partDuplicateRef={partDuplicateRef} partHideRef={partHideRef} hiddenGroups={hiddenGroups} onHiddenChange={setHiddenGroups} onPartsList={setPartsList} partSelectRef={partSelectRef} partSetFrontRef={partSetFrontRef} partAcceptUpdateRef={partAcceptUpdateRef} />
      </div>

      {/* top-1: undo/redo · view trigger · ≡ menu (◀ Сборка is App-1 — hidden in the standalone studio) */}
      <div className="a2-top1">
        {flow?.onBack && (
          <button type="button" className="a2-iconbtn" aria-label={flow.backLabel ?? "Назад"} title={flow.backLabel ?? "Назад"} onClick={flow.onBack}>←</button>
        )}
        <div className="a2-urpill">
          <button type="button" disabled={!canUndo} onClick={undoCab} aria-label="Отменить">↶</button>
          <button type="button" disabled={!canRedo} onClick={redoCab} aria-label="Вернуть">↷</button>
        </div>
        <div className="a2-grow" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          {flow?.price != null && settings?.showPricing && (
            <span className="cfg-price">{money(flow.price)}<span className="cfg-price-i" aria-hidden>ⓘ</span></span>
          )}
        </div>
        <button type="button" className={`a2-iconbtn${doorsOpen ? " on" : ""}`} aria-label={doorsOpen ? "Закрыть дверцы" : "Открыть дверцы"} title="Открыть / Закрыть дверцы" onClick={() => setDoorsOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="9" height="16" rx="1" /><path d="M12 5l8 3v8l-8 3" /></svg>
        </button>
        <button type="button" className="a2-viewtrig" onClick={() => setVopen((o) => !o)}>{activeShort} <span className="a2-caret">▾</span></button>
        <button type="button" className="a2-iconbtn" aria-label="Сохранить блок" title="Сохранить блок в библиотеку" onClick={() => { setSaveName(""); setSaveOpen(true); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></svg>
        </button>
        <button type="button" className="a2-iconbtn" aria-label="Меню" onClick={() => setMenuOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
        </button>
        {flow?.onNext && (
          <button type="button" className="a2-nextbtn" onClick={flow.onNext}>{flow.nextLabel ?? "Далее"} →</button>
        )}
        {onClose && (
          <button type="button" className="a2-donebtn" onClick={onClose}>Готово</button>
        )}
      </div>

      {/* ≡ menu-sheet (v9.html §menu) — Единицы toggle + section links + material legend. Tapping a section
          opens the App2Sections slide-over at that tab. */}
      {menuOpen && <div className="a2-scrim" onClick={() => setMenuOpen(false)} />}
      {menuOpen && (
        <div className="a2-menu">
          <div className="a2-menu-grip" />
          <div className="a2-menu-h">Меню</div>
          <button type="button" className="a2-menu-unit" onClick={() => updateSettings({ units: units === "cm" ? "mm" : "cm" })}>
            <span>Единицы</span><b>{units === "cm" ? "см" : "мм"} · сменить</b>
          </button>
          <div className="a2-menu-cap">Разделы (в этом же приложении)</div>
          {MENU_SECTIONS.map((s) => (
            <button type="button" key={s.k} className="a2-menu-row" onClick={() => { setSectionsTab(s.k); setSectionsOpen(true); setMenuOpen(false); }}>
              <span>{s.label}</span><b>{s.hint} →</b>
            </button>
          ))}
          <div className="a2-menu-cap">Материалы</div>
          {MATS.map((m) => (
            <div className="a2-menu-mat" key={m.k}>
              <span className="a2-menu-dot" style={{ background: m.color }} />
              <span>{m.k} · {m.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ≡ sections slide-over (Материалы[v18] · Кромка · Правила · Библиотеки) */}
      {sectionsOpen && <App2Sections onClose={() => setSectionsOpen(false)} initialTab={sectionsTab} onToast={showToast} />}

      {/* view dropdown (v9 §15.2) */}
      {vopen && <div className="a2-scrim" onClick={() => setVopen(false)} />}
      {vopen && (
        <div className="a2-viewdrop">
          {VIEWS.map((v) => (
            <button key={v.k} type="button" className={activeView === v.k ? "on" : ""} disabled={!v.avail} onClick={() => pickView(v.k)}>
              <span>{v.label}</span>
              {!v.avail && <span className="a2-soon">скоро</span>}
            </button>
          ))}
        </div>
      )}

      {/* right rail: Слои (v9 §15.2). Opens the block's Детали + Кромка panel. */}
      {!layersOpen && (
        <div className="a2-rrail">
          <button type="button" className="a2-rrbtn" onClick={() => setLayersOpen(true)} aria-label="Слои">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>
            <span>Слои{hiddenGroups.length > 0 ? ` · ◎${hiddenGroups.length}` : ""}</span>
          </button>
        </div>
      )}
      {layersOpen && (
        <div className="a2-layers">
          <div className="a2-layers-head">
            <span>Слои · Детали</span>
            <button type="button" onClick={() => setLayersOpen(false)} aria-label="Закрыть">✕</button>
          </div>
          <div className="a2-layers-body">
            {hiddenGroups.length > 0 && (
              <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(148,163,184,.25)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>
                  <span>Скрытые · {hiddenGroups.length}</span>
                  <button type="button" onClick={() => setHiddenGroups([])} style={{ border: "none", background: "transparent", color: "#00AC7A", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Показать все</button>
                </div>
                {hiddenGroups.map((g) => (
                  <div className="layers-part" key={g} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="layers-part-name">◎ {hiddenLabel(g)}</span>
                    <button type="button" onClick={() => setHiddenGroups((prev) => prev.filter((x) => x !== g))} style={{ border: "none", background: "transparent", color: "#00AC7A", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Показать</button>
                  </div>
                ))}
              </div>
            )}
            {partsList.length === 0 && <div className="layers-empty">—</div>}
            {partsList.map((p) => {
              const active = selInfo?.group === p.group;
              return (
                <div className="layers-part" key={p.group} onClick={() => partSelectRef.current?.(p.group)}
                  style={{ cursor: "pointer", background: active ? "rgba(229,72,77,.10)" : undefined, borderRadius: 8, padding: "6px 8px" }}>
                  <span className="layers-part-top">
                    <span className="layers-part-name" style={{ color: active ? "#e5484d" : undefined }}>{p.label}{p.count > 1 ? ` · ${p.count} дет.` : ""}</span>
                    <span className="layers-part-dim">{fmtLen(p.wMm, units)}×{fmtLen(p.hMm, units)}</span>
                  </span>
                  {active && <span className="layers-part-kromka">Кромка: {p.kromka}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* permanent poz card (v9 §15.2, dark glass) — the block's size (W×H×D). The embedded studio hides
          V21's «Студия: W×H×D» header, so this restores that always-visible reference; per-part X/Y/Z is
          the next slice. */}
      <div className="a2-poz">
        {selInfo ? (
          <>
            <div className="a2-poz-t">ДЕТАЛЬ · {lenUnitLabel(units)}</div>
            <div className="a2-poz-nm">{selInfo.label}</div>
            <div className="a2-poz-sub">{selInfo.count > 1 ? `Тип · ${selInfo.count} дет.` : "Уникальная деталь"}</div>
            {selInfo.componentId && (
              <div className="a2-poz-comp">
                🧩 Компонент · {selInfo.componentId}{selInfo.componentPinned ? ` · v${selInfo.componentPinned}` : ""}
                {/* §10.4 · newer version in the library → offer «Обновить» (re-pin). Never automatic. */}
                {selInfo.componentLatest != null && selInfo.componentPinned != null && selInfo.componentLatest > selInfo.componentPinned && (
                  <button type="button" title={`Обновить до v${selInfo.componentLatest} (новая версия в библиотеке)`}
                    onClick={() => { partAcceptUpdateRef.current?.(selInfo.componentLatest!); showToast(`🔄 Обновлено до v${selInfo.componentLatest}`); }}
                    style={{ marginLeft: 8, border: "1px solid var(--accent,#00a961)", background: "color-mix(in srgb, var(--accent,#00a961) 12%, #fff)", color: "var(--accent,#00a961)", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    🔄 v{selInfo.componentLatest} · Обновить
                  </button>
                )}
              </div>
            )}
            <div className="a2-poz-r">Ш <b>{fmtLen(selInfo.wMm, units)}</b></div>
            <div className="a2-poz-r">В <b>{fmtLen(selInfo.hMm, units)}</b></div>
            {/* PER-CELL фасад — front (Дверь/Ящик) tanlanganda SHU frontning uslubini o'zgartiradi. */}
            {selInfo.group && (selInfo.group.startsWith("door@") || selInfo.group.startsWith("drawer@")) && (
              <div className="a2-poz-r" role="button" style={{ cursor: "pointer" }} onClick={() => setFrontEdit("part")}>Фасад <b>{FRONT_LABEL[selInfo.frontProfile ?? frontOf(cab)]}</b></div>
            )}
            <button type="button" className={`a2-poz-acts${partMenuOpen ? " on" : ""}`} onClick={() => setPartMenuOpen((o) => !o)}>⋮ Действия</button>
            {partMenuOpen && (
              <div className="a2-actmenu">
                {selInfo.openable && <button type="button" className="a2-act on" onClick={() => partToggleOpenRef.current?.()}>⇅ Открыть / Закрыть</button>}
                {selInfo.inners?.map((lbl, i) => <button key={i} type="button" className="a2-act on" onClick={() => partInnersRef.current?.[i]?.()}>⇅ {lbl}</button>)}
                {(selInfo.openable || (selInfo.inners?.length ?? 0) > 0) && <div className="a2-act-div" />}
                {selInfo.duplicatable
                  ? <button type="button" className="a2-act on" onClick={() => partDuplicateRef.current?.()}>⧉ Дублировать</button>
                  : <button type="button" className="a2-act soon" onClick={() => showToast("Дублировать — скоро")}>⧉ Дублировать</button>}
                {selInfo.hideable
                  ? <button type="button" className="a2-act on" onClick={() => { partHideRef.current?.(); showToast("Скрыто · «Слои» → Показать"); }}>◎ Скрыть</button>
                  : <button type="button" className="a2-act soon" onClick={() => showToast("Скрыть — скоро")}>◎ Скрыть</button>}
                <button type="button" className="a2-act soon" onClick={() => showToast("Блокировка — скоро")}>🔒 Заблокировать</button>
                <button type="button" className="a2-act soon" onClick={() => showToast("Переименовать — скоро")}>✎ Переименовать</button>
                <button type="button" className="a2-act soon" onClick={() => showToast("Группировать (сохранить как компонент) — у founder")}>🔗 Группировать</button>
                {selInfo.detachable && <button type="button" className="a2-act on" onClick={() => partDetachRef.current?.()}>✂ Разгруппировать{selInfo.boundInner ? ` · внутри: ${selInfo.boundInner}` : ""}</button>}
                {selInfo.deletable && <><div className="a2-act-div" /><button type="button" className="a2-act danger" onClick={() => partDeleteRef.current?.()}>✕ Удалить</button></>}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="a2-poz-t">РАЗМЕР · {lenUnitLabel(units)} · <span style={{ opacity: 0.6 }}>нажмите</span></div>
            <div className="a2-poz-r" role="button" style={{ cursor: "pointer" }} onClick={() => setDimEdit({ axis: "w", label: "Ширина", value: "" })}>Ш <b>{fmtLen(cab.w, units)}</b></div>
            <div className="a2-poz-r" role="button" style={{ cursor: "pointer" }} onClick={() => setDimEdit({ axis: "h", label: "Высота", value: "" })}>В <b>{fmtLen(cab.h, units)}</b></div>
            <div className="a2-poz-r" role="button" style={{ cursor: "pointer" }} onClick={() => setDimEdit({ axis: "depth", label: "Глубина", value: "" })}>Г <b>{fmtLen(cab.depth ?? 560, units)}</b></div>
            <div className="a2-poz-r" role="button" style={{ cursor: "pointer" }} onClick={() => setFrontEdit("cab")}>Фасад <b>{FRONT_LABEL[frontOf(cab)]}</b></div>
          </>
        )}
      </div>

      {/* ★ Сохранить — блокни kutubxonaga. «Мои шкафы» (barcha loyiham) yoki 🔒 «В проект» (shu loyiha).
          🌐 «Глобально» (barcha usta) = server kerak → «скоро», hech qachon soxta emas. */}
      {saveOpen && <div className="a2-scrim" onClick={() => setSaveOpen(false)} />}
      {saveOpen && (
        <div className="scope-modal" onClick={() => setSaveOpen(false)}>
          <div className="scope-card" onClick={(e) => e.stopPropagation()}>
            <div className="scope-title">Сохранить блок</div>
            <input
              className="set-input"
              autoFocus
              value={saveName}
              placeholder="Название блока"
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSave("mine"); }}
            />
            <div className="scope-actions" style={{ flexWrap: "wrap", gap: 8 }}>
              <button className="scope-all" type="button" onClick={() => doSave("mine")}>★ Мои шкафы</button>
              {currentProjectId && <button className="scope-this" type="button" onClick={() => doSave("project")}>🔒 В проект</button>}
              <button className="scope-all" type="button" disabled={publishing} title={loggedIn ? "Опубликовать для ВСЕХ мастеров (проверка §10.3)" : "Нужен вход в приложении"} onClick={doPublishGlobal}>{publishing ? "🌐 Публикую…" : loggedIn ? "🌐 Глобально" : "🌐 Войти для публикации"}</button>
            </div>
            {!loggedIn && <div className="a2-sstub" style={{ padding: "8px 2px 0", fontSize: 12, opacity: 0.75 }}>🔒 Публикация в глобальную библиотеку — после входа (регистрация/вход в приложении).</div>}
          </div>
        </div>
      )}

      {/* РАЗМЕР karta → numpad: shkafning tashqi o'lchamini (w/h/depth) o'zgartiradi (bo'sh shkaf ham). */}
      {dimEdit && <div className="a2-scrim" onClick={() => setDimEdit(null)} />}
      {dimEdit && (() => {
        const key = (d: string) => setDimEdit((n) => (n ? { ...n, value: (n.value + d).slice(0, 5) } : n));
        const apply = () => {
          const raw = Number(dimEdit.value);
          if (raw > 0) {
            const mm = units === "cm" ? Math.round(raw * 10) : Math.round(raw);
            const lim = dimEdit.axis === "w" ? Math.max(150, Math.min(1200, mm)) : dimEdit.axis === "h" ? Math.max(100, Math.min(3000, mm)) : Math.max(200, Math.min(900, mm));
            patchCab({ [dimEdit.axis]: lim });
          }
          setDimEdit(null);
        };
        const nb: React.CSSProperties = { border: "none", background: "#f1f5f9", borderRadius: 12, padding: "16px 0", fontSize: 19, fontWeight: 700, color: "#0f172a", cursor: "pointer" };
        return (
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 130, display: "flex", justifyContent: "center", padding: "0 8px 8px", boxSizing: "border-box" }}>
            <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, boxShadow: "0 -6px 30px rgba(0,0,0,0.22)", padding: "12px 14px 16px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{dimEdit.label}</span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{dimEdit.value || "0"}<span style={{ fontSize: 13, color: "#94a3b8" }}> {lenUnitLabel(units)}</span></span>
                <button type="button" onClick={() => setDimEdit(null)} aria-label="Закрыть" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 34, height: 34, fontSize: 16, color: "#475569", cursor: "pointer", flex: "none" }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (<button key={d} type="button" onClick={() => key(d)} style={nb}>{d}</button>))}
                <button type="button" onClick={() => setDimEdit((n) => (n ? { ...n, value: n.value.slice(0, -1) } : n))} style={nb} aria-label="Стереть">⌫</button>
                <button type="button" onClick={() => key("0")} style={nb}>0</button>
                <button type="button" onClick={apply} style={{ ...nb, background: "#00ac7a", color: "#fff" }}>OK</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* РАЗМЕР karta → «Фасад»: front-profil pikeri (App-2 `Module.front` — Forge/modifiers[] EMAS). numpad
          bilan bir xil pastki-sheet naqshи; tanlansa patchCab({front}) → V21 3D darrov yangilaydi. */}
      {frontEdit && <div className="a2-scrim" onClick={() => setFrontEdit(null)} />}
      {frontEdit && (() => {
        const cur = frontEdit === "part" ? (selInfo?.frontProfile ?? frontOf(cab)) : frontOf(cab);
        const pick = (p: FrontProfile) => { if (frontEdit === "part") partSetFrontRef.current?.(p); else patchCab({ front: p }); setFrontEdit(null); };
        return (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 130, display: "flex", justifyContent: "center", padding: "0 8px 8px", boxSizing: "border-box" }}>
          <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, boxShadow: "0 -6px 30px rgba(0,0,0,0.22)", padding: "12px 14px 16px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{frontEdit === "part" ? "Фасад детали · стиль" : "Фасад · стиль (весь шкаф)"}</span>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => setFrontEdit(null)} aria-label="Закрыть" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 34, height: 34, fontSize: 16, color: "#475569", cursor: "pointer", flex: "none" }}>✕</button>
            </div>
            <div className="pillrow fe-fill" style={{ flexWrap: "wrap", gap: 8 }}>
              {FRONT_PROFILES.map((p) => (
                <button key={p} type="button" className={`chip${cur === p ? " sel" : ""}`} onClick={() => pick(p)}>{FRONT_LABEL[p]}</button>
              ))}
            </div>
          </div>
        </div>
        );
      })()}

      {toast && <div className="a2-toast">{toast}</div>}

      {/* material legend (v9 §15.2) — thin colour bars; tap to expand labels */}
      <div className={`a2-mleg${mlegOpen ? " open" : ""}`} onClick={() => setMlegOpen((o) => !o)}>
        {MATS.map((m) => (
          <div className="a2-mleg-row" key={m.k}>
            <span className="a2-mleg-bar" style={{ background: m.color }} />
            <span className="a2-mleg-lbl">{m.k} · {m.label}</span>
          </div>
        ))}
      </div>

      {/* top-2: operating-mode tabs (CF4 §15.2) */}
      <div className="a2-top2">
        <div className="a2-modetabs">
          {OPMODES.map((m) => (
            <b key={m.k} className={opmode === m.k ? "on" : ""} onClick={() => setOpmode(m.k)}>{m.label}</b>
          ))}
        </div>
      </div>

      {/* op-mode overlays. «Кромка»: a thin, NON-clickable colour legend (K1/K2/∅) — the paint happens by
          tapping edges on the 3D itself (V21 cycles none→K1→K2), so the old bottom sheet is gone and the
          model stays fully visible and tappable. `pointer-events:none` makes the legend purely a colour key
          that never blocks a tap. The full per-role editor still lives in the ≡ menu «Кромка · Jiyak». */}
      {opmode === "kromka" && (
        <div className="a2-kleg" aria-hidden="true">
          <span className="a2-kleg-i"><i style={{ background: "#e2483d" }} />K1</span>
          <span className="a2-kleg-i"><i style={{ background: "#18a999" }} />K2</span>
          <span className="a2-kleg-i"><i style={{ background: "#c9c2b3" }} />∅</span>
          <span className="a2-kleg-h">тапни ребро</span>
        </div>
      )}
      {/* «Узлы»: a thin floating slider dock (v9's jdock), NOT a bottom sheet — the box goes translucent
          (V21 applyUzlyMode) and the System-32 joint markers slide on the model as you drag «отступ». The
          full 14-rule editor stays one tap away in the ≡ menu «Правила · Узлы». */}
      {opmode === "uzly" && (
        <div className="a2-jdock">
          <div className="a2-jdock-r">
            <span className="a2-jdock-t">Узел · отступ System-32</span>
            <b className="a2-jdock-v">{uzlySb ?? settings?.s32FrontRowSetbackMm ?? 65}<i>мм</i></b>
            <button type="button" className="a2-jdock-x" onClick={() => setOpmode("korpus")} aria-label="Закрыть">✕</button>
          </div>
          <input
            className="a2-jdock-s"
            type="range"
            min={20}
            max={80}
            step={1}
            value={uzlySb ?? settings?.s32FrontRowSetbackMm ?? 65}
            onChange={(e) => setUzlySb(Number(e.target.value))}
            onPointerUp={() => { if (uzlySb != null) { updateSettings({ s32FrontRowSetbackMm: uzlySb }); setUzlySb(null); } }}
            onBlur={() => { if (uzlySb != null) { updateSettings({ s32FrontRowSetbackMm: uzlySb }); setUzlySb(null); } }}
          />
          <div className="a2-jdock-h">
            тяни — узлы двигаются на модели ·{" "}
            <button type="button" className="a2-jdock-more" onClick={() => { setSectionsTab("rules"); setSectionsOpen(true); }}>все правила</button>
          </div>
        </div>
      )}
    </div>
  );
}
