import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icons";
import { SectionCard, Input } from "./BaseComponents";
import { euro, IVA_RATE, PALMARE_TARIFFA_GG, BOLLO_SOGLIA, BOLLO_IMPORTO, calcAddebitiDettaglio } from "../utils/formatters";

// ─── IVA SELECTOR ─────────────────────────────────────────────────────────────
const IvaSelect = ({ value, onChange }) => (
  <select value={value ?? 0.22} onChange={e => onChange(parseFloat(e.target.value))}
    style={{ padding:"6px 8px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:11,background:"#f8fafc",color:"#374151",cursor:"pointer",fontWeight:600,width:88 }}>
    {[["No IVA",0],["IVA 4%",0.04],["IVA 10%",0.10],["IVA 15%",0.15],["IVA 22%",0.22]].map(([l,r]) => (
      <option key={r} value={r}>{l}</option>
    ))}
  </select>
);

const withIva = (imp, rate) => parseFloat(((imp||0) * (1 + (rate??0.22))).toFixed(2));

// ─── CASSA PRIMA NOTA ROW ─────────────────────────────────────────────────────
const CassaRow = ({ item, onChange, onRemove }) => {
  const is = { padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff" };
  return (
    <div style={{ display:"flex",gap:6,alignItems:"center" }}>
      <span style={{ fontSize:11,color:"#94a3b8",whiteSpace:"nowrap",flexShrink:0 }}>Acc. n.v. COD</span>
      <input value={item.cod||""} onChange={e=>onChange({...item,cod:e.target.value})} placeholder="5034"
        style={{...is,width:60,textAlign:"center",fontFamily:"'DM Mono',monospace"}} />
      <span style={{ fontSize:11,color:"#94a3b8",whiteSpace:"nowrap",flexShrink:0 }}>del</span>
      <input type="date" value={item.data||""} onChange={e=>onChange({...item,data:e.target.value})} style={{...is,width:130}} />
      <input type="number" value={item.importo||0} step="0.01" onChange={e=>onChange({...item,importo:parseFloat(e.target.value)||0})}
        style={{...is,width:80,fontFamily:"'DM Mono',monospace",textAlign:"right"}} />
      <span style={{ fontSize:11,color:"#94a3b8" }}>€</span>
      <button onClick={onRemove} style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"5px 7px",cursor:"pointer",flexShrink:0 }}>
        <Icon name="x" size={11}/>
      </button>
    </div>
  );
};

const normalizeCassa = (item) => {
  if (item.cod !== undefined) return item;
  const match = (item.descrizione||"").match(/COD\s+(\S+)\s+del\s+(\S+)/i);
  if (match) {
    const p = match[2].split("/");
    const iso = p.length===3 ? `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}` : "";
    return { cod:match[1], data:iso, importo:item.importo||0 };
  }
  return { cod:"", data:"", importo:item.importo||0 };
};

export const cassaToDesc = (item) => {
  if (!item.cod) return item.descrizione||"";
  const d = item.data ? new Date(item.data) : null;
  const ds = d ? `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}` : (item.data||"");
  return `Acconto non versato COD ${item.cod} del ${ds}`;
};

// ─── CONTEGGI FORM ────────────────────────────────────────────────────────────
export const ConteggiForm = ({ form, setForm, padroncino, mese, anno, giorni, onSave, onSaveTemplate, embedded, addebiti_standard=[], ricaricheMese={}, mezziFlotta=[] }) => {
  const [tab, setTab] = useState("riepilogo");
  const set = (key, val) => setForm(f => ({...f,[key]:val}));

  const tabStyle = (t) => ({
    padding: embedded ? "7px 14px" : "8px 16px", borderRadius:8, border:"none", cursor:"pointer",
    fontSize:12, fontWeight:700,
    background: tab===t ? (embedded?"#0f172a":"#1e40af") : "#f1f5f9",
    color: tab===t ? "#fff" : "#475569", transition:"all 0.15s"
  });

  const palmariIvato = parseFloat(((form.addebiti_palmari||0)*(1+IVA_RATE)).toFixed(2));

  // Auto-calcola totale mezzi quando cambiano i dettagli
  const prevMezzi = useRef(JSON.stringify(form.dettagli_mezzi));
  useEffect(() => {
    const curr = JSON.stringify(form.dettagli_mezzi);
    if (curr === prevMezzi.current) return;
    prevMezzi.current = curr;
    const tot = (form.dettagli_mezzi||[]).reduce((s,m)=>s+(m.importo||0),0);
    set("addebiti_mezzi", parseFloat(tot.toFixed(2)));
  });

  // Auto-sincronizza n_palmari dall'anagrafica padroncino
  const prevPalmariAna = useRef(null);
  useEffect(() => {
    const palmariAna = padroncino?.palmari || [];
    const serialeKey = palmariAna.map(p=>p.seriale+p.stato).join(",");
    if (serialeKey === prevPalmariAna.current) return;
    prevPalmariAna.current = serialeKey;
    const attivi = palmariAna.filter(p => p.stato === "ATTIVO").length;
    if (attivi > 0) set("n_palmari", attivi);
  }, [padroncino?.palmari]);

  // Mezzi elettrici dal padroncino
  // Mezzi elettrici: usa flotta (campo alimentazione), fallback su tipologia embedded nel padroncino
  const mezziElettrici = mezziFlotta.length > 0
    ? mezziFlotta.filter(m => (m.alimentazione||"").toLowerCase().includes("elettr"))
    : (padroncino?.mezzi||[]).filter(m => m.stato==="ATTIVO" && (m.tipologia||"").toUpperCase().includes("ELETTR"));

  // Calcolo importo da ricaricheMese per una targa
  const calcolaImportoRicarica = (targa) => {
    const kwhPerTarga = ricaricheMese.kwh_per_targa || {};
    const bolletta    = ricaricheMese.bolletta || 0;
    const costoExt    = ricaricheMese.costo_esterno || 0;
    const maggiPct    = ricaricheMese.maggiorazione_pct ?? 20;
    const totKwhInt   = Object.values(kwhPerTarga).reduce((s,v) => s + (v.interne||0), 0);
    // Usa kwh_fatturati_bolletta se specificato, altrimenti totale kWh interni CSV
    const kwhFattBoll = ricaricheMese.kwh_fatturati_bolletta || totKwhInt;
    const cKwhInt     = kwhFattBoll > 0 ? bolletta / kwhFattBoll : 0;
    const d = kwhPerTarga[(targa||"").toUpperCase()];
    if (!d) return { importo: 0, descrizione: `Ricarica ${targa} — dati kWh mancanti` };
    const ci   = parseFloat(((d.interne||0) * cKwhInt).toFixed(2));
    const ce   = parseFloat(((d.esterne||0) * costoExt).toFixed(2));
    const base = parseFloat((ci + ce).toFixed(2));
    const imp  = parseFloat((base * (1 + maggiPct/100)).toFixed(2));
    const desc = `Ricarica ${targa.toUpperCase()}: Int ${(d.interne||0).toFixed(3)}kWh + Ext ${(d.esterne||0).toFixed(3)}kWh (+${maggiPct}%)`;
    return { importo: imp, descrizione: desc };
  };

  // Auto-precarica al primo render
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current || !mezziElettrici.length) return;
    initDone.current = true;
    const esistenti      = form.ricariche_mezzi || [];
    const targheEsist    = new Set(esistenti.map(r => (r.targa||"").toUpperCase()));
    const nuove = mezziElettrici
      .filter(m => !targheEsist.has((m.targa||"").toUpperCase()))
      .map(m => {
        const { importo, descrizione } = calcolaImportoRicarica(m.targa);
        return { targa: m.targa, descrizione, importo, iva_rate: 0.22 };
      });
    if (nuove.length) set("ricariche_mezzi", [...esistenti, ...nuove]);
  });

  // Auto-aggiorna totale addebiti ricariche
  const prevRicariche = useRef(JSON.stringify(form.ricariche_mezzi));
  useEffect(() => {
    const curr = JSON.stringify(form.ricariche_mezzi);
    if (curr === prevRicariche.current) return;
    prevRicariche.current = curr;
    const tot = (form.ricariche_mezzi||[]).reduce((s,r)=>s+(r.importo||0),0);
    set("addebiti_ricariche", parseFloat(tot.toFixed(2)));
  });

  const cassaNorm = (form.cassa_prima_nota||[]).map(normalizeCassa);
  const updateCassa = (i,v) => { const a=[...cassaNorm]; a[i]=v; set("cassa_prima_nota",a); };
  const removeCassa = (i) => set("cassa_prima_nota", cassaNorm.filter((_,j)=>j!==i));
  const addCassa    = ()  => set("cassa_prima_nota", [...cassaNorm,{cod:"",data:"",importo:0}]);

  // calcolato live da calcAddebitiDettaglio
  const addebitiDet = calcAddebitiDettaglio(form);

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        {[["riepilogo","📊 Riepilogo"],["fatturato","Fatturato"],["addebiti","Addebiti"],["compensazioni","Compensazioni"],["checklist","Checklist"],["note","Note"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{l}</button>
        ))}
      </div>

      {/* ══ FATTURATO ══ */}
      {tab==="fatturato" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <SectionCard title="Fatturato" icon="euro" accent="#3b82f6">
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <Input label="Totale Spedizioni – Valore Proforma (€)" value={form.totale_spedizioni} onChange={v=>set("totale_spedizioni",v)} />
              <input value={form.note_spedizioni||""} onChange={e=>set("note_spedizioni",e.target.value)}
                placeholder="Note spedizioni (es. rif. distinta, commenti...)"
                style={{ padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:11,color:"#64748b",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box" }} />
              <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                <label style={{ fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>Consegne Doppie (a scalare)</label>
                <div style={{ position:"relative" }}>
                  <input type="number" value={form.consegne_doppie} step="0.01"
                    onChange={e=>{let v=parseFloat(e.target.value)||0; if(v>0)v=-v; set("consegne_doppie",v);}}
                    style={{ width:"100%",border:"1px solid #fca5a5",borderRadius:8,padding:"8px 12px",fontSize:13,boxSizing:"border-box",fontFamily:"'DM Mono',monospace",color:"#dc2626",background:"#fff1f2",outline:"none" }} />
                  <span style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"#dc2626",fontWeight:700 }}>– neg.</span>
                </div>
              </div>
              <div style={{ borderTop:"1px solid #f1f5f9",paddingTop:10 }}>
                <div style={{ fontSize:11,color:"#64748b",marginBottom:8,fontWeight:700,textTransform:"uppercase" }}>Voci da PDA / Extra</div>
                  {(form.voci_fatturato||[]).length > 0 && (
                    <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0" }}>
                      <table style={{ width:"100%",borderCollapse:"collapse" }}>
                        <colgroup><col/><col style={{ width:90 }}/><col/><col style={{ width:28 }}/></colgroup>
                        <thead>
                          <tr style={{ background:"#f8fafc" }}>
                            {["Etichetta PDA","Valore €","Note",""].map(h=>(
                              <th key={h} style={{ padding:"5px 7px",textAlign:"left",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(form.voci_fatturato||[]).map((voce,vi)=>(
                            <tr key={vi} style={{ background:vi%2===0?"#fff":"#fafafa" }}>
                              <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                                <input value={voce.label} onChange={e=>{const a=[...(form.voci_fatturato||[])];a[vi]={...a[vi],label:e.target.value};set("voci_fatturato",a);}}
                                  placeholder="Etichetta" style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box" }} />
                              </td>
                              <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                                <input type="number" value={voce.val} step="0.01" onChange={e=>{const a=[...(form.voci_fatturato||[])];a[vi]={...a[vi],val:parseFloat(e.target.value)||0};set("voci_fatturato",a);}}
                                  style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,fontFamily:"'DM Mono',monospace",boxSizing:"border-box" }} />
                              </td>
                              <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                                <input value={voce.note||""} onChange={e=>{const a=[...(form.voci_fatturato||[])];a[vi]={...a[vi],note:e.target.value};set("voci_fatturato",a);}}
                                  placeholder="note..." style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,color:"#64748b",boxSizing:"border-box" }} />
                              </td>
                              <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9",textAlign:"center" }}>
                                <button onClick={()=>set("voci_fatturato",(form.voci_fatturato||[]).filter((_,j)=>j!==vi))}
                                  style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 5px",cursor:"pointer",lineHeight:1 }}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                <button onClick={()=>set("voci_fatturato",[...(form.voci_fatturato||[]),{label:"",val:0}])}
                  style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer" }}>
                  <Icon name="plus" size={13}/> Aggiungi voce PDA
                </button>
              </div>
            </div>
          </SectionCard>

          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <SectionCard title="Voci Extra Fatturato" icon="note" accent="#8b5cf6" compact>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {(form.altri_fatturato||[]).length > 0 && (
                <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <colgroup><col/><col style={{ width:90 }}/><col/><col style={{ width:28 }}/></colgroup>
                    <thead>
                      <tr style={{ background:"#f8fafc" }}>
                        {["Descrizione","Importo €","Note",""].map(h=>(
                          <th key={h} style={{ padding:"5px 7px",textAlign:"left",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(form.altri_fatturato||[]).map((item,i)=>(
                        <tr key={i} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input value={item.descrizione} onChange={e=>{const a=[...(form.altri_fatturato||[])];a[i]={...a[i],descrizione:e.target.value};set("altri_fatturato",a);}}
                              placeholder="Descrizione" style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input type="number" value={item.importo} step="0.01" onChange={e=>{const a=[...(form.altri_fatturato||[])];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("altri_fatturato",a);}}
                              style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,fontFamily:"'DM Mono',monospace",boxSizing:"border-box" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input value={item.note||""} onChange={e=>{const a=[...(form.altri_fatturato||[])];a[i]={...a[i],note:e.target.value};set("altri_fatturato",a);}}
                              placeholder="note..." style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,color:"#64748b",boxSizing:"border-box" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9",textAlign:"center" }}>
                            <button onClick={()=>set("altri_fatturato",(form.altri_fatturato||[]).filter((_,j)=>j!==i))}
                              style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 5px",cursor:"pointer",lineHeight:1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>set("altri_fatturato",[...(form.altri_fatturato||[]),{descrizione:"",importo:0}])}
                  style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer" }}>
                  <Icon name="plus" size={13}/> Aggiungi voce
                </button>
                {/* mantieni qui il bottone template se c'era */}
              </div>
            </div>
            </SectionCard>

            <SectionCard title="Totale Imponibile (Auto)" icon="calculator" accent="#3b82f6" compact>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {[["Imponibile",form.totale_imponibile,"#0f172a"],["IVA 22%",form.iva,"#64748b"]].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"1px solid #f1f5f9" }}>
                    <span style={{ color:"#64748b" }}>{l}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:600,color:c }}>{euro(v)}</span>
                  </div>
                ))}
                <div style={{ padding:"10px",borderRadius:8,background:"#dbeafe",textAlign:"center",marginTop:4 }}>
                  <div style={{ fontSize:10,color:"#1d4ed8",fontWeight:700,textTransform:"uppercase" }}>Totale Fattura</div>
                  <div style={{ fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#1d4ed8" }}>{euro(form.totale_fattura)}</div>
                </div>
                <Input label="Acconto su Fattura (€)" value={form.acconto_fattura||0} onChange={v=>set("acconto_fattura",v)} small />
              </div>
            </SectionCard>
          </div>

        </div>
      )}

      {/* ══ ADDEBITI ══ */}
      {tab==="addebiti" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>

          {/* Palmari */}
          <SectionCard title="Palmari" icon="device" accent="#f59e0b">
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {/* n_palmari si aggiorna automaticamente dall'anagrafica se ci sono palmari assegnati */}
              <Input label="Numero Palmari Attivi" value={form.n_palmari||0} onChange={v=>set("n_palmari",Math.round(parseFloat(v)||0))} />
              {(padroncino?.palmari||[]).length > 0 && (
                <div style={{ fontSize:11,color:"#92400e",padding:"5px 10px",background:"#fffbeb",borderRadius:7,border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:5 }}>
                  📱 <span>Da anagrafica: <strong>{(padroncino?.palmari||[]).filter(p=>p.stato==="ATTIVO").length} attivi</strong> — valore caricato automaticamente</span>
                </div>
              )}
              <div style={{ padding:"10px 12px",background:"#fffbeb",borderRadius:8,fontSize:12,color:"#92400e" }}>
                {form.n_palmari} × €{PALMARE_TARIFFA_GG}/gg × {giorni}gg = <strong>{euro(form.addebiti_palmari)}</strong>
                <span style={{ color:"#64748b" }}> (+IVA: {euro(palmariIvato)})</span>
              </div>
            </div>
          </SectionCard>

          {/* Mezzi */}
          <SectionCard title="Mezzi in Noleggio" icon="truck" accent="#ef4444">
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>

              {/* Tabella compatta */}
              {(form.dettagli_mezzi||[]).length > 0 && (
                <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #f1f5f9" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse",tableLayout:"fixed" }}>
                    <colgroup>
                      <col style={{ width:90 }} />   {/* Targa */}
                      <col style={{ width:90 }} />   {/* Imponibile */}
                      <col style={{ width:100 }} />  {/* Tipologia */}
                      <col />                         {/* Nota */}
                      <col style={{ width:90 }} />   {/* Con IVA */}
                      <col style={{ width:28 }} />   {/* × */}
                    </colgroup>
                    <thead>
                      <tr style={{ background:"#f8fafc" }}>
                        {["Targa","Imp. €","Tipologia","Nota","Con IVA",""].map(h=>(
                          <th key={h} style={{ padding:"5px 7px",textAlign:"left",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(form.dettagli_mezzi||[]).map((m,i)=>(
                        <tr key={i} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input value={m.targa} onChange={e=>{const a=[...form.dettagli_mezzi];a[i]={...a[i],targa:e.target.value};set("dettagli_mezzi",a);}}
                              placeholder="Targa" style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700,boxSizing:"border-box" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input type="number" value={m.importo} onChange={e=>{const a=[...form.dettagli_mezzi];a[i]={...a[i],importo:parseFloat(e.target.value)||0,importo_ivato:parseFloat(((parseFloat(e.target.value)||0)*1.22).toFixed(2))};set("dettagli_mezzi",a);}}
                              style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box",fontFamily:"'DM Mono',monospace" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input value={m.tipologia||""} onChange={e=>{const a=[...form.dettagli_mezzi];a[i]={...a[i],tipologia:e.target.value};set("dettagli_mezzi",a);}}
                              placeholder="tipo..." style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input value={m.nota||""} onChange={e=>{const a=[...form.dettagli_mezzi];a[i]={...a[i],nota:e.target.value};set("dettagli_mezzi",a);}}
                              placeholder="nota facoltativa..." style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box",color:"#64748b" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9",textAlign:"right" }}>
                            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:700,color:"#dc2626" }}>
                              {euro(m.importo_ivato||(m.importo||0)*1.22)}
                            </span>
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9",textAlign:"center" }}>
                            <button onClick={()=>set("dettagli_mezzi",(form.dettagli_mezzi||[]).filter((_,j)=>j!==i))}
                              style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 5px",cursor:"pointer",lineHeight:1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottone aggiungi */}
              <button onClick={()=>set("dettagli_mezzi",[...(form.dettagli_mezzi||[]),{targa:"",importo:0,importo_ivato:0,tipologia:"",nota:""}])}
                style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer",alignSelf:"flex-start" }}>
                <Icon name="plus" size={13}/> Aggiungi mezzo
              </button>

              {/* Totale */}
              {(form.dettagli_mezzi||[]).length > 0 && (
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#fee2e2",borderRadius:8,fontSize:12,marginTop:2 }}>
                  <span style={{ fontWeight:700,color:"#dc2626" }}>
                    Totale {(form.dettagli_mezzi||[]).length} mezzi (imponibile)
                  </span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:800,color:"#dc2626" }}>
                    {euro(form.addebiti_mezzi||0)}
                  </span>
                </div>
              )}

            </div>
          </SectionCard>

          {/* Ricariche elettrici */}
          <SectionCard title="Ricariche Mezzi Elettrici" icon="euro" accent="#0ea5e9">
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {(() => {
                const hasRic=Object.keys(ricaricheMese.kwh_per_targa||{}).length>0;
                const hasBoll=(ricaricheMese.bolletta||0)>0;
                if(hasRic&&hasBoll) return (
                  <div style={{ padding:"8px 12px",background:"#dcfce7",borderRadius:8,fontSize:12,color:"#166534",display:"flex",alignItems:"center",gap:6 }}>
                    ✅ Ricariche {mese} {anno} caricate — Bolletta: <strong style={{ fontFamily:"'DM Mono',monospace" }}>{euro(ricaricheMese.bolletta||0)}</strong>
                    {(ricaricheMese.costo_esterno||0)>0 && <span> · €/kWh ext: <strong>{(ricaricheMese.costo_esterno||0).toFixed(4)}</strong></span>}
                  </div>
                );
                return (
                  <div style={{ padding:"8px 12px",background:"#fef3c7",borderRadius:8,fontSize:12,color:"#92400e",display:"flex",alignItems:"center",gap:6 }}>
                    ⚠️ Nessun dato ricariche per {mese} {anno}. Vai in <strong>Ricariche Elettriche</strong> per importare.
                  </div>
                );
              })()}
              {mezziElettrici.length>0 && (
                <div style={{ padding:"8px 12px",background:"#e0f2fe",borderRadius:8,fontSize:12,color:"#0c4a6e",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span>⚡ {mezziElettrici.map(m=>m.targa).join(", ")}</span>
                  <button onClick={() => {
                    const esistenti = form.ricariche_mezzi || [];
                    // Per ogni mezzo elettrico: aggiorna se già presente, altrimenti aggiunge
                    const aggiornate = [...esistenti];
                    mezziElettrici.forEach(m => {
                      const { importo, descrizione } = calcolaImportoRicarica(m.targa);
                      const idx = aggiornate.findIndex(r => (r.targa||"").toUpperCase() === (m.targa||"").toUpperCase());
                      if (idx >= 0) {
                        aggiornate[idx] = { ...aggiornate[idx], importo, descrizione };
                      } else {
                        aggiornate.push({ targa: m.targa, descrizione, importo, iva_rate: 0.22 });
                      }
                    });
                    set("ricariche_mezzi", aggiornate);
                  }} style={{ fontSize:11,padding:"4px 10px",borderRadius:6,background:"#0ea5e9",color:"#fff",border:"none",cursor:"pointer",fontWeight:700 }}>
                    ⚡ Ricarica da mese
                  </button>
                </div>
              )}

              {(form.ricariche_mezzi||[]).length>0 && (
                <div style={{ display:"grid",gridTemplateColumns:"80px 1fr 80px 88px 28px",gap:6,fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase" }}>
                  <span>Targa</span><span>Note</span><span>Importo</span><span>IVA</span><span/>
                </div>
              )}
              {(form.ricariche_mezzi||[]).length===0 && <div style={{ color:"#94a3b8",fontSize:12,textAlign:"center",padding:"10px 0" }}>Nessuna ricarica</div>}

              {(form.ricariche_mezzi||[]).map((r,i) => {
                const rate = r.iva_rate??0.22;
                return (
                  <div key={i} style={{ display:"flex",flexDirection:"column",gap:3 }}>
                    <div style={{ display:"grid",gridTemplateColumns:"80px 1fr 80px 88px 28px",gap:6,alignItems:"center" }}>
                      <input value={r.targa||""} onChange={e=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],targa:e.target.value};set("ricariche_mezzi",a);}}
                        placeholder="Targa" style={{ padding:"6px 8px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,fontFamily:"'DM Mono',monospace" }} />
                      <input value={r.descrizione||""} onChange={e=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],descrizione:e.target.value};set("ricariche_mezzi",a);}}
                        placeholder="Note" style={{ padding:"6px 8px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12 }} />
                      <input type="number" value={r.importo||0} step="0.01" onChange={e=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("ricariche_mezzi",a);}}
                        style={{ padding:"6px 8px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,fontFamily:"'DM Mono',monospace",textAlign:"right" }} />
                      <IvaSelect value={rate} onChange={v=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],iva_rate:v};set("ricariche_mezzi",a);}} />
                      <button onClick={() => set("ricariche_mezzi",(form.ricariche_mezzi||[]).filter((_,j)=>j!==i))}
                        style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"5px 6px",cursor:"pointer" }}>
                        <Icon name="x" size={11}/>
                      </button>
                    </div>
                    {rate>0 && r.importo>0 && (
                      <div style={{ fontSize:10,color:"#0c4a6e",paddingLeft:4 }}>
                        Con IVA {Math.round(rate*100)}%: <strong style={{ fontFamily:"'DM Mono',monospace" }}>{euro(withIva(r.importo,rate))}</strong>
                      </div>
                    )}
                  </div>
                );
              })}

              <button onClick={() => set("ricariche_mezzi",[...(form.ricariche_mezzi||[]),{targa:"",descrizione:"",importo:0,iva_rate:0.22}])}
                style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer" }}>
                <Icon name="plus" size={13}/> Aggiungi ricarica
              </button>
              {(form.ricariche_mezzi||[]).length>0 && (
                <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 10px",background:"#e0f2fe",borderRadius:8,fontSize:12 }}>
                  <span style={{ fontWeight:700,color:"#0c4a6e" }}>Totale ricariche (imponibile)</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:800,color:"#0c4a6e" }}>{euro(form.addebiti_ricariche||0)}</span>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Altri addebiti — con note e IVA selezionabile */}
          <SectionCard title="Altri Addebiti" icon="note" accent="#8b5cf6" compact>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {(form.altri_addebiti||[]).length > 0 && (
                <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <colgroup>
                      <col/>                          {/* Descrizione */}
                      <col style={{ width:85 }}/>     {/* Importo */}
                      <col style={{ width:88 }}/>     {/* IVA */}
                      <col style={{ width:85 }}/>     {/* Conto voce */}
                      <col/>                          {/* Note */}
                      <col style={{ width:28 }}/>     {/* × */}
                    </colgroup>
                    <thead>
                      <tr style={{ background:"#f8fafc" }}>
                        {["Descrizione","Importo €","IVA","Conto","Note",""].map(h=>(
                          <th key={h} style={{ padding:"5px 7px",textAlign:"left",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(form.altri_addebiti||[]).map((item,i)=>{
                        const rate = item.iva_rate ?? 0.22;
                        const isTemplate = !!item._template_id;
                        return (
                          <tr key={i} style={{ background: isTemplate ? "#faf5ff" : i%2===0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                              {isTemplate ? (
                                <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                                  <span style={{ fontSize:10,color:"#7c3aed",background:"#ede9fe",padding:"2px 5px",borderRadius:4,fontWeight:700,whiteSpace:"nowrap" }}>
                                    {addebiti_standard.find(t=>t.id===item._template_id)?.prefisso||item.descrizione}
                                  </span>
                                  <input value={item._template_variabile||""} onChange={e=>{
                                    const a=[...form.altri_addebiti];
                                    const tpl=addebiti_standard.find(t=>t.id===item._template_id);
                                    a[i]={...a[i],_template_variabile:e.target.value,descrizione:((tpl?.prefisso||"")+e.target.value).trim()};
                                    set("altri_addebiti",a);
                                  }} placeholder="variabile..." style={{ flex:1,padding:"3px 6px",borderRadius:5,border:"1px solid #c4b5fd",fontSize:11,boxSizing:"border-box",minWidth:0 }} />
                                </div>
                              ) : (
                                <input value={item.descrizione} onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],descrizione:e.target.value};set("altri_addebiti",a);}}
                                  placeholder="Descrizione" style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box" }} />
                              )}
                            </td>
                            <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                              <div style={{ display:"flex",flexDirection:"column",gap:1 }}>
                                <input type="number" value={item.importo} step="0.01" onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("altri_addebiti",a);}}
                                  style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,fontFamily:"'DM Mono',monospace",boxSizing:"border-box" }} />
                                {rate>0 && item.importo>0 && (
                                  <span style={{ fontSize:9,color:"#7c3aed",fontFamily:"'DM Mono',monospace" }}>+IVA: {euro(withIva(item.importo,rate))}</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                              <IvaSelect value={rate} onChange={v=>{const a=[...form.altri_addebiti];a[i]={...a[i],iva_rate:v};set("altri_addebiti",a);}} />
                            </td>
                            <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                              <input value={item.conto_voce||""} onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],conto_voce:e.target.value};set("altri_addebiti",a);}}
                                placeholder="es. 620" style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box" }} />
                            </td>
                            <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                              <input value={item.note||""} onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],note:e.target.value};set("altri_addebiti",a);}}
                                placeholder="note..." style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,color:"#64748b",boxSizing:"border-box" }} />
                            </td>
                            <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9",textAlign:"center" }}>
                              <button onClick={()=>set("altri_addebiti",(form.altri_addebiti||[]).filter((_,j)=>j!==i))}
                                style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 5px",cursor:"pointer",lineHeight:1 }}>×</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {addebiti_standard.length>0 && (
                  <select onChange={e=>{
                    if(!e.target.value) return;
                    const tpl = addebiti_standard.find(t=>t.id===e.target.value);
                    if(tpl) set("altri_addebiti",[...(form.altri_addebiti||[]),{
                      descrizione:tpl.prefisso||tpl.nome, importo:tpl.importo_default||0,
                      iva_rate:tpl.iva_rate??0.22, note:"", conto_voce:tpl.conto_voce||"",
                      _template_id:tpl.id, _template_variabile:""
                    }]);
                    e.target.value="";
                  }} style={{ padding:"6px 10px",borderRadius:7,border:"1px solid #c4b5fd",fontSize:12,background:"#f5f3ff",color:"#5b21b6",cursor:"pointer",fontWeight:600 }}>
                    <option value="">📋 Inserisci da template...</option>
                    {addebiti_standard.map(t=>(
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                )}
                <button onClick={() => set("altri_addebiti",[...(form.altri_addebiti||[]),{descrizione:"",importo:0,iva_rate:0.22,note:"",conto_voce:""}])}
                  style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer" }}>
                  <Icon name="plus" size={13}/> Aggiungi addebito
                </button>
              </div>
            </div>
          </SectionCard>


        </div>
      )}

      {/* ══ COMPENSAZIONI ══ */}
      {tab==="compensazioni" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <SectionCard title="Compensazioni su Distribuzione" icon="euro" accent="#0ea5e9">
            <Input label="Compensazioni e Addebiti su Distribuzione (€)" value={form.compensazioni_distribuzione} onChange={v=>set("compensazioni_distribuzione",v)} />
          </SectionCard>

          <SectionCard title="Fatture Fine Mese / Altre" icon="note" accent="#10b981">
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {(form.fatture_fine_mese||[]).length > 0 && (
                <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <colgroup><col/><col style={{ width:100 }}/><col style={{ width:28 }}/></colgroup>
                    <thead>
                      <tr style={{ background:"#f8fafc" }}>
                        {["Descrizione / Rif. Fattura","Importo €",""].map(h=>(
                          <th key={h} style={{ padding:"5px 7px",textAlign:"left",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(form.fatture_fine_mese||[]).map((item,i)=>(
                        <tr key={i} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input value={item.descrizione} onChange={e=>{const a=[...form.fatture_fine_mese];a[i]={...a[i],descrizione:e.target.value};set("fatture_fine_mese",a);}}
                              placeholder="Es. FATTURA FINE MESE 0127/FM" style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9" }}>
                            <input type="number" value={item.importo} step="0.01" onChange={e=>{const a=[...form.fatture_fine_mese];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("fatture_fine_mese",a);}}
                              style={{ width:"100%",padding:"3px 6px",borderRadius:5,border:"1px solid #e2e8f0",fontSize:11,fontFamily:"'DM Mono',monospace",boxSizing:"border-box" }} />
                          </td>
                          <td style={{ padding:"4px 5px",borderBottom:"1px solid #f1f5f9",textAlign:"center" }}>
                            <button onClick={()=>set("fatture_fine_mese",form.fatture_fine_mese.filter((_,j)=>j!==i))}
                              style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 5px",cursor:"pointer",lineHeight:1 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button onClick={()=>set("fatture_fine_mese",[...(form.fatture_fine_mese||[]),{descrizione:"",importo:0}])}
                style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer" }}>
                <Icon name="plus" size={13}/> Aggiungi fattura
              </button>
            </div>
          </SectionCard>




          <SectionCard title="Cassa Prima Nota / Acconti non Versati" icon="euro" accent="#f59e0b">
            <div style={{ fontSize:11,color:"#92400e",background:"#fffbeb",borderRadius:7,padding:"6px 10px",marginBottom:8,fontWeight:600 }}>
              💰 Gli acconti qui inseriti vengono scalati dal totale da bonificare come compensazioni
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {cassaNorm.length>0 && (
                <div style={{ display:"flex",gap:6,paddingBottom:4,borderBottom:"1px solid #f1f5f9",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase" }}>
                  <span style={{ width:100 }}>Acc. n.v. COD</span>
                  <span style={{ width:60,marginLeft:4 }}>Codice</span>
                  <span style={{ flex:1,marginLeft:4 }}>del (data)</span>
                  <span style={{ width:80,textAlign:"right" }}>Importo</span>
                  <span style={{ width:24 }}/>
                </div>
              )}
              {cassaNorm.map((item,i) => (
                <CassaRow key={i} item={item} onChange={v=>updateCassa(i,v)} onRemove={()=>removeCassa(i)} />
              ))}
              <button onClick={addCassa}
                style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer" }}>
                <Icon name="plus" size={13}/> Aggiungi acconto
              </button>
              {cassaNorm.length>0 && (
                <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 10px",background:"#fffbeb",borderRadius:8,fontSize:12,marginTop:4 }}>
                  <span style={{ fontWeight:700,color:"#92400e" }}>Totale cassa (da scalare)</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:800,color:"#dc2626" }}>–{euro(cassaNorm.reduce((s,r)=>s+(r.importo||0),0))}</span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══ RIEPILOGO ══ */}
      {tab==="riepilogo" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:14, alignItems:"start" }}>

        {/* ── Colonna sinistra: riepilogo numerico ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>

          {/* ─── FATTURATO ─────────────────────────────────────────────── */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #dbeafe",overflow:"hidden" }}>
            <div style={{ background:"#eff6ff",padding:"10px 16px",borderBottom:"1px solid #dbeafe",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontSize:12,fontWeight:800,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:"0.06em" }}>📈 Fatturato</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:800,color:"#1d4ed8" }}>{euro(form.totale_fattura)}</div>
            </div>
            <div style={{ padding:"12px 16px",display:"flex",flexDirection:"column",gap:3 }}>
              {/* Voci base */}
              {[
                ["Totale Spedizioni / Proforma", form.totale_spedizioni||0, form.note_spedizioni],
                ["Consegne Doppie", form.consegne_doppie||0, null],
                ["Consegne Extra", form.consegne_extra||0, null],
                ["Sforamento Rientri", form.sforamento_rientri||0, null],
                ["Compensazioni su Imponibile", form.compensazioni_imponibile||0, null],
              ].filter(([,v])=>v!==0).map(([l,v,nota])=>(
                <div key={l} style={{ display:"flex",flexDirection:"column",padding:"3px 4px" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"#374151" }}>{l}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#1d4ed8" }}>{euro(v)}</span>
                  </div>
                  {nota && <div style={{ fontSize:10,color:"#94a3b8",paddingLeft:6,fontStyle:"italic" }}>{nota}</div>}
                </div>
              ))}
              {/* Voci PDA */}
              {(form.voci_fatturato||[]).filter(v=>(v.val||0)!==0).map((v,i)=>(
                <div key={i} style={{ display:"flex",flexDirection:"column",padding:"3px 8px",background:"#f0f9ff",borderRadius:6,marginTop:1 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"#0369a1" }}>{v.label||"PDA Extra"}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#0369a1" }}>{euro(v.val||0)}</span>
                  </div>
                  {v.note && <div style={{ fontSize:10,color:"#94a3b8",fontStyle:"italic" }}>{v.note}</div>}
                </div>
              ))}
              {/* Voci extra fatturato */}
              {(form.altri_fatturato||[]).filter(v=>(v.importo||0)!==0).map((v,i)=>(
                <div key={i} style={{ display:"flex",flexDirection:"column",padding:"3px 8px",background:"#faf5ff",borderRadius:6,marginTop:1 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"#6d28d9" }}>{v.descrizione||"Extra"}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#6d28d9" }}>{euro(v.importo||0)}</span>
                  </div>
                  {v.note && <div style={{ fontSize:10,color:"#a78bfa",fontStyle:"italic" }}>{v.note}</div>}
                </div>
              ))}
              {/* Subtotale imponibile + IVA */}
              <div style={{ borderTop:"1px solid #dbeafe",marginTop:6,paddingTop:6,display:"flex",flexDirection:"column",gap:2 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                  <span style={{ color:"#64748b" }}>Imponibile</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700 }}>{euro(form.totale_imponibile)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                  <span style={{ color:"#64748b" }}>IVA 22%</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#64748b" }}>{euro(form.iva)}</span>
                </div>
                {(form.acconto_fattura||0)>0 && (
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"#64748b" }}>– Acconto su Fattura</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#dc2626" }}>–{euro(form.acconto_fattura)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── ADDEBITI ─────────────────────────────────────────────── */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #fecaca",overflow:"hidden" }}>
            <div style={{ background:"#fef2f2",padding:"10px 16px",borderBottom:"1px solid #fecaca",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontSize:12,fontWeight:800,color:"#dc2626",textTransform:"uppercase",letterSpacing:"0.06em" }}>📤 Addebiti</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:800,color:"#dc2626" }}>–{euro(form.totale_addebiti)}</div>
            </div>
            <div style={{ padding:"12px 16px",display:"flex",flexDirection:"column",gap:6 }}>

              {/* ── Noleggio Palmari ── */}
              {(form.addebiti_palmari||0)>0 && (
                <>
                  <div style={{ fontSize:10,fontWeight:800,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>Noleggio Palmari</div>
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#fffbeb",borderRadius:6,fontSize:12,marginTop:-2 }}>
                    <span style={{ color:"#92400e",fontWeight:600 }}>📱 {form.n_palmari||0}× Palmari × {giorni} gg (+IVA 22%)</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#92400e" }}>{euro(palmariIvato)}</span>
                  </div>
                </>
              )}

              {/* ── Mezzi in noleggio ── */}
              {(form.dettagli_mezzi||[]).filter(m=>(m.importo||0)>0).length>0 && (
                <>
                  <div style={{ fontSize:10,fontWeight:800,color:"#dc2626",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>Mezzi in Noleggio</div>
                  {(form.dettagli_mezzi||[]).filter(m=>(m.importo||0)>0).map((m,i)=>(
                    <div key={i} style={{ display:"flex",flexDirection:"column",padding:"4px 8px",background:"#fff1f2",borderRadius:6,marginTop:-2 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                        <span style={{ color:"#dc2626",fontWeight:600 }}>🚛 Noleggio Mezzo {m.targa}{m.tipologia?` (${m.tipologia})`:""} (+IVA 22%)</span>
                        <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#dc2626" }}>{euro(m.importo_ivato||(m.importo||0)*1.22)}</span>
                      </div>
                      {m.nota && <div style={{ fontSize:10,color:"#f87171",fontStyle:"italic",paddingLeft:4 }}>{m.nota}</div>}
                    </div>
                  ))}
                </>
              )}

              {/* ── Ricariche Elettriche ── */}
              {(form.ricariche_mezzi||[]).filter(r=>(r.importo||0)>0).length>0 && (
                <>
                  <div style={{ fontSize:10,fontWeight:800,color:"#0c4a6e",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>Ricariche Elettriche</div>
                  {(form.ricariche_mezzi||[]).filter(r=>(r.importo||0)>0).map((r,i)=>{
                    const rate=r.iva_rate??0.22;
                    return (
                      <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#e0f2fe",borderRadius:6,fontSize:12,marginTop:-2 }}>
                        <span style={{ color:"#0c4a6e",fontWeight:600 }}>⚡ Ricarica Elettrica Mezzo {r.targa}{r.descrizione?` — ${r.descrizione}`:""}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#0c4a6e" }}>{euro(parseFloat(((r.importo||0)*(1+rate)).toFixed(2)))}</span>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── Altri Addebiti ── */}
              {((form.altri_addebiti||[]).filter(a=>(a.importo||0)>0).length>0||addebitiDet.bollo>0) && (
                <>
                  <div style={{ fontSize:10,fontWeight:800,color:"#5b21b6",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>Altri Addebiti</div>
                  {(form.altri_addebiti||[]).filter(a=>(a.importo||0)>0).map((a,i)=>{
                    const rate=a.iva_rate??0.22;
                    return (
                      <div key={i} style={{ display:"flex",flexDirection:"column",padding:"4px 8px",background:"#f5f3ff",borderRadius:6,marginTop:-2 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                          <span style={{ color:"#5b21b6",fontWeight:600 }}>{a.descrizione||"Addebito"}{a.conto_voce?` [${a.conto_voce}]`:""}</span>
                          <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#5b21b6" }}>{euro(parseFloat(((a.importo||0)*(1+rate)).toFixed(2)))}</span>
                        </div>
                        {a.note && <div style={{ fontSize:10,color:"#a78bfa",fontStyle:"italic",paddingLeft:4 }}>{a.note}</div>}
                      </div>
                    );
                  })}
                  {addebitiDet.bollo>0 && (
                    <div style={{ display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#fffbeb",borderRadius:6,border:"1px solid #fde68a",fontSize:12,marginTop:-2 }}>
                      <span style={{ color:"#92400e",fontWeight:600 }}>📮 Bollo virtuale</span>
                      <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#92400e" }}>{euro(addebitiDet.bollo)}</span>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

          {/* ─── COMPENSAZIONI & DEDUZIONI ───────────────────────────── */}
          {((form.compensazioni_distribuzione||0)!==0||(form.fatture_fine_mese||[]).some(f=>(f.importo||0)>0 || f.descrizione)||cassaNorm.some(cc=>(cc.importo||0)>0)) && (() => {
            const totComp=(form.compensazioni_distribuzione||0)
              +((form.fatture_fine_mese||[]).reduce((s,f)=>s+(f.importo||0),0))
              +(cassaNorm.reduce((s,cc)=>s+(cc.importo||0),0));
            return (
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #bae6fd",overflow:"hidden" }}>
              <div style={{ background:"#f0f9ff",padding:"10px 16px",borderBottom:"1px solid #bae6fd",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontSize:12,fontWeight:800,color:"#0369a1",textTransform:"uppercase",letterSpacing:"0.06em" }}>⚖️ Compensazioni & Deduzioni</div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:800,color:"#0369a1" }}>–{euro(totComp)}</div>
              </div>
              <div style={{ padding:"12px 16px",display:"flex",flexDirection:"column",gap:6 }}>

                {/* Compensazioni distribuzione */}
                {(form.compensazioni_distribuzione||0)!==0 && (
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#f0f9ff",borderRadius:6,fontSize:12 }}>
                    <span style={{ color:"#0369a1",fontWeight:600 }}>Compensaz. su Distribuzione</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#0369a1" }}>{euro(form.compensazioni_distribuzione)}</span>
                  </div>
                )}

                {/* Fatture fine mese */}
                {(form.fatture_fine_mese||[]).filter(f=>(f.importo||0)>0).length>0 && (
                  <>
                    <div style={{ fontSize:10,fontWeight:800,color:"#166534",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>Fatture Fine Mese / Altre</div>
                    {(form.fatture_fine_mese||[]).filter(f=>(f.importo||0)>0).map((f,i)=>(
                      <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#f0fdf4",borderRadius:6,fontSize:12,marginTop:-2 }}>
                        <span style={{ color:"#166534",fontWeight:600 }}>{f.descrizione||"Fattura Fine Mese"}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#166534" }}>{euro(f.importo)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Cassa prima nota */}
                {cassaNorm.filter(cc=>(cc.importo||0)>0).length>0 && (
                  <>
                    <div style={{ fontSize:10,fontWeight:800,color:"#854d0e",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>Cassa Prima Nota / Acconti non Versati</div>
                    {cassaNorm.filter(cc=>(cc.importo||0)>0).map((cc,i)=>(
                      <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#fefce8",borderRadius:6,border:"1px solid #fde68a",fontSize:12,marginTop:-2 }}>
                        <span style={{ color:"#854d0e",fontWeight:600 }}>💰 Acconto non versato COD {cc.cod||"—"}{cc.data?` del ${cc.data}`:""}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#854d0e" }}>–{euro(cc.importo||0)}</span>
                      </div>
                    ))}
                  </>
                )}

              </div>
            </div>
            );
          })()}

          {/* ─── TOTALE DA BONIFICARE ────────────────────────────────── */}
          {(() => {
            const totComp=(form.compensazioni_distribuzione||0)
              +((form.fatture_fine_mese||[]).reduce((s,f)=>s+(f.importo||0),0))
              +(cassaNorm.reduce((s,cc)=>s+(cc.importo||0),0));
            return (
            <div style={{ borderRadius:14,border:`2px solid ${form.totale_da_bonificare>=0?"#86efac":"#fca5a5"}`,overflow:"hidden" }}>
              <div style={{ background:"#f8fafc",padding:"12px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",flexDirection:"column",gap:5 }}>
                <div style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em" }}>🏁 Calcolo Finale</div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                  <span style={{ color:"#64748b" }}>Totale Fattura</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#1d4ed8" }}>{euro(form.totale_fattura)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                  <span style={{ color:"#64748b" }}>– Addebiti (IVA + Bollo inclusi)</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#dc2626" }}>{euro(-(form.totale_addebiti||0))}</span>
                </div>
                {totComp>0 && (
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"#64748b" }}>– Compensazioni & Deduzioni</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#0369a1" }}>{euro(-totComp)}</span>
                  </div>
                )}
                {(form.acconto_fattura||0)>0 && (
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12 }}>
                    <span style={{ color:"#64748b" }}>– Acconto su Fattura</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#64748b" }}>{euro(-(form.acconto_fattura||0))}</span>
                  </div>
                )}
              </div>
              <div style={{ padding:"20px",textAlign:"center",background:form.totale_da_bonificare>=0?"#dcfce7":"#fee2e2" }}>
                <div style={{ fontSize:11,color:"#64748b",marginBottom:4,textTransform:"uppercase",fontWeight:700,letterSpacing:"0.08em" }}>Da Bonificare al Padroncino</div>
                <div style={{ fontSize:42,fontWeight:800,fontFamily:"'DM Mono',monospace",color:form.totale_da_bonificare>=0?"#166534":"#dc2626",letterSpacing:"-0.03em" }}>
                  {euro(form.totale_da_bonificare)}
                </div>
                {form.totale_da_bonificare<0 && (
                  <div style={{ fontSize:11,color:"#dc2626",marginTop:4,fontWeight:600 }}>{"⚠️ Il padroncino ha un saldo negativo"}</div>
                )}
              </div>
            </div>
            );
          })()}

        </div>
        {/* ── fine colonna sinistra riepilogo ── */}

        {/* ── Colonna destra: Operazioni + Note ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:10,position:"sticky",top:12 }}>

          {/* Operazioni del mese */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
            <div style={{ background:"#f8fafc",padding:"10px 14px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontSize:12,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.06em" }}>📋 Operazioni</div>
              <button
                onClick={() => set("ops_mese", [...(form.ops_mese||[]), {id:Date.now(),testo:"",done:false}])}
                style={{ display:"flex",alignItems:"center",gap:3,padding:"4px 10px",borderRadius:7,background:"#6366f1",color:"#fff",border:"none",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                + Aggiungi
              </button>
            </div>
            <div style={{ padding:"10px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:60 }}>
              {(form.ops_mese||[]).length===0 && (
                <div style={{ textAlign:"center",padding:"14px 0",color:"#94a3b8",fontSize:12 }}>
                  Nessuna operazione.<br/>Clicca + Aggiungi.
                </div>
              )}
              {(form.ops_mese||[]).map((op,i) => (
                <div key={op.id||i} style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div onClick={() => { const ops=[...(form.ops_mese||[])]; ops[i]={...ops[i],done:!ops[i].done}; set("ops_mese",ops); }}
                    style={{ width:18,height:18,borderRadius:5,border:`2px solid ${op.done?"#10b981":"#d1d5db"}`,background:op.done?"#10b981":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer" }}>
                    {op.done&&<svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <input value={op.testo||""} onChange={e=>{ const ops=[...(form.ops_mese||[])]; ops[i]={...ops[i],testo:e.target.value}; set("ops_mese",ops); }}
                    placeholder="Descrivi operazione..."
                    style={{ flex:1,padding:"4px 8px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:12,background:"#f8fafc",outline:"none",textDecoration:op.done?"line-through":"none",color:op.done?"#94a3b8":"#374151" }}/>
                  <button onClick={()=>set("ops_mese",(form.ops_mese||[]).filter((_,j)=>j!==i))}
                    style={{ background:"none",border:"none",color:"#cbd5e1",cursor:"pointer",padding:"2px 4px",fontSize:16,lineHeight:1,flexShrink:0 }}>×</button>
                </div>
              ))}
            </div>
            {(form.ops_mese||[]).length>0&&(()=>{
              const tot=(form.ops_mese||[]).length;
              const done=(form.ops_mese||[]).filter(o=>o.done).length;
              const pct=Math.round((done/tot)*100);
              return(
                <div style={{ padding:"8px 12px",borderTop:"1px solid #f1f5f9",background:"#f8fafc" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",fontWeight:700,marginBottom:4 }}>
                    <span>{done}/{tot} completate</span>
                    <span style={{ color:pct===100?"#166534":"#6366f1" }}>{pct}%</span>
                  </div>
                  <div style={{ background:"#e2e8f0",borderRadius:4,height:5,overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`,height:"100%",background:pct===100?"#10b981":"#6366f1",borderRadius:4,transition:"width 0.3s" }}/>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Note veloci */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
            <div style={{ background:"#fffbeb",padding:"8px 14px",borderBottom:"1px solid #fde68a",fontSize:12,fontWeight:800,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.06em" }}>
              📝 Note rapide
            </div>
            <textarea value={form.note_varie||""} onChange={e=>set("note_varie",e.target.value)}
              placeholder="Note operative, promemoria, situazioni particolari del mese..."
              style={{ width:"100%",minHeight:110,padding:"10px 12px",border:"none",fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",outline:"none",color:"#374151",lineHeight:1.5 }}/>
          </div>
        </div>
        {/* ── fine colonna destra ── */}

        </div>
      )}{/* ── fine riepilogo ── */}

            {/* ══ CHECKLIST — solo 4 voci ══ */}
      {tab==="checklist" && (
        <SectionCard title="Checklist Operativa" icon="check" accent="#10b981">
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            {[
              ["distrib_inviata","Distribuzione Inviata"],
              ["fatt_tu_creata","Fattura TU Creata"],
              ["fattura_ricevuta","Fattura Ricevuta"],
              ["pdf_addeb","PDF Addebiti Preparato"],
            ].map(([key,label]) => (
              <div key={key} onClick={() => set(key,!form[key])}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 18px",borderRadius:12,background:form[key]?"#f0fdf4":"#f8fafc",border:`1px solid ${form[key]?"#86efac":"#e2e8f0"}`,cursor:"pointer" }}>
                <div style={{ width:30,height:30,borderRadius:8,background:form[key]?"#10b981":"#fff",border:`2px solid ${form[key]?"#10b981":"#d1d5db"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {form[key] && <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize:13,fontWeight:600,color:form[key]?"#166534":"#374151" }}>{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* NOTE */}
      {tab==="note" && (
        <SectionCard title="Note Varie" icon="note" accent="#8b5cf6">
          <textarea value={form.note_varie||""} onChange={e=>set("note_varie",e.target.value)} placeholder="Note operative..."
            style={{ width:"100%",minHeight:180,padding:"12px 14px",border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit" }} />
        </SectionCard>
      )}

      {!embedded && (
        <div style={{ display:"flex",justifyContent:"flex-end" }}>
          <button onClick={onSave} style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 22px",borderRadius:9,background:"#1e40af",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer" }}>
            <Icon name="save" size={14}/> Salva Conteggio
          </button>
        </div>
      )}
    </div>
  );
};
