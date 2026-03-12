import { useState, useEffect, useRef } from "react";
import { ConteggiForm } from "./ConteggiForm";
import { euro, giorniMese, PALMARE_TARIFFA_GG, calcTotali, createConteggio, MESI } from "../utils/formatters";
import { Icon } from "./Icons";

// ─── KPI CARD (Stile Moderno) ──────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon, color = "#3b82f6" }) => (
  <div style={{ 
    background: "#fff", 
    borderRadius: 12, 
    border: "1px solid #e2e8f0", 
    padding: "16px 20px", 
    flex: 1, 
    minWidth: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ color: color, opacity: 0.8 }}>{icon}</div>
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", fontFamily: "'DM Mono', monospace" }}>{value}</div>
    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{sub}</div>
  </div>
);

// ─── BADGE (Stile Shadcn) ──────────────────────────────────────────────────────
const Badge = ({ label, color }) => {
  const map = {
    success: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
    warning: { bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
    neutral:  { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
  };
  const c = map[color] || map.neutral;
  return (
    <span style={{ 
      display: "inline-block", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, 
      background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: "nowrap" 
    }}>{label}</span>
  );
};

export const ConteggiEditor = ({ padroncini, conteggi, mese, anno, onSave, onDelete, addebiti_standard = [], ricariche = {}, mezziFlotta = [] }) => {
  const [selPad, setSelPad] = useState(null);
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState("riepilogo");
  const [saveIndicator, setSaveIndicator] = useState(null);
  const giorni = giorniMese(mese, anno);
  const autoSaveTimer = useRef(null);
  const prevForm = useRef(null);

  const pAttivi = padroncini.filter(p => p.stato === "ATTIVO");
  const meseConteggi = conteggi.filter(c => c.mese === mese && c.anno === anno);
  
  // Calcoli KPI
  const totFatt = meseConteggi.reduce((s, c) => s + (c.totale_fattura || 0), 0);
  const totAdd  = meseConteggi.reduce((s, c) => s + (c.totale_addebiti || 0), 0);
  const totBon  = meseConteggi.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
  const completati = meseConteggi.filter(c => c.caricata_scadenziario).length;

  // ─── LOGICA FUNZIONALE (Invariata) ──────────────────────────────────────────
  const loadConteggio = (p) => {
    setSelPad(p);
    setTab("riepilogo");
    const existing = conteggi.find(c => c.padroncino_id === p.id && c.mese === mese && c.anno === anno);
    setForm(existing ? { ...existing } : createConteggio(p, mese, anno));
  };

  const handleBack = () => { setSelPad(null); setForm(null); };

  useEffect(() => { if (selPad) loadConteggio(selPad); }, [mese, anno]);

  useEffect(() => {
    if (!form) return;
    const cost = parseFloat(((form.n_palmari || 0) * PALMARE_TARIFFA_GG * giorni).toFixed(2));
    setForm(f => ({ ...f, addebiti_palmari: cost }));
  }, [form?.n_palmari, giorni]);

  useEffect(() => {
    if (!form) return;
    const totals = calcTotali(form);
    setForm(f => ({ ...f, ...totals }));
  }, [
    form?.fisso_mensile, form?.totale_spedizioni, form?.totale_ritiri, form?.totale_ritiri_fissi,
    form?.consegne_doppie, form?.consegne_extra, form?.sforamento_rientri, form?.compensazioni_imponibile,
    JSON.stringify(form?.altri_fatturato), JSON.stringify(form?.voci_fatturato),
    form?.addebiti_palmari, form?.addebiti_mezzi, form?.addebiti_ricariche,
    JSON.stringify(form?.altri_addebiti), JSON.stringify(form?.ricariche_mezzi), form?.compensazioni_distribuzione,
    JSON.stringify(form?.fatture_fine_mese), JSON.stringify(form?.cassa_prima_nota), form?.acconto_fattura,
  ]);

  useEffect(() => {
    if (!form) return;
    const formStr = JSON.stringify(form);
    if (prevForm.current === formStr) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveIndicator("saving");
    autoSaveTimer.current = setTimeout(() => {
      prevForm.current = formStr;
      onSave(form);
      setSaveIndicator("saved");
      setTimeout(() => setSaveIndicator(null), 2000);
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [JSON.stringify(form)]);

  const handleDuplica = () => {
    if (!form) return;
    const idx = MESI.indexOf(form.mese);
    const nextMese = MESI[(idx + 1) % 12];
    const nextAnno = idx === 11 ? form.anno + 1 : form.anno;
    onSave({ ...form, mese: nextMese, anno: nextAnno, distrib_inviata: false, pdf_addeb: false, fattura_ricevuta: false, fatt_tu_creata: false, unione_pdf: false, caricata_scadenziario: false, note_varie: "" });
    alert(`Duplicato per ${nextMese} ${nextAnno}`);
  };

  const handleElimina = () => {
    if (!form || !window.confirm("Eliminare definitivamente?")) return;
    onDelete && onDelete(form);
    handleBack();
  };

  const hasSaved = form && conteggi.some(c => c.padroncino_id === form.padroncino_id && c.mese === form.mese && c.anno === form.anno);

  // ─── RENDERING ──────────────────────────────────────────────────────────────
  if (!selPad) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header Titolo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Conteggi Mensili</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ padding: "4px 12px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 700 }}>{mese} {anno}</span>
            <span style={{ padding: "4px 12px", borderRadius: 8, background: "#f1f5f9", color: "#64748b", fontSize: 12, fontWeight: 600 }}>{giorni} giorni</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ display: "flex", gap: 12 }}>
          <KpiCard label="Fatturato Mese" value={euro(totFatt)} icon={<Icon name="calculator" size={16}/>} sub={`${meseConteggi.length} conteggi`} />
          <KpiCard label="Addebiti" value={euro(totAdd)} icon={<Icon name="file" size={16}/>} sub="totale addebiti" color="#ef4444" />
          <KpiCard label="Da Bonificare" value={euro(totBon)} icon={<Icon name="save" size={16}/>} sub="residuo netto" color="#10b981" />
          <KpiCard label="Completati" value={`${completati}/${meseConteggi.length}`} icon={<Icon name="check" size={16}/>} 
            sub={completati === meseConteggi.length ? "Tutti pronti" : "In lavorazione"} color="#8b5cf6" />
        </div>

        {/* Tabella Principale */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#3b82f6" }}><Icon name="calculator" size={16}/></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Conteggi — {mese} {anno}</span>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Padroncino", "Fattura", "Addebiti", "Bonifico", "Stato", "Distrib.", "PDF", "Fatt.", "TU", "Unione", "Scad."].map((h, i) => (
                      <th key={h} style={{
                        padding: "10px 12px", textAlign: i === 0 ? "left" : "center", fontSize: 10, fontWeight: 700, color: "#64748b",
                        textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap"
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pAttivi.map((p, i) => {
                    const c = meseConteggi.find(item => item.padroncino_id === p.id);
                    const isAlt = i % 2 !== 0;
                    return (
                      <tr key={p.id} onClick={() => loadConteggio(p)}
                        style={{ cursor: "pointer", background: isAlt ? "#f8fafc" : "#fff", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={e => e.currentTarget.style.background = isAlt ? "#f8fafc" : "#fff"}>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{p.nome}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{c ? euro(c.totale_fattura) : "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#dc2626" }}>{c ? euro(c.totale_addebiti) : "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: (c?.totale_da_bonificare || 0) >= 0 ? "#166534" : "#dc2626" }}>{c ? euro(c.totale_da_bonificare) : "—"}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          {c ? <Badge label={c.caricata_scadenziario ? "Completato" : "In corso"} color={c.caricata_scadenziario ? "success" : "warning"} />
                             : <Badge label="Mancante" color="neutral" />}
                        </td>
                        {[c?.distrib_inviata, c?.pdf_addeb, c?.fattura_ricevuta, c?.fatt_tu_creata, c?.unione_pdf, c?.caricata_scadenziario].map((v, j) => (
                          <td key={j} style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                            {v ? <Icon name="check" size={14} color="#10b981" /> : <span style={{ color: "#cbd5e1" }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══ VISTA DETTAGLIO (Stile Header Moderno) ══════════════════════════════════
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ 
        background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 20px", 
        display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={handleBack} style={{ 
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, 
            background: "#fff", color: "#475569", border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700, cursor: "pointer" 
          }}>
            <Icon name="arrowLeft" size={14}/> Indietro
          </button>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{selPad.nome}</div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{mese} {anno} • Cod. {selPad.codice}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ minWidth: 100, textAlign: "right" }}>
            {saveIndicator === "saving" && <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Salvataggio...</div>}
            {saveIndicator === "saved" && <div style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>✓ Salvato</div>}
          </div>

          <div style={{ display: "flex", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", background: "#f1f5f9", padding: 2 }}>
            {["riepilogo", "dettaglio"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ 
                padding: "6px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, borderRadius: 8,
                background: tab === t ? "#fff" : "transparent", color: tab === t ? "#2563eb" : "#64748b",
                boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s"
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          <button onClick={handleDuplica} style={{ padding: "8px 14px", borderRadius: 8, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Duplica</button>
          {hasSaved && <button onClick={handleElimina} style={{ padding: "8px 12px", borderRadius: 8, background: "#fff1f2", color: "#dc2626", border: "1px solid #fecdd3", cursor: "pointer" }}><Icon name="trash" size={14}/></button>}

          <div style={{ background: (form?.totale_da_bonificare || 0) >= 0 ? "#dcfce7" : "#fee2e2", borderRadius: 10, padding: "6px 14px", border: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "center" }}>Bonifico</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: (form?.totale_da_bonificare || 0) >= 0 ? "#166534" : "#dc2626", fontFamily: "'DM Mono', monospace" }}>{euro(form?.totale_da_bonificare || 0)}</div>
          </div>

          <button onClick={() => onSave(form)} style={{ padding: "10px 20px", borderRadius: 10, background: "#2563eb", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Salva</button>
        </div>
      </div>

      <ConteggiForm
        form={form}
        setForm={setForm}
        padroncino={selPad}
        mese={mese}
        anno={anno}
        giorni={giorni}
        onSave={() => onSave(form)}
        embedded={true}
        externalTab={tab}
        addebiti_standard={addebiti_standard}
        ricaricheMese={ricariche[`${mese}_${anno}`] || {}}
        mezziFlotta={mezziFlotta.filter(m => m.padroncino_id === selPad?.id)}
      />
    </div>
  );
};