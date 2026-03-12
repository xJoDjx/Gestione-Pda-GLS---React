import { useState } from "react";
import { Icon } from "./Icons";
import { Badge } from "./BaseComponents";
import { PadroncinoDetail } from "./PadroncinoDetail";
import { euro, durcColor, dvrColor, statoColor, durcDaysLeft } from "../utils/formatters";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Truck, Users, Smartphone, AlertTriangle, TrendingUp, Calendar } from "lucide-react";

export const PadronciniView = ({
  padroncini, conteggi, mezzi = [], palmariGlobali = [], codAutistiGlobali = [],
  onSave, onSaveConteggio, onSaveMezzo, onDelete, onAddNew, onLogChange,
  onSavePalmare, onSaveCodAutista, utente = "",
}) => {
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detailPadId, setDetailPadId] = useState(null);

  // Derived state: sempre fresco dai props (fix bug schermata bianca)
  const detailPad = detailPadId ? padroncini.find(p => p.id === detailPadId) : null;

  const pAttivi   = padroncini.filter(p => p.stato === "ATTIVO");
  const pDismessi = padroncini.filter(p => p.stato !== "ATTIVO");
  const durcScad  = padroncini.filter(p => p.durc_stato === "SCADUTO");
  const dvrScad   = padroncini.filter(p => p.dvr_stato  === "NON PRESENTE");
  const alertDocs = durcScad.length + dvrScad.length;

  const tuttiMezzi   = mezzi || [];
  const mezziAttivi  = tuttiMezzi.filter(m => m.stato === "ATTIVO" || m.stato === "ASSEGNATO");
  const mezziFermi   = tuttiMezzi.filter(m => m.stato === "FERMO");
  const tuttiPalmari = padroncini.flatMap(p => (p.palmari || []).map(m => ({ ...m, padNome: p.nome })));
  const palmAttivi   = tuttiPalmari.filter(m => m.stato !== "DISMESSO");


  // ─── FONT ─────────────────────────────────────────────────────────────────────
  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
  const T = {
    fg:        "#0f172a",
    fgMuted:   "#64748b",
    fgSubtle:  "#94a3b8",
    border:    "#e2e8f0",
    bg:        "#f8fafc",
    rowAlt:    "#f8fafc",   // riga alternata grigio
    card:      "#ffffff",
    primary:   "#2563eb",
    primaryBg: "#eff6ff",
    success:   "#16a34a",
    successBg: "#f0fdf4",
    warning:   "#d97706",
    warningBg: "#fffbeb",
    danger:    "#dc2626",
    dangerBg:  "#fef2f2",
    violet:    "#7c3aed",
    violetBg:  "#f5f3ff",
  };


  // ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon, sub }) => (
  <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px",display:"flex",flexDirection:"column",gap:4,boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <span style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</span>
      <span style={{ color:"#94a3b8" }}>{icon}</span>
    </div>
    <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>{value}</div>
    {sub && <div style={{ fontSize:11,color:"#94a3b8" }}>{sub}</div>}
  </div>
);

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
        utente={utente}
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
      {/* KPI RIGA 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <KpiCard label="Padroncini Attivi"  value={pAttivi.length}
          sub={`${pDismessi.length} dismessi · ${padroncini.length} totali`}
          icon={<Users size={16}/>} iconColor={T.primary} iconBg={T.primaryBg}
          onClick={() => onNavigate?.("padroncini")} />
        <KpiCard label="Alert Documenti"    value={alertDocs}
          sub={`${durcScad.length} DURC · ${dvrScad.length} DVR`}
          icon={<AlertTriangle size={16}/>} iconColor={T.danger} iconBg={T.dangerBg}
          alert={alertDocs > 0}
          onClick={() => onNavigate?.("padroncini")} />
        <KpiCard label="Flotta Mezzi"       value={mezziAttivi.length}
          sub={`${tuttiMezzi.length} totali · ${tuttiMezzi.filter(m=>m.stato==="DISPONIBILE").length} disponibili`}
          icon={<Truck size={16}/>} iconColor={T.success} iconBg={T.successBg}
          onClick={() => onNavigate?.("mezzi")} />
        <KpiCard label="Palmari Attivi"     value={palmAttivi.length}
          sub={`su ${tuttiPalmari.length} totali`}
          icon={<Smartphone size={16}/>} iconColor={T.violet} iconBg={T.violetBg}
          onClick={() => onNavigate?.("palmari")} />
      </div>

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
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: filtroStato === s ? "#1e40af" : "#fff", color: filtroStato === s ? "#fff" : "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {s}
          </button>
        ))}
        <button onClick={onAddNew}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: "#1e40af", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <Icon name="plus" size={14} /> Nuovo
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Padroncino", "Stato", "DURC", "DVR", "Palmari", "Mezzi", "Autisti", "Fatturato", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const dc = durcColor(p.durc_stato);
              const dv = dvrColor(p.dvr_stato);
              const sc = statoColor(p.stato);
              const daysLeft = durcDaysLeft(p.durc_scadenza);
              return (
                <tr key={p.id}
                  style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                  onClick={() => setDetailPadId(p.id)}>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{p.nome}</div>
                    {/* <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Cod. {p.codice || "—"}</div> */}
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{p.stato}</span>
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ background: dc.bg, color: dc.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{p.durc_stato || "—"}</span>
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ background: dv.bg, color: dv.color, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{p.dvr_stato || "—"}</span>
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>{(p.palmari || []).length}</span>
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>{(p.mezzi || []).length}</span>
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{(p.codici_autisti || []).length}</span>
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#166534" }}>
                    {euro(p.fatturato_totale || 0)}
                  </td>
                  <td style={{ padding: "5px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={e => { e.stopPropagation(); setDetailPadId(p.id); }}
                        style={{ padding: "5px 10px", borderRadius: 7, background: "#eff6ff", border: "none", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        Apri
                      </button>
                      <button onClick={e => { e.stopPropagation(); if (window.confirm(`Eliminare ${p.nome}?`)) onDelete(p.id); }}
                        style={{ padding: "5px 8px", borderRadius: 7, background: "#fee2e2", border: "none", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: 13 }}>Nessun padroncino trovato</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>
        {filtered.length} di {padroncini.length} padroncini
      </div>
    </div>
  );
};
