import { useEffect, useMemo, useState } from "react";
import { Stage3D } from "../ui/Stage3D";
import { Icon } from "../ui/Icon";
import type { Panel } from "../contract/types";
import { mm10ToMm } from "../contract/types";
import type { ComponentLibraryItem } from "../contract/design";
import { snapBox, type SnapBox } from "./snap";
import { convertToComponent } from "../component/convert";
import type { CarrySpec } from "../component/carry";
import { deriveResolved } from "../component/resolve";
import { checkProfileSwap } from "../component/profileSwap";
import { saveComponent, listComponents, latestVersion, deleteComponent, exportLibrary, importLibrary, getScope, setScope, saveSnapshot, getSnapshot, deleteSnapshot } from "../component/library";
import { publishToGlobal } from "../component/global";
import { getAccessToken } from "../supabase";

const ENVELOPE = { w_mm10: 6000, h_mm10: 7200, d_mm10: 5600 };

const CARRY_THICK = 200;
function carryBoxFor(p: Panel): CarrySpec {
  const ext = { x: p.width, y: p.height, z: p.depth };
  const AX = { width: "x", height: "y", depth: "z" } as const;
  let tw: "x" | "y" | "z";
  if (p.orientation?.xAxis && p.orientation?.yAxis) {
    const face = [p.orientation.xAxis, p.orientation.yAxis];
    const missing = (["width", "height", "depth"] as const).find((d) => !face.includes(d)) ?? "depth";
    tw = AX[missing];
  } else {
    tw = ext.x <= ext.y && ext.x <= ext.z ? "x" : ext.y <= ext.z ? "y" : "z";
  }
  const faceExt = (a: "x" | "y" | "z") => Math.round(ext[a] * 0.4);
  const facePos = (a: "x" | "y" | "z", pos: number) => Math.round(pos + ext[a] * 0.3);
  return {
    w: tw === "x" ? CARRY_THICK : faceExt("x"),
    h: tw === "y" ? CARRY_THICK : faceExt("y"),
    d: tw === "z" ? CARRY_THICK : faceExt("z"),
    x: tw === "x" ? Math.round(p.x + ext.x) : facePos("x", p.x),
    y: tw === "y" ? Math.round(p.y + ext.y) : facePos("y", p.y),
    z: tw === "z" ? Math.round(p.z + ext.z) : facePos("z", p.z)
  };
}
const NO_HOLES: never[] = [];
const LOCK_ALL = ["width", "height", "depth"] as const;
const SNAP_THRESHOLD = 120;
const toSnapBox = (p: {x: number;y: number;z: number;width: number;height: number;depth: number;}): SnapBox => (
  { x: p.x, y: p.y, z: p.z, w: p.width, h: p.height, d: p.depth });

const START: Panel[] = [
{
  id: "P1", name: "P1 · бок", role: "side",
  x: 0, y: 0, z: 0, width: 160, height: 7200, depth: 5600,
  material: "ldsp", bands: [10, 10, 0, 0],
  orientation: { xAxis: "height", yAxis: "depth" }
},
{
  id: "P2", name: "P2 · маленькая", role: "filler",
  x: 2000, y: 0, z: 2000, width: 1200, height: 900, depth: 160,
  material: "ldsp", bands: [10, 0, 10, 0],
  orientation: { xAxis: "width", yAxis: "height" }
},
{
  id: "P3", name: "P3 · щит (фасад)", role: "other",
  x: 500, y: 250, z: 2710, width: 5000, height: 3500, depth: 180,
  material: "ldsp", bands: [10, 10, 10, 10],
  orientation: { xAxis: "width", yAxis: "height" }
}];

function loadStart(): Panel[] {
  try {
    const raw = (globalThis as unknown as { localStorage?: Storage }).localStorage?.getItem("forge.demoPanels");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed as Panel[];
    }
  } catch {}
  return START;
}

interface EditorSnapshot {
  panels: Panel[];
  rounds: Record<string, Record<string, number>>;
  chamfers: Record<string, Record<string, {width: number;depth: number;}>>;
  notches: Record<string, Record<string, {width: number;depth: number;radius: number;pos: number;lockL: boolean;lockR: boolean;}>>;
  windows: Record<string, {w: number;h: number;radius: number;cx: number;cy: number;lockT: boolean;lockR: boolean;lockB: boolean;lockL: boolean;}[]>;
  viyemkas: Record<string, Record<string, {pos: number;width: number;depth: number;run: number;rule: "fixed" | "ratio" | "locked";}>>;
  laminate: Record<string, 2 | 3>;
  carries: Record<string, CarrySpec[]>;
}

function thumbRects(item: ComponentLibraryItem): {x: number;y: number;w: number;h: number;}[] {
  const boxes = (item.root.children ?? []).
  filter((k) => k.size && k.pos).
  map((k) => ({ cx: k.pos!.x_mm10 ?? 0, cy: k.pos!.y_mm10 ?? 0, w: k.size!.w_mm10 ?? 0, h: k.size!.h_mm10 ?? 0 }));
  if (!boxes.length) return [];
  let minX = Infinity,maxX = -Infinity,minY = Infinity,maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.cx - b.w / 2);maxX = Math.max(maxX, b.cx + b.w / 2);
    minY = Math.min(minY, b.cy - b.h / 2);maxY = Math.max(maxY, b.cy + b.h / 2);
  }
  const bw = Math.max(1, maxX - minX),bh = Math.max(1, maxY - minY);
  const scale = 34 / Math.max(bw, bh);
  const ox = (40 - bw * scale) / 2,oy = (40 - bh * scale) / 2;
  return boxes.map((b) => ({
    x: ox + (b.cx - b.w / 2 - minX) * scale,
    y: oy + (maxY - (b.cy + b.h / 2)) * scale,
    w: Math.max(1.5, b.w * scale),
    h: Math.max(1.5, b.h * scale)
  }));
}

export function Harness() {
  const [panels, setPanels] = useState<Panel[]>(loadStart);
  const [panelSeq, setPanelSeq] = useState(1);
  const [compSeq, setCompSeq] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>("P1");
  const [selectedSide, setSelectedSide] = useState<string | null>(null);
  const [mode, setMode] = useState<"translate" | "resize" | "rotate" | "modifier" | "measure">("translate");
  const [panelOpen, setPanelOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [snapHint, setSnapHint] = useState<{box: {x: number;y: number;z: number;w: number;h: number;d: number;};axes: {x: boolean;y: boolean;z: boolean;};gap: number;contact: {x: number;y: number;z: number;};} | null>(null);
  const [libItems, setLibItems] = useState<ComponentLibraryItem[]>([]);
  const [libTab, setLibTab] = useState<"local" | "global">("local");
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => setLibItems(listComponents()), []);
  useEffect(() => {getAccessToken().then((t) => setAuthed(!!t)).catch(() => setAuthed(false));}, []);

  const [rounds, setRounds] = useState<Record<string, Record<string, number>>>({});

  const [chamfers, setChamfers] = useState<Record<string, Record<string, {width: number;depth: number;}>>>({});

  const [notches, setNotches] = useState<Record<string, Record<string, {width: number;depth: number;radius: number;pos: number;lockL: boolean;lockR: boolean;}>>>({});

  const [windows, setWindows] = useState<Record<string, {w: number;h: number;radius: number;cx: number;cy: number;lockT: boolean;lockR: boolean;lockB: boolean;lockL: boolean;}[]>>({});

  const [viyemkas, setViyemkas] = useState<Record<string, Record<string, {pos: number;width: number;depth: number;run: number;rule: "fixed" | "ratio" | "locked";}>>>({});

  const [laminate, setLaminate] = useState<Record<string, 2 | 3>>({});

  const [carries, setCarries] = useState<Record<string, CarrySpec[]>>({});

  const say = (m: string) => setLog((l) => [m, ...l].slice(0, 24));
  const selected = panels.find((p) => p.id === selectedId) ?? null;

  const handles = useMemo(() => {
    if (!selected) return [];
    const c = {
      x: selected.x + selected.width / 2,
      y: selected.y + selected.height / 2,
      z: selected.z + selected.depth / 2
    };
    const AX = { width: "x", height: "y", depth: "z" } as const;
    const faceAxes: ("width" | "height" | "depth")[] = selected.orientation ?
    [selected.orientation.xAxis, selected.orientation.yAxis] :
    (() => {
      const dims = [["width", selected.width], ["height", selected.height], ["depth", selected.depth]] as const;
      const thin = dims.reduce((a, b) => b[1] < a[1] ? b : a)[0];
      return (["width", "height", "depth"] as const).filter((d) => d !== thin);
    })();
    const out: {id: string;x: number;y: number;z: number;axis: "x" | "y" | "z";}[] = [];
    for (const fa of faceAxes) {
      const axis = AX[fa];
      const lo = { ...c };
      const hi = { ...c };
      if (fa === "width") {lo.x = selected.x;hi.x = selected.x + selected.width;} else
      if (fa === "height") {lo.y = selected.y;hi.y = selected.y + selected.height;} else
      {lo.z = selected.z;hi.z = selected.z + selected.depth;}
      out.push({ id: `${axis}Min`, x: lo.x, y: lo.y, z: lo.z, axis });
      out.push({ id: `${axis}Max`, x: hi.x, y: hi.y, z: hi.z, axis });
    }
    return out;
  }, [selected]);

  const appliedRounds = useMemo(
    () => Object.entries(rounds[selectedId ?? ""] ?? {}).map(([cornerId, radius]) => ({ cornerId, radius })),
    [rounds, selectedId]
  );
  const appliedChamfers = useMemo(
    () => Object.entries(chamfers[selectedId ?? ""] ?? {}).map(([edgeId, v]) => ({ edgeId, width: v.width, depth: v.depth })),
    [chamfers, selectedId]
  );
  const appliedNotches = useMemo(
    () => Object.entries(notches[selectedId ?? ""] ?? {}).map(([edgeId, v]) => ({ edgeId, width: v.width, depth: v.depth, radius: v.radius, pos: v.pos, lockL: v.lockL, lockR: v.lockR })),
    [notches, selectedId]
  );
  const appliedWindows = useMemo(() => windows[selectedId ?? ""] ?? [], [windows, selectedId]);
  const appliedViyemkas = useMemo(
    () => Object.entries(viyemkas[selectedId ?? ""] ?? {}).map(([edgeId, v]) => ({ edgeId, pos: v.pos, width: v.width, depth: v.depth, run: v.run, rule: v.rule })),
    [viyemkas, selectedId]
  );
  const laminateBadges = useMemo(
    () => panels.filter((p) => laminate[p.id]).map((p) => {
      const n = laminate[p.id];
      const faceAxes: ("width" | "height" | "depth")[] = p.orientation ?
      [p.orientation.xAxis, p.orientation.yAxis] :
      (() => {
        const dims = [["width", p.width], ["height", p.height], ["depth", p.depth]] as const;
        const thin = dims.reduce((a, b) => b[1] < a[1] ? b : a)[0];
        return (["width", "height", "depth"] as const).filter((d) => d !== thin);
      })();
      const tdim = (["width", "height", "depth"] as const).find((d) => !faceAxes.includes(d)) ?? "depth";
      const thick = tdim === "width" ? p.width : tdim === "height" ? p.height : p.depth;
      const resultMm = mm10ToMm(thick * n);
      return {
        id: `lam_${p.id}`,
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        z: p.z + p.depth / 2,
        node: <span style={{ background: "#7c3aed", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>⧉ {n}× · {resultMm}мм</span>
      };
    }),
    [panels, laminate]
  );

  const panelCuts = useMemo(() => {
    const out: Record<string, {windows: {w: number;h: number;radius: number;cx: number;cy: number;}[];rounds: {cornerId: string;radius: number;}[];notches: {edgeId: string;width: number;depth: number;radius: number;pos: number;}[];chamfers: {edgeId: string;width: number;depth: number;}[];viyemkas: {edgeId: string;pos: number;width: number;depth: number;run: number;rule: "fixed" | "ratio" | "locked";}[];laminate?: 2 | 3;}> = {};
    for (const p of panels) {
      out[p.id] = {
        windows: windows[p.id] ?? [],
        rounds: Object.entries(rounds[p.id] ?? {}).map(([cornerId, radius]) => ({ cornerId, radius })),
        notches: Object.entries(notches[p.id] ?? {}).map(([edgeId, v]) => ({ edgeId, width: v.width, depth: v.depth, radius: v.radius, pos: v.pos })),
        chamfers: Object.entries(chamfers[p.id] ?? {}).map(([edgeId, v]) => ({ edgeId, width: v.width, depth: v.depth })),
        viyemkas: Object.entries(viyemkas[p.id] ?? {}).map(([edgeId, v]) => ({ edgeId, pos: v.pos, width: v.width, depth: v.depth, run: v.run, rule: v.rule })),
        laminate: laminate[p.id]
      };
    }
    return out;
  }, [panels, rounds, notches, chamfers, windows, viyemkas, laminate]);

  const move = (id: string, x: number, y: number, z: number) => {
    setPanels((ps) => ps.map((p) => p.id === id ? { ...p, x, y, z } : p));
  };

  const computeSnap = (id: string, x: number, y: number, z: number) => {
    const p = panels.find((pp) => pp.id === id);
    if (!p) return null;
    const dragged: SnapBox = { x, y, z, w: p.width, h: p.height, d: p.depth };
    const others = panels.filter((pp) => pp.id !== id).map(toSnapBox);
    if (!others.length) return null;
    const r = snapBox(dragged, others, SNAP_THRESHOLD);
    if (!r.snapped.x && !r.snapped.y && !r.snapped.z) return null;
    const gap = Math.round(Math.max(
      r.snapped.x ? Math.abs(r.x - x) : 0,
      r.snapped.y ? Math.abs(r.y - y) : 0,
      r.snapped.z ? Math.abs(r.z - z) : 0
    ));
    return {
      pos: { x: r.x, y: r.y, z: r.z },
      hint: {
        box: { x: r.x, y: r.y, z: r.z, w: p.width, h: p.height, d: p.depth },
        axes: r.snapped,
        gap,
        contact: { x: r.x + p.width / 2, y: r.y + p.height / 2, z: r.z + p.depth / 2 }
      }
    };
  };

  const resizeSide = (patch: {x: number;y: number;z: number;width?: number;height?: number;depth?: number;}) => {
    setPanels((ps) => ps.map((p) => {
      if (p.id !== selectedId) return p;
      const faceAxes: ("width" | "height" | "depth")[] = p.orientation ?
      [p.orientation.xAxis, p.orientation.yAxis] :
      (() => {
        const dims = [["width", p.width], ["height", p.height], ["depth", p.depth]] as const;
        const thin = dims.reduce((a, b) => b[1] < a[1] ? b : a)[0];
        return (["width", "height", "depth"] as const).filter((d) => d !== thin);
      })();
      const next = { ...p, x: patch.x, y: patch.y, z: patch.z };
      for (const fa of ["width", "height", "depth"] as const) {
        if (patch[fa] !== undefined && faceAxes.includes(fa)) next[fa] = Math.max(50, patch[fa] as number);
      }
      return next;
    }));
  };

  const cycleLaminate = () => {
    if (!selectedId) return;
    setLaminate((prev) => {
      const cur = prev[selectedId];
      const next: 2 | 3 | undefined = cur === undefined ? 2 : cur === 2 ? 3 : undefined;
      const out = { ...prev };
      if (next === undefined) delete out[selectedId];else
      out[selectedId] = next;
      say(`bind ${selectedId} → ${next ? `${next}×16` : "off"}`);
      return out;
    });
  };

  const removeComponent = (componentId: string, version: number) => {
    deleteComponent(componentId, version);
    deleteSnapshot(componentId, version);
    setLibItems(listComponents());
    say(`✕ удалён`);
  };

  const exportLib = () => {
    const json = exportLibrary();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forge-library.json";
    a.click();
    URL.revokeObjectURL(url);
    say(`⬇ экспорт: ${listComponents().length} компонент`);
  };
  const importLib = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const items = importLibrary(String(reader.result));
        setLibItems(listComponents());
        say(`⬆ импорт: ${items.length} компонент`);
      } catch (err) {
        say(`✗ импорт: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const cycleCarry = () => {
    if (!selected) return;
    setCarries((prev) => {
      const cur = prev[selected.id] ?? [];
      if (cur.length >= 3) {
        const out = { ...prev };
        delete out[selected.id];
        say(`carry ${selected.id} → 0`);
        return out;
      }
      const box: CarrySpec = carryBoxFor(selected);
      const next = [...cur, box];
      say(`carry ${selected.id} → ${next.length}`);
      return { ...prev, [selected.id]: next };
    });
  };

  const addPanel = (kind: "vertical" | "horizontal" | "front") => {
    const id = `add${panelSeq}`;
    setPanelSeq((s) => s + 1);
    const off = panels.length * 400;
    const common = { id, name: kind === "vertical" ? `Стойка ${panelSeq}` : kind === "horizontal" ? `Полка ${panelSeq}` : `Фасад ${panelSeq}`, material: "ldsp", bands: [10, 10, 10, 10] as [number, number, number, number] };
    const p: Panel =
    kind === "vertical" ? { ...common, role: "side", x: off, y: 0, z: 0, width: 160, height: 7000, depth: 3000, orientation: { xAxis: "height", yAxis: "depth" } } :
    kind === "horizontal" ? { ...common, role: "shelf", x: 0, y: off, z: 0, width: 6000, height: 160, depth: 3000, orientation: { xAxis: "width", yAxis: "depth" } } :
    { ...common, role: "door", x: 0, y: 0, z: 3000 + off, width: 6000, height: 3500, depth: 160, orientation: { xAxis: "width", yAxis: "height" } };
    setPanels((ps) => [...ps, p]);
    setSelectedId(id);
    setSelectedSide(null);
    say(`+ ${kind === "vertical" ? "стойка" : kind === "horizontal" ? "полка" : "фасад"}: ${id}`);
  };

  const deletePanel = () => {
    if (!selectedId) return;
    const del = selectedId;
    setPanels((ps) => ps.filter((p) => p.id !== del));
    setSelectedId(null);
    setSelectedSide(null);
    say(`✕ панель ${del}`);
  };

  const convertComponent = () => {
    const seq = compSeq;
    setCompSeq((s) => s + 1);
    const cid = `comp-${Date.now().toString(36)}`;
    const name = `Компонент ${seq}`;
    const cuts = panels.map((p) => panelCuts[p.id]);
    const carryList = panels.map((p) => carries[p.id]);
    const meta = { componentId: cid, name, author: "usta", rootKind: "group" as const, prevVersion: latestVersion(cid), profileId: "qorasu_eman_2026_07", createdAt: new Date().toISOString() };
    const item = convertToComponent(panels, meta, cuts, carryList);
    const swap = checkProfileSwap(panels, meta, cuts);
    saveComponent(item);
    saveSnapshot(cid, item.version, { panels, rounds, chamfers, notches, windows, viyemkas, laminate, carries });
    setLibItems(listComponents());
    setLibTab("local");
    const mods = (item.root.children ?? []).reduce((a, c) => a + (c.modifiers?.length ?? 0), 0);
    const carryCount = (item.root.children ?? []).reduce((a, c) => a + (c.children?.length ?? 0), 0);
    const resolved = deriveResolved(item).length;
    const fitTxt = item.fit ? ` · fit W ${mm10ToMm(item.fit.minW_mm10)}–${mm10ToMm(item.fit.maxW_mm10)}mm` : "";
    say(`✓ ${name} · gate ${item.gate.ok ? "OK" : `FAIL(${item.gate.failures.length})`} · psw ${swap.length === 0 ? "OK" : `✗${swap.length}`} · ${item.root.children?.length ?? 0} дет · ${mods} mod · ${carryCount} carry · ${resolved} res${fitTxt}`);
  };

  const openComponent = (it: ComponentLibraryItem) => {
    const snap = getSnapshot<EditorSnapshot>(it.componentId, it.version);
    if (!snap) {
      say(`⚠ ${it.name}: нет исходника (создан вне этого сеанса)`);
      return;
    }
    setPanels(snap.panels);
    setRounds(snap.rounds ?? {});
    setChamfers(snap.chamfers ?? {});
    setNotches(snap.notches ?? {});
    setWindows(snap.windows ?? {});
    setViyemkas(snap.viyemkas ?? {});
    setLaminate(snap.laminate ?? {});
    setCarries(snap.carries ?? {});
    setSelectedId(snap.panels[0]?.id ?? null);
    setSelectedSide(null);
    setMode("translate");
    say(`↧ открыт: ${it.name} · ${snap.panels.length} дет`);
  };

  const publishComponent = async (componentId: string, version: number) => {
    const it = listComponents().find((c) => c.componentId === componentId && c.version === version);
    if (!it) return;
    if (!it.gate.ok) {
      say(`✗ gate FAIL — публикация отклонена (${it.gate.failures.length})`);
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setAuthed(false);
      say("🔐 Войдите в приложении (App-1) — публикация недоступна");
      return;
    }
    setAuthed(true);
    say(`… публикация ${it.name}`);
    const r = await publishToGlobal(it, it.name, { token });
    if (r.ok) {
      setScope(componentId, version, "global");
      setLibItems(listComponents());
      say(`🌐 опубликован: ${it.name} · id ${r.id ? r.id.slice(0, 8) : "?"}`);
    } else {
      say(`✗ ${r.code}: ${r.reason}`);
    }
  };

  return (
    <div className="studio">
      <header className="studio-bar">
        <span className="studio-brand">Forge UI</span>
        <span className="studio-mode">харнесс · без движка</span>
      </header>

      <main className="studio-stage">
        <Stage3D
          panels={panels}
          holes={NO_HOLES}
          selectedPanelId={selectedId}
          onSelectPanel={(id) => {setSelectedId(id);setSelectedSide(null);setMode((m) => m === "resize" ? "translate" : m);say(`select ${id ?? "—"}`);}}
          onDragPanel={(id, x, y, z, rx, ry, rz) => {
            const s = rx || ry || rz ? null : computeSnap(id, x, y, z);
            const fx = s ? s.pos.x : x,fy = s ? s.pos.y : y,fz = s ? s.pos.z : z;
            setPanels((ps) => ps.map((p) => p.id === id ? { ...p, x: fx, y: fy, z: fz, rx, ry, rz } : p));
            setSnapHint(null);
            const rot = ([["rx", rx], ["ry", ry], ["rz", rz]] as const).
            filter(([, v]) => v).map(([k, v]) => `${k}=${Math.round((v as number) * 180 / Math.PI)}°`).join(" ");
            say(`drop ${id} → ${mm10ToMm(fx)},${mm10ToMm(fy)},${mm10ToMm(fz)}мм${s ? " 🧲" : ""}${rot ? " · " + rot : ""}`);
          }}
          onLiveDragPanel={(id, x, y, z) => {
            move(id, x, y, z);
            const s = mode === "rotate" ? null : computeSnap(id, x, y, z);
            setSnapHint(s ? s.hint : null);
          }}
          snapHint={snapHint}
          onUpdateDim={() => {}}
          transformMode={mode === "rotate" ? "rotate" : "translate"}
          showTargets={mode === "modifier"}
          showGizmo={mode === "translate" || mode === "rotate"}
          showMeasure={mode === "measure"}
          onPickTarget={(c) => say(`target ${c}`)}
          onApplyRound={(corners, r) => {
            const pid = selectedId ?? "";
            setRounds((prev) => {
              const cur = { ...(prev[pid] ?? {}) };
              for (const c of corners) {if (r > 0) cur[c] = r;else delete cur[c];}
              return { ...prev, [pid]: cur };
            });
            say(`round ${corners.join(",")} r=${mm10ToMm(r)}мм`);
          }}
          appliedRounds={appliedRounds}
          onApplyChamfer={(edgeIds, w, d) => {
            const pid = selectedId ?? "";
            setChamfers((prev) => {
              const cur = { ...(prev[pid] ?? {}) };
              for (const e of edgeIds) {if (w > 0) cur[e] = { width: w, depth: d };else delete cur[e];}
              return { ...prev, [pid]: cur };
            });
            say(`chamfer ${edgeIds.join(",")} w=${mm10ToMm(w)} d=${mm10ToMm(d)}мм`);
          }}
          appliedChamfers={appliedChamfers}
          onApplyNotch={(edgeId, w, d, r, pos, lockL, lockR) => {
            const pid = selectedId ?? "";
            setNotches((prev) => {
              const cur = { ...(prev[pid] ?? {}) };
              if (w > 0) cur[edgeId] = { width: w, depth: d, radius: r, pos, lockL, lockR };else delete cur[edgeId];
              return { ...prev, [pid]: cur };
            });
            say(`notch ${edgeId} w=${mm10ToMm(w)} d=${mm10ToMm(d)} r=${mm10ToMm(r)}мм${lockL ? " L🔒" : ""}${lockR ? " R🔒" : ""}`);
          }}
          appliedNotches={appliedNotches}
          onApplyViyemka={(edgeId, pos, width, depth, run, rule) => {
            const pid = selectedId ?? "";
            setViyemkas((prev) => {
              const cur = { ...(prev[pid] ?? {}) };
              if (width > 0) cur[edgeId] = { pos, width, depth, run, rule };else delete cur[edgeId];
              return { ...prev, [pid]: cur };
            });
            say(`viyemka ${edgeId} w=${mm10ToMm(width)} d=${mm10ToMm(depth)} run=${mm10ToMm(run)}мм [${rule}]`);
          }}
          appliedViyemkas={appliedViyemkas}
          carries={selectedId ? carries[selectedId] : undefined}
          onApplyCarry={(idx, w, h, d, x, y, z) => {
            const pid = selectedId;
            if (!pid) return;
            setCarries((prev) => {
              const arr = [...(prev[pid] ?? [])];
              if (w <= 0) {if (idx >= 0 && idx < arr.length) arr.splice(idx, 1);} else
              if (idx < 0 || idx >= arr.length) arr.push({ w, h, d, x, y, z });else
              arr[idx] = { w, h, d, x, y, z };
              const cur = { ...prev };
              if (arr.length) cur[pid] = arr;else delete cur[pid];
              return cur;
            });
            say(`carry[${idx}] ${w <= 0 ? "✕" : `${mm10ToMm(w)}×${mm10ToMm(h)}×${mm10ToMm(d)}`}`);
          }}
          annotations={laminateBadges}
          onApplyWindow={(idx, w, h, radius, cx, cy, lockT, lockR, lockB, lockL) => {
            const pid = selectedId ?? "";
            setWindows((prev) => {
              const arr = [...(prev[pid] ?? [])];
              if (w <= 0) {if (idx >= 0 && idx < arr.length) arr.splice(idx, 1);} else
              if (idx < 0 || idx >= arr.length) arr.push({ w, h, radius, cx, cy, lockT, lockR, lockB, lockL });else
              arr[idx] = { w, h, radius, cx, cy, lockT, lockR, lockB, lockL };
              const cur = { ...prev };
              if (arr.length) cur[pid] = arr;else delete cur[pid];
              return cur;
            });
            say(`window[${idx}] ${mm10ToMm(w)}×${mm10ToMm(h)} r=${mm10ToMm(radius)}мм${lockT || lockR || lockB || lockL ? " 🔒" : ""}`);
          }}
          appliedWindows={appliedWindows}
          panelCuts={panelCuts}
          envelope={ENVELOPE}
          lockedDims={LOCK_ALL}
          handles={mode === "resize" ? handles : []}
          showResizeGrips={mode === "translate" && !!selectedId}
          onEnterResize={() => setMode("resize")}
          selectedHandleId={selectedSide}
          onSelectHandle={(id) => {setSelectedSide(id);say(`side ${id ?? "—"}`);}}
          onDragHandle={(id, patch) => {
            resizeSide(patch);
            const v = patch.width ?? patch.height ?? patch.depth;
            say(`resize ${id}${v !== undefined ? ` → ${mm10ToMm(v)}мм` : ""}`);
          }} />

        <button className="panel-toggle" onClick={() => setPanelOpen((o) => !o)} title="Тест-панель">{panelOpen ? <Icon name="close" size={18} /> : <Icon name="menu" size={18} />}</button>
        <aside className={`controls-card${panelOpen ? " open" : ""}`}>
          <div className="controls-section">
            <div className="controls-head"><Icon name="panels" size={14} /><span className="controls-title">Панели</span></div>
            <div className="forge-panel-list">
              {panels.map((p) =>
              <button key={p.id}
              className={`forge-chip ${p.id === selectedId ? "on" : ""}`}
              onClick={() => {setSelectedId(p.id);setSelectedSide(null);}}>
                  {p.name}
                </button>
              )}
            </div>
            <div className="forge-actions" style={{ marginTop: 6 }}>
              <button className="forge-chip add" onClick={() => addPanel("vertical")} title="Добавить вертикальную панель (стойка/бок)"><Icon name="plus" /> Стойка</button>
              <button className="forge-chip add" onClick={() => addPanel("horizontal")} title="Добавить горизонтальную панель (полка)"><Icon name="plus" /> Полка</button>
              <button className="forge-chip add" onClick={() => addPanel("front")} title="Добавить фасад (лицевая панель)"><Icon name="plus" /> Фасад</button>
            </div>
            <button className="forge-chip danger wide" style={{ marginTop: 6 }} onClick={deletePanel} disabled={!selectedId} title="Удалить выбранную панель"><Icon name="trash" size={14} /> Удалить</button>
            <div className="forge-seg-grid" style={{ marginTop: 8 }}>
              <button className={`forge-seg ${mode === "translate" || mode === "resize" ? "on" : ""}`}
              onClick={() => {setMode("translate");setSelectedSide(null);}}><Icon name="move" /> Двигать</button>
              <button className={`forge-seg ${mode === "rotate" ? "on" : ""}`}
              onClick={() => {setMode("rotate");setSelectedSide(null);}}><Icon name="rotate" /> Поворот</button>
              <button className={`forge-seg ${mode === "modifier" ? "on" : ""}`}
              onClick={() => {setMode("modifier");setSelectedSide(null);}}><Icon name="modifier" /> Модификатор</button>
              <button className={`forge-seg ${mode === "measure" ? "on" : ""}`}
              onClick={() => {setMode("measure");setSelectedSide(null);}}><Icon name="ruler" /> Измерить</button>
            </div>
            <div className="forge-note">
              «маленькая» — специально мелкая: именно на таких кубики граней и стрелки
              перемещения конфликтуют. Проверяйте жесты на ней.
            </div>
          </div>

          <div className="controls-section separator">
            <div className="controls-head"><Icon name="layers" size={14} /><span className="controls-title">Ламинация</span></div>
            <div className="forge-panel-list">
              <button
                className={`forge-chip ${laminate[selectedId ?? ""] ? "on" : ""}`}
                onClick={cycleLaminate}
                disabled={!selectedId}>
                <Icon name="layers" /> Bind {laminate[selectedId ?? ""] ? `${laminate[selectedId ?? ""]}×16` : "—"}
              </button>
              <button
                className={`forge-chip ${(carries[selectedId ?? ""]?.length ?? 0) > 0 ? "on" : ""}`}
                onClick={cycleCarry}
                disabled={!selectedId}>
                <Icon name="carry" /> Carry{carries[selectedId ?? ""]?.length ? ` ×${carries[selectedId ?? ""].length}` : ""}
              </button>
            </div>
            <div className="forge-note">
              Выбери панель → нажимай: — → 2× → 3× → —. Намерение (слои), не операция; распил делает App-2.
            </div>
          </div>

          <div className="controls-section separator">
            <div className="controls-head"><Icon name="package" size={14} /><span className="controls-title">Создать</span></div>
            <button className="forge-chip primary wide" onClick={convertComponent}><Icon name="package" /> Собрать компонент</button>
          </div>

          <div className="controls-section separator">
            <div className="lib-head">
              <Icon name="panels" size={14} />
              <span className="controls-title">Библиотека</span>
              <span className="lib-count">{libItems.length}</span>
              <span className="lib-io">
                <button onClick={exportLib} disabled={libItems.length === 0} title="Экспорт JSON"><Icon name="download" size={13} /></button>
                <label title="Импорт JSON">
                  <Icon name="upload" size={13} />
                  <input type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => {const f = e.target.files?.[0];if (f) importLib(f);e.target.value = "";}} />
                </label>
              </span>
            </div>
            <div className="forge-seg-grid">
              <button className={`forge-seg ${libTab === "local" ? "on" : ""}`} onClick={() => setLibTab("local")}><Icon name="lock" size={13} /> Мои</button>
              <button className={`forge-seg ${libTab === "global" ? "on" : ""}`} onClick={() => setLibTab("global")}><Icon name="globe" size={13} /> Общие</button>
            </div>
            {authed === false && libTab === "global" && <div className="forge-note" style={{ color: "var(--danger)" }}>🔐 Войдите в приложении (App-1) — публикация недоступна</div>}
            {(() => {
              const shown = libItems.filter((it) => getScope(it.componentId, it.version) === libTab);
              if (!shown.length) return <div className="lib-empty">— {libTab === "local" ? "ваших" : "общих"} компонентов нет —</div>;
              return (
                <div className="lib-cards">
                  {shown.map((it) => {
                    const parts = it.root.children?.length ?? 0;
                    const rects = thumbRects(it);
                    const hasSrc = getSnapshot(it.componentId, it.version) !== null;
                    return (
                      <div key={`${it.componentId}:${it.version}`} className="lib-card">
                          <div className="lib-top">
                            <div className="lib-thumb">
                              <svg viewBox="0 0 40 40" aria-hidden="true">
                                {rects.length ?
                              rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="0.8" fill="none" stroke="var(--accent)" strokeWidth="1.5" />) :
                              <rect x="10" y="10" width="20" height="20" rx="2" fill="none" stroke="var(--line)" strokeWidth="1.5" />}
                              </svg>
                            </div>
                            <div className="lib-meta">
                              <div className="lib-name-row">
                                <span className="lib-name">{it.name}</span>
                                <span className="lib-ver">v{it.version}</span>
                                <span className={`lib-gate ${it.gate.ok ? "ok" : "bad"}`}>{it.gate.ok ? "✓ готово" : `✗ ${it.gate.failures.length}`}</span>
                              </div>
                              <div className="lib-sub">{libTab === "global" ? `🌐 ${it.author}${it.createdAt ? ` · ${it.createdAt.slice(8, 10)}.${it.createdAt.slice(5, 7)}` : ""}` : `▤ ${parts} дет · ЛДСП`}</div>
                            </div>
                          </div>
                          <div className="lib-acts">
                            <button className="lib-open" onClick={() => openComponent(it)} disabled={!hasSrc} title={hasSrc ? "Открыть в сцене" : "Нет исходника (импорт/другой сеанс)"}><Icon name="download" size={14} /> Открыть</button>
                            {libTab === "local" &&
                          <button className="lib-pub" onClick={() => publishComponent(it.componentId, it.version)} title="Опубликовать (Общие)"><Icon name="globe" size={14} /></button>}
                            <button className="lib-del" onClick={() => removeComponent(it.componentId, it.version)} title="Удалить"><Icon name="trash" size={14} /></button>
                          </div>
                        </div>);

                  })}
                </div>);

            })()}
          </div>

        </aside>

        <div className={`event-dock${logOpen ? " open" : ""}`}>
          <button className="event-toggle" onClick={() => setLogOpen((o) => !o)} title="События — что нажато / что сделано">
            <Icon name="menu" size={14} />
            <span className="event-latest">{log[0] ?? "События"}</span>
            {log.length > 0 && <span className="event-count">{log.length}</span>}
          </button>
          {logOpen &&
          <div className="event-list">
              {log.length === 0 ? <div className="forge-note">— пока пусто —</div> :
            log.map((l, i) => <div className="event-row" key={i}>{l}</div>)}
            </div>
          }
        </div>
      </main>
    </div>);

}
