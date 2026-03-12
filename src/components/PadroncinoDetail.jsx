import { useState, useRef } from "react";
import { Icon } from "./Icons";
import { Badge, SectionCard, DocUpload } from "./BaseComponents";
import { euro, durcColor, dvrColor, statoColor, durcDaysLeft, MESI } from "../utils/formatters";

// ─── CAMPI MONITORATI per cronologia (tutti i campi significativi) ─────────────
const WATCH_FIELDS = [
  ["nome",            "Ragione Sociale"],
  ["codice",          "Codice GLS"],
  ["stato",           "Stato"],
  ["partita_iva",     "Partita IVA"],
  ["codice_fiscale",  "Codice Fiscale"],
  ["rappresentante",  "Rappresentante"],
  ["telefono",        "Telefono"],
  ["email",           "Email"],
  ["sede_legale",     "Sede Legale"],
  ["via_sede_legale", "Via/Sede Operativa"],
  ["durc_stato",      "DURC Stato"],
  ["durc_scadenza",   "DURC Scadenza"],
  ["dvr_stato",       "DVR Stato"],
  ["dvr_scadenza",    "DVR Scadenza"],
  ["note_varie",      "Note"],
];

// Helper: crea entry storico/cronologia
const makeEntry = (logCampi, utente = "") => ({
  ts:     new Date().toISOString(),
  data:   new Date().toLocaleDateString("it-IT"),
  tipo:   "Modifica",
  campi:  logCampi,
  utente,
});

// ─── STILI CELLE ──────────────────────────────────────────────────────────────
const ci = {
  width: "100%", padding: "5px 7px", border: "1px solid #e2e8f0",
  borderRadius: 6, fontSize: 11, background: "#fff", color: "#0f172a",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit"
};
const ciMono = { ...ci, fontFamily: "'DM Mono', monospace" };
const ciDate = { ...ci, fontSize: 11 };

const TH = ({ children, w }) => (
  <th style={{
    padding: "8px 8px", textAlign: "left", fontSize: 10, fontWeight: 700,
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap",
    background: "#f8fafc", width: w || "auto"
  }}>{children}</th>
);
const TD = ({ children, center, w }) => (
  <td style={{
    padding: "6px 8px", borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle", textAlign: center ? "center" : "left",
    width: w || "auto"
  }}>{children}</td>
);

// ─── Apertura file nativo ──────────────────────────────────────────────────────
const isElectron = typeof window !== "undefined" && !!window.electronAPI;

const apriFileNativo = async (doc) => {
  const base64 = doc?.data || doc?.data_b64;
  const nome   = doc?.name || doc?.nome || "documento";
  if (!base64) return;
  if (isElectron && window.electronAPI.openFile) {
    try { await window.electronAPI.openFile(base64, nome); }
    catch { const a = document.createElement("a"); a.href = base64; a.download = nome; a.click(); }
  } else {
    const a = document.createElement("a"); a.href = base64; a.download = nome; a.click();
  }
};

const salvaFileSuDisco = async (doc) => {
  const base64 = doc?.data || doc?.data_b64;
  const nome   = doc?.name || doc?.nome || "documento";
  if (isElectron && window.electronAPI.saveFile) {
    await window.electronAPI.saveFile(base64, nome);
  } else {
    const a = document.createElement("a"); a.href = base64; a.download = nome; a.click();
  }
};

// ─── DocBlock ─────────────────────────────────────────────────────────────────
const DocBlock = ({ label, docKey, form, update, accent = "#3b82f6" }) => {
  const doc = form[docKey];
  const hasFile = !!(doc && (doc.data || doc.data_b64 || doc.name || doc.nome));
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      {hasFile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "5px 8px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            📄 {doc.name || doc.nome}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => apriFileNativo(doc)}
              style={{ flex: 1, padding: "5px", borderRadius: 6, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              🖥️ Apri
            </button>
            <button onClick={() => salvaFileSuDisco(doc)}
              style={{ flex: 1, padding: "5px", borderRadius: 6, background: "#f0fdf4", border: "none", color: "#166534", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              💾 Salva
            </button>
            <button onClick={() => update(docKey, null)}
              style={{ flex: 1, padding: "5px", borderRadius: 6, background: "#fee2e2", border: "none", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Rimuovi
            </button>
          </div>
        </div>
      ) : (
        <label style={{ cursor: "pointer", display: "block" }}>
          <div style={{ padding: "10px", borderRadius: 7, border: "2px dashed #e2e8f0", textAlign: "center", fontSize: 11, color: "#94a3b8", background: "#fafafa" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#94a3b8"; }}>
            + Carica {label}
          </div>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: "none" }}
            onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              const r = new FileReader();
              r.onload = ev => update(docKey, { name: file.name, data: ev.target.result, type: file.type });
              r.readAsDataURL(file);
            }} />
        </label>
      )}
    </div>
  );
};

// ─── TAB MEZZI ────────────────────────────────────────────────────────────────
const TabMezzi = ({ mezzi, onChange, mezziFlotta = [], onSaveMezzoFlotta, onAutoSave, padroncino_id = "", padroncinoNome = "", utente = "" }) => {
  const rows = mezzi || [];
  const [showPicker, setShowPicker] = useState(false);
  const targheUsate = new Set(rows.map(m => m.targa).filter(Boolean));
  const disponibili = mezziFlotta.filter(m => m.stato === "DISPONIBILE" && m.targa && !targheUsate.has(m.targa));

  const update = (i, field, val) => {
    if (field === "__DELETE__") {
      const rimosso = rows[i];
      const newRows = rows.filter((_, idx) => idx !== i);
      onChange(newRows);
      if (onSaveMezzoFlotta && rimosso?.targa) {
        const globale = mezziFlotta.find(m => m.targa === rimosso.targa);
        if (globale) {
          const storEntry = { ts: new Date().toISOString(), data: new Date().toLocaleDateString("it-IT"), campo: "Assegnazione", da: padroncinoNome || padroncino_id, a: "Nessuno", utente };
          onSaveMezzoFlotta({ ...globale, stato: "DISPONIBILE", padroncino_id: "", storico: [...(globale.storico || []), storEntry] });
        }
      }
      const logCampi = rimosso?.targa ? [{ label: "Mezzo rimosso", da: rimosso.targa, a: "—" }] : [];
      if (onAutoSave) onAutoSave(newRows, "mezzi", rows, logCampi);
      return;
    }
    if (field === "__ADD__") {
      const newRows = [...rows, { targa: "", alimentazione: "Diesel", marca: "", modello: "", stato: "ATTIVO", data_inizio: "", data_fine: "", tariffa_mensile: 0, doc: null, note: "" }];
      onChange(newRows);
      return;
    }
    onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 90 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 75 }} />
            <col style={{ width: 95 }} />
            <col style={{ width: 95 }} />
            <col style={{ width: 95 }} />
            <col style={{ width: 60 }} />
            <col />
            <col style={{ width: 36 }} />
          </colgroup>
          <thead>
            <tr>
              <TH>Targa</TH><TH>Alim.</TH><TH>Marca</TH><TH>Modello</TH>
              <TH>Stato</TH><TH>Inizio</TH><TH>Fine</TH><TH>Tariffa €/mese</TH>
              <TH>Doc.</TH><TH>Note</TH><TH></TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <TD><input value={m.targa || ""} onChange={e => update(i, "targa", e.target.value)} style={{ ...ciMono, textTransform: "uppercase" }} placeholder="AA000AA" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD>
                  <select value={m.alimentazione || "Diesel"} onChange={e => update(i, "alimentazione", e.target.value)} style={{ ...ci, fontSize: 11 }}>
                    {["Diesel","Benzina","Ibrido","Elettrico","GPL","Metano"].map(a => <option key={a}>{a}</option>)}
                  </select>
                </TD>
                <TD><input value={m.marca || ""} onChange={e => update(i, "marca", e.target.value)} style={ci} placeholder="Fiat" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input value={m.modello || ""} onChange={e => update(i, "modello", e.target.value)} style={ci} placeholder="Ducato" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD>
                  <select value={m.stato || "ATTIVO"} onChange={e => update(i, "stato", e.target.value)} style={{ ...ci, fontSize: 11 }}>
                    {["ATTIVO","FERMO","DISMESSO"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </TD>
                <TD><input type="date" value={m.data_inizio || ""} onChange={e => update(i, "data_inizio", e.target.value)} style={ciDate} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="date" value={m.data_fine || ""} onChange={e => update(i, "data_fine", e.target.value)} style={ciDate} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="number" step="0.01" value={m.tariffa_mensile || ""} onChange={e => update(i, "tariffa_mensile", parseFloat(e.target.value) || 0)} style={ciMono} placeholder="0,00" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD center>
                  {m.doc ? (
                    <button onClick={() => apriFileNativo(m.doc)} title="Apri doc"
                      style={{ padding: "3px 7px", borderRadius: 5, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>PDF</button>
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <span style={{ padding: "3px 7px", borderRadius: 5, background: "#f1f5f9", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: 10, cursor: "pointer" }}>+</span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
                        onChange={e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => update(i, "doc", { name: file.name, data: ev.target.result }); r.readAsDataURL(file); }} />
                    </label>
                  )}
                </TD>
                <TD><input value={m.note || ""} onChange={e => update(i, "note", e.target.value)} style={ci} placeholder="Note..." onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD center>
                  <button onClick={() => update(i, "__DELETE__")} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "4px 6px", cursor: "pointer" }}>
                    <Icon name="x" size={12} />
                  </button>
                </TD>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: "center", padding: "18px", color: "#94a3b8", fontSize: 12 }}>Nessun mezzo — Clicca "+ Aggiungi"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={() => update(0, "__ADD__")} style={{ padding: "7px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px dashed #86efac", color: "#166534", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="plus" size={12} /> Aggiungi Manuale
        </button>
        {disponibili.length > 0 && (
          <button onClick={() => setShowPicker(v => !v)} style={{ padding: "7px 14px", borderRadius: 8, background: "#eff6ff", border: "1px dashed #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="truck" size={12} /> Da Flotta ({disponibili.length} disponibili)
          </button>
        )}
      </div>
      {showPicker && disponibili.length > 0 && (
        <div style={{ marginTop: 10, background: "#f0f9ff", borderRadius: 10, border: "1px solid #bfdbfe", padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Seleziona dalla Flotta Mezzi
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {disponibili.map(m => (
              <button key={m.id} onClick={() => {
                const newRows = [...rows, {
                  targa: m.targa, alimentazione: m.alimentazione || "Diesel",
                  marca: m.marca || "", modello: m.modello || "",
                  stato: "ATTIVO", data_inizio: new Date().toISOString().slice(0, 10),
                  data_fine: "", tariffa_mensile: m.rata_noleggio || 0, note: ""
                }];
                onChange(newRows);
                if (onSaveMezzoFlotta) {
                  const storEntry = { ts: new Date().toISOString(), data: new Date().toLocaleDateString("it-IT"), campo: "Assegnazione", da: "Nessuno", a: padroncinoNome || padroncino_id, utente };
                  onSaveMezzoFlotta({ ...m, stato: "ASSEGNATO", padroncino_id, storico: [...(m.storico || []), storEntry] });
                }
                const logCampi = [{ label: "Mezzo assegnato", da: "—", a: m.targa }];
                if (onAutoSave) onAutoSave(newRows, "mezzi", rows, logCampi);
                setShowPicker(false);
              }} style={{ padding: "6px 12px", borderRadius: 7, background: "#fff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800 }}>{m.targa}</span>
                <span style={{ color: "#94a3b8" }}>{m.alimentazione || ""} {m.marca || ""} {m.modello || ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TAB PALMARI ──────────────────────────────────────────────────────────────
const TabPalmari = ({ palmari, onChange, palmariFlotta = [], onSavePalmare, onAutoSave, padroncino_id = "", padroncinoNome = "", utente = "" }) => {
  const rows = palmari || [];
  const [showPicker, setShowPicker] = useState(false);
  const serialiUsati = new Set(rows.map(p => p.seriale).filter(Boolean));
  const disponibili = palmariFlotta.filter(p => p.stato === "DISPONIBILE" && p.seriale && !serialiUsati.has(p.seriale));

  const update = (i, field, val) => {
    if (field === "__DELETE__") {
      const rimosso = rows[i];
      const newRows = rows.filter((_, idx) => idx !== i);
      onChange(newRows);
      if (onSavePalmare && rimosso?.seriale) {
        const globale = palmariFlotta.find(f => f.seriale === rimosso.seriale);
        if (globale) {
          const storEntry = { ts: new Date().toISOString(), data: new Date().toLocaleDateString("it-IT"), campo: "Assegnazione", da: padroncinoNome || padroncino_id, a: "Nessuno", utente };
          onSavePalmare({ ...globale, stato: "DISPONIBILE", padroncino_id: "", storico: [...(globale.storico || []), storEntry] });
        }
      }
      const logCampi = rimosso?.seriale ? [{ label: "Palmare rimosso", da: rimosso.seriale, a: "—" }] : [];
      if (onAutoSave) onAutoSave(newRows, "palmari", rows, logCampi);
      return;
    }
    if (field === "__ADD__") {
      onChange([...rows, { seriale: "", codice_associato: "", stato: "ATTIVO", data_inizio: "", data_fine: "", doc: null, note: "" }]);
      return;
    }
    onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 120 }} /><col style={{ width: 120 }} /><col style={{ width: 75 }} />
            <col style={{ width: 95 }} /><col style={{ width: 95 }} /><col style={{ width: 95 }} />
            <col style={{ width: 60 }} /><col /><col style={{ width: 36 }} />
          </colgroup>
          <thead>
            <tr>
              <TH>Seriale</TH><TH>Cod. Associato</TH><TH>Stato</TH>
              <TH>Inizio</TH><TH>Fine</TH><TH>Tariffa €/mese</TH>
              <TH>Doc.</TH><TH>Note</TH><TH></TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <TD><input value={p.seriale || ""} onChange={e => update(i, "seriale", e.target.value)} style={ciMono} placeholder="SN001" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input value={p.codice_associato || ""} onChange={e => update(i, "codice_associato", e.target.value)} style={ci} placeholder="COD..." onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD>
                  <select value={p.stato || "ATTIVO"} onChange={e => update(i, "stato", e.target.value)} style={{ ...ci, fontSize: 11 }}>
                    {["ATTIVO","GUASTO","DISMESSO"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </TD>
                <TD><input type="date" value={p.data_inizio || ""} onChange={e => update(i, "data_inizio", e.target.value)} style={ciDate} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="date" value={p.data_fine || ""} onChange={e => update(i, "data_fine", e.target.value)} style={ciDate} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="number" step="0.01" value={p.tariffa_mensile || ""} onChange={e => update(i, "tariffa_mensile", parseFloat(e.target.value) || 0)} style={ciMono} placeholder="0,00" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD center>
                  {p.doc ? (
                    <button onClick={() => apriFileNativo(p.doc)} title="Apri doc"
                      style={{ padding: "3px 7px", borderRadius: 5, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>PDF</button>
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <span style={{ padding: "3px 7px", borderRadius: 5, background: "#f1f5f9", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: 10 }}>+</span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
                        onChange={e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => update(i, "doc", { name: file.name, data: ev.target.result }); r.readAsDataURL(file); }} />
                    </label>
                  )}
                </TD>
                <TD><input value={p.note || ""} onChange={e => update(i, "note", e.target.value)} style={ci} placeholder="Note..." onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD center>
                  <button onClick={() => update(i, "__DELETE__")} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "4px 6px", cursor: "pointer" }}>
                    <Icon name="x" size={12} />
                  </button>
                </TD>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "18px", color: "#94a3b8", fontSize: 12 }}>Nessun palmare — Clicca "+ Aggiungi"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={() => update(0, "__ADD__")} style={{ padding: "7px 14px", borderRadius: 8, background: "#faf5ff", border: "1px dashed #c4b5fd", color: "#6d28d9", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="plus" size={12} /> Aggiungi Manuale
        </button>
        {disponibili.length > 0 && (
          <button onClick={() => setShowPicker(v => !v)} style={{ padding: "7px 14px", borderRadius: 8, background: "#f5f3ff", border: "1px dashed #c4b5fd", color: "#6d28d9", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="device" size={12} /> Da Flotta ({disponibili.length} disponibili)
          </button>
        )}
      </div>
      {showPicker && disponibili.length > 0 && (
        <div style={{ marginTop: 10, background: "#faf5ff", borderRadius: 10, border: "1px solid #c4b5fd", padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Seleziona dalla Flotta Palmari
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {disponibili.map(p => (
              <button key={p.id} onClick={() => {
                const newRows = [...rows, {
                  seriale: p.seriale, codice_associato: "", stato: "ATTIVO",
                  data_inizio: new Date().toISOString().slice(0, 10),
                  data_fine: "", tariffa_mensile: p.tariffa_mensile || 0,
                  note: p.modello || ""
                }];
                onChange(newRows);
                if (onSavePalmare) {
                  const storEntry = { ts: new Date().toISOString(), data: new Date().toLocaleDateString("it-IT"), campo: "Assegnazione", da: "Nessuno", a: padroncinoNome || padroncino_id, utente };
                  onSavePalmare({ ...p, stato: "ASSEGNATO", padroncino_id, storico: [...(p.storico || []), storEntry] });
                }
                const logCampi = [{ label: "Palmare assegnato", da: "—", a: p.seriale }];
                if (onAutoSave) onAutoSave(newRows, "palmari", rows, logCampi);
                setShowPicker(false);
              }} style={{ padding: "6px 12px", borderRadius: 7, background: "#fff", border: "1px solid #c4b5fd", color: "#6d28d9", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800 }}>{p.seriale}</span>
                {p.modello && <span style={{ color: "#94a3b8" }}>{p.modello}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TAB CODICI AUTISTI ────────────────────────────────────────────────────────
const TabAutisti = ({ autisti, onChange, codAutistiFlotta = [], onSaveCodAutista, onAutoSave, padroncino_id = "", padroncinoNome = "", utente = "" }) => {
  const rows = autisti || [];
  const [showPicker, setShowPicker] = useState(false);

  const codiciUsati = new Set(rows.map(a => a.codice).filter(Boolean));
  const disponibili = codAutistiFlotta.filter(a =>
    (a.stato === "DISPONIBILE" || a.padroncino_id === padroncino_id) &&
    a.codice && !codiciUsati.has(a.codice)
  );

  const update = (i, field, val) => {
    if (field === "__DELETE__") {
      const rimosso = rows[i];
      const newRows = rows.filter((_, idx) => idx !== i);
      onChange(newRows);
      if (onSaveCodAutista && rimosso?.codice) {
        const globale = codAutistiFlotta.find(f => f.codice === rimosso.codice);
        if (globale) {
          const storEntry = { ts: new Date().toISOString(), data: new Date().toLocaleDateString("it-IT"), campo: "Assegnazione", da: padroncinoNome || padroncino_id, a: "Nessuno", utente };
          onSaveCodAutista({ ...globale, stato: "DISPONIBILE", padroncino_id: "", storico: [...(globale.storico || []), storEntry] });
        }
      }
      const logCampi = rimosso?.codice ? [{ label: "Cod. Autista rimosso", da: rimosso.codice, a: "—" }] : [];
      if (onAutoSave) onAutoSave(newRows, "codici_autisti", rows, logCampi);
      return;
    }
    if (field === "__ADD__") {
      onChange([...rows, { codice: "", tariffa_fissa: 0, tariffa_ritiro: 0, target: 0, data_inizio: "", data_fine: "", doc: null, note: "" }]);
      return;
    }
    onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 100 }} /><col style={{ width: 105 }} /><col style={{ width: 105 }} />
            <col style={{ width: 90 }} /><col style={{ width: 90 }} /><col style={{ width: 100 }} />
            <col style={{ width: 100 }} /><col style={{ width: 70 }} /><col /><col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <TH>Codice</TH><TH>Tariffa fissa €</TH><TH>Tariffa ritiro €</TH>
              <TH>Target</TH><TH>Bonus/Malus €</TH><TH>Inizio</TH>
              <TH>Fine</TH><TH>Doc.</TH><TH>Note</TH><TH></TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <TD><input value={a.codice || ""} onChange={e => update(i, "codice", e.target.value)} style={ci} placeholder="AUT001" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="number" step="0.01" value={a.tariffa_fissa || ""} onChange={e => update(i, "tariffa_fissa", parseFloat(e.target.value) || 0)} style={ciMono} placeholder="0,00" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="number" step="0.01" value={a.tariffa_ritiro || ""} onChange={e => update(i, "tariffa_ritiro", parseFloat(e.target.value) || 0)} style={ciMono} placeholder="0,00" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="number" step="1" value={a.target || ""} onChange={e => update(i, "target", parseInt(e.target.value) || 0)} style={ciMono} placeholder="0" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="number" step="0.01" value={a.bonus_malus || ""} onChange={e => update(i, "bonus_malus", parseFloat(e.target.value) || 0)} style={{ ...ciMono, color: (a.bonus_malus || 0) >= 0 ? "#166534" : "#dc2626" }} placeholder="0,00" onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="date" value={a.data_inizio || ""} onChange={e => update(i, "data_inizio", e.target.value)} style={ciDate} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD><input type="date" value={a.data_fine || ""} onChange={e => update(i, "data_fine", e.target.value)} style={ciDate} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD center>
                  {a.doc ? (
                    <button onClick={() => apriFileNativo(a.doc)} title="Apri doc"
                      style={{ padding: "3px 7px", borderRadius: 5, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>PDF</button>
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <span style={{ padding: "3px 7px", borderRadius: 5, background: "#f1f5f9", border: "1px dashed #cbd5e1", color: "#94a3b8", fontSize: 10 }}>+</span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
                        onChange={e => { const file = e.target.files[0]; if (!file) return; const r = new FileReader(); r.onload = ev => update(i, "doc", { name: file.name, data: ev.target.result }); r.readAsDataURL(file); }} />
                    </label>
                  )}
                </TD>
                <TD><input value={a.note || ""} onChange={e => update(i, "note", e.target.value)} style={ci} placeholder="Note..." onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></TD>
                <TD center>
                  <button onClick={() => update(i, "__DELETE__")} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "4px 6px", cursor: "pointer" }}>
                    <Icon name="x" size={12} />
                  </button>
                </TD>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: "18px", color: "#94a3b8", fontSize: 12 }}>Nessun codice autista — Clicca "+ Aggiungi"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={() => update(0, "__ADD__")} style={{ padding: "7px 14px", borderRadius: 8, background: "#fffbeb", border: "1px dashed #fcd34d", color: "#92400e", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="plus" size={12} /> Aggiungi Manuale
        </button>
        {disponibili.length > 0 && (
          <button onClick={() => setShowPicker(v => !v)} style={{ padding: "7px 14px", borderRadius: 8, background: "#fef3c7", border: "1px dashed #fcd34d", color: "#78350f", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="users" size={12} /> Da Flotta ({disponibili.length} disponibili)
          </button>
        )}
      </div>
      {showPicker && disponibili.length > 0 && (
        <div style={{ marginTop: 10, background: "#fffbeb", borderRadius: 10, border: "1px solid #fcd34d", padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Seleziona dalla Flotta Codici Autisti
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {disponibili.map(a => (
              <button key={a.id} onClick={() => {
                const newRows = [...rows, {
                  codice: a.codice, tariffa_fissa: a.tariffa_fissa || 0,
                  tariffa_ritiro: a.tariffa_ritiro || 0, target: a.target || 0,
                  bonus_malus: 0, data_inizio: new Date().toISOString().slice(0, 10),
                  data_fine: "", note: a.note || "", doc: null,
                }];
                onChange(newRows);
                if (onSaveCodAutista) {
                  const storEntry = { ts: new Date().toISOString(), data: new Date().toLocaleDateString("it-IT"), campo: "Assegnazione", da: "Nessuno", a: padroncinoNome || padroncino_id, utente };
                  onSaveCodAutista({ ...a, stato: "ASSEGNATO", padroncino_id, storico: [...(a.storico || []), storEntry] });
                }
                const logCampi = [{ label: "Cod. Autista assegnato", da: "—", a: a.codice }];
                if (onAutoSave) onAutoSave(newRows, "codici_autisti", rows, logCampi);
                setShowPicker(false);
              }} style={{ padding: "6px 12px", borderRadius: 7, background: "#fff", border: "1px solid #fcd34d", color: "#78350f", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800 }}>{a.codice}</span>
                {a.tariffa_fissa > 0 && <span style={{ color: "#166534", fontSize: 11 }}>€{a.tariffa_fissa}/fissa</span>}
                {a.note && <span style={{ color: "#94a3b8", fontSize: 11 }}>{a.note.slice(0, 20)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// ─── CRONOLOGIA TAB (design tabella come storico mezzi) ──────────────────────
const AZIONE_STILE = {
  Assegnazione: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", dot: "#22c55e" },
  Rimozione:    { bg: "#fee2e2", color: "#dc2626", border: "#fecaca", dot: "#ef4444" },
  Modifica:     { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" },
  "Nota manuale": { bg: "#fef9c3", color: "#854d0e", border: "#fde68a", dot: "#f59e0b" },
};

const getAzioneEntry = (entry) => {
  if (entry.manuale) return "Nota manuale";
  const labels = (entry.campi || []).map(c => (c.label || c.campo || "").toLowerCase()).join(" ");
  if (labels.includes("assegnato") || labels.includes("assegnaz")) return "Assegnazione";
  if (labels.includes("rimosso") || labels.includes("rimozione")) return "Rimozione";
  return "Modifica";
};

const fmtTs = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("it-IT") + "  " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const CronologiaTab = ({ cronologia = [], onAddNota, padNome }) => {
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");

  const rows = [...cronologia].reverse();

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>📜 Log Modifiche — {padNome}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{cronologia.length} eventi · aggiornamento in tempo reale</div>
      </div>

      {/* Nota manuale */}
      <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input value={notaCampo} onChange={e => setNotaCampo(e.target.value)}
          placeholder="Tipo nota (es. Chiamata, Accordo...)"
          style={{ width: 220, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff" }} />
        <input value={notaTesto} onChange={e => setNotaTesto(e.target.value)}
          placeholder="Descrizione nota..."
          style={{ flex: 1, minWidth: 200, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff" }} />
        <button onClick={() => { if (!notaTesto.trim()) return; onAddNota(notaCampo, notaTesto); setNotaCampo(""); setNotaTesto(""); }}
          style={{ padding: "6px 16px", borderRadius: 7, background: "#1e40af", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          + Nota
        </button>
      </div>

      {cronologia.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📜</div>
          <div style={{ fontSize: 13 }}>Nessuna modifica ancora registrata</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Ogni salvataggio, assegnazione e rimozione viene registrata automaticamente</div>
        </div>
      ) : (
        <>
          {/* Intestazioni */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 150px 130px 1fr", gap: 0, background: "#f8fafc", borderBottom: "2px solid #e2e8f0", padding: "8px 16px" }}>
            {["DATA / ORA", "UTENTE", "AZIONE", "DESCRIZIONE"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
            ))}
          </div>

          {/* Righe */}
          <div style={{ maxHeight: 440, overflowY: "auto" }}>
            {rows.map((entry, i) => {
              const az      = getAzioneEntry(entry);
              const st      = AZIONE_STILE[az] || AZIONE_STILE["Modifica"];
              const campi   = entry.campi || [];
              const utenteStr = entry.utente || "";

              // Costruisci la descrizione compatta
              let descrizione = "";
              if (az === "Assegnazione") {
                const c = campi[0];
                descrizione = c ? `${c.label || c.campo}: ${c.da} → ${c.a}` : "Assegnazione";
              } else if (az === "Rimozione") {
                const c = campi[0];
                descrizione = c ? `${c.label || c.campo}: ${c.da} → ${c.a}` : "Rimozione";
              } else if (entry.manuale) {
                const c = campi[0];
                const tipo = c?.label && c.label !== "Nota" ? `[${c.label}] ` : "";
                descrizione = tipo + (c?.a || "");
              } else {
                descrizione = campi.map(c => `${c.label || c.campo}: ${c.da} → ${c.a}`).join(" · ");
              }

              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "160px 150px 130px 1fr",
                  gap: 0, padding: "10px 16px",
                  background: i % 2 === 0 ? "#fff" : "#fafbfc",
                  borderBottom: "1px solid #f1f5f9",
                  alignItems: "center",
                }}>
                  {/* Data/Ora */}
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#64748b", lineHeight: 1.5, whiteSpace: "nowrap" }}>
                    {fmtTs(entry.ts)}
                  </div>

                  {/* Utente */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {utenteStr ? (
                      <>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {utenteStr[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{utenteStr}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                    )}
                  </div>

                  {/* Azione badge */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, flexShrink: 0, display: "inline-block" }} />
                      {az}
                    </span>
                  </div>

                  {/* Descrizione */}
                  <div style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={descrizione}>
                    {descrizione}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8" }}>
            {cronologia.length} eventi registrati
          </div>
        </>
      )}
    </div>
  );
};

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────
export const PadroncinoDetail = ({
  padroncino, conteggi, onBack, onSave, onSaveConteggio, onLogChange,
  mezziFlotta = [], palmariFlotta = [], onSaveMezzoFlotta, onSavePalmare,
  codAutistiFlotta = [], onSaveCodAutista, utente = "",
}) => {
  const [tab,   setTab]   = useState("anagrafica");
  const [form,  setForm]  = useState({ ...padroncino });
  const [dirty, setDirty] = useState(false);
  const formRef = useRef(form);

  const update = (field, val) => {
    setForm(f => {
      const next = { ...f, [field]: val };
      formRef.current = next;
      return next;
    });
    setDirty(true);
  };

  // ── handleSave: calcola diff, aggiunge a cronologia, aggiorna state locale subito ──
  const handleSave = () => {
    // Build diff tra props originali e form attuale
    const campiDiff = WATCH_FIELDS.reduce((acc, [k, label]) => {
      const vo = String(padroncino[k] ?? "");
      const vn = String(form[k] ?? "");
      if (vo !== vn) acc.push({ label, da: vo || "—", a: vn || "—" });
      return acc;
    }, []);

    let formToSave = form;
    if (campiDiff.length > 0) {
      const entry = makeEntry(campiDiff, utente);
      formToSave = { ...form, cronologia: [...(form.cronologia || []), entry] };
      // Aggiorna state locale subito → il tab "Log" si aggiorna senza uscire
      setForm(formToSave);
      formRef.current = formToSave;
    }

    onSave(formToSave);
    setDirty(false);

    // Passa solo il diff precalcolato al gestore globale (non ricalcola nulla)
    if (onLogChange && campiDiff.length > 0) onLogChange(formToSave, campiDiff);

    // Sincronizza palmari globali
    if (onSavePalmare && form.palmari) {
      form.palmari.forEach(p => {
        if (!p.seriale) return;
        const globale = palmariFlotta.find(f => f.seriale === p.seriale);
        if (globale) {
          onSavePalmare({
            ...globale,
            stato: p.stato === "ATTIVO" ? "ASSEGNATO" : (p.stato === "DISMESSO" ? "DISMESSO" : "GUASTO"),
            padroncino_id: form.id,
            data_assegnazione: p.data_inizio || globale.data_assegnazione,
            data_fine: p.data_fine || globale.data_fine,
          });
        }
      });
      const serialiAssegnati = new Set((form.palmari || []).map(p => p.seriale).filter(Boolean));
      palmariFlotta.forEach(g => {
        if (g.padroncino_id === form.id && !serialiAssegnati.has(g.seriale)) {
          onSavePalmare({ ...g, stato: "DISPONIBILE", padroncino_id: "" });
        }
      });
    }
  };

  // ── Helper onAutoSave usato da TabMezzi/TabPalmari/TabAutisti ──────────────
  // logCampi: array di {label, da, a} che descrive cosa è cambiato
  const handleAutoSave = (vals, campo, oldVals, logCampi = []) => {
    const updated = { ...formRef.current, [campo]: vals };
    let formToSave = updated;

    if (logCampi.length > 0) {
      const entry = makeEntry(logCampi, utente);
      formToSave = { ...updated, cronologia: [...(updated.cronologia || []), entry] };
    }

    formRef.current = formToSave;
    setForm(formToSave);
    setDirty(false);
    onSave(formToSave);

    // Notifica log globale con campi significativi
    if (onLogChange && logCampi.length > 0) onLogChange(formToSave, logCampi);
  };

  const padConteggi = conteggi.filter(c => c.padroncino_id === padroncino.id);
  const fattTot = padConteggi.reduce((s, c) => s + (c.totale_fattura || 0), 0);
  const bonTot  = padConteggi.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);

  const dc = durcColor(form.durc_stato);
  const dv = dvrColor(form.dvr_stato);
  const sc = statoColor(form.stato);

  const TABS = [
    ["anagrafica",  "Anagrafica"],
    ["mezzi",       `Mezzi (${(form.mezzi || []).length})`],
    ["palmari",     `Palmari (${(form.palmari || []).length})`],
    ["autisti",     `Autisti (${(form.codici_autisti || []).length})`],
    ["predefinite", "📋 Voci Predefinite"],
    ["conteggi",    `Storico (${padConteggi.length})`],
    ["cronologia",  `Log (${(form.cronologia || []).length})`],
  ];

  const labelSt = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 };
  const fieldCi = { padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", color: "#0f172a", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="back" size={14} /> Indietro
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{form.nome}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Cod. {form.codice || "—"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ background: sc.bg, color: sc.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{form.stato}</span>
          <span style={{ background: dc.bg, color: dc.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>DURC: {form.durc_stato || "—"}</span>
          <span style={{ background: dv.bg, color: dv.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>DVR: {form.dvr_stato || "—"}</span>
          <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
            <div>Fatt. <strong style={{ color: "#166534" }}>{euro(fattTot)}</strong></div>
            <div>Bon. <strong style={{ color: "#1d4ed8" }}>{euro(bonTot)}</strong></div>
          </div>
          {dirty && (
            <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 9, background: "#1e40af", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              💾 Salva
            </button>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px" }}>
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
            background: tab === t ? "#1e40af" : "#fff", color: tab === t ? "#fff" : "#475569",
            fontSize: 12, fontWeight: tab === t ? 700 : 500, cursor: "pointer", transition: "all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* ══ ANAGRAFICA ══ */}
      {tab === "anagrafica" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionCard title="Dati Anagrafici" icon="user" accent="#1e40af">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><label style={labelSt}>Ragione Sociale</label><input value={form.nome || ""} onChange={e => update("nome", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div><label style={labelSt}>Codice GLS</label><input value={form.codice || ""} onChange={e => update("codice", e.target.value)} style={{ ...fieldCi, fontFamily: "'DM Mono',monospace" }} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div>
                <label style={labelSt}>Stato</label>
                <select value={form.stato || ""} onChange={e => update("stato", e.target.value)} style={{ ...fieldCi, cursor: "pointer" }}>
                  {["ATTIVO", "DISMESSO", "SOSPESO"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={labelSt}>Partita IVA</label><input value={form.partita_iva || ""} onChange={e => update("partita_iva", e.target.value)} style={{ ...fieldCi, fontFamily: "'DM Mono',monospace" }} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div><label style={labelSt}>Codice Fiscale</label><input value={form.codice_fiscale || ""} onChange={e => update("codice_fiscale", e.target.value)} style={{ ...fieldCi, fontFamily: "'DM Mono',monospace" }} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div><label style={labelSt}>Rappresentante</label><input value={form.rappresentante || ""} onChange={e => update("rappresentante", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div><label style={labelSt}>Telefono</label><input value={form.telefono || ""} onChange={e => update("telefono", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div><label style={labelSt}>Email</label><input value={form.email || ""} onChange={e => update("email", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div><label style={labelSt}>Sede Legale</label><input value={form.sede_legale || ""} onChange={e => update("sede_legale", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
              <div style={{ gridColumn: "span 3" }}><label style={labelSt}>Via / Sede Operativa</label><input value={form.via_sede_legale || ""} onChange={e => update("via_sede_legale", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
            </div>
          </SectionCard>

          <SectionCard title="DURC / DVR" icon="shield" accent="#ef4444">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelSt}>Stato DURC</label>
                <select value={form.durc_stato || ""} onChange={e => update("durc_stato", e.target.value)} style={{ ...fieldCi, cursor: "pointer" }}>
                  <option value="">—</option>
                  {["REGOLARE", "IN SCADENZA", "SCADUTO", "ASSENTE"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Scad. DURC</label>
                <input 
                  type="date" 
                  value={form.durc_scadenza || ""} 
                  onChange={e => {
                    const nuovaData = e.target.value;
                    update("durc_scadenza", nuovaData);

                    if (nuovaData) {
                      const dLeft = durcDaysLeft(nuovaData); // Uso la tua funzione esistente
                      let nuovoStato = "REGOLARE";

                      if (dLeft <= 0) {
                        nuovoStato = "SCADUTO";
                      } else if (dLeft <= 15) {
                        nuovoStato = "IN SCADENZA";
                      }

                      update("durc_stato", nuovoStato);
                    }
                  }} 
                  style={fieldCi} 
                  onFocus={e => e.target.style.borderColor = "#3b82f6"} 
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"} 
                />
              </div>
              <div>
                <label style={labelSt}>Stato DVR</label>
                <select value={form.dvr_stato || ""} onChange={e => update("dvr_stato", e.target.value)} style={{ ...fieldCi, cursor: "pointer" }}>
                  <option value="">—</option>
                  {["PRESENTE", "ASSENTE", "IN AGGIORNAMENTO"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={labelSt}>Scad. DVR</label><input type="date" value={form.dvr_scadenza || ""} onChange={e => update("dvr_scadenza", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
            </div>
          </SectionCard>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <DocBlock label="DURC" docKey="durc_doc" form={form} update={update} accent="#ef4444" />
            <DocBlock label="DVR" docKey="dvr_doc" form={form} update={update} accent="#f59e0b" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <DocBlock label="Visura Camerale" docKey="visura_doc" form={form} update={update} accent="#6366f1" />
              <DocBlock label="Contratto" docKey="contratto_doc" form={form} update={update} accent="#10b981" />
            </div>
          </div>

          <SectionCard title="Note" icon="note" accent="#64748b">
            <textarea value={form.note_varie || ""} onChange={e => update("note_varie", e.target.value)} rows={4}
              placeholder="Note generali..." style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </SectionCard>
        </div>
      )}

      {/* ══ MEZZI ══ */}
      {tab === "mezzi" && (
        <SectionCard title="Mezzi del Padroncino" icon="truck" accent="#10b981">
          <TabMezzi
            mezzi={form.mezzi}
            onChange={vals => update("mezzi", vals)}
            mezziFlotta={mezziFlotta}
            onSaveMezzoFlotta={onSaveMezzoFlotta}
            padroncino_id={form.id}
            padroncinoNome={form.nome}
            utente={utente}
            onAutoSave={handleAutoSave}
          />
        </SectionCard>
      )}

      {/* ══ PALMARI ══ */}
      {tab === "palmari" && (
        <SectionCard title="Palmari del Padroncino" icon="device" accent="#6366f1">
          <TabPalmari
            palmari={form.palmari}
            onChange={vals => update("palmari", vals)}
            palmariFlotta={palmariFlotta}
            onSavePalmare={onSavePalmare}
            padroncino_id={form.id}
            padroncinoNome={form.nome}
            utente={utente}
            onAutoSave={handleAutoSave}
          />
        </SectionCard>
      )}

      {/* ══ AUTISTI ══ */}
      {tab === "autisti" && (
        <SectionCard title="Codici Autisti" icon="users" accent="#f59e0b">
          <TabAutisti
            autisti={form.codici_autisti}
            onChange={vals => update("codici_autisti", vals)}
            codAutistiFlotta={codAutistiFlotta}
            onSaveCodAutista={onSaveCodAutista}
            padroncino_id={form.id}
            padroncinoNome={form.nome}
            utente={utente}
            onAutoSave={handleAutoSave}
          />
        </SectionCard>
      )}

      {/* ══ VOCI PREDEFINITE ══ */}
      {tab === "predefinite" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", padding: "12px 16px", fontSize: 12, color: "#1d4ed8" }}>
            📋 Le voci predefinite vengono pre-caricate automaticamente ogni volta che crei un nuovo conteggio per questo padroncino. Puoi sempre modificarle nel conteggio stesso.
          </div>

          <SectionCard title="Fatturato — Voci Extra (PDA)" icon="euro" accent="#3b82f6">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(form.predefinite_fatturato || []).map((voce, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", background: "#fafafa", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={voce.label || ""} onChange={e => { const a = [...(form.predefinite_fatturato || [])]; a[i] = { ...a[i], label: e.target.value }; update("predefinite_fatturato", a); }}
                      placeholder="Descrizione voce" style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <input type="number" step="0.01" value={voce.val || ""} onChange={e => { const a = [...(form.predefinite_fatturato || [])]; a[i] = { ...a[i], val: parseFloat(e.target.value) || 0 }; update("predefinite_fatturato", a); }}
                      placeholder="0,00" style={{ width: 90, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono',monospace" }} />
                    <button onClick={() => update("predefinite_fatturato", (form.predefinite_fatturato || []).filter((_, j) => j !== i))}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                  <textarea value={voce.note || ""} onChange={e => { const a = [...(form.predefinite_fatturato || [])]; a[i] = { ...a[i], note: e.target.value }; update("predefinite_fatturato", a); }}
                    placeholder="Note voce..." rows={1} style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
              ))}
              <button onClick={() => update("predefinite_fatturato", [...(form.predefinite_fatturato || []), { label: "", val: 0, note: "" }])}
                style={{ padding: "7px 14px", borderRadius: 8, background: "#eff6ff", border: "1px dashed #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Aggiungi voce fatturato
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Deduzioni — Voci (Bonifico)" icon="minus" accent="#ef4444">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(form.predefinite_deduzioni || []).map((voce, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={voce.label || ""} onChange={e => { const a = [...(form.predefinite_deduzioni || [])]; a[i] = { ...a[i], label: e.target.value }; update("predefinite_deduzioni", a); }}
                    placeholder="Descrizione" style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <input type="number" step="0.01" value={voce.val || ""} onChange={e => { const a = [...(form.predefinite_deduzioni || [])]; a[i] = { ...a[i], val: parseFloat(e.target.value) || 0 }; update("predefinite_deduzioni", a); }}
                    placeholder="0,00" style={{ width: 90, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono',monospace" }} />
                  <button onClick={() => update("predefinite_deduzioni", (form.predefinite_deduzioni || []).filter((_, j) => j !== i))}
                    style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
              <button onClick={() => update("predefinite_deduzioni", [...(form.predefinite_deduzioni || []), { label: "", val: 0 }])}
                style={{ padding: "7px 14px", borderRadius: 8, background: "#fef2f2", border: "1px dashed #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Aggiungi deduzione
              </button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══ STORICO CONTEGGI ══ */}
      {tab === "conteggi" && (
        <SectionCard title="Storico Conteggi" icon="list" accent="#6366f1">
          {padConteggi.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: 13 }}>Nessun conteggio registrato</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Periodo", "Fattura", "Bonifico", "Stato", ""].map(h => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...padConteggi].sort((a, b) => b.anno - a.anno || b.mese - a.mese).map((c, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <TD><span style={{ fontWeight: 700 }}>{MESI?.[c.mese - 1] || c.mese} {c.anno}</span></TD>
                    <TD><span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#166534" }}>{euro(c.totale_fattura || 0)}</span></TD>
                    <TD><span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#1d4ed8" }}>{euro(c.totale_da_bonificare || 0)}</span></TD>
                    <TD><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: c.stato === "PAGATO" ? "#dcfce7" : "#fef9c3", color: c.stato === "PAGATO" ? "#166534" : "#854d0e", fontWeight: 700 }}>{c.stato || "—"}</span></TD>
                    <TD>
                      <button onClick={() => onSaveConteggio && onSaveConteggio(c)}
                        style={{ padding: "4px 10px", borderRadius: 6, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        Apri
                      </button>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      )}

      {/* ══ CRONOLOGIA / LOG ══ */}
      {tab === "cronologia" && (
        <CronologiaTab
          cronologia={form.cronologia || []}
          padNome={form.nome}
          onAddNota={(campo, testo) => {
            if (!testo.trim()) return;
            const entry = {
              ts:     new Date().toISOString(),
              data:   new Date().toLocaleDateString("it-IT"),
              tipo:   "Nota manuale",
              campi:  [{ label: campo.trim() || "Nota", da: "—", a: testo.trim() }],
              utente,
              manuale: true,
            };
            const updated = { ...form, cronologia: [...(form.cronologia || []), entry] };
            setForm(updated);
            formRef.current = updated;
            onSave(updated);
          }}
        />
      )}

    </div>
  );
};
