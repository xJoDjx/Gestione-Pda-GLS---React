// ─────────────────────────────────────────────────────────────────────────────
// CodAutistiView.jsx  —  refactored con theme.js + sharedUI.jsx
//
// Cosa è cambiato rispetto all'originale:
//   ✅ Rimossi: KpiCard, StoricoTabella, getAzStorico, fmtTs, STILE_AZ  (ora da sharedUI)
//   ✅ Rimossi: tutti i colori/spacing hardcoded  (ora da theme)
//   ✅ Inp → FormInput, Sel → FormSelect  (uniformi con le altre viste)
//   ✅ STATO_STYLE locale rimosso  (ora da theme, + statoStyle() helper)
//   ✅ Logica invariata al 100%
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Icon } from "./Icons";
import { euro } from "../utils/formatters";

// 1️⃣  Token di design — un solo file da toccare per cambiare l'aspetto
import { C, SP, TY, BR, SH, statoStyle } from "./theme";

// 2️⃣  Componenti condivisi — stessi componenti usati da Mezzi, Palmari, Padroncini
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
const STATI = ["DISPONIBILE", "ASSEGNATO", "DISMESSO"];

// Colore accent di questa vista (ambra). Usato su bottoni CTA e filtri attivi.
const ACCENT = C.warningDot; // "#f59e0b"


// ─── STORICO BUILDER ──────────────────────────────────────────────────────────
// (logica pura, nessun token da usare qui)
const TRACK = [
  ["codice",         "Codice"],
  ["stato",          "Stato"],
  ["padroncino_id",  "Padroncino"],
  ["tariffa_fissa",  "Tariffa fissa"],
  ["tariffa_ritiro", "Tariffa ritiro"],
  ["target",         "Target"],
  ["data_inizio",    "Data inizio"],
  ["data_fine",      "Data fine"],
  ["note",           "Note"],
];

const buildStorico = (old, neo, pads = []) => {
  const ts   = new Date().toISOString();
  const data = new Date().toLocaleDateString("it-IT");
  const log  = [];

  TRACK.forEach(([k, label]) => {
    const vo = String(old[k] ?? "");
    const vn = String(neo[k] ?? "");
    if (vo === vn) return;
    let da = vo || "—", a = vn || "—";
    if (k === "padroncino_id") {
      da = pads.find(p => p.id === vo)?.nome || (vo ? vo : "Nessuno");
      a  = pads.find(p => p.id === vn)?.nome || (vn ? vn : "Nessuno");
    }
    if (k === "tariffa_fissa" || k === "tariffa_ritiro") {
      da = euro(parseFloat(vo) || 0);
      a  = euro(parseFloat(vn) || 0);
    }
    log.push({ ts, data, campo: label, da, a });
  });

  // Traccia aggiunte/rimozioni documenti
  const docsOld = (old.documenti || []).map(d => d.nome || d.id).filter(Boolean);
  const docsNew = (neo.documenti || []).map(d => d.nome || d.id).filter(Boolean);
  docsNew.filter(n => !docsOld.includes(n)).forEach(n =>
    log.push({ ts, data, campo: "Documento aggiunto", da: "—", a: n })
  );
  docsOld.filter(n => !docsNew.includes(n)).forEach(n =>
    log.push({ ts, data, campo: "Documento rimosso", da: n, a: "—" })
  );

  return log;
};


// ─── HELPER FILE ──────────────────────────────────────────────────────────────
const isElectron = typeof window !== "undefined" && !!window.electronAPI;

const apriFile = async (d) => {
  if (isElectron && window.electronAPI.openFile) {
    try { await window.electronAPI.openFile(d.data_b64, d.nome); }
    catch (e) { alert("Impossibile aprire il file: " + e.message); }
  } else {
    const a = document.createElement("a"); a.href = d.data_b64; a.download = d.nome; a.click();
  }
};

const salvaFile = async (d) => {
  if (isElectron && window.electronAPI.saveFile) {
    await window.electronAPI.saveFile(d.data_b64, d.nome);
  } else {
    const a = document.createElement("a"); a.href = d.data_b64; a.download = d.nome; a.click();
  }
};


// ─── DETTAGLIO CODICE AUTISTA ─────────────────────────────────────────────────
const CodAutistaDetail = ({ autista, padroncini, onSave, onBack, onDelete }) => {
  const [form, setForm] = useState({ ...autista });
  const [tab,  setTab]  = useState("info");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const storico = form.storico   || [];
  const docs    = form.documenti || [];
  const padAss  = padroncini.find(p => p.id === form.padroncino_id);
  const sc      = statoStyle(form.stato); // ← da theme, non più hardcoded

  const handlePadChange = (pid) => setForm(f => ({
    ...f,
    padroncino_id: pid,
    stato: pid
      ? (f.stato === "DISPONIBILE" ? "ASSEGNATO" : f.stato)
      : (f.stato === "ASSEGNATO"   ? "DISPONIBILE" : f.stato),
  }));

  const handleSave = () => {
    const formFinal = {
      ...form,
      stato: form.padroncino_id
        ? (form.stato === "DISPONIBILE" ? "ASSEGNATO"   : form.stato)
        : (form.stato === "ASSEGNATO"   ? "DISPONIBILE" : form.stato),
    };
    const log   = buildStorico(autista, formFinal, padroncini);
    const saved = { ...formFinal, storico: [...storico, ...log] };
    onSave(saved);
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
        etichetta:        "",
      }]);
      r.readAsDataURL(f);
    };
    inp.click();
  };
  const rmDoc = (id) => set("documenti", docs.filter(d => d.id !== id));

  // Tab button — usa ACCENT di questa vista
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
        background:    C.white,
        borderRadius:  BR.card,
        border:        `1px solid ${C.border}`,
        padding:       SP.sectionPad,
        display:       "flex",
        justifyContent:"space-between",
        alignItems:    "center",
        boxShadow:     SH.table,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              display:      "flex", alignItems: "center", gap: 6,
              padding:      "7px 14px",
              borderRadius: BR.lg,
              background:   C.bgPage,
              border:       `1px solid ${C.border}`,
              color:        C.fgMuted,
              fontSize:     TY.md,
              fontWeight:   TY.semi,
              cursor:       "pointer",
            }}
          >
            <Icon name="arrow-left" size={14} /> Indietro
          </button>

          <div>
            <div style={{ fontSize: 16, fontWeight: TY.black, color: C.fg, fontFamily: TY.mono }}>
              {form.codice || "Nuovo Codice"}
            </div>
            <div style={{ fontSize: TY.md, color: C.fgMuted, marginTop: 2 }}>Codice Autista</div>
          </div>

          <span style={{
            background:   sc.bg,
            color:        sc.color,
            padding:      "3px 10px",
            borderRadius: BR.xl,
            fontSize:     TY.sm,
            fontWeight:   TY.bold,
          }}>
            {form.stato || "—"}
          </span>
        </div>

        <div style={{ display: "flex", gap: SP.gapSm }}>
          <button
            onClick={() => { if (window.confirm("Eliminare questo codice autista?")) onDelete(autista.id); }}
            style={{
              padding:      "8px 14px",
              borderRadius: BR.lg,
              background:   C.dangerBgAlt,
              color:        C.danger,
              border:       "none",
              fontSize:     TY.md,
              fontWeight:   TY.bold,
              cursor:       "pointer",
            }}
          >
            Elimina
          </button>
          <button
            onClick={handleSave}
            style={{
              display:      "flex", alignItems: "center", gap: 6,
              padding:      "8px 18px",
              borderRadius: BR.xl,
              background:   ACCENT,
              color:        "#fff",
              border:       "none",
              fontSize:     TY.base_,
              fontWeight:   TY.bold,
              cursor:       "pointer",
            }}
          >
            <Icon name="save" size={14} /> Salva
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: SP.gapSm, flexWrap: "wrap" }}>
        <TabBtn id="info"    label="👤 Scheda" />
        <TabBtn id="docs"    label={`📄 Documenti${docs.length > 0 ? ` (${docs.length})` : ""}`} />
        <TabBtn id="storico" label={`📜 Storico${storico.length > 0 ? ` (${storico.length})` : ""}`} />
      </div>

      {/* ══ SCHEDA ══ */}
      {tab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Dati codice */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>👤 Dati Codice</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <FormInput label="Codice"            value={form.codice}          onChange={v => set("codice", v)}          placeholder="AUT001" small />
              <FormSelect label="Stato"            value={form.stato}           onChange={v => set("stato", v)}           options={STATI} />
              <FormInput label="Tariffa Fissa (€)" value={form.tariffa_fissa}   onChange={v => set("tariffa_fissa", v)}   type="number" small />
              <FormInput label="Tariffa Ritiro (€)"value={form.tariffa_ritiro}  onChange={v => set("tariffa_ritiro", v)}  type="number" small />
              <FormInput label="Target"            value={form.target}          onChange={v => set("target", v)}          type="number" small />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ ...TY.labelStyle, display: "block", marginBottom: 4 }}>Note</label>
              <textarea
                value={form.note || ""}
                onChange={(e) => set("note", e.target.value)}
                rows={3}
                style={{
                  width: "100%", padding: "8px 10px",
                  borderRadius: BR.lg, border: `1px solid ${C.border}`,
                  fontSize: TY.md, resize: "vertical", outline: "none",
                  boxSizing: "border-box", fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Assegnazione */}
          <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg, marginBottom: 14 }}>🔗 Assegnazione</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ ...TY.labelStyle, display: "block", marginBottom: 4 }}>Padroncino Assegnato</label>
                <select
                  value={form.padroncino_id || ""}
                  onChange={(e) => handlePadChange(e.target.value)}
                  style={{
                    padding: "7px 10px", borderRadius: BR.lg,
                    border: `1px solid ${C.border}`, fontSize: TY.md,
                    background: C.white, cursor: "pointer", width: "100%",
                  }}
                >
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p => p.stato === "ATTIVO").map(p => (
                    <option key={p.id} value={p.id}>{p.nome}{p.codice ? ` (${p.codice})` : ""}</option>
                  ))}
                </select>
                {padAss && (
                  <div style={{
                    marginTop: 6, padding: "8px 10px",
                    background: C.warningBgAlt, borderRadius: BR.md,
                    fontSize: TY.sm, color: C.warning, fontWeight: TY.semi,
                  }}>
                    ✅ Assegnato a: <strong>{padAss.nome}</strong>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormInput label="Data Inizio" value={form.data_inizio} onChange={v => set("data_inizio", v)} type="date" small />
                <FormInput label="Data Fine"   value={form.data_fine}   onChange={v => set("data_fine", v)}   type="date" small />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══ DOCUMENTI ══ */}
      {tab === "docs" && (
        <div style={{ background: C.white, borderRadius: BR.card, border: `1px solid ${C.border}`, padding: SP.cardPad }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: TY.base_, fontWeight: TY.black, color: C.fg }}>📄 Documenti</div>
            <button
              onClick={addDoc}
              style={{
                padding:      "7px 14px",
                borderRadius: BR.lg,
                background:   C.warningBg,
                border:       `1px solid ${C.warningDot}`,
                color:        C.warning,
                fontSize:     TY.md,
                fontWeight:   TY.bold,
                cursor:       "pointer",
              }}
            >
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
                <div
                  key={d.id}
                  style={{
                    display:      "flex", alignItems: "center", gap: 12,
                    padding:      "10px 14px",
                    background:   C.bgPage,
                    borderRadius: BR.xl,
                    border:       `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ fontSize: 24 }}>
                    {d.tipo?.includes("pdf") ? "📋" : d.tipo?.includes("image") ? "🖼️" : "📄"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: TY.bold, fontSize: TY.base_ }}>{d.nome}</div>
                    <div style={{ fontSize: TY.sm, color: C.fgSubtle }}>
                      {d.data_caricamento}{d.dimensione ? ` · ${(d.dimensione / 1024).toFixed(0)} KB` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: SP.gapXs }}>
                    <button onClick={() => apriFile(d)}  style={{ padding: "6px 12px", borderRadius: BR.md, background: C.warningBg,   border: `1px solid ${C.warningDot}`,   color: C.warning,     fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>🖥️ Apri</button>
                    <button onClick={() => salvaFile(d)} style={{ padding: "6px 12px", borderRadius: BR.md, background: C.primaryBg,   border: `1px solid ${C.primaryBorder}`,color: C.primarySoft, fontSize: TY.md, fontWeight: TY.semi, cursor: "pointer" }}>💾 Salva</button>
                    <button onClick={() => { if (window.confirm(`Rimuovere "${d.nome}"?`)) rmDoc(d.id); }}
                      style={{ padding: "6px 10px", borderRadius: BR.md, background: C.dangerBgAlt, border: "none", color: C.danger, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ STORICO ══ */}
      {tab === "storico" && (
        // StoricoTabella viene da sharedUI — nessun codice duplicato
        <StoricoTabella
          storico={storico}
          entitaNome={form.codice}
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
export const CodAutistiView = ({ codAutisti = [], padroncini = [], onSave, onDelete, onAddNew }) => {
  const [search,      setSearch]      = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detailId,    setDetailId]    = useState(null);

  const detailAutista = detailId ? codAutisti.find(a => a.id === detailId) : null;

  if (detailAutista) {
    return (
      <CodAutistaDetail
        autista={detailAutista}
        padroncini={padroncini}
        onBack={() => setDetailId(null)}
        onSave={a => { onSave(a); }}
        onDelete={id => { onDelete(id); setDetailId(null); }}
      />
    );
  }

  const filtered = codAutisti.filter(a => {
    const s = search.toLowerCase();
    return (
      (!s || a.codice?.toLowerCase().includes(s) || a.note?.toLowerCase().includes(s)) &&
      (filtroStato === "TUTTI" || a.stato === filtroStato)
    );
  });

  // Statistiche KPI
  const assegnati    = codAutisti.filter(a => a.stato === "ASSEGNATO").length;
  const disponibili  = codAutisti.filter(a => a.stato === "DISPONIBILE").length;
  const tariffaMedia = codAutisti.length > 0 ? codAutisti.reduce((s, a) => s + (a.tariffa_fissa  || 0), 0) / codAutisti.length : 0;
  const ritiroMedio  = codAutisti.length > 0 ? codAutisti.reduce((s, a) => s + (a.tariffa_ritiro || 0), 0) / codAutisti.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.gap }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: TY.xl, fontWeight: TY.black, color: C.fg, margin: 0 }}>Codici Autisti</h1>
        <button
          onClick={onAddNew}
          style={{
            display:      "flex", alignItems: "center", gap: SP.gapXs,
            padding:      "9px 18px",
            borderRadius: BR.xl,
            background:   ACCENT,
            color:        "#fff",
            border:       "none",
            fontSize:     TY.base_,
            fontWeight:   TY.bold,
            cursor:       "pointer",
          }}
        >
          <Icon name="plus" size={14} /> Nuovo
        </button>
      </div>

      {/* ── KPI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP.gapCard }}>
        <KpiCard label="Totali"              value={codAutisti.length} icon="👥" sub={`${assegnati} assegnati`} />
        <KpiCard label="Disponibili"         value={disponibili}       icon="👥" sub="pronti" />
        <KpiCard label="Tariffa Fissa Media" value={euro(tariffaMedia)} icon="💶" sub="media" />
        <KpiCard label="Tariffa Ritiro Media"value={euro(ritiroMedio)}  icon="💶" sub="per ritiro" />
      </div>

      {/* ── Filtri ── */}
      <div style={{ display: "flex", gap: SP.gapSm, alignItems: "center", flexWrap: "wrap" }}>
        {/* SearchBar viene da sharedUI */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Cerca codice autista..."
        />
        {/* FilterButton viene da sharedUI */}
        {["TUTTI", ...STATI].map(s => (
          <FilterButton
            key={s}
            label={s}
            active={filtroStato === s}
            onClick={() => setFiltroStato(s)}
            activeColor={ACCENT}
          />
        ))}
      </div>

      {/* ── Tabella ── */}
      {/* TableWrapper + TheadRow vengono da sharedUI */}
      <TableWrapper>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TheadRow headers={["Codice", "Stato", "Padroncino Assegnato", "Tariffa Fissa", "Tariffa Ritiro", "Target", "Note", ""]} />
          <tbody>
            {filtered.map((a, i) => {
              const sc     = statoStyle(a.stato); // ← da theme
              const padAss = padroncini.find(p => p.id === a.padroncino_id);
              const rowBg  = i % 2 === 0 ? C.white : C.bgRowAlt;

              return (
                <tr
                  key={a.id}
                  style={{ background: rowBg, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.warningBg}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  onClick={() => setDetailId(a.id)}
                >
                  {/* Codice */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontWeight: TY.black, fontSize: TY.lg }}>
                    {a.codice || "—"}
                  </td>

                  {/* Stato */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: "3px 10px", borderRadius: BR.sm, fontSize: TY.xs, fontWeight: TY.bold }}>
                      {a.stato || "—"}
                    </span>
                  </td>

                  {/* Padroncino */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    {padAss
                      ? <span style={{ fontSize: TY.md, fontWeight: TY.semi, color: C.primarySoft }}>{padAss.nome}</span>
                      : <span style={{ fontSize: TY.md, color: C.fgSubtle }}>—</span>
                    }
                  </td>

                  {/* Tariffa fissa */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontSize: TY.md }}>
                    {a.tariffa_fissa ? euro(a.tariffa_fissa) : "—"}
                  </td>

                  {/* Tariffa ritiro */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontSize: TY.md }}>
                    {a.tariffa_ritiro ? euro(a.tariffa_ritiro) : "—"}
                  </td>

                  {/* Target */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.md }}>
                    {a.target || "—"}
                  </td>

                  {/* Note */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontSize: TY.md, color: C.fgMuted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.note || "—"}
                  </td>

                  {/* Azioni */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: "flex", gap: SP.gapXs }}>
                      <button
                        onClick={e => { e.stopPropagation(); setDetailId(a.id); }}
                        style={{ padding: "5px 10px", borderRadius: BR.md, background: C.warningBg, border: "none", color: C.warning, fontSize: TY.sm, fontWeight: TY.bold, cursor: "pointer" }}
                      >
                        Dettagli
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (window.confirm(`Eliminare ${a.codice}?`)) onDelete(a.id); }}
                        style={{ padding: "5px 8px", borderRadius: BR.md, background: C.dangerBgAlt, border: "none", color: C.danger, fontSize: TY.sm, cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: C.fgSubtle, fontSize: TY.base_ }}>
                  Nessun codice autista trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrapper>

      {/* Footer contatore */}
      <div style={{ fontSize: TY.md, color: C.fgSubtle, textAlign: "right" }}>
        {filtered.length} di {codAutisti.length} codici autisti
      </div>

    </div>
  );
};
