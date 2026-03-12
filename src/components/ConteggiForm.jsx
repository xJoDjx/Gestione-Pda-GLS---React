import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icons";
import { euro, IVA_RATE, PALMARE_TARIFFA_GG, calcAddebitiDettaglio } from "../utils/formatters";

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

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type="text", placeholder="" }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <input type={type} value={value??""} placeholder={placeholder}
      onChange={e => onChange(type==="number" ? (parseFloat(e.target.value)||0) : e.target.value)}
      style={{ padding:"7px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"'DM Mono',monospace" }} />
  </div>
);

const AddBtn = ({ onClick, label }) => (
  <button onClick={onClick}
    style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,background:"#f8fafc",border:"1px dashed #cbd5e1",color:"#475569",fontSize:12,cursor:"pointer" }}>
    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    {label}
  </button>
);

const RemoveBtn = ({ onClick }) => (
  <button onClick={onClick}
    style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"5px 7px",cursor:"pointer",lineHeight:1,flexShrink:0 }}>
    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
);

const SummaryRow = ({ label, value, bold, muted, red, blue }) => (
  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #f1f5f9" }}>
    <span style={{ fontSize:12,color:muted?"#94a3b8":"#374151" }}>{label}</span>
    <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:bold?700:500,
      color:red?"#dc2626":blue?"#1d4ed8":muted?"#94a3b8":"#0f172a" }}>{value}</span>
  </div>
);

const Block = ({ title, children, accent="#3b82f6" }) => (
  <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
    <div style={{ background:"#f8fafc",padding:"10px 14px",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:8 }}>
      <div style={{ width:3,height:14,borderRadius:2,background:accent,flexShrink:0 }} />
      <span style={{ fontSize:12,fontWeight:800,color:"#0f172a",textTransform:"uppercase",letterSpacing:"0.06em" }}>{title}</span>
    </div>
    <div style={{ padding:"14px 16px" }}>{children}</div>
  </div>
);

const Divider = ({ title }) => (
  <div style={{ display:"flex",alignItems:"center",gap:8,padding:"4px 0 2px" }}>
    <span style={{ fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",whiteSpace:"nowrap" }}>{title}</span>
    <div style={{ flex:1,height:1,background:"#e2e8f0" }} />
  </div>
);

// ─── CASSA PRIMA NOTA ─────────────────────────────────────────────────────────
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const ConteggiForm = ({ form, setForm, padroncino, mese, anno, giorni, onSave, embedded, addebiti_standard=[], ricaricheMese={}, mezziFlotta=[], externalTab }) => {
  const [tab, setTab] = useState("riepilogo");
  const set = (key, val) => setForm(f => ({...f,[key]:val}));

  useEffect(() => { if (externalTab) setTab(externalTab); }, [externalTab]);

  const palmariIvato = parseFloat(((form.addebiti_palmari||0)*(1+IVA_RATE)).toFixed(2));

  const prevMezzi = useRef(JSON.stringify(form.dettagli_mezzi));
  useEffect(() => {
    const curr = JSON.stringify(form.dettagli_mezzi);
    if (curr === prevMezzi.current) return;
    prevMezzi.current = curr;
    set("addebiti_mezzi", parseFloat((form.dettagli_mezzi||[]).reduce((s,m)=>s+(m.importo||0),0).toFixed(2)));
  });

  const prevPalmariAna = useRef(null);
  useEffect(() => {
    const palmariAna = padroncino?.palmari||[];
    const key = palmariAna.map(p=>p.seriale+p.stato).join(",");
    if (key === prevPalmariAna.current) return;
    prevPalmariAna.current = key;
    const attivi = palmariAna.filter(p=>p.stato==="ATTIVO").length;
    if (attivi > 0) set("n_palmari", attivi);
  }, [padroncino?.palmari]);

  const mezziElettrici = mezziFlotta.length > 0
    ? mezziFlotta.filter(m=>(m.alimentazione||"").toLowerCase().includes("elettr"))
    : (padroncino?.mezzi||[]).filter(m=>m.stato==="ATTIVO"&&(m.tipologia||"").toUpperCase().includes("ELETTR"));

  const calcolaImportoRicarica = (targa) => {
    const kwhPerTarga = ricaricheMese.kwh_per_targa||{};
    const bolletta = ricaricheMese.bolletta||0;
    const costoExt = ricaricheMese.costo_esterno||0;
    const maggiPct = ricaricheMese.maggiorazione_pct??20;
    const totKwhInt = Object.values(kwhPerTarga).reduce((s,v)=>s+(v.interne||0),0);
    const kwhFattBoll = ricaricheMese.kwh_fatturati_bolletta||totKwhInt;
    const cKwhInt = kwhFattBoll>0 ? bolletta/kwhFattBoll : 0;
    const d = kwhPerTarga[(targa||"").toUpperCase()];
    if (!d) return { importo:0, descrizione:`Ricarica ${targa} — dati kWh mancanti` };
    const ci = parseFloat(((d.interne||0)*cKwhInt).toFixed(2));
    const ce = parseFloat(((d.esterne||0)*costoExt).toFixed(2));
    const imp = parseFloat(((ci+ce)*(1+maggiPct/100)).toFixed(2));
    return { importo:imp, descrizione:`Ricarica ${targa.toUpperCase()}: Int ${(d.interne||0).toFixed(3)}kWh + Ext ${(d.esterne||0).toFixed(3)}kWh (+${maggiPct}%)` };
  };

  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current||!mezziElettrici.length) return;
    initDone.current = true;
    const esistenti = form.ricariche_mezzi||[];
    const targheEsist = new Set(esistenti.map(r=>(r.targa||"").toUpperCase()));
    const nuove = mezziElettrici.filter(m=>!targheEsist.has((m.targa||"").toUpperCase()))
      .map(m=>{ const {importo,descrizione}=calcolaImportoRicarica(m.targa); return {targa:m.targa,descrizione,importo,iva_rate:0.22}; });
    if (nuove.length) set("ricariche_mezzi",[...esistenti,...nuove]);
  });

  const prevRicariche = useRef(JSON.stringify(form.ricariche_mezzi));
  useEffect(() => {
    const curr = JSON.stringify(form.ricariche_mezzi);
    if (curr === prevRicariche.current) return;
    prevRicariche.current = curr;
    set("addebiti_ricariche", parseFloat((form.ricariche_mezzi||[]).reduce((s,r)=>s+(r.importo||0),0).toFixed(2)));
  });

  const cassaNorm = (form.cassa_prima_nota||[]).map(normalizeCassa);
  const updateCassa = (i,v) => { const a=[...cassaNorm]; a[i]=v; set("cassa_prima_nota",a); };
  const removeCassa = (i) => set("cassa_prima_nota",cassaNorm.filter((_,j)=>j!==i));
  const addCassa = () => set("cassa_prima_nota",[...cassaNorm,{cod:"",data:"",importo:0}]);

  const addebitiDet = calcAddebitiDettaglio(form);

  const totComp = (form.compensazioni_distribuzione||0)
    + ((form.fatture_fine_mese||[]).reduce((s,f)=>s+(f.importo||0),0))
    + (cassaNorm.reduce((s,cc)=>s+(cc.importo||0),0));

  const checklistItems = [
    ["distrib_inviata","Distribuzione Inviata"],["fatt_tu_creata","Fattura TU Creata"],
    ["fattura_ricevuta","Fattura Ricevuta"],["pdf_addeb","PDF Addebiti"],
    ["unione_pdf","Unione PDF"],["caricata_scadenziario","Caricata Scadenziario"],
  ];
  const checkDone = checklistItems.filter(([k])=>form[k]).length;

  const thS = { padding:"5px 8px",textAlign:"left",fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",borderBottom:"1px solid #e2e8f0",background:"#f8fafc" };
  const tdS = { padding:"5px 7px",borderBottom:"1px solid #f1f5f9",verticalAlign:"middle" };
  const inpS = { width:"100%",padding:"4px 7px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:11,boxSizing:"border-box",outline:"none",background:"#fff" };
  const monoS = { ...inpS, fontFamily:"'DM Mono',monospace" };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>

      {/* Tab switcher — visibile solo quando embedded (editor gestisce i propri bottoni) */}
      {!embedded && (
        <div style={{ display:"flex",borderRadius:9,border:"1px solid #e2e8f0",overflow:"hidden",alignSelf:"flex-start" }}>
          {[["riepilogo","Riepilogo"],["dettaglio","Dettaglio"]].map(([t,l]) => (
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"8px 22px",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
                background:tab===t?"#1e40af":"#f1f5f9",color:tab===t?"#fff":"#475569",transition:"all 0.15s" }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ══ RIEPILOGO ══ */}
      {tab==="riepilogo" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 280px",gap:14,alignItems:"start" }}>
          {/* Colonna sinistra */}
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <Block title="Fatturato" accent="#3b82f6">
              <SummaryRow label="Totale Spedizioni" value={euro(form.totale_spedizioni||0)} />
              {(form.consegne_doppie||0)!==0 && <SummaryRow label="Consegne Doppie" value={euro(form.consegne_doppie)} red />}
              {(form.consegne_extra||0)!==0 && <SummaryRow label="Consegne Extra" value={euro(form.consegne_extra)} />}
              {(form.sforamento_rientri||0)!==0 && <SummaryRow label="Sforamento Rientri" value={euro(form.sforamento_rientri)} />}
              {(form.compensazioni_imponibile||0)!==0 && <SummaryRow label="Compensazioni Imponibile" value={euro(form.compensazioni_imponibile)} />}
              {(form.voci_fatturato||[]).filter(v=>v.val).map((v,i)=><SummaryRow key={i} label={v.label||"Voce PDA"} value={euro(v.val)} />)}
              {(form.altri_fatturato||[]).filter(v=>v.importo).map((v,i)=><SummaryRow key={i} label={v.descrizione||"Voce extra"} value={euro(v.importo)} />)}
              <div style={{ marginTop:8,paddingTop:8,borderTop:"1px solid #e2e8f0" }}>
                <SummaryRow label="Imponibile" value={euro(form.totale_imponibile)} muted />
                <SummaryRow label="IVA 22%" value={euro(form.iva)} muted />
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"10px 14px",background:"#f1f5f9",borderRadius:8 }}>
                <span style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>Totale Fattura</span>
                <span style={{ fontSize:16,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#1d4ed8" }}>{euro(form.totale_fattura)}</span>
              </div>
            </Block>

            <Block title="Addebiti" accent="#ef4444">
              {(form.addebiti_palmari||0)>0 && <SummaryRow label={`${form.n_palmari}× Palmari × ${giorni}gg (+IVA)`} value={euro(palmariIvato)} />}
              {(form.dettagli_mezzi||[]).filter(m=>m.importo>0).map((m,i)=><SummaryRow key={i} label={`${m.targa} (+IVA)`} value={euro(m.importo_ivato||(m.importo||0)*1.22)} />)}
              {(form.ricariche_mezzi||[]).filter(r=>r.importo>0).map((r,i)=><SummaryRow key={i} label={`⚡ Ricarica ${r.targa}`} value={euro((r.importo||0)*(1+(r.iva_rate??0.22)))} />)}
              {(form.altri_addebiti||[]).filter(a=>a.importo>0).map((a,i)=><SummaryRow key={i} label={a.descrizione||"Addebito"} value={euro((a.importo||0)*(1+(a.iva_rate??0.22)))} />)}
              {addebitiDet.bollo>0 && <SummaryRow label="📮 Bollo virtuale" value={euro(addebitiDet.bollo)} />}
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"10px 14px",background:"#fff1f2",borderRadius:8 }}>
                <span style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>Totale Addebiti</span>
                <span style={{ fontSize:16,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#dc2626" }}>–{euro(form.totale_addebiti)}</span>
              </div>
            </Block>

            {totComp>0 && (
              <Block title="Compensazioni & Deduzioni" accent="#0ea5e9">
                {(form.compensazioni_distribuzione||0)!==0 && <SummaryRow label="Compensaz. su Distribuzione" value={euro(form.compensazioni_distribuzione)} blue />}
                {(form.fatture_fine_mese||[]).filter(f=>(f.importo||0)>0).map((f,i)=><SummaryRow key={i} label={f.descrizione||"Fattura Fine Mese"} value={euro(f.importo)} />)}
                {cassaNorm.filter(cc=>(cc.importo||0)>0).map((cc,i)=><SummaryRow key={i} label={`💰 COD ${cc.cod||"—"}${cc.data?` del ${cc.data}`:""}`} value={euro(cc.importo)} />)}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"10px 14px",background:"#e0f2fe",borderRadius:8 }}>
                  <span style={{ fontSize:12,fontWeight:700,color:"#0369a1" }}>Totale Compensazioni</span>
                  <span style={{ fontSize:14,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#0369a1" }}>–{euro(totComp)}</span>
                </div>
              </Block>
            )}

            {/* DA BONIFICARE */}
            <div style={{ borderRadius:14,border:`2px solid ${form.totale_da_bonificare>=0?"#86efac":"#fca5a5"}`,overflow:"hidden" }}>
              <div style={{ background:"#f8fafc",padding:"12px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",flexDirection:"column",gap:5 }}>
                <SummaryRow label="Totale Fattura" value={euro(form.totale_fattura)} bold blue />
                <SummaryRow label="– Addebiti" value={`–${euro(form.totale_addebiti)}`} red />
                {totComp>0 && <SummaryRow label="– Compensazioni & Deduzioni" value={`–${euro(totComp)}`} muted />}
                {(form.acconto_fattura||0)>0 && <SummaryRow label="– Acconto su Fattura" value={`–${euro(form.acconto_fattura)}`} muted />}
              </div>
              <div style={{ padding:"20px",textAlign:"center",background:form.totale_da_bonificare>=0?"#f0fdf4":"#fff1f2" }}>
                <div style={{ fontSize:11,color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700,letterSpacing:"0.08em" }}>Da Bonificare al Padroncino</div>
                <div style={{ fontSize:40,fontWeight:800,fontFamily:"'DM Mono',monospace",color:form.totale_da_bonificare>=0?"#166534":"#dc2626",letterSpacing:"-0.03em" }}>
                  {euro(form.totale_da_bonificare)}
                </div>
                {form.totale_da_bonificare<0 && <div style={{ fontSize:11,color:"#dc2626",marginTop:6,fontWeight:600 }}>⚠️ Il padroncino ha un saldo negativo</div>}
              </div>
            </div>
          </div>

          {/* Colonna destra */}
          <div style={{ display:"flex",flexDirection:"column",gap:12,position:"sticky",top:12 }}>
            {/* CHECKLIST */}
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
              <div style={{ background:"#f8fafc",padding:"10px 14px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <svg width="13" height="13" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  <span style={{ fontSize:12,fontWeight:800,color:"#0f172a" }}>Checklist</span>
                </div>
                <span style={{ fontSize:11,fontWeight:700,color:"#64748b" }}>({checkDone}/{checklistItems.length})</span>
              </div>
              <div style={{ padding:"10px 12px",display:"flex",flexDirection:"column",gap:6 }}>
                {checklistItems.map(([key,label]) => (
                  <div key={key} onClick={()=>set(key,!form[key])}
                    style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,
                      background:form[key]?"#f0fdf4":"#f8fafc",border:`1px solid ${form[key]?"#86efac":"#e2e8f0"}`,cursor:"pointer" }}>
                    <div style={{ width:18,height:18,borderRadius:5,background:form[key]?"#10b981":"#fff",border:`2px solid ${form[key]?"#10b981":"#d1d5db"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      {form[key] && <svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize:11,fontWeight:600,color:form[key]?"#166534":"#374151",textDecoration:form[key]?"line-through":"none" }}>{label}</span>
                  </div>
                ))}
              </div>
              {checkDone>0 && (
                <div style={{ padding:"0 12px 10px" }}>
                  <div style={{ height:4,background:"#e2e8f0",borderRadius:4,overflow:"hidden" }}>
                    <div style={{ width:`${(checkDone/checklistItems.length)*100}%`,height:"100%",background:"#10b981",borderRadius:4,transition:"width 0.3s" }}/>
                  </div>
                </div>
              )}
            </div>

            {/* OPERAZIONI */}
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
              <div style={{ background:"#f8fafc",padding:"10px 14px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:12,fontWeight:800,color:"#0f172a" }}>📋 Operazioni</span>
                <button onClick={()=>set("ops_mese",[...(form.ops_mese||[]),{id:Date.now(),testo:"",done:false}])}
                  style={{ display:"flex",alignItems:"center",gap:3,padding:"4px 10px",borderRadius:7,background:"#6366f1",color:"#fff",border:"none",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                  + Aggiungi
                </button>
              </div>
              <div style={{ padding:"10px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:56 }}>
                {(form.ops_mese||[]).length===0 && <div style={{ textAlign:"center",padding:"10px 0",color:"#94a3b8",fontSize:12 }}>Nessuna operazione</div>}
                {(form.ops_mese||[]).map((op,i) => (
                  <div key={op.id||i} style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <div onClick={()=>{const ops=[...(form.ops_mese||[])];ops[i]={...ops[i],done:!ops[i].done};set("ops_mese",ops);}}
                      style={{ width:17,height:17,borderRadius:5,border:`2px solid ${op.done?"#10b981":"#d1d5db"}`,background:op.done?"#10b981":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer" }}>
                      {op.done && <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <input value={op.testo||""} onChange={e=>{const ops=[...(form.ops_mese||[])];ops[i]={...ops[i],testo:e.target.value};set("ops_mese",ops);}}
                      placeholder="Descrivi operazione..."
                      style={{ flex:1,padding:"4px 8px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:11,background:"#f8fafc",outline:"none",textDecoration:op.done?"line-through":"none",color:op.done?"#94a3b8":"#374151" }}/>
                    <button onClick={()=>set("ops_mese",(form.ops_mese||[]).filter((_,j)=>j!==i))} style={{ background:"none",border:"none",color:"#cbd5e1",cursor:"pointer",fontSize:16,lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
              {(form.ops_mese||[]).length>0 && (()=>{
                const tot=(form.ops_mese||[]).length; const done=(form.ops_mese||[]).filter(o=>o.done).length; const pct=Math.round((done/tot)*100);
                return (
                  <div style={{ padding:"8px 12px",borderTop:"1px solid #f1f5f9",background:"#f8fafc" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",fontWeight:700,marginBottom:4 }}>
                      <span>{done}/{tot} completate</span><span style={{ color:pct===100?"#166534":"#6366f1" }}>{pct}%</span>
                    </div>
                    <div style={{ background:"#e2e8f0",borderRadius:4,height:4,overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`,height:"100%",background:pct===100?"#10b981":"#6366f1",borderRadius:4,transition:"width 0.3s" }}/>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* NOTE */}
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
              <div style={{ background:"#fffbeb",padding:"8px 14px",borderBottom:"1px solid #fde68a",fontSize:12,fontWeight:800,color:"#92400e" }}>📝 Note</div>
              <textarea value={form.note_varie||""} onChange={e=>set("note_varie",e.target.value)} placeholder="Note operative, promemoria..."
                style={{ width:"100%",minHeight:100,padding:"10px 12px",border:"none",fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",outline:"none",color:"#374151",lineHeight:1.5 }}/>
            </div>
          </div>
        </div>
      )}

      {/* ══ DETTAGLIO ══ */}
      {tab==="dettaglio" && (
        <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
          <Divider title="Fatturato" />
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10 }}>
              <Field label="Totale Spedizioni – Valore Proforma (€)" value={form.totale_spedizioni} onChange={v=>set("totale_spedizioni",v)} type="number" />
              <input value={form.note_spedizioni||""} onChange={e=>set("note_spedizioni",e.target.value)} placeholder="Note spedizioni..."
                style={{ padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:11,color:"#64748b",background:"#fff",outline:"none",width:"100%",boxSizing:"border-box" }} />
              <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>Consegne Doppie (a scalare)</label>
                <input type="number" value={form.consegne_doppie} step="0.01"
                  onChange={e=>{let v=parseFloat(e.target.value)||0;if(v>0)v=-v;set("consegne_doppie",v);}}
                  style={{ width:"100%",border:"1px solid #fca5a5",borderRadius:8,padding:"7px 10px",fontSize:12,boxSizing:"border-box",fontFamily:"'DM Mono',monospace",color:"#dc2626",background:"#fff1f2",outline:"none" }} />
              </div>
              <Field label="Consegne Extra (€)" value={form.consegne_extra} onChange={v=>set("consegne_extra",v)} type="number" />
              <Field label="Sforamento Rientri (€)" value={form.sforamento_rientri} onChange={v=>set("sforamento_rientri",v)} type="number" />
              <Field label="Compensazioni Imponibile (€)" value={form.compensazioni_imponibile} onChange={v=>set("compensazioni_imponibile",v)} type="number" />
              <div>
                <div style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6 }}>Voci da PDA / Extra</div>
                {(form.voci_fatturato||[]).length>0 && (
                  <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0",marginBottom:6 }}>
                    <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <colgroup><col/><col style={{width:90}}/><col/><col style={{width:28}}/></colgroup>
                      <thead><tr>{["Etichetta PDA","Valore €","Note",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(form.voci_fatturato||[]).map((voce,vi)=>(
                          <tr key={vi} style={{background:vi%2===0?"#fff":"#fafafa"}}>
                            <td style={tdS}><input value={voce.label} onChange={e=>{const a=[...(form.voci_fatturato||[])];a[vi]={...a[vi],label:e.target.value};set("voci_fatturato",a);}} placeholder="Etichetta" style={inpS}/></td>
                            <td style={tdS}><input type="number" value={voce.val} step="0.01" onChange={e=>{const a=[...(form.voci_fatturato||[])];a[vi]={...a[vi],val:parseFloat(e.target.value)||0};set("voci_fatturato",a);}} style={monoS}/></td>
                            <td style={tdS}><input value={voce.note||""} onChange={e=>{const a=[...(form.voci_fatturato||[])];a[vi]={...a[vi],note:e.target.value};set("voci_fatturato",a);}} placeholder="note..." style={{...inpS,color:"#64748b"}}/></td>
                            <td style={{...tdS,textAlign:"center"}}><button onClick={()=>set("voci_fatturato",(form.voci_fatturato||[]).filter((_,j)=>j!==vi))} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer"}}>×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <AddBtn onClick={()=>set("voci_fatturato",[...(form.voci_fatturato||[]),{label:"",val:0}])} label="Aggiungi voce PDA" />
              </div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px" }}>
                <div style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Voci Extra Fatturato</div>
                {(form.altri_fatturato||[]).length>0 && (
                  <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0",marginBottom:6 }}>
                    <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <colgroup><col/><col style={{width:90}}/><col/><col style={{width:28}}/></colgroup>
                      <thead><tr>{["Descrizione","Importo €","Note",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(form.altri_fatturato||[]).map((item,i)=>(
                          <tr key={i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                            <td style={tdS}><input value={item.descrizione} onChange={e=>{const a=[...(form.altri_fatturato||[])];a[i]={...a[i],descrizione:e.target.value};set("altri_fatturato",a);}} style={inpS}/></td>
                            <td style={tdS}><input type="number" value={item.importo} step="0.01" onChange={e=>{const a=[...(form.altri_fatturato||[])];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("altri_fatturato",a);}} style={monoS}/></td>
                            <td style={tdS}><input value={item.note||""} onChange={e=>{const a=[...(form.altri_fatturato||[])];a[i]={...a[i],note:e.target.value};set("altri_fatturato",a);}} placeholder="note..." style={{...inpS,color:"#64748b"}}/></td>
                            <td style={{...tdS,textAlign:"center"}}><button onClick={()=>set("altri_fatturato",(form.altri_fatturato||[]).filter((_,j)=>j!==i))} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer"}}>×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <AddBtn onClick={()=>set("altri_fatturato",[...(form.altri_fatturato||[]),{descrizione:"",importo:0}])} label="Aggiungi voce" />
              </div>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px",display:"flex",flexDirection:"column",gap:4 }}>
                <SummaryRow label="Imponibile" value={euro(form.totale_imponibile)} bold />
                <SummaryRow label="IVA 22%" value={euro(form.iva)} muted />
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6,padding:"10px 14px",background:"#f1f5f9",borderRadius:8 }}>
                  <span style={{ fontSize:12,fontWeight:700 }}>Totale Fattura</span>
                  <span style={{ fontSize:16,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#1d4ed8" }}>{euro(form.totale_fattura)}</span>
                </div>
                <div style={{ marginTop:8 }}><Field label="Acconto su Fattura (€)" value={form.acconto_fattura||0} onChange={v=>set("acconto_fattura",v)} type="number" /></div>
              </div>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px" }}>
                <Field label="Fisso Mensile (€)" value={form.fisso_mensile||0} onChange={v=>set("fisso_mensile",v)} type="number" />
              </div>
            </div>
          </div>

          <Divider title="Addebiti" />
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>📱 Palmari</div>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:120 }}><Field label="N° Palmari Attivi" value={form.n_palmari||0} onChange={v=>set("n_palmari",Math.round(v))} type="number" /></div>
                  <div style={{ fontSize:11,color:"#64748b",paddingTop:16,flex:1 }}>
                    {form.n_palmari} × €{PALMARE_TARIFFA_GG}/gg × {giorni}gg = <strong style={{ fontFamily:"'DM Mono',monospace",color:"#0f172a" }}>{euro(form.addebiti_palmari)}</strong>
                    <span style={{ color:"#94a3b8",marginLeft:6 }}>(+IVA: {euro(palmariIvato)})</span>
                  </div>
                </div>
              </div>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>🚛 Mezzi in Noleggio</div>
                {(form.dettagli_mezzi||[]).length>0 && (
                  <div style={{ overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0",marginBottom:10 }}>
                    <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <thead><tr>{["Targa","Importo €","Tipo","Nota","Con IVA",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(form.dettagli_mezzi||[]).map((m,i)=>(
                          <tr key={i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                            <td style={tdS}><input value={m.targa} onChange={e=>{const a=[...form.dettagli_mezzi];a[i]={...a[i],targa:e.target.value};set("dettagli_mezzi",a);}} style={{...monoS,fontWeight:700}}/></td>
                            <td style={tdS}><input type="number" value={m.importo} onChange={e=>{const a=[...form.dettagli_mezzi];const imp=parseFloat(e.target.value)||0;a[i]={...a[i],importo:imp,importo_ivato:parseFloat((imp*1.22).toFixed(2))};set("dettagli_mezzi",a);}} style={monoS}/></td>
                            <td style={tdS}><input value={m.tipologia||""} onChange={e=>{const a=[...form.dettagli_mezzi];a[i]={...a[i],tipologia:e.target.value};set("dettagli_mezzi",a);}} style={inpS}/></td>
                            <td style={tdS}><input value={m.nota||""} onChange={e=>{const a=[...form.dettagli_mezzi];a[i]={...a[i],nota:e.target.value};set("dettagli_mezzi",a);}} style={{...inpS,color:"#64748b"}}/></td>
                            <td style={{...tdS,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12}}>{euro(m.importo_ivato||(m.importo||0)*1.22)}</td>
                            <td style={{...tdS,textAlign:"center"}}><RemoveBtn onClick={()=>set("dettagli_mezzi",form.dettagli_mezzi.filter((_,j)=>j!==i))}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <AddBtn onClick={()=>set("dettagli_mezzi",[...(form.dettagli_mezzi||[]),{targa:"",importo:0,importo_ivato:0,tipologia:"",nota:""}])} label="Aggiungi mezzo" />
                  {(form.dettagli_mezzi||[]).length>0 && <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:700 }}>Tot. mezzi: {euro(form.addebiti_mezzi)}</span>}
                </div>
              </div>
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>⚡ Ricariche Elettrici</div>
                {(()=>{
                  const hasRic=Object.keys(ricaricheMese.kwh_per_targa||{}).length>0;
                  const hasBoll=(ricaricheMese.bolletta||0)>0;
                  if(hasRic&&hasBoll) return <div style={{padding:"7px 10px",background:"#dcfce7",borderRadius:7,fontSize:11,color:"#166534",marginBottom:8}}>✅ Ricariche {mese} {anno} — Bolletta: <strong style={{fontFamily:"'DM Mono',monospace"}}>{euro(ricaricheMese.bolletta)}</strong></div>;
                  return <div style={{padding:"7px 10px",background:"#fef3c7",borderRadius:7,fontSize:11,color:"#92400e",marginBottom:8}}>⚠️ Nessun dato ricariche per {mese} {anno}</div>;
                })()}
                {mezziElettrici.length>0 && (
                  <div style={{padding:"7px 10px",background:"#e0f2fe",borderRadius:7,fontSize:11,color:"#0c4a6e",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span>⚡ {mezziElettrici.map(m=>m.targa).join(", ")}</span>
                    <button onClick={()=>{
                      const esistenti=form.ricariche_mezzi||[];const aggiornate=[...esistenti];
                      mezziElettrici.forEach(m=>{const {importo,descrizione}=calcolaImportoRicarica(m.targa);const idx=aggiornate.findIndex(r=>(r.targa||"").toUpperCase()===(m.targa||"").toUpperCase());
                        if(idx>=0){aggiornate[idx]={...aggiornate[idx],importo,descrizione};}else{aggiornate.push({targa:m.targa,descrizione,importo,iva_rate:0.22});}});
                      set("ricariche_mezzi",aggiornate);
                    }} style={{fontSize:11,padding:"3px 9px",borderRadius:6,background:"#0ea5e9",color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>⚡ Aggiorna da mese</button>
                  </div>
                )}
                {(form.ricariche_mezzi||[]).map((r,i)=>{
                  const rate=r.iva_rate??0.22;
                  return (
                    <div key={i} style={{marginBottom:8}}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <input value={r.targa||""} onChange={e=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],targa:e.target.value};set("ricariche_mezzi",a);}} placeholder="Targa" style={{...monoS,width:76}}/>
                        <input value={r.descrizione||""} onChange={e=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],descrizione:e.target.value};set("ricariche_mezzi",a);}} placeholder="Note" style={{...inpS,flex:1}}/>
                        <input type="number" value={r.importo||0} step="0.01" onChange={e=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("ricariche_mezzi",a);}} style={{...monoS,width:76,textAlign:"right"}}/>
                        <IvaSelect value={rate} onChange={v=>{const a=[...(form.ricariche_mezzi||[])];a[i]={...a[i],iva_rate:v};set("ricariche_mezzi",a);}}/>
                        <RemoveBtn onClick={()=>set("ricariche_mezzi",(form.ricariche_mezzi||[]).filter((_,j)=>j!==i))}/>
                      </div>
                      {rate>0&&r.importo>0 && <div style={{fontSize:10,color:"#0c4a6e",paddingLeft:2,marginTop:2}}>Con IVA {Math.round(rate*100)}%: <strong style={{fontFamily:"'DM Mono',monospace"}}>{euro(withIva(r.importo,rate))}</strong></div>}
                    </div>
                  );
                })}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                  <AddBtn onClick={()=>set("ricariche_mezzi",[...(form.ricariche_mezzi||[]),{targa:"",descrizione:"",importo:0,iva_rate:0.22}])} label="Aggiungi ricarica"/>
                  {(form.ricariche_mezzi||[]).length>0 && <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700}}>Totale: {euro(form.addebiti_ricariche||0)}</span>}
                </div>
              </div>

              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>Altri Addebiti</div>
                {(form.altri_addebiti||[]).length>0 && (
                  <div style={{overflowX:"auto",borderRadius:8,border:"1px solid #e2e8f0",marginBottom:8}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <colgroup><col/><col style={{width:85}}/><col style={{width:88}}/><col style={{width:70}}/><col/><col style={{width:28}}/></colgroup>
                      <thead><tr>{["Descrizione","Importo €","IVA","Conto","Note",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(form.altri_addebiti||[]).map((item,i)=>{
                          const rate=item.iva_rate??0.22; const isTpl=!!item._template_id;
                          return (
                            <tr key={i} style={{background:isTpl?"#faf5ff":i%2===0?"#fff":"#fafafa"}}>
                              <td style={tdS}>
                                {isTpl?(
                                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                                    <span style={{fontSize:10,color:"#7c3aed",background:"#ede9fe",padding:"2px 5px",borderRadius:4,fontWeight:700,whiteSpace:"nowrap"}}>{addebiti_standard.find(t=>t.id===item._template_id)?.prefisso||item.descrizione}</span>
                                    <input value={item._template_variabile||""} onChange={e=>{const a=[...form.altri_addebiti];const tpl=addebiti_standard.find(t=>t.id===item._template_id);a[i]={...a[i],_template_variabile:e.target.value,descrizione:((tpl?.prefisso||"")+e.target.value).trim()};set("altri_addebiti",a);}} placeholder="variabile..." style={{flex:1,padding:"3px 6px",borderRadius:5,border:"1px solid #c4b5fd",fontSize:11,boxSizing:"border-box",minWidth:0}}/>
                                  </div>
                                ):(
                                  <input value={item.descrizione} onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],descrizione:e.target.value};set("altri_addebiti",a);}} style={inpS}/>
                                )}
                              </td>
                              <td style={tdS}>
                                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                                  <input type="number" value={item.importo} step="0.01" onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("altri_addebiti",a);}} style={monoS}/>
                                  {rate>0&&item.importo>0 && <span style={{fontSize:9,color:"#7c3aed",fontFamily:"'DM Mono',monospace"}}>+IVA: {euro(withIva(item.importo,rate))}</span>}
                                </div>
                              </td>
                              <td style={tdS}><IvaSelect value={rate} onChange={v=>{const a=[...form.altri_addebiti];a[i]={...a[i],iva_rate:v};set("altri_addebiti",a);}}/></td>
                              <td style={tdS}><input value={item.conto_voce||""} onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],conto_voce:e.target.value};set("altri_addebiti",a);}} placeholder="620" style={inpS}/></td>
                              <td style={tdS}><input value={item.note||""} onChange={e=>{const a=[...form.altri_addebiti];a[i]={...a[i],note:e.target.value};set("altri_addebiti",a);}} placeholder="note..." style={{...inpS,color:"#64748b"}}/></td>
                              <td style={{...tdS,textAlign:"center"}}><button onClick={()=>set("altri_addebiti",(form.altri_addebiti||[]).filter((_,j)=>j!==i))} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:4,padding:"3px 5px",cursor:"pointer"}}>×</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {addebiti_standard.length>0 && (
                    <select onChange={e=>{if(!e.target.value)return;const tpl=addebiti_standard.find(t=>t.id===e.target.value);if(tpl)set("altri_addebiti",[...(form.altri_addebiti||[]),{descrizione:tpl.prefisso||tpl.nome,importo:tpl.importo_default||0,iva_rate:tpl.iva_rate??0.22,note:"",conto_voce:tpl.conto_voce||"",_template_id:tpl.id,_template_variabile:""}]);e.target.value="";}}
                      style={{padding:"6px 10px",borderRadius:7,border:"1px solid #c4b5fd",fontSize:12,background:"#f5f3ff",color:"#5b21b6",cursor:"pointer",fontWeight:600}}>
                      <option value="">📋 Da template...</option>
                      {addebiti_standard.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  )}
                  <AddBtn onClick={()=>set("altri_addebiti",[...(form.altri_addebiti||[]),{descrizione:"",importo:0,iva_rate:0.22,note:"",conto_voce:""}])} label="Aggiungi addebito"/>
                </div>
              </div>
            </div>
          </div>

          <Divider title="Compensazioni" />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px"}}>
              <Field label="Compensazioni Distribuzione (€)" value={form.compensazioni_distribuzione} onChange={v=>set("compensazioni_distribuzione",v)} type="number"/>
            </div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Fatture Fine Mese</div>
              {(form.fatture_fine_mese||[]).map((item,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <input value={item.descrizione} onChange={e=>{const a=[...form.fatture_fine_mese];a[i]={...a[i],descrizione:e.target.value};set("fatture_fine_mese",a);}} placeholder="Es. FATT. FM 0127" style={{...inpS,flex:1}}/>
                  <input type="number" value={item.importo} onChange={e=>{const a=[...form.fatture_fine_mese];a[i]={...a[i],importo:parseFloat(e.target.value)||0};set("fatture_fine_mese",a);}} style={{...monoS,width:80}}/>
                  <RemoveBtn onClick={()=>set("fatture_fine_mese",form.fatture_fine_mese.filter((_,j)=>j!==i))}/>
                </div>
              ))}
              <AddBtn onClick={()=>set("fatture_fine_mese",[...(form.fatture_fine_mese||[]),{descrizione:"",importo:0}])} label="Aggiungi"/>
            </div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Cassa Prima Nota / Acconti</div>
              {cassaNorm.map((item,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <input value={item.cod||""} onChange={e=>updateCassa(i,{...item,cod:e.target.value})} placeholder="COD" style={{...monoS,width:56,textAlign:"center"}}/>
                  <input type="date" value={item.data||""} onChange={e=>updateCassa(i,{...item,data:e.target.value})} style={{...inpS,width:130}}/>
                  <input type="number" value={item.importo||0} onChange={e=>updateCassa(i,{...item,importo:parseFloat(e.target.value)||0})} style={{...monoS,width:76,textAlign:"right"}}/>
                  <RemoveBtn onClick={()=>removeCassa(i)}/>
                </div>
              ))}
              <AddBtn onClick={addCassa} label="Aggiungi acconto"/>
            </div>
          </div>

          <Divider title="Checklist e Note" />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,paddingBottom:24}}>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Checklist Operativa</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {checklistItems.map(([key,label])=>(
                  <div key={key} onClick={()=>set(key,!form[key])}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:form[key]?"#f0fdf4":"#f8fafc",border:`1px solid ${form[key]?"#86efac":"#e2e8f0"}`,cursor:"pointer"}}>
                    <div style={{width:22,height:22,borderRadius:6,background:form[key]?"#10b981":"#fff",border:`2px solid ${form[key]?"#10b981":"#d1d5db"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {form[key]&&<svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{fontSize:13,fontWeight:600,color:form[key]?"#166534":"#374151",textDecoration:form[key]?"line-through":"none"}}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Note Varie</div>
              <textarea value={form.note_varie||""} onChange={e=>set("note_varie",e.target.value)} placeholder="Note operative, promemoria, situazioni particolari del mese..."
                style={{width:"100%",minHeight:180,padding:"10px 12px",border:"1px solid #e2e8f0",borderRadius:9,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",outline:"none"}}/>
            </div>
          </div>

          <div style={{borderRadius:14,border:`2px solid ${form.totale_da_bonificare>=0?"#86efac":"#fca5a5"}`,overflow:"hidden",marginBottom:16}}>
            <div style={{background:"#f8fafc",padding:"12px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",flexDirection:"column",gap:5}}>
              <SummaryRow label="Totale Fattura" value={euro(form.totale_fattura)} bold blue/>
              <SummaryRow label="– Addebiti" value={`–${euro(form.totale_addebiti)}`} red/>
              {totComp>0 && <SummaryRow label="– Compensazioni" value={`–${euro(totComp)}`} muted/>}
              {(form.acconto_fattura||0)>0 && <SummaryRow label="– Acconto" value={`–${euro(form.acconto_fattura)}`} muted/>}
            </div>
            <div style={{padding:"20px",textAlign:"center",background:form.totale_da_bonificare>=0?"#f0fdf4":"#fff1f2"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6,textTransform:"uppercase",fontWeight:700,letterSpacing:"0.08em"}}>Da Bonificare al Padroncino</div>
              <div style={{fontSize:40,fontWeight:800,fontFamily:"'DM Mono',monospace",color:form.totale_da_bonificare>=0?"#166534":"#dc2626"}}>{euro(form.totale_da_bonificare)}</div>
            </div>
          </div>
        </div>
      )}

      {!embedded && (
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button onClick={onSave} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 22px",borderRadius:9,background:"#1e40af",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            <Icon name="save" size={14}/> Salva Conteggio
          </button>
        </div>
      )}
    </div>
  );
};