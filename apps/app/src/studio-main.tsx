import React from "react";
import { createRoot } from "react-dom/client";
import { useStore } from "./store";
import { App2Shell } from "./app2/App2Shell";
import { mk } from "./model/cabinet";
import "./styles.css";

// ── Standalone App-2 (Конструктор / Блок) ──────────────────────────────────────
// This is the SEPARATE studio page (studio.html). It mounts ONLY the isolated App-2
// surface — the main app (index.html → App.tsx) is untouched. Everything here is
// IMPORTED from shared code; nothing existing is modified.
//
// Seed ONE ready, bare cabinet into the store so the page opens directly on a block
// ready to edit (the founder's «tayyor bosh shkaf»). V21 reads `cabs` from the store
// and live-patches by index, so the seed must live in the store at index 0 — not in
// local React state.
useStore.setState({
  // §A-TEST · «Стеллаж» — a 1:1 structural rebuild of the reference photo (2026-09-01): a wide,
  // wall-height OPEN shelving unit — 5 columns of STAGGERED open compartments (no doors/drawers).
  // Exercises the studio's cols→rows nesting + open-cell rendering on a large, irregular block.
  // (Previous nested-drawer/component demo lives in git history if that path needs re-testing.)
  cabs: [mk({
    kind: "tall", w: 2400, h: 2200, depth: 320, fill: "shelves", count: 0, door: 0,
    layout: {
      split: "cols",
      sizes: [0.20, 0.20, 0.14, 0.23, 0.23],
      children: [
        { split: "rows", sizes: [0.26, 0.25, 0.25, 0.24], children: [{}, {}, {}, {}] },
        { split: "rows", sizes: [0.20, 0.30, 0.25, 0.25], children: [{}, {}, {}, {}] },
        { split: "rows", sizes: [0.42, 0.32, 0.26], children: [{}, {}, {}] },
        { split: "rows", sizes: [0.30, 0.24, 0.22, 0.24], children: [{}, {}, {}, {}] },
        { split: "rows", sizes: [0.28, 0.22, 0.26, 0.24], children: [{}, {}, {}, {}] },
      ],
    },
  })],
  selIdx: 0,
  // A demo project id so the standalone studio can exercise the «Локальные» (project-scoped) block section
  // — 🔒 «В проект» saves bind here; «Мои шкафы» (mine) stays visible across every project.
  currentProjectId: "studio-demo",
});

function StudioApp() {
  const cabs = useStore((s) => s.cabs);
  const patchCab = useStore((s) => s.patchCab);
  const settings = useStore((s) => s.settings);
  const runStyle = useStore((s) => s.runStyle);
  const cab = cabs[0];
  if (!cab) return null;
  // Same wiring the main app uses to mount the studio (ConfigScreen.tsx) — the cab lives
  // at index 0, so live edits patch cabs[0]. onClose is a no-op: standalone, there is
  // nothing to close back to.
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <App2Shell
        cab={cab}
        patchCab={(patch) => patchCab(0, patch)}
        settings={settings}
        style={runStyle}
      />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
createRoot(root).render(
  <React.StrictMode>
    <StudioApp />
  </React.StrictMode>,
);
