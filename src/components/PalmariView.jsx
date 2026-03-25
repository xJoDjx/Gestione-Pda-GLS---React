// ─────────────────────────────────────────────────────────────────────────────
// PalmariView.jsx  —  refactored con theme.js + sharedUI.jsx
//
// Rimossi dal file originale:
//   ✅ KpiCard         → da sharedUI
//   ✅ StoricoTabella  → da sharedUI
//   ✅ getAzStorico    → da sharedUI
//   ✅ fmtTs           → da sharedUI
//   ✅ STILE_AZ        → da theme
//   ✅ FormInput / FormSelect locali → da sharedUI (stesso nome, stessa API)
//   ✅ Tutti i colori/spacing hardcoded → da theme
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Icon } from "./Icons";
import { euro } from "../utils/formatters";

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


// ─── COSTANTI ─────────────────────────────────────────────────────────────────
const MODELLI = ["Zebra TC52","Zebra TC57","Zebra TC72","Zebra TC77","Honeywell CT60","Honeywell EDA51","Datalogic Memor 20","Altro"];
const STATI   = ["DISPONIBILE","ASSEGNATO","GUASTO","DISMESSO"];

// Colore accent di questa vista (violet)
const ACCENT = C.violet; // "#6d28d9"

// ─── FILE HELPERS ──────────────────────────────────────────────────────────────
const _isElectron = typeof window !== "undefined" && !!window.electronAPI;

const apriFilePalm = async (d) => {
  const src = d.data_b64 || d.url;
  if (!src) return;
  if (_isElectron && window.electronAPI.openFile) {
    try { await window.electronAPI.openFile(src, d.nome); } catch (e) { alert("Impossibile aprire: " + e.message); }
  } else {
    const a = document.createElement("a"); a.href = src; a.target = "_blank"; a.click();
  }
};

const salvaFilePalm = async (d) => {
  const src = d.data_b64 || d.url;
  if (!src) return;
  if (_isElectron && window.electronAPI.saveFile) {
    await window.electronAPI.saveFile(src, d.nome);
  } else {
    const a = document.createElement("a"); a.href = src; a.download = d.nome || "file"; a.click();
  }
};


// ─── STORICO BUILDER ──────────────────────────────────────────────────────────
const CAMPI_STORICO_PALM = [
  ["stato",             "Stato"],
  ["padroncino_id",     "Padroncino"],
  ["tariffa_mensile",   "Tariffa Mensile"],
  ["data_assegnazione", "Data Assegnazione"],
  ["data_fine",         "Data Fine"],
  ["modello",           "Modello"],
  ["imei",              "IMEI"],
  ["sim",               "SIM"],
  ["numero_sim",        "Numero SIM"],
];

const buildStoricoP = (vecchio, nuovo, padroncini = []) => {
  const oggi = new Date().toLocaleDateString("it-IT");
  const ts   = new Date().toISOString();
  return CAMPI_STORICO_PALM.reduce((acc, [campo, label]) => {
    const vOld = String(vecchio[campo] ?? "");
    const vNew = String(nuovo[campo]  ?? "");
    if (vOld === vNew) return acc;
    let da = vOld || "—";
    let a  = vNew || "—";
    if (campo === "padroncino_id") {
      da = padroncini.find(p => p.id === vOld)?.nome || (vOld ? vOld : "Nessuno");
      a  = padroncini.find(p => p.id === vNew)?.nome || (vNew ? vNew : "Nessuno");
    }
    if (campo === "tariffa_mensile") { da = euro(parseFloat(vOld) || 0); a = euro(parseFloat(vNew) || 0); }
    acc.push({ ts, data: oggi, campo: label, da, a });
    return acc;
  }, []);
};


// ─── DETTAGLIO PALMARE ────────────────────────────────────────────────────────
const PalmareDetail = ({ palmare, padroncini, onBack, onSave, onDelete, onDuplicate }) => {
  const [form, setForm] = useState({ ...palmare });
  const [tab,  setTab]  = useState("info");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const storico = form.storico   || [];
  const docs    = form.documenti || [];
  const padAss  = padroncini.find(p => p.id === form.padroncino_id);
  const sc      = statoStyle(form.stato);

  const handleSave = () => {
    const nuoviLog = buildStoricoP(palmare, form, padroncini);
    // Traccia variazioni documenti nello storico
    const docsOld = (palmare.documenti || []).map(d => d.nome || d.id).filter(Boolean);
    const docsNew = docs.map(d => d.nome || d.id).filter(Boolean);
    const ts   = new Date().toISOString();
    const data = new Date().toLocaleDateString("it-IT");
    docsNew.filter(n => !docsOld.includes(n)).forEach(n =>
      nuoviLog.push({ ts, data, campo: "Documento aggiunto", da: "—", a: n })
    );
    docsOld.filter(n => !docsNew.includes(n)).forEach(n =>
      nuoviLog.push({ ts, data, campo: "Documento rimosso", da: n, a: "—" })
    );
    const updated = { ...form, storico: [...storico, ...nuoviLog] };
    if (onSave) onSave(updated, nuoviLog);
  };

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
  const rmDoc = (id) => set("documenti", docs.filter(d => d.id !== id));

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding:      "8px 16px",
        borderRadius: BR.lg,
        border:       "none",
        background:   tab === id ? ACCENT : C.bgPage,
        color:        tab === id ? "#fff" : C.fgMuted,
        fontSize:     TY.md,
        fontWeight:   TY.bold,
        cursor:       "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header ── */}
      <div style={{
        background:     C.white,
        borderRadius:   BR.card,
        border:         `1px solid ${C.border}`,
        padding:        SP.sectionPad,
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: BR.lg,
              background: C.bgPage, border: `1px solid ${C.border}`,
              color: C.fgMuted, fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer",
            }}
          >
            <Icon name="arrow-left" size={14} /> Indietro
          </button>

          <div>
            <div style={{ fontSize: 16, fontWeight: TY.black, color: C.fg }}>
              📱 {form.seriale || "Nuovo"}
              {(form.modello_custom || form.modello) && (
                <span style={{ fontSize: TY.base_, fontWeight: TY.normal, color: C.fgMuted, marginLeft: 8 }}>
                  — {form.modello_custom || form.modello}
                </span>
              )}
            </div>
            <div style={{ fontSize: TY.md, color: C.fgMuted }}>
              {padAss ? `Assegnato a: ${padAss.nome}` : "Non assegnato"}
            </div>
          </div>

          <span style={{
            padding: "3px 10px", borderRadius: BR.xl,
            fontSize: TY.sm, fontWeight: TY.bold,
            background: sc.bg, color: sc.color,
          }}>
            {form.stato}
          </span>
        </div>

        <div style={{ display: "flex", gap: SP.gapSm }}>
          {onDelete && (
            <button
              onClick={() => { if (window.confirm(`Eliminare palmare ${form.seriale || ""}?`)) onDelete(form.id); }}
              style={{ padding: "8px 14px", borderRadius: BR.lg, background: C.dangerBgAlt, border: "none", color: C.danger, fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer" }}
            >Elimina</button>
          )}
          {onDuplicate && (
            <button
              onClick={() => { if (window.confirm(`Duplicare palmare ${form.seriale || ""}?`)) onDuplicate(form); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: BR.lg, background: C.bgPage, border: `1px solid ${C.border}`, color: C.fgMuted, fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer" }}
            >📋 Duplica</button>
          )}
          <button
            onClick={handleSave}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: BR.xl, background: ACCENT, color: "#fff", border: "none", fontSize: TY.base_, fontWeight: TY.bold, cursor: "pointer" }}
          >
            <Icon name="save" size={14} /> Salva
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: SP.gapSm }}>
        <TabBtn id="info"    label="📱 Scheda" />
        <TabBtn id="docs"    label={`📄 Documenti${docs.length > 0 ? ` (${docs.length})` : ""}`} />
        <TabBtn id="storico" label={`📜 Storico${storico.length > 0 ? ` (${storico.length})` : ""}`} />
      </div>

      {/* ══ SCHEDA ══ */}
      {tab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Dati Palmare */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>📱 Dati Palmare</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FormInput  label="Seriale"       value={form.seriale}       onChange={v => set("seriale", v)} />
              <FormSelect label="Stato"         value={form.stato}         onChange={v => set("stato", v)}   options={STATI} />
              <FormSelect label="Modello"       value={form.modello}       onChange={v => set("modello", v)} options={MODELLI} />
              <FormInput  label="Modello custom"value={form.modello_custom} onChange={v => set("modello_custom", v)} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ ...TY.labelStyle, display: "block", marginBottom: 4 }}>Note</label>
              <textarea
                value={form.note || ""}
                onChange={e => set("note", e.target.value)}
                rows={3}
                style={{
                  width: "100%", padding: "8px 10px",
                  border: `1px solid ${C.border}`, borderRadius: BR.lg,
                  fontSize: TY.md, resize: "vertical", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Assegnazione & Tariffe */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>🔗 Assegnazione & Tariffe</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ ...TY.labelStyle, display: "block", marginBottom: 4 }}>Padroncino</label>
                <select
                  value={form.padroncino_id || ""}
                  onChange={e => set("padroncino_id", e.target.value)}
                  style={{
                    width: "100%", padding: "7px 10px",
                    borderRadius: BR.lg, border: `1px solid ${C.border}`,
                    fontSize: TY.md, background: C.white, cursor: "pointer",
                  }}
                >
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p => p.stato === "ATTIVO").map(p => (
                    <option key={p.id} value={p.id}>{p.nome}{p.codice ? ` (${p.codice})` : ""}</option>
                  ))}
                </select>
                {padAss && (
                  <div style={{ marginTop: 6, padding: "6px 10px", background: C.primaryBg, borderRadius: BR.md, fontSize: TY.sm, color: C.primarySoft, fontWeight: TY.semi }}>
                    ✅ {padAss.nome}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormInput label="Tariffa Mensile (€)"  value={form.tariffa_mensile}   onChange={v => set("tariffa_mensile", v)}   type="number" />
                <FormInput label="IMEI"                 value={form.imei}              onChange={v => set("imei", v)} />
                <FormInput label="SIM"                  value={form.sim}               onChange={v => set("sim", v)} />
                <FormInput label="Numero SIM"           value={form.numero_sim}        onChange={v => set("numero_sim", v)} />
                <FormInput label="Data Assegnazione"    value={form.data_assegnazione} onChange={v => set("data_assegnazione", v)} type="date" />
                <FormInput label="Fine"                 value={form.data_fine}         onChange={v => set("data_fine", v)}         type="date" />
              </div>
            </div>
          </div>

          {/* Riepilogo Economico */}
          <div style={{ gridColumn: "1/-1", background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>💰 Riepilogo Economico</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                ["Netta",    euro(form.tariffa_mensile || 0)],
                ["+ IVA",    euro((form.tariffa_mensile || 0) * 1.22)],
                ["Annuale",  euro((form.tariffa_mensile || 0) * 12)],
              ].map(([l, v]) => (
                <div key={l} style={{ padding: "12px 14px", background: C.bgPage, borderRadius: BR.card, border: `1px solid ${C.border}` }}>
                  <div style={{ ...TY.labelStyle, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontFamily: TY.mono, fontWeight: TY.black, fontSize: 16 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ DOCUMENTI ══ */}
      {tab === "docs" && (
        <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg }}>📄 Documenti</div>
            <button onClick={addDoc} style={{ padding: "7px 14px", borderRadius: BR.lg, background: C.violetBg, border: `1px solid ${C.violetBorder}`, color: ACCENT, fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer" }}>
              + Carica
            </button>
          </div>
          {docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.fgSubtle }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div>Nessun documento caricato</div>
            </div>
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
                    <button onClick={() => apriFilePalm(d)}  style={{ padding: "6px 12px", borderRadius: BR.md, background: C.violetBg,   border: `1px solid ${C.violetBorder}`, color: ACCENT,        fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>🖥️ Apri</button>
                    <button onClick={() => salvaFilePalm(d)} style={{ padding: "6px 12px", borderRadius: BR.md, background: C.primaryBg,  border: `1px solid ${C.primaryBorder}`,color: C.primarySoft, fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>💾 Salva</button>
                    <button onClick={() => { if (window.confirm(`Rimuovere "${d.nome}"?`)) rmDoc(d.id); }} style={{ padding: "6px 10px", borderRadius: BR.md, background: C.dangerBgAlt, border: "none", color: C.danger, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ STORICO ══ */}
      {tab === "storico" && (
        <StoricoTabella
          storico={storico}
          entitaNome={form.seriale || "Palmare"}
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
    </div>
  );
};


// ─── LISTA PRINCIPALE ────────────────────────────────────────────────────────
export const PalmariView = ({ palmari = [], padroncini = [], onSave, onDelete, onAddNew }) => {
  const [search,      setSearch]      = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detail,      setDetail]      = useState(null);

  const handleDuplicate = (p) => {
    const copy = {
      ...p,
      id:            `PALM_${Date.now()}`,
      seriale:       "",
      stato:         "DISPONIBILE",
      padroncino_id: "",
      storico:       [],
      documenti:     [],
      data_assegnazione: "",
      data_fine:     "",
    };
    if (onSave) onSave(copy);
    setDetail(copy);
  };

  if (detail) {
    const fresh = palmari.find(p => p.id === detail.id) || detail;
    return (
      <PalmareDetail
        palmare={fresh}
        padroncini={padroncini}
        onBack={() => setDetail(null)}
        onSave={(p, nuoviLog) => { if (onSave) onSave(p, nuoviLog); setDetail(null); }}
        onDelete={id => { if (onDelete) onDelete(id); setDetail(null); }}
        onDuplicate={handleDuplicate}
      />
    );
  }

  const filtered = palmari.filter(p => {
    const q = search.toLowerCase();
    return (
      (!q || [p.seriale, p.modello, p.modello_custom, p.note].some(v => v?.toLowerCase().includes(q))) &&
      (filtroStato === "TUTTI" || p.stato === filtroStato)
    );
  });

  const padNome = (id) => padroncini.find(p => p.id === id)?.nome || "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.gap }}>
      <h1 style={{ fontSize: TY.xl, fontWeight: TY.black, color: C.fg, margin: 0 }}>Palmari</h1>

      {/* ── KPI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP.gapCard }}>
        <KpiCard label="Disponibili"   value={palmari.filter(p => p.stato === "DISPONIBILE").length} icon="📱" sub="pronti" />
        <KpiCard label="Assegnati"     value={palmari.filter(p => p.stato === "ASSEGNATO").length}   icon="📱" sub="in uso" />
        <KpiCard label="Guasti"        value={palmari.filter(p => p.stato === "GUASTO").length}       icon="📱" sub="da riparare" />
        <KpiCard label="Entrate Mens." value={euro(palmari.filter(p => p.stato === "ASSEGNATO").reduce((s, p) => s + (p.tariffa_mensile || 0), 0))} icon="💶" sub="tariffe" />
      </div>

      {/* ── Filtri ── */}
      <div style={{ display: "flex", gap: SP.gapSm, alignItems: "center", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca seriale, modello..." />
        {["TUTTI", ...STATI].map(s => (
          <FilterButton key={s} label={s} active={filtroStato === s} onClick={() => setFiltroStato(s)} activeColor={ACCENT} />
        ))}
        <button
          onClick={onAddNew}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", borderRadius: BR.lg,
            background: C.violetIndigo, color: "#fff", border: "none",
            fontSize: TY.md, fontWeight: TY.bold, cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <Icon name="plus" size={13} /> Nuovo Palmare
        </button>
      </div>

      {/* ── Tabella ── */}
      <TableWrapper>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TheadRow headers={["Seriale / Modello", "Stato", "Padroncino", "Tariffa", "Data Assegnazione", "Fine", ""]} />
          <tbody>
            {filtered.map((p, i) => {
              const sc    = statoStyle(p.stato);
              const rowBg = i % 2 === 0 ? C.white : C.bgRowAlt;
              return (
                <tr
                  key={p.id}
                  style={{ background: rowBg, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.violetBg}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  onClick={() => setDetail(p)}
                >
                  {/* Seriale + Modello */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ fontWeight: TY.black, fontSize: TY.base_, fontFamily: TY.mono }}>{p.seriale}</div>
                      <span style={{ fontSize: TY.xxs, color: C.fgMuted, padding: "1px 6px", borderRadius: BR.xs, fontWeight: TY.bold }}>
                        {p.modello_custom || p.modello || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Stato */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ padding: "2px 8px", borderRadius: BR.sm, fontSize: TY.xs, fontWeight: TY.bold, background: sc.bg, color: sc.color }}>
                      {p.stato}
                    </span>
                  </td>

                  {/* Padroncino */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.md }}>
                    {p.padroncino_id
                      ? <span style={{ fontWeight: TY.semi, color: C.primarySoft }}>{padNome(p.padroncino_id)}</span>
                      : <span style={{ color: C.fgSubtle, fontStyle: "italic" }}>—</span>
                    }
                  </td>

                  {/* Tariffa */}
                  <td style={{ padding: SP.cellLg, borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontWeight: TY.bold, color: ACCENT, fontSize: TY.md }}>
                    {p.tariffa_mensile ? euro(p.tariffa_mensile) : "—"}
                  </td>

                  {/* Date */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.md, color: C.fg }}>
                    {p.data_assegnazione || "—"}
                  </td>
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.md, color: C.fgSubtle }}>
                    {p.data_fine || "—"}
                  </td>

                  {/* Azioni */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button
                        onClick={e => { e.stopPropagation(); setDetail(p); }}
                        style={{ padding: "4px 12px", borderRadius: BR.md, background: C.violetBg, border: `1px solid ${C.violetBorder}`, color: ACCENT, fontSize: TY.sm, fontWeight: TY.semi, cursor: "pointer" }}
                      >
                        Dettaglio
                      </button>
                      <button
                        title="Duplica palmare"
                        onClick={e => { e.stopPropagation(); if (window.confirm(`Duplicare ${p.seriale || "palmare"}?`)) handleDuplicate(p); }}
                        style={{ padding: "4px 8px", borderRadius: BR.md, background: C.bgPage, border: `1px solid ${C.border}`, color: C.fgMuted, fontSize: TY.sm, cursor: "pointer" }}
                      >📋</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: C.fgSubtle, fontSize: TY.base_ }}>
                  Nessun palmare trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrapper>
    </div>
  );
};
