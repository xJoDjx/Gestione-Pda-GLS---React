import { useState } from "react";
import { Icon } from "./Icons";
import { euro, durcDaysLeft } from "../utils/formatters";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const ALIMENTAZIONI = ["Diesel","Benzina","Elettrico","Ibrido","GPL","Metano","Altro"];
const TIPI          = ["Furgone","Autocarro","Minivan","Camion","Pickup","Auto","Altro"];
const CATEGORIE     = ["DISTRIBUZIONE","AUTO AZIENDALE"];
const CASSONI       = ["Chiuso","Telonato","Frigo","Coibentato","Vasca","Sponda idraulica","Nessuno"];
const STATI_MEZZO   = ["DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO","DISMESSO"];

const Input = ({ label, value, onChange, type="text", small, placeholder="" }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
    {label && <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</label>}
    <input
      type={type} value={value??""} placeholder={placeholder}
      onChange={e => onChange(type==="number" ? (parseFloat(e.target.value)||0) : e.target.value)}
      style={{ padding:small?"6px 9px":"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:small?12:13,background:"#fff",boxSizing:"border-box",width:"100%",outline:"none" }}
    />
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
  const color = days<0?"#dc2626":days<30?"#f59e0b":"#166534";
  const bg    = days<0?"#fee2e2":days<30?"#fffbeb":"#f0fdf4";
  return (
    <div style={{ padding:"4px 8px",borderRadius:6,background:bg,fontSize:10,fontWeight:700,color,whiteSpace:"nowrap" }}>
      {days<0 ? `⚠️ Scad. ${-days}gg fa` : days===0 ? "⚠️ Scade oggi" : days<30 ? `⏰ ${days}gg` : `✅ ${days}gg`}
    </div>
  );
};

// ─── STORICO HELPERS ──────────────────────────────────────────────────────────
const CAMPI_STORICO = [
  ["stato",             "Stato"],
  ["padroncino_id",     "Padroncino"],
  ["autista",           "Autista"],
  ["km_attuale",        "KM"],
  ["scad_assicurazione","Scad. Assicurazione"],
  ["scad_revisione",    "Scad. Revisione"],
  ["scad_bollo",        "Scad. Bollo"],
  ["scad_tachigrafo",   "Scad. Tachigrafo"],
  ["rata_noleggio",     "Rata Noleggio"],
  ["canone_noleggio",   "Canone Noleggio"],
];

const buildStorico = (vecchio, nuovo, padroncini=[], utente="") => {
  const oggi = new Date().toLocaleDateString("it-IT");
  const ts   = new Date().toISOString();
  return CAMPI_STORICO.reduce((acc, [campo, label]) => {
    const vOld = String(vecchio[campo] ?? "");
    const vNew = String(nuovo[campo]  ?? "");
    if (vOld === vNew) return acc;
    let da = vOld || "—";
    let a  = vNew || "—";
    if (campo === "padroncino_id") {
      da = padroncini.find(p => p.id === vOld)?.nome || (vOld ? vOld : "Nessuno");
      a  = padroncini.find(p => p.id === vNew)?.nome || (vNew ? vNew : "Nessuno");
    }
    if (campo === "km_attuale" && vNew && vNew !== "0")
      a = Number(vNew).toLocaleString("it-IT") + " km";
    if ((campo === "rata_noleggio" || campo === "canone_noleggio")) {
      da = euro(parseFloat(vOld)||0); a = euro(parseFloat(vNew)||0);
    }
    acc.push({ ts, data: oggi, campo: label, da, a, utente });
    return acc;
  }, []);
};

// ─── DETTAGLIO MEZZO ─────────────────────────────────────────────────────────
const MezzoDetail = ({ mezzo, padroncini, onSave, onBack, onDelete, utente = "" }) => {
  const [form, setForm] = useState({ ...mezzo });
  const [activeTab, setActiveTab] = useState("info");
  const [notaCampo, setNotaCampo] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const kmRimasti = form.limitazioni_km && form.km_attuale
    ? Math.max(0, (form.limitazioni_km||0) - (form.km_attuale||0)) : null;
  const percKm = (form.limitazioni_km && form.km_attuale)
    ? Math.min(100, Math.round(((form.km_attuale||0)/(form.limitazioni_km||1))*100)) : null;

  const storico = form.storico || [];
  const docs    = form.documenti || [];

  // ── BUG FIX: salva usando `form` (stato aggiornato), confronta con `mezzo` (prop iniziale)
  const handleSave = () => {
    const nuoviLog = buildStorico(mezzo, form, padroncini, utente);
    const formConStorico = { ...form, storico: [...storico, ...nuoviLog] };
    onSave(formConStorico);
  };

  // ── Gestione documenti ──
  const addDoc = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        set("documenti", [...docs, {
          id: `DOC_${Date.now()}`, nome: file.name, tipo: file.type,
          dimensione: file.size, data_caricamento: new Date().toISOString().split("T")[0],
          data_b64: ev.target.result, etichetta: "",
        }]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const removeDoc = (id) => set("documenti", docs.filter(d => d.id !== id));
  const openDoc   = (doc) => { const a = document.createElement("a"); a.href = doc.data_b64; a.download = doc.nome; a.click(); };
  const ETICHETTE_DOC = ["Libretto","Carta di circolazione","Assicurazione","Revisione","Tachigrafo","Foglio di via","Contratto noleggio","Altro"];

  const tabBtn = (t, label) => (
    <button key={t} onClick={() => setActiveTab(t)} style={{
      padding:"8px 14px", borderRadius:9, border:"1px solid #e2e8f0",
      background: activeTab===t ? "#1e40af" : "#fff",
      color: activeTab===t ? "#fff" : "#374151",
      fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"
    }}>{label}</button>
  );

  const SC = { "DISPONIBILE":{ bg:"#dcfce7",color:"#166534" }, "ASSEGNATO":{ bg:"#dbeafe",color:"#1d4ed8" }, "IN REVISIONE":{ bg:"#fef3c7",color:"#92400e" }, "FUORI SERVIZIO":{ bg:"#fee2e2",color:"#dc2626" }, "VENDUTO":{ bg:"#f3f4f6",color:"#6b7280" }, "DISMESSO":{ bg:"#f3f4f6",color:"#6b7280" } };
  const sc = SC[form.stato] || { bg:"#f3f4f6",color:"#6b7280" };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
      {/* Header */}
      <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,background:"#f1f5f9",border:"none",color:"#475569",cursor:"pointer",fontSize:12,fontWeight:600 }}>
            <Icon name="back" size={14}/> Indietro
          </button>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:"#0f172a" }}>{form.targa||"Nuova targa"} {form.marca&&`— ${form.marca}`} {form.modello&&form.modello}</div>
            <div style={{ fontSize:12,color:"#64748b" }}>{form.tipo||"Tipo"} · {form.alimentazione||"—"}</div>
          </div>
          {(form.alimentazione||"").toLowerCase().includes("elettr") && <span style={{ background:"#e0f2fe",color:"#0c4a6e",padding:"3px 10px",borderRadius:10,fontSize:11,fontWeight:700 }}>⚡ ELETTRICO</span>}
          <span style={{ background:sc.bg,color:sc.color,padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:700 }}>{form.stato||"—"}</span>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>onDelete(mezzo.id)} style={{ padding:"8px 14px",borderRadius:8,background:"#fee2e2",color:"#dc2626",border:"none",fontSize:12,fontWeight:700,cursor:"pointer" }}>Elimina</button>
          <button onClick={handleSave} style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 18px",borderRadius:9,background:"#1e40af",color:"#fff",border:"none",fontSize:13,fontWeight:700,cursor:"pointer" }}>
            <Icon name="save" size={14}/> Salva
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        {tabBtn("info","🚛 Scheda")}
        {tabBtn("storico",`📜 Storico${storico.length>0?` (${storico.length})`:""}`)}
        {tabBtn("docs",`📄 Documenti${docs.length>0?` (${docs.length})`:""}`)}
        {tabBtn("vendita","💰 Vendita")}
      </div>

      {/* ═══ TAB SCHEDA — tutto in una pagina (no tab separato Scadenze) ═══ */}
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
              <Input label="Anno Immatricolazione" value={form.anno_imm} onChange={v=>set("anno_imm",v)} type="number" small />
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
              <Input label="Proprietario / Società Noleggio" value={form.proprietario} onChange={v=>set("proprietario",v)} small />
              <Input label="N° Contratto" value={form.n_contratto} onChange={v=>set("n_contratto",v)} small />
              <Input label="Inizio Contratto" value={form.data_inizio} onChange={v=>set("data_inizio",v)} type="date" small />
              <div>
                <Input label="Fine Contratto" value={form.data_fine} onChange={v=>set("data_fine",v)} type="date" small />
                {form.data_fine && (()=>{const days=durcDaysLeft(form.data_fine);if(days===null||days>90)return null;return <div style={{marginTop:4,fontSize:10,fontWeight:700,color:days<0?"#dc2626":days<30?"#f59e0b":"#166534"}}>{days<0?`Contratto scaduto da ${-days}gg`:`Scade tra ${days}gg`}</div>;})()}
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <Input label="Canone Mensile costo nostro (€)" value={form.canone_noleggio} onChange={v=>set("canone_noleggio",v)} type="number" small />
                <div style={{ fontSize:10,color:"#94a3b8",paddingLeft:2 }}>Quanto paghiamo noi alla società di noleggio</div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <Input label="Rata Noleggio Padroncino (€)" value={form.rata_noleggio} onChange={v=>set("rata_noleggio",v)} type="number" small />
                <div style={{ fontSize:10,color:"#0ea5e9",paddingLeft:2,fontWeight:600 }}>⬆ Questo valore viene addebitato al padroncino</div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <label style={{ fontSize:10,fontWeight:700,color:"#6d28d9",textTransform:"uppercase",letterSpacing:"0.06em" }}>⚡ Maggiorazione Ricarica (%)</label>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <input type="number" step="1" min="0" max="200" value={form.maggiorazione_ricarica_pct??""} placeholder="es. 20"
                    onChange={e=>set("maggiorazione_ricarica_pct", e.target.value==="" ? null : parseFloat(e.target.value)||0)}
                    style={{ padding:"6px 9px",borderRadius:8,border:"1px solid #c4b5fd",fontSize:12,background:"#fff",boxSizing:"border-box",width:"70px",outline:"none",fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#6d28d9" }} />
                  <span style={{ fontSize:11,color:"#6d28d9" }}>%{form.categoria==="AUTO AZIENDALE"?" (auto az.)":" (distribuz.)"}</span>
                </div>
                <div style={{ fontSize:10,color:"#94a3b8" }}>Lascia vuoto per usare la % globale nelle ricariche</div>
              </div>
              <div style={{ gridColumn:"1/-1",padding:"10px 12px",background:"#f8fafc",borderRadius:8,fontSize:12 }}>
                {[["Canone nostro (costo)",euro(form.canone_noleggio||0),"#374151"],["Rata padroncino",euro(form.rata_noleggio||0),"#0ea5e9"],["Rata + IVA 22%",euro((form.rata_noleggio||0)*1.22),"#166534"]].map(([l,v,c])=>(
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

          {/* KM e Assegnazione */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"16px 18px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:14 }}>🗺️ Chilometraggio & Assegnazione</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <div style={{ gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:3 }}>
                <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>Padroncino Assegnato</label>
                <select value={form.padroncino_id||""} onChange={e=>set("padroncino_id",e.target.value)}
                  style={{ padding:"7px 10px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",cursor:"pointer" }}>
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p=>p.stato==="ATTIVO").map(p=>(
                    <option key={p.id} value={p.id}>{p.nome} ({p.codice})</option>
                  ))}
                </select>
              </div>
              <Input label="Autista" value={form.autista} onChange={v=>set("autista",v)} small />
              <Input label="Limitazione KM contratto" value={form.limitazioni_km} onChange={v=>set("limitazioni_km",v)} type="number" small />
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>KM Attuali (al {new Date().toLocaleDateString("it-IT")})</label>
                <input type="number" value={form.km_attuale??""} onChange={e=>set("km_attuale",parseFloat(e.target.value)||0)}
                  style={{ padding:"6px 9px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,background:"#fff",width:"100%",boxSizing:"border-box" }} />
              </div>
              <Input label="Data rilevazione KM" value={form.km_data} onChange={v=>set("km_data",v)} type="date" small />
            </div>
            {percKm!==null?(
              <div style={{ marginTop:14,padding:"12px 14px",background:percKm>90?"#fee2e2":percKm>70?"#fffbeb":"#f0fdf4",borderRadius:10,border:`1px solid ${percKm>90?"#fca5a5":percKm>70?"#fde68a":"#bbf7d0"}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12,fontWeight:700 }}>
                  <span>KM consumati: {(form.km_attuale||0).toLocaleString("it-IT")}</span>
                  <span style={{ color:percKm>90?"#dc2626":percKm>70?"#92400e":"#166534" }}>{percKm}%</span>
                </div>
                <div style={{ background:"#e2e8f0",borderRadius:6,height:10,overflow:"hidden" }}>
                  <div style={{ width:`${percKm}%`,height:"100%",borderRadius:6,background:percKm>90?"#ef4444":percKm>70?"#f59e0b":"#10b981",transition:"width 0.5s" }}/>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11 }}>
                  <span style={{ color:"#94a3b8" }}>Limite: {(form.limitazioni_km||0).toLocaleString("it-IT")} km</span>
                  <span style={{ fontWeight:700,color:percKm>90?"#dc2626":"#166534" }}>Rimanenti: {kmRimasti!==null?kmRimasti.toLocaleString("it-IT"):"—"} km</span>
                </div>
              </div>
            ):(
              <div style={{ marginTop:12,padding:"10px 12px",background:"#f8fafc",borderRadius:8,fontSize:12,color:"#94a3b8",textAlign:"center" }}>Inserisci KM limite e KM attuali per visualizzare la barra</div>
            )}
          </div>

        </div>
      )}

      {/* ═══ TAB STORICO ═══ */}
      {activeTab==="storico" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"20px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13,fontWeight:800,color:"#0f172a" }}>📜 Storico Modifiche — {form.targa}</div>
              <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>Registra automaticamente ogni modifica salvata</div>
            </div>
            {storico.length>0&&<button onClick={()=>{if(window.confirm("Cancellare tutto lo storico?"))set("storico",[]);}} style={{ padding:"6px 12px",borderRadius:7,background:"#fee2e2",color:"#dc2626",border:"none",fontSize:11,fontWeight:700,cursor:"pointer" }}>Cancella storico</button>}
          </div>
          <div style={{ marginBottom:16,padding:"12px 14px",background:"#f8fafc",borderRadius:10,border:"1px dashed #cbd5e1" }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",marginBottom:8 }}>✏️ Aggiungi nota manuale</div>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              <input value={notaCampo} onChange={e=>setNotaCampo(e.target.value)} placeholder="Tipo (es. Riparazione, Incidente...)" style={{ width:200,padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff" }}/>
              <input value={notaTesto} onChange={e=>setNotaTesto(e.target.value)} placeholder="Descrizione..." style={{ flex:1,minWidth:200,padding:"6px 10px",borderRadius:7,border:"1px solid #e2e8f0",fontSize:12,background:"#fff" }}/>
              <button onClick={()=>{if(!notaTesto.trim())return;set("storico",[...storico,{ts:new Date().toISOString(),data:new Date().toLocaleDateString("it-IT"),campo:notaCampo.trim()||"Nota manuale",da:"—",a:notaTesto.trim(),manuale:true}]);setNotaCampo("");setNotaTesto("");}} style={{ padding:"6px 16px",borderRadius:7,background:"#1e40af",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer" }}>Aggiungi</button>
            </div>
          </div>
          {storico.length===0?(
            <div style={{ textAlign:"center",padding:"44px 0",color:"#94a3b8" }}>
              <div style={{ fontSize:36,marginBottom:10 }}>📜</div>
              <div style={{ fontSize:13,marginBottom:4 }}>Nessuna modifica ancora registrata</div>
              <div style={{ fontSize:11 }}>Salva dopo aver cambiato stato, assegnazione, KM o rate</div>
            </div>
          ):(
            <div>
              {[...storico].reverse().map((entry,i,arr)=>{
                const dotColor=entry.manuale?"#8b5cf6":entry.campo==="Stato"?"#f59e0b":entry.campo==="Padroncino"?"#10b981":entry.campo==="KM"?"#0ea5e9":"#94a3b8";
                return(
                  <div key={i} style={{ display:"flex",gap:0 }}>
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",width:28,flexShrink:0 }}>
                      <div style={{ width:12,height:12,borderRadius:"50%",background:dotColor,marginTop:14,flexShrink:0,boxShadow:`0 0 0 3px ${dotColor}22` }}/>
                      {i<arr.length-1&&<div style={{ width:2,flex:1,background:"#f1f5f9",minHeight:16 }}/>}
                    </div>
                    <div style={{ flex:1,paddingBottom:16,paddingTop:10 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap" }}>
                        <span style={{ fontSize:11,fontWeight:800,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em" }}>{entry.campo}</span>
                        {entry.manuale&&<span style={{ fontSize:9,padding:"1px 6px",borderRadius:4,background:"#f5f3ff",color:"#7c3aed",fontWeight:700,border:"1px solid #e9d5ff" }}>MANUALE</span>}
                        <span style={{ fontSize:11,color:"#94a3b8",marginLeft:"auto" }}>{entry.data}</span>
                      </div>
                      {entry.manuale?(
                        <div style={{ fontSize:12,color:"#374151",padding:"6px 10px",background:"#f5f3ff",borderRadius:7,borderLeft:"3px solid #8b5cf6" }}>{entry.a}</div>
                      ):(
                        <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                          <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace",padding:"4px 10px",background:"#f1f5f9",borderRadius:6,color:"#64748b",textDecoration:"line-through" }}>{entry.da}</span>
                          <span style={{ fontSize:16,color:"#cbd5e1" }}>→</span>
                          <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:700,padding:"4px 10px",background:"#f0fdf4",borderRadius:6,color:"#166534",border:"1px solid #bbf7d0" }}>{entry.a}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB DOCUMENTI ═══ */}
      {activeTab==="docs" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"20px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div style={{ fontSize:13,fontWeight:800,color:"#0f172a" }}>📄 Documenti — {form.targa}</div>
            <button onClick={addDoc} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"#1e40af",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer" }}>
              <Icon name="plus" size={14}/> Carica documento
            </button>
          </div>
          {docs.length===0?(
            <div style={{ textAlign:"center",padding:"40px 0",color:"#94a3b8",fontSize:13 }}>
              <div style={{ fontSize:32,marginBottom:8 }}>📂</div>Nessun documento caricato.<br/><span style={{ fontSize:11 }}>PDF, immagini, Word — max 5MB consigliato</span>
            </div>
          ):(
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {docs.map(doc=>(
                <div key={doc.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,border:"1px solid #e2e8f0",background:"#f8fafc" }}>
                  <div style={{ fontSize:24 }}>{doc.tipo?.includes("pdf")?"📕":doc.tipo?.includes("image")?"🖼️":"📄"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:13,color:"#0f172a" }}>{doc.nome}</div>
                    <div style={{ fontSize:11,color:"#94a3b8",marginTop:2 }}>{doc.data_caricamento} · {doc.dimensione?`${(doc.dimensione/1024).toFixed(0)} KB`:""}</div>
                    <select value={doc.etichetta||""} onChange={e=>{const d=[...docs];const idx=d.findIndex(x=>x.id===doc.id);d[idx]={...d[idx],etichetta:e.target.value};set("documenti",d);}} style={{ marginTop:4,padding:"3px 7px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:11,background:"#fff",cursor:"pointer" }}>
                      <option value="">— Etichetta —</option>
                      {ETICHETTE_DOC.map(et=><option key={et} value={et}>{et}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <button onClick={()=>openDoc(doc)} style={{ padding:"6px 12px",borderRadius:7,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:12,fontWeight:600,cursor:"pointer" }}>Scarica</button>
                    <button onClick={()=>{if(window.confirm(`Rimuovere "${doc.nome}"?`))removeDoc(doc.id);}} style={{ padding:"6px 10px",borderRadius:7,background:"#fee2e2",border:"none",color:"#dc2626",cursor:"pointer" }}><Icon name="x" size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:14,padding:"10px 12px",background:"#fffbeb",borderRadius:8,fontSize:11,color:"#92400e" }}>⚠️ I documenti vengono salvati nel database insieme al mezzo. File molto grandi possono rallentare l'app.</div>
        </div>
      )}

      {/* ═══ TAB VENDITA ═══ */}
      {activeTab==="vendita" && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"20px" }}>
          <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:4 }}>💰 Dettagli Vendita — {form.targa}</div>
          <div style={{ fontSize:12,color:"#64748b",marginBottom:16 }}>Compila questa sezione se il mezzo è stato venduto.</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <div style={{ gridColumn:"1/-1",padding:"12px 16px",background:"#fffbeb",borderRadius:10,border:"1px solid #fde68a",display:"flex",alignItems:"center",gap:10 }}>
              <span style={{ fontSize:20 }}>⚠️</span>
              <div style={{ flex:1,fontSize:12,color:"#92400e" }}>Cambia lo stato in <strong>VENDUTO</strong> nella Scheda per escluderlo dai conteggi attivi.</div>
              <button onClick={()=>set("stato","VENDUTO")} style={{ padding:"6px 14px",borderRadius:7,background:form.stato==="VENDUTO"?"#166534":"#92400e",color:"#fff",border:"none",fontSize:11,fontWeight:700,cursor:"pointer" }}>{form.stato==="VENDUTO"?"✓ Già VENDUTO":"Segna come VENDUTO"}</button>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
              <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>Data Vendita</label>
              <input type="date" value={form.data_vendita||""} onChange={e=>set("data_vendita",e.target.value)} style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,background:"#fff",width:"100%",boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
              <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>Importo Vendita (€)</label>
              <input type="number" step="0.01" value={form.importo_vendita||""} onChange={e=>set("importo_vendita",parseFloat(e.target.value)||0)} style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:18,fontFamily:"'DM Mono',monospace",fontWeight:700,background:"#fff",width:"100%",boxSizing:"border-box",color:"#166534" }}/>
            </div>
            <div style={{ gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:4 }}>
              <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>Acquirente</label>
              <input value={form.acquirente||""} onChange={e=>set("acquirente",e.target.value)} placeholder="Nome, ragione sociale..." style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,background:"#fff",width:"100%",boxSizing:"border-box" }}/>
            </div>
            <div style={{ gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:4 }}>
              <label style={{ fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase" }}>Note Vendita</label>
              <textarea value={form.note_vendita||""} onChange={e=>set("note_vendita",e.target.value)} placeholder="Condizioni, metodo pagamento, rif. fattura..." style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:12,resize:"vertical",minHeight:70,fontFamily:"inherit",width:"100%",boxSizing:"border-box" }}/>
            </div>
            {(form.importo_vendita||0)>0&&(
              <div style={{ gridColumn:"1/-1",padding:"14px 16px",background:"#f0fdf4",borderRadius:10,border:"1px solid #bbf7d0" }}>
                <div style={{ fontSize:12,fontWeight:800,color:"#166534",marginBottom:8 }}>Riepilogo Vendita</div>
                <div style={{ display:"flex",gap:24,flexWrap:"wrap",fontSize:12 }}>
                  <div><span style={{ color:"#64748b" }}>Data: </span><strong>{form.data_vendita||"—"}</strong></div>
                  <div><span style={{ color:"#64748b" }}>Acquirente: </span><strong>{form.acquirente||"—"}</strong></div>
                  <div><span style={{ color:"#64748b" }}>Importo: </span><strong style={{ fontFamily:"'DM Mono',monospace",color:"#166534",fontSize:14 }}>{euro(form.importo_vendita||0)}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── VISTA PRINCIPALE MEZZI ──────────────────────────────────────────────────
export const MezziView = ({ mezzi, padroncini, onSave, onDelete, onAddNew, utente = "" }) => {
  const [search, setSearch]           = useState("");
  const [filtroStato,    setFiltroStato]    = useState("TUTTI");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [detailMezzo, setDetailMezzo] = useState(null);

  if (detailMezzo) {
    return (
      <MezzoDetail
        mezzo={detailMezzo}
        padroncini={padroncini}
        utente={utente}
        onBack={()=>setDetailMezzo(null)}
        onSave={(m)=>{
          onSave(m);
          setDetailMezzo(m);
        }}
        onDelete={(id)=>{ if(window.confirm("Eliminare questo mezzo?")){ onDelete(id); setDetailMezzo(null); } }}
      />
    );
  }

  const filtered = mezzi.filter(m=>{
    const s=search.toLowerCase();
    const match=!s||[m.targa,m.marca,m.modello,m.autista,m.proprietario,m.n_contratto].some(v=>v?.toLowerCase().includes(s));
    return match && (filtroStato==="TUTTI"||m.stato===filtroStato) && (!filtroCategoria||(m.categoria||"DISTRIBUZIONE")===filtroCategoria);
  });

  const scadImm=filtered.filter(m=>{
    const days=[m.scad_assicurazione,m.scad_revisione].map(s=>durcDaysLeft(s)).filter(d=>d!==null);
    return days.some(d=>d<30);
  }).length;

  const bgStato={ "DISPONIBILE":"#dcfce7","ASSEGNATO":"#dbeafe","IN REVISIONE":"#fef3c7","FUORI SERVIZIO":"#fee2e2","VENDUTO":"#f3f4f6","DISMESSO":"#f3f4f6" };
  const colStato={ "DISPONIBILE":"#166534","ASSEGNATO":"#1d4ed8","IN REVISIONE":"#92400e","FUORI SERVIZIO":"#dc2626","VENDUTO":"#6b7280","DISMESSO":"#6b7280" };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      {scadImm>0&&(
        <div style={{ padding:"12px 16px",background:"#fff7ed",borderRadius:10,border:"1px solid #fed7aa",display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize:18 }}>⚠️</span>
          <span style={{ fontSize:13,fontWeight:700,color:"#92400e" }}>{scadImm} mezzo/i con scadenze entro 30 giorni</span>
        </div>
      )}
      <div style={{ display:"flex",gap:10,alignItems:"center" }}>
        <div style={{ flex:1,position:"relative" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca per targa, modello, autista, proprietario..."
            style={{ width:"100%",padding:"9px 14px 9px 36px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:13,background:"#fff",boxSizing:"border-box",outline:"none" }}/>
          <div style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#94a3b8" }}><Icon name="search" size={16}/></div>
        </div>
        {["TUTTI","DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO"].map(s=>(
          <button key={s} onClick={()=>setFiltroStato(s)} style={{ padding:"7px 14px",borderRadius:8,border:"1px solid #e2e8f0",background:filtroStato===s?"#1e40af":"#fff",color:filtroStato===s?"#fff":"#374151",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>{s}</button>
        ))}
        <div style={{ width:1,background:"#e2e8f0",height:24,alignSelf:"center" }} />
        {[["TUTTI CAT.",""],["🚛 DISTRIB.","DISTRIBUZIONE"],["🚗 AUTO AZ.","AUTO AZIENDALE"]].map(([label,cat])=>(
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
      <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e2e8f0",overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc" }}>
              {["Targa","Tipo / Modello","Alimentazione","Stato","Assegnato a","Autista","Scad. Assic.","Scad. Revisione","KM","Rata Pad.",""].map(h=>(
                <th key={h} style={{ padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m,i)=>{
              const padAssegnato=padroncini.find(p=>p.id===m.padroncino_id);
              const daysAssic=durcDaysLeft(m.scad_assicurazione);
              const daysRev=durcDaysLeft(m.scad_revisione);
              const scadW=(d)=>d!==null&&d<30;
              const percKm=m.limitazioni_km&&m.km_attuale?Math.min(100,Math.round((m.km_attuale/m.limitazioni_km)*100)):null;
              return(
                <tr key={m.id||i} style={{ background:i%2===0?"#fff":"#fafafa" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontWeight:800,fontSize:14,fontFamily:"'DM Mono',monospace" }}>{m.targa||"—"}</div>
                    {(m.alimentazione||"").toLowerCase().includes("elettr")&&<span style={{ fontSize:9,background:"#e0f2fe",color:"#0c4a6e",padding:"1px 5px",borderRadius:4,fontWeight:700 }}>⚡</span>}
                    <div style={{ marginTop:2 }}>
                      <span style={{ fontSize:9,padding:"1px 6px",borderRadius:4,fontWeight:700,background:m.categoria==="AUTO AZIENDALE"?"#f3e8ff":"#dbeafe",color:m.categoria==="AUTO AZIENDALE"?"#6d28d9":"#1d4ed8" }}>
                        {m.categoria==="AUTO AZIENDALE"?"🚗 AUTO AZ.":"🚛 DISTRIB."}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#374151" }}>{m.tipo||"—"}</div>
                    <div style={{ fontSize:11,color:"#94a3b8" }}>{[m.marca,m.modello].filter(Boolean).join(" ")||"—"}</div>
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9",fontSize:12 }}>{m.alimentazione||"—"}</td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    <span style={{ padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:bgStato[m.stato]||"#f3f4f6",color:colStato[m.stato]||"#6b7280" }}>{m.stato||"—"}</span>
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9",fontSize:12 }}>
                    {padAssegnato?(<div><div style={{ fontWeight:600,fontSize:12 }}>{padAssegnato.nome}</div><div style={{ fontSize:10,color:"#94a3b8" }}>Cod. {padAssegnato.codice}</div></div>):<span style={{ color:"#94a3b8",fontStyle:"italic" }}>Non assegnato</span>}
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9",fontSize:12 }}>{m.autista||"—"}</td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontSize:11,color:scadW(daysAssic)?"#dc2626":"#374151",fontWeight:scadW(daysAssic)?700:400 }}>{m.scad_assicurazione||"—"}</div>
                    {scadW(daysAssic)&&<div style={{ fontSize:9,color:"#dc2626",fontWeight:700 }}>{daysAssic<0?`Scad. ${-daysAssic}gg fa`:`${daysAssic}gg`}</div>}
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontSize:11,color:scadW(daysRev)?"#dc2626":"#374151",fontWeight:scadW(daysRev)?700:400 }}>{m.scad_revisione||"—"}</div>
                    {scadW(daysRev)&&<div style={{ fontSize:9,color:"#dc2626",fontWeight:700 }}>{daysRev<0?`Scad. ${-daysRev}gg fa`:`${daysRev}gg`}</div>}
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    {percKm!==null?(
                      <div>
                        <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",marginBottom:3 }}>
                          <span>{(m.km_attuale||0).toLocaleString("it-IT")}</span>
                          <span style={{ color:percKm>90?"#dc2626":percKm>70?"#f59e0b":"#166534",fontWeight:700 }}>{percKm}%</span>
                        </div>
                        <div style={{ background:"#e2e8f0",borderRadius:3,height:5,overflow:"hidden" }}>
                          <div style={{ width:`${percKm}%`,height:"100%",background:percKm>90?"#ef4444":percKm>70?"#f59e0b":"#10b981",borderRadius:3 }}/>
                        </div>
                      </div>
                    ):<span style={{ fontSize:11,color:"#94a3b8" }}>—</span>}
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:"#0ea5e9" }}>{m.rata_noleggio?euro(m.rata_noleggio):"—"}</div>
                    {m.canone_noleggio>0&&<div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#94a3b8" }}>costo: {euro(m.canone_noleggio)}</div>}
                  </td>
                  <td style={{ padding:"11px 12px",borderBottom:"1px solid #f1f5f9" }}>
                    <button onClick={()=>setDetailMezzo(m)} style={{ padding:"5px 12px",borderRadius:7,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:12,fontWeight:600,cursor:"pointer" }}>Dettaglio</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0&&(
          <div style={{ textAlign:"center",padding:36,color:"#94a3b8",fontSize:13 }}>
            {search?`Nessun risultato per "${search}"`:"Nessun mezzo. Clicca '+ Nuovo Mezzo' per aggiungere."}
          </div>
        )}
      </div>
    </div>
  );
};
