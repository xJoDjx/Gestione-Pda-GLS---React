import { useState, useEffect } from "react";
import { SectionCard, StatCard } from "./BaseComponents";
import { Icon } from "./Icons";
import { euro, durcColor, MESI } from "../utils/formatters";

const NOTE_KEY = "gls_dashboard_notes";
const loadNotes = () => { try { return JSON.parse(localStorage.getItem(NOTE_KEY) || "[]"); } catch { return []; } };
const saveNotesLS = (n) => { try { localStorage.setItem(NOTE_KEY, JSON.stringify(n)); } catch {} };

export const DashboardView = ({ padroncini, conteggi, mezzi = [], onNavigate }) => {
  const now = new Date();
  const curAnno = now.getFullYear();

  // Range date selezionabile dall'utente
  const [rangeFrom, setRangeFrom] = useState(`${curAnno}-01-01`);
  const [rangeTo,   setRangeTo]   = useState(`${curAnno}-12-31`);

  // Note/todo
  const [notes, setNotes]     = useState(loadNotes);
  const [newNote, setNewNote] = useState("");

  const saveNotes = (n) => { setNotes(n); saveNotesLS(n); };

  const addNote = () => {
    if (!newNote.trim()) return;
    const n = [...notes, { id: Date.now(), text: newNote.trim(), done: false, ts: new Date().toISOString() }];
    saveNotes(n);
    setNewNote("");
  };

  const toggleNote = (id) => saveNotes(notes.map(n => n.id === id ? { ...n, done: !n.done } : n));
  const deleteNote = (id) => saveNotes(notes.filter(n => n.id !== id));

  // Filtra conteggi per range
  const conteggiRange = conteggi.filter(c => {
    const idx = MESI.indexOf(c.mese);
    if (idx < 0) return false;
    const d = new Date(c.anno, idx, 1);
    return d >= new Date(rangeFrom) && d <= new Date(rangeTo);
  });

  const totFatt = conteggiRange.reduce((s, c) => s + (c.totale_fattura || 0), 0);
  const totAdd  = conteggiRange.reduce((s, c) => s + (c.totale_addebiti || 0), 0);
  const totBon  = conteggiRange.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
  const totImp  = conteggiRange.reduce((s, c) => s + (c.totale_imponibile || 0), 0);

  // Statistiche padroncini
  const pAttivi   = padroncini.filter(p => p.stato === "ATTIVO");
  const pDismessi = padroncini.filter(p => p.stato !== "ATTIVO");
  const durcScad  = padroncini.filter(p => p.durc_stato === "SCADUTO");
  const dvrScad   = padroncini.filter(p => p.dvr_stato === "SCADUTO");

  // Statistiche mezzi (da tutti i padroncini)
  const tuttiMezzi   = padroncini.flatMap(p => (p.mezzi || []).map(m => ({ ...m, padNome: p.nome })));
  const mezziAttivi  = tuttiMezzi.filter(m => m.stato === "ATTIVO");
  const mezziFermi   = tuttiMezzi.filter(m => m.stato === "FERMO");

  // Statistiche palmari
  const tuttiPalmari = padroncini.flatMap(p => (p.palmari || []).map(m => ({ ...m, padNome: p.nome })));
  const palmAttivi   = tuttiPalmari.filter(m => m.stato !== "DISMESSO");

  // Mesi con conteggi nel range per grafico
  const mesiGrafico = (() => {
    const map = {};
    conteggiRange.forEach(c => {
      const k = `${c.mese} ${c.anno}`;
      if (!map[k]) map[k] = { label: k, fatt: 0, bon: 0 };
      map[k].fatt += c.totale_fattura || 0;
      map[k].bon  += c.totale_da_bonificare || 0;
    });
    return Object.values(map).slice(-12);
  })();

  const maxFatt = Math.max(...mesiGrafico.map(m => m.fatt), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── RIGA 1: KPI PADRONCINI / MEZZI / PALMARI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <KpiCard
          label="Padroncini Attivi" value={pAttivi.length}
          sub={`${pDismessi.length} dismessi · tot. ${padroncini.length}`}
          icon="users" color="#3b82f6" bg="#eff6ff"
          onClick={() => onNavigate && onNavigate("padroncini")}
        />
        <KpiCard
          label="Mezzi in Flotta" value={mezziAttivi.length}
          sub={`${mezziFermi.length} fermi · tot. ${tuttiMezzi.length}`}
          icon="truck" color="#10b981" bg="#ecfdf5"
          alert={mezziFermi.length > 0}
          onClick={() => onNavigate && onNavigate("mezzi")}
        />
        <KpiCard
          label="Palmari" value={palmAttivi.length}
          sub={`su ${tuttiPalmari.length} totali`}
          icon="device" color="#8b5cf6" bg="#f5f3ff"
          onClick={() => onNavigate && onNavigate("palmari")}
        />
        <KpiCard
          label="Alert Documenti"
          value={durcScad.length + dvrScad.length}
          sub={`${durcScad.length} DURC · ${dvrScad.length} DVR scaduti`}
          icon="warning" color="#ef4444" bg="#fef2f2"
          alert={durcScad.length + dvrScad.length > 0}
          onClick={() => onNavigate && onNavigate("padroncini")}
        />
      </div>

      {/* ── RIGA 2: RANGE + KPI FINANZIARI ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            Periodo analisi
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Dal</span>
            <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, color: "#374151", outline: "none", cursor: "pointer" }}
              onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Al</span>
            <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, color: "#374151", outline: "none", cursor: "pointer" }}
              onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              ["Quest'anno",    `${curAnno}-01-01`, `${curAnno}-12-31`],
              ["Anno scorso",   `${curAnno-1}-01-01`, `${curAnno-1}-12-31`],
              ["Ultimi 6 mesi", (() => { const d = new Date(); d.setMonth(d.getMonth()-6); return d.toISOString().slice(0,10); })(), new Date().toISOString().slice(0,10)],
              ["Tutto",         "2020-01-01", "2099-12-31"],
            ].map(([lbl, f, t]) => (
              <button key={lbl} onClick={() => { setRangeFrom(f); setRangeTo(t); }}
                style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: rangeFrom === f && rangeTo === t ? "#1e40af" : "#f8fafc", color: rangeFrom === f && rangeTo === t ? "#fff" : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>
            {conteggiRange.length} conteggi nel periodo
          </div>
        </div>
      </div>

      {/* ── KPI FINANZIARI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        <FinCard label="Fatturato (ivato)" value={euro(totFatt)} color="#1d4ed8" bg="#dbeafe" sub={`imponibile ${euro(totImp)}`} />
        <FinCard label="Addebiti totali"   value={euro(totAdd)}  color="#92400e" bg="#fef3c7" sub="con IVA e bollo" />
        <FinCard label="Da bonificare"     value={euro(totBon)}  color={totBon >= 0 ? "#166534" : "#dc2626"} bg={totBon >= 0 ? "#dcfce7" : "#fee2e2"} sub="fattura − addebiti" />
        <FinCard label="Margine medio"     value={conteggiRange.length ? euro(totBon / conteggiRange.length) : "—"} color="#7c3aed" bg="#ede9fe" sub="per conteggio" />
      </div>

      {/* ── GRAFICO BARRE + NOTE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>

        {/* Grafico */}
        <SectionCard title="Andamento Fatturato nel Periodo" icon="euro" accent="#3b82f6">
          {mesiGrafico.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 13 }}>
              Nessun conteggio nel periodo selezionato
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, overflowX: "auto", paddingBottom: 4 }}>
              {mesiGrafico.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 52, flex: "0 0 auto" }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>
                    {euro(m.fatt).replace("€","").trim()}
                  </div>
                  <div style={{ width: 32, background: "#dbeafe", borderRadius: "4px 4px 0 0", height: `${Math.max(6,(m.fatt/maxFatt)*120)}px`, position: "relative", transition: "height 0.3s" }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: m.bon >= 0 ? "#3b82f6" : "#ef4444", borderRadius: "4px 4px 0 0", height: `${Math.max(4,(Math.abs(m.bon)/maxFatt)*120)}px` }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap", transform: "rotate(-35deg)", marginTop: 2 }}>
                    {m.label.split(" ")[0].slice(0,3)}<br />{m.label.split(" ")[1]}
                  </div>
                </div>
              ))}
            </div>
          )}
          {mesiGrafico.length > 0 && (
            <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <div style={{ width: 10, height: 10, background: "#dbeafe", borderRadius: 2 }} /> Fattura
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <div style={{ width: 10, height: 10, background: "#3b82f6", borderRadius: 2 }} /> Bonifico
              </div>
            </div>
          )}
        </SectionCard>

        {/* Note / Todo */}
        <SectionCard title="Note & Attività" icon="note" accent="#f59e0b">
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addNote()}
              placeholder="Aggiungi nota o attività..."
              style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, outline: "none" }}
              onFocus={e => e.target.style.borderColor = "#f59e0b"}
              onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            />
            <button onClick={addNote} style={{ padding: "7px 12px", borderRadius: 7, background: "#f59e0b", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflowY: "auto" }}>
            {notes.length === 0 && (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: "16px 0" }}>
                Nessuna nota. Aggiungine una!
              </div>
            )}
            {notes.map(n => (
              <div key={n.id} style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 10px",
                background: n.done ? "#f8fafc" : "#fff",
                borderRadius: 7, border: "1px solid #f1f5f9"
              }}>
                <button onClick={() => toggleNote(n.id)} style={{
                  width: 18, height: 18, borderRadius: 4, border: `2px solid ${n.done ? "#22c55e" : "#d1d5db"}`,
                  background: n.done ? "#22c55e" : "#fff", cursor: "pointer", flexShrink: 0, marginTop: 1,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {n.done && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
                <span style={{ flex: 1, fontSize: 12, color: n.done ? "#94a3b8" : "#374151", textDecoration: n.done ? "line-through" : "none", lineHeight: 1.4 }}>
                  {n.text}
                </span>
                <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
          {notes.filter(n => n.done).length > 0 && (
            <button onClick={() => saveNotes(notes.filter(n => !n.done))} style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Rimuovi completate ({notes.filter(n => n.done).length})
            </button>
          )}
        </SectionCard>
      </div>

      {/* ── ALERT DOCUMENTI SCADUTI ── */}
      {(durcScad.length > 0 || dvrScad.length > 0) && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12 }}>
          <div style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }}><Icon name="warning" size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>Documenti in scadenza o scaduti</div>
            {durcScad.length > 0 && <div style={{ fontSize: 12, color: "#78350f", marginBottom: 2 }}>DURC scaduto: {durcScad.map(p => p.nome).join(" • ")}</div>}
            {dvrScad.length  > 0 && <div style={{ fontSize: 12, color: "#78350f" }}>DVR scaduto: {dvrScad.map(p => p.nome).join(" • ")}</div>}
          </div>
        </div>
      )}

      {/* ── SCADENZE + RIEPILOGO AFFIANCATI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <MezziScadenza padroncini={padroncini} mezzi={mezzi} />
        {conteggiRange.length > 0 ? (
          <SectionCard title={`Riepilogo per Padroncino`} icon="users" accent="#6366f1">
            <div style={{ overflowX: "auto", maxHeight: 340, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Padroncino", "Fatt.", "Addeb.", "Bonif.", "%"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap", background: "#f8fafc" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pAttivi.map((p, i) => {
                    const pc = conteggiRange.filter(c => c.padroncino_id === p.id);
                    if (!pc.length) return null;
                    const fatt = pc.reduce((s, c) => s + (c.totale_fattura || 0), 0);
                    const add  = pc.reduce((s, c) => s + (c.totale_addebiti || 0), 0);
                    const bon  = pc.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
                    const doneAvg = Math.round(pc.reduce((s, c) => {
                      const steps = [c.distrib_inviata, c.pdf_addeb, c.fattura_ricevuta, c.fatt_tu_creata, c.unione_pdf, c.caricata_scadenziario];
                      return s + (steps.filter(Boolean).length / 6) * 100;
                    }, 0) / pc.length);
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{euro(fatt)}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#dc2626" }}>{euro(add)}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: bon >= 0 ? "#166534" : "#dc2626" }}>{euro(bon)}</td>
                        <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 40, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ width: `${doneAvg}%`, height: "100%", background: doneAvg === 100 ? "#10b981" : "#3b82f6", borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 10, color: "#94a3b8" }}>{doneAvg}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            Nessun conteggio nel periodo selezionato
          </div>
        )}
      </div>
    </div>
  );
};

// ─── BLOCCO MEZZI IN SCADENZA ────────────────────────────────────────────────
const MezziScadenza = ({ padroncini, mezzi = [] }) => {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const tipiScad = [
    { key: "scad_assicurazione", label: "Assicurazione", color: "#dc2626", bg: "#fee2e2" },
    { key: "scad_revisione",     label: "Revisione",     color: "#92400e", bg: "#fef3c7" },
    { key: "scad_bollo",         label: "Bollo",         color: "#7c3aed", bg: "#ede9fe" },
    { key: "scad_tachigrafo",    label: "Tachigrafo",    color: "#0369a1", bg: "#e0f2fe" },
  ];

  // USA SOLO i mezzi globali come fonte autoritativa (contengono scad_ fields)
  // Il campo padNome viene risolto dal padroncino_id del mezzo globale
  const padMap = Object.fromEntries(padroncini.map(p => [p.id, p.nome]));
  const tuttiMezziScad = (mezzi || []).map(m => ({
    ...m,
    padNome: m.padroncino_id ? (padMap[m.padroncino_id] || "—") : (m.autista || "—")
  }));

  const righe = [];
  tuttiMezziScad.forEach(m => {
    if (!m.targa) return;
    tipiScad.forEach(t => {
      if (!m[t.key]) return;
      const d = new Date(m[t.key]);
      if (isNaN(d)) return;
      const giorni = Math.round((d - oggi) / 86400000);
      if (giorni <= 60) {
        righe.push({ targa: m.targa, padNome: m.padNome, tipo: t.label, data: m[t.key], giorni, color: t.color, bg: t.bg, scaduta: giorni < 0 });
      }
    });
  });

  righe.sort((a, b) => a.giorni - b.giorni);

  if (righe.length === 0) return null;

  const fmt = (d) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
  };

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: 6 }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Mezzi — Scadenze (entro 60 giorni o già scadute)</span>
        <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>{righe.length}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Targa", "Padroncino", "Tipo Scadenza", "Data", "Stato"].map(h => (
                <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {righe.map((r, i) => (
              <tr key={i} style={{ background: r.scaduta ? "#fff5f5" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "7px 12px", borderBottom: "1px solid #f1f5f9", fontWeight: 800, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{r.targa}</td>
                <td style={{ padding: "7px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>{r.padNome}</td>
                <td style={{ padding: "7px 12px", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ background: r.bg, color: r.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{r.tipo}</span>
                </td>
                <td style={{ padding: "7px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{fmt(r.data)}</td>
                <td style={{ padding: "7px 12px", borderBottom: "1px solid #f1f5f9" }}>
                  {r.scaduta ? (
                    <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                      Scaduta {Math.abs(r.giorni)} gg fa
                    </span>
                  ) : r.giorni <= 14 ? (
                    <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                      ⚠ tra {r.giorni} gg
                    </span>
                  ) : (
                    <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                      tra {r.giorni} gg
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, sub, icon, color, bg, alert, onClick }) => (
  <div onClick={onClick} style={{
    background: alert ? "#fff7ed" : "#fff", borderRadius: 14,
    padding: "18px 20px", border: `1px solid ${alert ? "#fed7aa" : "#e2e8f0"}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    cursor: onClick ? "pointer" : "default",
    transition: "transform 0.1s, box-shadow 0.1s",
  }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div style={{ background: bg, color, borderRadius: 9, padding: 7 }}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {icon === "users"   && <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>}
          {icon === "truck"   && <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>}
          {icon === "device"  && <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>}
          {icon === "warning" && <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
        </svg>
      </div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: alert ? "#dc2626" : "#0f172a", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{sub}</div>}
  </div>
);

const FinCard = ({ label, value, sub, color, bg }) => (
  <div style={{ background: bg, borderRadius: 14, padding: "16px 20px", border: `1px solid ${bg}` }}>
    <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, opacity: 0.8 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color, marginTop: 4, opacity: 0.7 }}>{sub}</div>}
  </div>
);
