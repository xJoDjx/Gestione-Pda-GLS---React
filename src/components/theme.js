// ─────────────────────────────────────────────────────────────────────────────
// theme.js  —  Design Tokens centralizzati
//
// USO:  import { C, SP, TY, SH, BR, STATO_STYLE, STILE_AZ } from "./theme";
//
// Cambia qui → cambia ovunque. Una sola riga da toccare.
// ─────────────────────────────────────────────────────────────────────────────


// ─── COLORI ──────────────────────────────────────────────────────────────────
export const C = {
  // Testo
  fg:          "#0f172a",   // testo principale
  fgMuted:     "#64748b",   // testo secondario (label, header tabella)
  fgSubtle:    "#94a3b8",   // testo terziario (sotto-testo, placeholder)

  // Superfici
  white:       "#ffffff",
  bgPage:      "#f8fafc",   // sfondo pagina / thead / righe alternate
  bgRowAlt:    "#fafafa",   // riga alternata nella tabella
  bgRowHover:  "#f0f9ff",   // hover riga (default blu)

  // Bordi
  border:      "#e2e8f0",   // bordo card, input, separatori principali
  borderLight: "#f1f5f9",   // separatore riga tabella

  // Primary (blu)
  primary:     "#1e40af",
  primaryMid:  "#2563eb",
  primarySoft: "#1d4ed8",
  primaryBg:   "#eff6ff",
  primaryBgAlt:"#dbeafe",
  primaryBorder:"#bfdbfe",

  // Success (verde)
  success:     "#166534",
  successMid:  "#16a34a",
  successDot:  "#22c55e",
  successBg:   "#f0fdf4",
  successBgAlt:"#dcfce7",
  successBorder:"#bbf7d0",

  // Warning (ambra)
  warning:     "#92400e",
  warningMid:  "#d97706",
  warningDot:  "#f59e0b",
  warningBg:   "#fffbeb",
  warningBgAlt:"#fef3c7",
  warningBorder:"#fde68a",

  // Danger (rosso)
  danger:      "#dc2626",
  dangerDot:   "#ef4444",
  dangerBg:    "#fef2f2",
  dangerBgAlt: "#fee2e2",
  dangerBorder:"#fecaca",

  // Violet (palmari / codici)
  violet:      "#6d28d9",
  violetSoft:  "#7c3aed",
  violetIndigo:"#6366f1",
  violetBg:    "#f5f3ff",
  violetBgAlt: "#f3e8ff",
  violetBorder:"#c4b5fd",

  // Muted (dismesso / venduto)
  muted:       "#6b7280",
  mutedBg:     "#f3f4f6",

  // Note / giallo pallido
  noteBg:      "#fef9c3",
  noteColor:   "#854d0e",
  noteBorder:  "#fde68a",

  // Monospace (importi, targa, codice)
  mono:        "#166534",
};


// ─── SPACING ─────────────────────────────────────────────────────────────────
export const SP = {
  // Celle tabella
  cellPadY:    3,    // padding top/bottom cella compatta  →  "3px 14px"
  cellPadX:    14,   // padding left/right cella
  cellPadYLg:  7,    // padding top/bottom cella normale   →  "7px 14px"

  cell:        "3px 14px",    // cella compatta (nome, stato, badge)
  cellLg:      "7px 14px",    // cella normale  (date, numeri, testo)

  // Card / sezioni
  cardPad:     "16px 18px",   // padding interno card KPI
  sectionPad:  "14px 18px",   // padding header sezione (storico, ecc.)
  innerPad:    "10px 16px",   // padding barra note/filtri interni

  // Gap generali
  gap:         16,   // gap principale tra sezioni della view
  gapSm:       8,    // gap piccolo (filtri, bottoni)
  gapXs:       6,    // gap minimo (icona + testo, badge inline)
  gapCard:     12,   // gap griglia KPI card
};


// ─── TIPOGRAFIA ──────────────────────────────────────────────────────────────
export const TY = {
  // Font families
  base:   "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono:   "'DM Mono', monospace",

  // Taglie
  xxs:    9,    // mini badge, etichette secondarie
  xs:     10,   // label uppercase, header colonna tabella
  sm:     11,   // sotto-testo KPI, footer, testo terziario
  md:     12,   // corpo cella tabella, form label, input
  base_:  13,   // testo principale, titolo sezione
  lg:     14,   // codice autista, codici importanti
  xl:     20,   // titolo pagina (h1)
  kpi:    22,   // valore KPI card

  // Pesi
  normal: 400,
  semi:   600,
  bold:   700,
  black:  800,

  // Label uppercase (usato ovunque per le label form e header colonna)
  labelStyle: {
    fontSize:        10,
    fontWeight:      700,
    color:           "#64748b",
    textTransform:   "uppercase",
    letterSpacing:   "0.06em",
  },
};


// ─── BORDER RADIUS ───────────────────────────────────────────────────────────
export const BR = {
  xs:    4,    // micro-badge (categoria mezzo, modello palmare)
  sm:    6,    // badge stato piccolo, barra KM
  md:    7,    // bottone azione, input note, bottone filtro
  lg:    8,    // input form, select, bottone filtro principale
  xl:    9,    // bottone CTA principale
  card:  12,   // card KPI, storico, sezioni interne
  table: 14,   // wrapper tabella principale
  pill:  10,   // search bar
};

// ─── PADDING BADGE ─────────────────────────────────────────────────────────────────
export const PD = {
  //Padding Badge
  badgeLg:        "2px 8px",    // cella compatta (nome, stato, badge)
  cellLg:      "7px 14px",    // cella normale  (date, numeri, testo)
};

// ─── SHADOWS ─────────────────────────────────────────────────────────────────
export const SH = {
  card:    "0 1px 3px rgba(0,0,0,0.04)",  // card KPI
  table:   "0 1px 4px rgba(0,0,0,0.05)",  // wrapper tabella
  tableLg: "0 1px 4px rgba(0,0,0,0.06)",  // wrapper tabella (variante)
};


// ─── STATUS STYLES ───────────────────────────────────────────────────────────
// Riutilizzato in tutte le viste — importa invece di ridefinire

export const STATO_STYLE = {
  DISPONIBILE:    { bg: C.successBgAlt,  color: C.success },
  ASSEGNATO:      { bg: C.primaryBgAlt,  color: C.primarySoft },
  "IN REVISIONE": { bg: C.warningBgAlt,  color: C.warning },
  "FUORI SERVIZIO":{ bg: C.dangerBgAlt,  color: C.danger },
  GUASTO:         { bg: C.dangerBgAlt,   color: C.danger },
  VENDUTO:        { bg: C.mutedBg,        color: C.muted },
  DISMESSO:       { bg: C.mutedBg,        color: C.muted },
};

// Badge stato generico: se lo stato non è nella mappa restituisce il fallback
export const statoStyle = (stato) =>
  STATO_STYLE[stato] ?? { bg: C.mutedBg, color: C.muted };


// ─── STILE AZIONI STORICO ────────────────────────────────────────────────────
// Riutilizzato in MezziView, PalmariView, CodAutistiView

export const STILE_AZ = {
  Assegnazione:   { bg: C.successBgAlt,  color: C.success,   border: C.successBorder, dot: C.successDot },
  Rimozione:      { bg: C.dangerBgAlt,   color: C.danger,    border: C.dangerBorder,  dot: C.dangerDot  },
  Riassegnazione: { bg: C.warningBgAlt,  color: C.warning,   border: C.warningBorder, dot: C.warningDot },
  Modifica:       { bg: C.primaryBgAlt,  color: C.primarySoft,border: C.primaryBorder,dot: "#3b82f6"    },
  Nota:           { bg: C.noteBg,        color: C.noteColor, border: C.noteBorder,    dot: C.warningDot },
};
