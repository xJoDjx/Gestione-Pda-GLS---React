import { useState, useEffect, useRef } from "react";
import { ConteggiForm } from "./ConteggiForm";
import { euro, giorniMese, PALMARE_TARIFFA_GG, calcTotali, createConteggio, MESI } from "../utils/formatters";
import { Icon } from "./Icons";

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon, color = "#3b82f6" }) => (
  <div style={{
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "14px 18px",
    flex: 1,
    minWidth: 0,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ color, opacity: 0.7, lineHeight: 1 }}>{icon}</div>
    </div>
    <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>{value}</div>
    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, fontWeight: 500 }}>{sub}</div>
  </div>
);

// ─── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => {
  const map = {
    success: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
    warning: { bg: "#fef9c3", text: "#854d0e", border: "#fde68a" },
    neutral:  { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" },
  };
  const c = map[color] || map.neutral;
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: "nowrap"
    }}>{label}</span>
  );
};

// ─── CHECK ICON ───────────────────────────────────────────────────────────────
const Chk = ({ v }) => v
  ? <span style={{ color:"#10b981",fontSize:14,lineHeight:1 }}>✓</span>
  : <span style={{ color:"#e2e8f0",fontSize:14,lineHeight:1 }}>–</span>;

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

  const totFatt = meseConteggi.reduce((s, c) => s + (c.totale_fattura || 0), 0);
  const totAdd  = meseConteggi.reduce((s, c) => s + (c.totale_addebiti || 0), 0);
  const totBon  = meseConteggi.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
  const completati = meseConteggi.filter(c => c.distrib_inviata && c.pdf_addeb && c.fattura_ricevuta && c.fatt_tu_creata).length;

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
    JSON.stringify(form?.voci_spedizioni), JSON.stringify(form?.voci_consegne_doppie),
    JSON.stringify(form?.voci_palmari), JSON.stringify(form?.voci_compensazioni_distribuzione),
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
    onSave({ ...form, mese: nextMese, anno: nextAnno, distrib_inviata: false, pdf_addeb: false, fattura_ricevuta: false, fatt_tu_creata: false, note_varie: "" });
    alert(`Duplicato per ${nextMese} ${nextAnno}`);
  };

  const handleElimina = () => {
    if (!form || !window.confirm("Eliminare definitivamente?")) return;
    onDelete && onDelete(form);
    handleBack();
  };

  const hasSaved = form && conteggi.some(c => c.padroncino_id === form.padroncino_id && c.mese === form.mese && c.anno === form.anno);

  // ─── VISTA LISTA PADRONCINI ──────────────────────────────────────────────────
  if (!selPad) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* KPI Grid */}
        <div style={{ display: "flex", gap: 10 }}>
          <KpiCard label="Fatturato Mese" value={euro(totFatt)} icon={<Icon name="calculator" size={15}/>} sub={`${meseConteggi.length} conteggi`} />
          <KpiCard label="Addebiti" value={euro(totAdd)} icon={<Icon name="file" size={15}/>} sub="totale addebiti" color="#ef4444" />
          <KpiCard label="Da Bonificare" value={euro(totBon)} icon={<Icon name="save" size={15}/>} sub="residuo netto" color="#10b981" />
          <KpiCard label="Completati" value={`${completati}/${meseConteggi.length}`} icon={<Icon name="check" size={15}/>}
            sub={completati === meseConteggi.length && meseConteggi.length > 0 ? "Tutti pronti ✓" : "In lavorazione"} color="#8b5cf6" />
        </div>

        {/* Tabella Principale */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          {/* Header tabella */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#3b82f6" }}><Icon name="calculator" size={15}/></span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Conteggi — {mese} {anno}</span>
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{pAttivi.length} padroncini attivi · {giorni} giorni</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    ["Padroncino", "left", 160],
                    ["Fattura", "right", 100],
                    ["Addebiti", "right", 100],
                    ["Bonifico", "right", 110],
                    ["Stato", "left", 110],
                    ["Distrib.", "center", 60],
                    ["PDF", "center", 50],
                    ["Fatt.", "center", 50],
                    ["TU", "center", 50],
                  ].map(([h, align, w]) => (
                    <th key={h} style={{
                      padding: "9px 10px", textAlign: align, fontSize: 9, fontWeight: 700, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e2e8f0",
                      whiteSpace: "nowrap", width: w, minWidth: w
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pAttivi.map((p, i) => {
                  const c = meseConteggi.find(item => item.padroncino_id === p.id);
                  const isAlt = i % 2 !== 0;
                  const bonif = c?.totale_da_bonificare || 0;
                  return (
                    <tr key={p.id} onClick={() => loadConteggio(p)}
                      style={{ cursor: "pointer", background: isAlt ? "#fafafa" : "#fff", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                      onMouseLeave={e => e.currentTarget.style.background = isAlt ? "#fafafa" : "#fff"}>

                      {/* Nome */}
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{p.nome}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono', monospace" }}>#{p.codice}</div>
                      </td>

                      {/* Fattura */}
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: c ? "#0f172a" : "#cbd5e1" }}>
                          {c ? euro(c.totale_fattura) : "—"}
                        </span>
                      </td>

                      {/* Addebiti */}
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: c ? "#dc2626" : "#cbd5e1" }}>
                          {c ? euro(c.totale_addebiti) : "—"}
                        </span>
                      </td>

                      {/* Bonifico */}
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                        {c ? (
                          <span style={{
                            fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700,
                            color: bonif >= 0 ? "#166534" : "#dc2626",
                            background: bonif >= 0 ? "#f0fdf4" : "#fff1f2",
                            padding: "2px 7px", borderRadius: 5, display: "inline-block"
                          }}>{euro(bonif)}</span>
                        ) : <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                      </td>

                      {/* Stato */}
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>
                        {c
                          ? <Badge label={(c.distrib_inviata && c.pdf_addeb && c.fattura_ricevuta && c.fatt_tu_creata) ? "Completato" : "In corso"} color={(c.distrib_inviata && c.pdf_addeb && c.fattura_ricevuta && c.fatt_tu_creata) ? "success" : "warning"} />
                          : <Badge label="Mancante" color="neutral" />}
                      </td>

                      {/* Flag booleani */}
                      {[c?.distrib_inviata, c?.pdf_addeb, c?.fattura_ricevuta, c?.fatt_tu_creata].map((v, j) => (
                        <td key={j} style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                          <Chk v={v} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer totali */}
          {meseConteggi.length > 0 && (
            <div style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc", padding: "10px 18px", display: "flex", gap: 24, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Totali mese</span>
              <div style={{ display: "flex", gap: 20, marginLeft: "auto" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Fatturato</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 800, color: "#1d4ed8" }}>{euro(totFatt)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Addebiti</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 800, color: "#dc2626" }}>{euro(totAdd)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Da Bonificare</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 800, color: totBon >= 0 ? "#166534" : "#dc2626" }}>{euro(totBon)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══ VISTA DETTAGLIO ══════════════════════════════════════════════════════════
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── HEADER DETTAGLIO ── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "12px 18px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        {/* Sinistra: back + nome */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleBack} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
            background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700, cursor: "pointer"
          }}>
            <Icon name="arrowLeft" size={13}/> Indietro
          </button>
          <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>{selPad.nome}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginTop: 1 }}>
              {mese} {anno}
              <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
              Cod. <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#64748b" }}>{selPad.codice}</span>
              <span style={{ margin: "0 6px", color: "#e2e8f0" }}>·</span>
              {giorni} giorni
            </div>
          </div>
        </div>

        {/* Destra: controlli */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

          {/* Indicatore salvataggio */}
          <div style={{ minWidth: 90, textAlign: "right" }}>
            {saveIndicator === "saving" && (
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Salvataggio...</span>
            )}
            {saveIndicator === "saved" && (
              <span style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>✓ Salvato</span>
            )}
          </div>

          {/* Toggle riepilogo / dettaglio */}
          <div style={{ display: "flex", borderRadius: 9, border: "1px solid #e2e8f0", overflow: "hidden", background: "#f1f5f9", padding: 2, gap: 2 }}>
            {["riepilogo", "dettaglio"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 14px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, borderRadius: 7,
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#2563eb" : "#64748b",
                boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s"
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          <button onClick={handleDuplica} style={{
            padding: "7px 12px", borderRadius: 8, background: "#f0fdf4", color: "#166534",
            border: "1px solid #bbf7d0", fontSize: 11, fontWeight: 700, cursor: "pointer"
          }}>Duplica</button>

          {hasSaved && (
            <button onClick={handleElimina} style={{
              padding: "7px 10px", borderRadius: 8, background: "#fff1f2", color: "#dc2626",
              border: "1px solid #fecdd3", cursor: "pointer", display: "flex", alignItems: "center"
            }}>
              <Icon name="trash" size={13}/>
            </button>
          )}

          {/* Bonifico badge */}
          <div style={{
            background: (form?.totale_da_bonificare || 0) >= 0 ? "#dcfce7" : "#fee2e2",
            borderRadius: 10, padding: "5px 14px",
            border: `1px solid ${(form?.totale_da_bonificare || 0) >= 0 ? "#bbf7d0" : "#fca5a5"}`
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "center", letterSpacing: "0.06em" }}>Bonifico</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: (form?.totale_da_bonificare || 0) >= 0 ? "#166534" : "#dc2626", fontFamily: "'DM Mono', monospace", textAlign: "center" }}>
              {euro(form?.totale_da_bonificare || 0)}
            </div>
          </div>

          <button onClick={() => onSave(form)} style={{
            padding: "9px 18px", borderRadius: 9, background: "#2563eb", color: "#fff",
            border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer"
          }}>Salva</button>
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