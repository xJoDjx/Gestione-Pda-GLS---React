// ─────────────────────────────────────────────────────────────────────────────
// generaConteggioPDF.js
//
// Genera un PDF del riepilogo conteggio usando jsPDF
// Design: header scuro, card con accent strip, sezioni con barra laterale,
// riepilogo finale in box navy.
//
// USO:
//   import { generaConteggioPDF } from "./generaConteggioPDF";
//   generaConteggioPDF({ form, padroncino, mese, anno, giorni });
// ─────────────────────────────────────────────────────────────────────────────

import { jsPDF } from "jspdf";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const euro = (v) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v ?? 0);

const fmtData = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Palette professionale
const COL = {
  navy:       [28, 38, 61],      // header bg, titoli sezione
  dark:       [46, 51, 69],      // testo principale
  mid:        [102, 110, 128],   // testo secondario
  lightBg:    [246, 247, 250],   // sfondo card e righe totale
  sectionBg:  [240, 242, 247],   // sfondo intestazioni sezione
  white:      [255, 255, 255],
  accentBlue: [56, 107, 184],    // fatturato
  accentGreen:[38, 148, 89],     // da bonificare
  accentRed:  [191, 56, 56],     // addebiti / negativi
  accentAmber:[209, 133, 38],    // compensazioni, cassa
  line:       [217, 221, 230],   // linee separatrici
  headerSub:  [179, 184, 199],   // testo secondario su header scuro
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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW  = 210;
  const PH  = 297;
  const ML  = 22;
  const MR  = 22;
  const CW  = PW - ML - MR;
  let y     = 0;

  doc.setFont("helvetica");

  // ── Drawing helpers ──────────────────────────────────────────────────────

  const checkPage = (needed = 20) => {
    if (y + needed > PH - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const rect = (x, yy, w, h, rgb) => {
    doc.setFillColor(...rgb);
    doc.rect(x, yy, w, h, "F");
  };

  const roundRect = (x, yy, w, h, r, rgb) => {
    doc.setFillColor(...rgb);
    doc.roundedRect(x, yy, w, h, r, r, "F");
  };

  const text = (str, x, yy, { size = 9, bold = false, color = COL.dark, align = "left" } = {}) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(String(str ?? "—"), x, yy, { align });
  };

  const hline = (yy, color = COL.line) => {
    //doc.setDrawColor(...color);
    //doc.setLineWidth(0.2);
    //doc.line(ML + 3, yy, ML + CW - 3, yy);
  };

  // Section header: gray bg with blue left accent bar
  const sectionHeader = (label) => {
    checkPage(14);
    rect(ML, y, CW, 6.5, COL.sectionBg);
    rect(ML, y, 2, 6.5, COL.accentBlue);  // left accent strip
    text(label, ML + 5, y + 4.5, { size: 8.5, bold: true, color: COL.navy });
    y += 6.5 + 3;
  };

  // Sub-header (e.g. "Noleggio Palmari") — blue bold text
  const subHeader = (label) => {
    checkPage(7);
    text(label, ML + 5, y + 0.5, { size: 7, bold: true, color: COL.accentBlue });
    y += 4.5;
  };

  // Standard row: label left, amount right
  const rigaVoce = (label, importo, { indent = false, bold = false, valColor = COL.dark, labelColor = COL.dark } = {}) => {
    checkPage(6);
    const x = ML + 3 + (indent ? 4 : 0);
    text(label, x, y + 0.5, { size: 8.5, bold, color: labelColor });
    text(euro(importo), ML + CW - 3, y + 0.5, { size: 8.5, bold, color: valColor, align: "right" });
    y += 5;
    hline(y - 1);
  };

  // Totale row: highlighted background
  const rigaTotale = (label, importo, accentColor) => {
    checkPage(8);
    y += 1;
    rect(ML, y - 2.5, CW, 7, COL.sectionBg);
    text(label, ML + 3, y + 1, { size: 9, bold: true, color: accentColor || COL.navy });
    text(euro(importo), ML + CW - 3, y + 1, { size: 9, bold: true, color: accentColor || COL.navy, align: "right" });
    y += 7;
  };

  // Table header row
  const tableHeader = (cols, widths, aligns) => {
    checkPage(6);
    let x = ML + 3;
    cols.forEach((c, i) => {
      const xPos = aligns[i] === "right" ? x + widths[i] - 1 : x;
      text(c, xPos, y + 0.5, { size: 6.5, color: COL.mid, align: aligns[i] });
      x += widths[i];
    });
    y += 4.5;
  };

  // Table data row
  const tableRow = (cols, widths, aligns) => {
    checkPage(5.5);
    let x = ML + 3;
    cols.forEach((c, i) => {
      const xPos = aligns[i] === "right" ? x + widths[i] - 1 : x;
      text(c, xPos, y + 0.5, { size: 7.5, color: COL.dark, align: aligns[i] });
      x += widths[i];
    });
    y += 4.5;
    hline(y - 1);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 1. HEADER — Dark navy bar
  // ════════════════════════════════════════════════════════════════════════════
  rect(0, 0, PW, 28, COL.navy);

  text("CONTEGGIO MENSILE", ML, 12, { size: 16, bold: true, color: COL.white });
  const nomeP = padroncino?.nome || "—";
  const codP = padroncino?.codice ? `Cod. ${padroncino.codice}` : "";
  text(`${nomeP}  ·  ${codP}`, ML, 19, { size: 10, color: COL.headerSub });

  text(`${mese} ${anno}`.toUpperCase(), PW - MR, 12, { size: 11, bold: true, color: COL.white, align: "right" });
  const oggi = new Date().toLocaleDateString("it-IT");
  text(`Generato il ${oggi}`, PW - MR, 19, { size: 8, color: COL.headerSub, align: "right" });

  y = 36;

  // ════════════════════════════════════════════════════════════════════════════
  // 2. KPI CARDS — 3 cards with left accent strip
  // ════════════════════════════════════════════════════════════════════════════
  const cardW = (CW - 2 * 5) / 3;
  const cardH = 18;
  const kpiBoxes = [
    { label: "TOTALE FATTURA",  value: form.totale_fattura,       accent: COL.accentBlue  },
    { label: "TOTALE ADDEBITI", value: form.totale_addebiti,      accent: COL.accentRed   },
    { label: "DA BONIFICARE",   value: form.totale_da_bonificare, accent: (form.totale_da_bonificare ?? 0) >= 0 ? COL.accentGreen : COL.accentRed },
  ];

  kpiBoxes.forEach((b, i) => {
    const x = ML + i * (cardW + 5);
    roundRect(x, y, cardW, cardH, 3, COL.lightBg);
    rect(x, y, 2.5, cardH, b.accent);  // left accent strip
    text(b.label, x + 6, y + 6, { size: 7, color: COL.mid });
    text(euro(b.value), x + 6, y + 14, { size: 14, bold: true, color: COL.dark });
  });

  y += cardH + 8;

  // ════════════════════════════════════════════════════════════════════════════
  // 3. FATTURATO
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader("FATTURATO");

  if ((form.fisso_mensile ?? 0) > 0)
    rigaVoce("Fisso mensile", form.fisso_mensile);

  if ((form.totale_spedizioni ?? 0) !== 0)
    rigaVoce("Totale spedizioni (proforma)", form.totale_spedizioni);

  if ((form.totale_ritiri ?? 0) !== 0)
    rigaVoce("Totale ritiri", form.totale_ritiri);
  if ((form.totale_ritiri_fissi ?? 0) !== 0)
    rigaVoce("Ritiri fissi", form.totale_ritiri_fissi);

  if ((form.consegne_doppie ?? 0) !== 0)
    rigaVoce("Consegne doppie", form.consegne_doppie, {valColor: COL.accentRed });

  if ((form.consegne_extra ?? 0) !== 0)
    rigaVoce("Consegne extra", form.consegne_extra);

  if ((form.sforamento_rientri ?? 0) !== 0)
    rigaVoce("Sforamento rientri", form.sforamento_rientri, {valColor: COL.accentRed });

  (form.voci_fatturato || []).forEach(v => {
    if (v.label) rigaVoce(v.label, v.val);
  });

  (form.altri_fatturato || []).forEach(v => {
    if (v.descrizione) rigaVoce(v.descrizione, v.importo);
  });

  if ((form.totale_imponibile ?? 0) > 0) {
    rigaVoce("Imponibile", form.totale_imponibile);
    rigaVoce("IVA", form.iva, { labelColor: COL.mid });
  }

  rigaTotale("Totale Fattura", form.totale_fattura, COL.navy);
  y += 3;

  // ════════════════════════════════════════════════════════════════════════════
  // 4. ADDEBITI
  // ════════════════════════════════════════════════════════════════════════════
  checkPage(10);
  sectionHeader("ADDEBITI");

  // Palmari
  if ((form.addebiti_palmari ?? 0) > 0) {
    subHeader("Noleggio Palmari");
    rigaVoce(`${form.n_palmari ?? 0} palmari × ${giorni ?? ""} gg`, form.addebiti_palmari);
    y += 1;
  }

  // Mezzi
  if ((form.addebiti_mezzi ?? 0) > 0) {
    subHeader("Mezzi in Noleggio");
    const mezzi = form.dettagli_mezzi || [];
    if (mezzi.length > 0) {
      checkPage(8 + mezzi.length * 5);
      const colW = [22, 40, 50, CW - 22 - 40 - 50 - 6];
      tableHeader(["Targa", "Tipologia", "Nota", "Imp. €"], colW, ["left", "left", "left", "right"]);
      mezzi.forEach((m) => {
        tableRow(
          [m.targa || "—", m.tipologia || "—", m.nota || "—", euro(m.importo)],
          colW,
          ["left", "left", "left", "right"]
        );
      });
    }
    rigaVoce("Totale mezzi in noleggio", form.addebiti_mezzi, {bold: true });
    y += 1;
  }

  // Ricariche
  if ((form.addebiti_ricariche ?? 0) > 0) {
    subHeader("Ricariche Mezzi Elettrici");
    const ric = form.ricariche_mezzi || [];
    if (ric.length > 0) {
      checkPage(8 + ric.length * 5);
      const colW = [22, CW - 22 - 42, 42];
      tableHeader(["Targa", "Descrizione", "Imp. €"], colW, ["left", "left", "right"]);
      ric.forEach((r) => {
        const notaRic = r.note || r.descrizione || "—";
        tableRow(
          [r.targa || "—", notaRic, euro(r.importo)],
          colW,
          ["left", "left", "right"]
        );
      });
    }
    rigaVoce("Totale ricariche", form.addebiti_ricariche, {bold: true });
    y += 1;
  }

  // Altri addebiti
  const altriAdd = (form.altri_addebiti || []).filter(a => a.descrizione && (a.importo || 0) > 0);
  if (altriAdd.length > 0) {
    subHeader("Altri Addebiti");
    altriAdd.forEach(a => {
      rigaVoce(
        `${a.descrizione}${a.conto_voce ? ` [${a.conto_voce}]` : ""}`,
        parseFloat(((a.importo || 0) * (1 + (a.iva_rate ?? 0.22))).toFixed(2)),
        { indent: true }
      );
    });
  }

  rigaTotale("Totale Addebiti", form.totale_addebiti, COL.accentRed);
  y += 3;

  // ════════════════════════════════════════════════════════════════════════════
  // 5. COMPENSAZIONI & DEDUZIONI
  // ════════════════════════════════════════════════════════════════════════════
  const hasComp = (form.compensazioni_distribuzione ?? 0) > 0;
  const hasFatFM = (form.fatture_fine_mese || []).some(f => (f.importo || 0) > 0);

  if (hasComp || hasFatFM) {
    checkPage(10);
    sectionHeader("COMPENSAZIONI & DEDUZIONI");

    if (hasComp) {
      subHeader("Compensazioni su Distribuzione");
      const vociComp = form.voci_compensazioni_distribuzione || [];
      if (vociComp.length > 0) {
        vociComp.filter(v => (v.importo || 0) !== 0).forEach(v => {
          rigaVoce(v.descrizione || "Compensazione", v.importo);
        });
      } else {
        rigaVoce("Compensazioni distribuzione", form.compensazioni_distribuzione);
      }
    }

    if (hasFatFM) {
      subHeader("Fatture Fine Mese / Altre");
      const fatFM = (form.fatture_fine_mese || []).filter(f => (f.importo || 0) > 0);
      if (fatFM.length > 0) {
        checkPage(8 + fatFM.length * 5);
        const colW = [CW - 80 - 30, 30, 50];
        tableHeader(["Descrizione", "Note", "Importo €"], colW, ["left", "left", "right"]);
        fatFM.forEach((f) => {
          tableRow(
            [f.descrizione || "—", f.note || "—", euro(f.importo)],
            colW,
            ["left", "left", "right"]
          );
        });
      }
    }

    const totComp = (form.compensazioni_distribuzione || 0)
      + (form.fatture_fine_mese || []).reduce((s, f) => s + (f.importo || 0), 0);
    rigaTotale("Totale Compensazioni", totComp, COL.accentAmber);
    y += 3;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 6. CASSA PRIMA NOTA
  // ════════════════════════════════════════════════════════════════════════════
  const cassa = (form.cassa_prima_nota || []).filter(c => c.importo);
  if (cassa.length > 0) {
    checkPage(10 + cassa.length * 5);
    sectionHeader("CASSA PRIMA NOTA");
    const colW = [30, 40, CW - 76];
    tableHeader(["Codice", "Data", "Importo"], colW, ["left", "left", "right"]);
    cassa.forEach((c) => {
      const desc = c.cod ? `Acc. n.v. COD ${c.cod}` : (c.descrizione || "—");
      tableRow(
        [desc, fmtData(c.data), euro(c.importo)],
        colW,
        ["left", "left", "right"]
      );
    });
    const totCassa = cassa.reduce((s, c) => s + (c.importo || 0), 0);
    rigaTotale("Totale cassa", totCassa, COL.accentAmber);
    y += 3;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 7. RIEPILOGO FINALE — Dark navy box
  // ════════════════════════════════════════════════════════════════════════════
  checkPage(34);

  const bonif = form.totale_da_bonificare ?? 0;
  const bonifColor = bonif >= 0 ? COL.accentGreen : COL.accentRed;

  roundRect(ML, y, CW, 28, 3, COL.navy);

  // Title
  text("RIEPILOGO FINALE", ML + 5, y + 6, { size: 9, bold: true, color: COL.white });

  // Left side: breakdown
  text("Totale Fattura", ML + 5, y + 13, { size: 8, color: COL.headerSub });
  text(euro(form.totale_fattura), ML + 55, y + 13, { size: 8, color: COL.headerSub });

  text("Totale Addebiti", ML + 5, y + 19, { size: 8, color: COL.headerSub });
  text(`- ${euro(form.totale_addebiti)}`, ML + 55, y + 19, { size: 8, color: COL.headerSub });

  // Right side: DA BONIFICARE big
  text("DA BONIFICARE", ML + CW - 5, y + 10, { size: 12, bold: true, color: bonifColor, align: "right" });
  text(euro(bonif), ML + CW - 5, y + 22, { size: 16, bold: true, color: bonifColor, align: "right" });

  y += 32;

  // ════════════════════════════════════════════════════════════════════════════
  // 8. NOTE OPERATIVE
  // ════════════════════════════════════════════════════════════════════════════
  if (form.note_varie?.trim()) {
    checkPage(20);
    sectionHeader("NOTE OPERATIVE");

    const noteLines = doc.splitTextToSize(form.note_varie.trim(), CW - 10);
    noteLines.forEach(line => {
      checkPage(6);
      text(line, ML + 5, y + 0.5, { size: 8, color: COL.mid });
      y += 4.5;
    });
    y += 3;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 9. FOOTER — every page
  // ════════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    text(
      `${padroncino?.nome || ""} — ${mese} ${anno} — Pagina ${i} di ${totalPages}`,
      PW / 2, PH - 8,
      { size: 6.5, color: COL.mid, align: "center" }
    );
  }

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const nomePad = (padroncino?.nome || "conteggio").replace(/\s+/g, "_");
  const filename = `conteggio_${nomePad}_${mese}_${anno}.pdf`;
  doc.save(filename);
};
