import { useState } from "react";
import { Icon } from "./Icons";
import { Badge } from "./BaseComponents";
import { PadroncinoDetail } from "./PadroncinoDetail";
import { euro, durcColor, dvrColor, statoColor, durcDaysLeft } from "../utils/formatters";

// FIX BUG #1: detailPad deriva sempre dai padroncini freschi tramite ID
// In questo modo quando onSavePalmare aggiorna lo stato del palmare nella lista globale,
// il componente di dettaglio vede subito i dati aggiornati senza dover richiudere/riaprire.

export const PadronciniView = ({ padroncini, conteggi, mezzi = [], palmariGlobali = [], codAutistiGlobali = [], onSave, onSaveConteggio, onSaveMezzo, onDelete, onAddNew, onLogChange, onSaveCodAutista }) => {
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  // FIX: salviamo solo l'ID, non l'oggetto — così è sempre fresco dai props
  const [detailPadId, setDetailPadId] = useState(null);

  const detailPad = detailPadId ? padroncini.find(p => p.id === detailPadId) : null;

  if (detailPad) {
    return (
      <PadroncinoDetail
        padroncino={detailPad}
        conteggi={conteggi}
        onBack={() => setDetailPadId(null)}
        onSave={(updatedPad) => { onSave(updatedPad); }}
        onSaveConteggio={onSaveConteggio}
        onLogChange={onLogChange}
        mezziFlotta={mezzi}
        palmariFlotta={palmariGlobali}
        onSaveMezzoFlotta={onSaveMezzo}
        onSavePalmare={onSavePalmare}
        codAutistiFlotta={codAutistiGlobali}
        onSaveCodAutista={onSaveCodAutista}
      />
    );
  }

  const filtered = padroncini.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.nome?.toLowerCase().includes(s) || p.codice?.toLowerCase().includes(s);
    const matchStato = filtroStato === "TUTTI" || p.stato === filtroStato;
    return matchSearch && matchStato;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca padroncino per nome o codice..."
            style={{ width: "100%", padding: "9px 14px 9px 36px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", boxSizing: "border-box", outline: "none" }} />
          <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <Icon name="search" size={16} />
          </div>
        </div>
        {["TUTTI", "ATTIVO", "DISMESSO"].map(s => (
          <button key={s} onClick={() => setFiltroStato(s)}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: filtroStato === s ? "#1e40af" : "#fff", color: filtroStato === s ? "#fff" : "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {s}
          </button>
        ))}
        <button onClick={onAddNew}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#1e40af", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Icon name="plus" size={14} /> Nuovo Padroncino
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Fornitore","Codice","Stato","DURC","DVR","Scad. DURC","Palmari","Mezzi","Autisti","Fatturato Tot.",""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const dc = durcColor(p.durc_stato);
              const dv = dvrColor(p.dvr_stato);
              const sc = statoColor(p.stato);
              const days = durcDaysLeft(p.durc_scadenza);
              const padConteggi = conteggi.filter(c => c.padroncino_id === p.id);
              const fattTot = padConteggi.reduce((s, c) => s + (c.totale_fattura || 0), 0);
              return (
                <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{p.nome}</div>
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>{p.codice || "—"}</td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>{p.stato || "—"}</span>
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: dc.bg, color: dc.color }}>{p.durc_stato || "—"}</span>
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: dv.bg, color: dv.color }}>{p.dvr_stato || "—"}</span>
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: days !== null && days < 30 ? "#dc2626" : "#374151", fontWeight: days !== null && days < 30 ? 700 : 400 }}>
                    {p.durc_scadenza || "—"}{days !== null && days < 30 && days > 0 ? ` (${days}gg)` : ""}
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 700 }}>{p.palmari?.length || 0}</span>
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 700 }}>{p.mezzi?.length || 0}</span>
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700 }}>{p.codici_autisti?.length || 0}</span>
                  </td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600 }}>{euro(fattTot)}</td>
                  <td style={{ padding: "11px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <button onClick={() => setDetailPadId(p.id)}
                      style={{ padding: "5px 12px", borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 6 }}>
                      Dettaglio
                    </button>
                    <button onClick={() => { if (window.confirm(`Eliminare definitivamente ${p.nome}?`)) onDelete(p.id); }}
                      style={{ padding: "5px 9px", borderRadius: 7, background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Icon name="trash" size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>
            {search ? `Nessun risultato per "${search}"` : "Nessun padroncino. Clicca '+ Nuovo Padroncino' per aggiungere."}
          </div>
        )}
      </div>
    </div>
  );
};
