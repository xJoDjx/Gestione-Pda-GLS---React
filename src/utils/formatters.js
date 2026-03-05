// ─── COSTANTI ─────────────────────────────────────────────────────────────────
export const IVA_RATE           = 0.22;
export const PALMARE_TARIFFA_GG = 1.99;
export const BOLLO_SOGLIA       = 77.47;
export const BOLLO_IMPORTO      = 2.00;
export const MESI = [
  "GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO",
  "LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"
];

export const euro = (v) =>
  new Intl.NumberFormat("it-IT", { style:"currency", currency:"EUR" }).format(parseFloat(v)||0);

// ─── COLORI ───────────────────────────────────────────────────────────────────
export const durcColor = (s) => {
  if (s==="VALIDO")  return { bg:"#dcfce7", text:"#166534", border:"#86efac" };
  if (s==="SCADUTO") return { bg:"#fee2e2", text:"#991b1b", border:"#fca5a5" };
  if (s==="ESENTE")  return { bg:"#e0f2fe", text:"#0c4a6e", border:"#7dd3fc" };
  return { bg:"#f3f4f6", text:"#6b7280", border:"#d1d5db" };
};
export const dvrColor = durcColor;

export const statoColor = (s) =>
  s==="ATTIVO" ? { bg:"#dcfce7", text:"#166534" } : { bg:"#fef3c7", text:"#92400e" };

export const durcDaysLeft = (scad) => !scad ? null : Math.ceil((new Date(scad)-new Date())/86400000);
export const dvrDaysLeft  = durcDaysLeft;

export const giorniMese = (meseName, anno) => {
  const idx = MESI.indexOf(meseName);
  return idx<0 ? 30 : new Date(anno, idx+1, 0).getDate();
};

// ─── CALCOLO ADDEBITI ─────────────────────────────────────────────────────────
// Restituisce { imponibile, ivato, bollo, totaleConBollo }
// imponibile = somma grezza (per soglia bollo)
// ivato      = ogni voce con la propria aliquota IVA
// bollo      = 2€ se imponibile > 77.47
// totaleConBollo = valore finale da usare nel conteggio
export const calcAddebitiDettaglio = (form) => {
  if (!form) return { imponibile:0, ivato:0, bollo:0, totaleConBollo:0 };
  const wi = (imp, rate) => parseFloat(((imp||0)*(1+(rate??IVA_RATE))).toFixed(2));

  const palmImp = form.addebiti_palmari || 0;
  const mezzImp = form.addebiti_mezzi   || 0;

  // imponibile grezzo (palmari + mezzi + ricariche + altri senza IVA)
  const ricImp   = (form.ricariche_mezzi||[]).reduce((s,r)=>s+(r.importo||0), 0)
                 || (form.addebiti_ricariche||0);
  const altriImp = (form.altri_addebiti||[]).reduce((s,x)=>s+(x.importo||0), 0);
  const imponibile = parseFloat((palmImp+mezzImp+ricImp+altriImp).toFixed(2));

  // ivato per voce
  let ivato = wi(palmImp, IVA_RATE) + wi(mezzImp, IVA_RATE);

  if ((form.ricariche_mezzi||[]).length) {
    ivato += (form.ricariche_mezzi).reduce((s,r)=>s+wi(r.importo||0,r.iva_rate??IVA_RATE),0);
  } else {
    ivato += wi(ricImp, IVA_RATE);
  }
  ivato += (form.altri_addebiti||[]).reduce((s,x)=>s+wi(x.importo||0,x.iva_rate??IVA_RATE),0);
  ivato = parseFloat(ivato.toFixed(2));

  // Bollo SOLO su voci NO IVA (iva_rate === 0): ricariche e altri addebiti senza IVA
  const imponibileNoIva = (
    (form.altri_addebiti||[]).filter(x=>(x.iva_rate??0.22)===0).reduce((s,x)=>s+(x.importo||0),0) +
    (form.ricariche_mezzi||[]).filter(r=>(r.iva_rate??0.22)===0).reduce((s,r)=>s+(r.importo||0),0)
  );
  const bollo = imponibileNoIva > BOLLO_SOGLIA ? BOLLO_IMPORTO : 0;
  const totaleConBollo = parseFloat((ivato+bollo).toFixed(2));

  return { imponibile, ivato, bollo, totaleConBollo, imponibileNoIva };
};

export const calcAddebiti = (form) => calcAddebitiDettaglio(form).imponibile;

export const calcImponibile = (form) => {
  if (!form) return 0;
  return (
    (form.fisso_mensile||0)+(form.totale_spedizioni||0)+(form.totale_ritiri||0)+
    (form.totale_ritiri_fissi||0)+(form.consegne_doppie||0)+(form.consegne_extra||0)+
    (form.sforamento_rientri||0)+(form.compensazioni_imponibile||0)+
    (form.altri_fatturato||[]).reduce((s,x)=>s+(x.importo||0),0)+
    (form.voci_fatturato||[]).reduce((s,x)=>s+(x.val||0),0)
  );
};

export const calcTotali = (form) => {
  const imp     = calcImponibile(form);
  const iva     = parseFloat((imp*IVA_RATE).toFixed(2));
  const totFatt = parseFloat((imp+iva).toFixed(2));
  const { totaleConBollo, bollo } = calcAddebitiDettaglio(form);
  const compDistr = form.compensazioni_distribuzione||0;
  const fineM     = (form.fatture_fine_mese||[]).reduce((s,x)=>s+(x.importo||0),0);
  const cassa     = (form.cassa_prima_nota||[]).reduce((s,x)=>s+(x.importo||0),0);
  const totBon    = parseFloat((totFatt-totaleConBollo-compDistr-fineM-cassa+(form.acconto_fattura||0)).toFixed(2));
  return {
    totale_imponibile:imp, iva, totale_fattura:totFatt,
    totale_addebiti:totaleConBollo,   // ← valore ivato + bollo
    bollo_addebiti:bollo,
    totale_da_bonificare:totBon
  };
};

export const createConteggio = (padroncino, mese, anno) => {
  const mezziAttivi = (padroncino.mezzi||[]).filter(m=>m.stato==="ATTIVO");
  const totMezzi = mezziAttivi.reduce((s,m)=>s+(m.tariffa_mensile||0),0);
  // Carica le voci predefinite dal padroncino
  const vociPDA    = (padroncino.predefinite_fatturato||[]).map(v=>({...v}));
  const vociExtra  = (padroncino.predefinite_altri_fatturato||[]).map(v=>({...v}));
  const vociAddeb  = (padroncino.predefinite_altri_addebiti||[]).map(v=>({...v}));
  // Legge il numero di palmari attivi dall'anagrafica
  const nPalmari   = (padroncino.palmari||[]).filter(p=>p.stato==="ATTIVO").length;
  return {
    padroncino_id:padroncino.id, mese, anno,
    fisso_mensile:0, totale_spedizioni:0, totale_ritiri:0, totale_ritiri_fissi:0,
    consegne_doppie:0, consegne_extra:0, sforamento_rientri:0, compensazioni_imponibile:0,
    altri_fatturato:[...(padroncino.fatturato_template||[]).map(t=>({...t,importo:0})), ...vociExtra],
    voci_fatturato:vociPDA,
    totale_imponibile:0, iva:0, totale_fattura:0, acconto_fattura:0,
    addebiti_palmari:0, addebiti_mezzi:totMezzi, addebiti_ricariche:0,
    ricariche_mezzi:[], altri_addebiti:[...vociAddeb], totale_addebiti:0, bollo_addebiti:0,
    compensazioni_distribuzione:0, fatture_fine_mese:[], cassa_prima_nota:[],
    totale_da_bonificare:0, note_varie:"",
    dettagli_mezzi:mezziAttivi.map(m=>{
      const imp = m.tariffa_mensile||0;
      return {
        targa:m.targa, importo:imp,
        importo_ivato:parseFloat((imp*1.22).toFixed(2)),
        tipologia:m.tipologia, nota:"",
      };
    }),
    n_palmari:nPalmari,
    distrib_inviata:false, pdf_addeb:false, fattura_ricevuta:false,
    fatt_tu_creata:false, unione_pdf:false, caricata_scadenziario:false,
  };
};
