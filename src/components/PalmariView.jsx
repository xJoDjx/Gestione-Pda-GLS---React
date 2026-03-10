import { useState, useRef } from "react";
import { Icon } from "./Icons";
import { euro, durcDaysLeft } from "../utils/formatters";

// ─── COSTANTI ─────────────────────────────────────────────────────────────────
const MODELLI  = ["Zebra TC52","Zebra TC57","Zebra TC72","Zebra TC77","Honeywell CT60","Honeywell EDA51","Datalogic Memor 20","Unitech EA630","Altro"];
const STATI    = ["DISPONIBILE","ASSEGNATO","GUASTO","DISMESSO"];
const ETI_DOC  = ["Contratto assegnazione","Verbale consegna","Scheda tecnica","Garanzia","Altro"];

const bgS  = { DISPONIBILE:"#dcfce7", ASSEGNATO:"#dbeafe", GUASTO:"#fef3c7", DISMESSO:"#f3f4f6" };
const colS = { DISPONIBILE:"#166534", ASSEGNATO:"#1d4ed8", GUASTO:"#92400e", DISMESSO:"#6b7280" };

// ─── MINI UI ──────────────────────────────────────────────────────────────────
const Inp = ({ label, value, onChange, type="text", placeholder="", small }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <input type={type} value={value??""} placeholder={placeholder}
      onChange={e => onChange(type==="number" ? (parseFloat(e.target.value)||0) : e.target.value)}
      style={{ padding:small?"6px 9px":"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:small?12:13,background:"#fff",boxSizing:"border-box",width:"100%",outline:"none" }}/>
  </div>
);
const Sel = ({ label, value, onChange, options }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <select value={value??""} onChange={e=>onChange(e.target.value)}
      style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",cursor:"pointer" }}>
      <option value="">—</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── STORICO ──────────────────────────────────────────────────────────────────
const TRACK = [
  ["stato","Stato"],["padroncino_id","Padroncino"],
  ["tariffa_mensile","Tariffa mensile"],["data_assegnazione","Data assegnazione"],["data_fine","Fine assegnazione"],
];
const buildStorico = (old, neo, pads, utente = "") => {
  const ts = new Date().toISOString();
  const data = new Date().toLocaleDateString("it-IT");
  return TRACK.reduce((acc,[k,label])=>{
    const vo = String(old[k]??""), vn = String(neo[k]??"");
    if (vo===vn) return acc;
    let da=vo||"—", a=vn||"—";
    if (k==="padroncino_id"){
      da = pads.find(p=>p.id===vo)?.nome||(vo?"—":"Nessuno");
      a  = pads.find(p=>p.id===vn)?.nome||(vn?"—":"Nessuno");
    }
    if (k==="tariffa_mensile"){ da=euro(parseFloat(vo)||0); a=euro(parseFloat(vn)||0); }
    acc.push({ts,data,campo:label,da,a,utente});
    return acc;
  },[]);
};

// ─── DETTAGLIO ────────────────────────────────────────────────────────────────
const PalmareDetail = ({ palmare, padroncini, onSave, onBack, onDelete, utente = "" }) => {
  const [form,      setForm]      = useState({...palmare});
  const baseline = useRef({ ...palmare });  // FIX 1
  const [tab,       setTab]       = useState("info");
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const storico  = form.storico   || [];
  const docs     = form.documenti || [];
  const padAss   = padroncini.find(p=>p.id===form.padroncino_id);

  const handlePadChange = pid => {
    set("padroncino_id", pid);
    if (pid && form.stato==="DISPONIBILE") set("stato","ASSEGNATO");
    if (!pid && form.stato==="ASSEGNATO")  set("stato","DISPONIBILE");
  };

  const handleSave = () => {
    const nuoviLog = buildStorico(baseline.current, form, padroncini, utente);
    const saved = { ...form, storico: [...(form.storico || []), ...nuoviLog] };
    if (saved.padroncino_id && saved.stato === "DISPONIBILE") saved.stato = "ASSEGNATO";
    if (!saved.padroncino_id && saved.stato === "ASSEGNATO")  saved.stato = "DISPONIBILE";
    baseline.current = { ...saved };  // FIX 1: aggiorna punto di riferimento
    setForm(saved);                   // FIX 2: storico visibile immediatamente
    onSave(saved, nuoviLog);          // FIX 3: passa nuovi log al parent
  };

  const addDoc = () => {
    const inp = document.createElement("input");
    inp.type="file"; inp.accept=".pdf,.jpg,.jpeg,.png,.doc,.docx";
    inp.onchange = e => {
      const f=e.target.files[0]; if(!f) return;
      const r=new FileReader();
      r.onload = ev => set("documenti",[...docs,{id:`DOC_${Date.now()}`,nome:f.name,tipo:f.type,
        dimensione:f.size,data_caricamento:new Date().toISOString().split("T")[0],data_b64:ev.target.result,etichetta:""}]);
      r.readAsDataURL(f);
    };
    inp.click();
  };
  const rmDoc  = id => set("documenti",docs.filter(d=>d.id!==id));
  const dlDoc  = d  => { const a=document.createElement("a"); a.href=d.data_b64; a.download=d.nome; a.click(); };

  const sc = {bg:bgS[form.stato]||"#f3f4f6", color:colS[form.stato]||"#6b7280"};

  const tabBtn = (t,label) => (
    <button key={t} onClick={()=>setTab(t)} style={{
      padding:"8px 14px",borderRadius:9,border:"1px solid #e2e8f0",
      background:tab===t?"#6366f1":"#fff",color:tab===t?"#fff":"#374151",
      fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",
    }}>{label}</button>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      {/* Header */}
      <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,background:"#f1f5f9",border:"none",color:"#475569",cursor:"pointer",fontSize:12,fontWeight:600 }}>
            <Icon name="back" size={14}/> Indietro
          </button>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:"#0f172a" }}>
              📱 {form.seriale||"Nuovo Palmare"}
              {(form.modello_custom||form.modello)&&<span style={{ fontSize:13,fontWeight:500,color:"#64748b",marginLeft:8 }}>— {form.modello_custom||form.modello}</span>}
            </div>
            <div style={{ fontSize:12,color:"#64748b",marginTop:2 }}>
              {padAss ? `Assegnato a: ${padAss.nome}` : "Non assegnato"}
            </div>
          </div>
          <span style={{ background:sc.bg,color:sc.color,padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:700 }}>{form.stato||"—"}</span>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>{if(window.confirm("Eliminare questo palmare?"))onDelete(palmare.id);}}
            style={{ padding:"8px 14px",borderRadius:8,background:"#fee2e2",color:"#dc2626",border:"none",fontSize:12,fontWeight:700,cursor:"pointer" }}>Elimina</button>
          <button onClick={handleSave}
            style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 18px",borderRadius:9,background:"#6366f1",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer" }}>
            <Icon name="save" size={14}/> Salva
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        {tabBtn("info","📱 Scheda")}
        {tabBtn("storico",`📜 Storico${storico.length>0?` (${storico.length})`:""}`)}
        {tabBtn("docs",`📄 Documenti${docs.length>0?` (${docs.length})`:""}`)}
      </div>

      {/* ═══ SCHEDA ═══ */}
      {tab==="info" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>

          {/* Dati */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>📱 Dati Palmare</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <Inp label="Seriale / ID" value={form.seriale} onChange={v=>set("seriale",v)} placeholder="SN-123456" small />
              <Sel label="Stato" value={form.stato} onChange={v=>set("stato",v)} options={STATI} />
              <Sel label="Modello" value={form.modello} onChange={v=>set("modello",v)} options={MODELLI} />
              <Inp label="Modello personalizzato" value={form.modello_custom} onChange={v=>set("modello_custom",v)} placeholder="es. Zebra TC21" small />
            </div>
            <div style={{ marginTop:10 }}>
              <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",display:"block",marginBottom:4 }}>Note</label>
              <textarea value={form.note||""} onChange={e=>set("note",e.target.value)} rows={3} placeholder="Note..."
                style={{ width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,resize:"vertical",outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}/>
            </div>
          </div>

          {/* Assegnazione */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>🔗 Assegnazione & Tariffe</div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",display:"block",marginBottom:4 }}>Padroncino Assegnato</label>
                <select value={form.padroncino_id||""} onChange={e=>handlePadChange(e.target.value)}
                  style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",cursor:"pointer",width:"100%" }}>
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p=>p.stato==="ATTIVO").map(p=>(
                    <option key={p.id} value={p.id}>{p.nome}{p.codice?` (${p.codice})`:""}</option>
                  ))}
                </select>
                {padAss && (
                  <div style={{ marginTop:6,padding:"8px 10px",background:"#dbeafe",borderRadius:7,fontSize:11,color:"#1d4ed8",fontWeight:600 }}>
                    ✅ Assegnato a: {padAss.nome}
                  </div>
                )}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <Inp label="Tariffa Mensile (€)" value={form.tariffa_mensile} onChange={v=>set("tariffa_mensile",v)} type="number" small />
                <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                  <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>+ IVA 22%</label>
                  <div style={{ padding:"6px 9px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#f8fafc",fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#166534" }}>
                    {euro((form.tariffa_mensile||0)*1.22)}
                  </div>
                </div>
                <Inp label="Data Assegnazione" value={form.data_assegnazione} onChange={v=>set("data_assegnazione",v)} type="date" small />
                <Inp label="Fine Assegnazione"  value={form.data_fine}        onChange={v=>set("data_fine",v)}        type="date" small />
              </div>
              {form.data_fine && (()=>{
                const days=durcDaysLeft(form.data_fine);
                if(days===null||days>60) return null;
                return <div style={{ padding:"8px 10px",background:days<0?"#fee2e2":"#fffbeb",borderRadius:7,fontSize:11,fontWeight:700,color:days<0?"#dc2626":"#92400e" }}>
                  {days<0?`⚠️ Contratto scaduto da ${-days} giorni`:`⏰ Contratto scade tra ${days} giorni`}
                </div>;
              })()}
            </div>
          </div>

          {/* Riepilogo economico */}
          <div style={{ gridColumn:"1/-1",background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12 }}>💰 Riepilogo Economico</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
              {[["Tariffa netta mensile",euro(form.tariffa_mensile||0),"#374151"],
                ["Tariffa + IVA 22%",euro((form.tariffa_mensile||0)*1.22),"#166534"],
                ["Tariffa annuale",euro((form.tariffa_mensile||0)*12),"#0ea5e9"]].map(([l,v,c])=>(
                <div key={l} style={{ padding:"12px 14px",background:"#f8fafc",borderRadius:9,border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",marginBottom:4 }}>{l}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:16,color:c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ STORICO ═══ */}
      {tab === "storico" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>📜 Storico — {form.seriale || "—"}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{(form.storico || []).length} eventi · aggiornamento in tempo reale</div>
            </div>
            {(form.storico || []).length > 0 && (
              <button onClick={() => { if (window.confirm("Cancellare lo storico?")) { setForm(f => ({...f, storico:[]})); baseline.current = {...baseline.current, storico:[]}; }}}
                style={{ padding:"6px 12px", borderRadius:7, background:"#fee2e2", color:"#dc2626", border:"none", fontSize:11, fontWeight:700, cursor:"pointer" }}>Cancella</button>
            )}
          </div>

          {/* Nota manuale */}
          <div style={{ padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={notaCampo} onChange={e => setNotaCampo(e.target.value)} placeholder="Tipo nota (Smarrimento, Riparazione...)"
                style={{ width: 210, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff" }} />
              <input value={notaTesto} onChange={e => setNotaTesto(e.target.value)} placeholder="Descrizione nota..."
                style={{ flex: 1, minWidth: 180, padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff" }} />
              <button onClick={() => {
                if (!notaTesto.trim()) return;
                const nota = { ts: new Date().toISOString(), data: new Date().toLocaleDateString("it-IT"), campo: notaCampo.trim() || "Nota", da: "—", a: notaTesto.trim(), utente, manuale: true };
                setForm(f => ({ ...f, storico: [...(f.storico || []), nota] }));
                setNotaCampo(""); setNotaTesto("");
              }} style={{ padding: "6px 16px", borderRadius: 7, background: "#6366f1", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Nota
              </button>
            </div>
          </div>

          {(form.storico || []).length === 0 ? (
            <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
              <div style={{ fontSize: 13 }}>Nessuna modifica registrata</div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "155px 130px 115px 1fr", background: "#f8fafc", borderBottom: "2px solid #e2e8f0", padding: "8px 16px" }}>
                {["Data / Ora","Utente","Azione","Descrizione"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
                ))}
              </div>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {[...(form.storico || [])].reverse().map((e, i) => {
                  const isManuale = e.manuale;
                  const isPad     = e.campo === "Padroncino";
                  const isStato   = e.campo === "Stato";
                  const isDoc     = (e.campo || "").toLowerCase().includes("documento");
                  const azione    = isManuale ? "Nota" : isPad ? "Assegnazione" : isStato ? "Cambio Stato" : isDoc ? "Documento" : "Modifica";
                  const acMeta = {
                    "Nota":         { bg:"#f5f3ff", color:"#6d28d9", dot:"#8b5cf6" },
                    "Assegnazione": { bg:"#fef3c7", color:"#92400e", dot:"#f59e0b" },
                    "Cambio Stato": { bg:"#fffbeb", color:"#854d0e", dot:"#f59e0b" },
                    "Documento":    { bg:"#ecfdf5", color:"#065f46", dot:"#10b981" },
                    "Modifica":     { bg:"#eff6ff", color:"#1d4ed8", dot:"#3b82f6" },
                  }[azione] || { bg:"#f1f5f9", color:"#374151", dot:"#94a3b8" };

                  const descrizione = isManuale
                    ? `${e.campo !== "Nota" ? e.campo + ": " : ""}${e.a}`
                    : isPad
                      ? (e.a && e.a !== "—" && e.a !== "Nessuno"
                          ? `Assegnato al padroncino "${e.a}"`
                          : `Rimosso dal padroncino "${e.da}"`)
                      : isDoc
                        ? (e.campo.includes("aggiunto") ? `Aggiunto: ${e.a}` : `Rimosso: ${e.da}`)
                        : `${e.campo}: ${e.da || "—"} → ${e.a || "—"}`;

                  const dt = e.ts ? new Date(e.ts) : null;
                  const dataOra = dt
                    ? dt.toLocaleDateString("it-IT") + " " + dt.toLocaleTimeString("it-IT", { hour:"2-digit", minute:"2-digit", second:"2-digit" })
                    : (e.data || "—");

                  return (
                    <div key={i} style={{ display:"grid", gridTemplateColumns:"155px 130px 115px 1fr", padding:"9px 16px", borderBottom:"1px solid #f8fafc", background: i%2===0?"#fff":"#fafbfc", alignItems:"center" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#64748b", lineHeight:1.4 }}>{dataOra}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        {e.utente ? (
                          <>
                            <div style={{ width:22, height:22, borderRadius:"50%", background:"#6366f1", color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              {e.utente[0].toUpperCase()}
                            </div>
                            <div style={{ fontSize:11, fontWeight:600, color:"#374151" }}>{e.utente}</div>
                          </>
                        ) : <div style={{ fontSize:11, color:"#94a3b8" }}>—</div>}
                      </div>
                      <div>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:5, fontSize:10, fontWeight:700, background:acMeta.bg, color:acMeta.color }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:acMeta.dot, display:"inline-block" }} />
                          {azione}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:"#374151", wordBreak:"break-word" }}>{descrizione}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ DOCUMENTI ═══ */}
      {tab==="docs" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"20px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a" }}>📄 Documenti — {form.seriale}</div>
            <button onClick={addDoc} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"#6366f1",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer" }}>
              <Icon name="plus" size={14}/> Carica documento
            </button>
          </div>
          {docs.length===0?(
            <div style={{ textAlign:"center",padding:"40px 0",color:"#94a3b8",fontSize:13 }}>
              <div style={{ fontSize:32,marginBottom:8 }}>📂</div>Nessun documento.<br/>
              <span style={{ fontSize:11 }}>PDF, immagini, Word — max 5MB consigliato</span>
            </div>
          ):(
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {docs.map(d=>(
                <div key={d.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,border:"1px solid #e2e8f0",background:"#f8fafc" }}>
                  <div style={{ fontSize:24 }}>{d.tipo?.includes("pdf")?"📕":d.tipo?.includes("image")?"🖼️":"📄"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:"#0f172a" }}>{d.nome}</div>
                    <div style={{ fontSize:11,color:"#94a3b8",marginTop:2 }}>{d.data_caricamento} · {d.dimensione?`${(d.dimensione/1024).toFixed(0)} KB`:""}</div>
                    <select value={d.etichetta||""} onChange={e=>{const arr=[...docs];const i=arr.findIndex(x=>x.id===d.id);arr[i]={...arr[i],etichetta:e.target.value};set("documenti",arr);}}
                      style={{ marginTop:4,padding:"3px 7px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:11,background:"#fff",cursor:"pointer" }}>
                      <option value="">— Etichetta —</option>
                      {ETI_DOC.map(et=><option key={et} value={et}>{et}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <button onClick={()=>dlDoc(d)} style={{ padding:"6px 12px",borderRadius:7,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:12,fontWeight:600,cursor:"pointer" }}>Scarica</button>
                    <button onClick={()=>{if(window.confirm(`Rimuovere "${d.nome}"?`))rmDoc(d.id);}} style={{ padding:"6px 10px",borderRadius:7,background:"#fee2e2",border:"none",color:"#dc2626",cursor:"pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:14,padding:"10px 12px",background:"#fffbeb",borderRadius:8,fontSize:11,color:"#92400e" }}>⚠️ I documenti sono salvati nel database insieme al palmare.</div>
        </div>
      )}
    </div>
  );
};

// ─── LISTA PALMARI ────────────────────────────────────────────────────────────
export const PalmariView = ({ palmari=[], padroncini=[], onSave, onDelete, onAddNew, utente="" }) => {
  const [search,      setSearch]      = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detail,      setDetail]      = useState(null);

  if (detail) {
    return (
      <PalmareDetail
        palmare={detail}
        padroncini={padroncini}
        utente={utente}
        onBack={()=>setDetail(null)}
        onSave={(p, nuoviLog)=>{ onSave(p, nuoviLog); setDetail(p); }}
        onDelete={id=>{ onDelete(id); setDetail(null); }}
      />
    );
  }

  const filtered = palmari.filter(p=>{
    const q=search.toLowerCase();
    const ok=!q||[p.seriale,p.modello,p.modello_custom,p.note].some(v=>v?.toLowerCase().includes(q));
    return ok&&(filtroStato==="TUTTI"||p.stato===filtroStato);
  });

  const totDisp    = palmari.filter(p=>p.stato==="DISPONIBILE").length;
  const totAss     = palmari.filter(p=>p.stato==="ASSEGNATO").length;
  const totGuasto  = palmari.filter(p=>p.stato==="GUASTO").length;
  const totMensile = palmari.filter(p=>p.stato==="ASSEGNATO").reduce((s,p)=>s+(p.tariffa_mensile||0),0);
  const padNome    = id => padroncini.find(p=>p.id===id)?.nome||"—";

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>

      {/* KPI */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
        {[
          {label:"Disponibili",  value:totDisp,          color:"#166534",bg:"#dcfce7",icon:"📱"},
          {label:"Assegnati",    value:totAss,            color:"#1d4ed8",bg:"#dbeafe",icon:"🔗"},
          {label:"Guasti",       value:totGuasto,         color:"#92400e",bg:"#fef3c7",icon:"🔧"},
          {label:"Entrate mens.",value:euro(totMensile),  color:"#0ea5e9",bg:"#e0f2fe",icon:"💰"},
        ].map(k=>(
          <div key={k.label} style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px" }}>
            <div style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",marginBottom:6 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize:20,fontWeight:800,color:k.color,fontFamily:"'DM Mono',monospace" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
        <div style={{ flex:1,position:"relative",minWidth:200 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca per seriale, modello, note..."
            style={{ width:"100%",padding:"9px 14px 9px 36px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,background:"#fff",boxSizing:"border-box",outline:"none" }}/>
          <div style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#94a3b8" }}><Icon name="search" size={16}/></div>
        </div>
        {["TUTTI","DISPONIBILE","ASSEGNATO","GUASTO","DISMESSO"].map(s=>(
          <button key={s} onClick={()=>setFiltroStato(s)}
            style={{ padding:"7px 14px",borderRadius:8,border:"1px solid #e2e8f0",background:filtroStato===s?"#6366f1":"#fff",color:filtroStato===s?"#fff":"#374151",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
            {s}
          </button>
        ))}
        <button onClick={onAddNew} style={{ display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:8,background:"#6366f1",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
          <Icon name="plus" size={13}/> Nuovo Palmare
        </button>
      </div>

      {/* Tabella */}
      <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Seriale / Modello","Stato","Padroncino Assegnato","Tariffa Mensile","Data Assegnazione","Fine Assegnazione",""].map(h=>(
                <th key={h} style={{ padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i)=>(
              <tr key={p.id||i}
                style={{ background:i%2===0?"#fff":"#fafafa" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>
                <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ fontWeight:800,fontSize:14,fontFamily:"'DM Mono',monospace",color:"#0f172a" }}>{p.seriale||"—"}</div>
                  <div style={{ fontSize:11,color:"#94a3b8",marginTop:2 }}>{p.modello_custom||p.modello||"—"}</div>
                </td>
                <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                  <span style={{ padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:bgS[p.stato]||"#f3f4f6",color:colS[p.stato]||"#6b7280" }}>{p.stato||"—"}</span>
                </td>
                <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9",fontSize:12 }}>
                  {p.padroncino_id
                    ? <div><div style={{ fontWeight:600 }}>{padNome(p.padroncino_id)}</div><div style={{ fontSize:10,color:"#94a3b8" }}>{p.padroncino_id}</div></div>
                    : <span style={{ color:"#94a3b8",fontStyle:"italic" }}>Non assegnato</span>}
                </td>
                <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:"#0ea5e9" }}>{p.tariffa_mensile?euro(p.tariffa_mensile):"—"}</div>
                  {p.tariffa_mensile>0&&<div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#94a3b8" }}>+IVA: {euro((p.tariffa_mensile||0)*1.22)}</div>}
                </td>
                <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#374151" }}>{p.data_assegnazione||"—"}</td>
                <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                  {p.data_fine?<div style={{ fontSize:12,color:durcDaysLeft(p.data_fine)<30?"#dc2626":"#374151",fontWeight:durcDaysLeft(p.data_fine)<30?700:400 }}>{p.data_fine}</div>
                    :<span style={{ color:"#94a3b8" }}>—</span>}
                </td>
                <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                  <button onClick={()=>setDetail(p)}
                    style={{ padding:"5px 12px",borderRadius:7,background:"#f5f3ff",border:"1px solid #e9d5ff",color:"#6366f1",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                    Dettaglio
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&(
          <div style={{ textAlign:"center",padding:36,color:"#94a3b8",fontSize:13 }}>
            {search?`Nessun risultato per "${search}"`:"Nessun palmare. Clicca '+ Nuovo Palmare' per aggiungere."}
          </div>
        )}
      </div>
    </div>
  );
};
