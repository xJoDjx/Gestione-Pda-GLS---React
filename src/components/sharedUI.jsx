// ─────────────────────────────────────────────────────────────────────────────
// sharedUI.jsx  —  Componenti condivisi tra tutte le viste
//
// Esporta: KpiCard, FormInput, FormSelect, TableWrapper, TheadRow,
//          StoricoTabella, fmtTs, getAzStorico
//
// Invece di avere KpiCard ripetuto 4 volte, StoricoTabella 3 volte, ecc.
// basta importare da qui.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Icon } from "./Icons";
import { C, SP, TY, SH, BR, STILE_AZ } from "./theme";


// ─── UTILITY ─────────────────────────────────────────────────────────────────

/** Formatta un ISO timestamp in "DD/MM/YYYY  HH:MM:SS" */
export const fmtTs = (ts) => {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return (
      d.toLocaleDateString("it-IT") +
      "  " +
      d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
  } catch {
    return ts;
  }
};

/** Classifica un'entry dello storico in una delle chiavi di STILE_AZ */
export const getAzStorico = (entry) => {
  if (entry.manuale) return "Nota";
  const c = entry.campo || "";
  if (c === "Assegnazione" || c === "Padroncino") {
    const da = entry.da || "";
    const a  = entry.a  || "";
    if (!da || da === "—" || da === "Nessuno") return "Assegnazione";
    if (!a  || a  === "—" || a  === "Nessuno") return "Rimozione";
    return "Riassegnazione";
  }
  return "Modifica";
};


// ─── KPI CARD ─────────────────────────────────────────────────────────────────
/**
 * Card metrica principale, usata in cima a ogni vista.
 *
 * Props:
 *  label   – stringa etichetta (uppercase automatico)
 *  value   – valore principale (numero o stringa formattata)
 *  icon    – ReactNode o emoji
 *  sub     – riga descrittiva sotto il valore
 *  alert   – boolean, colora il valore in rosso se true
 */
export const KpiCard = ({ label, value, icon, sub, alert = false }) => (
  <div style={{
    background:     C.white,
    borderRadius:   BR.card,
    border:         `1px solid ${C.border}`,
    padding:        SP.cardPad,
    display:        "flex",
    flexDirection:  "column",
    gap:            4,
    boxShadow:      SH.card,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={TY.labelStyle}>{label}</span>
      <span style={{ color: C.fgSubtle, fontSize: TY.md }}>{icon}</span>
    </div>
    <div style={{
      fontSize:   TY.kpi,
      fontWeight: TY.black,
      color:      alert ? C.danger : C.fg,
      lineHeight: 1.2,
    }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: TY.sm, color: C.fgSubtle }}>{sub}</div>
    )}
  </div>
);


// ─── FORM INPUT ──────────────────────────────────────────────────────────────
/**
 * Input generico per i form di dettaglio.
 *
 * Props: label, value, onChange, type, placeholder, small
 */
export const FormInput = ({ label, value, onChange, type = "text", placeholder = "", small = false }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {label && <label style={TY.labelStyle}>{label}</label>}
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) =>
        onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)
      }
      style={{
        padding:      small ? "6px 9px" : "8px 12px",
        borderRadius: BR.lg,
        border:       `1px solid ${C.border}`,
        fontSize:     small ? TY.md : TY.base_,
        background:   C.white,
        boxSizing:    "border-box",
        width:        "100%",
        outline:      "none",
      }}
    />
  </div>
);


// ─── FORM SELECT ─────────────────────────────────────────────────────────────
/**
 * Select generica per i form di dettaglio.
 *
 * Props: label, value, onChange, options (array di stringhe)
 */
export const FormSelect = ({ label, value, onChange, options = [] }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    {label && <label style={TY.labelStyle}>{label}</label>}
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding:      "7px 10px",
        borderRadius: BR.lg,
        border:       `1px solid ${C.border}`,
        fontSize:     TY.md,
        background:   C.white,
        cursor:       "pointer",
      }}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  </div>
);


// ─── SEARCH BAR ──────────────────────────────────────────────────────────────
/**
 * Barra di ricerca con icona lente a sinistra.
 *
 * Props: value, onChange, placeholder
 */
export const SearchBar = ({ value, onChange, placeholder = "Cerca..." }) => (
  <div style={{ flex: 1, position: "relative" }}>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width:        "100%",
        padding:      `9px 14px 9px 36px`,
        borderRadius: BR.pill,
        border:       `1px solid ${C.border}`,
        fontSize:     TY.base_,
        background:   C.white,
        boxSizing:    "border-box",
        outline:      "none",
      }}
    />
    <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.fgSubtle }}>
      <Icon name="search" size={16} />
    </div>
  </div>
);


// ─── FILTER BUTTON ───────────────────────────────────────────────────────────
/**
 * Bottone filtro stato (TUTTI / ATTIVO / DISMESSO / ecc.)
 *
 * Props: label, active, onClick, activeColor (default primary)
 */
export const FilterButton = ({ label, active, onClick, activeColor = C.primary }) => (
  <button
    onClick={onClick}
    style={{
      padding:      `7px 12px`,
      borderRadius: BR.lg,
      border:       `1px solid ${C.border}`,
      background:   active ? activeColor : C.white,
      color:        active ? "#fff" : "#475569",
      fontSize:     TY.sm,
      fontWeight:   TY.bold,
      cursor:       "pointer",
    }}
  >
    {label}
  </button>
);


// ─── TABLE WRAPPER ───────────────────────────────────────────────────────────
/**
 * Contenitore standard per le tabelle.
 */
export const TableWrapper = ({ children, overflow = "hidden" }) => (
  <div style={{
    background:   C.white,
    borderRadius: BR.table,
    border:       `1px solid ${C.border}`,
    overflow,
    boxShadow:    SH.table,
  }}>
    {children}
  </div>
);


// ─── TABLE HEADER ROW ────────────────────────────────────────────────────────
/**
 * Riga di intestazione tabella.
 *
 * Props: headers (array di stringhe)
 */
export const TheadRow = ({ headers }) => (
  <thead>
    <tr style={{ background: C.bgPage }}>
      {headers.map((h) => (
        <th
          key={h}
          style={{
            padding:         SP.cellLg,
            textAlign:       "left",
            fontSize:        TY.xs,
            fontWeight:      TY.bold,
            color:           C.fgMuted,
            textTransform:   "uppercase",
            letterSpacing:   "0.06em",
            borderBottom:    `2px solid ${C.border}`,
            whiteSpace:      "nowrap",
          }}
        >
          {h}
        </th>
      ))}
    </tr>
  </thead>
);


// ─── TABLE CELL STYLE ────────────────────────────────────────────────────────
/** Oggetto style standard per una <td> compatta */
export const tdStyle = {
  padding:      SP.cell,
  borderBottom: `1px solid ${C.borderLight}`,
};

/** Oggetto style standard per una <td> con più respiro verticale */
export const tdStyleLg = {
  padding:      SP.cellLg,
  borderBottom: `1px solid ${C.borderLight}`,
};


// ─── STATUS BADGE ────────────────────────────────────────────────────────────
/**
 * Pill colorata per lo stato di un'entità.
 *
 * Props: stato, style (opzionale, oggetto {bg, color})
 */
export const StatoBadge = ({ stato, style }) => (
  <span style={{
    background:   style?.bg,
    color:        style?.color,
    padding:      "2px 8px",
    borderRadius: BR.sm,
    fontSize:     TY.xs,
    fontWeight:   TY.bold,
  }}>
    {stato || "—"}
  </span>
);


// ─── STORICO TABELLA ─────────────────────────────────────────────────────────
/**
 * Pannello storico modifiche con barra note e timeline.
 * Usato in MezziView, PalmariView, CodAutistiView.
 *
 * Props:
 *  storico      – array di entry
 *  entitaNome   – nome dell'entità (targa, seriale, codice...)
 *  onAddNota    – fn(campo, testo)
 *  accentColor  – colore bottone "+ Nota" (default primary)
 */
export const StoricoTabella = ({
  storico = [],
  entitaNome = "",
  onAddNota,
  accentColor = C.primary,
}) => {
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const rows = [...storico].reverse();

  return (
    <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: SP.sectionPad, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg }}>
            📜 Storico — {entitaNome}
          </div>
          <div style={{ fontSize: TY.sm, color: C.fgMuted, marginTop: 2 }}>
            {storico.length} eventi
          </div>
        </div>
      </div>

      {/* Barra note */}
      <div style={{ padding: SP.innerPad, background: C.bgPage, borderBottom: `1px solid ${C.border}`, display: "flex", gap: SP.gapSm, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={notaCampo}
          onChange={(e) => setNotaCampo(e.target.value)}
          placeholder="Tipo nota..."
          style={{ width: 200, padding: "6px 10px", borderRadius: BR.md, border: `1px solid ${C.border}`, fontSize: TY.md, background: C.white }}
        />
        <input
          value={notaTesto}
          onChange={(e) => setNotaTesto(e.target.value)}
          placeholder="Descrizione nota..."
          style={{ flex: 1, minWidth: 200, padding: "6px 10px", borderRadius: BR.md, border: `1px solid ${C.border}`, fontSize: TY.md, background: C.white }}
        />
        <button
          onClick={() => {
            if (!notaTesto.trim()) return;
            onAddNota(notaCampo, notaTesto);
            setNotaCampo("");
            setNotaTesto("");
          }}
          style={{ padding: "6px 16px", borderRadius: BR.md, background: accentColor, color: "#fff", border: "none", fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer" }}
        >
          + Nota
        </button>
      </div>

      {/* Corpo */}
      {storico.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: C.fgSubtle }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📜</div>
          <div style={{ fontSize: TY.base_ }}>Nessuna modifica registrata</div>
        </div>
      ) : (
        <>
          {/* Header colonne */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 150px 130px 1fr", background: C.bgPage, borderBottom: `2px solid ${C.border}`, padding: "8px 16px" }}>
            {["DATA / ORA", "UTENTE", "AZIONE", "DESCRIZIONE"].map((h) => (
              <div key={h} style={{ fontSize: TY.xs, fontWeight: TY.black, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {h}
              </div>
            ))}
          </div>

          {/* Righe */}
          <div style={{ maxHeight: 460, overflowY: "auto" }}>
            {rows.map((entry, i) => {
              const az   = getAzStorico(entry);
              const st   = STILE_AZ[az] || STILE_AZ["Modifica"];
              const u    = entry.utente || "";
              const desc = entry.manuale
                ? (entry.campo && entry.campo !== "Nota manuale" ? `[${entry.campo}] ` : "") + (entry.a || "")
                : `${entry.campo}: ${entry.da || "—"} → ${entry.a || "—"}`;

              return (
                <div
                  key={i}
                  style={{
                    display:             "grid",
                    gridTemplateColumns: "160px 150px 130px 1fr",
                    padding:             "10px 16px",
                    alignItems:          "center",
                    background:          i % 2 === 0 ? C.white : "#fafbfc",
                    borderBottom:        `1px solid ${C.borderLight}`,
                  }}
                >
                  {/* DATA */}
                  <div style={{ fontSize: TY.xs, color: C.fgMuted, fontFamily: TY.mono }}>
                    {fmtTs(entry.ts)}
                  </div>

                  {/* UTENTE */}
                  <div style={{ fontSize: TY.xs, color: C.fgMuted }}>
                    {u ? (
                      <span style={{ background: C.bgPage, border: `1px solid ${C.border}`, borderRadius: BR.xs, padding: "1px 6px", fontWeight: TY.semi }}>
                        {u}
                      </span>
                    ) : "—"}
                  </div>

                  {/* AZIONE */}
                  <div>
                    <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: BR.xs, padding: "2px 7px", fontSize: TY.xxs, fontWeight: TY.bold, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
                      {az}
                    </span>
                  </div>

                  {/* DESCRIZIONE */}
                  <div style={{ fontSize: TY.sm, color: C.fg }}>{desc}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
