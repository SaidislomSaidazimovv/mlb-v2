// T13 — Yagona inspektor. ASOS: 54§3 T13 gate ("har ko'rsatilgan qiymat O'Z QOIDASINI nomlaydi; bitta
// ekran, har qaror"). §2 API (derive) orqali — har qiymat provenans bilan keladi (50 Law E).
import { useState } from "react";
import { derive } from "../index.ts";
import type { Sheet, Profile } from "../index.ts";
import { PAL, ROLE_COLOR } from "./view.ts";

function Row({ label, value, rule }: { label: string; value: string; rule: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, padding: "6px 0", borderBottom: `1px solid ${PAL.line}` }}>
      <div style={{ color: PAL.dim, fontSize: 12 }}>{label}</div>
      <div>
        <div style={{ color: PAL.ink, fontSize: 13, fontFamily: "monospace" }}>{value}</div>
        <div style={{ color: PAL.accent, fontSize: 11 }}>↳ {rule}</div>
      </div>
    </div>
  );
}

export function Inspector({ sheet, profile }: { sheet: Sheet; profile: Profile }) {
  const d = derive(sheet, profile);
  const [sel, setSel] = useState(0);
  const part = d.parts[sel];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12 }}>
      {/* taxtalar ro'yxati */}
      <div style={{ background: PAL.panel, borderRadius: 10, padding: 8, maxHeight: 520, overflowY: "auto" }}>
        <div style={{ color: PAL.dim, fontSize: 11, padding: "4px 6px" }}>TAXTALAR ({d.parts.length})</div>
        {d.parts.map((p, i) => (
          <button key={i} onClick={() => setSel(i)}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
              background: i === sel ? PAL.line : "transparent", border: "none", borderRadius: 6,
              padding: "7px 8px", cursor: "pointer", color: PAL.ink,
            }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: p.role === "unknown" ? PAL.dim : ROLE_COLOR[p.role] }} />
            <span style={{ fontSize: 12 }}>{p.role} · {p.board.length}mm</span>
          </button>
        ))}
      </div>

      {/* tanlangan taxtaning qarorlari — har biri qoida bilan */}
      <div style={{ background: PAL.panel, borderRadius: 10, padding: 16 }}>
        {!part ? <div style={{ color: PAL.dim }}>Taxta yo'q</div> : (
          <>
            <div style={{ color: PAL.ink, fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
              {part.role} · {part.board.axis === "V" ? "vertikal" : "gorizontal"}
            </div>
            <Row label="uzunlik" value={`${part.finishedLength} mm`} rule={part.provenance.length} />
            <Row label="centerline" value={`${part.board.length} mm`} rule="48 L6 — maksimal yugurish (through-junctionda birlashadi)" />
            <Row label="qalinlik" value={`${part.board.thickness} mm`} rule={part.provenance.thickness} />
            <Row label="chuqurlik" value={part.depth !== undefined ? `${part.depth} mm` : "— (profil bermagan)"} rule={part.provenance.depth ?? "48§4 — cascade (profil depth qoidasi yo'q)"} />
            <Row label="rol" value={part.role} rule={`profil — ${part.provenance.role}`} />
            <Row label="yo'nalish" value={part.board.axis} rule="48§0 — chiziq o'qi" />
            <Row label="qo'shnilik" value={JSON.stringify(part.facets.adjacency)} rule="50§1 — adjacency (Tier-0, blok-grafdan, geometriyasiz)" />
            <Row label="oraliq" value={`${part.board.from} → ${part.board.to}`} rule="48§0 — chegara chiziqlari pozitsiyasi" />
          </>
        )}
      </div>

      {/* kesishmalar paneli — har biri qoida bilan */}
      <div style={{ gridColumn: "1 / -1", background: PAL.panel, borderRadius: 10, padding: 12 }}>
        <div style={{ color: PAL.dim, fontSize: 11, marginBottom: 6 }}>KESISHMALAR (48§2)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {d.junctions.filter((j) => j.through !== "neither" || j.refusal).map((j, i) => (
            <div key={i} style={{ background: j.refusal ? "#3a211e" : PAL.bg, border: `1px solid ${j.refusal ? PAL.bad : PAL.line}`, borderRadius: 6, padding: "6px 9px", fontSize: 12 }}>
              <span style={{ color: PAL.ink }}>{j.vLine}×{j.hLine}</span>{" "}
              <span style={{ color: j.refusal ? PAL.bad : PAL.ok }}>{j.refusal ? "RAD" : `${j.through} o'tadi`}</span>
              <div style={{ color: PAL.accent, fontSize: 10 }}>↳ {j.refusal ? j.refusal.rule : j.provenance}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
