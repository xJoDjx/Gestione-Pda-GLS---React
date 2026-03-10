import { useState, useRef } from "react";
import { Icon } from "./Icons";
import { Badge, SectionCard, DocUpload } from "./BaseComponents";
import { euro, durcColor, dvrColor, statoColor, durcDaysLeft, MESI } from "../utils/formatters";

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

// ─── BUG 4 FIX: apertura file con app nativa ──────────────────────────────────
const isElectron = typeof window !== "undefined" && !!window.electronAPI;

const apriFileNativo = async (doc) => {
  // Supporta sia doc.data che doc.data_b64
  const base64 = doc?.data || doc?.data_b64;
  const nome   = doc?.name || doc?.nome || "documento";
  if (!base64) return;
  if (isElectron && window.electronAPI.openFile) {
    try {
      await window.electronAPI.openFile(base64, nome);
    } catch (e) {
      // fallback download
      const a = document.createElement("a");
      a.href = base64; a.download = nome; a.click();
    }
  } else {
    const a = document.createElement("a");
    a.href = base64; a.download = nome; a.click();
  }
};

const salvaFileSuDisco = async (doc) => {
  const base64 = doc?.data || doc?.data_b64;
  const nome   = doc?.name || doc?.nome || "documento";
  if (isElectron && window.electronAPI.saveFile) {
    await window.electronAPI.saveFile(base64, nome);
  } else {
    const a = document.createElement("a");
    a.href = base64; a.download = nome; a.click();
  }
};

// ─── DocBlock: mostra un documento con Apri/Rimuovi (BUG 4 FIX) ──────────────
const DocBlock = ({ label, docKey, form, update, accent = "#3b82f6" }) => {
  const doc = form[docKey];
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      {doc ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "5px 8px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            📄 {doc.name || doc.nome}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* BUG 4 FIX: usa apriFileNativo invece di window.open(doc.data) */}
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
          <div style={{ padding: "10px", borderRadius: 7, border: "2px dashed #e2e8f0", textAlign: "center", fontSize: 11, color: "#94a3b8", background: "#fafafa", transition: "all 0.15s" }}
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
const TabMezzi = ({ mezzi, onChange, mezziFlotta = [], onSaveMezzoFlotta, onAutoSave, padroncino_id = "" }) => {
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
        if (globale) onSaveMezzoFlotta({ ...globale, stato: "DISPONIBILE", padroncino_id: "" });
      }
      if (onAutoSave) onAutoSave(newRows, "mezzi");
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
                if (onSaveMezzoFlotta) onSaveMezzoFlotta({ ...m, stato: "ASSEGNATO", padroncino_id });
                if (onAutoSave) onAutoSave(newRows, "mezzi");
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
const TabPalmari = ({ palmari, onChange, palmariFlotta = [], onSavePalmare, onAutoSave, padroncino_id = "" }) => {
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
        if (globale) onSavePalmare({ ...globale, stato: "DISPONIBILE", padroncino_id: "" });
      }
      if (onAutoSave) onAutoSave(newRows, "palmari");
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
                if (onSavePalmare) onSavePalmare({ ...p, stato: "ASSEGNATO", padroncino_id });
                if (onAutoSave) onAutoSave(newRows, "palmari");
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

// ─── TAB CODICI AUTISTI (con picker flotta) ────────────────────────────────────
const TabAutisti = ({ autisti, onChange, codAutistiFlotta = [], onSaveCodAutista, onAutoSave, padroncino_id = "" }) => {
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
        if (globale) onSaveCodAutista({ ...globale, stato: "DISPONIBILE", padroncino_id: "" });
      }
      if (onAutoSave) onAutoSave(newRows, "codici_autisti");
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
                if (onSaveCodAutista) onSaveCodAutista({ ...a, stato: "ASSEGNATO", padroncino_id });
                if (onAutoSave) onAutoSave(newRows, "codici_autisti");
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

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────
// BUG 2 FIX: firma aggiornata con codAutistiFlotta + onSaveCodAutista
export const PadroncinoDetail = ({
  padroncino, conteggi, onBack, onSave, onSaveConteggio, onLogChange,
  mezziFlotta = [], palmariFlotta = [], onSaveMezzoFlotta, onSavePalmare,
  codAutistiFlotta = [], onSaveCodAutista,
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

  // BUG 2 FIX: handleSave chiama onLogChange con padroncino originale per calcolare diff completo
  const handleSave = () => {
    onSave(form);
    setDirty(false);
    if (onLogChange) onLogChange(form, "Dati modificati", padroncino);
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
              <div><label style={labelSt}>Scad. DURC</label><input type="date" value={form.durc_scadenza || ""} onChange={e => update("durc_scadenza", e.target.value)} style={fieldCi} onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} /></div>
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

          {/* DOCUMENTI - BUG 4 FIX: usa DocBlock con apriFileNativo */}
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
            onAutoSave={(vals, campo) => {
              const updated = { ...formRef.current, [campo]: vals };
              formRef.current = updated;
              setForm(updated);
              setDirty(false);
              onSave(updated);
            }}
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
            onAutoSave={(vals, campo) => {
              const updated = { ...formRef.current, [campo]: vals };
              formRef.current = updated;
              setForm(updated);
              setDirty(false);
              onSave(updated);
            }}
          />
        </SectionCard>
      )}

      {/* ══ AUTISTI (con picker flotta) ══ */}
      {tab === "autisti" && (
        <SectionCard title="Codici Autisti" icon="users" accent="#f59e0b">
          <TabAutisti
            autisti={form.codici_autisti}
            onChange={vals => update("codici_autisti", vals)}
            codAutistiFlotta={codAutistiFlotta}
            onSaveCodAutista={onSaveCodAutista}
            padroncino_id={form.id}
            onAutoSave={(vals, campo) => {
              const updated = { ...formRef.current, [campo]: vals };
              formRef.current = updated;
              setForm(updated);
              setDirty(false);
              onSave(updated);
            }}
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
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          {/* Header */}
          <div style={{ padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#0f172a" }}>📋 Log Modifiche — {form.nome}</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{(form.cronologia||[]).length} eventi · aggiornamento in tempo reale</div>
            </div>
            {(form.cronologia||[]).length > 0 && (
              <button onClick={() => { if(window.confirm("Cancellare tutta la cronologia?")) update("cronologia", []); }}
                style={{ padding:"6px 12px", borderRadius:7, background:"#fee2e2", color:"#dc2626", border:"none", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                Cancella
              </button>
            )}
          </div>

          {(form.cronologia||[]).length === 0 ? (
            <div style={{ padding:"50px 20px", textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
              <div style={{ fontSize:13 }}>Nessuna modifica registrata</div>
            </div>
          ) : (
            <>
              {/* Intestazioni */}
              <div style={{ display:"grid", gridTemplateColumns:"155px 130px 115px 1fr", background:"#f8fafc", borderBottom:"2px solid #e2e8f0", padding:"8px 16px" }}>
                {["Data / Ora","Utente","Azione","Descrizione"].map(h => (
                  <div key={h} style={{ fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</div>
                ))}
              </div>

              <div style={{ maxHeight:500, overflowY:"auto" }}>
                {[...(form.cronologia||[])].reverse().map((entry, i) => {
                  // Ogni entry della cronologia padroncino ha: {ts, azione, campi:[], utente}
                  // oppure vecchio formato con campi: [...] e nessun utente
                  const campi   = Array.isArray(entry.campi) ? entry.campi : [];
                  const azione  = entry.azione || "Modifica";
                  const utente  = entry.utente || entry.username || "—";
                  const dt      = entry.ts ? new Date(entry.ts) : null;
                  const dataOra = dt
                    ? dt.toLocaleDateString("it-IT")+" "+dt.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"})
                    : (entry.data || "—");

                  // Costruisci descrizione dall'azione e dai campi
                  const azioneDisplay = azione === "CREA" ? "Creazione" : azione === "ELIMINA" ? "Eliminazione" : azione === "MODIFICA" ? "Modifica" : azione;
                  const acMeta = {
                    "Creazione":   { bg:"#dcfce7", color:"#166534", dot:"#22c55e" },
                    "Modifica":    { bg:"#dbeafe", color:"#1d4ed8", dot:"#3b82f6" },
                    "Eliminazione":{ bg:"#fee2e2", color:"#dc2626", dot:"#ef4444" },
                  }[azioneDisplay] || { bg:"#f1f5f9", color:"#374151", dot:"#94a3b8" };

                  // Descrizione: usa campi se disponibili, altrimenti usa entry.descrizione
                  let descrizione = entry.descrizione || "";
                  if (!descrizione && campi.length > 0) {
                    descrizione = campi.map(c => `${c.campo}: "${c.da||"—"}" → "${c.a||"—"}"`).join(" · ");
                  }
                  if (!descrizione) descrizione = "Nessun dettaglio";

                  return (
                    <div key={i}>
                      <div style={{ display:"grid", gridTemplateColumns:"155px 130px 115px 1fr", padding:"9px 16px", borderBottom:"1px solid #f8fafc", background:i%2===0?"#fff":"#fafbfc", alignItems:"start" }}>
                        {/* Data/Ora */}
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#64748b", lineHeight:1.4, paddingTop:2 }}>{dataOra}</div>

                        {/* Utente */}
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          {utente !== "—" ? (
                            <>
                              <div style={{ width:22, height:22, borderRadius:"50%", background:"#8b5cf6", color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                {utente[0].toUpperCase()}
                              </div>
                              <div style={{ fontSize:11, fontWeight:600, color:"#374151" }}>{utente}</div>
                            </>
                          ) : <div style={{ fontSize:11, color:"#94a3b8" }}>—</div>}
                        </div>

                        {/* Azione */}
                        <div style={{ paddingTop:2 }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:5, fontSize:10, fontWeight:700, background:acMeta.bg, color:acMeta.color }}>
                            <span style={{ width:5, height:5, borderRadius:"50%", background:acMeta.dot, display:"inline-block" }} />
                            {azioneDisplay}
                          </span>
                        </div>

                        {/* Descrizione + dettaglio campi */}
                        <div>
                          <div style={{ fontSize:12, color:"#374151", wordBreak:"break-word" }}>
                            {descrizione}
                          </div>
                          {campi.length > 1 && (
                            <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:3 }}>
                              {campi.map((c, ci) => (
                                <div key={ci} style={{ display:"flex", gap:6, alignItems:"center", fontSize:11 }}>
                                  <span style={{ fontWeight:700, color:"#64748b", minWidth:100 }}>{c.campo}</span>
                                  <span style={{ background:"#fee2e2", color:"#991b1b", padding:"1px 6px", borderRadius:3, fontFamily:"'DM Mono',monospace", fontSize:10 }}>{c.da||"—"}</span>
                                  <span style={{ color:"#94a3b8" }}>→</span>
                                  <span style={{ background:"#dcfce7", color:"#166534", padding:"1px 6px", borderRadius:3, fontFamily:"'DM Mono',monospace", fontSize:10 }}>{c.a||"—"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};
