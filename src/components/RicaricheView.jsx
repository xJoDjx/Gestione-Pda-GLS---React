import { useState, useRef } from "react";
import { euro, MESI } from "../utils/formatters";
import { Icon } from "./Icons";
import { SectionCard } from "./BaseComponents";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const isJuice = (stazione) => {
  const s = (stazione || "").toLowerCase();
  return s.includes("juice box") || s.includes("juice pole") || s.includes("juicebox") || s.includes("juicepole");
};

const parseRicaricheCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return null;
  const sep = lines[0].includes(";") ? ";" : ",";
  const rows = lines.map(l => {
    const r = []; let cur = "", inQ = false;
    for (let ch of l) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { r.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    r.push(cur.trim()); return r;
  });
  const header = rows[0].map(h => h.toLowerCase());
  const findCol = (...terms) => { const i = header.findIndex(h => terms.some(t => h.includes(t))); return i >= 0 ? i : -1; };
  const tc = findCol("targa","vehicle","plate") >= 0 ? findCol("targa","vehicle","plate") : 2;
  const hc = findCol("stazione","serial number","nome della stazione") >= 0 ? findCol("stazione","serial number","nome della stazione") : 7;
  const kc = findCol("energia","kwh","energy") >= 0 ? findCol("energia","kwh","energy") : 10;

  const per_targa = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= Math.max(tc, hc, kc)) continue;
    const targa = (row[tc] || "").trim().toUpperCase();
    const stazione = (row[hc] || "").trim();
    const kwh = parseFloat((row[kc] || "0").replace(",", ".")) || 0;
    if (!targa || targa === "-") continue;
    if (!per_targa[targa]) per_targa[targa] = { interne: 0, esterne: 0, sessioni_int: 0, sessioni_ext: 0 };
    if (isJuice(stazione)) { per_targa[targa].interne += kwh; per_targa[targa].sessioni_int++; }
    else { per_targa[targa].esterne += kwh; per_targa[targa].sessioni_ext++; }
  }
  Object.values(per_targa).forEach(v => { v.interne = parseFloat(v.interne.toFixed(3)); v.esterne = parseFloat(v.esterne.toFixed(3)); });
  return per_targa;
};

const FieldBlock = ({ label, children, accent = "#3b82f6" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
    {children}
  </div>
);

const monoInput = (accent = "#e2e8f0", extra = {}) => ({
  padding: "9px 12px", borderRadius: 8, border: `1px solid ${accent}`,
  fontSize: 15, fontFamily: "'DM Mono', monospace", fontWeight: 700,
  background: "#fff", outline: "none", width: "100%", boxSizing: "border-box", ...extra
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const RicaricheView = ({ ricariche, onSave, mezzi, padroncini = [], mese, anno, onSaveMezzo }) => {
  const [selMese, setSelMese] = useState(mese);
  const [selAnno, setSelAnno] = useState(anno);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef();

  const key = `${selMese}_${selAnno}`;
  const meseData = ricariche[key] || { bolletta: 0, costo_esterno: 0, kwh_per_targa: {}, note: "" };
  const setMeseData = (patch) => onSave(key, { ...meseData, ...patch });

  const totKwhInterni = Object.values(meseData.kwh_per_targa || {}).reduce((s, v) => s + (v.interne || 0), 0);
  const totKwhEsterni = Object.values(meseData.kwh_per_targa || {}).reduce((s, v) => s + (v.esterne || 0), 0);
  const kwhFatturatiBolletta = meseData.kwh_fatturati_bolletta || totKwhInterni;
  const costoKwhInterno = kwhFatturatiBolletta > 0 ? (meseData.bolletta || 0) / kwhFatturatiBolletta : 0;
  const costoEsterno = meseData.costo_esterno || 0;
  const totCostoEsterni = parseFloat((totKwhEsterni * costoEsterno).toFixed(2));
  const maggiPct = meseData.maggiorazione_pct ?? 20;
  // totAddebiti: somma dei singoli addebiti per targa (rispetta la % per-mezzo)
  const totAddebiti = parseFloat(
    Object.entries(meseData.kwh_per_targa || {}).reduce((sum, [targa, vals]) => {
      const mz = (mezzi || []).find(m => (m.targa || "").toUpperCase() === targa);
      const isAz = mz?.categoria === "AUTO AZIENDALE";
      const pctMz = mz?.maggiorazione_ricarica_pct;
      const pct = pctMz != null ? pctMz : (isAz ? 0 : maggiPct);
      const d = meseData.kwh_per_targa?.[targa] || {};
      const int_ = d.interne || 0, ext_ = d.esterne || 0;
      const costoKwh = kwhFatturatiBolletta > 0 ? (meseData.bolletta || 0) / kwhFatturatiBolletta : 0;
      const costoInt = int_ * costoKwh;
      const costoExt = ext_ * (meseData.costo_esterno || 0);
      const totaleRiga = costoInt + costoExt;
      return sum + (pct > 0 ? totaleRiga * (1 + pct / 100) : totaleRiga);
    }, 0).toFixed(2)
  );
  const numTarghe = Object.keys(meseData.kwh_per_targa || {}).length;
  const meseKeys = Object.keys(ricariche).sort().reverse().slice(0, 24);

  const getRicaricaTarga = (targa) => {
    const d = meseData.kwh_per_targa?.[targa.toUpperCase()] || {};
    const int = d.interne || 0, ext = d.esterne || 0;
    const costoInt = parseFloat((int * costoKwhInterno).toFixed(2));
    const costoExt = parseFloat((ext * costoEsterno).toFixed(2));
    return { int, ext, costoInt, costoExt, totale: parseFloat((costoInt + costoExt).toFixed(2)) };
  };

  const handleFile = (file) => {
    if (!file) return;
    setImporting(true); setImportMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseRicaricheCSV(e.target.result);
        if (!parsed || !Object.keys(parsed).length) {
          setImportMsg({ type: "error", text: "Nessun dato trovato. Verifica il file CSV." });
        } else {
          const existing = { ...(meseData.kwh_per_targa || {}) };
          Object.entries(parsed).forEach(([t, v]) => {
            // Snapshot del padroncino_id attuale per questo mese
            const mezzoAttuale = (mezzi || []).find(m => (m.targa || "").toUpperCase() === t);
            const padIdSnapshot = mezzoAttuale?.padroncino_id || "";
            existing[t] = { ...v, padroncino_id_snapshot: padIdSnapshot };
          });
          setMeseData({ kwh_per_targa: existing });
          setImportMsg({ type: "success", text: `Importate ricariche per ${Object.keys(parsed).length} targhe.` });
        }
      } catch (err) { setImportMsg({ type: "error", text: "Errore: " + err.message }); }
      finally { setImporting(false); }
    };
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file, 'utf-8');
    else { setImportMsg({ type: "warn", text: "File XLS: apri in Excel → Salva come → CSV → importa il CSV." }); setImporting(false); }
  };

  const KpiCard = ({ label, value, sub, accent, icon }) => (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{icon} {label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: accent || "#0f172a" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KpiCard icon="💡" label="Bolletta Interna" value={euro(meseData.bolletta || 0)}
          sub={kwhFatturatiBolletta > 0 ? `${kwhFatturatiBolletta.toFixed(3)} kWh · ${costoKwhInterno.toFixed(4)} €/kWh` : "imposta il costo"} accent="#1d4ed8" />
        <KpiCard icon="🔌" label="Ricariche Esterne" value={euro(totCostoEsterni)}
          sub={`${totKwhEsterni.toFixed(3)} kWh${costoEsterno > 0 ? ` · ${costoEsterno.toFixed(4)} €/kWh` : " · imposta il costo"}`} accent="#92400e" />
        <KpiCard icon="📈" label="Totale Addebitato" value={euro(totAddebiti)}
          sub={`${numTarghe} targhe · % per mezzo`} accent="#6d28d9" />
        <KpiCard icon="⚡" label="kWh Totali" value={`${(totKwhInterni + totKwhEsterni).toFixed(2)} kWh`}
          sub={`Int: ${totKwhInterni.toFixed(3)} · Ext: ${totKwhEsterni.toFixed(3)}`} accent="#0f172a" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "start" }}>

        {/* Colonna sinistra */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <SectionCard title={`Periodo — ${selMese} ${selAnno}`} icon="calendar" accent="#1d4ed8">
            <div style={{ display: "flex", gap: 8 }}>
              <select value={selMese} onChange={e => setSelMese(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer", outline: "none" }}>
                {MESI.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={selAnno} onChange={e => setSelAnno(parseInt(e.target.value) || new Date().getFullYear())}
                style={{ width: 84, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer", outline: "none" }}>
                {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {meseKeys.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Mesi Registrati</div>
                {meseKeys.map(k => {
                  const [m, a] = k.split("_"); const d = ricariche[k]; const isActive = k === key;
                  return (
                    <div key={k} onClick={() => { setSelMese(m); setSelAnno(parseInt(a)); }}
                      style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${isActive ? "#bfdbfe" : "#e2e8f0"}`, background: isActive ? "#eff6ff" : "#fafafa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#1d4ed8" : "#374151" }}>{m} {a}</span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#1d4ed8" }}>{euro(d.bolletta || 0)}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{Object.keys(d.kwh_per_targa || {}).length} targhe</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Costi Mensili" icon="euro" accent="#1d4ed8">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              <FieldBlock label="💡 Bolletta Interna (€)" accent="#1d4ed8">
                <input type="number" step="0.01" value={meseData.bolletta || ""} placeholder="es. 1850.00"
                  onChange={e => setMeseData({ bolletta: parseFloat(e.target.value) || 0 })}
                  style={monoInput("#bfdbfe")} />
              </FieldBlock>

              <FieldBlock label="⚡ kWh Fatturati in Bolletta" accent="#1d4ed8">
                <input type="number" step="0.001" value={meseData.kwh_fatturati_bolletta || ""}
                  placeholder={totKwhInterni > 0 ? `Auto CSV: ${totKwhInterni.toFixed(3)} kWh` : "es. 2500.000"}
                  onChange={e => setMeseData({ kwh_fatturati_bolletta: parseFloat(e.target.value) || 0 })}
                  style={monoInput("#bfdbfe", { color: "#1d4ed8" })} />
                {costoKwhInterno > 0 && (
                  <div style={{ fontSize: 11, color: "#1d4ed8", padding: "5px 8px", background: "#eff6ff", borderRadius: 6 }}>
                    {euro(meseData.bolletta || 0)} ÷ {kwhFatturatiBolletta.toFixed(3)} kWh = <strong>{costoKwhInterno.toFixed(4)} €/kWh</strong>
                  </div>
                )}
              </FieldBlock>

              <FieldBlock label="🔌 Costo Ricariche Esterne (€/kWh)" accent="#92400e">
                <input type="number" step="0.0001" value={meseData.costo_esterno || ""} placeholder="es. 0.4500"
                  onChange={e => setMeseData({ costo_esterno: parseFloat(e.target.value) || 0 })}
                  style={monoInput("#fde68a", { color: "#92400e" })} />
                {costoEsterno > 0 && totKwhEsterni > 0 && (
                  <div style={{ fontSize: 11, color: "#92400e", padding: "5px 8px", background: "#fffbeb", borderRadius: 6 }}>
                    {totKwhEsterni.toFixed(3)} kWh × €{costoEsterno.toFixed(4)} = <strong>{euro(totCostoEsterni)}</strong>
                  </div>
                )}
              </FieldBlock>

              <FieldBlock label="📈 Maggiorazione Addebito ai PdA (%)" accent="#6d28d9">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="number" step="1" min="0" max="100" value={meseData.maggiorazione_pct ?? 20}
                    onChange={e => setMeseData({ maggiorazione_pct: parseFloat(e.target.value) || 0 })}
                    style={monoInput("#c4b5fd", { width: 80, textAlign: "center", color: "#6d28d9" })} />
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>%</span>
                  <span style={{ fontSize: 11, color: "#6d28d9" }}>× {(1 + (meseData.maggiorazione_pct ?? 20) / 100).toFixed(2)} = addebito</span>
                </div>
              </FieldBlock>

              <FieldBlock label="Note" accent="#64748b">
                <textarea value={meseData.note || ""} onChange={e => setMeseData({ note: e.target.value })}
                  placeholder="Numero fattura, fornitore, annotazioni..."
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, resize: "vertical", minHeight: 56, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />
              </FieldBlock>
            </div>
          </SectionCard>

          <SectionCard title="Importa Report CSV" icon="upload" accent="#059669">
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, marginBottom: 8 }}>
              Carica il file CSV esportato dalla piattaforma di ricarica.
              Ricariche <strong>Juice Box/Pole</strong> = interne, le altre = esterne.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: importing ? "#f1f5f9" : "#ecfdf5", border: "1px solid #86efac", color: "#166534", fontSize: 12, fontWeight: 700, cursor: importing ? "not-allowed" : "pointer" }}>
                <Icon name="upload" size={13} /> {importing ? "Importando..." : "Carica CSV"}
              </button>
              {numTarghe > 0 && (
                <button onClick={() => { if (window.confirm("Cancellare tutti i dati kWh di questo mese?")) setMeseData({ kwh_per_targa: {} }); }}
                  style={{ padding: "8px 12px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Cancella kWh
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: "none" }}
              onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }} />
            {importMsg && (
              <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: importMsg.type === "success" ? "#dcfce7" : importMsg.type === "warn" ? "#fffbeb" : "#fee2e2",
                color: importMsg.type === "success" ? "#166534" : importMsg.type === "warn" ? "#92400e" : "#dc2626" }}>
                {importMsg.type === "success" ? "✅" : importMsg.type === "warn" ? "⚠️" : "❌"} {importMsg.text}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Colonna destra — tabella targhe */}
        <div>
          {numTarghe === 0 ? (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #e2e8f0", padding: 40, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Nessun dato kWh per {selMese} {selAnno}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Importa un file CSV per visualizzare le ricariche per targa</div>
            </div>
          ) : (
            <SectionCard title={`Ricariche per Targa — ${selMese} ${selAnno} · ${numTarghe} targhe`} icon="truck" accent="#0f172a">
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 130px 60px 80px 80px 80px 80px 80px 95px", gap: 6, fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", paddingBottom: 8, borderBottom: "2px solid #f1f5f9", minWidth: 800 }}>
                  <span>Targa</span><span>Assegnato A</span><span>Cat.</span>
                  <span style={{textAlign:"right"}}>⚡Int kWh</span><span style={{textAlign:"right"}}>🔌Ext kWh</span>
                  <span style={{textAlign:"right"}}>Costo Int.</span><span style={{textAlign:"right"}}>Costo Ext.</span>
                  <span style={{textAlign:"right"}}>Totale</span><span style={{textAlign:"right",color:"#6d28d9"}}>Addebito</span>
                </div>
                {Object.entries(meseData.kwh_per_targa || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([targa, vals], ri) => {
                  const r = getRicaricaTarga(targa);
                  const mezzoFlotta = (mezzi || []).find(m => (m.targa || "").toUpperCase() === targa);
                  // Usa il padroncino_id salvato al momento dell'importazione (storico corretto)
                  const padIdStorico = vals.padroncino_id_snapshot || mezzoFlotta?.padroncino_id || "";
                  const pad = (padroncini || []).find(p => p.id === padIdStorico) || null;
                  const isMezzoElettr = mezzoFlotta && (mezzoFlotta.alimentazione || "").toLowerCase().includes("elettr");
                  const isAutoAz = mezzoFlotta?.categoria === "AUTO AZIENDALE";
                  // Maggiorazione: per-mezzo > globale (solo distribuzione per default)
                  const pctMezzo = mezzoFlotta?.maggiorazione_ricarica_pct;
                  const pctEffettiva = pctMezzo != null ? pctMezzo : (isAutoAz ? 0 : maggiPct);
                  const addebito = parseFloat((r.totale * (1 + pctEffettiva / 100)).toFixed(2));
                  const hasMagg = pctEffettiva > 0;
                  return (
                    <div key={targa} style={{ display: "grid", gridTemplateColumns: "120px 130px 60px 80px 80px 80px 80px 80px 95px", gap: 6, alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f8fafc", background: ri % 2 === 0 ? "#fff" : "#fafafa", minWidth: 800 }}>
                      <div>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 12 }}>{targa}</span>
                        {isMezzoElettr && <div style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>⚡ flotta</div>}
                      </div>
                      <div style={{ fontSize: 11 }}>
                        {isAutoAz
                          ? (mezzoFlotta?.autista
                              ? <span style={{ fontWeight: 600, color: "#6d28d9" }}>🚗 {mezzoFlotta.autista}</span>
                              : <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 10 }}>—</span>)
                          : (pad
                              ? <span style={{ fontWeight: 600, color: "#1d4ed8" }}>{pad.nome}</span>
                              : <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 10 }}>—</span>)
                        }
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, fontWeight: 700, background: isAutoAz ? "#f3e8ff" : "#dbeafe", color: isAutoAz ? "#6d28d9" : "#1d4ed8" }}>
                          {isAutoAz ? "🚗" : "🚛"}
                        </span>
                        {mezzoFlotta && onSaveMezzo ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <input type="number" min="0" max="200" step="1"
                              value={pctMezzo ?? ""}
                              placeholder={isAutoAz ? "—" : String(maggiPct)}
                              onChange={e => {
                                const val = e.target.value === "" ? null : parseFloat(e.target.value) || 0;
                                onSaveMezzo({ ...mezzoFlotta, maggiorazione_ricarica_pct: val });
                              }}
                              style={{ width: 38, padding: "2px 4px", borderRadius: 5, border: "1px solid #c4b5fd", fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#6d28d9", textAlign: "center", background: "#faf5ff", outline: "none" }} />
                            <span style={{ fontSize: 9, color: "#6d28d9" }}>%</span>
                          </div>
                        ) : (
                          pctMezzo != null && <div style={{ fontSize: 9, color: "#6d28d9", fontWeight: 700 }}>{pctMezzo}%</div>
                        )}
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, textAlign: "right" }}>
                        {r.int.toFixed(3)}<div style={{ fontSize: 9, color: "#94a3b8" }}>{vals.sessioni_int || 0} sess.</div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, textAlign: "right" }}>
                        {r.ext.toFixed(3)}<div style={{ fontSize: 9, color: "#94a3b8" }}>{vals.sessioni_ext || 0} sess.</div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#1d4ed8", fontWeight: 700, textAlign: "right" }}>{euro(r.costoInt)}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#92400e", fontWeight: 700, textAlign: "right" }}>
                        {costoEsterno > 0 ? euro(r.costoExt) : <span style={{ color: "#cbd5e1", fontSize: 10 }}>—</span>}
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 800, color: "#166534", textAlign: "right" }}>{euro(r.totale)}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 800, color: hasMagg ? "#6d28d9" : "#94a3b8", background: hasMagg ? "#f5f3ff" : "#f8fafc", borderRadius: 6, padding: "3px 8px", textAlign: "center" }}>
                        {hasMagg ? euro(addebito) : <span style={{ fontSize: 10 }}>—</span>}
                        {hasMagg && <div style={{ fontSize: 8, color: "#a78bfa" }}>+{pctEffettiva}%</div>}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: "grid", gridTemplateColumns: "120px 130px 60px 80px 80px 80px 80px 80px 95px", gap: 6, padding: "10px 0 0", borderTop: "2px solid #e2e8f0", marginTop: 4, minWidth: 800 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>TOTALE</span><span /><span />
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, textAlign: "right" }}>{totKwhInterni.toFixed(3)}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, textAlign: "right" }}>{totKwhEsterni.toFixed(3)}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "#1d4ed8", textAlign: "right" }}>{euro(meseData.bolletta || 0)}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, color: "#92400e", textAlign: "right" }}>{euro(totCostoEsterni)}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#166534", textAlign: "right" }}>{euro((meseData.bolletta || 0) + totCostoEsterni)}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#6d28d9", background: "#f5f3ff", borderRadius: 6, padding: "3px 8px", textAlign: "center" }}>{euro(totAddebiti)}</div>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};
