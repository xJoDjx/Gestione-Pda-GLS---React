// ─────────────────────────────────────────────────────────────────────────────
// generaConteggioPDF.js
//
// Genera un PDF del riepilogo conteggio usando jsPDF (già installato nella
// maggior parte dei progetti React — se non presente: npm install jspdf)
//
// USO:
//   import { generaConteggioPDF } from "./generaConteggioPDF";
//   generaConteggioPDF({ form, padroncino, mese, anno });
// ─────────────────────────────────────────────────────────────────────────────

import { jsPDF } from "jspdf";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const euro = (v) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v ?? 0);

const fmtData = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
};

// Colori principali (hex senza #)
const COL = {
  blue:       [30,  64,  175],   // #1e40af
  blueSoft:   [219, 234, 254],   // #dbeafe
  green:      [22,  101, 52 ],   // #166534
  greenSoft:  [220, 252, 231],   // #dcfce7
  red:        [185, 28,  28 ],   // #b91c1c
  redSoft:    [254, 226, 226],   // #fee2e2
  amber:      [146, 64,  14 ],   // #92400e
  amberSoft:  [255, 251, 235],   // #fffbeb
  violet:     [109, 40,  217],   // #6d28d9
  violetSoft: [237, 233, 254],   // #ede9fe
  gray:       [100, 116, 139],   // #64748b
  grayLight:  [241, 245, 249],   // #f1f5f9
  grayBorder: [226, 232, 240],   // #e2e8f0
  dark:       [15,  23,  42 ],   // #0f172a
  white:      [255, 255, 255],
};

// Mappa checklist → label leggibile
const CHECKLIST_LABELS = {
  distrib_inviata:  "Distribuzione Inviata",
  fatt_tu_creata:   "Fattura TU Creata",
  fattura_ricevuta: "Fattura Ricevuta",
  pdf_addeb:        "PDF Addebiti Preparato",
};

// ─── BUILDER ─────────────────────────────────────────────────────────────────
export const generaConteggioPDF = ({ form, padroncino, mese, anno, giorni }) => {
  const doc   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW    = 210;   // page width mm
  const PH    = 297;   // page height mm
  const ML    = 14;    // margin left
  const MR    = 14;    // margin right
  const CW    = PW - ML - MR;  // content width
  let   y     = 0;     // current Y cursor

  // ── Imposta font di base ──────────────────────────────────────────────────
  doc.setFont("helvetica");

  // ── Helpers di disegno ───────────────────────────────────────────────────

  /** Controlla se serve nuova pagina, aggiunge se necessario */
  const checkPage = (needed = 20) => {
    if (y + needed > PH - 14) {
      doc.addPage();
      y = 16;
    }
  };

  /** Rettangolo pieno */
  const rect = (x, yy, w, h, rgb) => {
    doc.setFillColor(...rgb);
    doc.rect(x, yy, w, h, "F");
  };

  /** Rettangolo solo bordo */
  const rectStroke = (x, yy, w, h, rgb) => {
    doc.setDrawColor(...rgb);
    doc.setLineWidth(0.3);
    doc.rect(x, yy, w, h, "S");
  };

  /** Testo con colore e allineamento */
  const text = (str, x, yy, { size = 9, bold = false, color = COL.dark, align = "left" } = {}) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(String(str ?? "—"), x, yy, { align });
  };

  /** Linea orizzontale */
  const hline = (yy, color = COL.grayBorder, width = 0.2) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(ML, yy, ML + CW, yy);
  };

  /** Header di sezione colorato */
  const sectionHeader = (label, bgColor, textColor = COL.white, emoji = "") => {
    checkPage(14);
    rect(ML, y, CW, 7, bgColor);
    text(`${emoji}  ${label}`.trim(), ML + 3, y + 4.8, { size: 8, bold: true, color: textColor });
    y += 7;
  };

  /** Sotto-intestazione interna a una sezione (evidenziata, bold, no colore forte) */
  const subHeader = (label, bgColor = COL.grayLight, textColor = COL.dark) => {
    checkPage(7);
    rect(ML, y, CW, 6, bgColor);
    text(label, ML + 3, y + 4.2, { size: 8, bold: true, color: textColor });
    y += 6;
  };

  /** Riga voce con label a sinistra e importo a destra */
  const rigaVoce = (label, importo, { indent = false, bold = false, bg = null, coloreTesto = COL.dark } = {}) => {
    checkPage(7);
    const x = ML + (indent ? 4 : 0);
    const w = CW  - (indent ? 4 : 0);
    if (bg) { rect(ML, y, CW, 6, bg); }
    text(label,        x,       y + 4.2, { size: 8.5, bold, color: coloreTesto });
    text(euro(importo), ML + CW, y + 4.2, { size: 8.5, bold, color: coloreTesto, align: "right" });
    y += 6;
  };

  /** Riga tabella piccola (per mezzi, ricariche, cassa) */
  const tableRow = (cols, widths, aligns, yy, bg = null) => {
    if (bg) rect(ML, yy, CW, 5.5, bg);
    let x = ML + 1;
    cols.forEach((c, i) => {
      text(c, aligns[i] === "right" ? x + widths[i] - 1 : x, yy + 3.8,
        { size: 7.5, align: aligns[i] });
      x += widths[i];
    });
  };

  /** Riga header tabella */
  const tableHeader = (cols, widths, aligns) => {
    checkPage(8);
    rect(ML, y, CW, 5.5, COL.grayLight);
    tableRow(cols, widths, aligns, y);
    y += 5.5;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 1. HEADER PAGINA
  // ════════════════════════════════════════════════════════════════════════════
  rect(0, 0, PW, 22, COL.blue);

  // Logo / titolo
  text("CONTEGGIO MENSILE", ML, 9, { size: 14, bold: true, color: COL.white });
  text(`${mese} ${anno}`, ML, 15, { size: 10, color: [147, 197, 253] });

  // Padroncino (destra)
  const nomeP = padroncino?.nome || "—";
  const codP  = padroncino?.codice ? `Cod. ${padroncino.codice}` : "";
  text(nomeP, PW - MR, 9,  { size: 11, bold: true, color: COL.white, align: "right" });
  text(codP,  PW - MR, 14.5, { size: 8, color: [147, 197, 253], align: "right" });

  // Data generazione
  const oggi = new Date().toLocaleDateString("it-IT");
  text(`Generato il ${oggi}`, PW - MR, 20, { size: 7, color: [148, 163, 184], align: "right" });

  y = 28;

  // ════════════════════════════════════════════════════════════════════════════
  // 2. KPI 3 BOX (Fattura / Addebiti / Bonifico)
  // ════════════════════════════════════════════════════════════════════════════
  const kpiW = CW / 3 - 2;
  const kpiBoxes = [
    { label: "TOTALE FATTURA",   value: form.totale_fattura,        bg: COL.blueSoft,   col: COL.blue  },
    { label: "TOTALE ADDEBITI",  value: form.totale_addebiti,       bg: COL.redSoft,    col: COL.red   },
    { label: "DA BONIFICARE",    value: form.totale_da_bonificare,  bg: (form.totale_da_bonificare ?? 0) >= 0 ? COL.greenSoft : COL.redSoft,
      col: (form.totale_da_bonificare ?? 0) >= 0 ? COL.green : COL.red },
  ];

  kpiBoxes.forEach((b, i) => {
    const x = ML + i * (kpiW + 3);
    rect(x, y, kpiW, 16, b.bg);
    rectStroke(x, y, kpiW, 16, b.col);
    text(b.label,       x + kpiW / 2, y + 5,  { size: 6.5, bold: true, color: b.col, align: "center" });
    text(euro(b.value), x + kpiW / 2, y + 12, { size: 11,  bold: true, color: b.col, align: "center" });
  });

  y += 20;

  // ════════════════════════════════════════════════════════════════════════════
  // 3. SEZIONE FATTURATO
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader("FATTURATO", COL.blue, COL.white, "");

  // Fisso mensile
  if ((form.fisso_mensile ?? 0) > 0)
    rigaVoce("Fisso mensile", form.fisso_mensile, { indent: true });

  // Spedizioni
  if ((form.totale_spedizioni ?? 0) !== 0)
    rigaVoce("Totale spedizioni (proforma)", form.totale_spedizioni, { indent: true });

  // Ritiri
  if ((form.totale_ritiri ?? 0) !== 0)
    rigaVoce("Totale ritiri", form.totale_ritiri, { indent: true });
  if ((form.totale_ritiri_fissi ?? 0) !== 0)
    rigaVoce("Ritiri fissi", form.totale_ritiri_fissi, { indent: true });

  // Consegne doppie (negativo)
  if ((form.consegne_doppie ?? 0) !== 0)
    rigaVoce("Consegne doppie", form.consegne_doppie, { indent: true, coloreTesto: COL.red });

  // Consegne extra
  if ((form.consegne_extra ?? 0) !== 0)
    rigaVoce("Consegne extra", form.consegne_extra, { indent: true });

  // Sforamento rientri
  if ((form.sforamento_rientri ?? 0) !== 0)
    rigaVoce("Sforamento rientri", form.sforamento_rientri, { indent: true, coloreTesto: COL.red });

  // Voci PDA
  (form.voci_fatturato || []).forEach(v => {
    if (v.label) rigaVoce(v.label, v.val, { indent: true });
  });

  // Voci extra fatturato
  (form.altri_fatturato || []).forEach(v => {
    if (v.descrizione) rigaVoce(v.descrizione, v.importo, { indent: true });
  });

  // Imponibile + IVA
  if ((form.totale_imponibile ?? 0) > 0) {
    rigaVoce("Imponibile",   form.totale_imponibile, { indent: true });
    rigaVoce("IVA",          form.iva,               { indent: true, coloreTesto: COL.gray });
  }

  // Totale fattura (riga bold)
  rigaVoce("Totale Fattura", form.totale_fattura, { bold: true, bg: COL.blueSoft, coloreTesto: COL.blue });
  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  // 4. SEZIONE ADDEBITI
  // ════════════════════════════════════════════════════════════════════════════
  checkPage(10);
  sectionHeader("ADDEBITI", COL.red, COL.white, "");

  // Palmari
  if ((form.addebiti_palmari ?? 0) > 0) {
    subHeader("Noleggio Palmari", COL.amberSoft, COL.amber);
    rigaVoce(`${form.n_palmari ?? 0} palmari × ${giorni ?? ""} gg`, form.addebiti_palmari, { indent: true });
  }

  // Mezzi — riga summary + eventuale tabella
  if ((form.addebiti_mezzi ?? 0) > 0) {
    subHeader("Mezzi in Noleggio", [255, 241, 242], COL.red);
    const mezzi = form.dettagli_mezzi || [];
    if (mezzi.length > 0) {
      checkPage(8 + mezzi.length * 5.5);
      tableHeader(["Targa","Tipologia","Nota","Imp. €"], [22, 40, 50, CW - 22 - 40 - 50 - 2], ["left","left","left","right"]);
      mezzi.forEach((m, i) => {
        tableRow(
          [m.targa || "—", m.tipologia || "—", m.nota || "—", euro(m.importo)],
          [22, 40, 50, CW - 22 - 40 - 50 - 2],
          ["left","left","left","right"],
          y,
          i % 2 === 0 ? COL.white : COL.grayLight
        );
        y += 5.5;
      });
    }
    rigaVoce("Totale mezzi in noleggio (imponibile)", form.addebiti_mezzi, { indent: true });
  }

  // Ricariche
  if ((form.addebiti_ricariche ?? 0) > 0) {
    subHeader("Ricariche Mezzi Elettrici", [224, 242, 254], [12, 74, 110]);
    const ric = form.ricariche_mezzi || [];
    if (ric.length > 0) {
      checkPage(8 + ric.length * 5.5);
      tableHeader(["Targa","Descrizione","Imp. €"], [22, CW - 22 - 38, 38], ["left","left","right"]);
      ric.forEach((r, i) => {
        const notaRic = r.note || r.descrizione || "—";
        tableRow(
          [r.targa || "—", notaRic, euro(r.importo)],
          [22, CW - 22 - 38, 38],
          ["left","left","right"],
          y,
          i % 2 === 0 ? COL.white : COL.grayLight
        );
        y += 5.5;
      });
    }
    rigaVoce("Totale ricariche (imponibile)", form.addebiti_ricariche, { indent: true });
  }

  // Altri addebiti
  const altriAdd = (form.altri_addebiti || []).filter(a => a.descrizione && (a.importo || 0) > 0);
  if (altriAdd.length > 0) {
    subHeader("Altri Addebiti", [237, 233, 254], [109, 40, 217]);
    altriAdd.forEach(a => {
      rigaVoce(
        `${a.descrizione}${a.conto_voce ? ` [${a.conto_voce}]` : ""}`,
        parseFloat(((a.importo || 0) * (1 + (a.iva_rate ?? 0.22))).toFixed(2)),
        { indent: true }
      );
    });
  }

  // Totale addebiti (bold)
  rigaVoce("Totale Addebiti", form.totale_addebiti, { bold: true, bg: COL.redSoft, coloreTesto: COL.red });
  y += 2;

  // ════════════════════════════════════════════════════════════════════════════
  // 5. SEZIONE COMPENSAZIONI (se presente)
  // ════════════════════════════════════════════════════════════════════════════
  const hasComp = (form.compensazioni_distribuzione ?? 0) > 0;
  const hasFatFM = (form.fatture_fine_mese || []).some(f => (f.importo || 0) > 0);

  if (hasComp || hasFatFM) {
    checkPage(10);
    sectionHeader("COMPENSAZIONI & DEDUZIONI", [3, 105, 161], COL.white, "");

    if (hasComp) {
      subHeader("Compensazioni su Distribuzione", [240, 249, 255], [3, 105, 161]);
      const vociComp = form.voci_compensazioni_distribuzione || [];
      if (vociComp.length > 0) {
        vociComp.filter(v => (v.importo || 0) !== 0).forEach(v => {
          rigaVoce(v.descrizione || "Compensazione", v.importo, { indent: true });
        });
      } else {
        rigaVoce("Compensazioni distribuzione", form.compensazioni_distribuzione, { indent: true });
      }
    }

    if (hasFatFM) {
      subHeader("Fatture Fine Mese / Altre", [240, 253, 244], [22, 101, 52]);
      const fatFM = (form.fatture_fine_mese || []).filter(f => (f.importo || 0) > 0);
      if (fatFM.length > 0) {
        checkPage(8 + fatFM.length * 5.5);
        tableHeader(["Descrizione","Note","Importo €"], [CW - 80 - 30, 30, 50], ["left","left","right"]);
        fatFM.forEach((f, i) => {
          tableRow(
            [f.descrizione || "—", f.note || "—", euro(f.importo)],
            [CW - 80 - 30, 30, 50],
            ["left","left","right"],
            y,
            i % 2 === 0 ? COL.white : COL.grayLight
          );
          y += 5.5;
        });
      }
    }

    const totComp = (form.compensazioni_distribuzione || 0)
      + (form.fatture_fine_mese || []).reduce((s, f) => s + (f.importo || 0), 0);
    rigaVoce("Totale Compensazioni", totComp, { bold: true, bg: [240, 249, 255], coloreTesto: [3, 105, 161] });
    y += 2;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 6. CASSA PRIMA NOTA (se presente)
  // ════════════════════════════════════════════════════════════════════════════
  const cassa = (form.cassa_prima_nota || []).filter(c => c.importo);
  if (cassa.length > 0) {
    checkPage(10 + cassa.length * 5.5);
    sectionHeader("CASSA PRIMA NOTA", COL.amber, COL.white, "");
    tableHeader(["Codice","Data","Importo"], [30, 40, CW - 72], ["left","left","right"]);
    cassa.forEach((c, i) => {
      const desc = c.cod ? `Acc. n.v. COD ${c.cod}` : (c.descrizione || "—");
      tableRow(
        [desc, fmtData(c.data), euro(c.importo)],
        [30, 40, CW - 72],
        ["left","left","right"],
        y,
        i % 2 === 0 ? COL.white : COL.grayLight
      );
      y += 5.5;
    });
    const totCassa = cassa.reduce((s, c) => s + (c.importo || 0), 0);
    rigaVoce("Totale cassa", totCassa, { bold: true, bg: COL.amberSoft, coloreTesto: COL.amber });
    y += 2;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 7. RIEPILOGO FINALE (box grande)
  // ════════════════════════════════════════════════════════════════════════════
  checkPage(40);
  sectionHeader("RIEPILOGO FINALE", COL.dark, COL.white, "");

  const bonif = form.totale_da_bonificare ?? 0;
  const bonifColor = bonif >= 0 ? COL.green : COL.red;
  const bonifBg    = bonif >= 0 ? COL.greenSoft : COL.redSoft;

  // Riga fattura - addebiti
  rigaVoce("Totale Fattura",     form.totale_fattura,   { coloreTesto: COL.blue });
  rigaVoce("- Totale Addebiti",  form.totale_addebiti,  { indent: true, coloreTesto: COL.red });

  // Separatore
  hline(y, COL.grayBorder);
  y += 2;

  // Bonifico netto — grande
  checkPage(14);
  rect(ML, y, CW, 12, bonifBg);
  rectStroke(ML, y, CW, 12, bonifColor);
  text("DA BONIFICARE", ML + 5, y + 4.5, { size: 7, bold: true, color: bonifColor });
  text(euro(bonif), ML + CW - 5, y + 8, { size: 13, bold: true, color: bonifColor, align: "right" });
  y += 15;

  // ════════════════════════════════════════════════════════════════════════════
  // 8. CHECKLIST
  // ════════════════════════════════════════════════════════════════════════════
  /*checkPage(14 + Object.keys(CHECKLIST_LABELS).length * 6);
  sectionHeader("CHECKLIST", COL.green, COL.white, "");

  Object.entries(CHECKLIST_LABELS).forEach(([key, label]) => {
    const done = !!form[key];
    rect(ML, y, CW, 5.5, done ? COL.greenSoft : COL.grayLight);
    // Checkbox simbolo
    text(done ? "✓" : "○", ML + 3, y + 4, { size: 8, bold: done, color: done ? COL.green : COL.gray });
    text(label, ML + 9, y + 4, { size: 8, color: done ? COL.green : COL.gray });
    y += 5.5;
  });
  y += 3;
  */

  // ════════════════════════════════════════════════════════════════════════════
  // 9. NOTE (se presenti)
  // ════════════════════════════════════════════════════════════════════════════
  if (form.note_varie?.trim()) {
    checkPage(20);
    sectionHeader("NOTE OPERATIVE", [146, 64, 14], COL.white, "");
    rect(ML, y, CW, 2, COL.amberSoft); // piccolo padding

    const noteLines = doc.splitTextToSize(form.note_varie.trim(), CW - 6);
    noteLines.forEach(line => {
      checkPage(6);
      rect(ML, y, CW, 5.5, COL.amberSoft);
      text(line, ML + 3, y + 4, { size: 8, color: COL.amber });
      y += 5.5;
    });
    y += 3;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 10. FOOTER su ogni pagina
  // ════════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    rect(0, PH - 10, PW, 10, COL.grayLight);
    doc.setDrawColor(...COL.grayBorder);
    doc.setLineWidth(0.2);
    doc.line(0, PH - 10, PW, PH - 10);
    text(
      `${padroncino?.nome || ""} — ${mese} ${anno} — Pagina ${i} di ${totalPages}`,
      PW / 2, PH - 4.5,
      { size: 7, color: COL.gray, align: "center" }
    );
  }

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const nomePad  = (padroncino?.nome || "conteggio").replace(/\s+/g, "_");
  const filename = `conteggio_${nomePad}_${mese}_${anno}.pdf`;
  doc.save(filename);
};
