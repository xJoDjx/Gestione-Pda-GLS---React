import { useState } from "react";
import { Icon } from "./Icons";
import { euro } from "../utils/formatters";

// ─── COSTANTI ─────────────────────────────────────────────────────────────────
const STATI    = ["DISPONIBILE", "ASSEGNATO", "SOSPESO", "DISMESSO"];
const bgS  = { DISPONIBILE: "#dcfce7", ASSEGNATO: "#dbeafe", SOSPESO: "#fef3c7", DISMESSO: "#f3f4f6" };
const colS = { DISPONIBILE: "#166534", ASSEGNATO: "#1d4ed8", SOSPESO: "#92400e", DISMESSO: "#6b7280" };

// ─── STORICO DIFF ─────────────────────────────────────────────────────────────
const TRACK = [
  ["stato",        "Stato"],
  ["padroncino_id","Padroncino"],
  ["note",         "Note"],
];
const buildStorico = (old, neo, pads = []) => {
  const ts   = new Date().toISOString();
  const data = new Date().toLocaleDateString("it-IT");
  return TRACK.reduce((acc, [k, label]) => {
    const vo = String(old[k] ?? ""), vn = String(neo[k] ?? "");
    if (vo === vn) return acc;
    let da = vo || "—", a = vn || "—";
    if (k === "padroncino_id") {
      da = pads.find(p => p.id === vo)?.nome || (vo ? vo : "Nessuno");
      a  = pads.find(p => p.id === vn)?.nome || (vn ? vn : "Nessuno");
    }
    acc.push({ ts, data, campo: label, da, a });
    return acc;
  }, []);
};

// ─── MINI UI ──────────────────────────────────────────────────────────────────
const Inp = ({ label, value, onChange, placeholder = "", mono }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>}
    <input value={value ?? ""} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", boxSizing: "border-box", width: "100%", outline: "none", fontFamily: mono ? "'DM Mono',monospace" : "inherit", fontWeight: mono ? 700 : 400 }} />
  </div>
);

// ─── DETTAGLIO ────────────────────────────────────────────────────────────────
const CodAutistaDetail = ({ autista, padroncini, onSave, onBack, onDelete }) => {
  const [form, setForm] = useState({ ...autista });
  const [tab,  setTab]  = useState("info");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const storico = form.storico || [];
  const padAss  = padroncini.find(p => p.id === form.padroncino_id);

  const handlePadChange = pid => {
    set("padroncino_id", pid);
    if (pid && form.stato === "DISPONIBILE") set("stato", "ASSEGNATO");
    if (!pid && form.stato === "ASSEGNATO")  set("stato", "DISPONIBILE");
  };

  const handleSave = () => {
    const log   = buildStorico(autista, form, padroncini);
    const saved = { ...form, storico: [...storico, ...log] };
    if (saved.padroncino_id && saved.stato === "DISPONIBILE") saved.stato = "ASSEGNATO";
    if (!saved.padroncino_id && saved.stato === "ASSEGNATO")  saved.stato = "DISPONIBILE";
    onSave(saved);
  };

  const sc = { bg: bgS[form.stato] || "#f3f4f6", color: colS[form.stato] || "#6b7280" };

  const tabBtn = (t, label) => (
    <button key={t} onClick={() => setTab(t)} style={{
      padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
      background: tab === t ? "#f59e0b" : "#fff", color: tab === t ? "#fff" : "#374151",
      fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="back" size={14} /> Indietro
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", fontFamily: "'DM Mono',monospace" }}>{form.codice || "—"}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Cod. Autista</div>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{form.stato || "—"}</span>
          {padAss && <span style={{ padding: "3px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8" }}>→ {padAss.nome}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 8, background: "#f59e0b", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Icon name="check" size={14} /> Salva
          </button>
          <button onClick={() => { if (window.confirm(`Eliminare il codice "${form.codice}"?`)) onDelete(form.id); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="x" size={13} /> Elimina
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tabBtn("info",    "📋 Informazioni")}
        {tabBtn("storico", `🕐 Storico (${storico.length})`)}
      </div>

      {/* TAB INFO */}
      {tab === "info" && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Inp label="Codice Autista" value={form.codice} onChange={v => set("codice", v)} placeholder="es. 12345" mono />
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stato</label>
              <select value={form.stato ?? ""} onChange={e => set("stato", e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", cursor: "pointer" }}>
                <option value="">—</option>
                {STATI.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Padroncino Assegnato</label>
              <select value={form.padroncino_id ?? ""} onChange={e => handlePadChange(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", cursor: "pointer" }}>
                <option value="">— Nessuno —</option>
                {padroncini.filter(p => p.stato === "ATTIVO").map(p => (
                  <option key={p.id} value={p.id}>{p.nome}{p.codice ? ` (${p.codice})` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Note</label>
            <textarea value={form.note ?? ""} onChange={e => set("note", e.target.value)} rows={3}
              placeholder="Note sul codice autista..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
        </div>
      )}

      {/* TAB STORICO */}
      {tab === "storico" && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {storico.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Nessuna modifica registrata</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Data", "Campo", "Da", "A"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...storico].reverse().map((s, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{s.data || "—"}</td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 11, fontWeight: 700, color: "#374151" }}>{s.campo || "—"}</td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 11, color: "#dc2626" }}>{s.da || "—"}</td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 11, color: "#16a34a" }}>{s.a || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// ─── LISTA ────────────────────────────────────────────────────────────────────
export const CodAutistiView = ({ codAutisti = [], padroncini = [], onSave, onDelete, onAddNew }) => {
  const [search,       setSearch]       = useState("");
  const [filtroStato,  setFiltroStato]  = useState("TUTTI");
  const [detailItem,   setDetailItem]   = useState(null);

  if (detailItem) {
    return (
      <CodAutistaDetail
        autista={detailItem}
        padroncini={padroncini}
        onSave={a => { onSave(a); setDetailItem(a); }}
        onBack={() => setDetailItem(null)}
        onDelete={id => { onDelete(id); setDetailItem(null); }}
      />
    );
  }

  const filtered = codAutisti.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !s
      || a.codice?.toLowerCase().includes(s)
      || (padroncini.find(p => p.id === a.padroncino_id)?.nome || "").toLowerCase().includes(s)
      || (a.note || "").toLowerCase().includes(s);
    const matchStato = filtroStato === "TUTTI" || a.stato === filtroStato;
    return matchSearch && matchStato;
  });

  const counts = STATI.reduce((acc, s) => ({ ...acc, [s]: codAutisti.filter(a => a.stato === s).length }), {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filtri */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per codice, padroncino, note..."
            style={{ width: "100%", padding: "9px 14px 9px 36px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", boxSizing: "border-box", outline: "none" }} />
          <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" size={16} />
          </div>
        </div>
        <button onClick={() => setFiltroStato("TUTTI")}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: filtroStato === "TUTTI" ? "#f59e0b" : "#fff", color: filtroStato === "TUTTI" ? "#fff" : "#374151", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Tutti ({codAutisti.length})
        </button>
        {STATI.map(s => (
          <button key={s} onClick={() => setFiltroStato(s)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: filtroStato === s ? (bgS[s] || "#f3f4f6") : "#fff", color: filtroStato === s ? (colS[s] || "#374151") : "#374151", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {s} ({counts[s] || 0})
          </button>
        ))}
        <button onClick={onAddNew} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#f59e0b", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Icon name="plus" size={13} /> Nuovo Codice
        </button>
      </div>

      {/* Tabella */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Codice Autista", "Stato", "Padroncino Assegnato", "Note", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                Nessun codice autista trovato
              </td></tr>
            ) : filtered.map((a, i) => {
              const pad = padroncini.find(p => p.id === a.padroncino_id);
              return (
                <tr key={a.id || i}
                  style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                  onClick={() => setDetailItem(a)}>
                  <td style={{ padding: "11px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'DM Mono',monospace", color: "#0f172a" }}>{a.codice || "—"}</div>
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: bgS[a.stato] || "#f3f4f6", color: colS[a.stato] || "#6b7280" }}>{a.stato || "—"}</span>
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
                    {pad
                      ? <span style={{ fontWeight: 600, color: "#1d4ed8" }}>{pad.nome}</span>
                      : <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: "#64748b", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.note || "—"}
                  </td>
                  <td style={{ padding: "11px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                    <button onClick={e => { e.stopPropagation(); setDetailItem(a); }}
                      style={{ padding: "5px 12px", borderRadius: 7, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      Dettaglio →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {STATI.map(s => (
          <div key={s} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: bgS[s] || "#f3f4f6", color: colS[s] || "#6b7280" }}>{s}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", fontFamily: "'DM Mono',monospace" }}>{counts[s] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
