// ─────────────────────────────────────────────────────────────────────────────
// ImportaMezziExcel.jsx
//
// Bottone "Importa da Excel" da aggiungere a MezziView.
// Legge un file .xlsx client-side via SheetJS (già incluso in Electron/React).
// Mostra anteprima tabellare con checkbox, poi salva i selezionati.
//
// USO in MezziView (lista principale):
//   import { ImportaMezziExcel } from "./ImportaMezziExcel";
//   ...nella barra filtri:
//   <ImportaMezziExcel mezziEsistenti={mezzi} onImport={onSave} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { C, SP, TY, BR, SH, statoStyle } from "./theme";
import { euro } from "../utils/formatters";

// ─── MAPPATURA COLONNE EXCEL → SCHEMA APP ─────────────────────────────────────
// Intestazioni riconosciute (case-insensitive, parziali)
const COL_MAP = [
  { appKey: "targa",               match: ["targa"] },
  { appKey: "marca",               match: ["tipo", "marca", "brand"] },        // col "TIPO" = marca
  { appKey: "modello",             match: ["modello", "model"] },
  { appKey: "tipo_cassone",        match: ["cassone", "allestimento"] },
  { appKey: "alimentazione",       match: ["alimentazione", "carburante", "fuel"] },
  { appKey: "scad_assicurazione",  match: ["assicurazione", "assic"] },
  { appKey: "scad_revisione",      match: ["revisione", "collaudo"] },
  { appKey: "proprietario",        match: ["proprietario", "societa", "società", "owner"] },
  { appKey: "data_inizio",         match: ["inizio contratto", "inizio", "inizio_contratto", "data inizio"] },
  { appKey: "data_fine",           match: ["fine contratto", "data fine", "scadenza contratto", "scad contratto"] },
  { appKey: "canone_noleggio",     match: ["canone"] },
  { appKey: "rata_noleggio",       match: ["rata", "rata noleggio"] },
  { appKey: "limitazioni_km",      match: ["limitazioni", "km contrattu", "limite km"] },
  { appKey: "km_attuale",          match: ["km attuali", "km attuale", "chilometri"] },
];

const NORM_ALIM = {
  gasolio: "Gasolio", diesel: "Diesel", elettrica: "Elettrico",
  elettrico: "Elettrico", "gasolio+mhev": "Gasolio+mhev",
  benzina: "Benzina", gpl: "GPL", metano: "Metano", ibrido: "Ibrido",
};

const normAlim = (v) => {
  if (!v) return "Altro";
  return NORM_ALIM[String(v).trim().toLowerCase()] || String(v).trim();
};

const normTipo = (marca, modello) => {
  const s = (String(marca) + String(modello)).toLowerCase();
  if (["cupra","born","q5","audi","giulia","stelvio","a3","a6","golf","polo"].some(k => s.includes(k))) return "Auto";
  if (s.includes("tge") || s.includes("etge")) return "Autocarro";
  return "Furgone";
};

const normCategoria = (marca, modello) => {
  const s = (String(marca) + String(modello)).toLowerCase();
  return ["cupra","born","q5","audi"].some(k => s.includes(k)) ? "AUTO AZIENDALE" : "DISTRIBUZIONE";
};

const fmtDate = (val) => {
  if (val == null || val === "") return "";
  // SheetJS restituisce numeri seriali per le date Excel
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return "";
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  // già ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return s.slice(0, 10);
};

const toNum = (val) => {
  const n = parseFloat(String(val ?? "").trim());
  return isNaN(n) ? 0 : n;
};

// ─── PARSER EXCEL → MEZZI ─────────────────────────────────────────────────────
function parseExcel(data, targheEsistenti = new Set()) {
  const wb = XLSX.read(data, { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (rows.length < 2) return { mezzi: [], errori: ["File vuoto o senza dati"] };

  // Trova riga intestazione (la prima con almeno 3 celle non vuote)
  let headerRow = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const nonEmpty = rows[i].filter(c => String(c).trim() !== "").length;
    if (nonEmpty >= 3) { headerRow = i; break; }
  }

  const headers = rows[headerRow].map(h => String(h).trim().toLowerCase());

  // Mappa colonne
  const colIdx = {};
  COL_MAP.forEach(({ appKey, match }) => {
    const idx = headers.findIndex(h => match.some(m => h.includes(m)));
    if (idx >= 0) colIdx[appKey] = idx;
  });

  const mezzi = [];
  const errori = [];
  const warnings = [];

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (key) => colIdx[key] !== undefined ? row[colIdx[key]] : "";

    const targa = String(get("targa")).trim().toUpperCase().replace(/\s/g, "");
    if (!targa) continue;

    if (targheEsistenti.has(targa)) {
      warnings.push(`${targa}: già presente nell'app — saltata`);
      continue;
    }

    const marca   = String(get("marca") || "").trim();
    const modello = String(get("modello") || "").trim().toUpperCase();

    mezzi.push({
      id:               `MEZZO_${targa}_${Date.now()}_${r}`,
      targa,
      marca:            marca.charAt(0).toUpperCase() + marca.slice(1).toLowerCase(),
      modello,
      tipo:             normTipo(marca, modello),
      categoria:        normCategoria(marca, modello),
      alimentazione:    normAlim(get("alimentazione")),
      tipo_cassone:     String(get("tipo_cassone") || "").trim(),
      stato:            "DISPONIBILE",
      proprietario:     String(get("proprietario") || "").trim(),
      scad_assicurazione: fmtDate(get("scad_assicurazione")),
      scad_revisione:     fmtDate(get("scad_revisione")),
      data_inizio:        fmtDate(get("data_inizio")),
      data_fine:          fmtDate(get("data_fine")),
      canone_noleggio:  toNum(get("canone_noleggio")),
      rata_noleggio:    toNum(get("rata_noleggio")),
      limitazioni_km:   toNum(get("limitazioni_km")),
      km_attuale:       toNum(get("km_attuale")),
      km_data:          "",
      targa_rimorchio:  "",
      note_veicolo:     "",
      autista:          "",
      padroncino_id:    "",
      storico:          [],
      documenti:        [],
    });
  }

  return { mezzi, errori, warnings };
}


// ─── COMPONENTE MODALE ANTEPRIMA ──────────────────────────────────────────────
const ModalAnteprimaImport = ({ mezzi, warnings, onConferma, onChiudi }) => {
  const [selezionati, setSelezionati] = useState(new Set(mezzi.map(m => m.id)));

  const toggleTutti = () => {
    if (selezionati.size === mezzi.length) setSelezionati(new Set());
    else setSelezionati(new Set(mezzi.map(m => m.id)));
  };
  const toggle = (id) => {
    const next = new Set(selezionati);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelezionati(next);
  };

  const distrib = mezzi.filter(m => m.categoria === "DISTRIBUZIONE").length;
  const aziendale = mezzi.filter(m => m.categoria === "AUTO AZIENDALE").length;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 24,
    }}>
      <div style={{
        background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)", width: "100%", maxWidth: 980,
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Header modale */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: TY.black, color: C.fg }}>📥 Importa Mezzi da Excel</div>
            <div style={{ fontSize: TY.md, color: C.fgMuted, marginTop: 2 }}>
              {mezzi.length} mezzi trovati — {distrib} distribuzione · {aziendale} auto aziendali
            </div>
          </div>
          <button onClick={onChiudi} style={{ padding: "6px 10px", borderRadius: BR.lg, border: `1px solid ${C.border}`, background: C.bgPage, color: C.fgMuted, fontSize: TY.md, cursor: "pointer" }}>✕</button>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div style={{ padding: "10px 20px", background: C.warningBg, borderBottom: `1px solid ${C.warningBorder}`, flexShrink: 0 }}>
            <div style={{ fontSize: TY.md, fontWeight: TY.bold, color: C.warning, marginBottom: 4 }}>⚠️ Targhe già presenti (saltate automaticamente)</div>
            <div style={{ fontSize: TY.sm, color: C.warning }}>{warnings.join("  ·  ")}</div>
          </div>
        )}

        {/* Tabella anteprima */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: TY.md }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: C.bgPage }}>
                <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `2px solid ${C.border}` }}>
                  <input type="checkbox" checked={selezionati.size === mezzi.length} onChange={toggleTutti}
                    style={{ cursor: "pointer", width: 14, height: 14 }} />
                </th>
                {["Targa","Categoria","Marca / Modello","Alim.","Proprietario","Fine Contratto","Canone","Rata","KM Attuali"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: TY.xs, fontWeight: TY.black, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mezzi.map((m, i) => {
                const sel = selezionati.has(m.id);
                const rowBg = sel ? (i % 2 === 0 ? "#f0f9ff" : "#e8f4ff") : (i % 2 === 0 ? C.white : C.bgRowAlt);
                return (
                  <tr key={m.id} onClick={() => toggle(m.id)} style={{ background: rowBg, cursor: "pointer", opacity: sel ? 1 : 0.45, transition: "all 0.1s" }}>
                    <td style={{ padding: "6px 12px", borderBottom: `1px solid ${C.borderLight}`, textAlign: "center" }}>
                      <input type="checkbox" checked={sel} onChange={() => toggle(m.id)} onClick={e => e.stopPropagation()} style={{ cursor: "pointer", width: 14, height: 14 }} />
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}` }}>
                      <div style={{ fontWeight: TY.black, fontFamily: TY.mono, fontSize: TY.base_ }}>{m.targa}</div>
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}` }}>
                      <span style={{ fontSize: TY.xxs, padding: "1px 6px", borderRadius: BR.xs, fontWeight: TY.bold,
                        background: m.categoria === "AUTO AZIENDALE" ? C.violetBgAlt : C.primaryBgAlt,
                        color: m.categoria === "AUTO AZIENDALE" ? C.violet : C.primarySoft }}>
                        {m.categoria === "AUTO AZIENDALE" ? "🚗 AUTO AZ." : "🚛 DISTRIB."}
                      </span>
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}` }}>
                      <span style={{ fontWeight: TY.bold }}>{m.marca}</span>
                      <span style={{ color: C.fgMuted, marginLeft: 4 }}>{m.modello}</span>
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, color: C.fgMuted, whiteSpace: "nowrap" }}>
                      {m.alimentazione === "Elettrico" ? "⚡ Elettrico" : m.alimentazione}
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.sm, color: C.fgMuted, whiteSpace: "nowrap" }}>{m.proprietario}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.sm, color: C.fgMuted, whiteSpace: "nowrap" }}>{m.data_fine || "—"}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontWeight: TY.bold, color: C.fg, whiteSpace: "nowrap" }}>
                      {m.canone_noleggio ? euro(m.canone_noleggio) : "—"}
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontWeight: TY.bold, color: C.primarySoft, whiteSpace: "nowrap" }}>
                      {m.rata_noleggio ? euro(m.rata_noleggio) : "—"}
                    </td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontSize: TY.md, color: C.fg, whiteSpace: "nowrap" }}>
                      {m.km_attuale ? m.km_attuale.toLocaleString("it-IT") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer azioni */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: C.bgPage }}>
          <div style={{ fontSize: TY.md, color: C.fgMuted }}>
            <span style={{ fontWeight: TY.bold, color: C.fg }}>{selezionati.size}</span> di {mezzi.length} selezionati
          </div>
          <div style={{ display: "flex", gap: SP.gapSm }}>
            <button onClick={onChiudi}
              style={{ padding: "9px 18px", borderRadius: BR.lg, border: `1px solid ${C.border}`, background: C.white, color: C.fgMuted, fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>
              Annulla
            </button>
            <button
              disabled={selezionati.size === 0}
              onClick={() => onConferma(mezzi.filter(m => selezionati.has(m.id)))}
              style={{
                padding: "9px 22px", borderRadius: BR.xl,
                background: selezionati.size > 0 ? C.primary : C.border,
                color: "#fff", border: "none",
                fontSize: TY.base_, fontWeight: TY.bold,
                cursor: selezionati.size > 0 ? "pointer" : "default",
              }}>
              📥 Importa {selezionati.size} mezzi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── COMPONENTE PRINCIPALE ─────────────────────────────────────────────────────
export const ImportaMezziExcel = ({ mezziEsistenti = [], onImport }) => {
  const [stato, setStato] = useState("idle"); // idle | loading | anteprima | successo | errore
  const [risultato, setRisultato] = useState(null); // { mezzi, warnings, errori }
  const [importati, setImportati] = useState(0);
  const [msgErrore, setMsgErrore] = useState("");
  const inputRef = useRef();

  const targheEsistenti = new Set(mezziEsistenti.map(m => m.targa).filter(Boolean));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStato("loading");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const result = parseExcel(data, targheEsistenti);
        if (result.errori.length > 0) {
          setMsgErrore(result.errori.join("; "));
          setStato("errore");
          return;
        }
        if (result.mezzi.length === 0) {
          setMsgErrore("Nessun mezzo nuovo trovato nel file (tutti già presenti).");
          setStato("errore");
          return;
        }
        setRisultato(result);
        setStato("anteprima");
      } catch (err) {
        setMsgErrore("Errore lettura file: " + err.message);
        setStato("errore");
      }
    };
    reader.readAsArrayBuffer(file);
    // reset input per poter ricaricare lo stesso file
    e.target.value = "";
  };

  const handleConferma = async (mezziDaImportare) => {
    setStato("loading");
    let ok = 0;
    for (const mezzo of mezziDaImportare) {
      try { await onImport(mezzo); ok++; } catch {}
    }
    setImportati(ok);
    setRisultato(null);
    setStato("successo");
    setTimeout(() => setStato("idle"), 3500);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />

      {stato === "anteprima" && risultato && (
        <ModalAnteprimaImport
          mezzi={risultato.mezzi}
          warnings={risultato.warnings}
          onConferma={handleConferma}
          onChiudi={() => { setStato("idle"); setRisultato(null); }}
        />
      )}

      {/* Bottone principale */}
      {stato === "idle" && (
        <button
          onClick={() => inputRef.current.click()}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 13px", borderRadius: BR.lg,
            background: C.successBg, border: `1px solid ${C.successBorder}`,
            color: C.success, fontSize: TY.md, fontWeight: TY.bold,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          📥 Importa Excel
        </button>
      )}

      {stato === "loading" && (
        <span style={{ fontSize: TY.md, color: C.fgMuted, padding: "7px 13px" }}>⏳ Caricamento...</span>
      )}

      {stato === "successo" && (
        <span style={{ fontSize: TY.md, fontWeight: TY.bold, color: C.success, padding: "7px 13px",
          background: C.successBg, borderRadius: BR.lg, border: `1px solid ${C.successBorder}` }}>
          ✅ {importati} mezzi importati!
        </span>
      )}

      {stato === "errore" && (
        <span
          onClick={() => setStato("idle")}
          style={{ fontSize: TY.md, fontWeight: TY.bold, color: C.danger, padding: "7px 13px",
            background: C.dangerBg, borderRadius: BR.lg, border: `1px solid ${C.dangerBorder}`,
            cursor: "pointer", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={msgErrore}
        >
          ❌ {msgErrore} (click per chiudere)
        </span>
      )}
    </>
  );
};
