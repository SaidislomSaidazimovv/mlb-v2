// T14 — Generatsiyalangan sozlamalar ekranlari. ASOS: 54§3 T14 gate (sozlamalar UI Thing DEF'laridan
// yaratiladi — maydon/birlik/domen/diagram; hech qachon har sozlama uchun qo'lda qurilmaydi; yangi Thing
// papkasi qo'shilsa — yangi ekran, UI kod YOZILMAYDI). §2 API (canPublish) + 52§2/§4.
import { useState } from "react";
import { canPublish } from "../index.ts";
import type { Thing } from "../index.ts";
import { PAL } from "./view.ts";

export function GeneratedSettings({ things }: { things: Thing[] }) {
  // kind bo'yicha guruh — har kind = bitta sozlamalar bo'limi (DEF'dan, qo'lda emas)
  const kinds = [...new Set(things.map((t) => t.def.kind))];
  const [active, setActive] = useState(kinds[0] ?? "");
  const shown = things.filter((t) => t.def.kind === active);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
      {/* bo'limlar — kind'lardan avtomatik */}
      <div style={{ background: PAL.panel, borderRadius: 10, padding: 8 }}>
        <div style={{ color: PAL.dim, fontSize: 11, padding: "4px 6px" }}>BO'LIMLAR</div>
        {kinds.map((k) => (
          <button key={k} onClick={() => setActive(k)}
            style={{ display: "block", width: "100%", textAlign: "left", background: k === active ? PAL.line : "transparent", border: "none", borderRadius: 6, padding: "8px 10px", cursor: "pointer", color: PAL.ink, fontSize: 13 }}>
            {k}
          </button>
        ))}
      </div>

      {/* tanlangan bo'lim — har Thing DEF'dan render (maydon/birlik avtomatik) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.map((t) => {
          const refusals = canPublish(t, {}); // 52§2: diagramsiz/birligsiz publish bo'lmaydi
          const title = t.def.name.uz ?? t.def.name.ru ?? t.def.id;
          return (
            <div key={t.def.uid} style={{ background: PAL.panel, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ color: PAL.ink, fontSize: 15, fontWeight: 600 }}>{title}</div>
                <div style={{ color: PAL.dim, fontSize: 11, fontFamily: "monospace" }}>{t.def.id} · v{t.def.version}</div>
              </div>
              {/* maydonlar — DEF'dan avtomatik, har biri birligi bilan */}
              <div style={{ marginTop: 10 }}>
                {t.def.fields.map((f) => (
                  <div key={f.name} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "5px 0", borderBottom: `1px solid ${PAL.line}` }}>
                    <span style={{ color: PAL.dim, fontSize: 12 }}>{f.name}</span>
                    <span style={{ color: PAL.ink, fontSize: 13, fontFamily: "monospace" }}>
                      {String(f.value)}{f.unit ? <span style={{ color: PAL.accent }}> {f.unit}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
              {/* diagram + publish holati (52§2) */}
              <div style={{ marginTop: 8, fontSize: 11, color: refusals.length ? PAL.bad : PAL.ok }}>
                {t.hasDiagram ? "◧ diagram bor" : "⚠ diagram yo'q"} ·{" "}
                {refusals.length ? `publish bo'lmaydi: ${refusals.map((r) => r.rule).join(", ")}` : "✓ publish tayyor (52§2/§4)"}
              </div>
            </div>
          );
        })}
        <div style={{ color: PAL.dim, fontSize: 11 }}>
          Bu ekranlar qo'lda yozilmagan — <b style={{ color: PAL.ink }}>Thing def'laridan</b> generatsiya qilinadi (54 T14).
          Yangi Thing qo'shilsa, bu yerga UI kod yozmasdan yangi karta chiqadi.
        </div>
      </div>
    </div>
  );
}
