// ─────────────────────────────────────────────────────────────────────────────
// DashboardView.jsx  —  refactored con theme.js + sharedUI.jsx
//
// Rimossi:
//   ✅ Oggetto T locale (design tokens)  → da theme (C, TY, BR, SH)
//   ✅ FONT locale                       → TY.base
//   ✅ cardBase locale                   → costruito con C + BR + SH
//   ✅ thStyle / td locali              → costruiti con C + TY + SP
//
// Tenuti locali (design genuinamente diverso dalla KpiCard standard):
//   ⚙️  KpiCard  — ha onClick, hover animato, iconBg/iconColor circle
//   ⚙️  FinKpi   — solo testo colorato, layout diverso
//   ⚙️  Chip     — badge inline per le tabelle scadenze
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { SectionCard } from "./BaseComponents";
import { euro, MESI } from "../utils/formatters";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Truck, Users, Smartphone, AlertTriangle, TrendingUp, Calendar } from "lucide-react";

import { C, SP, TY, BR, SH } from "./theme";


// ─── NOTE PERSISTENCE ─────────────────────────────────────────────────────────
const NOTE_KEY    = "gls_dashboard_notes";
const loadNotes   = () => { try { return JSON.parse(localStorage.getItem(NOTE_KEY) || "[]"); } catch { return []; } };
const saveNotesLS = (n) => { try { localStorage.setItem(NOTE_KEY, JSON.stringify(n)); } catch {} };

const fmtDate = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
};

// ─── STILI TABELLA LOCALI ─────────────────────────────────────────────────────
// (usano i token di theme invece di stringhe hardcoded)
const thStyle = {
  padding:         "8px 12px",
  textAlign:       "left",
  fontSize:        TY.xs,
  fontWeight:      TY.bold,
  color:           C.fgSubtle,
  textTransform:   "uppercase",
  letterSpacing:   "0.07em",
  borderBottom:    `1px solid ${C.border}`,
  whiteSpace:      "nowrap",
  background:      C.bgPage,
  fontFamily:      TY.base,
};
const tdStyle = {
  padding:    "8px 12px",
  verticalAlign: "middle",
  fontFamily: TY.base,
  fontSize:   TY.base_,
};

// ─── KPI CARD (Dashboard) ────────────────────────────────────────────────────
// Design specifico: icona in cerchio colorato, hover con lift, alert border rosso
const KpiCard = ({ label, value, sub, icon, iconColor, iconBg, alert, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background:   alert ? "#fff5f5" : C.white,
      border:       `1px solid ${alert ? "#fca5a5" : C.border}`,
      borderRadius: BR.card,
      boxShadow:    SH.card,
      fontFamily:   TY.base,
      padding:      "18px 20px",
      cursor:       onClick ? "pointer" : "default",
      transition:   "transform .12s, box-shadow .12s",
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.09)"; } }}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = "none";             e.currentTarget.style.boxShadow = SH.card; } }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
      <span style={{ fontSize: TY.xs, fontWeight: TY.bold, color: C.fgSubtle, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</span>
      <div style={{ background: iconBg, color: iconColor, borderRadius: BR.lg, padding: 7, display: "flex" }}>{icon}</div>
    </div>
    <div style={{ fontSize: 30, fontWeight: TY.black, color: alert ? C.danger : C.fg, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: TY.sm, color: C.fgSubtle, marginTop: 6 }}>{sub}</div>}
  </div>
);

// ─── FIN KPI ─────────────────────────────────────────────────────────────────
// Card finanziaria: solo testo, valore grande colorato
const FinKpi = ({ label, value, sub, color }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: BR.card, boxShadow: SH.card, fontFamily: TY.base, padding: "18px 20px" }}>
    <div style={{ fontSize: TY.xs, fontWeight: TY.bold, color: C.fgSubtle, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>{label}</div>
    <div style={{ fontSize: TY.kpi, fontWeight: TY.black, color, fontFamily: TY.mono, letterSpacing: "-0.01em" }}>{value}</div>
    <div style={{ fontSize: TY.sm, color: C.fgSubtle, marginTop: 5 }}>{sub}</div>
  </div>
);

// ─── CHIP ─────────────────────────────────────────────────────────────────────
// Badge inline per le tabelle scadenze
const Chip = ({ bg, col, children }) => (
  <span style={{ background: bg, color: col, borderRadius: BR.sm, padding: "3px 9px", fontSize: TY.sm, fontWeight: TY.bold, whiteSpace: "nowrap", display: "inline-block" }}>
    {children}
  </span>
);

// Shorthand per costruire card container
const cardBase = {
  background:   C.white,
  border:       `1px solid ${C.border}`,
  borderRadius: BR.card,
  boxShadow:    SH.card,
  fontFamily:   TY.base,
};


// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const DashboardView = ({ padroncini, conteggi, mezzi = [], onNavigate }) => {
  const now     = new Date();
  const curAnno = now.getFullYear();

  const [rangeFrom, setRangeFrom] = useState(`${curAnno}-01-01`);
  const [rangeTo,   setRangeTo]   = useState(`${curAnno}-12-31`);
  const [notes,     setNotes]     = useState(loadNotes);
  const [newNote,   setNewNote]   = useState("");

  const saveNotes  = (n) => { setNotes(n); saveNotesLS(n); };
  const addNote    = () => {
    if (!newNote.trim()) return;
    saveNotes([...notes, { id: Date.now(), text: newNote.trim(), done: false, ts: new Date().toISOString() }]);
    setNewNote("");
  };
  const toggleNote = (id) => saveNotes(notes.map(n => n.id === id ? { ...n, done: !n.done } : n));
  const deleteNote = (id) => saveNotes(notes.filter(n => n.id !== id));

  const conteggiRange = conteggi.filter(c => {
    const idx = MESI.indexOf(c.mese);
    if (idx < 0) return false;
    const d = new Date(c.anno, idx, 1);
    return d >= new Date(rangeFrom) && d <= new Date(rangeTo);
  });

  const totFatt = conteggiRange.reduce((s, c) => s + (c.totale_fattura       || 0), 0);
  const totAdd  = conteggiRange.reduce((s, c) => s + (c.totale_addebiti      || 0), 0);
  const totBon  = conteggiRange.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
  const totImp  = conteggiRange.reduce((s, c) => s + (c.totale_imponibile    || 0), 0);

  const pAttivi   = padroncini.filter(p => p.stato === "ATTIVO");
  const pDismessi = padroncini.filter(p => p.stato !== "ATTIVO");
  const durcScad  = padroncini.filter(p => p.durc_stato === "SCADUTO");
  const dvrScad   = padroncini.filter(p => p.dvr_stato  === "SCADUTO");
  const alertDocs = durcScad.length + dvrScad.length;

  const tuttiMezzi   = mezzi || [];
  const mezziAttivi  = tuttiMezzi.filter(m => m.stato === "ATTIVO" || m.stato === "ASSEGNATO");
  const mezziFermi   = tuttiMezzi.filter(m => m.stato === "FERMO");
  const tuttiPalmari = padroncini.flatMap(p => (p.palmari || []).map(m => ({ ...m, padNome: p.nome })));
  const palmAttivi   = tuttiPalmari.filter(m => m.stato !== "DISMESSO");

  const mesiGrafico = (() => {
    const map = {};
    conteggiRange.forEach(c => {
      const k = `${c.mese.slice(0, 3)} ${c.anno}`;
      if (!map[k]) map[k] = { label: k, fatt: 0, bon: 0, add: 0 };
      map[k].fatt += c.totale_fattura       || 0;
      map[k].bon  += c.totale_da_bonificare || 0;
      map[k].add  += c.totale_addebiti      || 0;
    });
    return Object.values(map).slice(-12);
  })();

  const fleetData = [
    { name: "Assegnati",    value: mezziAttivi.length,                                                                                            color: C.primaryMid  },
    { name: "Disponibili",  value: tuttiMezzi.filter(m => m.stato === "DISPONIBILE").length,                                                      color: C.successMid  },
    { name: "In Revisione", value: tuttiMezzi.filter(m => m.stato === "IN REVISIONE").length,                                                     color: C.warningMid  },
    { name: "Fermi",        value: mezziFermi.length,                                                                                             color: C.danger      },
    { name: "Altro",        value: tuttiMezzi.filter(m => !["ATTIVO","ASSEGNATO","DISPONIBILE","IN REVISIONE","FERMO"].includes(m.stato)).length,  color: "#cbd5e1"     },
  ].filter(d => d.value > 0);

  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const tipiScad = [
    { key: "scad_assicurazione", label: "Assicurazione" },
    { key: "scad_revisione",     label: "Revisione"     },
    { key: "scad_bollo",         label: "Bollo"         },
    { key: "scad_tachigrafo",    label: "Tachigrafo"    },
  ];
  const padMap = Object.fromEntries(padroncini.map(p => [p.id, p.nome]));
  const scadenze = tuttiMezzi.flatMap(m =>
    tipiScad.map(t => {
      const val = m[t.key];
      if (!val) return null;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      const giorni = Math.round((d - oggi) / 86400000);
      if (giorni > 60) return null;
      return { targa: m.targa, padNome: m.padroncino_id ? (padMap[m.padroncino_id] || "—") : (m.autista || "—"), tipo: t.label, data: val, giorni, scaduta: giorni < 0 };
    }).filter(Boolean)
  ).sort((a, b) => a.giorni - b.giorni);

  const ranges = [
    ["Quest'anno",    `${curAnno}-01-01`,   `${curAnno}-12-31`],
    ["Anno scorso",   `${curAnno-1}-01-01`, `${curAnno-1}-12-31`],
    ["Ultimi 6 mesi", (() => { const d = new Date(); d.setMonth(d.getMonth()-6); return d.toISOString().slice(0,10); })(), new Date().toISOString().slice(0,10)],
    ["Tutto",         "2020-01-01", "2099-12-31"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "4px 0", fontFamily: TY.base }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: TY.black, color: C.fg, margin: 0, letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ fontSize: TY.base_, color: C.fgMuted, margin: "3px 0 0" }}>Panoramica operativa della gestione padroncini</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: TY.md, color: C.fgSubtle, paddingTop: 4 }}>
          <Calendar size={13} />
          <span>{now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* ── KPI RIGA 1 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <KpiCard label="Padroncini Attivi" value={pAttivi.length}
          sub={`${pDismessi.length} dismessi · ${padroncini.length} totali`}
          icon={<Users size={16}/>} iconColor={C.primaryMid} iconBg={C.primaryBg}
          onClick={() => onNavigate?.("padroncini")} />
        <KpiCard label="Flotta Mezzi" value={mezziAttivi.length}
          sub={`${tuttiMezzi.length} totali · ${tuttiMezzi.filter(m=>m.stato==="DISPONIBILE").length} disponibili`}
          icon={<Truck size={16}/>} iconColor={C.successMid} iconBg={C.successBg}
          onClick={() => onNavigate?.("mezzi")} />
        <KpiCard label="Palmari Attivi" value={palmAttivi.length}
          sub={`su ${tuttiPalmari.length} totali`}
          icon={<Smartphone size={16}/>} iconColor={C.violetSoft} iconBg={C.violetBg}
          onClick={() => onNavigate?.("palmari")} />
        <KpiCard label="Alert Documenti" value={alertDocs}
          sub={`${durcScad.length} DURC · ${dvrScad.length} DVR`}
          icon={<AlertTriangle size={16}/>} iconColor={C.danger} iconBg={C.dangerBg}
          alert={alertDocs > 0}
          onClick={() => onNavigate?.("padroncini")} />
      </div>

      {/* ── PERIODO ── */}
      <div style={{ ...cardBase, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: TY.xs, fontWeight: TY.bold, color: C.fgSubtle, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
          Periodo
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: TY.sm, color: C.fgSubtle }}>Dal</span>
          <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: BR.md, border: `1px solid ${C.border}`, fontSize: TY.md, color: C.fg, outline: "none", background: C.white, cursor: "pointer" }}
            onFocus={e => e.target.style.borderColor = C.primaryMid} onBlur={e => e.target.style.borderColor = C.border} />
          <span style={{ fontSize: TY.sm, color: C.fgSubtle }}>Al</span>
          <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: BR.md, border: `1px solid ${C.border}`, fontSize: TY.md, color: C.fg, outline: "none", background: C.white, cursor: "pointer" }}
            onFocus={e => e.target.style.borderColor = C.primaryMid} onBlur={e => e.target.style.borderColor = C.border} />
        </div>
        <div style={{ display: "flex", gap: SP.gapXs }}>
          {ranges.map(([lbl, f, t]) => {
            const active = rangeFrom === f && rangeTo === t;
            return (
              <button key={lbl} onClick={() => { setRangeFrom(f); setRangeTo(t); }}
                style={{
                  padding: "5px 14px", borderRadius: BR.md, fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer", transition: "all .12s",
                  border:      active ? `1px solid ${C.primaryMid}` : `1px solid ${C.border}`,
                  background:  active ? C.primaryMid : C.white,
                  color:       active ? "#fff" : C.fgMuted,
                }}>
                {lbl}
              </button>
            );
          })}
        </div>
        <span style={{ marginLeft: "auto", fontSize: TY.md, color: C.fgSubtle }}>{conteggiRange.length} conteggi</span>
      </div>

      {/* ── KPI FINANZIARI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <FinKpi label="Fatturato (ivato)"   value={euro(totFatt)} sub={`Imponibile ${euro(totImp)}`}                              color={C.primaryMid} />
        <FinKpi label="Addebiti totali"     value={euro(totAdd)}  sub="con IVA e bollo"                                           color={C.warningMid} />
        <FinKpi label="Da bonificare"       value={euro(totBon)}  sub="fattura − addebiti"                                        color={totBon >= 0 ? C.successMid : C.danger} />
        <FinKpi label="Media per conteggio" value={conteggiRange.length ? euro(totBon / conteggiRange.length) : "—"} sub="bonifico medio" color={C.violetSoft} />
      </div>

      {/* ── GRAFICI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

        <div style={{ ...cardBase, padding: "20px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <TrendingUp size={15} color={C.primaryMid} />
            <span style={{ fontSize: 14, fontWeight: TY.bold, color: C.fg }}>Andamento Fatturato</span>
          </div>
          {mesiGrafico.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0", color: C.fgSubtle, fontSize: TY.base_ }}>Nessun dato nel periodo</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mesiGrafico} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gFatt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.primaryMid} stopOpacity={0.13} />
                    <stop offset="95%" stopColor={C.primaryMid} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.successMid} stopOpacity={0.13} />
                    <stop offset="95%" stopColor={C.successMid} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: TY.sm, fill: C.fgSubtle }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: TY.xs, fill: C.fgSubtle }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip formatter={v => euro(v)} labelStyle={{ fontWeight: TY.bold, color: C.fg }}
                  contentStyle={{ border: `1px solid ${C.border}`, borderRadius: BR.lg, fontSize: TY.md, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Area type="monotone" dataKey="fatt" name="Fatturato" stroke={C.primaryMid} fill="url(#gFatt)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="bon"  name="Bonifico"  stroke={C.successMid} fill="url(#gBon)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ ...cardBase, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            <Truck size={15} color={C.successMid} />
            <span style={{ fontSize: 14, fontWeight: TY.bold, color: C.fg }}>Stato Flotta</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={fleetData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                  {fleetData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: TY.sm, color: C.fgMuted }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginTop: -4 }}>
              <div style={{ fontSize: 28, fontWeight: TY.black, color: C.fg, lineHeight: 1 }}>{tuttiMezzi.length}</div>
              <div style={{ fontSize: TY.sm, color: C.fgSubtle, marginTop: 2 }}>Mezzi totali</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALERT DURC / DVR ── */}
      {alertDocs > 0 && (
        <div style={{ background: C.warningBg, border: `1px solid ${C.warningBorder}`, borderRadius: BR.pill, padding: "12px 18px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={16} color={C.warningMid} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: TY.base_, fontWeight: TY.bold, color: C.fg, marginBottom: 3 }}>Documenti scaduti o mancanti</div>
            {durcScad.length > 0 && <div style={{ fontSize: TY.md, color: C.fgMuted }}>DURC scaduto: {durcScad.map(p => p.nome).join(" • ")}</div>}
            {dvrScad.length  > 0 && <div style={{ fontSize: TY.md, color: C.fgMuted }}>DVR scaduto: {dvrScad.map(p => p.nome).join(" • ")}</div>}
          </div>
        </div>
      )}

      {/* ── SCADENZE MEZZI + RIEPILOGO ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

        {scadenze.length > 0 ? (
          <div style={{ ...cardBase, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
              <AlertTriangle size={15} color={C.danger} />
              <span style={{ fontSize: 14, fontWeight: TY.bold, color: C.fg }}>Scadenze Mezzi</span>
              <span style={{ marginLeft: 2, background: C.dangerBg, color: C.danger, borderRadius: 20, padding: "1px 9px", fontSize: TY.sm, fontWeight: TY.bold }}>
                {scadenze.length}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Targa","Padroncino","Tipo","Data","Stato"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {scadenze.map((r, i) => {
                    const isScad   = r.giorni < 0;
                    const isWarn   = !isScad && r.giorni <= 14;
                    const tipoBg   = isScad ? C.dangerBg  : isWarn ? C.warningBg  : C.primaryBg;
                    const tipoCol  = isScad ? C.danger    : isWarn ? C.warningMid : C.primaryMid;
                    const statoBg  = isScad ? C.dangerBg  : isWarn ? C.warningBg  : C.successBg;
                    const statoCol = isScad ? C.danger    : isWarn ? C.warningMid : C.successMid;
                    const statoLbl = isScad ? `Scaduta ${Math.abs(r.giorni)}gg fa` : `tra ${r.giorni}gg`;
                    return (
                      <tr key={i} style={{ background: isScad ? "#fff5f5" : i % 2 === 0 ? C.white : C.bgPage }}>
                        <td style={tdStyle}><span style={{ fontFamily: TY.mono, fontWeight: TY.black, fontSize: TY.md }}>{r.targa}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: TY.md }}>{r.padNome}</span></td>
                        <td style={tdStyle}><Chip bg={tipoBg}  col={tipoCol}>{r.tipo}</Chip></td>
                        <td style={tdStyle}><span style={{ fontFamily: TY.mono, fontSize: TY.md }}>{fmtDate(r.data)}</span></td>
                        <td style={tdStyle}><Chip bg={statoBg} col={statoCol}>{statoLbl}</Chip></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ ...cardBase, padding: 32, textAlign: "center", color: C.fgSubtle, fontSize: TY.base_ }}>
            Nessuna scadenza imminente 🎉
          </div>
        )}

        <div style={{ ...cardBase, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <Users size={15} color={C.violetSoft} />
            <span style={{ fontSize: 14, fontWeight: TY.bold, color: C.fg }}>Riepilogo per Padroncino</span>
          </div>
          {conteggiRange.length > 0 ? (
            <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>{["Padroncino","Fatturato","Addebiti","Bonifico","%"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {pAttivi.map((p, i) => {
                    const pc   = conteggiRange.filter(c => c.padroncino_id === p.id);
                    if (!pc.length) return null;
                    const fatt = pc.reduce((s, c) => s + (c.totale_fattura       || 0), 0);
                    const add  = pc.reduce((s, c) => s + (c.totale_addebiti      || 0), 0);
                    const bon  = pc.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
                    const doneAvg = Math.round(pc.reduce((s, c) => {
                      const steps = [c.distrib_inviata, c.pdf_addeb, c.fattura_ricevuta, c.fatt_tu_creata];
                      return s + (steps.filter(Boolean).length / 4) * 100;
                    }, 0) / pc.length);
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? C.white : C.bgPage, borderBottom: `1px solid ${C.border}` }}>
                        <td style={tdStyle}><span style={{ fontWeight: TY.bold, fontSize: TY.md, maxWidth: 140, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span></td>
                        <td style={tdStyle}><span style={{ fontFamily: TY.mono, fontSize: TY.sm }}>{euro(fatt)}</span></td>
                        <td style={tdStyle}><span style={{ fontFamily: TY.mono, fontSize: TY.sm, color: C.danger }}>{euro(add)}</span></td>
                        <td style={tdStyle}><span style={{ fontFamily: TY.mono, fontSize: TY.md, fontWeight: TY.bold, color: bon >= 0 ? C.successMid : C.danger }}>{euro(bon)}</span></td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: SP.gapXs }}>
                            <div style={{ width: 44, height: 4, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${doneAvg}%`, height: "100%", background: doneAvg === 100 ? C.successMid : C.primaryMid, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: TY.xs, color: C.fgSubtle }}>{doneAvg}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: C.fgSubtle, fontSize: TY.base_ }}>
              Nessun conteggio nel periodo selezionato
            </div>
          )}
        </div>
      </div>

      {/* ── NOTE & ATTIVITÀ ── */}
      <div style={{ ...cardBase, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>📝</span>
          <span style={{ fontSize: 14, fontWeight: TY.bold, color: C.fg }}>Note & Attività</span>
        </div>
        <div style={{ display: "flex", gap: SP.gapSm, marginBottom: 12 }}>
          <input
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addNote()}
            placeholder="Aggiungi nota o attività..."
            style={{ flex: 1, padding: "8px 12px", borderRadius: BR.lg, border: `1px solid ${C.border}`, fontSize: TY.base_, outline: "none", color: C.fg, background: C.white }}
            onFocus={e => e.target.style.borderColor = C.warningMid}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button onClick={addNote}
            style={{ padding: "8px 16px", borderRadius: BR.lg, background: C.warningMid, border: "none", color: "#fff", fontSize: 15, fontWeight: TY.bold, cursor: "pointer" }}>
            +
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: SP.gapXs, maxHeight: 200, overflowY: "auto" }}>
          {notes.length === 0 && (
            <div style={{ textAlign: "center", color: C.fgSubtle, fontSize: TY.md, padding: "14px 0" }}>Nessuna nota. Aggiungine una!</div>
          )}
          {notes.map(n => (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: SP.gapSm, padding: "8px 10px", background: n.done ? C.bgPage : C.white, borderRadius: BR.lg, border: `1px solid ${C.border}` }}>
              <button onClick={() => toggleNote(n.id)} style={{
                width: 18, height: 18, borderRadius: BR.xs, flexShrink: 0, marginTop: 1, cursor: "pointer",
                border: `2px solid ${n.done ? C.successMid : C.border}`, background: n.done ? C.successMid : C.white,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {n.done && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              <span style={{ flex: 1, fontSize: TY.base_, color: n.done ? C.fgSubtle : C.fg, textDecoration: n.done ? "line-through" : "none", lineHeight: 1.45 }}>
                {n.text}
              </span>
              <button onClick={() => deleteNote(n.id)}
                style={{ background: "none", border: "none", color: C.fgSubtle, cursor: "pointer", fontSize: 15, lineHeight: 1, flexShrink: 0, padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
        {notes.filter(n => n.done).length > 0 && (
          <button onClick={() => saveNotes(notes.filter(n => !n.done))}
            style={{ marginTop: SP.gapSm, fontSize: TY.sm, color: C.fgSubtle, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Rimuovi completate ({notes.filter(n => n.done).length})
          </button>
        )}
      </div>

    </div>
  );
};
