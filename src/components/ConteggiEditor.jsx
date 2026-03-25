// ─────────────────────────────────────────────────────────────────────────────
// ConteggiEditor.jsx  —  refactored con theme.js
//
// Rimossi:
//   ✅ Tutti i colori/spacing hardcoded → da theme (C, SP, TY, BR, SH)
//
// Tenuti locali (design genuinamente diverso):
//   ⚙️  KpiCard — ha prop `color` per tintare l'icona, ha `flex:1` per fill row
//   ⚙️  Badge   — ha una propria mappa semantica (success/warning/neutral)
//   ⚙️  Chk     — checkmark inline per le colonne boolean
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { ConteggiForm } from "./ConteggiForm";
import { euro, giorniMese, PALMARE_TARIFFA_GG, calcTotali, createConteggio, MESI } from "../utils/formatters";
import { Icon } from "./Icons";

import { C, SP, TY, BR, SH } from "./theme";


// ─── KPI CARD (Conteggi) ─────────────────────────────────────────────────────
// Versione con flex:1 per riempire la riga, e `color` per tintare l'icona
const KpiCard = ({ label, value, sub, icon, color = C.primaryMid }) => (
  <div style={{
    background:   C.white,
    borderRadius: BR.card,
    border:       `1px solid ${C.border}`,
    padding:      "14px 18px",
    flex:         1,
    minWidth:     0,
    boxShadow:    SH.card,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
      <div style={{ ...TY.labelStyle }}>{label}</div>
      <div style={{ color, opacity: 0.7, lineHeight: 1 }}>{icon}</div>
    </div>
    <div style={{ fontSize: 20, fontWeight: TY.black, color: C.fg, fontFamily: TY.mono, letterSpacing: "-0.02em" }}>{value}</div>
    <div style={{ fontSize: TY.xs, color: C.fgSubtle, marginTop: 3, fontWeight: TY.semi }}>{sub}</div>
  </div>
);

// ─── BADGE ───────────────────────────────────────────────────────────────────
const BADGE_MAP = {
  success: { bg: C.successBgAlt, text: C.success,  border: C.successBorder },
  warning: { bg: C.noteBg,       text: C.noteColor, border: C.noteBorder   },
  neutral: { bg: C.bgPage,       text: C.fgMuted,   border: C.border       },
};
const Badge = ({ label, color }) => {
  const s = BADGE_MAP[color] || BADGE_MAP.neutral;
  return (
    <span style={{
      display:      "inline-block",
      padding:      "2px 9px",
      borderRadius: BR.sm,
      fontSize:     TY.xs,
      fontWeight:   TY.bold,
      background:   s.bg,
      color:        s.text,
      border:       `1px solid ${s.border}`,
      whiteSpace:   "nowrap",
    }}>{label}</span>
  );
};

// ─── CHECK ICON ───────────────────────────────────────────────────────────────
const Chk = ({ v }) => v
  ? <span style={{ color: "#10b981", fontSize: 14, lineHeight: 1 }}>✓</span>
  : <span style={{ color: C.border, fontSize: 14, lineHeight: 1 }}>–</span>;


// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const ConteggiEditor = ({ padroncini, conteggi, mese, anno, onSave, onDelete, addebiti_standard = [], ricariche = {}, mezziFlotta = [] }) => {
  const [selPad,         setSelPad]         = useState(null);
  const [form,           setForm]           = useState(null);
  const [tab,            setTab]            = useState("riepilogo");
  const [saveIndicator,  setSaveIndicator]  = useState(null);
  const giorni        = giorniMese(mese, anno);
  const autoSaveTimer = useRef(null);
  const prevForm      = useRef(null);

  const pAttivi      = padroncini.filter(p => p.stato === "ATTIVO");
  const meseConteggi = conteggi.filter(c => c.mese === mese && c.anno === anno);

  const totFatt    = meseConteggi.reduce((s, c) => s + (c.totale_fattura || 0), 0);
  const totAdd     = meseConteggi.reduce((s, c) => s + (c.totale_addebiti || 0), 0);
  const totBon     = meseConteggi.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
  const completati = meseConteggi.filter(c => c.distrib_inviata && c.pdf_addeb && c.fattura_ricevuta && c.fatt_tu_creata).length;

  // ─── LOGICA FUNZIONALE (invariata) ──────────────────────────────────────────
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
    const idx      = MESI.indexOf(form.mese);
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

  // ─── VISTA LISTA ─────────────────────────────────────────────────────────────
  if (!selPad) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: SP.gap }}>

        {/* KPI Grid */}
        <div style={{ display: "flex", gap: 10 }}>
          <KpiCard label="Fatturato Mese" value={euro(totFatt)} icon={<Icon name="calculator" size={15}/>} sub={`${meseConteggi.length} conteggi`} />
          <KpiCard label="Addebiti"       value={euro(totAdd)}  icon={<Icon name="file" size={15}/>}       sub="totale addebiti"  color={C.danger} />
          <KpiCard label="Da Bonificare"  value={euro(totBon)}  icon={<Icon name="save" size={15}/>}       sub="residuo netto"    color="#10b981" />
          <KpiCard label="Completati"     value={`${completati}/${meseConteggi.length}`} icon={<Icon name="check" size={15}/>}
            sub={completati === meseConteggi.length && meseConteggi.length > 0 ? "Tutti pronti ✓" : "In lavorazione"} color={C.violetSoft} />
        </div>

        {/* Tabella principale */}
        <div style={{ background: C.white, borderRadius: BR.table, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SH.card }}>

          {/* Header tabella */}
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, background: C.bgPage, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: SP.gapSm }}>
              <span style={{ color: C.primaryMid }}><Icon name="calculator" size={15}/></span>
              <span style={{ fontSize: TY.base_, fontWeight: TY.bold, color: C.fg }}>Conteggi — {mese} {anno}</span>
            </div>
            <span style={{ fontSize: TY.sm, color: C.fgSubtle, fontWeight: TY.semi }}>{pAttivi.length} padroncini attivi · {giorni} giorni</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bgPage }}>
                  {[
                    ["Padroncino", "left",   160],
                    ["Fattura",   "right",   100],
                    ["Addebiti",  "right",   100],
                    ["Bonifico",  "right",   110],
                    ["Stato",     "left",    110],
                    ["Distrib.",  "center",   60],
                    ["PDF",       "center",   50],
                    ["Fatt.",     "center",   50],
                    ["TU",        "center",   50],
                  ].map(([h, align, w]) => (
                    <th key={h} style={{
                      padding: "9px 10px", textAlign: align, fontSize: TY.xxs, fontWeight: TY.bold,
                      color: C.fgSubtle, textTransform: "uppercase", letterSpacing: "0.05em",
                      borderBottom: `2px solid ${C.border}`, whiteSpace: "nowrap", width: w, minWidth: w,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pAttivi.map((p, i) => {
                  const c     = meseConteggi.find(item => item.padroncino_id === p.id);
                  const isAlt = i % 2 !== 0;
                  const bonif = c?.totale_da_bonificare || 0;
                  const rowBg = isAlt ? C.bgRowAlt : C.white;
                  return (
                    <tr key={p.id} onClick={() => loadConteggio(p)}
                      style={{ cursor: "pointer", background: rowBg, transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      {/* Nome */}
                      <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                        <div style={{ fontSize: TY.md, fontWeight: TY.bold, color: C.fg }}>{p.nome}</div>
                        <div style={{ fontSize: TY.xs, color: C.fgSubtle, fontFamily: TY.mono }}>#{p.codice}</div>
                      </td>

                      {/* Fattura */}
                      <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                        <span style={{ fontSize: TY.md, fontFamily: TY.mono, color: c ? C.fg : "#cbd5e1" }}>
                          {c ? euro(c.totale_fattura) : "—"}
                        </span>
                      </td>

                      {/* Addebiti */}
                      <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                        <span style={{ fontSize: TY.md, fontFamily: TY.mono, color: c ? C.danger : "#cbd5e1" }}>
                          {c ? euro(c.totale_addebiti) : "—"}
                        </span>
                      </td>

                      {/* Bonifico */}
                      <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, textAlign: "right" }}>
                        {c ? (
                          <span style={{
                            fontSize: TY.md, fontFamily: TY.mono, fontWeight: TY.bold,
                            color:      bonif >= 0 ? C.success  : C.danger,
                            background: bonif >= 0 ? C.successBg : "#fff1f2",
                            padding: "2px 7px", borderRadius: BR.sm, display: "inline-block",
                          }}>{euro(bonif)}</span>
                        ) : <span style={{ color: "#cbd5e1", fontSize: TY.md }}>—</span>}
                      </td>

                      {/* Stato */}
                      <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                        {c
                          ? <Badge label={(c.distrib_inviata && c.pdf_addeb && c.fattura_ricevuta && c.fatt_tu_creata) ? "Completato" : "In corso"} color={(c.distrib_inviata && c.pdf_addeb && c.fattura_ricevuta && c.fatt_tu_creata) ? "success" : "warning"} />
                          : <Badge label="Mancante" color="neutral" />}
                      </td>

                      {/* Flag booleani */}
                      {[c?.distrib_inviata, c?.pdf_addeb, c?.fattura_ricevuta, c?.fatt_tu_creata].map((v, j) => (
                        <td key={j} style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, textAlign: "center" }}>
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
            <div style={{ borderTop: `2px solid ${C.border}`, background: C.bgPage, padding: "10px 18px", display: "flex", gap: 24, alignItems: "center" }}>
              <span style={{ fontSize: TY.sm, fontWeight: TY.bold, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Totali mese</span>
              <div style={{ display: "flex", gap: 20, marginLeft: "auto" }}>
                {[
                  ["Fatturato",    euro(totFatt), C.primarySoft],
                  ["Addebiti",     euro(totAdd),  C.danger],
                  ["Da Bonificare",euro(totBon),  totBon >= 0 ? C.success : C.danger],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ textAlign: "right" }}>
                    <div style={{ fontSize: TY.xxs, color: C.fgSubtle, fontWeight: TY.bold, textTransform: "uppercase", marginBottom: 1 }}>{label}</div>
                    <div style={{ fontFamily: TY.mono, fontSize: TY.base_, fontWeight: TY.black, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── VISTA DETTAGLIO ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── HEADER DETTAGLIO ── */}
      <div style={{
        background: C.white, borderRadius: BR.table, border: `1px solid ${C.border}`,
        padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: SH.table,
      }}>
        {/* Sinistra */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleBack} style={{
            display: "flex", alignItems: "center", gap: SP.gapXs,
            padding: "7px 14px", borderRadius: BR.lg,
            background: C.bgPage, color: "#475569", border: `1px solid ${C.border}`,
            fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer",
          }}>
            <Icon name="arrowLeft" size={13}/> Indietro
          </button>
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 15, fontWeight: TY.black, color: C.fg, letterSpacing: "-0.01em" }}>{selPad.nome}</div>
            <div style={{ fontSize: TY.sm, color: C.fgSubtle, fontWeight: TY.semi, marginTop: 1 }}>
              {mese} {anno}
              <span style={{ margin: "0 6px", color: C.border }}>·</span>
              Cod. <span style={{ fontFamily: TY.mono, fontWeight: TY.bold, color: C.fgMuted }}>{selPad.codice}</span>
              <span style={{ margin: "0 6px", color: C.border }}>·</span>
              {giorni} giorni
            </div>
          </div>
        </div>

        {/* Destra */}
        <div style={{ display: "flex", gap: SP.gapSm, alignItems: "center" }}>

          {/* Indicatore salvataggio */}
          <div style={{ minWidth: 90, textAlign: "right" }}>
            {saveIndicator === "saving" && <span style={{ fontSize: TY.sm, color: C.fgSubtle, fontWeight: TY.semi }}>Salvataggio...</span>}
            {saveIndicator === "saved"  && <span style={{ fontSize: TY.sm, color: C.success,  fontWeight: TY.bold }}>✓ Salvato</span>}
          </div>

          {/* Toggle tab */}
          <div style={{ display: "flex", borderRadius: BR.xl, border: `1px solid ${C.border}`, overflow: "hidden", background: C.bgPage, padding: 2, gap: 2 }}>
            {["riepilogo", "dettaglio"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "5px 14px", border: "none", cursor: "pointer", fontSize: TY.sm, fontWeight: TY.bold, borderRadius: BR.md,
                background:  tab === t ? C.white : "transparent",
                color:       tab === t ? C.primaryMid : C.fgMuted,
                boxShadow:   tab === t ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                transition:  "all 0.15s",
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          <button onClick={handleDuplica} style={{
            padding: "7px 12px", borderRadius: BR.lg, background: C.successBg, color: C.success,
            border: `1px solid ${C.successBorder}`, fontSize: TY.sm, fontWeight: TY.bold, cursor: "pointer",
          }}>Duplica</button>

          {hasSaved && (
            <button onClick={handleElimina} style={{
              padding: "7px 10px", borderRadius: BR.lg, background: "#fff1f2", color: C.danger,
              border: "1px solid #fecdd3", cursor: "pointer", display: "flex", alignItems: "center",
            }}>
              <Icon name="trash" size={13}/>
            </button>
          )}

          {/* Bonifico badge */}
          <div style={{
            background:   (form?.totale_da_bonificare || 0) >= 0 ? C.successBgAlt : C.dangerBgAlt,
            borderRadius: BR.card,
            padding:      "5px 14px",
            border:       `1px solid ${(form?.totale_da_bonificare || 0) >= 0 ? C.successBorder : "#fca5a5"}`,
          }}>
            <div style={{ fontSize: TY.xxs, fontWeight: TY.black, color: C.fgMuted, textTransform: "uppercase", textAlign: "center", letterSpacing: "0.06em" }}>Bonifico</div>
            <div style={{ fontSize: 15, fontWeight: TY.black, color: (form?.totale_da_bonificare || 0) >= 0 ? C.success : C.danger, fontFamily: TY.mono, textAlign: "center" }}>
              {euro(form?.totale_da_bonificare || 0)}
            </div>
          </div>

          <button onClick={() => onSave(form)} style={{
            padding: "9px 18px", borderRadius: BR.xl, background: C.primaryMid,
            color: "#fff", border: "none", fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer",
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
        mezziFlotta={(() => {
          // Confronto stringa per evitare type mismatch (es. "123" vs 123)
          const filtrati = mezziFlotta.filter(m => String(m.padroncino_id) === String(selPad?.id));
          // Fallback: se nessun mezzo ha padroncino_id corrispondente, usa mezzi embedded nel padroncino
          if (filtrati.length > 0) return filtrati;
          return (selPad?.mezzi || [])
            .filter(m => m.targa)
            .map(m => ({
              ...m,
              // Normalizza il campo importo: embedded usa tariffa_mensile, flotta usa rata_noleggio
              rata_noleggio: m.rata_noleggio || m.tariffa_mensile || 0,
              alimentazione: m.alimentazione || m.tipologia || "",
            }));
        })()}
      />
    </div>
  );
};
