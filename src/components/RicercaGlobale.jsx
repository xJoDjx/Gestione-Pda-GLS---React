import { useState, useEffect } from "react";
import { Icon } from "./Icons";
import { Badge } from "./BaseComponents";
import { euro, statoColor } from "../utils/formatters";

export const RicercaGlobale = ({ padroncini, conteggi, mezzi = [], palmari = [], codAutisti = [] }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const q = query.toLowerCase();
    const found = [];

    // ── Ricerche esistenti su padroncini (lasciale invariate) ──
    padroncini.forEach(p => {
      // Nome / codice padroncino
      if (p.nome?.toLowerCase().includes(q) || p.codice?.toLowerCase().includes(q)) {
        found.push({ type:"padroncino", label:p.nome, sub:`Cod. ${p.codice}`, tag:p.stato, tagColor:statoColor(p.stato).text, tagBg:statoColor(p.stato).bg });
      }

      // Palmari
      (p.palmari||[]).forEach(pal => {
        if (pal.seriale?.toLowerCase().includes(q) || pal.codice_associato?.toLowerCase().includes(q)) {
          found.push({ type:"padroncino", label:`Palmare ${pal.seriale}`, sub:`${p.nome} · Autista ${pal.codice_associato}`, tag:"Palmare", tagColor:"#92400e", tagBg:"#fef3c7" });
        }
      });

      // Mezzi
      (p.mezzi||[]).forEach(m => {
        if (m.targa?.toLowerCase().includes(q) || m.tipologia?.toLowerCase().includes(q)) {
          found.push({ type:"padroncino", label:`Targa ${m.targa}`, sub:`${p.nome} · ${m.tipologia}`, tag:"Mezzo", tagColor:"#991b1b", tagBg:"#fee2e2", importo:m.tariffa_mensile });
        }
      });

      // Autisti
      (p.codici_autisti||[]).forEach(a => {
        if (a.codice?.toLowerCase().includes(q) || a.contratto?.toLowerCase().includes(q)) {
          found.push({ type:"padroncino", label:`Autista ${a.codice}`, sub:`${p.nome} · Tariffa: ${euro(a.tariffa_fissa||0)}`, tag:"Autista", tagColor:"#1d4ed8", tagBg:"#dbeafe" });
        }
      });

      // ── CRONOLOGIA ──
      (p.cronologia||[]).forEach(ev => {
        const testo = `${ev.tipo} ${ev.dettaglio||""}`.toLowerCase();
        if (testo.includes(q)) {
          const d = new Date(ev.ts);
          const ds = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
          found.push({
            type:"cronologia",
            label: ev.tipo,
            sub: `${p.nome} — ${ds}${ev.dettaglio ? " · " + ev.dettaglio.slice(0,80) : ""}`,
            tag:"Cronologia", tagColor:"#7c3aed", tagBg:"#ede9fe"
          });
        }
      });
    });

    // Conteggi
    conteggi.forEach(c => {
      const p = padroncini.find(x=>x.id===c.padroncino_id);
      const pNome = p?.nome || c.padroncino_id;

      if (pNome.toLowerCase().includes(q)) {
        found.push({ type:"conteggio", label:`Conteggio ${c.mese} ${c.anno}`, sub:pNome, tag:c.mese, tagColor:"#1d4ed8", tagBg:"#dbeafe", importo:c.totale_da_bonificare });
      }
      const push = (label, val, prefix) => {
        if (String(val).toLowerCase().includes(q) || label.toLowerCase().includes(q)) {
          found.push({ type:"conteggio", label:`${prefix} — ${label}`, sub:`${pNome} · ${c.mese} ${c.anno}`, tag:c.mese, tagColor:"#1d4ed8", tagBg:"#dbeafe", importo:val });
        }
      };
      (c.altri_addebiti||[]).forEach(a => {
        if (a.descrizione?.toLowerCase().includes(q) || a.note?.toLowerCase().includes(q))
          push(a.descrizione+(a.note?` (${a.note})`:""), a.importo, "Addebito");
      });
      (c.altri_fatturato||[]).forEach(a => { if (a.descrizione?.toLowerCase().includes(q)) push(a.descrizione, a.importo, "Voce Fatturato"); });
      (c.fatture_fine_mese||[]).forEach(a => { if (a.descrizione?.toLowerCase().includes(q)) push(a.descrizione, a.importo, "Fattura Fine Mese"); });
      (c.cassa_prima_nota||[]).forEach(a => {
        const desc = a.cod ? `COD ${a.cod}` : (a.descrizione||"");
        if (desc.toLowerCase().includes(q)) push(desc, a.importo, "Cassa Prima Nota");
      });
      (c.ricariche_mezzi||[]).forEach(r => { if (r.targa?.toLowerCase().includes(q)) push(`Ricarica ${r.targa}`, r.importo, "Ricarica"); });
      (c.dettagli_mezzi||[]).forEach(m => { if (m.targa?.toLowerCase().includes(q)) push(`Targa ${m.targa}`, m.importo, "Mezzo Conteggio"); });
      if (c.note_varie?.toLowerCase().includes(q)) {
        found.push({ type:"nota", label:"Nota trovata", sub:`${pNome} · ${c.mese} ${c.anno} — "${c.note_varie.slice(0,60)}..."`, tag:"Note", tagColor:"#7c3aed", tagBg:"#ede9fe" });
      }
    });

    // ── Ricerca flotta mezzi globale ──────────────────────────
    const targheGiaTrovate = new Set(found.filter(r => r.tag === "Mezzo").map(r => r.label));
    mezzi.forEach(m => {
      const campi = [m.targa, m.marca, m.modello, m.tipo, m.alimentazione, m.stato, m.autista, m.proprietario, m.note_veicolo];
      if (campi.some(f => f?.toLowerCase().includes(q))) {
        const label = `Targa ${m.targa}`;
        if (targheGiaTrovate.has(label)) return; // evita duplicati
        const pad = padroncini.find(p => p.id === m.padroncino_id);
        found.push({
          type: "mezzo",
          label,
          sub: `${pad ? pad.nome + " · " : ""}${[m.marca, m.modello, m.alimentazione].filter(Boolean).join(" ")} · ${m.stato || ""}`,
          tag: "Flotta Mezzi",
          tagColor: "#991b1b",
          tagBg: "#fee2e2",
        });
      }
    });

    // ── Ricerca flotta palmari globale ────────────────────────
    palmari.forEach(pal => {
      const campi = [pal.seriale, pal.modello, pal.note];
      if (campi.some(f => f?.toLowerCase().includes(q))) {
        const pad = padroncini.find(p => p.id === pal.padroncino_id);
        found.push({
          type: "palmare",
          label: `Palmare ${pal.seriale}`,
          sub: `${pad ? pad.nome + " · " : ""}${pal.modello || ""} · ${pal.stato || ""}`,
          tag: "Palmare",
          tagColor: "#92400e",
          tagBg: "#fef3c7",
        });
      }
    });

    // ── Ricerca flotta cod. autisti globale ───────────────────
    codAutisti.forEach(a => {
      if (a.codice?.toLowerCase().includes(q) || a.note?.toLowerCase().includes(q)) {
        const pad = padroncini.find(p => p.id === a.padroncino_id);
        found.push({
          type: "cod_autista",
          label: `Autista ${a.codice}`,
          sub: `${pad ? pad.nome + " · " : ""}${a.stato || ""}`,
          tag: "Cod. Autista",
          tagColor: "#1d4ed8",
          tagBg: "#dbeafe",
        });
      }
    });

    setResults(found);
  }, [query, padroncini, conteggi, mezzi, palmari, codAutisti]);

  const typeIcon  = { padroncino:"users", conteggio:"calculator", nota:"note", cronologia:"calendar" };
  const typeColor = { padroncino:"#3b82f6", conteggio:"#10b981", nota:"#8b5cf6", cronologia:"#7c3aed" };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#94a3b8" }}>
          <Icon name="search" size={20}/>
        </div>
        <input value={query} onChange={e=>setQuery(e.target.value)} autoFocus
          placeholder="Cerca in tutto: padroncini, targhe, autisti, addebiti, fatture, note, cronologia..."
          style={{ width:"100%",padding:"14px 14px 14px 46px",borderRadius:12,border:"2px solid #e2e8f0",fontSize:15,background:"#fff",boxSizing:"border-box",outline:"none" }}
          onFocus={e=>e.target.style.borderColor="#3b82f6"}
          onBlur={e=>e.target.style.borderColor="#e2e8f0"}
        />
        {query && (
          <button onClick={()=>setQuery("")} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8" }}>
            <Icon name="x" size={16}/>
          </button>
        )}
      </div>

      {query.length>=2 && (
        <div style={{ fontSize:12,color:"#64748b",fontWeight:600 }}>
          {results.length} risultat{results.length===1?"o":"i"} per "{query}"
        </div>
      )}

      {results.length>0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {results.map((r,i)=>(
            <div key={i} style={{ background:"#fff",borderRadius:10,border:"1px solid #e2e8f0",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ width:36,height:36,borderRadius:9,background:(typeColor[r.type]||"#64748b")+"18",display:"flex",alignItems:"center",justifyContent:"center",color:typeColor[r.type]||"#64748b",flexShrink:0 }}>
                <Icon name={typeIcon[r.type]||"note"} size={16}/>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#0f172a" }}>{r.label}</div>
                <div style={{ fontSize:12,color:"#64748b",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.sub}</div>
              </div>
              <div style={{ display:"flex",gap:8,alignItems:"center",flexShrink:0 }}>
                <Badge label={r.tag} color={r.tagColor} bg={r.tagBg}/>
                {r.importo!==undefined && (
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:r.importo>=0?"#166534":"#dc2626" }}>{euro(r.importo)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {query.length>=2 && results.length===0 && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:40,textAlign:"center",color:"#94a3b8",fontSize:13 }}>
          Nessun risultato trovato per "{query}"
        </div>
      )}

      {!query && (
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:40,textAlign:"center" }}>
          <div style={{ color:"#94a3b8",fontSize:13,marginBottom:16 }}>Inizia a digitare per cercare in tutti i dati, inclusa la cronologia</div>
          <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap" }}>
            {["targa","codice autista","mezzo aggiunto","palmare","DURC","acconto"].map(ex=>(
              <button key={ex} onClick={()=>setQuery(ex)} style={{ padding:"6px 12px",borderRadius:7,background:"#f1f5f9",border:"1px solid #e2e8f0",color:"#475569",fontSize:12,cursor:"pointer" }}>{ex}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
