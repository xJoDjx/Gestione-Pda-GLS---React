import { useState } from "react";
import { euro } from "../utils/formatters";

// ─── COSTANTI ─────────────────────────────────────────────────────────────────
const STATI = ["DISPONIBILE", "ASSEGNATO", "DISMESSO"];
const bgS   = { DISPONIBILE: "#dcfce7", ASSEGNATO: "#dbeafe", DISMESSO: "#f3f4f6" };
const colS  = { DISPONIBILE: "#166534", ASSEGNATO: "#1d4ed8", DISMESSO: "#6b7280" };

// ─── MINI UI ──────────────────────────────────────────────────────────────────
const Inp = ({ label, value, onChange, type = "text", placeholder = "", small }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>}
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={e => onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
      style={{ padding: small ? "6px 9px" : "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: small ? 12 : 13, background: "#fff", boxSizing: "border-box", width: "100%", outline: "none" }} />
  </div>
);
const Sel = ({ label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {label && <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>}
    <select value={value ?? ""} onChange={e => onChange(e.target.value)}
      style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff", cursor: "pointer" }}>
      <option value="">—</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── STORICO builder ──────────────────────────────────────────────────────────
// BUG 3 FIX: traccia tutti i campi rilevanti + documenti aggiunto/rimosso
const TRACK = [
  ["codice",         "Codice"],
  ["stato",          "Stato"],
  ["padroncino_id",  "Padroncino"],
  ["tariffa_fissa",  "Tariffa fissa"],
  ["tariffa_ritiro", "Tariffa ritiro"],
  ["target",         "Target"],
  ["data_inizio",    "Data inizio"],
  ["data_fine",      "Data fine"],
  ["note",           "Note"],
];

const buildStorico = (old, neo, pads = []) => {
  const ts   = new Date().toISOString();
  const data = new Date().toLocaleDateString("it-IT");
  const log  = [];

  TRACK.forEach(([k, label]) => {
    const vo = String(old[k] ?? "");
    const vn = String(neo[k] ?? "");
    if (vo === vn) return;
    let da = vo || "—", a = vn || "—";
    if (k === "padroncino_id") {
      da = pads.find(p => p.id === vo)?.nome || (vo ? vo : "Nessuno");
      a  = pads.find(p => p.id === vn)?.nome || (vn ? vn : "Nessuno");
    }
    if (k === "tariffa_fissa" || k === "tariffa_ritiro") {
      da = euro(parseFloat(vo) || 0);
      a  = euro(parseFloat(vn) || 0);
    }
    log.push({ ts, data, campo: label, da, a });
  });

  // Documenti aggiunti/rimossi
  const docsOld = (old.documenti || []).map(d => d.nome || d.id).filter(Boolean);
  const docsNew = (neo.documenti || []).map(d => d.nome || d.id).filter(Boolean);
  docsNew.filter(n => !docsOld.includes(n)).forEach(n =>
    log.push({ ts, data, campo: "Documento aggiunto", da: "—", a: n })
  );
  docsOld.filter(n => !docsNew.includes(n)).forEach(n =>
    log.push({ ts, data, campo: "Documento rimosso", da: n, a: "—" })
  );

  return log;
};



// ─── STORICO TABELLA (design uniforme per Mezzi, Palmari, Cod Autisti) ───────
const STILE_AZ = {
  Assegnazione:   { bg:"#dcfce7", color:"#166534", border:"#bbf7d0", dot:"#22c55e" },
  Rimozione:      { bg:"#fee2e2", color:"#dc2626", border:"#fecaca", dot:"#ef4444" },
  Riassegnazione: { bg:"#fef3c7", color:"#92400e", border:"#fde68a", dot:"#f59e0b" },
  Modifica:       { bg:"#dbeafe", color:"#1d4ed8", border:"#bfdbfe", dot:"#3b82f6" },
  Nota:           { bg:"#fef9c3", color:"#854d0e", border:"#fde68a", dot:"#f59e0b" },
};

const getAzStorico = (entry) => {
  if (entry.manuale) return "Nota";
  const c = entry.campo || "";
  if (c === "Assegnazione" || c === "Padroncino") {
    const da = entry.da || ""; const a = entry.a || "";
    if (!da || da === "—" || da === "Nessuno") return "Assegnazione";
    if (!a  || a  === "—" || a  === "Nessuno") return "Rimozione";
    return "Riassegnazione";
  }
  return "Modifica";
};

const fmtTsStorico = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("it-IT") + "  " + d.toLocaleTimeString("it-IT", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  } catch { return ts; }
};

const StoricoTabella = ({ storico=[], entitaNome="", onAddNota, accentColor="#1e40af" }) => {
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const rows = [...storico].reverse();

  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:"#0f172a" }}>📜 Storico — {entitaNome}</div>
          <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{storico.length} eventi · aggiornamento in tempo reale</div>
        </div>
      </div>

      {/* Nota manuale */}
      <div style={{ padding:"10px 16px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input value={notaCampo} onChange={e=>setNotaCampo(e.target.value)}
          placeholder="Tipo nota (es. Riparazione, Incidente...)"
          style={{ width:220, padding:"6px 10px", borderRadius:7, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }} />
        <input value={notaTesto} onChange={e=>setNotaTesto(e.target.value)}
          placeholder="Descrizione nota..."
          style={{ flex:1, minWidth:200, padding:"6px 10px", borderRadius:7, border:"1px solid #e2e8f0", fontSize:12, background:"#fff" }} />
        <button onClick={()=>{ if(!notaTesto.trim())return; onAddNota(notaCampo, notaTesto); setNotaCampo(""); setNotaTesto(""); }}
          style={{ padding:"6px 16px", borderRadius:7, background:accentColor, color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          + Nota
        </button>
      </div>

      {storico.length === 0 ? (
        <div style={{ padding:"48px 20px", textAlign:"center", color:"#94a3b8" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📜</div>
          <div style={{ fontSize:13 }}>Nessuna modifica ancora registrata</div>
          <div style={{ fontSize:11, marginTop:4 }}>Salva dopo aver modificato stato, assegnazione o altri campi</div>
        </div>
      ) : (
        <>
          {/* Intestazioni */}
          <div style={{ display:"grid", gridTemplateColumns:"160px 150px 130px 1fr", background:"#f8fafc", borderBottom:"2px solid #e2e8f0", padding:"8px 16px" }}>
            {["DATA / ORA","UTENTE","AZIONE","DESCRIZIONE"].map(h=>(
              <div key={h} style={{ fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</div>
            ))}
          </div>

          {/* Righe */}
          <div style={{ maxHeight:460, overflowY:"auto" }}>
            {rows.map((entry, i) => {
              const az  = getAzStorico(entry);
              const st  = STILE_AZ[az] || STILE_AZ["Modifica"];
              const utenteStr = entry.utente || "";

              // Descrizione inline
              let descrizione = "";
              if (entry.manuale) {
                const tipo = entry.campo && entry.campo !== "Nota manuale" ? `[${entry.campo}] ` : "";
                descrizione = tipo + (entry.a || "");
              } else {
                const da = entry.da || "—"; const a = entry.a || "—";
                descrizione = `${entry.campo}: ${da} → ${a}`;
              }

              return (
                <div key={i} style={{
                  display:"grid", gridTemplateColumns:"160px 150px 130px 1fr",
                  padding:"10px 16px", alignItems:"center",
                  background: i%2===0 ? "#fff" : "#fafbfc",
                  borderBottom:"1px solid #f1f5f9",
                }}>
                  {/* Data/Ora */}
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#64748b", lineHeight:1.5, whiteSpace:"nowrap" }}>
                    {fmtTsStorico(entry.ts)}
                  </div>

                  {/* Utente */}
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    {utenteStr ? (
                      <>
                        <div style={{ width:26, height:26, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", color:"#fff", fontSize:11, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {utenteStr[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>{utenteStr}</span>
                      </>
                    ) : (
                      <span style={{ fontSize:12, color:"#94a3b8" }}>—</span>
                    )}
                  </div>

                  {/* Azione badge */}
                  <div>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:st.dot, flexShrink:0, display:"inline-block" }}/>
                      {az}
                    </span>
                  </div>

                  {/* Descrizione */}
                  <div style={{ fontSize:12, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={descrizione}>
                    {descrizione}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding:"8px 16px", background:"#f8fafc", borderTop:"1px solid #e2e8f0", fontSize:11, color:"#94a3b8" }}>
            {storico.length} eventi registrati
          </div>
        </>
      )}
    </div>
  );
};

// ─── HELPER apertura file (BUG 4) ─────────────────────────────────────────────
const isElectron = typeof window !== "undefined" && !!window.electronAPI;

const apriFile = async (d) => {
  if (isElectron && window.electronAPI.openFile) {
    try {
      await window.electronAPI.openFile(d.data_b64, d.nome);
    } catch (e) {
      alert("Impossibile aprire il file: " + e.message);
    }
  } else {
    // fallback browser: forza download
    const a = document.createElement("a");
    a.href = d.data_b64;
    a.download = d.nome;
    a.click();
  }
};

const salvaFile = async (d) => {
  if (isElectron && window.electronAPI.saveFile) {
    await window.electronAPI.saveFile(d.data_b64, d.nome);
  } else {
    const a = document.createElement("a");
    a.href = d.data_b64;
    a.download = d.nome;
    a.click();
  }
};

// ─── DETTAGLIO ────────────────────────────────────────────────────────────────
const CodAutistaDetail = ({ autista, padroncini, onSave, onBack, onDelete }) => {
  const [form,      setForm]      = useState({ ...autista });
  const [tab,       setTab]       = useState("info");
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const storico = form.storico   || [];
  const docs    = form.documenti || [];
  const padAss  = padroncini.find(p => p.id === form.padroncino_id);

  // ── BUG 1 FIX: aggiorna stato coerentemente quando cambia il padroncino ──
  const handlePadChange = pid => {
    setForm(f => ({
      ...f,
      padroncino_id: pid,
      stato: pid
        ? (f.stato === "DISPONIBILE" ? "ASSEGNATO" : f.stato)
        : (f.stato === "ASSEGNATO"   ? "DISPONIBILE" : f.stato),
    }));
  };

  const handleSave = () => {
    const formFinal = {
      ...form,
      stato: form.padroncino_id
        ? (form.stato === "DISPONIBILE" ? "ASSEGNATO" : form.stato)
        : (form.stato === "ASSEGNATO"   ? "DISPONIBILE" : form.stato),
    };
    const log   = buildStorico(autista, formFinal, padroncini);
    const saved = { ...formFinal, storico: [...storico, ...log] };
    onSave(saved);
  };

  // ── Gestione documenti ────────────────────────────────────────────────────
  const addDoc = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = ev => set("documenti", [...docs, {
        id: `DOC_${Date.now()}`, nome: f.name, tipo: f.type,
        dimensione: f.size, data_caricamento: new Date().toISOString().split("T")[0],
        data_b64: ev.target.result, etichetta: "",
      }]);
      r.readAsDataURL(f);
    };
    inp.click();
  };
  const rmDoc = id => set("documenti", docs.filter(d => d.id !== id));

  const sc = { bg: bgS[form.stato] || "#f3f4f6", color: colS[form.stato] || "#6b7280" };

  const tabBtn = (t, label) => (
    <button key={t} onClick={() => setTab(t)} style={{
      padding: "8px 14px", borderRadius: 9, border: "1px solid #e2e8f0",
      background: tab === t ? "#f59e0b" : "#fff", color: tab === t ? "#fff" : "#475569",
      fontSize: 12, fontWeight: 700, cursor: "pointer",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Top bar */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ padding: "7px 12px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            ← Indietro
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", fontFamily: "'DM Mono',monospace" }}>{form.codice || "Nuovo Codice"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Codice Autista</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: sc.bg, color: sc.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{form.stato || "—"}</span>
          <button onClick={() => { if (window.confirm("Eliminare questo codice autista?")) onDelete(autista.id); }}
            style={{ padding: "8px 14px", borderRadius: 8, background: "#fee2e2", color: "#dc2626", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Elimina</button>
          <button onClick={handleSave}
            style={{ padding: "10px 18px", borderRadius: 9, background: "#f59e0b", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            💾 Salva
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabBtn("info",    "👤 Scheda")}
        {tabBtn("docs",    `📄 Documenti${docs.length > 0 ? ` (${docs.length})` : ""}`)}
        {tabBtn("storico", `📜 Storico${storico.length > 0 ? ` (${storico.length})` : ""}`)}
      </div>

      {/* ═══ SCHEDA ═══ */}
      {tab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Dati codice */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>👤 Dati Codice</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Inp label="Codice" value={form.codice} onChange={v => set("codice", v)} placeholder="AUT001" small />
              <Sel label="Stato" value={form.stato} onChange={v => set("stato", v)} options={STATI} />
              <Inp label="Tariffa Fissa (€)" value={form.tariffa_fissa} onChange={v => set("tariffa_fissa", v)} type="number" small />
              <Inp label="Tariffa Ritiro (€)" value={form.tariffa_ritiro} onChange={v => set("tariffa_ritiro", v)} type="number" small />
              <Inp label="Target" value={form.target} onChange={v => set("target", v)} type="number" small />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Note</label>
              <textarea value={form.note || ""} onChange={e => set("note", e.target.value)} rows={3}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
          </div>

          {/* BUG 1 FIX: usa handlePadChange invece di set("padroncino_id") */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>🔗 Assegnazione</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Padroncino Assegnato</label>
                <select
                  value={form.padroncino_id || ""}
                  onChange={e => handlePadChange(e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff", cursor: "pointer", width: "100%" }}>
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p => p.stato === "ATTIVO").map(p => (
                    <option key={p.id} value={p.id}>{p.nome}{p.codice ? ` (${p.codice})` : ""}</option>
                  ))}
                </select>
                {padAss && (
                  <div style={{ marginTop: 6, padding: "8px 10px", background: "#fef3c7", borderRadius: 7, fontSize: 11, color: "#92400e", fontWeight: 600 }}>
                    ✅ Assegnato a: <strong>{padAss.nome}</strong>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Inp label="Data Inizio" value={form.data_inizio} onChange={v => set("data_inizio", v)} type="date" small />
                <Inp label="Data Fine"   value={form.data_fine}   onChange={v => set("data_fine",   v)} type="date" small />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DOCUMENTI ═══ (BUG 4 FIX: apri con app nativa) */}
      {tab === "docs" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>📄 Documenti</div>
            <button onClick={addDoc} style={{ padding: "7px 14px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              + Carica
            </button>
          </div>
          {docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div>Nessun documento caricato</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 24 }}>{d.tipo?.includes("pdf") ? "📋" : d.tipo?.includes("image") ? "🖼️" : "📄"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{d.nome}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.data_caricamento}{d.dimensione ? ` · ${(d.dimensione / 1024).toFixed(0)} KB` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => apriFile(d)}
                      style={{ padding: "6px 12px", borderRadius: 7, background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      🖥️ Apri
                    </button>
                    <button onClick={() => salvaFile(d)}
                      style={{ padding: "6px 12px", borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      💾 Salva
                    </button>
                    <button onClick={() => { if (window.confirm(`Rimuovere "${d.nome}"?`)) rmDoc(d.id); }}
                      style={{ padding: "6px 10px", borderRadius: 7, background: "#fee2e2", border: "none", color: "#dc2626", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ STORICO ═══ */}
      {tab === "storico" && (
        <StoricoTabella
          storico={storico}
          entitaNome={form.codice}
          accentColor="#f59e0b"
          onAddNota={(campo, testo) => {
            set("storico", [...storico, {
              ts: new Date().toISOString(),
              data: new Date().toLocaleDateString("it-IT"),
              campo: campo.trim() || "Nota manuale",
              da: "—", a: testo.trim(), manuale: true
            }]);
          }}
        />
      )}

        </div>
  );
};

// ─── LISTA ────────────────────────────────────────────────────────────────────
export const CodAutistiView = ({ codAutisti = [], padroncini = [], onSave, onDelete, onAddNew }) => {
  const [search,      setSearch]      = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detailId,    setDetailId]    = useState(null);

  const detailAutista = detailId ? codAutisti.find(a => a.id === detailId) : null;

  if (detailAutista) {
    return (
      <CodAutistaDetail
        autista={detailAutista}
        padroncini={padroncini}
        onBack={() => setDetailId(null)}
        onSave={a => { onSave(a); }}
        onDelete={id => { onDelete(id); setDetailId(null); }}
      />
    );
  }

  const filtered = codAutisti.filter(a => {
    const s = search.toLowerCase();
    return (!s || a.codice?.toLowerCase().includes(s) || a.note?.toLowerCase().includes(s))
      && (filtroStato === "TUTTI" || a.stato === filtroStato);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca codice autista..."
            style={{ width: "100%", padding: "9px 14px 9px 36px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", boxSizing: "border-box", outline: "none" }} />
          <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 14 }}>🔍</div>
        </div>
        {["TUTTI", ...STATI].map(s => (
          <button key={s} onClick={() => setFiltroStato(s)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: filtroStato === s ? "#f59e0b" : "#fff", color: filtroStato === s ? "#fff" : "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {s}
          </button>
        ))}
        <button onClick={onAddNew}
          style={{ padding: "9px 18px", borderRadius: 9, background: "#f59e0b", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Nuovo
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Codice", "Stato", "Padroncino Assegnato", "Tariffa Fissa", "Tariffa Ritiro", "Target", "Note", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const sc     = { bg: bgS[a.stato] || "#f3f4f6", color: colS[a.stato] || "#6b7280" };
              const padAss = padroncini.find(p => p.id === a.padroncino_id);
              return (
                <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                  onClick={() => setDetailId(a.id)}>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 14 }}>{a.codice || "—"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{a.stato || "—"}</span>
                  </td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    {padAss ? <span style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>{padAss.nome}</span> : <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{a.tariffa_fissa ? euro(a.tariffa_fissa) : "—"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{a.tariffa_ritiro ? euro(a.tariffa_ritiro) : "—"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>{a.target || "—"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.note || "—"}</td>
                  <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={e => { e.stopPropagation(); setDetailId(a.id); }}
                        style={{ padding: "5px 10px", borderRadius: 7, background: "#fffbeb", border: "none", color: "#92400e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Apri</button>
                      <button onClick={e => { e.stopPropagation(); if (window.confirm(`Eliminare ${a.codice}?`)) onDelete(a.id); }}
                        style={{ padding: "5px 8px", borderRadius: 7, background: "#fee2e2", border: "none", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: 13 }}>Nessun codice autista trovato</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>{filtered.length} di {codAutisti.length} codici autisti</div>
    </div>
  );
};
