// ─────────────────────────────────────────────────────────────────────────────
// generaContrattoNoleggio.js
//
// Genera il DOCX del Contratto di Noleggio partendo dai dati del mezzo e
// del padroncino.  Usa la libreria `docx` (npm install docx).
//
// USO:
//   import { generaContrattoNoleggio } from "./generaContrattoNoleggio";
//   generaContrattoNoleggio({ mezzo, padroncino, giorno, mese, anno });
// ─────────────────────────────────────────────────────────────────────────────

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType,
} from "docx";

// ─── Helpers interni ─────────────────────────────────────────────────────────
const FONT = "Times New Roman";
const SIZE = 24; // 12pt

const t = (text, opts = {}) =>
  new TextRun({ font: FONT, size: SIZE, text: String(text ?? ""), ...opts });

const bold = (text) => t(text, { bold: true });

const p = (children, opts = {}) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 276 },
    ...opts,
    children: Array.isArray(children) ? children : [children],
  });

const pCenter = (children, opts = {}) =>
  p(children, { ...opts, alignment: AlignmentType.CENTER });

const border0 = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: border0, bottom: border0, left: border0, right: border0 };

const sigTable = () =>
  new Table({
    width: { size: 9200, type: WidthType.DXA },
    columnWidths: [4600, 4600],
    borders: { top: border0, bottom: border0, left: border0, right: border0, insideH: border0, insideV: border0 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: { style: BorderStyle.SINGLE, size: 6, color: "000000" }, bottom: border0, left: border0, right: border0 },
            margins: { top: 100, bottom: 80, left: 80, right: 80 },
            width: { size: 4600, type: WidthType.DXA },
            children: [new Paragraph({ children: [t("Società Noleggiatrice", { bold: true, size: 22 })] })],
          }),
          new TableCell({
            borders: { top: { style: BorderStyle.SINGLE, size: 6, color: "000000" }, bottom: border0, left: border0, right: border0 },
            margins: { top: 100, bottom: 80, left: 80, right: 80 },
            width: { size: 4600, type: WidthType.DXA },
            children: [new Paragraph({ children: [t("Società Noleggiante", { bold: true, size: 22 })] })],
          }),
        ],
      }),
      new TableRow({
        height: { value: 1200, rule: "exact" },
        children: [
          new TableCell({ borders: noBorders, width: { size: 4600, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
          new TableCell({ borders: noBorders, width: { size: 4600, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
        ],
      }),
    ],
  });


// ─── FUNZIONE PRINCIPALE ──────────────────────────────────────────────────────
export const generaContrattoNoleggio = ({ mezzo, padroncino, giorno, mese, anno }) => {
  const giornoStr = String(giorno).padStart(2, "0");
  const meseStr   = String(mese);
  const annoStr   = String(anno);

  // Mappa mese testuale → numero per la data firma
  const MESI_NUM = {
    "Gennaio":1,"Febbraio":2,"Marzo":3,"Aprile":4,"Maggio":5,"Giugno":6,
    "Luglio":7,"Agosto":8,"Settembre":9,"Ottobre":10,"Novembre":11,"Dicembre":12,
  };
  const meseNum = MESI_NUM[meseStr] || 1;
  const dataStr = `${giornoStr}/${String(meseNum).padStart(2,"0")}/${annoStr}`;

  const rata      = parseFloat(mezzo.rata_noleggio || 0);
  const limKm     = parseInt(mezzo.limitazioni_km || 3000);
  const targa     = (mezzo.targa || "").toUpperCase();
  const isElett   = (mezzo.alimentazione || "").toLowerCase().includes("elettr");
  const tipoAuto  = isElett ? "elettrico" : "a motore";
  const eccedenza = 0.10;

  const nomePad  = padroncino.nome || "—";
  const sedeLeg  = padroncino.sede_legale || "—";
  const viaLeg   = padroncino.via_sede_legale || "—";
  const piva     = padroncino.partita_iva || "—";
  const rappr    = padroncino.rappresentante || "—";
  const pec      = padroncino.pec || "";
  const rae      = padroncino.rae || "";

  // Riga dati noleggiante (padroncino)
  const noleggiante = [
    t("La ditta "), bold(nomePad),
    t(` con sede legale in ${sedeLeg} alla ${viaLeg}, P.IVA ${piva}`),
    rae ? t(`, numero RAE ${rae}`) : t(""),
    pec ? t(` PEC: ${pec}`) : t(""),
    t(`, rappresentata dalla sig.r `), bold(rappr),
    t(`, nella sua qualità di amministratore Unico, di seguito denominata `),
    t('"noleggiante"', { italics: true }),
  ].filter(r => r.text !== "");

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: SIZE } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // ~2cm
        },
      },
      children: [

        // ── Titolo ─────────────────────────────────────────────────────────
        pCenter([bold("CONTRATTO DI NOLEGGIO DI BREVE TERMINE")], {
          spacing: { after: 340, line: 276 },
        }),

        // ── Data e luogo ───────────────────────────────────────────────────
        p([
          t("Il giorno "), bold(giornoStr),
          t(" del mese di "), bold(meseStr),
          t(`  dell'anno `), bold(annoStr),
          t(", in Rende, alla C. da Coda di Volpe, Zona industriale"),
        ]),

        pCenter([bold("TRA")], { spacing: { before: 160, after: 160 } }),

        // ── Noleggiatrice (dati fissi aziendali) ───────────────────────────
        p([
          t("La Società "), bold("MEDITRANSPORT SUD SRL"),
          t(", con sede legale in Milano (MI), in via Santa Tecla,3 e con sede operativa in via Gino Bartali, zona industriale; P. Iva.03227430786, iscritta nell'albo dei trasportatori per conto terzi al n° MI/888164/E rappresentata dall'Amministratore Unico, sig. Semprevivo Salvatore, nato a Casoria (NA) il 04/11/1959,"),
        ]),
        p([t("di seguito denominata "), t('"noleggiatrice"', { italics: true })]),

        pCenter([bold("E")], { spacing: { before: 160, after: 160 } }),

        // ── Noleggiante (dati padroncino) ──────────────────────────────────
        p(noleggiante),

        pCenter([bold("SI STIPULA E CONVIENE QUANTO SEGUE")], {
          spacing: { before: 200, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000", space: 4 } },
        }),

        // ── Art. 1 ─────────────────────────────────────────────────────────
        p([
          t("1. La parte noleggiatrice concede, a far data dal giorno di sottoscrizione della presente scrittura, in noleggio alla parte noleggiante di"),
        ]),
        p([t(`Nr 1 automezzo ${tipoAuto} di seguito elencato:`)]),

        p([bold(targa)], {
          indent: { left: 720 },
          spacing: { before: 80, after: 80 },
        }),

        p([
          t("1.1  Il nolo di cui trattasi prevede un costo per singolo automezzo di "),
          bold(`${rata.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}+ IVA`),
          t(" con km "),
          bold(`${limKm.toLocaleString("it-IT")} mese inclusi`),
          t(" con eccedenza "),
          bold(`${eccedenza.toFixed(2).replace(".", ",")}€ per km`),
          t("."),
        ], { indent: { left: 360 } }),

        p([t("1.2 La fatturazione sarà posticipata al primo giorno di ogni mese.")]),
        p([t("1.3 Il Noleggiante deve servirsene con la dovuta diligenza e per lo svolgimento dell'attività di Trasporto garantendone la custodia.")]),

        p([t("Sono inclusi nel canone del noleggio la manutenzione ordinaria e straordinaria, soccorso traino, Bollo, assicurazione RCA con casco collisione, con franchigia per singolo sinistro passivo di euro 500,00.")]),
        p([t("Sono, invece, esclusi dal noleggio, la sostituzione degli pneumatici, il veicolo sostitutivo in caso di fermo riparazione, Ad blue, RICARICA ELETTRICA.")]),

        // ── Art. 2 ─────────────────────────────────────────────────────────
        p([t("2. Tutte le spese derivanti dall'utilizzo del suddetto automezzo sono completamente a carico della parte noleggiante, la quale si impegna a mantenerla nello stesso stato di conservazione in cui l'ha ricevuta.")]),
        p([t("Si intendono inoltre a carico della parte noleggiante anche tutte le spese ed ogni altro onere derivante dalla disponibilità e dall'uso del suddetto veicolo.")]),
        p([t("2.1 Si precisa che il contratto di assicurazione R.C.A. continuerà ad essere intestato alla parte noleggiatrice e le tasse di possesso continueranno a riportare l'indicazione della parte noleggiatrice, in quanto proprietario ai sensi di legge dell'autovettura, ma il relativo onere e l'effettivo sostenimento finanziario sarà a totale carico della parte noleggiante; per questo faranno fede i documenti quietanzati che la parte rilascerà a dimostrazione della certezza, dell'effettività e dell'inerenza della spesa;")]),

        // ── Art. 3 ─────────────────────────────────────────────────────────
        p([t('3. Il noleggio di che trattasi è da intendersi a "freddo" nel senso che esso è caratterizzato dalla predisposizione da parte della ditta noleggiante a favore della ditta noleggiatrice, solo dell\'automezzo sopra specificato, corredato da quanto occorre per il perfetto funzionamento.')]),

        // ── Art. 4 ─────────────────────────────────────────────────────────
        p([t("4. La ditta noleggiante deve curare che il mezzo sia idoneo ad eseguire le prestazioni per i quali è stato noleggiato.")]),
        p([t("Codesta rimane responsabile di quei difetti che il mezzo o i mezzi d'opera potrebbero presentare in sede di lavoro.")]),
        p([t("Pertanto, qualsiasi onere connesso al normale funzionamento del mezzo noleggiato pertiene al noleggiante. Di conseguenza si dà il permesso alla ditta noleggiante o a suoi rappresentanti o dipendenti il permesso di accesso in sede in qualsiasi momento per il controllo, la verifica e l'eventuale manutenzione straordinaria dei mezzi noleggiati.")]),

        // ── Art. 5 ─────────────────────────────────────────────────────────
        p([t("5. Per il patto espresso tra le parti, la ditta noleggiante non potrà cedere ad alcuni il presente contratto e la ditta noleggiatrice si impegna a non costituire sub - noleggio del mezzo noleggiato.")]),

        // ── Art. 6 ─────────────────────────────────────────────────────────
        p([t("6. La durata del contratto è temporanea con validità di 30 giorni.")]),

        // ── Art. 7 ─────────────────────────────────────────────────────────
        p([t("7. Per quanto non espressamente previsto nel presente contratto valgono, in quanto applicabili, le norme del Codice civile.")]),

        p([t("Le parti accettano e sottoscrivono gli artt. del presente contratto: 1, 2, 3, 4, 5, 6, 7.")]),

        pCenter([bold("Tutto ciò, Letto confermato e sottoscritto.")], {
          spacing: { before: 240, after: 240 },
        }),

        p([t(`Luogo: Rende, data ${dataStr}`)], {
          spacing: { before: 160, after: 480 },
        }),

        sigTable(),
      ],
    }],
  });

  // ── Download ────────────────────────────────────────────────────────────────
  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `Contratto_Noleggio_${targa}_${meseStr}_${annoStr}.docx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  });
};
