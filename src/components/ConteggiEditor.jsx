import { useState, useEffect, useRef } from "react";
import { ConteggiForm } from "./ConteggiForm";
import { euro, giorniMese, PALMARE_TARIFFA_GG, calcTotali, createConteggio, MESI } from "../utils/formatters";
import { Icon } from "./Icons";

export const ConteggiEditor = ({ padroncini, conteggi, mese, anno, onSave, onDelete, addebiti_standard = [], ricariche = {}, mezziFlotta = [] }) => {
  const [selPad, setSelPad] = useState(null);
  const [form, setForm] = useState(null);
  const [saveIndicator, setSaveIndicator] = useState(null);
  const giorni = giorniMese(mese, anno);
  const autoSaveTimer = useRef(null);
  const prevForm = useRef(null);

  const loadConteggio = (p) => {
    setSelPad(p);
    const existing = conteggi.find(c => c.padroncino_id === p.id && c.mese === mese && c.anno === anno);
    setForm(existing ? { ...existing } : createConteggio(p, mese, anno));
  };

  useEffect(() => {
    if (selPad) loadConteggio(selPad);
  }, [mese, anno]);

  // Auto-calc palmari
  useEffect(() => {
    if (!form) return;
    const cost = parseFloat(((form.n_palmari || 0) * PALMARE_TARIFFA_GG * giorni).toFixed(2));
    setForm(f => ({ ...f, addebiti_palmari: cost }));
  }, [form?.n_palmari, giorni]);

  // Auto-calc totali
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
    JSON.stringify(form?.fatture_fine_mese), JSON.stringify(form?.cassa_prima_nota),
    form?.acconto_fattura,
  ]);

  // Auto-save debounced
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

  // ── DUPLICA CONTEGGIO ────────────────────────────────────────────────────────
  const handleDuplica = () => {
    if (!form) return;
    // Calcola mese successivo
    const idx = MESI.indexOf(form.mese);
    const nextMese = MESI[(idx + 1) % 12];
    const nextAnno = idx === 11 ? form.anno + 1 : form.anno;

    const exists = conteggi.find(c => c.padroncino_id === form.padroncino_id && c.mese === nextMese && c.anno === nextAnno);
    if (exists) {
      if (!window.confirm(`Esiste già un conteggio per ${nextMese} ${nextAnno}. Sovrascrivere?`)) return;
    }

    const dupl = {
      ...form,
      mese: nextMese,
      anno: nextAnno,
      // Reset flag workflow
      distrib_inviata: false, pdf_addeb: false, fattura_ricevuta: false,
      fatt_tu_creata: false, unione_pdf: false, caricata_scadenziario: false,
      note_varie: "",
    };
    onSave(dupl);
    alert(`Conteggio duplicato per ${nextMese} ${nextAnno}!`);
  };

  // ── ELIMINA CONTEGGIO ────────────────────────────────────────────────────────
  const handleElimina = () => {
    if (!form || !selPad) return;
    if (!window.confirm(`Eliminare definitivamente il conteggio di ${selPad.nome} per ${mese} ${anno}?`)) return;
    onDelete && onDelete(form);
    setForm(null);
    setSelPad(null);
  };

  const hasSavedConteggio = form && conteggi.some(c =>
    c.padroncino_id === form.padroncino_id && c.mese === form.mese && c.anno === form.anno
  );

  return (
    <div style={{ display: "flex", gap: 16, height: "100%" }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
          Padroncini Attivi
        </div>
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
          {padroncini.filter(p => p.stato === "ATTIVO").map(p => {
            const c = conteggi.find(x => x.padroncino_id === p.id && x.mese === mese && x.anno === anno);
            const done = c ? [c.distrib_inviata, c.pdf_addeb, c.fattura_ricevuta, c.fatt_tu_creata].filter(Boolean).length : 0;
            const isSelected = selPad?.id === p.id;
            return (
              <div key={p.id} onClick={() => loadConteggio(p)}
                style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f8fafc", background: isSelected ? "#eff6ff" : "#fff", borderLeft: isSelected ? "3px solid #3b82f6" : "3px solid transparent" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#1d4ed8" : "#374151", lineHeight: 1.3 }}>{p.nome}</div>
                {c && (
                  <div style={{ fontSize: 11, color: "#10b981", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
                    {euro(c.totale_da_bonificare)}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 3, background: "#f1f5f9", borderRadius: 2 }}>
                    <div style={{ width: `${(done / 4) * 100}%`, height: "100%", borderRadius: 2, background: done === 4 ? "#10b981" : "#3b82f6" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{done}/4</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      {!form ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", color: "#94a3b8", fontSize: 14 }}>
          ← Seleziona un padroncino per inserire i dati
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
          {/* Header */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{selPad.nome}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Conteggio {mese} {anno} · Cod. {selPad.codice} · {giorni} giorni solari</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {saveIndicator === "saving" && (
                <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 12, height: 12, border: "2px solid #e2e8f0", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                  Salvataggio...
                </div>
              )}
              {saveIndicator === "saved" && (
                <div style={{ fontSize: 12, color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>✓ Salvato</div>
              )}

              {/* Duplica */}
              <button onClick={handleDuplica} title="Duplica nel mese successivo"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, background: "#f0fdf4", color: "#166534", border: "1px solid #86efac", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Duplica →
              </button>

              {/* Elimina */}
              {hasSavedConteggio && (
                <button onClick={handleElimina} title="Elimina questo conteggio"
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <Icon name="trash" size={13} />
                  Elimina
                </button>
              )}

              {/* Totale da bonificare */}
              <div style={{ background: form.totale_da_bonificare >= 0 ? "#f0fdf4" : "#fff1f2", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Da Bonificare</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: form.totale_da_bonificare >= 0 ? "#166534" : "#dc2626", fontFamily: "'DM Mono',monospace" }}>
                  {euro(form.totale_da_bonificare)}
                </div>
              </div>

              {/* Salva manuale */}
              <button onClick={() => onSave(form)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 9, background: "#1e40af", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <Icon name="save" size={14} /> Salva
              </button>
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
            addebiti_standard={addebiti_standard}
            ricaricheMese={ricariche[`${mese}_${anno}`] || {}}
            mezziFlotta={mezziFlotta.filter(m => m.padroncino_id === selPad?.id)}
          />
        </div>
      )}
    </div>
  );
};
