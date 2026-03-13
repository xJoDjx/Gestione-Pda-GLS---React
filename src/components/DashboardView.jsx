import { useState } from "react";
import { SectionCard } from "./BaseComponents";
import { euro, MESI } from "../utils/formatters";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Truck, Users, Smartphone, AlertTriangle, TrendingUp, Calendar } from "lucide-react";

// ─── NOTE PERSISTENCE ─────────────────────────────────────────────────────────
const NOTE_KEY    = "gls_dashboard_notes";
const loadNotes   = () => { try { return JSON.parse(localStorage.getItem(NOTE_KEY) || "[]"); } catch { return []; } };
const saveNotesLS = (n) => { try { localStorage.setItem(NOTE_KEY, JSON.stringify(n)); } catch {} };

const fmtDate = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
};

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

const cardBase = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  fontFamily: FONT,
};

// header grigio, righe alternate
const thStyle = {
  padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700,
  color: T.fgSubtle, textTransform: "uppercase", letterSpacing: "0.07em",
  borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap",
  background: T.bg, fontFamily: FONT,
};
const td = { padding: "8px 12px", verticalAlign: "middle", fontFamily: FONT, fontSize: 13 };

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

  const tuttiMezzi   = mezzi || [];
  const mezziAttivi  = tuttiMezzi.filter(m => m.stato === "ATTIVO" || m.stato === "ASSEGNATO");
  const mezziFermi   = tuttiMezzi.filter(m => m.stato === "FERMO");
  const tuttiPalmari = padroncini.flatMap(p => (p.palmari || []).map(m => ({ ...m, padNome: p.nome })));
  const palmAttivi   = tuttiPalmari.filter(m => m.stato !== "DISMESSO");

  const mesiGrafico = (() => {
    const map = {};
    conteggiRange.forEach(c => {
      const k = `${c.mese.slice(0,3)} ${c.anno}`;
      if (!map[k]) map[k] = { label: k, fatt: 0, bon: 0, add: 0 };
      map[k].fatt += c.totale_fattura       || 0;
      map[k].bon  += c.totale_da_bonificare || 0;
      map[k].add  += c.totale_addebiti      || 0;
    });
    return Object.values(map).slice(-12);
  })();

  const fleetData = [
    { name: "Assegnati",    value: mezziAttivi.length,                                                                                              color: T.primary  },
    { name: "Disponibili",  value: tuttiMezzi.filter(m => m.stato === "DISPONIBILE").length,                                                        color: T.success  },
    { name: "In Revisione", value: tuttiMezzi.filter(m => m.stato === "IN REVISIONE").length,                                                       color: T.warning  },
    { name: "Fermi",        value: mezziFermi.length,                                                                                               color: T.danger   },
    { name: "Altro",        value: tuttiMezzi.filter(m => !["ATTIVO","ASSEGNATO","DISPONIBILE","IN REVISIONE","FERMO"].includes(m.stato)).length,    color: "#cbd5e1"  },
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
      return {
        targa: m.targa,
        padNome: m.padroncino_id ? (padMap[m.padroncino_id] || "—") : (m.autista || "—"),
        tipo: t.label, data: val, giorni, scaduta: giorni < 0,
      };
    }).filter(Boolean)
  ).sort((a, b) => a.giorni - b.giorni);

  const ranges = [
    ["Quest'anno",    `${curAnno}-01-01`,   `${curAnno}-12-31`],
    ["Anno scorso",   `${curAnno-1}-01-01`, `${curAnno-1}-12-31`],
    ["Ultimi 6 mesi", (() => { const d = new Date(); d.setMonth(d.getMonth()-6); return d.toISOString().slice(0,10); })(), new Date().toISOString().slice(0,10)],
    ["Tutto",         "2020-01-01", "2099-12-31"],
  ];

  const alertDocs = durcScad.length + dvrScad.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "4px 0", fontFamily: FONT }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.fg, margin: 0, letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: T.fgMuted, margin: "3px 0 0" }}>Panoramica operativa della gestione padroncini</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.fgSubtle, paddingTop: 4 }}>
          <Calendar size={13} />
          <span>{now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* KPI RIGA 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <KpiCard label="Padroncini Attivi"  value={pAttivi.length}
          sub={`${pDismessi.length} dismessi · ${padroncini.length} totali`}
          icon={<Users size={16}/>} iconColor={T.primary} iconBg={T.primaryBg}
          onClick={() => onNavigate?.("padroncini")} />
        <KpiCard label="Flotta Mezzi"       value={mezziAttivi.length}
          sub={`${tuttiMezzi.length} totali · ${tuttiMezzi.filter(m=>m.stato==="DISPONIBILE").length} disponibili`}
          icon={<Truck size={16}/>} iconColor={T.success} iconBg={T.successBg}
          onClick={() => onNavigate?.("mezzi")} />
        <KpiCard label="Palmari Attivi"     value={palmAttivi.length}
          sub={`su ${tuttiPalmari.length} totali`}
          icon={<Smartphone size={16}/>} iconColor={T.violet} iconBg={T.violetBg}
          onClick={() => onNavigate?.("palmari")} />
        <KpiCard label="Alert Documenti"    value={alertDocs}
          sub={`${durcScad.length} DURC · ${dvrScad.length} DVR`}
          icon={<AlertTriangle size={16}/>} iconColor={T.danger} iconBg={T.dangerBg}
          alert={alertDocs > 0}
          onClick={() => onNavigate?.("padroncini")} />
      </div>

      {/* PERIODO */}
      <div style={{ ...cardBase, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.fgSubtle, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
          Periodo
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: T.fgSubtle }}>Dal</span>
          <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, color: T.fg, outline: "none", background: T.card, cursor: "pointer" }}
            onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
          <span style={{ fontSize: 11, color: T.fgSubtle }}>Al</span>
          <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, color: T.fg, outline: "none", background: T.card, cursor: "pointer" }}
            onFocus={e => e.target.style.borderColor = T.primary} onBlur={e => e.target.style.borderColor = T.border} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {ranges.map(([lbl, f, t]) => {
            const active = rangeFrom === f && rangeTo === t;
            return (
              <button key={lbl} onClick={() => { setRangeFrom(f); setRangeTo(t); }}
                style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .12s",
                  border: active ? `1px solid ${T.primary}` : `1px solid ${T.border}`,
                  background: active ? T.primary : T.card, color: active ? "#fff" : T.fgMuted }}>
                {lbl}
              </button>
            );
          })}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: T.fgSubtle }}>{conteggiRange.length} conteggi</span>
      </div>

      {/* KPI FINANZIARI — card bianche, solo testo colorato */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <FinKpi label="Fatturato (ivato)"   value={euro(totFatt)} sub={`Imponibile ${euro(totImp)}`}                             color={T.primary} />
        <FinKpi label="Addebiti totali"     value={euro(totAdd)}  sub="con IVA e bollo"                                         color={T.warning} />
        <FinKpi label="Da bonificare"       value={euro(totBon)}  sub="fattura − addebiti"                                       color={totBon >= 0 ? T.success : T.danger} />
        <FinKpi label="Media per conteggio" value={conteggiRange.length ? euro(totBon / conteggiRange.length) : "—"} sub="bonifico medio" color={T.violet} />
      </div>

      {/* GRAFICI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

        <div style={{ ...cardBase, padding: "20px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <TrendingUp size={15} color={T.primary} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>Andamento Fatturato</span>
          </div>
          {mesiGrafico.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0", color: T.fgSubtle, fontSize: 13 }}>Nessun dato nel periodo</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mesiGrafico} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gFatt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.primary} stopOpacity={0.13} />
                    <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gBon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.success} stopOpacity={0.13} />
                    <stop offset="95%" stopColor={T.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.fgSubtle }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: T.fgSubtle }} axisLine={false} tickLine={false}
                  tickFormatter={v => `€${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip formatter={v => euro(v)} labelStyle={{ fontWeight: 700, color: T.fg }}
                  contentStyle={{ border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Area type="monotone" dataKey="fatt" name="Fatturato" stroke={T.primary} fill="url(#gFatt)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="bon"  name="Bonifico"  stroke={T.success} fill="url(#gBon)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ ...cardBase, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            <Truck size={15} color={T.success} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>Stato Flotta</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={fleetData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                  paddingAngle={2} dataKey="value" stroke="none">
                  {fleetData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={7}
                  formatter={v => <span style={{ fontSize: 11, color: T.fgMuted }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginTop: -4 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.fg, lineHeight: 1 }}>{tuttiMezzi.length}</div>
              <div style={{ fontSize: 11, color: T.fgSubtle, marginTop: 2 }}>Mezzi totali</div>
            </div>
          </div>
        </div>
      </div>

      {/* ALERT DURC / DVR */}
      {alertDocs > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10,
          padding: "12px 18px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={16} color={T.warning} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.fg, marginBottom: 3 }}>Documenti scaduti o mancanti</div>
            {durcScad.length > 0 && <div style={{ fontSize: 12, color: T.fgMuted }}>DURC scaduto: {durcScad.map(p => p.nome).join(" • ")}</div>}
            {dvrScad.length  > 0 && <div style={{ fontSize: 12, color: T.fgMuted }}>DVR scaduto: {dvrScad.map(p => p.nome).join(" • ")}</div>}
          </div>
        </div>
      )}

      {/* SCADENZE MEZZI + RIEPILOGO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

        {scadenze.length > 0 ? (
          <div style={{ ...cardBase, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
              <AlertTriangle size={15} color={T.danger} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>Scadenze Mezzi</span>
              <span style={{ marginLeft: 2, background: T.dangerBg, color: T.danger, borderRadius: 20, padding: "1px 9px", fontSize: 11, fontWeight: 700 }}>
                {scadenze.length}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Targa","Padroncino","Tipo","Data","Stato"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scadenze.map((r, i) => {
                    const isScad = r.giorni < 0;
                    const isWarn = !isScad && r.giorni <= 14;
                    const tipoBg  = isScad ? T.dangerBg : isWarn ? T.warningBg : T.primaryBg;
                    const tipoCol = isScad ? T.danger   : isWarn ? T.warning   : T.primary;
                    const statoBg  = isScad ? T.dangerBg : isWarn ? T.warningBg : T.successBg;
                    const statoCol = isScad ? T.danger   : isWarn ? T.warning   : T.success;
                    const statoLbl = isScad ? `Scaduta ${Math.abs(r.giorni)}gg fa` : `tra ${r.giorni}gg`;
                    return (
                      <tr key={i} style={{ background: isScad ? "#fff5f5" : i % 2 === 0 ? T.card : T.rowAlt }}>
                        <td style={td}><span style={{ fontFamily: "roboto", fontWeight: 800, fontSize: 12 }}>{r.targa}</span></td>
                        <td style={td}><span style={{ fontSize: 12 }}>{r.padNome}</span></td>
                        <td style={td}><Chip bg={tipoBg} col={tipoCol}>{r.tipo}</Chip></td>
                        <td style={td}><span style={{ fontFamily: "roboto", fontSize: 12 }}>{fmtDate(r.data)}</span></td>
                        <td style={td}><Chip bg={statoBg} col={statoCol}>{statoLbl}</Chip></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ ...cardBase, padding: 32, textAlign: "center", color: T.fgSubtle, fontSize: 13 }}>
            Nessuna scadenza imminente 🎉
          </div>
        )}

        <div style={{ ...cardBase, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <Users size={15} color={T.violet} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>Riepilogo per Padroncino</span>
          </div>
          {conteggiRange.length > 0 ? (
            <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    {["Padroncino","Fatturato","Addebiti","Bonifico","%"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pAttivi.map((p, i) => {
                    const pc  = conteggiRange.filter(c => c.padroncino_id === p.id);
                    if (!pc.length) return null;
                    const fatt = pc.reduce((s, c) => s + (c.totale_fattura       || 0), 0);
                    const add  = pc.reduce((s, c) => s + (c.totale_addebiti      || 0), 0);
                    const bon  = pc.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
                    const doneAvg = Math.round(pc.reduce((s, c) => {
                      const steps = [c.distrib_inviata, c.pdf_addeb, c.fattura_ricevuta, c.fatt_tu_creata];
                      return s + (steps.filter(Boolean).length / 4) * 100;
                    }, 0) / pc.length);
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? T.card : T.rowAlt, borderBottom: `1px solid ${T.border}` }}>
                        <td style={td}><span style={{ fontWeight: 700, fontSize: 12, maxWidth: 140, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span></td>
                        <td style={td}><span style={{ fontFamily: "roboto", fontSize: 11 }}>{euro(fatt)}</span></td>
                        <td style={td}><span style={{ fontFamily: "roboto", fontSize: 11, color: T.danger }}>{euro(add)}</span></td>
                        <td style={td}><span style={{ fontFamily: "roboto", fontSize: 12, fontWeight: 700, color: bon >= 0 ? T.success : T.danger }}>{euro(bon)}</span></td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 44, height: 4, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${doneAvg}%`, height: "100%", background: doneAvg === 100 ? T.success : T.primary, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 10, color: T.fgSubtle }}>{doneAvg}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: T.fgSubtle, fontSize: 13 }}>
              Nessun conteggio nel periodo selezionato
            </div>
          )}
        </div>
      </div>

      {/* NOTE & ATTIVITÀ */}
      <div style={{ ...cardBase, padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>📝</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>Note & Attività</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()}
            placeholder="Aggiungi nota o attività..."
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", color: T.fg, background: T.card }}
            onFocus={e => e.target.style.borderColor = T.warning} onBlur={e => e.target.style.borderColor = T.border} />
          <button onClick={addNote}
            style={{ padding: "8px 16px", borderRadius: 8, background: T.warning, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            +
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
          {notes.length === 0 && (
            <div style={{ textAlign: "center", color: T.fgSubtle, fontSize: 12, padding: "14px 0" }}>Nessuna nota. Aggiungine una!</div>
          )}
          {notes.map(n => (
            <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
              background: n.done ? T.bg : T.card, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <button onClick={() => toggleNote(n.id)} style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1, cursor: "pointer",
                border: `2px solid ${n.done ? T.success : T.border}`, background: n.done ? T.success : T.card,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {n.done && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              <span style={{ flex: 1, fontSize: 13, color: n.done ? T.fgSubtle : T.fg, textDecoration: n.done ? "line-through" : "none", lineHeight: 1.45 }}>
                {n.text}
              </span>
              <button onClick={() => deleteNote(n.id)}
                style={{ background: "none", border: "none", color: T.fgSubtle, cursor: "pointer", fontSize: 15, lineHeight: 1, flexShrink: 0, padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
        {notes.filter(n => n.done).length > 0 && (
          <button onClick={() => saveNotes(notes.filter(n => !n.done))}
            style={{ marginTop: 8, fontSize: 11, color: T.fgSubtle, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Rimuovi completate ({notes.filter(n => n.done).length})
          </button>
        )}
      </div>

    </div>
  );
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, icon, iconColor, iconBg, alert, onClick }) => (
  <div onClick={onClick} style={{
    ...cardBase, padding: "18px 20px",
    cursor: onClick ? "pointer" : "default",
    transition: "transform .12s, box-shadow .12s",
    background: alert ? "#fff5f5" : T.card,
    border: `1px solid ${alert ? "#fca5a5" : T.border}`,
  }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.09)"; }}}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = "none";             e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: T.fgSubtle, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</span>
      <div style={{ background: iconBg, color: iconColor, borderRadius: 8, padding: 7, display: "flex" }}>{icon}</div>
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, color: alert ? T.danger : T.fg, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.fgSubtle, marginTop: 6 }}>{sub}</div>}
  </div>
);

const FinKpi = ({ label, value, sub, color }) => (
  <div style={{ ...cardBase, padding: "18px 20px" }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: T.fgSubtle, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "roboto", letterSpacing: "-0.01em" }}>{value}</div>
    <div style={{ fontSize: 11, color: T.fgSubtle, marginTop: 5 }}>{sub}</div>
  </div>
);

const Chip = ({ bg, col, children }) => (
  <span style={{ background: bg, color: col, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }}>
    {children}
  </span>
);