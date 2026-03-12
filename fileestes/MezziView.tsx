import { useState } from "react";
import { SectionCard, KpiCard, CompactTable, TableRow, TableCell } from "@/components/ui-custom/BaseComponents";
import { euro, durcDaysLeft, mezzoStatoColor } from "@/utils/formatters";
import { Truck, Search, ArrowLeft, Save, AlertTriangle, TrendingUp, Zap, Shield, Activity } from "lucide-react";
import type { Mezzo, Padroncino } from "@/types";
import { cn } from "@/lib/utils";

const ALIMENTAZIONI = ["Gasolio","Diesel","Benzina","Elettrico","Ibrido","GPL","Metano","Altro"];
const TIPI = ["Furgone","Autocarro","Minivan","Camion","Pickup","Auto","Altro"];
const CATEGORIE = ["DISTRIBUZIONE","AUTO AZIENDALE"];
const STATI_MEZZO = ["DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO","DISMESSO"];

const STATO_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  ASSEGNATO:      { bg: "bg-blue-50 dark:bg-blue-950/40",   text: "text-blue-700 dark:text-blue-300",   dot: "bg-blue-500" },
  DISPONIBILE:    { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "IN REVISIONE": { bg: "bg-amber-50 dark:bg-amber-950/40",  text: "text-amber-700 dark:text-amber-300",  dot: "bg-amber-500" },
  "FUORI SERVIZIO":{ bg: "bg-red-50 dark:bg-red-950/40",    text: "text-red-700 dark:text-red-300",    dot: "bg-red-500" },
  VENDUTO:        { bg: "bg-slate-50 dark:bg-slate-800/40",  text: "text-slate-600 dark:text-slate-300",  dot: "bg-slate-400" },
  DISMESSO:       { bg: "bg-slate-50 dark:bg-slate-800/40",  text: "text-slate-500 dark:text-slate-400",  dot: "bg-slate-300" },
};

const StatoBadge = ({ stato }: { stato?: string }) => {
  const cfg = STATO_CONFIG[stato || ""] || { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {stato || "—"}
    </span>
  );
};

const FormInput = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>}
    <input type={type} value={value ?? ""} placeholder={placeholder}
      onChange={e => onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
      className="px-2.5 py-1.5 rounded-lg border border-border text-[12px] bg-card outline-none w-full focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
  </div>
);

const FormSelect = ({ label, value, onChange, options }: any) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>}
    <select value={value ?? ""} onChange={e => onChange(e.target.value)}
      className="px-2.5 py-1.5 rounded-lg border border-border text-[12px] bg-card outline-none cursor-pointer focus:border-primary/50 transition-all">
      <option value="">—</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const DaysLeft = ({ scad }: { scad?: string }) => {
  if (!scad) return <span className="text-muted-foreground text-[11px]">—</span>;
  const days = durcDaysLeft(scad);
  if (days === null) return <span className="text-muted-foreground text-[11px]">—</span>;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold">
      <AlertTriangle className="w-3 h-3" />{-days}gg fa
    </span>
  );
  if (days < 30) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
      ⏰ {days}gg
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
      ✓ {days}gg
    </span>
  );
};

const KmBar = ({ current, limit }: { current?: number; limit?: number }) => {
  if (!current || !limit) return null;
  const perc = Math.min(100, Math.round((current / limit) * 100));
  const color = perc > 90 ? "bg-red-500" : perc > 70 ? "bg-amber-500" : "bg-emerald-500";
  const textColor = perc > 90 ? "text-red-600" : perc > 70 ? "text-amber-600" : "text-emerald-600";
  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground font-mono">{current.toLocaleString("it-IT")}</span>
        <span className={cn("text-[10px] font-bold", textColor)}>{perc}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${perc}%` }} />
      </div>
    </div>
  );
};

const MezzoDetail = ({ mezzo, padroncini, onBack }: { mezzo: Mezzo; padroncini: Padroncino[]; onBack: () => void }) => {
  const [form, setForm] = useState({ ...mezzo });
  const [activeTab, setActiveTab] = useState("info");
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const kmRimasti = form.limitazioni_km && form.km_attuale ? Math.max(0, form.limitazioni_km - (form.km_attuale || 0)) : null;
  const percKm = form.limitazioni_km && form.km_attuale ? Math.min(100, Math.round((form.km_attuale / form.limitazioni_km) * 100)) : null;
  const sc = mezzoStatoColor(form.stato);
  const isElettrico = (form.alimentazione || "").toLowerCase().includes("elettr");

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border px-5 py-3.5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground text-[12px] font-semibold hover:bg-accent transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Indietro
          </button>
          <div className="w-px h-8 bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-foreground tracking-tight">
                {form.targa}
                {form.marca && <span className="font-medium text-muted-foreground ml-2 text-[13px]">— {form.marca} {form.modello}</span>}
              </div>
              <div className="text-[11px] text-muted-foreground">{form.tipo || "Tipo"} · {form.alimentazione || "—"}</div>
            </div>
          </div>
          {isElettrico && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 text-[10px] font-bold">
              <Zap className="w-3 h-3" /> ELETTRICO
            </span>
          )}
          <StatoBadge stato={form.stato} />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 transition-opacity shadow-sm">
          <Save className="w-3.5 h-3.5" /> Salva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-muted rounded-xl w-fit">
        {[["info","🚛 Scheda"],["storico","📜 Storico"],["vendita","💰 Vendita"]].map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn("px-4 py-2 rounded-lg text-[12px] font-bold transition-all",
              activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>

      {activeTab === "info" && (
        <div className="grid grid-cols-2 gap-3">
          <SectionCard title="🚛 Dati Veicolo" compact>
            <div className="grid grid-cols-2 gap-2.5">
              <FormInput label="Targa" value={form.targa} onChange={(v: string) => set("targa", v.toUpperCase())} />
              <FormSelect label="Stato" value={form.stato} onChange={(v: string) => set("stato", v)} options={STATI_MEZZO} />
              <FormSelect label="Categoria" value={form.categoria || "DISTRIBUZIONE"} onChange={(v: string) => set("categoria", v)} options={CATEGORIE} />
              <FormSelect label="Tipo" value={form.tipo} onChange={(v: string) => set("tipo", v)} options={TIPI} />
              <FormInput label="Marca" value={form.marca} onChange={(v: string) => set("marca", v)} />
              <FormInput label="Modello" value={form.modello} onChange={(v: string) => set("modello", v)} />
              <FormSelect label="Alimentazione" value={form.alimentazione} onChange={(v: string) => set("alimentazione", v)} options={ALIMENTAZIONI} />
              <FormInput label="Anno Imm." value={form.anno_imm} onChange={(v: number) => set("anno_imm", v)} type="number" />
            </div>
            <div className="mt-2"><FormInput label="Note veicolo" value={form.note_veicolo} onChange={(v: string) => set("note_veicolo", v)} /></div>
          </SectionCard>

          <SectionCard title="📋 Scadenze" compact>
            <div className="flex flex-col gap-3">
              {[["Assicurazione","scad_assicurazione"],["Revisione","scad_revisione"],["Bollo","scad_bollo"],["Tachigrafo","scad_tachigrafo"]].map(([label, key]) => (
                <div key={key} className="flex gap-2 items-end">
                  <div className="flex-1"><FormInput label={`Scad. ${label}`} value={(form as any)[key]} onChange={(v: string) => set(key, v)} type="date" /></div>
                  <DaysLeft scad={(form as any)[key]} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="📄 Contratto Noleggio" compact>
            <div className="grid grid-cols-2 gap-2.5">
              <FormInput label="Proprietario" value={form.proprietario} onChange={(v: string) => set("proprietario", v)} />
              <FormInput label="N° Contratto" value={form.n_contratto} onChange={(v: string) => set("n_contratto", v)} />
              <FormInput label="Inizio" value={form.data_inizio} onChange={(v: string) => set("data_inizio", v)} type="date" />
              <FormInput label="Fine" value={form.data_fine} onChange={(v: string) => set("data_fine", v)} type="date" />
              <FormInput label="Canone nostro (€)" value={form.canone_noleggio} onChange={(v: number) => set("canone_noleggio", v)} type="number" />
              <FormInput label="Rata padroncino (€)" value={form.rata_noleggio} onChange={(v: number) => set("rata_noleggio", v)} type="number" />
            </div>
            {(form.canone_noleggio || 0) > 0 && (form.rata_noleggio || 0) > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-xl border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Riepilogo economico</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Canone nostro", euro(form.canone_noleggio), "text-destructive"],
                    ["Rata padroncino", euro(form.rata_noleggio), "text-foreground"],
                    ["Rata + IVA 22%", euro((form.rata_noleggio || 0) * 1.22), "text-foreground"],
                  ].map(([l,v,c]) => (
                    <div key={l} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">{l}</span>
                      <span className={cn("font-mono font-bold text-[13px]", c)}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">Margine mensile</span>
                  <span className={cn("font-mono font-extrabold text-[14px]", ((form.rata_noleggio || 0) - (form.canone_noleggio || 0)) >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {euro((form.rata_noleggio || 0) - (form.canone_noleggio || 0))}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="🔗 Assegnazione & KM" compact>
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Padroncino</label>
                <select value={form.padroncino_id || ""} onChange={e => set("padroncino_id", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border text-[12px] bg-card outline-none cursor-pointer">
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p => p.stato === "ATTIVO").map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codice})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <FormInput label="KM Attuali" value={form.km_attuale} onChange={(v: number) => set("km_attuale", v)} type="number" />
                <FormInput label="Limite KM" value={form.limitazioni_km} onChange={(v: number) => set("limitazioni_km", v)} type="number" />
              </div>
              {percKm !== null && (
                <div className={cn("p-3 rounded-xl border", percKm > 90 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900" : percKm > 70 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900")}>
                  <div className="flex justify-between text-[12px] font-bold mb-2">
                    <span className="text-muted-foreground font-mono">{(form.km_attuale || 0).toLocaleString("it-IT")} km</span>
                    <span className={percKm > 90 ? "text-red-600" : percKm > 70 ? "text-amber-600" : "text-emerald-600"}>{percKm}%</span>
                  </div>
                  <div className="h-2 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", percKm > 90 ? "bg-red-500" : percKm > 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${percKm}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px]">
                    <span className="text-muted-foreground">Limite: {(form.limitazioni_km || 0).toLocaleString("it-IT")} km</span>
                    <span className="font-bold">Rimasti: {kmRimasti?.toLocaleString("it-IT") || "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "vendita" && (
        <SectionCard title="💰 Dettagli Vendita">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Data Vendita" value={form.data_vendita} onChange={(v: string) => set("data_vendita", v)} type="date" />
            <FormInput label="Importo (€)" value={form.importo_vendita} onChange={(v: number) => set("importo_vendita", v)} type="number" />
            <div className="col-span-2"><FormInput label="Acquirente" value={form.acquirente} onChange={(v: string) => set("acquirente", v)} /></div>
          </div>
        </SectionCard>
      )}
      {activeTab === "storico" && (
        <SectionCard title="📜 Storico">
          <div className="text-center py-12 text-muted-foreground text-[13px]">
            <div className="text-4xl mb-3">📜</div>
            <div className="font-medium">Nessuna modifica registrata</div>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

interface Props { mezzi: Mezzo[]; padroncini: Padroncino[] }
export const MezziView = ({ mezzi, padroncini }: Props) => {
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [detailMezzo, setDetailMezzo] = useState<Mezzo | null>(null);

  if (detailMezzo) return <MezzoDetail mezzo={detailMezzo} padroncini={padroncini} onBack={() => setDetailMezzo(null)} />;

  const filtered = mezzi.filter(m => {
    const s = search.toLowerCase();
    const match = !s || [m.targa, m.marca, m.modello, m.tipo, m.alimentazione, m.autista, m.proprietario, m.stato, m.note_veicolo].some(v => v?.toLowerCase().includes(s));
    return match && (filtroStato === "TUTTI" || m.stato === filtroStato) && (!filtroCategoria || (m.categoria || "DISTRIBUZIONE") === filtroCategoria);
  });

  const scadImm = mezzi.filter(m => [m.scad_assicurazione, m.scad_revisione].map(s => durcDaysLeft(s)).filter(d => d !== null).some(d => d! < 30)).length;
  const assegnati = mezzi.filter(m => m.stato === "ASSEGNATO").length;
  const disponibili = mezzi.filter(m => m.stato === "DISPONIBILE").length;
  const inRevisione = mezzi.filter(m => m.stato === "IN REVISIONE").length;
  const totEntrate = mezzi.reduce((s, m) => s + (m.rata_noleggio || 0), 0);
  const totCanoni = mezzi.reduce((s, m) => s + (m.canone_noleggio || 0), 0);
  const margine = totEntrate - totCanoni;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Flotta Mezzi</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{mezzi.length} veicoli totali · {assegnati} assegnati</p>
        </div>
        <span className="text-[12px] text-muted-foreground font-medium">{filtered.length} di {mezzi.length}</span>
      </div>

      {/* Alert scadenze */}
      {scadImm > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-amber-700 dark:text-amber-300">{scadImm} mezzo/i con scadenze entro 30 giorni</div>
            <div className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Verificare assicurazione e revisione</div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-6 gap-3">
        {/* Totali */}
        <div className="col-span-1 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Totali</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">{mezzi.length}</div>
          <div className="text-[11px] text-muted-foreground">{assegnati} assegnati</div>
        </div>
        {/* Disponibili */}
        <div className="col-span-1 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Disponibili</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{disponibili}</div>
          <div className="text-[11px] text-muted-foreground">{inRevisione > 0 ? `${inRevisione} in revisione` : "pronti"}</div>
        </div>
        {/* Entrate noleggio */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entrate Noleggio</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">{euro(totEntrate)}</div>
          <div className="text-[11px] text-muted-foreground">mensile · {assegnati} mezzi assegnati</div>
        </div>
        {/* Margine */}
        <div className={cn("col-span-2 rounded-xl border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow",
          margine >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Margine</span>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
              margine >= 0 ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-red-100 dark:bg-red-900/50")}>
              <Shield className={cn("w-3.5 h-3.5", margine >= 0 ? "text-emerald-600" : "text-red-600")} />
            </div>
          </div>
          <div className={cn("text-2xl font-extrabold", margine >= 0 ? "text-emerald-600" : "text-red-600")}>{euro(margine)}</div>
          <div className="text-[11px] text-muted-foreground">rata − canone · canoni: {euro(totCanoni)}</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex-1 relative min-w-[220px]">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca targa, marca, modello..."
            className="w-full px-3 py-2.5 pl-9 rounded-xl border border-border text-[13px] bg-card outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
          <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["TUTTI","DISPONIBILE","ASSEGNATO","IN REVISIONE","FUORI SERVIZIO","VENDUTO"].map(s => (
            <button key={s} onClick={() => setFiltroStato(s)}
              className={cn("px-3 py-2 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition-all",
                filtroStato === s ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:bg-accent hover:border-primary/30")}>{s}</button>
          ))}
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex gap-1.5">
          {[["TUTTI",""],["🚛 DISTRIB.","DISTRIBUZIONE"],["🚗 AUTO AZ.","AUTO AZIENDALE"]].map(([label, cat]) => (
            <button key={cat} onClick={() => setFiltroCategoria(cat)}
              className={cn("px-3 py-2 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition-all",
                filtroCategoria === cat ? "bg-[hsl(var(--kpi-violet))] text-white border-[hsl(var(--kpi-violet))] shadow-sm" : "bg-card text-muted-foreground border-border hover:bg-accent")}>{label}</button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <CompactTable headers={["Targa","Marca / Modello","Tipo","Stato","Padroncino","Scad. Ass.","Scad. Rev.","Rata","KM"]}>
        {filtered.map((m, i) => {
          const pad = padroncini.find(p => p.id === m.padroncino_id);
          return (
            <TableRow key={m.id} index={i} onClick={() => setDetailMezzo(m)}>
              <TableCell mono className="font-extrabold tracking-wider text-[13px]">{m.targa}</TableCell>
              <TableCell>
                <div className="font-semibold text-foreground text-[12px]">{m.marca}</div>
                <div className="text-[10px] text-muted-foreground">{m.modello}</div>
              </TableCell>
              <TableCell className="text-muted-foreground text-[11px]">{m.tipo || "—"}</TableCell>
              <TableCell><StatoBadge stato={m.stato} /></TableCell>
              <TableCell>{pad?.nome ? <span className="font-semibold text-primary text-[12px]">{pad.nome}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell><DaysLeft scad={m.scad_assicurazione} /></TableCell>
              <TableCell><DaysLeft scad={m.scad_revisione} /></TableCell>
              <TableCell mono className="font-bold text-right text-[12px]">{m.rata_noleggio ? euro(m.rata_noleggio) : "—"}</TableCell>
              <TableCell>
                {m.km_attuale
                  ? <KmBar current={m.km_attuale} limit={m.limitazioni_km} />
                  : <span className="text-muted-foreground text-[11px]">—</span>}
              </TableCell>
            </TableRow>
          );
        })}
      </CompactTable>
    </div>
  );
};
