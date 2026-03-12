import { useState, useRef } from "react";
import { euro, MESI } from "../utils/formatters";
import { Icon } from "./Icons";

// ─── CSV PARSER (invariato) ───────────────────────────────────────────────────
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
    else                   { per_targa[targa].esterne += kwh; per_targa[targa].sessioni_ext++; }
  }
  Object.values(per_targa).forEach(v => {
    v.interne = parseFloat(v.interne.toFixed(3));
    v.esterne = parseFloat(v.esterne.toFixed(3));
  });
  return per_targa;
};

// ─── MINI COMPONENTS ─────────────────────────────────────────────────────────

// KPI card — white, subtle border, ⚡ icon top-right, large mono value
const KpiCard = ({ label, value, sub }) => (
  <div style={{
    background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0",
    padding: "20px 22px", display: "flex", flexDirection: "column", gap: 0,
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {/* ⚡ icon — small blue circle */}
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: "50%", background: "#eff6ff",
        fontSize: 13, flexShrink: 0
      }}>⚡</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#0f172a", lineHeight: 1, marginBottom: 8 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>}
  </div>
);

// Card wrapper — white with header bar
const Card = ({ title, icon, children, noPad }) => (
  <div style={{
    background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)", overflow: "hidden"
  }}>
    <div style={{
      padding: "11px 16px", display: "flex", alignItems: "center", gap: 7,
      borderBottom: "1px solid #f1f5f9", background: "#fafafa"
    }}>
      <span style={{ fontSize: 14, opacity: 0.8 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </span>
    </div>
    <div style={noPad ? {} : { padding: "16px 18px" }}>{children}</div>
  </div>
);

// Form field with uppercase label
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>
      {label}
    </label>
    {children}
  </div>
);

// Clean text input
const TextInput = ({ style, ...props }) => (
  <input style={{
    padding: "9px 11px", borderRadius: 8, border: "1px solid #e2e8f0",
    fontSize: 14, fontFamily: "'DM Mono', monospace", fontWeight: 600,
    background: "#ffffff", outline: "none", color: "#0f172a",
    width: "100%", boxSizing: "border-box",
    ...style
  }} {...props} />
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export const RicaricheView = ({ ricariche, onSave, mezzi, padroncini = [], mese, anno, onSaveMezzo }) => {
  const [selMese,   setSelMese]   = useState(mese);
  const [selAnno,   setSelAnno]   = useState(anno);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef();

  const key      = `${selMese}_${selAnno}`;
  const meseData = ricariche[key] || { bolletta: 0, costo_esterno: 0, kwh_per_targa: {}, note: "" };
  const setMeseData = (patch) => onSave(key, { ...meseData, ...patch });

  // ── CALCOLI ──────────────────────────────────────────────────────────────────
  const totKwhInt   = Object.values(meseData.kwh_per_targa || {}).reduce((s, v) => s + (v.interne || 0), 0);
  const totKwhExt   = Object.values(meseData.kwh_per_targa || {}).reduce((s, v) => s + (v.esterne || 0), 0);
  const kwhBolletta = meseData.kwh_fatturati_bolletta || totKwhInt;
  const costoKwhInt = kwhBolletta > 0 ? (meseData.bolletta || 0) / kwhBolletta : 0;
  const costoExt    = meseData.costo_esterno || 0;
  const totCostoExt = parseFloat((totKwhExt * costoExt).toFixed(2));
  const maggiPct    = meseData.maggiorazione_pct ?? 20;
  const numTarghe   = Object.keys(meseData.kwh_per_targa || {}).length;
  const meseKeys    = Object.keys(ricariche).sort().reverse().slice(0, 24);
  const costoTotale = (meseData.bolletta || 0) + totCostoExt;

  // totAddebiti rispetta maggiorazione per-mezzo
  const totAddebiti = parseFloat(
    Object.entries(meseData.kwh_per_targa || {}).reduce((sum, [targa]) => {
      const d    = meseData.kwh_per_targa?.[targa] || {};
      const mz   = (mezzi || []).find(m => (m.targa || "").toUpperCase() === targa);
      const isAz = mz?.categoria === "AUTO AZIENDALE";
      const pctMz = mz?.maggiorazione_ricarica_pct;
      const pct  = pctMz != null ? pctMz : (isAz ? 0 : maggiPct);
      const cInt = (d.interne || 0) * costoKwhInt;
      const cExt = (d.esterne || 0) * costoExt;
      const tot  = cInt + cExt;
      return sum + (pct > 0 ? tot * (1 + pct / 100) : tot);
    }, 0).toFixed(2)
  );

  const getRiga = (targa) => {
    const d    = meseData.kwh_per_targa?.[targa.toUpperCase()] || {};
    const int_ = d.interne || 0;
    const ext_ = d.esterne || 0;
    const cInt = parseFloat((int_ * costoKwhInt).toFixed(2));
    const cExt = parseFloat((ext_ * costoExt).toFixed(2));
    return { int: int_, ext: ext_, cInt, cExt, totale: parseFloat((cInt + cExt).toFixed(2)) };
  };

  // ── CSV IMPORT ───────────────────────────────────────────────────────────────
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
            // snapshot padroncino al momento dell'import (storico corretto)
            const mzAtt         = (mezzi || []).find(m => (m.targa || "").toUpperCase() === t);
            const padIdSnapshot = mzAtt?.padroncino_id || "";
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
          ⚡ Ricariche Elettriche
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={selMese} onChange={e => setSelMese(e.target.value)} style={{
            padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
            fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer",
            outline: "none", color: "#0f172a", appearance: "auto"
          }}>
            {MESI.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selAnno} onChange={e => setSelAnno(parseInt(e.target.value) || new Date().getFullYear())} style={{
            padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
            fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer",
            outline: "none", color: "#0f172a", appearance: "auto"
          }}>
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ══ KPI ROW ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <KpiCard
          label="Costo kWh Interno"
          value={costoKwhInt > 0 ? `${costoKwhInt.toFixed(4)} €` : "—"}
          sub={costoKwhInt > 0
            ? `${euro(meseData.bolletta || 0)} ÷ ${kwhBolletta.toFixed(1)} kWh`
            : "Compila bolletta e kWh"}
        />
        <KpiCard
          label="kWh Totali"
          value={(totKwhInt + totKwhExt).toFixed(1)}
          sub={`Interni ${totKwhInt.toFixed(1)} · Esterni ${totKwhExt.toFixed(1)}`}
        />
        <KpiCard
          label="Costo Totale"
          value={euro(costoTotale)}
          sub={`Bolletta ${euro(meseData.bolletta || 0)} + Esterni ${euro(totCostoExt)}`}
        />
        <KpiCard
          label="Totale Addebiti"
          value={euro(totAddebiti)}
          sub={`${numTarghe} targhe · magg. ${maggiPct}%`}
        />
      </div>

      {/* ══ BODY ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Parametri */}
          <Card title={`Parametri — ${selMese} ${selAnno}`} icon="⚡">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              <Field label="Bolletta Interna (€)">
                <TextInput type="number" step="0.01" value={meseData.bolletta || ""} placeholder="es. 1850.00"
                  onChange={e => setMeseData({ bolletta: parseFloat(e.target.value) || 0 })} />
              </Field>

              <Field label="kWh Fatturati in Bolletta">
                <TextInput type="number" step="0.001"
                  value={meseData.kwh_fatturati_bolletta || ""}
                  placeholder={totKwhInt > 0 ? `Auto: ${totKwhInt.toFixed(1)}` : "es. 2500.000"}
                  onChange={e => setMeseData({ kwh_fatturati_bolletta: parseFloat(e.target.value) || 0 })} />
              </Field>

              {/* Costo kWh calcolato — info pill */}
              {costoKwhInt > 0 && (
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 12px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe"
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>Costo kWh Interno</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#2563eb" }}>
                    {costoKwhInt.toFixed(4)} €/kWh
                  </span>
                </div>
              )}

              <Field label="Costo Esterno (€/kWh)">
                <TextInput type="number" step="0.0001" value={meseData.costo_esterno || ""} placeholder="0.4500"
                  onChange={e => setMeseData({ costo_esterno: parseFloat(e.target.value) || 0 })} />
              </Field>

              <Field label="Maggiorazione (%)">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TextInput type="number" step="1" min="0" max="100"
                    value={meseData.maggiorazione_pct ?? 20}
                    onChange={e => setMeseData({ maggiorazione_pct: parseFloat(e.target.value) || 0 })}
                    style={{ width: 80, textAlign: "center" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>%</span>
                </div>
              </Field>

              <Field label="Note">
                <textarea value={meseData.note || ""} onChange={e => setMeseData({ note: e.target.value })}
                  placeholder="Note, n° fattura..."
                  style={{
                    padding: "9px 11px", borderRadius: 8, border: "1px solid #e2e8f0",
                    fontSize: 13, resize: "vertical", minHeight: 72,
                    fontFamily: "inherit", outline: "none",
                    width: "100%", boxSizing: "border-box", color: "#374151"
                  }} />
              </Field>

              {/* Mesi registrati */}
              {meseKeys.length > 0 && (
                <Field label="Mesi Registrati">
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                    {meseKeys.map(k => {
                      const [m, a] = k.split("_");
                      const d = ricariche[k];
                      const isActive = k === key;
                      return (
                        <div key={k}
                          onClick={() => { setSelMese(m); setSelAnno(parseInt(a)); }}
                          style={{
                            padding: "7px 11px", borderRadius: 8, cursor: "pointer",
                            border: `1px solid ${isActive ? "#bfdbfe" : "#e2e8f0"}`,
                            background: isActive ? "#eff6ff" : "#fafafa",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f0f9ff"; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "#fafafa"; }}>
                          <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#1d4ed8" : "#374151" }}>
                            {m} {a}
                          </span>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#1d4ed8" }}>{euro(d.bolletta || 0)}</div>
                            <div style={{ fontSize: 10, color: "#94a3b8" }}>{Object.keys(d.kwh_per_targa || {}).length} targhe</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Field>
              )}
            </div>
          </Card>

          {/* Import CSV */}
          <Card title="Import CSV" icon="📤">
            <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65, margin: "0 0 14px" }}>
              Carica il report CSV. <strong>Juice Box/Pole</strong> → interne, altre → esterne.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => fileRef.current?.click()} disabled={importing} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                background: "#fff", border: "1px solid #86efac",
                color: "#166534", fontSize: 12, fontWeight: 700,
                cursor: importing ? "not-allowed" : "pointer",
                opacity: importing ? 0.55 : 1
              }}>
                <Icon name="upload" size={13} /> {importing ? "Importando..." : "Carica CSV"}
              </button>
              {numTarghe > 0 && (
                <button onClick={() => { if (window.confirm("Cancellare tutti i dati kWh di questo mese?")) setMeseData({ kwh_per_targa: {} }); }} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 8,
                  background: "#fff", border: "1px solid #fca5a5",
                  color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer"
                }}>
                  <Icon name="trash" size={12} /> Reset
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: "none" }}
              onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }} />
            {importMsg && (
              <div style={{
                marginTop: 12, padding: "9px 13px", borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: importMsg.type === "success" ? "#dcfce7" : importMsg.type === "warn" ? "#fffbeb" : "#fee2e2",
                color:      importMsg.type === "success" ? "#166534" : importMsg.type === "warn" ? "#92400e" : "#dc2626",
                border: `1px solid ${importMsg.type === "success" ? "#86efac" : importMsg.type === "warn" ? "#fde68a" : "#fca5a5"}`
              }}>
                {importMsg.type === "success" ? "✅" : importMsg.type === "warn" ? "⚠️" : "❌"} {importMsg.text}
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT: tabella targhe ── */}
        <div>
          {numTarghe === 0 ? (
            <div style={{
              background: "#fff", borderRadius: 12, border: "2px dashed #e2e8f0",
              padding: "60px 32px", textAlign: "center"
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                Nessun dato kWh per {selMese} {selAnno}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Importa un file CSV per visualizzare le ricariche per targa
              </div>
            </div>
          ) : (
            <div style={{
              background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
              overflow: "hidden", boxShadow: "0 1px 2px rgba(15,23,42,0.04)"
            }}>
              {/* Card header */}
              <div style={{
                padding: "11px 18px", borderBottom: "1px solid #f1f5f9",
                background: "#fafafa", display: "flex", alignItems: "center", gap: 7
              }}>
                <span style={{ fontSize: 14, opacity: 0.8 }}>⚡</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Dettaglio per Targa — {numTarghe} veicoli
                </span>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        { label: "Targa",      w: 110, align: "left"  },
                        { label: "Padroncino", w: 160, align: "left"  },
                        { label: "kWh Int.",   w: 90,  align: "right" },
                        { label: "kWh Ext.",   w: 90,  align: "right" },
                        { label: "Costo Int.", w: 110, align: "right" },
                        { label: "Costo Ext.", w: 110, align: "right" },
                        { label: "Totale",     w: 110, align: "right" },
                        { label: "Magg.",      w: 80,  align: "center"},
                        { label: "Addebito",   w: 110, align: "right" },
                      ].map(col => (
                        <th key={col.label} style={{
                          padding: "11px 14px", fontSize: 10, fontWeight: 700,
                          color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em",
                          borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
                          textAlign: col.align, width: col.w
                        }}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(meseData.kwh_per_targa || {})
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([targa, vals], ri) => {
                        const r            = getRiga(targa);
                        const mz           = (mezzi || []).find(m => (m.targa || "").toUpperCase() === targa);
                        const padIdStorico = vals.padroncino_id_snapshot || mz?.padroncino_id || "";
                        const pad          = (padroncini || []).find(p => p.id === padIdStorico) || null;
                        const isAz         = mz?.categoria === "AUTO AZIENDALE";
                        const pctMz        = mz?.maggiorazione_ricarica_pct;
                        const pctEff       = pctMz != null ? pctMz : (isAz ? 0 : maggiPct);
                        const addebito     = parseFloat((r.totale * (1 + pctEff / 100)).toFixed(2));
                        const hasMagg      = pctEff > 0;
                        const rowBg        = ri % 2 === 0 ? "#ffffff" : "#fafafa";

                        return (
                          <tr key={targa} style={{ background: rowBg }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                            onMouseLeave={e => e.currentTarget.style.background = rowBg}>

                            {/* TARGA */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                              <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                                {targa}
                              </span>
                              {mz && (mz.alimentazione || "").toLowerCase().includes("elettr") && (
                                <div style={{ fontSize: 9, color: "#10b981", fontWeight: 700, marginTop: 1 }}>⚡ flotta</div>
                              )}
                            </td>

                            {/* PADRONCINO */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>
                                {isAz
                                  ? mz?.autista
                                    ? <span style={{ color: "#7c3aed" }}>🚗 {mz.autista}</span>
                                    : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Aziendale</span>
                                  : pad
                                    ? <span style={{ color: "#2563eb" }}>{pad.nome}</span>
                                    : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>
                                }
                              </div>
                              {/* Input maggiorazione per-mezzo */}
                              {mz && onSaveMezzo && (
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                                  <input type="number" min="0" max="200" step="1"
                                    value={pctMz ?? ""}
                                    placeholder={isAz ? "—" : String(maggiPct)}
                                    onChange={e => {
                                      const val = e.target.value === "" ? null : parseFloat(e.target.value) || 0;
                                      onSaveMezzo({ ...mz, maggiorazione_ricarica_pct: val });
                                    }}
                                    style={{
                                      width: 42, padding: "3px 6px", borderRadius: 6,
                                      border: "1px solid #c4b5fd", fontSize: 11,
                                      fontFamily: "'DM Mono',monospace", fontWeight: 700,
                                      color: "#6d28d9", textAlign: "center",
                                      background: "#faf5ff", outline: "none"
                                    }} />
                                  <span style={{ fontSize: 10, color: "#6d28d9", fontWeight: 600 }}>% custom</span>
                                </div>
                              )}
                            </td>

                            {/* KWH INT */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                                {r.int.toFixed(1)}
                              </div>
                              <div style={{ fontSize: 9, color: "#94a3b8" }}>{vals.sessioni_int || 0} sess.</div>
                            </td>

                            {/* KWH EXT */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                                {r.ext.toFixed(1)}
                              </div>
                              <div style={{ fontSize: 9, color: "#94a3b8" }}>{vals.sessioni_ext || 0} sess.</div>
                            </td>

                            {/* COSTO INT — blu */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#2563eb" }}>
                                {euro(r.cInt)} €
                              </span>
                            </td>

                            {/* COSTO EXT — amber */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                              {costoExt > 0
                                ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "#d97706" }}>{euro(r.cExt)} €</span>
                                : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                            </td>

                            {/* TOTALE — verde */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#16a34a" }}>
                                {euro(r.totale)} €
                              </span>
                            </td>

                            {/* MAGG — badge pill blu */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                              {hasMagg
                                ? <span style={{
                                    display: "inline-block", padding: "3px 10px", borderRadius: 999,
                                    background: "#dbeafe", color: "#1d4ed8",
                                    fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace",
                                    whiteSpace: "nowrap"
                                  }}>+{pctEff}%</span>
                                : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                            </td>

                            {/* ADDEBITO — viola */}
                            <td style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                              {hasMagg
                                ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#7c3aed" }}>
                                    {euro(addebito)} €
                                  </span>
                                : <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}

                    {/* ── RIGA TOTALI ── */}
                    <tr style={{ background: "#f8fafc" }}>
                      <td colSpan={2} style={{
                        padding: "13px 14px", fontSize: 11, fontWeight: 800,
                        color: "#0f172a", borderTop: "2px solid #e2e8f0", letterSpacing: "0.04em"
                      }}>TOTALE</td>
                      <td style={{ padding: "13px 14px", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#374151", borderTop: "2px solid #e2e8f0" }}>
                        {totKwhInt.toFixed(1)}
                      </td>
                      <td style={{ padding: "13px 14px", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#374151", borderTop: "2px solid #e2e8f0" }}>
                        {totKwhExt.toFixed(1)}
                      </td>
                      <td style={{ padding: "13px 14px", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 800, color: "#2563eb", textAlign: "right", borderTop: "2px solid #e2e8f0" }}>
                        {euro(meseData.bolletta || 0)} €
                      </td>
                      <td style={{ padding: "13px 14px", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 800, color: "#d97706", textAlign: "right", borderTop: "2px solid #e2e8f0" }}>
                        {euro(totCostoExt)} €
                      </td>
                      <td style={{ padding: "13px 14px", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#16a34a", textAlign: "right", borderTop: "2px solid #e2e8f0" }}>
                        {euro(costoTotale)} €
                      </td>
                      <td style={{ padding: "13px 14px", borderTop: "2px solid #e2e8f0" }} />
                      <td style={{ padding: "13px 14px", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, color: "#7c3aed", textAlign: "right", borderTop: "2px solid #e2e8f0" }}>
                        {euro(totAddebiti)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};