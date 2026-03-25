// ─────────────────────────────────────────────────────────────────────────────
// MezziView.jsx  —  refactored con theme.js + sharedUI.jsx
//
// Rimossi dal file originale:
//   ✅ KpiCard         → da sharedUI
//   ✅ StoricoTabella  → da sharedUI
//   ✅ getAzStorico    → da sharedUI
//   ✅ fmtTs           → da sharedUI
//   ✅ STILE_AZ        → da theme
//   ✅ STATO_STYLE locale → statoStyle() da theme
//   ✅ Input / Select locali → FormInput / FormSelect da sharedUI
//   ✅ Tutti i colori/spacing hardcoded → da theme
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Icon } from "./Icons";
import { euro, durcDaysLeft } from "../utils/formatters";

import { C, SP, TY, BR, SH, statoStyle } from "./theme";
import {
  KpiCard,
  FormInput,
  FormSelect,
  SearchBar,
  FilterButton,
  TableWrapper,
  TheadRow,
  StoricoTabella,
} from "./sharedUI";

import { ImportaMezziExcel } from "./ImportaMezziExcel";

import { ModalContrattoNoleggio } from "./ModalContrattoNoleggio";

// ─── COSTANTI ─────────────────────────────────────────────────────────────────
const ALIMENTAZIONI = ["Gasolio","Gasolio+mhev","Diesel","Benzina","Elettrico","Ibrido","GPL","Metano","Altro"];
const TIPI          = ["Furgone","Autocarro","Minivan","Camion","Pickup","Auto","Altro"];
const CATEGORIE     = ["DISTRIBUZIONE","AUTO AZIENDALE"];
const CASSONI       = ["Chiuso","Telonato","Frigo","Coibentato","Vasca","Sponda idraulica","Nessuno"];
const STATI_MEZZO   = ["DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO","DISMESSO"];
const STATI_FILTER  = ["TUTTI","DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO"];

// Colore accent di questa vista (blu)
const ACCENT = C.primary; // "#1e40af"


// ─── DAYS LEFT BADGE ─────────────────────────────────────────────────────────
// Componente locale perché è specifico dei mezzi (scadenze assicurazione/revisione)
const DaysLeft = ({ scad }) => {
  if (!scad) return null;
  const days = durcDaysLeft(scad);
  if (days === null) return null;
  const bg    = days < 0 ? C.dangerBgAlt : days < 30 ? C.warningBgAlt : C.successBg;
  const color = days < 0 ? C.danger      : days < 30 ? C.warningDot   : C.success;
  return (
    <span style={{ padding: "3px 8px", borderRadius: BR.sm, background: bg, fontSize: TY.xs, fontWeight: TY.bold, color, whiteSpace: "nowrap" }}>
      {days < 0 ? `⚠️ ${-days}gg fa` : days === 0 ? "⚠️ Oggi" : days < 30 ? `⏰ ${days}gg` : `✅ ${days}gg`}
    </span>
  );
};


// ─── STORICO BUILDER ──────────────────────────────────────────────────────────
const CAMPI_STORICO = [
  ["stato","Stato"],["padroncino_id","Padroncino"],["autista","Autista"],
  ["km_attuale","KM"],["scad_assicurazione","Scad. Assicurazione"],
  ["scad_revisione","Scad. Revisione"],["scad_bollo","Scad. Bollo"],
  ["scad_tachigrafo","Scad. Tachigrafo"],["rata_noleggio","Rata Noleggio"],["canone_noleggio","Canone Noleggio"],
];

const buildStorico = (vecchio, nuovo, padroncini = []) => {
  const oggi = new Date().toLocaleDateString("it-IT");
  const ts   = new Date().toISOString();
  return CAMPI_STORICO.reduce((acc, [campo, label]) => {
    const vOld = String(vecchio[campo] ?? "");
    const vNew = String(nuovo[campo]  ?? "");
    if (vOld === vNew) return acc;
    let da = vOld || "—"; let a = vNew || "—";
    if (campo === "padroncino_id") {
      da = padroncini.find(p => p.id === vOld)?.nome || (vOld ? vOld : "Nessuno");
      a  = padroncini.find(p => p.id === vNew)?.nome || (vNew ? vNew : "Nessuno");
    }
    if (campo === "km_attuale" && vNew && vNew !== "0") a = Number(vNew).toLocaleString("it-IT") + " km";
    if (campo === "rata_noleggio" || campo === "canone_noleggio") {
      da = euro(parseFloat(vOld) || 0); a = euro(parseFloat(vNew) || 0);
    }
    acc.push({ ts, data: oggi, campo: label, da, a });
    return acc;
  }, []);
};


// ─── DETTAGLIO MEZZO ──────────────────────────────────────────────────────────
const MezzoDetail = ({ mezzo, padroncini, onSave, onBack, onDelete, onDuplicate }) => {
  const [form,      setForm] = useState({ ...mezzo });
  const [activeTab, setTab]  = useState("info");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [showContratto, setShowContratto] = useState(false);

  const storico   = form.storico   || [];
  const docs      = form.documenti || [];
  const kmRimasti = form.limitazioni_km && form.km_attuale ? Math.max(0, (form.limitazioni_km || 0) - (form.km_attuale || 0)) : null;
  const percKm    = (form.limitazioni_km && form.km_attuale) ? Math.min(100, Math.round(((form.km_attuale || 0) / (form.limitazioni_km || 1)) * 100)) : null;
  const sc        = statoStyle(form.stato);

  const handleSave = () => {
    const nuoviLog = buildStorico(mezzo, form, padroncini);
    const updated  = { ...form, storico: [...storico, ...nuoviLog] };
    onSave(updated);
  };

  const _isElectron = typeof window !== "undefined" && !!window.electronAPI;

  const apriFile = async (d) => {
    const src = d.data_b64 || d.url;
    if (!src) return;
    if (_isElectron && window.electronAPI.openFile) {
      try { await window.electronAPI.openFile(src, d.nome); } catch (e) { alert("Impossibile aprire: " + e.message); }
    } else {
      const a = document.createElement("a"); a.href = src; a.target = "_blank"; a.click();
    }
  };

  const salvaFile = async (d) => {
    const src = d.data_b64 || d.url;
    if (!src) return;
    if (_isElectron && window.electronAPI.saveFile) {
      await window.electronAPI.saveFile(src, d.nome);
    } else {
      const a = document.createElement("a"); a.href = src; a.download = d.nome || "file"; a.click();
    }
  };

  const rmDoc = (id) => set("documenti", (form.documenti || []).filter(d => d.id !== id));

  const addDoc = () => {
    const inp = document.createElement("input");
    inp.type   = "file";
    inp.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
    inp.onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => set("documenti", [...docs, {
        id:               `DOC_${Date.now()}`,
        nome:             f.name,
        tipo:             f.type,
        dimensione:       f.size,
        data_caricamento: new Date().toISOString().split("T")[0],
        data_b64:         ev.target.result,
      }]);
      r.readAsDataURL(f);
    };
    inp.click();
  };

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "8px 16px", borderRadius: BR.lg, border: "none",
        background: activeTab === id ? ACCENT : C.bgPage,
        color:      activeTab === id ? "#fff" : C.fgMuted,
        fontSize:   TY.md, fontWeight: TY.bold, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  // Colori barra KM
  const kmColor = percKm > 90 ? C.danger : percKm > 70 ? C.warningDot : C.success;
  const kmBg    = percKm > 90 ? C.dangerBg : percKm > 70 ? C.warningBg : C.successBg;
  const kmBorder= percKm > 90 ? C.dangerBorder : percKm > 70 ? C.warningBorder : C.successBorder;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header ── */}
      <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.sectionPad, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: BR.lg, background: C.bgPage, border: `1px solid ${C.border}`, color: C.fgMuted, fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>
            <Icon name="arrow-left" size={14} /> Indietro
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: TY.black, color: C.fg }}>
              {form.targa}{form.marca ? ` — ${form.marca}` : ""} {form.modello}
            </div>
            <div style={{ fontSize: TY.md, color: C.fgMuted }}>{form.tipo || "Tipo"} · {form.alimentazione || "—"}</div>
          </div>
          {(form.alimentazione || "").toLowerCase().includes("elettr") && (
            <span style={{ padding: "2px 8px", borderRadius: BR.sm, background: "#e0f2fe", color: "#0c4a6e", fontSize: TY.sm, fontWeight: TY.bold }}>⚡ ELETTRICO</span>
          )}
          <span style={{ padding: "3px 10px", borderRadius: BR.md, fontSize: TY.sm, fontWeight: TY.bold, background: sc.bg, color: sc.color }}>{form.stato}</span>
        </div>

        <div style={{ display: "flex", gap: SP.gapSm }}>
          {onDelete && (
            <button onClick={() => { if (window.confirm(`Eliminare ${form.targa}?`)) onDelete(form.id); }}
              style={{ padding: "8px 14px", borderRadius: BR.lg, background: C.dangerBgAlt, border: "none", color: C.danger, fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer" }}>
              Elimina
            </button>
          )}
          {onDuplicate && (
            <button onClick={() => { if (window.confirm(`Duplicare ${form.targa || "questo mezzo"}? Verrà creata una copia senza targa da completare.`)) onDuplicate(form); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: BR.lg, background: C.bgPage, border: `1px solid ${C.border}`, color: C.fgMuted, fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer" }}>
              📋 Duplica
            </button>
          )}
          <button onClick={handleSave}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: BR.xl, background: ACCENT, color: "#fff", border: "none", fontSize: TY.base_, fontWeight: TY.bold, cursor: "pointer" }}>
            <Icon name="save" size={14} /> Salva
          </button>
          <button onClick={() => setShowContratto(true)}
            style={{ padding: "8px 14px", borderRadius: BR.lg, background: C.bgPage,
              border: `1px solid ${C.border}`, color: C.fgMuted, fontSize: TY.md,
              fontWeight: TY.bold, cursor: "pointer" }}>
            📄 Crea Contratto
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: SP.gapSm, flexWrap: "wrap" }}>
        <TabBtn id="info"    label="🚛 Scheda" />
        <TabBtn id="storico" label={`📜 Storico${storico.length > 0 ? ` (${storico.length})` : ""}`} />
        <TabBtn id="docs"    label={`📄 Documenti${docs.length > 0 ? ` (${docs.length})` : ""}`} />
        <TabBtn id="vendita" label="💰 Vendita" />
      </div>

      {/* ══ SCHEDA ══ */}
      {activeTab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Dati Veicolo */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>🚛 Dati Veicolo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FormInput  label="Targa"          value={form.targa}          onChange={v => set("targa", v.toUpperCase())} small />
              <FormSelect label="Stato"          value={form.stato}          onChange={v => set("stato", v)}               options={STATI_MEZZO} />
              <FormSelect label="Categoria"      value={form.categoria || "DISTRIBUZIONE"} onChange={v => set("categoria", v)} options={CATEGORIE} />
              <FormSelect label="Tipo"           value={form.tipo}           onChange={v => set("tipo", v)}                options={TIPI} />
              <FormInput  label="Marca"          value={form.marca}          onChange={v => set("marca", v)}               small />
              <FormInput  label="Modello"        value={form.modello}        onChange={v => set("modello", v)}             small />
              <FormInput  label="Anno Imm."      value={form.anno_imm}       onChange={v => set("anno_imm", v)}            type="number" small />
              <FormSelect label="Tipo Cassone"   value={form.tipo_cassone}   onChange={v => set("tipo_cassone", v)}        options={CASSONI} />
              <FormSelect label="Alimentazione"  value={form.alimentazione}  onChange={v => set("alimentazione", v)}       options={ALIMENTAZIONI} />
              <FormInput  label="Colore"         value={form.colore}         onChange={v => set("colore", v)}              small />
              <FormInput  label="Targa Rimorchio"value={form.targa_rimorchio}onChange={v => set("targa_rimorchio", v)}     small />
              <FormInput  label="Portata (kg)"   value={form.portata_kg}     onChange={v => set("portata_kg", v)}          type="number" small />
              <FormInput  label="Volume (m³)"    value={form.volume_m3}      onChange={v => set("volume_m3", v)}           type="number" small />
            </div>
            <div style={{ marginTop: 12 }}>
              <FormInput label="Note veicolo" value={form.note_veicolo} onChange={v => set("note_veicolo", v)} />
            </div>
          </div>

          {/* Scadenze */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>📋 Scadenze</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["Scadenza Assicurazione", "scad_assicurazione"],
                ["Scadenza Revisione",     "scad_revisione"],
                ["Scadenza Bollo",         "scad_bollo"],
                ["Scadenza Tachigrafo",    "scad_tachigrafo"],
              ].map(([label, key]) => (
                <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <FormInput label={label} value={form[key]} onChange={v => set(key, v)} type="date" small />
                  </div>
                  <DaysLeft scad={form[key]} />
                </div>
              ))}
            </div>
          </div>

          {/* Contratto Noleggio */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>📄 Contratto Noleggio</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FormInput label="Proprietario / Società" value={form.proprietario}  onChange={v => set("proprietario", v)}  small />
              <FormInput label="N° Contratto"           value={form.n_contratto}   onChange={v => set("n_contratto", v)}   small />
              <FormInput label="Inizio"                 value={form.data_inizio}   onChange={v => set("data_inizio", v)}   type="date" small />
              <div>
                <FormInput label="Fine" value={form.data_fine} onChange={v => set("data_fine", v)} type="date" small />
                {form.data_fine && (() => {
                  const d = durcDaysLeft(form.data_fine);
                  if (d === null || d > 90) return null;
                  return <div style={{ marginTop: 4, fontSize: TY.xs, fontWeight: TY.bold, color: d < 0 ? C.danger : d < 30 ? C.warningDot : C.success }}>{d < 0 ? `Scaduto da ${-d}gg` : `Scade tra ${d}gg`}</div>;
                })()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormInput label="Canone nostro (€)" value={form.canone_noleggio} onChange={v => set("canone_noleggio", v)} type="number" small />
                <div style={{ fontSize: TY.xs, color: C.fgSubtle }}>Quanto paghiamo noi</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormInput label="Rata Padroncino (€)" value={form.rata_noleggio} onChange={v => set("rata_noleggio", v)} type="number" small />
                <div style={{ fontSize: TY.xs, color: "#0ea5e9", fontWeight: TY.semi }}>⬆ Addebitato al padroncino</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ ...TY.labelStyle, color: C.violet }}>⚡ Maggiorazione Ricarica (%)</label>
                <input
                  type="number" step="1" min="0" max="200"
                  value={form.maggiorazione_ricarica_pct ?? ""}
                  placeholder="es. 20"
                  onChange={e => set("maggiorazione_ricarica_pct", e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
                  style={{ padding: "6px 9px", borderRadius: BR.lg, border: `1px solid ${C.violetBorder}`, fontSize: TY.md, background: C.white, width: "70px", outline: "none", fontWeight: TY.bold, color: C.violet }}
                />
              </div>

              {/* Riepilogo noleggio */}
              <div style={{ gridColumn: "1/-1", padding: "10px 12px", background: C.bgPage, borderRadius: BR.lg, fontSize: TY.md }}>
                {[
                  ["Canone nostro",    euro(form.canone_noleggio || 0), C.fg],
                  ["Rata padroncino",  euro(form.rata_noleggio || 0),   "#0ea5e9"],
                  ["Rata + IVA 22%",   euro((form.rata_noleggio || 0) * 1.22), C.success],
                ].map(([l, v, color]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: C.fgMuted }}>{l}</span>
                    <span style={{ fontFamily: TY.mono, fontWeight: TY.bold, color }}>{v}</span>
                  </div>
                ))}
                {(form.canone_noleggio || 0) > 0 && (form.rata_noleggio || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                    <span style={{ color: C.fgMuted }}>Margine mensile</span>
                    <span style={{ fontFamily: TY.mono, fontWeight: TY.bold, color: (form.rata_noleggio || 0) - (form.canone_noleggio || 0) >= 0 ? C.success : C.danger }}>
                      {euro((form.rata_noleggio || 0) - (form.canone_noleggio || 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KM & Assegnazione */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>🗺️ Chilometraggio & Assegnazione</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1/-1", display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ ...TY.labelStyle }}>Padroncino Assegnato</label>
                <select
                  value={form.padroncino_id || ""}
                  onChange={e => set("padroncino_id", e.target.value)}
                  style={{ padding: "7px 10px", borderRadius: BR.lg, border: `1px solid ${C.border}`, fontSize: TY.md, background: C.white, cursor: "pointer" }}
                >
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p => p.stato === "ATTIVO").map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.codice})</option>
                  ))}
                </select>
              </div>
              <FormInput label="Autista"    value={form.autista}       onChange={v => set("autista", v)}       small />
              <FormInput label="Limite KM"  value={form.limitazioni_km} onChange={v => set("limitazioni_km", v)} type="number" small />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={TY.labelStyle}>KM Attuali</label>
                <input
                  type="number"
                  value={form.km_attuale ?? ""}
                  onChange={e => set("km_attuale", parseFloat(e.target.value) || 0)}
                  style={{ padding: "6px 9px", borderRadius: BR.lg, border: `1px solid ${C.border}`, fontSize: TY.md, background: C.white, width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {percKm !== null && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: BR.lg, background: kmBg, border: `1px solid ${kmBorder}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: TY.md, fontWeight: TY.bold, marginBottom: 8 }}>
                  <span>KM: {(form.km_attuale || 0).toLocaleString("it-IT")}</span>
                  <span style={{ color: kmColor }}>{percKm}%</span>
                </div>
                <div style={{ background: C.border, borderRadius: BR.xs, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${percKm}%`, height: "100%", background: percKm > 90 ? "#ef4444" : percKm > 70 ? C.warningDot : "#10b981", borderRadius: BR.xs, transition: "width 0.3s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: TY.sm, color: C.fgMuted }}>
                  <span>Limite: {(form.limitazioni_km || 0).toLocaleString("it-IT")}</span>
                  <span style={{ fontWeight: TY.bold }}>Rimasti: {kmRimasti?.toLocaleString("it-IT") || "—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ VENDITA ══ */}
      {activeTab === "vendita" && (
        <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
          <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>💰 Dettagli Vendita</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FormInput label="Data Vendita" value={form.data_vendita}    onChange={v => set("data_vendita", v)}    type="date"   small />
            <FormInput label="Importo (€)"  value={form.importo_vendita} onChange={v => set("importo_vendita", v)} type="number" small />
            <div style={{ gridColumn: "1/-1" }}>
              <FormInput label="Acquirente" value={form.acquirente} onChange={v => set("acquirente", v)} />
            </div>
          </div>
        </div>
      )}

      {/* ══ DOCUMENTI ══ */}
      {activeTab === "docs" && (
        <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg }}>📄 Documenti</div>
            <button onClick={addDoc} style={{ padding: "7px 14px", borderRadius: BR.lg, background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, color: C.primarySoft, fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer" }}>
              + Carica
            </button>
          </div>
          {docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: C.fgSubtle, fontSize: TY.base_ }}>Nessun documento caricato</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: SP.gapSm }}>
              {docs.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.bgPage, borderRadius: BR.xl, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 24 }}>{d.tipo?.includes("pdf") ? "📋" : d.tipo?.includes("image") ? "🖼️" : "📄"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: TY.bold, fontSize: TY.base_ }}>{d.nome}</div>
                    <div style={{ fontSize: TY.sm, color: C.fgSubtle }}>{d.data_caricamento}{d.dimensione ? ` · ${(d.dimensione / 1024).toFixed(0)} KB` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: SP.gapXs }}>
                    <button onClick={() => apriFile(d)}  style={{ padding: "6px 12px", borderRadius: BR.md, background: C.warningBg,  border: `1px solid ${C.warningDot}`,    color: C.warning,     fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>🖥️ Apri</button>
                    <button onClick={() => salvaFile(d)} style={{ padding: "6px 12px", borderRadius: BR.md, background: C.primaryBg,  border: `1px solid ${C.primaryBorder}`, color: C.primarySoft, fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>💾 Salva</button>
                    <button onClick={() => { if (window.confirm(`Rimuovere "${d.nome}"?`)) rmDoc(d.id); }} style={{ padding: "6px 10px", borderRadius: BR.md, background: C.dangerBgAlt, border: "none", color: C.danger, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ STORICO ══ */}
      {activeTab === "storico" && (
        <StoricoTabella
          storico={storico}
          entitaNome={form.targa}
          accentColor={ACCENT}
          onAddNota={(campo, testo) =>
            set("storico", [...storico, {
              ts:      new Date().toISOString(),
              data:    new Date().toLocaleDateString("it-IT"),
              campo:   campo.trim() || "Nota manuale",
              da:      "—",
              a:       testo.trim(),
              manuale: true,
            }])
          }
        />
      )}
      {/* ─── MOSTRA DIALOG CONTRATTO ─── */}
      {showContratto && (
        <ModalContrattoNoleggio
          mezzo={form}
          padroncini={padroncini}
          onClose={() => setShowContratto(false)}
        />
      )}
    </div>
  );
};


// ─── LISTA PRINCIPALE ────────────────────────────────────────────────────────
export const MezziView = ({ mezzi = [], padroncini = [], onSave, onDelete, onAddNew }) => {
  const [search,          setSearch]          = useState("");
  const [filtroStato,     setFiltroStato]     = useState("TUTTI");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [detailMezzo,     setDetailMezzo]     = useState(null);
  const [sortCol,         setSortCol]         = useState(null);
  const [sortDir,         setSortDir]         = useState(null); // "asc" | "desc"

  const handleSort = (col) => {
    if (!col) return;
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortCol(null); setSortDir(null); }
  };

  const handleDuplicate = (m) => {
    const copy = {
      ...m,
      id:            `mezzo_${Date.now()}`,
      targa:         "",
      stato:         "DISPONIBILE",
      padroncino_id: "",
      autista:       "",
      km_attuale:    0,
      storico:       [],
      documenti:     [],
    };
    onSave(copy);
    setDetailMezzo(copy);
  };

  if (detailMezzo) {
    const fresh = mezzi.find(m => m.id === detailMezzo.id) || detailMezzo;
    return <MezzoDetail mezzo={fresh} padroncini={padroncini} onBack={() => setDetailMezzo(null)} onSave={m => { onSave(m); setDetailMezzo(null); }} onDelete={onDelete} onDuplicate={handleDuplicate} />;
    {showContratto && (
    <ModalContrattoNoleggio
      mezzo={form}
      padroncini={padroncini}
      onClose={() => setShowContratto(false)}
    />
  )}
  
  }

  const filtered = mezzi.filter(m => {
    const s       = search.toLowerCase();
    const padNome = padroncini.find(p => p.id === m.padroncino_id)?.nome || "";
    const match   = !s || [...[m.targa, m.marca, m.modello, m.tipo, m.alimentazione, m.autista, m.proprietario, m.stato, m.note_veicolo], padNome].some(v => v?.toLowerCase().includes(s));
    return match && (filtroStato === "TUTTI" || m.stato === filtroStato) && (!filtroCategoria || (m.categoria || "DISTRIBUZIONE") === filtroCategoria);
  });

  const getSortVal = (m, col) => {
    if (col === "_padNome") {
      const pad = padroncini.find(p => p.id === m.padroncino_id);
      if (pad) return pad.nome || "";
      if (m.categoria === "AUTO AZIENDALE" && m.autista) return m.autista;
      return "";
    }
    if (col === "_percKm") return (m.limitazioni_km && m.km_attuale) ? Math.round((m.km_attuale / m.limitazioni_km) * 100) : -1;
    return m[col] ?? "";
  };

  const sorted = sortCol && sortDir
    ? [...filtered].sort((a, b) => {
        const va = getSortVal(a, sortCol);
        const vb = getSortVal(b, sortCol);
        let cmp  = (typeof va === "number" && typeof vb === "number") ? va - vb : String(va).localeCompare(String(vb), "it");
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const scadImm    = mezzi.filter(m => [m.scad_assicurazione, m.scad_revisione].map(s => durcDaysLeft(s)).filter(d => d !== null).some(d => d < 30)).length;
  const totEntrate = mezzi.reduce((s, m) => s + (m.rata_noleggio || 0), 0);
  const totMargine = mezzi.reduce((s, m) => s + (m.rata_noleggio || 0) - (m.canone_noleggio || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.gap }}>

      {/* ── KPI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP.gapCard }}>
        <KpiCard label="Totali"            value={mezzi.length}                                          icon="🚛" sub={`${mezzi.filter(m => m.stato === "ASSEGNATO").length} assegnati`} />
        <KpiCard label="Disponibili"       value={mezzi.filter(m => m.stato === "DISPONIBILE").length}   icon="🚛" sub="pronti" />
        <KpiCard label="Entrate Noleggio"  value={euro(totEntrate)}                                      icon="💶" sub="mensile" />
        <KpiCard label="Margine"           value={euro(totMargine)}                                      icon="💶" sub="rata − canone" />
      </div>

      {/* ── Banner scadenze ── */}
      {scadImm > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: C.warningBg, borderRadius: BR.pill, border: `1px solid ${C.warningBorder}` }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: TY.base_, fontWeight: TY.bold, color: C.warning }}>{scadImm} mezzo/i con scadenze entro 30 giorni</span>
        </div>
      )}

      {/* ── Filtri ── */}
      <div style={{ display: "flex", gap: SP.gapSm, alignItems: "center", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca targa, marca, modello, padroncino..." />

        {/* Filtri stato */}
        {STATI_FILTER.map(s => (
          <FilterButton key={s} label={s} active={filtroStato === s} onClick={() => setFiltroStato(s)} activeColor={ACCENT} />
        ))}

        {/* Divisore */}
        <div style={{ width: 1, background: C.border, height: 24 }} />

        {/* Filtri categoria */}
        {[["TUTTI", ""], ["🚛 DISTRIB.", "DISTRIBUZIONE"], ["🚗 AUTO AZ.", "AUTO AZIENDALE"]].map(([label, cat]) => (
          <FilterButton key={cat} label={label} active={filtroCategoria === cat} onClick={() => setFiltroCategoria(cat)} activeColor={C.violet} />
        ))}

        {/* Bottoni nuovo */}
        <div style={{ display: "flex", gap: SP.gapXs }}>
          <button onClick={() => onAddNew("DISTRIBUZIONE")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: BR.lg, background: ACCENT, color: "#fff", border: "none", fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer", whiteSpace: "nowrap" }}>
            <Icon name="plus" size={13} /> 🚛 Distribuzione
          </button>
          <button onClick={() => onAddNew("AUTO AZIENDALE")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: BR.lg, background: C.violet, color: "#fff", border: "none", fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer", whiteSpace: "nowrap" }}>
            <Icon name="plus" size={13} /> 🚗 Auto Aziendale
          </button>
            <ImportaMezziExcel mezziEsistenti={mezzi} onImport={onSave} />
        </div>
      </div>

      {/* ── Tabella ── */}
      <TableWrapper overflow="auto">
        <table style={{ width: "100%", minWidth: "1100px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bgPage, borderBottom: `2px solid ${C.border}` }}>
              {[
                { label: "Targa",        col: "targa" },
                { label: "Marca/Modello",col: "marca" },
                { label: "Tipo",         col: "tipo" },
                { label: "Stato",        col: "stato" },
                { label: "Padroncino",   col: "_padNome" },
                { label: "Scad. Ass.",   col: "scad_assicurazione" },
                { label: "Scad. Rev.",   col: "scad_revisione" },
                { label: "Rata",         col: "rata_noleggio" },
                { label: "KM Attuali",   col: "km_attuale" },
                { label: "Utilizzo KM",  col: "_percKm" },
                { label: "",             col: null },
              ].map(({ label, col }) => {
                const isActive = col && sortCol === col;
                const icon     = !col ? "" : !isActive ? " ↕" : sortDir === "asc" ? " ↑" : " ↓";
                return (
                  <th
                    key={label || "__actions"}
                    onClick={() => handleSort(col)}
                    style={{
                      padding: SP.cellLg,
                      textAlign: "left",
                      fontSize: TY.xs,
                      fontWeight: TY.black,
                      color: isActive ? ACCENT : C.fgMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      cursor: col ? "pointer" : "default",
                      userSelect: "none",
                      borderBottom: isActive ? `2px solid ${ACCENT}` : "none",
                    }}
                  >
                    {label}<span style={{ opacity: isActive ? 1 : 0.35, fontSize: 10 }}>{icon}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const percKmRow = (m.limitazioni_km && m.km_attuale) ? Math.round((m.km_attuale / m.limitazioni_km) * 100) : null;
              const pad = padroncini.find(p => p.id === m.padroncino_id);
              const sc  = statoStyle(m.stato);
              const rowBg = i % 2 === 0 ? C.white : C.bgRowAlt;

              // Colonna "Padroncino": se auto aziendale senza padroncino, mostra autista
              const padLabel = pad ? pad.nome
                : (m.categoria === "AUTO AZIENDALE" && m.autista)
                  ? m.autista
                  : null;
              const padIsAutista = !pad && m.categoria === "AUTO AZIENDALE" && m.autista;

              return (
                <tr
                  key={m.id || i}
                  style={{ background: rowBg, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  onClick={() => setDetailMezzo(m)}
                >
                  {/* Targa + categoria */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: SP.gapXs }}>
                      <div style={{ fontWeight: TY.black, fontSize: TY.md, fontFamily: TY.mono }}>{m.targa || "—"}</div>
                      <span style={{ fontSize: TY.xxs, padding: "1px 6px", borderRadius: BR.xs, fontWeight: TY.bold, background: m.categoria === "AUTO AZIENDALE" ? C.violetBgAlt : C.primaryBgAlt, color: m.categoria === "AUTO AZIENDALE" ? C.violet : C.primarySoft, whiteSpace: "nowrap" }}>
                        {m.categoria === "AUTO AZIENDALE" ? "🚗 AUTO AZ." : "🚛 DISTRIB."}
                      </span>
                    </div>
                  </td>

                  {/* Marca + modello */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: SP.gapXs }}>
                      <span style={{ fontSize: TY.md, fontWeight: TY.bold, color: C.fg, whiteSpace: "nowrap" }}>
                        {[m.marca, m.modello].filter(Boolean).join(" ") || "—"}
                      </span>
                      <span style={{ fontSize: TY.xxs, color: C.fgSubtle, whiteSpace: "nowrap" }}>• {m.alimentazione || "—"}</span>
                    </div>
                  </td>

                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.md, color: C.fgMuted }}>{m.tipo || "—"}</td>

                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ padding: "2px 8px", borderRadius: BR.sm, fontSize: TY.xs, fontWeight: TY.bold, background: sc.bg, color: sc.color }}>{m.stato || "—"}</span>
                  </td>

                  {/* Padroncino / Autista auto aziendale */}
                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.md }}>
                    {padLabel
                      ? <span style={{ fontWeight: TY.semi, color: padIsAutista ? C.violet : C.fg }}>
                          {padIsAutista ? "🧑 " : ""}{padLabel}
                        </span>
                      : <span style={{ color: C.fgSubtle, fontStyle: "italic" }}>—</span>
                    }
                  </td>

                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}` }}><DaysLeft scad={m.scad_assicurazione} /></td>
                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}` }}><DaysLeft scad={m.scad_revisione} /></td>

                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontSize: TY.md, fontWeight: TY.bold, color: C.fg }}>
                    {m.rata_noleggio ? euro(m.rata_noleggio) : "—"}
                  </td>

                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontSize: TY.md, fontWeight: TY.bold, color: C.fg }}>
                    {m.km_attuale ? m.km_attuale.toLocaleString("it-IT") : "—"}
                  </td>

                  {/* Barra utilizzo KM */}
                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}` }}>
                    {percKmRow !== null ? (
                      <div title={`Limite contratto: ${m.limitazioni_km?.toLocaleString("it-IT")} km`} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "help" }}>
                        <div style={{ background: C.border, borderRadius: BR.xs, height: 7, width: "80px", overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ width: `${Math.min(percKmRow, 100)}%`, height: "100%", background: percKmRow > 90 ? "#ef4444" : percKmRow > 70 ? C.warningDot : "#10b981", borderRadius: BR.xs, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ fontSize: TY.sm, fontWeight: TY.black, fontFamily: TY.mono, color: percKmRow > 90 ? C.danger : percKmRow > 70 ? C.warningDot : C.success, minWidth: "35px" }}>
                          {percKmRow}%
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: TY.md, color: C.fgSubtle, fontFamily: TY.mono }}>—</div>
                    )}
                  </td>

                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={e => { e.stopPropagation(); setDetailMezzo(m); }}
                        style={{ padding: "4px 10px", borderRadius: BR.sm, background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, color: C.primarySoft, fontSize: TY.sm, fontWeight: TY.semi, cursor: "pointer" }}>
                        Dettaglio
                      </button>
                      <button
                        title="Duplica mezzo"
                        onClick={e => { e.stopPropagation(); if (window.confirm(`Duplicare ${m.targa || "questo mezzo"}?`)) handleDuplicate(m); }}
                        style={{ padding: "4px 8px", borderRadius: BR.sm, background: C.bgPage, border: `1px solid ${C.border}`, color: C.fgMuted, fontSize: TY.sm, cursor: "pointer" }}>
                        📋
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrapper>

    </div>
  );
};
