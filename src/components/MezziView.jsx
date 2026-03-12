import { useState } from "react";
import { Icon } from "./Icons";
import { euro, durcDaysLeft } from "../utils/formatters";

// ─── COSTANTI ─────────────────────────────────────────────────────────────────
const ALIMENTAZIONI = ["Gasolio","Gasolio+mhev","Diesel","Benzina","Elettrico","Ibrido","GPL","Metano","Altro"];
const TIPI          = ["Furgone","Autocarro","Minivan","Camion","Pickup","Auto","Altro"];
const CATEGORIE     = ["DISTRIBUZIONE","AUTO AZIENDALE"];
const CASSONI       = ["Chiuso","Telonato","Frigo","Coibentato","Vasca","Sponda idraulica","Nessuno"];
const STATI_MEZZO   = ["DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO","DISMESSO"];

const STATO_STYLE = {
  "DISPONIBILE":   { bg:"#dcfce7", color:"#166534" },
  "ASSEGNATO":     { bg:"#dbeafe", color:"#1d4ed8" },
  "IN REVISIONE":  { bg:"#fef3c7", color:"#92400e" },
  "FUORI SERVIZIO":{ bg:"#fee2e2", color:"#dc2626" },
  "VENDUTO":       { bg:"#f3f4f6", color:"#6b7280" },
  "DISMESSO":      { bg:"#f3f4f6", color:"#6b7280" },
};

// ─── MINI UI ──────────────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, type="text", small, placeholder="" }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <input type={type} value={value??""} placeholder={placeholder}
      onChange={e => onChange(type==="number" ? (parseFloat(e.target.value)||0) : e.target.value)}
      style={{ padding:small?"6px 9px":"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:small?12:13,background:"#fff",boxSizing:"border-box",width:"100%",outline:"none" }} />
  </div>
);
const Select = ({ label, value, onChange, options }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <select value={value??""} onChange={e=>onChange(e.target.value)}
      style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",cursor:"pointer" }}>
      <option value="">—</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const DaysLeft = ({ scad }) => {
  if (!scad) return null;
  const days = durcDaysLeft(scad);
  if (days === null) return null;
  const bg    = days<0?"#fee2e2":days<30?"#fffbeb":"#f0fdf4";
  const color = days<0?"#dc2626":days<30?"#f59e0b":"#166534";
  return (
    <span style={{ padding:"3px 8px",borderRadius:6,background:bg,fontSize:10,fontWeight:700,color,whiteSpace:"nowrap" }}>
      {days<0 ? `⚠️ ${-days}gg fa` : days===0 ? "⚠️ Oggi" : days<30 ? `⏰ ${days}gg` : `✅ ${days}gg`}
    </span>
  );
};

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon, sub }) => (
  <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px",display:"flex",flexDirection:"column",gap:4,boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <span style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</span>
      <span style={{ color:"#94a3b8" }}>{icon}</span>
    </div>
    <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>{value}</div>
    {sub && <div style={{ fontSize:11,color:"#94a3b8" }}>{sub}</div>}
  </div>
);

// ─── STORICO ──────────────────────────────────────────────────────────────────
const CAMPI_STORICO = [
  ["stato","Stato"],["padroncino_id","Padroncino"],["autista","Autista"],
  ["km_attuale","KM"],["scad_assicurazione","Scad. Assicurazione"],
  ["scad_revisione","Scad. Revisione"],["scad_bollo","Scad. Bollo"],
  ["scad_tachigrafo","Scad. Tachigrafo"],["rata_noleggio","Rata Noleggio"],["canone_noleggio","Canone Noleggio"],
];
const buildStorico = (vecchio, nuovo, padroncini=[]) => {
  const oggi = new Date().toLocaleDateString("it-IT");
  const ts   = new Date().toISOString();
  return CAMPI_STORICO.reduce((acc, [campo, label]) => {
    const vOld = String(vecchio[campo] ?? "");
    const vNew = String(nuovo[campo]  ?? "");
    if (vOld === vNew) return acc;
    let da = vOld || "—"; let a = vNew || "—";
    if (campo === "padroncino_id") {
      da = padroncini.find(p=>p.id===vOld)?.nome || (vOld ? vOld : "Nessuno");
      a  = padroncini.find(p=>p.id===vNew)?.nome || (vNew ? vNew : "Nessuno");
    }
    if (campo === "km_attuale" && vNew && vNew !== "0") a = Number(vNew).toLocaleString("it-IT") + " km";
    if (campo === "rata_noleggio" || campo === "canone_noleggio") { da=euro(parseFloat(vOld)||0); a=euro(parseFloat(vNew)||0); }
    acc.push({ ts, data: oggi, campo: label, da, a });
    return acc;
  }, []);
};

const STILE_AZ = {
  Assegnazione:   { bg:"#dcfce7",color:"#166534",border:"#bbf7d0",dot:"#22c55e" },
  Rimozione:      { bg:"#fee2e2",color:"#dc2626",border:"#fecaca",dot:"#ef4444" },
  Riassegnazione: { bg:"#fef3c7",color:"#92400e",border:"#fde68a",dot:"#f59e0b" },
  Modifica:       { bg:"#dbeafe",color:"#1d4ed8",border:"#bfdbfe",dot:"#3b82f6" },
  Nota:           { bg:"#fef9c3",color:"#854d0e",border:"#fde68a",dot:"#f59e0b" },
};
const getAzStorico = (entry) => {
  if (entry.manuale) return "Nota";
  const c = entry.campo || "";
  if (c === "Assegnazione" || c === "Padroncino") {
    const da = entry.da || ""; const a = entry.a || "";
    if (!da || da === "—" || da === "Nessuno") return "Assegnazione";
    if (!a  || a  === "—" || a  === "Nessuno") return "Rimozione";
    return "Riassegnazione";
  }
  return "Modifica";
};
const fmtTs = (ts) => {
  if (!ts) return "—";
  try { const d=new Date(ts); return d.toLocaleDateString("it-IT")+"  "+d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
  catch { return ts; }
};

const StoricoTabella = ({ storico=[], entitaNome="", onAddNota, accentColor="#1e40af" }) => {
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const rows = [...storico].reverse();
  return (
    <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",overflow:"hidden" }}>
      <div style={{ padding:"14px 18px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontSize:13,fontWeight:800,color:"#0f172a" }}>📜 Storico — {entitaNome}</div>
          <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{storico.length} eventi</div>
        </div>
      </div>
      <div style={{ padding:"10px 16px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
        <input value={notaCampo} onChange={e=>setNotaCampo(e.target.value)} placeholder="Tipo nota..."
          style={{ width:200,padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff" }} />
        <input value={notaTesto} onChange={e=>setNotaTesto(e.target.value)} placeholder="Descrizione nota..."
          style={{ flex:1,minWidth:200,padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff" }} />
        <button onClick={()=>{ if(!notaTesto.trim())return; onAddNota(notaCampo,notaTesto); setNotaCampo(""); setNotaTesto(""); }}
          style={{ padding:"6px 16px",borderRadius:7,background:accentColor,color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer" }}>+ Nota</button>
      </div>
      {storico.length === 0 ? (
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
            {rows.map((entry, i) => {
              const az = getAzStorico(entry);
              const st = STILE_AZ[az] || STILE_AZ["Modifica"];
              const u  = entry.utente || "";
              const desc = entry.manuale
                ? (entry.campo && entry.campo !== "Nota manuale" ? `[${entry.campo}] ` : "") + (entry.a || "")
                : `${entry.campo}: ${entry.da||"—"} → ${entry.a||"—"}`;
              return (
                <div key={i} style={{ display:"grid",gridTemplateColumns:"160px 150px 130px 1fr",padding:"10px 16px",alignItems:"center",background:i%2===0?"#fff":"#fafbfc",borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#64748b",whiteSpace:"nowrap" }}>{fmtTs(entry.ts)}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    {u ? (<><div style={{ width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>{u[0].toUpperCase()}</div><span style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>{u}</span></>) : <span style={{ fontSize:12,color:"#94a3b8" }}>—</span>}
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

// ─── DETTAGLIO MEZZO ──────────────────────────────────────────────────────────
const MezzoDetail = ({ mezzo, padroncini, onSave, onBack, onDelete }) => {
  const [form, setForm]       = useState({ ...mezzo });
  const [activeTab, setTab]   = useState("info");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const kmRimasti = form.limitazioni_km && form.km_attuale ? Math.max(0,(form.limitazioni_km||0)-(form.km_attuale||0)) : null;
  const percKm    = (form.limitazioni_km && form.km_attuale) ? Math.min(100,Math.round(((form.km_attuale||0)/(form.limitazioni_km||1))*100)) : null;
  const storico   = form.storico || [];
  const docs      = form.documenti || [];

  const handleSave = () => {
    const nuoviLog = buildStorico(mezzo, form, padroncini);
    const updated  = { ...form, storico: [...storico, ...nuoviLog] };
    onSave(updated);
  };

  const sc = STATO_STYLE[form.stato] || { bg:"#f3f4f6",color:"#6b7280" };

  const tabBtn = (t, label) => (
    <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 16px",borderRadius:8,border:"none",background:activeTab===t?"#1e40af":"#f1f5f9",color:activeTab===t?"#fff":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer" }}>{label}</button>
  );

  const apriFile = (d) => { if(d.url) window.open(d.url,"_blank"); };
  const salvaFile = (d) => {
    if(!d.url) return;
    const a=document.createElement("a"); a.href=d.url; a.download=d.nome||"file"; a.click();
  };
  const rmDoc = (id) => set("documenti",(form.documenti||[]).filter(d=>d.id!==id));

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      {/* Header */}
      <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,background:"#f1f5f9",border:"1px solid #e2e8f0",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer" }}>
            <Icon name="arrow-left" size={14}/> Indietro
          </button>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:"#0f172a" }}>{form.targa}{form.marca ? ` — ${form.marca}` : ""} {form.modello}</div>
            <div style={{ fontSize:12,color:"#64748b" }}>{form.tipo||"Tipo"} · {form.alimentazione||"—"}</div>
          </div>
          {(form.alimentazione||"").toLowerCase().includes("elettr") && <span style={{ padding:"2px 8px",borderRadius:6,background:"#e0f2fe",color:"#0c4a6e",fontSize:11,fontWeight:700 }}>⚡ ELETTRICO</span>}
          <span style={{ padding:"3px 10px",borderRadius:7,fontSize:11,fontWeight:700,background:sc.bg,color:sc.color }}>{form.stato}</span>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {onDelete && <button onClick={()=>{ if(window.confirm(`Eliminare ${form.targa}?`)) onDelete(form.id); }} style={{ padding:"8px 14px",borderRadius:8,background:"#fee2e2",border:"none",color:"#dc2626",fontSize:12,fontWeight:700,cursor:"pointer" }}>Elimina</button>}
          <button onClick={handleSave} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:9,background:"#1e40af",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer" }}>
            <Icon name="save" size={14}/> Salva
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        {tabBtn("info","🚛 Scheda")}
        {tabBtn("storico",`📜 Storico${storico.length>0?` (${storico.length})`:""}`)}
        {tabBtn("docs",`📄 Documenti${docs.length>0?` (${docs.length})`:""}`)}
        {tabBtn("vendita","💰 Vendita")}
      </div>

      {/* ── SCHEDA ── */}
      {activeTab==="info" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          {/* Dati Veicolo */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>🚛 Dati Veicolo</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <Input label="Targa" value={form.targa} onChange={v=>set("targa",v.toUpperCase())} small />
              <Select label="Stato" value={form.stato} onChange={v=>set("stato",v)} options={STATI_MEZZO} />
              <Select label="Categoria" value={form.categoria||"DISTRIBUZIONE"} onChange={v=>set("categoria",v)} options={CATEGORIE} />
              <Select label="Tipo" value={form.tipo} onChange={v=>set("tipo",v)} options={TIPI} />
              <Input label="Marca" value={form.marca} onChange={v=>set("marca",v)} small />
              <Input label="Modello" value={form.modello} onChange={v=>set("modello",v)} small />
              <Input label="Anno Imm." value={form.anno_imm} onChange={v=>set("anno_imm",v)} type="number" small />
              <Select label="Tipo Cassone" value={form.tipo_cassone} onChange={v=>set("tipo_cassone",v)} options={CASSONI} />
              <Select label="Alimentazione" value={form.alimentazione} onChange={v=>set("alimentazione",v)} options={ALIMENTAZIONI} />
              <Input label="Colore" value={form.colore} onChange={v=>set("colore",v)} small />
              <Input label="Targa Rimorchio" value={form.targa_rimorchio} onChange={v=>set("targa_rimorchio",v)} small />
              <Input label="Portata (kg)" value={form.portata_kg} onChange={v=>set("portata_kg",v)} type="number" small />
              <Input label="Volume (m³)" value={form.volume_m3} onChange={v=>set("volume_m3",v)} type="number" small />
            </div>
            <div style={{ marginTop:12 }}><Input label="Note veicolo" value={form.note_veicolo} onChange={v=>set("note_veicolo",v)} /></div>
          </div>

          {/* Scadenze */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>📋 Scadenze</div>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {[["Scadenza Assicurazione","scad_assicurazione"],["Scadenza Revisione","scad_revisione"],["Scadenza Bollo","scad_bollo"],["Scadenza Tachigrafo","scad_tachigrafo"]].map(([label,key])=>(
                <div key={key} style={{ display:"flex",gap:10,alignItems:"flex-end" }}>
                  <div style={{ flex:1 }}><Input label={label} value={form[key]} onChange={v=>set(key,v)} type="date" small /></div>
                  <DaysLeft scad={form[key]} />
                </div>
              ))}
            </div>
          </div>

          {/* Contratto Noleggio */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>📄 Contratto Noleggio</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <Input label="Proprietario / Società" value={form.proprietario} onChange={v=>set("proprietario",v)} small />
              <Input label="N° Contratto" value={form.n_contratto} onChange={v=>set("n_contratto",v)} small />
              <Input label="Inizio" value={form.data_inizio} onChange={v=>set("data_inizio",v)} type="date" small />
              <div>
                <Input label="Fine" value={form.data_fine} onChange={v=>set("data_fine",v)} type="date" small />
                {form.data_fine && (()=>{ const d=durcDaysLeft(form.data_fine); if(d===null||d>90) return null; return <div style={{ marginTop:4,fontSize:10,fontWeight:700,color:d<0?"#dc2626":d<30?"#f59e0b":"#166534" }}>{d<0?`Scaduto da ${-d}gg`:`Scade tra ${d}gg`}</div>; })()}
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <Input label="Canone nostro (€)" value={form.canone_noleggio} onChange={v=>set("canone_noleggio",v)} type="number" small />
                <div style={{ fontSize:10,color:"#94a3b8" }}>Quanto paghiamo noi</div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <Input label="Rata Padroncino (€)" value={form.rata_noleggio} onChange={v=>set("rata_noleggio",v)} type="number" small />
                <div style={{ fontSize:10,color:"#0ea5e9",fontWeight:600 }}>⬆ Addebitato al padroncino</div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <label style={{ fontSize:10,fontWeight:700,color:"#6d28d9",textTransform:"uppercase",letterSpacing:"0.06em" }}>⚡ Maggiorazione Ricarica (%)</label>
                <input type="number" step="1" min="0" max="200" value={form.maggiorazione_ricarica_pct??""} placeholder="es. 20"
                  onChange={e=>set("maggiorazione_ricarica_pct",e.target.value===""?null:parseFloat(e.target.value)||0)}
                  style={{ padding:"6px 9px",borderRadius:8,border:"1px solid #c4b5fd",fontSize:12,background:"#fff",width:"70px",outline:"none",fontWeight:700,color:"#6d28d9" }} />
              </div>
              <div style={{ gridColumn:"1/-1",padding:"10px 12px",background:"#f8fafc",borderRadius:8,fontSize:12 }}>
                {[["Canone nostro",euro(form.canone_noleggio||0),"#374151"],["Rata padroncino",euro(form.rata_noleggio||0),"#0ea5e9"],["Rata + IVA 22%",euro((form.rata_noleggio||0)*1.22),"#166534"]].map(([l,v,c])=>(
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                    <span style={{ color:"#64748b" }}>{l}</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:c }}>{v}</span>
                  </div>
                ))}
                {(form.canone_noleggio||0)>0&&(form.rata_noleggio||0)>0&&(
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,paddingTop:6,borderTop:"1px solid #e2e8f0" }}>
                    <span style={{ color:"#64748b" }}>Margine mensile</span>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:(form.rata_noleggio||0)-(form.canone_noleggio||0)>=0?"#166534":"#dc2626" }}>{euro((form.rata_noleggio||0)-(form.canone_noleggio||0))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KM & Assegnazione */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>🗺️ Chilometraggio & Assegnazione</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <div style={{ gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:3 }}>
                <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>Padroncino Assegnato</label>
                <select value={form.padroncino_id||""} onChange={e=>set("padroncino_id",e.target.value)}
                  style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",cursor:"pointer" }}>
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p=>p.stato==="ATTIVO").map(p=><option key={p.id} value={p.id}>{p.nome} ({p.codice})</option>)}
                </select>
              </div>
              <Input label="Autista" value={form.autista} onChange={v=>set("autista",v)} small />
              <Input label="Limite KM" value={form.limitazioni_km} onChange={v=>set("limitazioni_km",v)} type="number" small />
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>KM Attuali</label>
                <input type="number" value={form.km_attuale??""} onChange={e=>set("km_attuale",parseFloat(e.target.value)||0)}
                  style={{ padding:"6px 9px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",width:"100%",boxSizing:"border-box" }} />
              </div>
            </div>
            {percKm !== null && (
              <div style={{ marginTop:12,padding:"10px 12px",borderRadius:8,background:percKm>90?"#fef2f2":percKm>70?"#fffbeb":"#f0fdf4",border:`1px solid ${percKm>90?"#fecaca":percKm>70?"#fde68a":"#bbf7d0"}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:700,marginBottom:8 }}>
                  <span>KM: {(form.km_attuale||0).toLocaleString("it-IT")}</span>
                  <span style={{ color:percKm>90?"#dc2626":percKm>70?"#f59e0b":"#166534" }}>{percKm}%</span>
                </div>
                <div style={{ background:"#e2e8f0",borderRadius:4,height:8,overflow:"hidden" }}>
                  <div style={{ width:`${percKm}%`,height:"100%",background:percKm>90?"#ef4444":percKm>70?"#f59e0b":"#10b981",borderRadius:4,transition:"width 0.3s" }}/>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#64748b" }}>
                  <span>Limite: {(form.limitazioni_km||0).toLocaleString("it-IT")}</span>
                  <span style={{ fontWeight:700 }}>Rimasti: {kmRimasti?.toLocaleString("it-IT")||"—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VENDITA ── */}
      {activeTab==="vendita" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
          <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>💰 Dettagli Vendita</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <Input label="Data Vendita" value={form.data_vendita} onChange={v=>set("data_vendita",v)} type="date" small />
            <Input label="Importo (€)" value={form.importo_vendita} onChange={v=>set("importo_vendita",v)} type="number" small />
            <div style={{ gridColumn:"1/-1" }}><Input label="Acquirente" value={form.acquirente} onChange={v=>set("acquirente",v)} /></div>
          </div>
        </div>
      )}

      {/* ── DOCUMENTI ── */}
      {activeTab==="docs" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
          <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:12 }}>📄 Documenti</div>
          {docs.length === 0 ? (
            <div style={{ textAlign:"center",padding:"32px",color:"#94a3b8",fontSize:13 }}>Nessun documento caricato</div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {docs.map(d => (
                <div key={d.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#f8fafc",borderRadius:9,border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:24 }}>{d.tipo?.includes("pdf")?"📋":d.tipo?.includes("image")?"🖼️":"📄"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:13 }}>{d.nome}</div>
                    <div style={{ fontSize:11,color:"#94a3b8" }}>{d.data_caricamento}{d.dimensione?` · ${(d.dimensione/1024).toFixed(0)} KB`:""}</div>
                  </div>
                  <div style={{ display:"flex",gap:6 }}>
                    <button onClick={()=>apriFile(d)} style={{ padding:"6px 12px",borderRadius:7,background:"#fffbeb",border:"1px solid #fcd34d",color:"#92400e",fontSize:12,fontWeight:600,cursor:"pointer" }}>🖥️ Apri</button>
                    <button onClick={()=>salvaFile(d)} style={{ padding:"6px 12px",borderRadius:7,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:12,fontWeight:600,cursor:"pointer" }}>💾 Salva</button>
                    <button onClick={()=>{ if(window.confirm(`Rimuovere "${d.nome}"?`)) rmDoc(d.id); }} style={{ padding:"6px 10px",borderRadius:7,background:"#fee2e2",border:"none",color:"#dc2626",cursor:"pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STORICO ── */}
      {activeTab==="storico" && (
        <StoricoTabella storico={storico} entitaNome={form.targa} accentColor="#1e40af"
          onAddNota={(campo, testo) => set("storico",[...storico,{ ts:new Date().toISOString(),data:new Date().toLocaleDateString("it-IT"),campo:campo.trim()||"Nota manuale",da:"—",a:testo.trim(),manuale:true }])}
        />
      )}
    </div>
  );
};

// ─── LISTA MEZZI ──────────────────────────────────────────────────────────────
export const MezziView = ({ mezzi=[], padroncini=[], onSave, onDelete, onAddNew }) => {
  const [search,          setSearch]          = useState("");
  const [filtroStato,     setFiltroStato]     = useState("TUTTI");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [detailMezzo,     setDetailMezzo]     = useState(null);

  if (detailMezzo) {
    const fresh = mezzi.find(m=>m.id===detailMezzo.id) || detailMezzo;
    return <MezzoDetail mezzo={fresh} padroncini={padroncini} onBack={()=>setDetailMezzo(null)} onSave={m=>{onSave(m);setDetailMezzo(null);}} onDelete={onDelete} />;
  }

  const filtered = mezzi.filter(m => {
    const s = search.toLowerCase();
    const match = !s || [m.targa,m.marca,m.modello,m.tipo,m.alimentazione,m.autista,m.proprietario,m.stato,m.note_veicolo].some(v=>v?.toLowerCase().includes(s));
    return match && (filtroStato==="TUTTI"||m.stato===filtroStato) && (!filtroCategoria||(m.categoria||"DISTRIBUZIONE")===filtroCategoria);
  });

  const scadImm = mezzi.filter(m=>[m.scad_assicurazione,m.scad_revisione].map(s=>durcDaysLeft(s)).filter(d=>d!==null).some(d=>d<30)).length;
  const totEntrate = mezzi.reduce((s,m)=>s+(m.rata_noleggio||0),0);
  const totMargine = mezzi.reduce((s,m)=>s+(m.rata_noleggio||0)-(m.canone_noleggio||0),0);

  const STATI_FILTER = ["TUTTI","DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO"];

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      {/* Title 
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <h1 style={{ fontSize:20,fontWeight:800,color:"#0f172a",margin:0 }}>Flotta Mezzi</h1>
        <span style={{ fontSize:12,color:"#94a3b8" }}>{filtered.length} di {mezzi.length}</span>
      </div>*/}



      {/* KPI */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
        <KpiCard label="Totali" value={mezzi.length} icon="🚛" sub={`${mezzi.filter(m=>m.stato==="ASSEGNATO").length} assegnati`} />
        <KpiCard label="Disponibili" value={mezzi.filter(m=>m.stato==="DISPONIBILE").length} icon="🚛" sub="pronti" />
        <KpiCard label="Entrate Noleggio" value={euro(totEntrate)} icon="🚛" sub="mensile" />
        <KpiCard label="Margine" value={euro(totMargine)} icon="🚛" sub="rata − canone" />
      </div>

      {/* Warning */}
      {scadImm>0 && (
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"#fffbeb",borderRadius:10,border:"1px solid #fde68a" }}>
          <span style={{ fontSize:16 }}>⚠️</span>
          <span style={{ fontSize:13,fontWeight:700,color:"#92400e" }}>{scadImm} mezzo/i con scadenze entro 30 giorni</span>
        </div>
      )}

      {/* Filtri */}
      <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
        <div style={{ flex:1,position:"relative",minWidth:200 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca targa, marca, modello..."
            style={{ width:"100%",padding:"9px 14px 9px 36px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,background:"#fff",boxSizing:"border-box",outline:"none" }} />
          <div style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#94a3b8" }}><Icon name="search" size={16}/></div>
        </div>
        {STATI_FILTER.map(s=>(
          <button key={s} onClick={()=>setFiltroStato(s)} style={{ padding:"7px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:filtroStato===s?"#1e40af":"#fff",color:filtroStato===s?"#fff":"#374151",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>{s}</button>
        ))}
        <div style={{ width:1,background:"#e2e8f0",height:24 }}/>
        {[["TUTTI",""],["🚛 DISTRIB.","DISTRIBUZIONE"],["🚗 AUTO AZ.","AUTO AZIENDALE"]].map(([label,cat])=>(
          <button key={cat} onClick={()=>setFiltroCategoria(cat)} style={{ padding:"7px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:filtroCategoria===cat?"#6d28d9":"#fff",color:filtroCategoria===cat?"#fff":"#374151",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>{label}</button>
        ))}
        <div style={{ display:"flex",gap:6 }}>
          <button onClick={()=>onAddNew("DISTRIBUZIONE")} style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 13px",borderRadius:8,background:"#1e40af",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
            <Icon name="plus" size={13}/> 🚛 Distribuzione
          </button>
          <button onClick={()=>onAddNew("AUTO AZIENDALE")} style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 13px",borderRadius:8,background:"#6d28d9",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
            <Icon name="plus" size={13}/> 🚗 Auto Aziendale
          </button>
        </div>
      </div>

      {/* Tabella */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "auto", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Targa", "Marca/Modello", "Tipo", "Stato", "Padroncino", "Scad. Ass.", "Scad. Rev.", "Rata", "KM Attuali", "Utilizzo KM", ""].map(h => (
                <th key={h} style={{ 
                  textAlign: "left", 
                  padding: "10px 14px", 
                  fontSize: 10, 
                  fontWeight: 700, 
                  color: "#64748b", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.06em", 
                  borderBottom: "2px solid #e2e8f0", 
                  whiteSpace: "nowrap" 
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => {
              const percKmRow = (m.limitazioni_km && m.km_attuale)? Math.round((m.km_attuale / m.limitazioni_km) * 100) : null;
              const pad = padroncini.find(p => p.id === m.padroncino_id);
              const sc = STATO_STYLE[m.stato] || { bg: "#f3f4f6", color: "#6b7280" };

              return (
                <tr key={m.id || i}
                  style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                  onClick={() => setDetailMezzo(m)}>
                  
                  {/* TARGA + CATEGORIA */}
                  <td style={{ padding: "3px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "100%" }}>
                      <div style={{ fontWeight: 800, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                        {m.targa || "—"}
                      </div>
                      <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 700, background: m.categoria === "AUTO AZIENDALE" ? "#f3e8ff" : "#dbeafe", color: m.categoria === "AUTO AZIENDALE" ? "#6d28d9" : "#1d4ed8", whiteSpace: "nowrap" }}>
                        {m.categoria === "AUTO AZIENDALE" ? "🚗 AUTO AZ." : "🚛 DISTRIB."}
                      </span>
                    </div>
                  </td>

                  {/* MARCA/MODELLO + ALIMENTAZIONE */}
                  <td style={{ padding: "3px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {[m.marca, m.modello].filter(Boolean).join(" ") || "—"}
                      </span>
                      <span style={{ fontSize: 9, color: "#94a3b8", whiteSpace: "nowrap" }}>
                        • {m.alimentazione || "—"}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}>{m.tipo || "—"}</td>
                  
                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>{m.stato || "—"}</span>
                  </td>

                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
                    {pad ? <span style={{ fontWeight: 600, color: "#000000" }}>{pad.nome}</span> : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>}
                  </td>

                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9" }}><DaysLeft scad={m.scad_assicurazione} /></td>
                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9" }}><DaysLeft scad={m.scad_revisione} /></td>
                  
                  {/* RATA - Allineata a destra come l'header */}
                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#000000", textAlign: "left" }}>
                    {m.rata_noleggio ? euro(m.rata_noleggio) : "—"}
                  </td>

                  {/* COLONNA 1: Solo KM Attuali */}
                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: "#374151" }}>
                    {m.km_attuale ? m.km_attuale.toLocaleString("it-IT") : "—"}
                  </td>

                  {/* COLONNA 2: Barra Percentuale con Tooltip */}
                  <td style={{ padding: "7px 14px", borderBottom: "1px solid #f1f5f9" }}>
                    {percKmRow !== null ? (
                      <div 
                        // TOOLTIP: Appare quando passi il mouse
                        title={`Limite contratto: ${m.limitazioni_km?.toLocaleString("it-IT")} km`}
                        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "help" }}
                      >
                        {/* La Barra */}
                        <div style={{ background: "#e2e8f0", borderRadius: 4, height: 7, width: "80px", overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ 
                            width: `${Math.min(percKmRow, 100)}%`, 
                            height: "100%", 
                            background: percKmRow > 90 ? "#ef4444" : percKmRow > 70 ? "#f59e0b" : "#10b981", 
                            borderRadius: 4, 
                            transition: "width 0.3s" 
                          }}/>
                        </div>
                        
                        {/* Testo Percentuale */}
                        <div style={{ 
                          fontSize: 11, 
                          fontWeight: 800, 
                          fontFamily: "'DM Mono',monospace", 
                          color: percKmRow > 90 ? "#dc2626" : percKmRow > 70 ? "#f59e0b" : "#166534",
                          minWidth: "35px"
                        }}>
                          {percKmRow}%
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'DM Mono',monospace" }}>—</div>
                    )}
                  </td>

                  <td style={{ padding: "3px 14px", borderBottom: "1px solid #f1f5f9", textAlign: "left" }}>
                    <button onClick={e => { e.stopPropagation(); setDetailMezzo(m); }} style={{ padding: "4px 10px", borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Dettaglio</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


    </div>
  );
};