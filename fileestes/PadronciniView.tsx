import { useState } from "react";
import { StatusBadge, CompactTable, TableRow, TableCell } from "@/components/ui-custom/BaseComponents";
import { euro, durcDaysLeft } from "@/utils/formatters";
import { Search, Plus, Users, AlertTriangle, TrendingUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { Padroncino, Conteggio } from "@/types";
import { PadroncinoDetail } from "./PadroncinoDetail";
import { cn } from "@/lib/utils";

interface Props {
  padroncini: Padroncino[];
  conteggi: Conteggio[];
  onNavigate?: (view: string) => void;
}

const DURC_CONFIG = {
  "REGOLARE":       { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "IN SCADENZA":    { bg: "bg-amber-50 dark:bg-amber-950/40",    text: "text-amber-700 dark:text-amber-300",    dot: "bg-amber-500" },
  "SCADUTO":        { bg: "bg-red-50 dark:bg-red-950/40",        text: "text-red-700 dark:text-red-300",        dot: "bg-red-500" },
};
const DVR_CONFIG = {
  "PRESENTE":        { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "IN AGGIORNAMENTO":{ bg: "bg-amber-50 dark:bg-amber-950/40",    text: "text-amber-700 dark:text-amber-300",    dot: "bg-amber-500" },
  "ASSENTE":         { bg: "bg-red-50 dark:bg-red-950/40",        text: "text-red-700 dark:text-red-300",        dot: "bg-red-500" },
};
const STATO_CONFIG = {
  "ATTIVO":   { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "DISMESSO": { bg: "bg-slate-100 dark:bg-slate-800/40",   text: "text-slate-500 dark:text-slate-400",    dot: "bg-slate-400" },
  "SOSPESO":  { bg: "bg-amber-50 dark:bg-amber-950/40",    text: "text-amber-700 dark:text-amber-300",    dot: "bg-amber-500" },
};

const MicroBadge = ({ label, config }: { label?: string; config?: { bg: string; text: string; dot: string } }) => {
  if (!label || !config) return <span className="text-muted-foreground text-[11px]">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", config.bg, config.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", config.dot)} />
      {label}
    </span>
  );
};

const DurcDays = ({ scadenza }: { scadenza?: string }) => {
  const days = durcDaysLeft(scadenza);
  if (days === null || days > 30) return null;
  return (
    <span className={cn("text-[10px] font-bold mt-0.5", days <= 0 ? "text-red-600" : "text-amber-600")}>
      {days <= 0 ? `Scad. ${-days}gg fa` : `${days}gg rimasti`}
    </span>
  );
};

export const PadronciniView = ({ padroncini, conteggi }: Props) => {
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailPad = detailId ? padroncini.find(p => p.id === detailId) : null;

  if (detailPad) {
    return <PadroncinoDetail padroncino={detailPad} conteggi={conteggi} onBack={() => setDetailId(null)} />;
  }

  const filtered = padroncini.filter(p => {
    const s = search.toLowerCase();
    const matchSearch = !s || p.nome?.toLowerCase().includes(s) || p.codice?.toLowerCase().includes(s);
    const matchStato = filtroStato === "TUTTI" || p.stato === filtroStato;
    return matchSearch && matchStato;
  });

  // KPI calc
  const attivi = padroncini.filter(p => p.stato === "ATTIVO").length;
  const sospesi = padroncini.filter(p => p.stato === "SOSPESO").length;
  const dismessi = padroncini.filter(p => p.stato === "DISMESSO").length;
  const totFatturato = padroncini.reduce((s, p) => s + (p.fatturato_totale || 0), 0);
  const durcScaduti = padroncini.filter(p => p.durc_stato === "SCADUTO").length;
  const durcInScadenza = padroncini.filter(p => p.durc_stato === "IN SCADENZA").length;
  const totMezzi = padroncini.reduce((s, p) => s + (p.mezzi?.length || 0), 0);
  const totPalmari = padroncini.reduce((s, p) => s + (p.palmari?.length || 0), 0);
  const totAutisti = padroncini.reduce((s, p) => s + (p.codici_autisti?.length || 0), 0);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Padroncini</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{padroncini.length} totali · {attivi} attivi</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Nuovo
        </button>
      </div>

      {/* Alert DURC */}
      {(durcScaduti + durcInScadenza) > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-red-700 dark:text-red-300">
              {durcScaduti > 0 && `${durcScaduti} DURC scaduto/i`}
              {durcScaduti > 0 && durcInScadenza > 0 && " · "}
              {durcInScadenza > 0 && `${durcInScadenza} in scadenza`}
            </div>
            <div className="text-[11px] text-red-600/70 mt-0.5">Verificare e aggiornare la documentazione</div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-6 gap-3">
        {/* Attivi */}
        <div className="col-span-1 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Attivi</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{attivi}</div>
          <div className="text-[11px] text-muted-foreground">{sospesi > 0 ? `${sospesi} sospesi` : "operativi"}</div>
        </div>

        {/* Fatturato */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fatturato Totale</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">{euro(totFatturato)}</div>
          <div className="text-[11px] text-muted-foreground">media: {attivi > 0 ? euro(totFatturato / attivi) : "—"} per attivo</div>
        </div>

        {/* DURC */}
        <div className={cn("col-span-1 rounded-xl border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow",
          durcScaduti > 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : "bg-card border-border")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">DURC</span>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
              durcScaduti > 0 ? "bg-red-100 dark:bg-red-900/50" : "bg-emerald-100 dark:bg-emerald-900/50")}>
              {durcScaduti > 0
                ? <XCircle className="w-3.5 h-3.5 text-red-600" />
                : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
          </div>
          <div className={cn("text-2xl font-extrabold", durcScaduti > 0 ? "text-red-600" : "text-emerald-600")}>{durcScaduti}</div>
          <div className="text-[11px] text-muted-foreground">{durcScaduti === 0 ? "tutti regolari" : "scaduti · " + durcInScadenza + " in scadenza"}</div>
        </div>

        {/* Asset summary */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Asset Totali</span>
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--kpi-violet))]/10 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-[hsl(var(--kpi-violet))]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              ["🚛 Mezzi", totMezzi],
              ["📱 Palmari", totPalmari],
              ["👤 Autisti", totAutisti],
            ].map(([l, v]) => (
              <div key={String(l)} className="flex flex-col items-center p-1.5 bg-muted rounded-lg">
                <span className="text-[10px] text-muted-foreground">{l}</span>
                <span className="font-extrabold text-[15px] text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o codice..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border text-[13px] bg-card outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex gap-1.5">
          {["TUTTI", "ATTIVO", "DISMESSO"].map(s => (
            <button key={s} onClick={() => setFiltroStato(s)}
              className={cn("px-4 py-2.5 rounded-xl text-[12px] font-semibold border transition-all",
                filtroStato === s
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:bg-accent")}>{s}</button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {["Padroncino","Stato","DURC","DVR","Palmari","Mezzi","Autisti","Fatturato",""].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider first:pl-4 last:pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p, i) => {
              const statoCfg = STATO_CONFIG[p.stato as keyof typeof STATO_CONFIG];
              const durcCfg = DURC_CONFIG[p.durc_stato as keyof typeof DURC_CONFIG];
              const dvrCfg = DVR_CONFIG[p.dvr_stato as keyof typeof DVR_CONFIG];
              const daysLeft = durcDaysLeft(p.durc_scadenza);
              return (
                <tr key={p.id}
                  onClick={() => setDetailId(p.id)}
                  className={cn(
                    "cursor-pointer transition-colors group",
                    i % 2 === 0 ? "bg-card" : "bg-muted/20",
                    "hover:bg-primary/5"
                  )}>
                  {/* Nome */}
                  <td className="px-3 py-3 pl-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-6 rounded-full flex-shrink-0",
                        p.stato === "ATTIVO" ? "bg-emerald-500" : p.stato === "SOSPESO" ? "bg-amber-500" : "bg-slate-300")} />
                      <div>
                        <div className="font-bold text-foreground text-[13px] group-hover:text-primary transition-colors">{p.nome}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Cod. {p.codice || "—"}</div>
                      </div>
                    </div>
                  </td>
                  {/* Stato */}
                  <td className="px-3 py-3">
                    <MicroBadge label={p.stato} config={statoCfg} />
                  </td>
                  {/* DURC */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <MicroBadge label={p.durc_stato} config={durcCfg} />
                      <DurcDays scadenza={p.durc_scadenza} />
                    </div>
                  </td>
                  {/* DVR */}
                  <td className="px-3 py-3">
                    <MicroBadge label={p.dvr_stato} config={dvrCfg} />
                  </td>
                  {/* Palmari */}
                  <td className="px-3 py-3 text-center">
                    <span className={cn("text-[13px] font-bold", (p.palmari?.length || 0) > 0 ? "text-[hsl(var(--kpi-violet))]" : "text-muted-foreground")}>
                      {p.palmari?.length || 0}
                    </span>
                  </td>
                  {/* Mezzi */}
                  <td className="px-3 py-3 text-center">
                    <span className={cn("text-[13px] font-bold", (p.mezzi?.length || 0) > 0 ? "text-primary" : "text-muted-foreground")}>
                      {p.mezzi?.length || 0}
                    </span>
                  </td>
                  {/* Autisti */}
                  <td className="px-3 py-3 text-center">
                    <span className={cn("text-[13px] font-bold", (p.codici_autisti?.length || 0) > 0 ? "text-amber-600" : "text-muted-foreground")}>
                      {p.codici_autisti?.length || 0}
                    </span>
                  </td>
                  {/* Fatturato */}
                  <td className="px-3 py-3">
                    <span className="font-mono font-bold text-[12px] text-emerald-600">{euro(p.fatturato_totale || 0)}</span>
                  </td>
                  {/* CTA */}
                  <td className="px-3 py-3 pr-4">
                    <button
                      onClick={e => { e.stopPropagation(); setDetailId(p.id); }}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors">
                      Apri
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground text-[13px]">
                  <div className="text-3xl mb-2">🔍</div>
                  <div className="font-medium">Nessun padroncino trovato</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground text-right">{filtered.length} di {padroncini.length} padroncini</div>
    </div>
  );
};
