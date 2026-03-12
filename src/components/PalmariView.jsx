import { useState } from "react";
import { Icon } from "./Icons";
import { euro, mezzoStatoColor } from "../utils/formatters";

const MODELLI = ["Zebra TC52","Zebra TC57","Zebra TC72","Zebra TC77","Honeywell CT60","Honeywell EDA51","Datalogic Memor 20","Altro"];
const STATI   = ["DISPONIBILE","ASSEGNATO","GUASTO","DISMESSO"];

const STATO_STYLE = {
  DISPONIBILE: { bg:"#dcfce7", color:"#166534" },
  ASSEGNATO:   { bg:"#dbeafe", color:"#1d4ed8" },
  GUASTO:      { bg:"#fee2e2", color:"#dc2626" },
  DISMESSO:    { bg:"#f3f4f6", color:"#6b7280" },
};

// ─── MINI UI ──────────────────────────────────────────────────────────────────
const FormInput = ({ label, value, onChange, type="text", placeholder="" }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <input type={type} value={value??""} placeholder={placeholder}
      onChange={e=>onChange(type==="number"?(parseFloat(e.target.value)||0):e.target.value)}
      style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",boxSizing:"border-box",width:"100%",outline:"none" }} />
  </div>
);
const FormSelect = ({ label, value, onChange, options }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <select value={value??""} onChange={e=>onChange(e.target.value)}
      style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",cursor:"pointer" }}>
      <option value="">—</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon, sub }) => (
  <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px",display:"flex",flexDirection:"column",gap:4,boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <span style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</span>
      <span style={{ color:"#94a3b8",fontSize:16 }}>{icon}</span>
    </div>
    <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>{value}</div>
    {sub && <div style={{ fontSize:11,color:"#94a3b8" }}>{sub}</div>}
  </div>
);

// ─── STORICO ──────────────────────────────────────────────────────────────────
const STILE_AZ = {
  Assegnazione:   { bg:"#dcfce7",color:"#166534",border:"#bbf7d0",dot:"#22c55e" },
  Rimozione:      { bg:"#fee2e2",color:"#dc2626",border:"#fecaca",dot:"#ef4444" },
  Riassegnazione: { bg:"#fef3c7",color:"#92400e",border:"#fde68a",dot:"#f59e0b" },
  Modifica:       { bg:"#dbeafe",color:"#1d4ed8",border:"#bfdbfe",dot:"#3b82f6" },
  Nota:           { bg:"#fef9c3",color:"#854d0e",border:"#fde68a",dot:"#f59e0b" },
};
const getAzStorico = (entry) => {
  if (entry.manuale) return "Nota";
  const c = entry.campo||"";
  if (c==="Assegnazione"||c==="Padroncino") {
    const da=entry.da||""; const a=entry.a||"";
    if(!da||da==="—"||da==="Nessuno") return "Assegnazione";
    if(!a||a==="—"||a==="Nessuno") return "Rimozione";
    return "Riassegnazione";
  }
  return "Modifica";
};
const fmtTs = (ts) => {
  if(!ts) return "—";
  try { const d=new Date(ts); return d.toLocaleDateString("it-IT")+"  "+d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
  catch { return ts; }
};

const StoricoTabella = ({ storico=[], entitaNome="", onAddNota, accentColor="#6d28d9" }) => {
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const rows = [...storico].reverse();
  return (
    <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
      <div style={{ padding:"14px 18px",borderBottom:"1px solid #e2e8f0" }}>
        <div style={{ fontSize:13,fontWeight:800,color:"#0f172a" }}>📜 Storico — {entitaNome}</div>
        <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{storico.length} eventi</div>
      </div>
      <div style={{ padding:"10px 16px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
        <input value={notaCampo} onChange={e=>setNotaCampo(e.target.value)} placeholder="Tipo nota..."
          style={{ width:200,padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff" }} />
        <input value={notaTesto} onChange={e=>setNotaTesto(e.target.value)} placeholder="Descrizione nota..."
          style={{ flex:1,minWidth:200,padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff" }} />
        <button onClick={()=>{ if(!notaTesto.trim())return; onAddNota(notaCampo,notaTesto); setNotaCampo(""); setNotaTesto(""); }}
          style={{ padding:"6px 16px",borderRadius:7,background:accentColor,color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer" }}>+ Nota</button>
      </div>
      {storico.length===0 ? (
        <div style={{ padding:"48px 20px",textAlign:"center",color:"#94a3b8" }}>
          <div style={{ fontSize:32,marginBottom:10 }}>📜</div>
          <div style={{ fontSize:13 }}>Nessuna modifica registrata</div>
        </div>
      ) : (
        <>
          <div style={{ display:"grid",gridTemplateColumns:"160px 150px 130px 1fr",background:"#f8fafc",borderBottom:"2px solid #e2e8f0",padding:"8px 16px" }}>
            {["DATA / ORA","UTENTE","AZIONE","DESCRIZIONE"].map(h=>(
              <div key={h} style={{ fontSize:10,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em" }}>{h}</div>
            ))}
          </div>
          <div style={{ maxHeight:460,overflowY:"auto" }}>
            {rows.map((entry,i)=>{
              const az=getAzStorico(entry); const st=STILE_AZ[az]||STILE_AZ["Modifica"]; const u=entry.utente||"";
              const desc=entry.manuale?(entry.campo&&entry.campo!=="Nota manuale"?`[${entry.campo}] `:""+(entry.a||"")):`${entry.campo}: ${entry.da||"—"} → ${entry.a||"—"}`;
              return (
                <div key={i} style={{ display:"grid",gridTemplateColumns:"160px 150px 130px 1fr",padding:"10px 16px",alignItems:"center",background:i%2===0?"#fff":"#fafbfc",borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#64748b",whiteSpace:"nowrap" }}>{fmtTs(entry.ts)}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    {u?(<><div style={{ width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>{u[0].toUpperCase()}</div><span style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>{u}</span></>):<span style={{ fontSize:12,color:"#94a3b8" }}>—</span>}
                  </div>
                  <div><span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:st.bg,color:st.color,border:`1px solid ${st.border}` }}><span style={{ width:6,height:6,borderRadius:"50%",background:st.dot,display:"inline-block" }}/>{az}</span></div>
                  <div style={{ fontSize:12,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }} title={desc}>{desc}</div>
                </div>
              );
            })}
          </div>
          <div style={{ padding:"8px 16px",background:"#f8fafc",borderTop:"1px solid #e2e8f0",fontSize:11,color:"#94a3b8" }}>{storico.length} eventi registrati</div>
        </>
      )}
    </div>
  );
};

// ─── DETTAGLIO PALMARE ────────────────────────────────────────────────────────
const PalmareDetail = ({ palmare, padroncini, onBack, onSave }) => {
  const [form, setForm] = useState({ ...palmare });
  const [tab,  setTab]  = useState("info");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const storico  = form.storico || [];
  const padAss   = padroncini.find(p=>p.id===form.padroncino_id);
  const sc       = STATO_STYLE[form.stato] || { bg:"#f3f4f6",color:"#6b7280" };

  const handleSave = () => { if(onSave) onSave(form); };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      {/* Header */}
      <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"#f1f5f9",border:"1px solid #e2e8f0",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer" }}>
            <Icon name="arrow-left" size={14}/> Indietro
          </button>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:"#0f172a" }}>📱 {form.seriale||"Nuovo"}{(form.modello_custom||form.modello)&&<span style={{ fontSize:13,fontWeight:400,color:"#64748b",marginLeft:8 }}>— {form.modello_custom||form.modello}</span>}</div>
            <div style={{ fontSize:12,color:"#64748b" }}>{padAss?`Assegnato a: ${padAss.nome}`:"Non assegnato"}</div>
          </div>
          <span style={{ padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:sc.bg,color:sc.color }}>{form.stato}</span>
        </div>
        <button onClick={handleSave} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:9,background:"#6d28d9",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer" }}>
          <Icon name="save" size={14}/> Salva
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:8 }}>
        {[["info","📱 Scheda"],["storico","📜 Storico"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 16px",borderRadius:8,border:"none",background:tab===t?"#6d28d9":"#f1f5f9",color:tab===t?"#fff":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {tab==="info" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          {/* Dati */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>📱 Dati Palmare</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <FormInput label="Seriale" value={form.seriale} onChange={v=>set("seriale",v)} />
              <FormSelect label="Stato" value={form.stato} onChange={v=>set("stato",v)} options={STATI} />
              <FormSelect label="Modello" value={form.modello} onChange={v=>set("modello",v)} options={MODELLI} />
              <FormInput label="Modello custom" value={form.modello_custom} onChange={v=>set("modello_custom",v)} />
            </div>
            <div style={{ marginTop:10 }}>
              <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",display:"block",marginBottom:4 }}>Note</label>
              <textarea value={form.note||""} onChange={e=>set("note",e.target.value)} rows={3} style={{ width:"100%",padding:"8px 10px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:12,resize:"vertical",outline:"none",boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Assegnazione & Tariffe */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>🔗 Assegnazione & Tariffe</div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div>
                <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",display:"block",marginBottom:4 }}>Padroncino</label>
                <select value={form.padroncino_id||""} onChange={e=>set("padroncino_id",e.target.value)}
                  style={{ width:"100%",padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",cursor:"pointer" }}>
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p=>p.stato==="ATTIVO").map(p=><option key={p.id} value={p.id}>{p.nome}{p.codice?` (${p.codice})`:""}</option>)}
                </select>
                {padAss && <div style={{ marginTop:6,padding:"6px 10px",background:"#eff6ff",borderRadius:7,fontSize:11,color:"#1d4ed8",fontWeight:600 }}>✅ {padAss.nome}</div>}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <FormInput label="Tariffa Mensile (€)" value={form.tariffa_mensile} onChange={v=>set("tariffa_mensile",v)} type="number" />
                <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                  <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>+ IVA 22%</label>
                  <div style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"#f0fdf4",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:"#166534" }}>{euro((form.tariffa_mensile||0)*1.22)}</div>
                </div>
                <FormInput label="Data Assegnazione" value={form.data_assegnazione} onChange={v=>set("data_assegnazione",v)} type="date" />
                <FormInput label="Fine" value={form.data_fine} onChange={v=>set("data_fine",v)} type="date" />
              </div>
            </div>
          </div>

          {/* Riepilogo */}
          <div style={{ gridColumn:"1/-1",background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>💰 Riepilogo Economico</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
              {[["Netta",euro(form.tariffa_mensile||0)],["+ IVA",euro((form.tariffa_mensile||0)*1.22)],["Annuale",euro((form.tariffa_mensile||0)*12)]].map(([l,v])=>(
                <div key={l} style={{ padding:"12px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",marginBottom:4 }}>{l}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:16 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==="storico" && (
        <StoricoTabella storico={storico} entitaNome={form.seriale||"Palmare"} accentColor="#6d28d9"
          onAddNota={(campo,testo)=>set("storico",[...storico,{ts:new Date().toISOString(),data:new Date().toLocaleDateString("it-IT"),campo:campo.trim()||"Nota manuale",da:"—",a:testo.trim(),manuale:true}])}
        />
      )}
    </div>
  );
};

// ─── LISTA ────────────────────────────────────────────────────────────────────
export const PalmariView = ({ palmari=[], padroncini=[], onSave, onDelete }) => {
  const [search,      setSearch]      = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detail,      setDetail]      = useState(null);

  if (detail) {
    const fresh = palmari.find(p=>p.id===detail.id) || detail;
    return <PalmareDetail palmare={fresh} padroncini={padroncini} onBack={()=>setDetail(null)} onSave={p=>{if(onSave)onSave(p); setDetail(null);}} />;
  }

  const filtered = palmari.filter(p => {
    const q = search.toLowerCase();
    return (!q||[p.seriale,p.modello,p.modello_custom,p.note].some(v=>v?.toLowerCase().includes(q))) && (filtroStato==="TUTTI"||p.stato===filtroStato);
  });
  const padNome = (id) => padroncini.find(p=>p.id===id)?.nome||"—";

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <h1 style={{ fontSize:20,fontWeight:800,color:"#0f172a",margin:0 }}>Palmari</h1>

      {/* KPI */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
        <KpiCard label="Disponibili" value={palmari.filter(p=>p.stato==="DISPONIBILE").length} icon="📱" sub="pronti" />
        <KpiCard label="Assegnati" value={palmari.filter(p=>p.stato==="ASSEGNATO").length} icon="📱" sub="in uso" />
        <KpiCard label="Guasti" value={palmari.filter(p=>p.stato==="GUASTO").length} icon="📱" sub="da riparare" />
        <KpiCard label="Entrate Mens." value={euro(palmari.filter(p=>p.stato==="ASSEGNATO").reduce((s,p)=>s+(p.tariffa_mensile||0),0))} icon="📱" sub="tariffe" />
      </div>

      {/* Filtri */}
      <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
        <div style={{ flex:1,position:"relative",minWidth:200 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca seriale, modello..."
            style={{ width:"100%",padding:"9px 14px 9px 36px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,background:"#fff",boxSizing:"border-box",outline:"none" }} />
          <div style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#94a3b8" }}><Icon name="search" size={16}/></div>
        </div>
        {["TUTTI",...STATI].map(s=>(
          <button key={s} onClick={()=>setFiltroStato(s)} style={{ padding:"7px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:filtroStato===s?"#6d28d9":"#fff",color:filtroStato===s?"#fff":"#374151",fontSize:11,fontWeight:600,cursor:"pointer" }}>{s}</button>
        ))}
      </div>

      {/* Tabella */}
      <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Seriale / Modello","Stato","Padroncino","Tariffa","Data Assegnazione","Fine",""].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i)=>{
              const sc = STATO_STYLE[p.stato]||{bg:"#f3f4f6",color:"#6b7280"};
              return (
                <tr key={p.id} style={{ background:i%2===0?"#fff":"#fafafa",cursor:"pointer",transition:"background 0.1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}
                  onClick={()=>setDetail(p)}>
                  <td style={{ padding:"12px 14px",borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontWeight:800,fontSize:13,fontFamily:"'DM Mono',monospace" }}>{p.seriale}</div>
                    <div style={{ fontSize:11,color:"#94a3b8" }}>{p.modello_custom||p.modello||"—"}</div>
                  </td>
                  <td style={{ padding:"12px 14px",borderBottom:"1px solid #f1f5f9" }}>
                    <span style={{ padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:sc.bg,color:sc.color }}>{p.stato}</span>
                  </td>
                  <td style={{ padding:"12px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12 }}>
                    {p.padroncino_id ? <span style={{ fontWeight:600,color:"#1d4ed8" }}>{padNome(p.padroncino_id)}</span> : <span style={{ color:"#94a3b8",fontStyle:"italic" }}>—</span>}
                  </td>
                  <td style={{ padding:"12px 14px",borderBottom:"1px solid #f1f5f9",fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#6d28d9",fontSize:12 }}>
                    {p.tariffa_mensile ? euro(p.tariffa_mensile) : "—"}
                  </td>
                  <td style={{ padding:"12px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#374151" }}>{p.data_assegnazione||"—"}</td>
                  <td style={{ padding:"12px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#94a3b8" }}>{p.data_fine||"—"}</td>
                  <td style={{ padding:"12px 14px",borderBottom:"1px solid #f1f5f9" }}>
                    <button onClick={e=>{e.stopPropagation();setDetail(p);}} style={{ padding:"5px 12px",borderRadius:7,background:"#f5f3ff",border:"1px solid #c4b5fd",color:"#6d28d9",fontSize:11,fontWeight:600,cursor:"pointer" }}>Dettaglio</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={7} style={{ textAlign:"center",padding:"32px",color:"#94a3b8",fontSize:13 }}>Nessun palmare trovato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};