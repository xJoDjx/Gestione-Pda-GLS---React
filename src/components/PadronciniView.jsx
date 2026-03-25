// ─────────────────────────────────────────────────────────────────────────────
// PadronciniView.jsx  —  refactored con theme.js + sharedUI.jsx
//
// Rimossi dal file originale:
//   ✅ KpiCard locale   → da sharedUI
//   ✅ Tutti i colori/spacing hardcoded → da theme
//   ✅ STATO_STYLE duplicato → statoStyle() da theme
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Icon } from "./Icons";
import { Badge } from "./BaseComponents";
import { PadroncinoDetail } from "./PadroncinoDetail";
import { euro, durcColor, dvrColor, statoColor, durcDaysLeft } from "../utils/formatters";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Truck, Users, Smartphone, AlertTriangle, TrendingUp, Calendar } from "lucide-react";

import { C, SP, TY, BR, SH,PD } from "./theme";
import {
  KpiCard,
  SearchBar,
  FilterButton,
  TableWrapper,
  TheadRow,
} from "./sharedUI";


// Colore accent di questa vista (blu scuro, primary)
const ACCENT = C.primary; // "#1e40af"


export const PadronciniView = ({
  padroncini, conteggi, mezzi = [], palmariGlobali = [], codAutistiGlobali = [],
  onSave, onSaveConteggio, onSaveMezzo, onDelete, onAddNew, onLogChange,
  onSavePalmare, onSaveCodAutista, utente = "",
}) => {
  const [search,      setSearch]      = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detailPadId, setDetailPadId] = useState(null);

  // Derived state: sempre fresco dai props (fix bug schermata bianca)
  const detailPad = detailPadId ? padroncini.find(p => p.id === detailPadId) : null;

  const pAttivi   = padroncini.filter(p => p.stato === "ATTIVO");
  const pDismessi = padroncini.filter(p => p.stato !== "ATTIVO");
  const durcScad  = padroncini.filter(p => p.durc_stato === "SCADUTO");
  const dvrScad   = padroncini.filter(p => p.dvr_stato  === "NON PRESENTE");
  const alertDocs = durcScad.length + dvrScad.length;

  const tuttiMezzi   = mezzi || [];
  const mezziAttivi  = tuttiMezzi.filter(m => m.stato === "ATTIVO" || m.stato === "ASSEGNATO");
  const tuttiPalmari = padroncini.flatMap(p => (p.palmari || []).map(m => ({ ...m, padNome: p.nome })));
  const palmAttivi   = tuttiPalmari.filter(m => m.stato !== "DISMESSO");

  if (detailPad) {
    return (
      <PadroncinoDetail
        padroncino={detailPad}
        conteggi={conteggi}
        onBack={() => setDetailPadId(null)}
        onSave={(updatedPad) => { onSave(updatedPad); }}
        onSaveConteggio={onSaveConteggio}
        onLogChange={onLogChange}
        mezziFlotta={mezzi}
        palmariFlotta={palmariGlobali}
        onSaveMezzoFlotta={onSaveMezzo}
        onSavePalmare={onSavePalmare}
        codAutistiFlotta={codAutistiGlobali}
        onSaveCodAutista={onSaveCodAutista}
        utente={utente}
      />
    );
  }

  const filtered = padroncini.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.nome?.toLowerCase().includes(s) || p.codice?.toLowerCase().includes(s);
    const matchStato  = filtroStato === "TUTTI" || p.stato === filtroStato;
    return matchSearch && matchStato;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.gap }}>

      {/* ── KPI ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <KpiCard
          label="Padroncini Attivi"
          value={pAttivi.length}
          sub={`${pDismessi.length} dismessi · ${padroncini.length} totali`}
          icon={<Users size={16} />}
        />
        <KpiCard
          label="Alert Documenti"
          value={alertDocs}
          sub={`${durcScad.length} DURC · ${dvrScad.length} DVR`}
          icon={<AlertTriangle size={16} />}
          alert={alertDocs > 0}
        />
        <KpiCard
          label="Flotta Mezzi"
          value={mezziAttivi.length}
          sub={`${tuttiMezzi.length} totali · ${tuttiMezzi.filter(m => m.stato === "DISPONIBILE").length} disponibili`}
          icon={<Truck size={16} />}
        />
        <KpiCard
          label="Palmari Attivi"
          value={palmAttivi.length}
          sub={`su ${tuttiPalmari.length} totali`}
          icon={<Smartphone size={16} />}
        />
      </div>

      {/* ── Filtri ── */}
      <div style={{ display: "flex", gap: SP.gapSm, alignItems: "center" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Cerca padroncino per nome o codice..." />
        {["TUTTI", "ATTIVO", "DISMESSO"].map(s => (
          <FilterButton key={s} label={s} active={filtroStato === s} onClick={() => setFiltroStato(s)} activeColor={ACCENT} />
        ))}
        <button
          onClick={onAddNew}
          style={{
            display: "flex", alignItems: "center", gap: SP.gapXs,
            padding: "9px 18px", borderRadius: BR.xl,
            background: ACCENT, color: "#fff", border: "none",
            fontSize: TY.base_, fontWeight: TY.bold, cursor: "pointer",
          }}
        >
          <Icon name="plus" size={14} /> Nuovo
        </button>
      </div>

      {/* ── Tabella ── */}
      <TableWrapper>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TheadRow headers={["Padroncino", "Stato", "DURC", "DVR", "Palmari", "Mezzi", "Autisti", "Fatturato", ""]} />
          <tbody>
            {filtered.map((p, i) => {
              const dc      = durcColor(p.durc_stato);
              const dv      = dvrColor(p.dvr_stato);
              const sc      = statoColor(p.stato);
              const rowBg   = i % 2 === 0 ? C.white : C.bgRowAlt;

              return (
                <tr
                  key={p.id}
                  style={{ background: rowBg, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.primaryBg}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  onClick={() => setDetailPadId(p.id)}
                >
                  {/* Nome */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ fontWeight: TY.bold, fontSize: TY.md, color: C.fg }}>{p.nome}</div>
                  </td>

                  {/* Stato */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: PD.badgeLg, borderRadius: BR.sm, fontSize: TY.xs, fontWeight: TY.bold }}>{p.stato}</span>
                  </td>

                  {/* DURC */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ background: dc.bg, color: dc.color, padding: PD.badgeLg, borderRadius: BR.sm, fontSize: TY.xs, fontWeight: TY.bold }}>{p.durc_stato || "—"}</span>
                  </td>

                  {/* DVR */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <span style={{ background: dv.bg, color: dv.color, padding: PD.badgeLg, borderRadius: BR.sm, fontSize: TY.xs, fontWeight: TY.bold }}>{p.dvr_stato || "—"}</span>
                  </td>

                  {/* Palmari */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, textAlign: "center" }}>
                    <span style={{ fontSize: TY.base_, fontWeight: TY.bold, color: C.violetIndigo }}>{(p.palmari || []).length}</span>
                  </td>

                  {/* Mezzi */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, textAlign: "center" }}>
                    <span style={{ fontSize: TY.base_, fontWeight: TY.bold, color: C.primarySoft }}>{(p.mezzi || []).length}</span>
                  </td>

                  {/* Autisti */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, textAlign: "center" }}>
                    <span style={{ fontSize: TY.base_, fontWeight: TY.bold, color: C.warning }}>{(p.codici_autisti || []).length}</span>
                  </td>

                  {/* Fatturato */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}`, fontFamily: TY.mono, fontSize: TY.base_, fontWeight: TY.bold, color: C.success }}>
                    {euro(p.fatturato_totale || 0)}
                  </td>

                  {/* Azioni */}
                  <td style={{ padding: SP.cell, borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ display: "flex", gap: SP.gapXs }}>
                      <button
                        onClick={e => { e.stopPropagation(); setDetailPadId(p.id); }}
                        style={{ padding: "4px 10px", borderRadius: BR.sm, background: C.primaryBg, border: "none", color: C.primarySoft, fontSize: TY.xs, fontWeight: TY.bold, cursor: "pointer" }}
                      >
                        Dettagli
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (window.confirm(`Eliminare ${p.nome}?`)) onDelete(p.id); }}
                        style={{ padding: "4px 8px", borderRadius: BR.sm, background: C.dangerBgAlt, border: "none", color: C.danger, fontSize: TY.xs, cursor: "pointer" }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: C.fgSubtle, fontSize: TY.base_ }}>
                  Nessun padroncino trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrapper>

      {/* Footer contatore */}
      <div style={{ fontSize: TY.md, color: C.fgSubtle, textAlign: "right" }}>
        {filtered.length} di {padroncini.length} padroncini
      </div>
    </div>
  );
};
