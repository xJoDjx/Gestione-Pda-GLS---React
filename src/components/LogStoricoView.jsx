// ═══════════════════════════════════════════════════════════════════════════════
// LogStoricoView.jsx  —  Log Storico Globale professionale
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
  CREA:     { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", dot: "#22c55e" },
  MODIFICA: { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" },
  ELIMINA:  { bg: "#fee2e2", color: "#dc2626", border: "#fecaca", dot: "#ef4444" },
  NOTA:     { bg: "#fef9c3", color: "#854d0e", border: "#fde68a", dot: "#f59e0b" },
};

function fmtDt(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("it-IT") + "  " +
      d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return ts; }
}

function parseCampi(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({ children, bg, color, border }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 5,
    fontSize: 11, fontWeight: 700, background: bg, color, border: `1px solid ${border || bg}`,
    whiteSpace: "nowrap",
  }}>{children}</span>
);

// ─── CHIP SEZIONE ──────────────────────────────────────────────────────────────
const SezioneChip = ({ sezione }) => {
  const m = SEZIONI_META[sezione] || { label: sezione || "—", icon: "•", color: "#64748b", bg: "#f1f5f9" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
      background: m.bg, color: m.color, whiteSpace: "nowrap",
    }}>
      {m.icon} {m.label}
    </span>
  );
};

// ─── RIGA LOG ──────────────────────────────────────────────────────────────────
const LogRow = ({ entry, idx, isExpanded, onToggle }) => {
  const ac    = AZIONE_META[entry.azione] || { bg: "#f1f5f9", color: "#374151", border: "#e2e8f0", dot: "#94a3b8" };
  const campi = parseCampi(entry.campi_modificati);
  const hasCampi = campi.length > 0;

  return (
    <div style={{ borderBottom: "1px solid #f1f5f9" }}>
      {/* Riga principale */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "172px 130px 130px 100px 1fr 90px",
        gap: 0, padding: "10px 16px", alignItems: "center",
        background: isExpanded ? "#f0f9ff" : (idx % 2 === 0 ? "#fff" : "#fafbfc"),
        cursor: hasCampi ? "pointer" : "default",
        transition: "background 0.1s",
      }}
        onClick={() => hasCampi && onToggle()}
      >
        {/* Data/Ora */}
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
          {fmtDt(entry.ts)}
        </div>

        {/* Utente */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", background: "#1e40af",
            color: "#fff", fontSize: 11, fontWeight: 800, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {(entry.utente || "?")[0].toUpperCase()}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
            {entry.utente || "—"}
          </div>
        </div>

        {/* Sezione */}
        <div><SezioneChip sezione={entry.sezione} /></div>

        {/* Azione */}
        <div>
          <Badge bg={ac.bg} color={ac.color} border={ac.border}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: ac.dot, marginRight: 4, verticalAlign: "middle" }} />
            {entry.azione || "—"}
          </Badge>
        </div>

        {/* Entità + Descrizione */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {entry.entita_nome || "—"}
          </div>
          {entry.descrizione && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.descrizione}
            </div>
          )}
        </div>

        {/* Dettagli toggle */}
        <div style={{ textAlign: "right" }}>
          {hasCampi && (
            <button
              onClick={e => { e.stopPropagation(); onToggle(); }}
              style={{
                padding: "4px 10px", borderRadius: 6,
                background: isExpanded ? "#1e40af" : "#eff6ff",
                border: `1px solid ${isExpanded ? "#1e40af" : "#bfdbfe"}`,
                color: isExpanded ? "#fff" : "#1d4ed8",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>
              {campi.length} {isExpanded ? "▲" : "▼"}
            </button>
          )}
        </div>
      </div>

      {/* Dettaglio campi modificati */}
      {isExpanded && hasCampi && (
        <div style={{ padding: "10px 16px 14px 172px", background: "#f0f9ff", borderTop: "1px solid #bae6fd" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Campi Modificati
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {campi.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 1fr 20px 1fr", gap: 8, alignItems: "center", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {c.campo || c.field || "—"}
                </div>
                <div style={{
                  background: "#fee2e2", color: "#991b1b", padding: "3px 8px",
                  borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 11,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {String(c.da ?? c.from ?? "—")}
                </div>
                <div style={{ color: "#94a3b8", fontWeight: 800, textAlign: "center" }}>→</div>
                <div style={{
                  background: "#dcfce7", color: "#166534", padding: "3px 8px",
                  borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 11,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {String(c.a ?? c.to ?? "—")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────
export const LogStoricoView = ({ logEntries = [] }) => {
  const [search,        setSearch]        = useState("");
  const [filtroSezione, setFiltroSezione] = useState("TUTTI");
  const [filtroAzione,  setFiltroAzione]  = useState("TUTTI");
  const [filtroUtente,  setFiltroUtente]  = useState("TUTTI");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [expanded,      setExpanded]      = useState(null);

  const utenti = useMemo(() => {
    const set = new Set(logEntries.map(e => e.utente).filter(Boolean));
    return Array.from(set).sort();
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
          const hay = [e.utente, e.entita_nome, e.descrizione, e.sezione, e.azione, e.entita_id]
            .join(" ").toLowerCase();
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

  // Stats per sezione
  const statsBySezione = useMemo(() => {
    const map = {};
    logEntries.forEach(e => {
      if (!map[e.sezione]) map[e.sezione] = { CREA: 0, MODIFICA: 0, ELIMINA: 0 };
      if (map[e.sezione][e.azione] !== undefined) map[e.sezione][e.azione]++;
    });
    return map;
  }, [logEntries]);

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
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
              📋 Log Storico Globale
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {filtered.length} eventi mostrati &middot; {logEntries.length} totali nel database
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* KPI pills */}
            {[
              { label: "Creazioni", azione: "CREA",     color: "#166534", bg: "#dcfce7" },
              { label: "Modifiche", azione: "MODIFICA", color: "#1d4ed8", bg: "#dbeafe" },
              { label: "Eliminazioni", azione: "ELIMINA", color: "#dc2626", bg: "#fee2e2" },
            ].map(({ label, azione, color, bg }) => {
              const cnt = logEntries.filter(e => e.azione === azione).length;
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 160px 130px 130px", gap: 10, alignItems: "end" }}>

          {/* Ricerca */}
          <div>
            <label style={labelSt}>🔍 Ricerca testo</label>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca utente, entità, descrizione, ID..."
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Sezione */}
          <div>
            <label style={labelSt}>Sezione</label>
            <select value={filtroSezione} onChange={e => setFiltroSezione(e.target.value)} style={selStyle}>
              <option value="TUTTI">Tutte le sezioni</option>
              {Object.entries(SEZIONI_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>

          {/* Azione */}
          <div>
            <label style={labelSt}>Azione</label>
            <select value={filtroAzione} onChange={e => setFiltroAzione(e.target.value)} style={selStyle}>
              <option value="TUTTI">Tutte</option>
              <option value="CREA">CREA</option>
              <option value="MODIFICA">MODIFICA</option>
              <option value="ELIMINA">ELIMINA</option>
            </select>
          </div>

          {/* Utente */}
          <div>
            <label style={labelSt}>Utente</label>
            <select value={filtroUtente} onChange={e => setFiltroUtente(e.target.value)} style={selStyle}>
              <option value="TUTTI">Tutti gli utenti</option>
              {utenti.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Dal */}
          <div>
            <label style={labelSt}>Dal</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ width: "100%", ...selStyle, boxSizing: "border-box" }} />
          </div>

          {/* Al */}
          <div>
            <label style={labelSt}>Al</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ width: "100%", ...selStyle, boxSizing: "border-box" }} />
          </div>
        </div>

        {hasFilters && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Filtri attivi — {filtered.length} risultati
            </span>
            <button onClick={resetFilters} style={{
              padding: "4px 10px", borderRadius: 6, background: "#f1f5f9",
              border: "1px solid #e2e8f0", color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>✕ Reset filtri</button>
          </div>
        )}
      </div>

      {/* ── Tabella ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Intestazione colonne */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "172px 130px 130px 100px 1fr 90px",
          gap: 0, background: "#f8fafc", borderBottom: "2px solid #e2e8f0",
          padding: "9px 16px",
        }}>
          {["Data / Ora", "Utente", "Sezione", "Azione", "Entità / Descrizione", "Campi"].map(h => (
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
          <div style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
            {filtered.map((entry, idx) => (
              <LogRow
                key={entry.id || idx}
                entry={entry}
                idx={idx}
                isExpanded={expanded === (entry.id ?? idx)}
                onToggle={() => setExpanded(e => e === (entry.id ?? idx) ? null : (entry.id ?? idx))}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{
            padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0",
            fontSize: 11, color: "#94a3b8", display: "flex", justifyContent: "space-between",
          }}>
            <span>Mostrati {filtered.length} eventi{hasFilters ? " (filtrati)" : ""}</span>
            <span>Clicca su una riga con campi per espanderla</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogStoricoView;
