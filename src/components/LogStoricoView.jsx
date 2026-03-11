// ═══════════════════════════════════════════════════════════════════════════════
// LogStoricoView.jsx  —  Log Storico Globale — design uniforme
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from "react";

const SEZIONI_META = {
  padroncini: { label: "Padroncini",    icon: "👤", color: "#3b82f6", bg: "#dbeafe" },
  mezzi:      { label: "Mezzi Flotta",  icon: "🚛", color: "#10b981", bg: "#d1fae5" },
  palmari:    { label: "Palmari",       icon: "📱", color: "#8b5cf6", bg: "#ede9fe" },
  codici:     { label: "Cod. Autisti",  icon: "🔑", color: "#f59e0b", bg: "#fef3c7" },
  conteggi:   { label: "Conteggi",      icon: "🧮", color: "#06b6d4", bg: "#cffafe" },
  sistema:    { label: "Sistema",       icon: "⚙️", color: "#64748b", bg: "#f1f5f9" },
};

const AZIONE_META = {
  CREA:          { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", dot: "#22c55e" },
  MODIFICA:      { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" },
  ELIMINA:       { bg: "#fee2e2", color: "#dc2626", border: "#fecaca", dot: "#ef4444" },
  NOTA:          { bg: "#fef9c3", color: "#854d0e", border: "#fde68a", dot: "#f59e0b" },
  ASSEGNAZIONE:  { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", dot: "#22c55e" },
  RIMOZIONE:     { bg: "#fee2e2", color: "#dc2626", border: "#fecaca", dot: "#ef4444" },
  RIASSEGNAZIONE:{ bg: "#fef3c7", color: "#92400e", border: "#fde68a", dot: "#f59e0b" },
};

function fmtDt(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("it-IT") + "  " +
      d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return ts; }
}

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────
export const LogStoricoView = ({ logEntries = [] }) => {
  const [search,        setSearch]        = useState("");
  const [filtroSezione, setFiltroSezione] = useState("TUTTI");
  const [filtroAzione,  setFiltroAzione]  = useState("TUTTI");
  const [filtroUtente,  setFiltroUtente]  = useState("TUTTI");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");

  const utenti = useMemo(() => {
    const s = new Set(logEntries.map(e => e.utente).filter(Boolean));
    return Array.from(s).sort();
  }, [logEntries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logEntries
      .filter(e => {
        if (filtroSezione !== "TUTTI" && e.sezione !== filtroSezione) return false;
        if (filtroAzione  !== "TUTTI" && e.azione  !== filtroAzione)  return false;
        if (filtroUtente  !== "TUTTI" && e.utente  !== filtroUtente)  return false;
        if (dateFrom && e.ts < dateFrom) return false;
        if (dateTo   && e.ts > dateTo + "T23:59:59") return false;
        if (q) {
          const hay = [e.utente, e.entita_nome, e.descrizione, e.sezione, e.azione, e.entita_id].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.ts.localeCompare(a.ts));
  }, [logEntries, search, filtroSezione, filtroAzione, filtroUtente, dateFrom, dateTo]);

  const hasFilters = search || filtroSezione !== "TUTTI" || filtroAzione !== "TUTTI"
    || filtroUtente !== "TUTTI" || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch(""); setFiltroSezione("TUTTI"); setFiltroAzione("TUTTI");
    setFiltroUtente("TUTTI"); setDateFrom(""); setDateTo("");
  };

  const selStyle = {
    padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0",
    fontSize: 12, background: "#fff", cursor: "pointer", outline: "none",
  };
  const labelSt = {
    fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase",
    letterSpacing: "0.07em", display: "block", marginBottom: 5,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>📋 Log Storico Globale</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {filtered.length} eventi mostrati &middot; {logEntries.length} totali
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "Creazioni",    azione: "CREA",         color: "#166534", bg: "#dcfce7" },
              { label: "Modifiche",    azione: "MODIFICA",     color: "#1d4ed8", bg: "#dbeafe" },
              { label: "Assegnazioni", azione: "ASSEGNAZIONE", color: "#166534", bg: "#dcfce7" },
              { label: "Rimozioni",    azione: "RIMOZIONE",    color: "#dc2626", bg: "#fee2e2" },
              { label: "Eliminazioni", azione: "ELIMINA",      color: "#dc2626", bg: "#fee2e2" },
            ].map(({ label, azione, color, bg }) => {
              const cnt = logEntries.filter(e => e.azione === azione).length;
              if (cnt === 0) return null;
              return (
                <button key={azione}
                  onClick={() => setFiltroAzione(filtroAzione === azione ? "TUTTI" : azione)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, border: "none",
                    background: filtroAzione === azione ? color : bg,
                    color: filtroAzione === azione ? "#fff" : color,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                  {cnt} {label}
                </button>
              );
            })}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#0369a1", fontWeight: 700 }}>
              🟢 Tempo reale
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtri ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 150px 170px 130px 130px", gap: 10, alignItems: "end" }}>
          <div>
            <label style={labelSt}>🔍 Ricerca</label>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca utente, entità, descrizione..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={labelSt}>Sezione</label>
            <select value={filtroSezione} onChange={e => setFiltroSezione(e.target.value)} style={selStyle}>
              <option value="TUTTI">Tutte</option>
              {Object.entries(SEZIONI_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelSt}>Azione</label>
            <select value={filtroAzione} onChange={e => setFiltroAzione(e.target.value)} style={selStyle}>
              <option value="TUTTI">Tutte</option>
              <option value="CREA">CREA</option>
              <option value="MODIFICA">MODIFICA</option>
              <option value="ASSEGNAZIONE">ASSEGNAZIONE</option>
              <option value="RIMOZIONE">RIMOZIONE</option>
              <option value="ELIMINA">ELIMINA</option>
            </select>
          </div>
          <div>
            <label style={labelSt}>Utente</label>
            <select value={filtroUtente} onChange={e => setFiltroUtente(e.target.value)} style={selStyle}>
              <option value="TUTTI">Tutti</option>
              {utenti.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Dal</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ width: "100%", ...selStyle, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={labelSt}>Al</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ width: "100%", ...selStyle, boxSizing: "border-box" }} />
          </div>
        </div>
        {hasFilters && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Filtri attivi — {filtered.length} risultati</span>
            <button onClick={resetFilters} style={{ padding: "4px 10px", borderRadius: 6, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              ✕ Reset filtri
            </button>
          </div>
        )}
      </div>

      {/* ── Tabella ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Intestazione */}
        <div style={{ display: "grid", gridTemplateColumns: "160px 140px 110px 130px 1fr", background: "#f8fafc", borderBottom: "2px solid #e2e8f0", padding: "9px 16px" }}>
          {["DATA / ORA", "UTENTE", "SEZIONE", "AZIONE", "DESCRIZIONE"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
          ))}
        </div>

        {/* Righe */}
        {filtered.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 600 }}>Nessun evento trovato</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
              {logEntries.length === 0 ? "Il log è vuoto — le modifiche appariranno qui in tempo reale." : "Prova a modificare i filtri."}
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
            {filtered.map((entry, idx) => {
              const ac = AZIONE_META[entry.azione] || { bg: "#f1f5f9", color: "#374151", border: "#e2e8f0", dot: "#94a3b8" };
              const sm = SEZIONI_META[entry.sezione] || { label: entry.sezione || "—", icon: "•", color: "#64748b", bg: "#f1f5f9" };
              const utenteStr = entry.utente || "";

              return (
                <div key={entry.id || idx} style={{
                  display: "grid", gridTemplateColumns: "160px 140px 110px 130px 1fr",
                  padding: "11px 16px", alignItems: "center",
                  background: idx % 2 === 0 ? "#fff" : "#fafbfc",
                  borderBottom: "1px solid #f1f5f9",
                }}>
                  {/* Data/Ora */}
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#64748b", lineHeight: 1.5, whiteSpace: "nowrap" }}>
                    {fmtDt(entry.ts)}
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

                  {/* Sezione chip */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color, whiteSpace: "nowrap" }}>
                      {sm.icon} {sm.label}
                    </span>
                  </div>

                  {/* Azione badge */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ac.dot, flexShrink: 0, display: "inline-block" }} />
                      {entry.azione || "—"}
                    </span>
                  </div>

                  {/* Entità + Descrizione inline */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.entita_nome || "—"}
                    </div>
                    {entry.descrizione && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={entry.descrizione}>
                        {entry.descrizione}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
            <span>Mostrati {filtered.length} eventi{hasFilters ? " (filtrati)" : ""}</span>
            <span>{logEntries.length} eventi totali nel database</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogStoricoView;
