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

const DelBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: "#fee2e2", border: "none", borderRadius: 5, padding: "3px 7px", color: "#dc2626", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>✕</button>
);

// ─── TAB MEZZI ────────────────────────────────────────────────────────────────
const TabMezzi = ({ mezzi, onChange, mezziFlotta = [], onSaveMezzoFlotta, onAutoSave, padroncino_id = "" }) => {
  const rows = mezzi || [];
  const [showPicker, setShowPicker] = useState(false);
  // Mezzi disponibili dalla flotta globale (non già assegnati a questo pad)
  const targheUsate = new Set(rows.map(m => m.targa).filter(Boolean));
  const disponibili = mezziFlotta.filter(m => m.stato === "DISPONIBILE" && m.targa && !targheUsate.has(m.targa));

  const update = (i, field, val) => {
    if (field === "__DELETE__") {
      const rimosso = rows[i];
      const newRows = rows.filter((_, idx) => idx !== i);
      onChange(newRows);
      // Libera il mezzo nella flotta globale
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

  // Calcola totali attivi
  const totImp  = rows.filter(m => m.stato === "ATTIVO").reduce((s, m) => s + (m.tariffa_mensile || 0), 0);

  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 90 }} />{/* Targa */}
            <col style={{ width: 100 }} />{/* Alimentazione */}
            <col style={{ width: 90 }} />{/* Marca */}
            <col style={{ width: 90 }} />{/* Modello */}
            <col style={{ width: 90 }} />{/* Stato */}
            <col style={{ width: 100 }} />{/* Data inizio */}
            <col style={{ width: 100 }} />{/* Data fine */}
            <col style={{ width: 90 }} />{/* Tariffa */}
            <col style={{ width: 80 }} />{/* Con IVA */}
            <col style={{ width: 80 }} />{/* Documento */}
            <col />{/* Note */}
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <TH>Targa</TH>
              <TH>Alimentazione</TH>
              <TH>Marca</TH>
              <TH>Modello</TH>
              <TH>Stato</TH>
              <TH>Inizio</TH>
              <TH>Fine</TH>
              <TH>Tariffa €</TH>
              <TH>+IVA €</TH>
              <TH>Doc.</TH>
              <TH>Note</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <TD>
                  <input value={m.targa || ""} onChange={e => update(i, "targa", e.target.value.toUpperCase())}
                    style={ci} placeholder="AA000BB"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <select value={m.alimentazione || "Diesel"} onChange={e => update(i, "alimentazione", e.target.value)} style={ci}>
                    {["Diesel", "Benzina", "GPL", "Metano", "Ibrido", "Elettrico"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </TD>
                <TD>
                  <input value={m.marca || ""} onChange={e => update(i, "marca", e.target.value)} style={ci} placeholder="Fiat"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input value={m.modello || ""} onChange={e => update(i, "modello", e.target.value)} style={ci} placeholder="Ducato"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <select value={m.stato || "ATTIVO"} onChange={e => update(i, "stato", e.target.value)}
                    style={{ ...ci, color: m.stato === "ATTIVO" ? "#166534" : m.stato === "FERMO" ? "#92400e" : "#6b7280", fontWeight: 600 }}>
                    <option>ATTIVO</option><option>FERMO</option><option>DISMESSO</option>
                  </select>
                </TD>
                <TD>
                  <input type="date" value={m.data_inizio || ""} onChange={e => update(i, "data_inizio", e.target.value)} style={ciDate}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="date" value={m.data_fine || ""} onChange={e => update(i, "data_fine", e.target.value)} style={ciDate}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="number" step="0.01" value={m.tariffa_mensile || ""} onChange={e => update(i, "tariffa_mensile", parseFloat(e.target.value) || 0)}
                    style={ciMono} placeholder="0,00"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{((m.tariffa_mensile || 0) * 1.22).toFixed(2)}</span>
                </TD>
                <TD center>
                  {m.doc ? (
                    <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                      <button onClick={() => window.open(m.doc.data)} style={{ fontSize: 10, background: "#eff6ff", border: "none", borderRadius: 4, padding: "2px 5px", color: "#1d4ed8", cursor: "pointer" }}>Apri</button>
                      <button onClick={() => update(i, "doc", null)} style={{ fontSize: 10, background: "#fee2e2", border: "none", borderRadius: 4, padding: "2px 5px", color: "#dc2626", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <span style={{ fontSize: 10, background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: 4, padding: "2px 6px", color: "#64748b" }}>+ doc</span>
                      <input type="file" accept=".pdf,.jpg,.png,.doc,.docx" style={{ display: "none" }}
                        onChange={e => {
                          const file = e.target.files[0]; if (!file) return;
                          const r = new FileReader();
                          r.onload = ev => update(i, "doc", { name: file.name, data: ev.target.result, type: file.type });
                          r.readAsDataURL(file);
                        }} />
                    </label>
                  )}
                </TD>
                <TD>
                  <input value={m.note || ""} onChange={e => update(i, "note", e.target.value)} style={ci} placeholder="Note..."
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD center><DelBtn onClick={() => update(i, "__DELETE__")} /></TD>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={12} style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Nessun mezzo. Clicca "+ Aggiungi"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={() => update(0, "__ADD__")} style={{ padding: "7px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px dashed #86efac", color: "#166534", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="plus" size={12} /> Aggiungi Mezzo Manuale
        </button>
        {disponibili.length > 0 && (
          <button onClick={() => setShowPicker(v => !v)} style={{ padding: "7px 14px", borderRadius: 8, background: "#eff6ff", border: "1px dashed #93c5fd", color: "#1d4ed8", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="truck" size={12} /> Da Flotta ({disponibili.length} disponibili)
          </button>
        )}
        {rows.length > 0 && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Attivi: <strong>{rows.filter(m => m.stato === "ATTIVO").length}</strong> · Tariffa tot.: <strong style={{ color: "#166534", fontFamily: "'DM Mono',monospace" }}>{euro(totImp)}</strong> · Con IVA: <strong style={{ fontFamily: "'DM Mono',monospace" }}>{euro(totImp * 1.22)}</strong>
          </span>
        )}
      </div>
      {showPicker && disponibili.length > 0 && (
        <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 10, border: "1px solid #bfdbfe", padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Seleziona dalla Flotta Disponibile
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {disponibili.map(m => (
              <button key={m.id} onClick={() => {
                const newRows = [...rows, {
                  targa: m.targa, alimentazione: m.alimentazione || "Diesel",
                  marca: m.marca || "", modello: m.modello || "",
                  stato: "ATTIVO", data_inizio: new Date().toISOString().slice(0,10), data_fine: "",
                  tariffa_mensile: m.rata_noleggio || 0, note: ""
                }];
                onChange(newRows);
                // Aggiorna subito il mezzo nella flotta globale come ASSEGNATO
                if (onSaveMezzoFlotta) onSaveMezzoFlotta({ ...m, stato: "ASSEGNATO", padroncino_id });
                // Auto-salva il padroncino
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
      // Libera il palmare nella flotta globale
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
            <col style={{ width: 130 }} />{/* Seriale */}
            <col style={{ width: 110 }} />{/* Autista */}
            <col style={{ width: 90 }} />{/* Stato */}
            <col style={{ width: 85 }} />{/* Tariffa */}
            <col style={{ width: 85 }} />{/* +IVA */}
            <col style={{ width: 95 }} />{/* Inizio */}
            <col style={{ width: 95 }} />{/* Fine */}
            <col style={{ width: 70 }} />{/* Doc */}
            <col />{/* Note */}
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <TH>Seriale</TH>
              <TH>Autista assoc.</TH>
              <TH>Stato</TH>
              <TH>Tariffa €</TH>
              <TH>+IVA 22%</TH>
              <TH>Inizio</TH>
              <TH>Fine</TH>
              <TH>Doc.</TH>
              <TH>Note</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const flottaPalm = palmariFlotta.find(f => f.seriale && f.seriale === p.seriale);
              const tariffaMens = p.tariffa_mensile ?? (flottaPalm?.tariffa_mensile || 0);
              const tariffaIva  = parseFloat((tariffaMens * 1.22).toFixed(2));
              return (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <TD>
                  <input value={p.seriale || ""} onChange={e => update(i, "seriale", e.target.value)} style={ci} placeholder="SN123456"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input value={p.codice_associato || ""} onChange={e => update(i, "codice_associato", e.target.value)} style={ci} placeholder="Cod. autista"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <select value={p.stato || "ATTIVO"} onChange={e => update(i, "stato", e.target.value)}
                    style={{ ...ci, color: p.stato === "ATTIVO" ? "#166534" : "#92400e", fontWeight: 600 }}>
                    <option>ATTIVO</option><option>GUASTO</option><option>DISMESSO</option>
                  </select>
                </TD>
                <TD>
                  <span style={{ display:"block", padding:"4px 6px", background: tariffaMens ? "#f0fdf4" : "#fafafa", color: tariffaMens ? "#166534" : "#94a3b8", borderRadius:6, textAlign:"right", fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>
                    {tariffaMens ? `€ ${tariffaMens.toFixed(2)}` : "—"}
                  </span>
                </TD>
                <TD>
                  <span style={{ display:"block", padding:"4px 6px", background: tariffaIva ? "#eff6ff" : "#fafafa", color: tariffaIva ? "#1d4ed8" : "#94a3b8", borderRadius:6, textAlign:"right", fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>
                    {tariffaIva ? `€ ${tariffaIva.toFixed(2)}` : "—"}
                  </span>
                </TD>
                <TD>
                  <input type="date" value={p.data_inizio || ""} onChange={e => update(i, "data_inizio", e.target.value)} style={ciDate}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="date" value={p.data_fine || ""} onChange={e => update(i, "data_fine", e.target.value)} style={ciDate}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD center>
                  {p.doc ? (
                    <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                      <button onClick={() => window.open(p.doc.data)} style={{ fontSize: 10, background: "#eff6ff", border: "none", borderRadius: 4, padding: "2px 5px", color: "#1d4ed8", cursor: "pointer" }}>Apri</button>
                      <button onClick={() => update(i, "doc", null)} style={{ fontSize: 10, background: "#fee2e2", border: "none", borderRadius: 4, padding: "2px 5px", color: "#dc2626", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <span style={{ fontSize: 10, background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: 4, padding: "2px 6px", color: "#64748b" }}>+ doc</span>
                      <input type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }}
                        onChange={e => {
                          const file = e.target.files[0]; if (!file) return;
                          const r = new FileReader();
                          r.onload = ev => update(i, "doc", { name: file.name, data: ev.target.result, type: file.type });
                          r.readAsDataURL(file);
                        }} />
                    </label>
                  )}
                </TD>
                <TD>
                  <input value={p.note || ""} onChange={e => update(i, "note", e.target.value)} style={ci} placeholder="Note..."
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD center><DelBtn onClick={() => update(i, "__DELETE__")} /></TD>
              </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Nessun palmare. Clicca "+ Aggiungi"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={() => update(0, "__ADD__")} style={{ padding: "7px 14px", borderRadius: 8, background: "#eff6ff", border: "1px dashed #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
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
                  data_inizio: new Date().toISOString().slice(0,10),
                  data_fine: "", tariffa_mensile: p.tariffa_mensile || 0,
                  note: p.modello || ""
                }];
                onChange(newRows);
                // Aggiorna il palmare nella flotta globale come ASSEGNATO - sincrono e immediato
                if (onSavePalmare) onSavePalmare({ ...p, stato: "ASSEGNATO", padroncino_id });
                // Auto-salva il padroncino SENZA setTimeout (evita stale closure)
                if (onAutoSave) onAutoSave(newRows, "palmari");
                setShowPicker(false);
              }} style={{ padding: "6px 12px", borderRadius: 7, background: "#fff", border: "1px solid #c4b5fd", color: "#6d28d9", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800 }}>{p.seriale}</span>
                <span style={{ color: "#94a3b8" }}>{p.modello || ""}</span>
                {p.tariffa_mensile > 0 && <span style={{ color: "#166534", fontSize: 11 }}>{"€"}{p.tariffa_mensile}/mese</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TAB CODICI AUTISTI ───────────────────────────────────────────────────────
const TabAutisti = ({ autisti, onChange }) => {
  const rows = autisti || [];

  const update = (i, field, val) => {
    if (field === "__DELETE__") { onChange(rows.filter((_, idx) => idx !== i)); return; }
    if (field === "__ADD__")    { onChange([...rows, { codice: "", tariffa_fissa: 0, tariffa_ritiro: 0, target: 0, data_inizio: "", data_fine: "", doc: null, note: "" }]); return; }
    onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 100 }} />{/* Codice */}
            <col style={{ width: 105 }} />{/* Tariffa fissa */}
            <col style={{ width: 105 }} />{/* Tariffa ritiro */}
            <col style={{ width: 90 }} />{/* Target */}
            <col style={{ width: 90 }} />{/* Bonus/Malus */}
            <col style={{ width: 100 }} />{/* Inizio */}
            <col style={{ width: 100 }} />{/* Fine */}
            <col style={{ width: 70 }} />{/* Doc */}
            <col />{/* Note */}
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <TH>Codice</TH>
              <TH>Tariffa fissa €</TH>
              <TH>Tariffa ritiro €</TH>
              <TH>Target</TH>
              <TH>Bonus/Malus €</TH>
              <TH>Inizio</TH>
              <TH>Fine</TH>
              <TH>Doc.</TH>
              <TH>Note</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <TD>
                  <input value={a.codice || ""} onChange={e => update(i, "codice", e.target.value)} style={ci} placeholder="AUT001"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="number" step="0.01" value={a.tariffa_fissa || ""} onChange={e => update(i, "tariffa_fissa", parseFloat(e.target.value) || 0)}
                    style={ciMono} placeholder="0,00"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="number" step="0.01" value={a.tariffa_ritiro || ""} onChange={e => update(i, "tariffa_ritiro", parseFloat(e.target.value) || 0)}
                    style={ciMono} placeholder="0,00"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="number" step="1" value={a.target || ""} onChange={e => update(i, "target", parseInt(e.target.value) || 0)}
                    style={ciMono} placeholder="0"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="number" step="0.01" value={a.bonus_malus || ""} onChange={e => update(i, "bonus_malus", parseFloat(e.target.value) || 0)}
                    style={{ ...ciMono, color: (a.bonus_malus || 0) >= 0 ? "#166534" : "#dc2626" }} placeholder="0,00"
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="date" value={a.data_inizio || ""} onChange={e => update(i, "data_inizio", e.target.value)} style={ciDate}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD>
                  <input type="date" value={a.data_fine || ""} onChange={e => update(i, "data_fine", e.target.value)} style={ciDate}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD center>
                  {a.doc ? (
                    <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                      <button onClick={() => window.open(a.doc.data)} style={{ fontSize: 10, background: "#eff6ff", border: "none", borderRadius: 4, padding: "2px 5px", color: "#1d4ed8", cursor: "pointer" }}>Apri</button>
                      <button onClick={() => update(i, "doc", null)} style={{ fontSize: 10, background: "#fee2e2", border: "none", borderRadius: 4, padding: "2px 5px", color: "#dc2626", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <span style={{ fontSize: 10, background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: 4, padding: "2px 6px", color: "#64748b" }}>+ doc</span>
                      <input type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }}
                        onChange={e => {
                          const file = e.target.files[0]; if (!file) return;
                          const r = new FileReader();
                          r.onload = ev => update(i, "doc", { name: file.name, data: ev.target.result, type: file.type });
                          r.readAsDataURL(file);
                        }} />
                    </label>
                  )}
                </TD>
                <TD>
                  <input value={a.note || ""} onChange={e => update(i, "note", e.target.value)} style={ci} placeholder="Note..."
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </TD>
                <TD center><DelBtn onClick={() => update(i, "__DELETE__")} /></TD>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Nessun autista. Clicca "+ Aggiungi"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button onClick={() => update(0, "__ADD__")} style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "#fef3c7", border: "1px dashed #fcd34d", color: "#92400e", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
        <Icon name="plus" size={12} /> Aggiungi Autista
      </button>
    </div>
  );
};

// ─── DOC BLOCK INLINE ────────────────────────────────────────────────────────
const DocBlock = ({ label, docKey, form, update, accent }) => {
  const doc = form[docKey];
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: `1px solid #e2e8f0`, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
      {doc ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "5px 8px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            📄 {doc.name}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => window.open(doc.data)} style={{ flex: 1, padding: "5px", borderRadius: 6, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Apri</button>
            <button onClick={() => update(docKey, null)} style={{ flex: 1, padding: "5px", borderRadius: 6, background: "#fee2e2", border: "none", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Rimuovi</button>
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const PadroncinoDetail = ({ padroncino, conteggi, onBack, onSave, onSaveConteggio, onLogChange, mezziFlotta = [], palmariFlotta = [], onSaveMezzoFlotta, onSavePalmare }) => {
  const [tab, setTab]     = useState("anagrafica");
  const [form, setForm]   = useState({ ...padroncino });
  const [dirty, setDirty] = useState(false);
  const formRef = useRef(form); // always points to latest form

  const update = (field, val) => {
    setForm(f => {
      const next = { ...f, [field]: val };
      formRef.current = next;
      return next;
    });
    setDirty(true);
  };

  const handleSave = () => {
    onSave(form);
    setDirty(false);
    // Passa anche il form originale (padroncino prop) per calcolare il diff
    if (onLogChange) onLogChange(form, "Dati modificati", padroncino);
    // Punto 3: sincronizza palmari globali — aggiorna stato/assegnazione nel db palmari
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
      // Libera palmari rimossi dall'anagrafica
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
    ["anagrafica",   "Anagrafica"],
    ["mezzi",        `Mezzi (${(form.mezzi || []).length})`],
    ["palmari",      `Palmari (${(form.palmari || []).length})`],
    ["autisti",      `Autisti (${(form.codici_autisti || []).length})`],
    ["predefinite",  "📋 Voci Predefinite"],
    ["conteggi",     `Storico (${padConteggi.length})`],
    ["cronologia",   `Log (${(form.cronologia || []).length})`],
  ];

  const labelSt = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 };
  const fieldCi = { padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", color: "#0f172a", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="back" size={14} /> Indietro
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{form.nome}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Cod. {form.codice} · {form.partita_iva || "P.IVA n.d."}</div>
          </div>
          <Badge label={form.stato} color={sc.text} bg={sc.bg} />
          <Badge label={form.durc_stato || "DURC —"} color={dc.text} bg={dc.bg} border={dc.border} />
          <Badge label={form.dvr_stato || "DVR —"} color={dv.text} bg={dv.bg} border={dv.border} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Fatturato tot.</div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: "#1d4ed8" }}>{euro(fattTot)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Bonificato tot.</div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: bonTot >= 0 ? "#166534" : "#dc2626" }}>{euro(bonTot)}</div>
          </div>
          {dirty && (
            <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 9, background: "#1e40af", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Icon name="save" size={14} /> Salva Modifiche
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, transition: "all 0.15s",
            background: tab === key ? "#1e40af" : "#f1f5f9",
            color: tab === key ? "#fff" : "#475569"
          }}>{label}</button>
        ))}
      </div>

      {/* ANAGRAFICA */}
      {tab === "anagrafica" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionCard title="Dati Principali" icon="users" accent="#3b82f6">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[["nome","Ragione Sociale"],["codice","Codice GLS"],["partita_iva","Partita IVA"],["codice_fiscale","Cod. Fiscale"],["telefono","Telefono"],["email","Email"]].map(([k, l]) => (
                <div key={k}>
                  <label style={labelSt}>{l}</label>
                  <input value={form[k] || ""} onChange={e => update(k, e.target.value)} style={fieldCi}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelSt}>Rappresentante Legale</label>
                <input value={form.rappresentante || ""} onChange={e => update("rappresentante", e.target.value)} style={fieldCi}
                  placeholder="Nome e Cognome"
                  onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
              <div>
                <label style={labelSt}>Via / Sede Legale</label>
                <input value={form.via_sede_legale || ""} onChange={e => update("via_sede_legale", e.target.value)} style={fieldCi}
                  placeholder="Via, n° civico"
                  onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
              <div>
                <label style={labelSt}>Sede Legale (Città)</label>
                <input value={form.sede_legale || ""} onChange={e => update("sede_legale", e.target.value)} style={fieldCi}
                  placeholder="Comune, CAP"
                  onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Stato & Documenti" icon="note" accent="#8b5cf6">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[["stato","Stato",["ATTIVO","DISMESSO"]],["durc_stato","DURC",["","VALIDO","SCADUTO","ESENTE"]],["dvr_stato","DVR",["","VALIDO","SCADUTO","ESENTE"]]].map(([k, l, opts]) => (
                <div key={k}>
                  <label style={labelSt}>{l}</label>
                  <select value={form[k] || ""} onChange={e => update(k, e.target.value)} style={{ ...fieldCi, cursor: "pointer" }}>
                    {opts.map(o => <option key={o} value={o}>{o || "—"}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={labelSt}>Scad. DURC</label>
                <input type="date" value={form.durc_scadenza || ""} onChange={e => update("durc_scadenza", e.target.value)} style={fieldCi}
                  onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
            </div>
          </SectionCard>
          {/* DOCUMENTI INLINE */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {/* DURC */}
            <DocBlock label="DURC" docKey="durc_doc" form={form} update={update} accent="#ef4444" />
            {/* DVR */}
            <DocBlock label="DVR" docKey="dvr_doc" form={form} update={update} accent="#f59e0b" />
            {/* Visura + Contratto */}
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

      {/* MEZZI */}
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

      {/* PALMARI */}
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

      {/* AUTISTI */}
      {tab === "autisti" && (
        <SectionCard title="Codici Autisti" icon="users" accent="#f59e0b">
          <TabAutisti autisti={form.codici_autisti} onChange={vals => update("codici_autisti", vals)} />
        </SectionCard>
      )}

      {/* VOCI PREDEFINITE */}
      {tab === "predefinite" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", padding: "12px 16px", fontSize: 12, color: "#1d4ed8" }}>
            📋 Le voci predefinite vengono pre-caricate automaticamente ogni volta che crei un nuovo conteggio per questo padroncino. Puoi sempre modificarle nel conteggio stesso.
          </div>

          {/* FATTURATO — voci extra */}
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
                  <input value={voce.note || ""} onChange={e => { const a = [...(form.predefinite_fatturato || [])]; a[i] = { ...a[i], note: e.target.value }; update("predefinite_fatturato", a); }}
                    placeholder="Note voce (opzionali)" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, color: "#64748b" }} />
                </div>
              ))}
              <button onClick={() => update("predefinite_fatturato", [...(form.predefinite_fatturato || []), { label: "", val: 0, note: "" }])}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                <Icon name="plus" size={13} /> Aggiungi voce PDA
              </button>
            </div>
          </SectionCard>

          {/* FATTURATO — altri */}
          <SectionCard title="Voci Extra Fatturato" icon="note" accent="#8b5cf6">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(form.predefinite_altri_fatturato || []).map((item, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", background: "#fafafa", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={item.descrizione || ""} onChange={e => { const a = [...(form.predefinite_altri_fatturato || [])]; a[i] = { ...a[i], descrizione: e.target.value }; update("predefinite_altri_fatturato", a); }}
                      placeholder="Descrizione" style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <input type="number" step="0.01" value={item.importo || ""} onChange={e => { const a = [...(form.predefinite_altri_fatturato || [])]; a[i] = { ...a[i], importo: parseFloat(e.target.value) || 0 }; update("predefinite_altri_fatturato", a); }}
                      placeholder="0,00" style={{ width: 90, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono',monospace" }} />
                    <button onClick={() => update("predefinite_altri_fatturato", (form.predefinite_altri_fatturato || []).filter((_, j) => j !== i))}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                  <input value={item.note || ""} onChange={e => { const a = [...(form.predefinite_altri_fatturato || [])]; a[i] = { ...a[i], note: e.target.value }; update("predefinite_altri_fatturato", a); }}
                    placeholder="Note voce (opzionali)" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, color: "#64748b" }} />
                </div>
              ))}
              <button onClick={() => update("predefinite_altri_fatturato", [...(form.predefinite_altri_fatturato || []), { descrizione: "", importo: 0, note: "" }])}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                <Icon name="plus" size={13} /> Aggiungi voce Extra Fatturato
              </button>
            </div>
          </SectionCard>

          {/* ALTRI ADDEBITI predefiniti */}
          <SectionCard title="Altri Addebiti" icon="calculator" accent="#ef4444">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(form.predefinite_altri_addebiti || []).map((item, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", background: "#fafafa", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={item.descrizione || ""} onChange={e => { const a = [...(form.predefinite_altri_addebiti || [])]; a[i] = { ...a[i], descrizione: e.target.value }; update("predefinite_altri_addebiti", a); }}
                      placeholder="Descrizione addebito" style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <input type="number" step="0.01" value={item.importo || ""} onChange={e => { const a = [...(form.predefinite_altri_addebiti || [])]; a[i] = { ...a[i], importo: parseFloat(e.target.value) || 0 }; update("predefinite_altri_addebiti", a); }}
                      placeholder="0,00" style={{ width: 90, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono',monospace" }} />
                    <select value={item.iva_rate ?? 0.22} onChange={e => { const a = [...(form.predefinite_altri_addebiti || [])]; a[i] = { ...a[i], iva_rate: parseFloat(e.target.value) }; update("predefinite_altri_addebiti", a); }}
                      style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 11, background: "#fff" }}>
                      {[["No IVA",0],["IVA 4%",0.04],["IVA 10%",0.10],["IVA 22%",0.22]].map(([l,r]) => <option key={r} value={r}>{l}</option>)}
                    </select>
                    <button onClick={() => update("predefinite_altri_addebiti", (form.predefinite_altri_addebiti || []).filter((_, j) => j !== i))}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}>
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                  <input value={item.note || ""} onChange={e => { const a = [...(form.predefinite_altri_addebiti || [])]; a[i] = { ...a[i], note: e.target.value }; update("predefinite_altri_addebiti", a); }}
                    placeholder="Note addebito (opzionali)" style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, color: "#64748b" }} />
                </div>
              ))}
              <button onClick={() => update("predefinite_altri_addebiti", [...(form.predefinite_altri_addebiti || []), { descrizione: "", importo: 0, iva_rate: 0.22, note: "" }])}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#475569", fontSize: 12, cursor: "pointer" }}>
                <Icon name="plus" size={13} /> Aggiungi Addebito Predefinito
              </button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* STORICO CONTEGGI */}
      {tab === "conteggi" && (
        <SectionCard title="Storico Conteggi" icon="calculator" accent="#10b981">
          {padConteggi.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>Nessun conteggio per questo padroncino</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Mese", "Anno", "Fattura", "Addebiti", "Da Bonif.", "Completamento"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderBottom: "2px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...padConteggi].reverse().map((c, i) => {
                  const steps = [c.distrib_inviata, c.pdf_addeb, c.fattura_ricevuta, c.fatt_tu_creata, c.unione_pdf, c.caricata_scadenziario];
                  const done = steps.filter(Boolean).length;
                  const pct = Math.round((done / 6) * 100);
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, fontSize: 12 }}>{c.mese}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}>{c.anno}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{euro(c.totale_fattura)}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#dc2626" }}>{euro(c.totale_addebiti)}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: c.totale_da_bonificare >= 0 ? "#166534" : "#dc2626" }}>{euro(c.totale_da_bonificare)}</td>
                      <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 70, height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#10b981" : "#3b82f6", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>
      )}

      {/* CRONOLOGIA */}
      {tab === "cronologia" && (
        <SectionCard title="Cronologia Modifiche" icon="calendar" accent="#7c3aed">
          {(form.cronologia || []).length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>Nessuna voce in cronologia</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...(form.cronologia || [])].reverse().map((ev, i) => {
                const d  = new Date(ev.ts);
                const ds = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                // Colore dot in base al tipo
                const dotColor = ev.tipo?.includes("Palmar") ? "#f59e0b"
                  : ev.tipo?.includes("Mezzo") ? "#0ea5e9"
                  : ev.tipo?.includes("Eliminat") ? "#dc2626"
                  : "#7c3aed";
                return (
                  <div key={i} style={{ display: "flex", gap: 0 }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",width:26,flexShrink:0 }}>
                      <div style={{ width:10,height:10,borderRadius:"50%",background:dotColor,marginTop:12,flexShrink:0,boxShadow:`0 0 0 3px ${dotColor}22` }}/>
                      {i < (form.cronologia||[]).length - 1 && <div style={{ width:2,flex:1,background:"#f1f5f9",minHeight:16 }}/>}
                    </div>
                    <div style={{ flex:1,paddingBottom:12,paddingTop:8,paddingLeft:8 }}>
                      {/* Header: tipo + data */}
                      <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4 }}>
                        <span style={{ fontSize:12,fontWeight:800,color:"#374151" }}>{ev.tipo || "Modifica"}</span>
                        {ev.utente && (
                          <span style={{ fontSize:10,padding:"1px 7px",borderRadius:10,background:"#ede9fe",color:"#6d28d9",fontWeight:700,border:"1px solid #ddd6fe" }}>
                            👤 {ev.utente}
                          </span>
                        )}
                        <span style={{ fontSize:10,color:"#94a3b8",marginLeft:"auto",whiteSpace:"nowrap" }}>{ds}</span>
                      </div>
                      {/* Campi modificati (diff) */}
                      {ev.campi && ev.campi.length > 0 && (
                        <div style={{ display:"flex",flexDirection:"column",gap:3,marginTop:4 }}>
                          {ev.campi.map((c, ci) => (
                            <div key={ci} style={{ display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#f8fafc",borderRadius:7,fontSize:11,flexWrap:"wrap" }}>
                              <span style={{ fontWeight:700,color:"#475569",minWidth:100 }}>{c.label}</span>
                              <span style={{ fontFamily:"'DM Mono',monospace",color:"#64748b",textDecoration:"line-through",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.da || "—"}</span>
                              <span style={{ color:"#cbd5e1" }}>→</span>
                              <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#166534",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.a || "—"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Dettaglio libero (vecchio formato o note) */}
                      {ev.dettaglio && !ev.campi && (
                        <div style={{ fontSize:11,color:"#64748b",padding:"4px 8px",background:"#f8fafc",borderRadius:7,marginTop:4 }}>{ev.dettaglio}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};
