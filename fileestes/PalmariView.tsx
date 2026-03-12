import { useState } from "react";
import { SectionCard, KpiCard, CompactTable, TableRow, TableCell } from "@/components/ui-custom/BaseComponents";
import { euro, mezzoStatoColor } from "@/utils/formatters";
import { Smartphone, Search, ArrowLeft, Save, Wifi, WifiOff, AlertTriangle, TrendingUp } from "lucide-react";
import type { Palmare, Padroncino } from "@/types";
import { cn } from "@/lib/utils";

const MODELLI = ["Zebra TC52","Zebra TC57","Zebra TC72","Zebra TC77","Honeywell CT60","Honeywell EDA51","Datalogic Memor 20","Altro"];
const STATI = ["DISPONIBILE","ASSEGNATO","GUASTO","DISMESSO"];

const STATO_CONFIG: Record<string, { bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  DISPONIBILE: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", icon: <Wifi className="w-2.5 h-2.5" /> },
  ASSEGNATO:   { bg: "bg-blue-50 dark:bg-blue-950/40",    text: "text-blue-700 dark:text-blue-300",    dot: "bg-blue-500",    icon: <Smartphone className="w-2.5 h-2.5" /> },
  GUASTO:      { bg: "bg-red-50 dark:bg-red-950/40",      text: "text-red-700 dark:text-red-300",      dot: "bg-red-500",     icon: <WifiOff className="w-2.5 h-2.5" /> },
  DISMESSO:    { bg: "bg-slate-50 dark:bg-slate-800/40",  text: "text-slate-500 dark:text-slate-400",  dot: "bg-slate-400",   icon: null },
};

const StatoBadge = ({ stato }: { stato?: string }) => {
  const cfg = STATO_CONFIG[stato || ""] || { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400", icon: null };
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

const PalmareDetail = ({ palmare, padroncini, onBack }: { palmare: Palmare; padroncini: Padroncino[]; onBack: () => void }) => {
  const [form, setForm] = useState({ ...palmare });
  const [tab, setTab] = useState("info");
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const padAss = padroncini.find(p => p.id === form.padroncino_id);

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
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--kpi-violet))]/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[hsl(var(--kpi-violet))]" />
            </div>
            <div>
              <div className="text-[15px] font-extrabold text-foreground tracking-tight">
                📱 {form.seriale || "Nuovo"}
                {(form.modello_custom || form.modello) && (
                  <span className="text-[12px] font-medium text-muted-foreground ml-2">— {form.modello_custom || form.modello}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {padAss ? `Assegnato a: ${padAss.nome}` : "Non assegnato"}
              </div>
            </div>
          </div>
          <StatoBadge stato={form.stato} />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(var(--kpi-violet))] text-white text-[13px] font-bold hover:opacity-90 transition-opacity shadow-sm">
          <Save className="w-3.5 h-3.5" /> Salva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-muted rounded-xl w-fit">
        {[["info","📱 Scheda"],["storico","📜 Storico"]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 rounded-lg text-[12px] font-bold transition-all",
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>

      {tab === "info" && (
        <div className="grid grid-cols-2 gap-3">
          <SectionCard title="📱 Dati Palmare" compact>
            <div className="grid grid-cols-2 gap-2.5">
              <FormInput label="Seriale" value={form.seriale} onChange={(v: string) => set("seriale", v)} />
              <FormSelect label="Stato" value={form.stato} onChange={(v: string) => set("stato", v)} options={STATI} />
              <FormSelect label="Modello" value={form.modello} onChange={(v: string) => set("modello", v)} options={MODELLI} />
              <FormInput label="Modello custom" value={form.modello_custom} onChange={(v: string) => set("modello_custom", v)} />
            </div>
            <div className="mt-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Note</label>
              <textarea value={form.note || ""} onChange={e => set("note", e.target.value)} rows={3}
                className="w-full p-2.5 border border-border rounded-lg text-[12px] resize-y outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
            </div>
          </SectionCard>

          <SectionCard title="🔗 Assegnazione & Tariffe" compact>
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Padroncino</label>
                <select value={form.padroncino_id || ""} onChange={e => set("padroncino_id", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border text-[12px] bg-card outline-none cursor-pointer focus:border-primary/50 transition-all">
                  <option value="">— Non assegnato —</option>
                  {padroncini.filter(p => p.stato === "ATTIVO").map(p => (
                    <option key={p.id} value={p.id}>{p.nome}{p.codice ? ` (${p.codice})` : ""}</option>
                  ))}
                </select>
                {padAss && (
                  <div className="mt-1.5 px-2.5 py-1.5 bg-primary/10 rounded-lg text-[11px] text-primary font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {padAss.nome}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <FormInput label="Tariffa Mensile (€)" value={form.tariffa_mensile} onChange={(v: number) => set("tariffa_mensile", v)} type="number" />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">+ IVA 22%</label>
                  <div className="px-2.5 py-1.5 rounded-lg border border-border bg-muted font-mono text-[12px] font-bold text-emerald-600">
                    {euro((form.tariffa_mensile || 0) * 1.22)}
                  </div>
                </div>
                <FormInput label="Data Assegnazione" value={form.data_assegnazione} onChange={(v: string) => set("data_assegnazione", v)} type="date" />
                <FormInput label="Fine" value={form.data_fine} onChange={(v: string) => set("data_fine", v)} type="date" />
              </div>
            </div>
          </SectionCard>

          <div className="col-span-2">
            <SectionCard title="💰 Riepilogo Economico" compact>
              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Netta / mese", euro(form.tariffa_mensile || 0), "text-foreground", "bg-muted"],
                  ["+ IVA 22%", euro((form.tariffa_mensile || 0) * 1.22), "text-emerald-600", "bg-emerald-50 dark:bg-emerald-950/30"],
                  ["Annuale netta", euro((form.tariffa_mensile || 0) * 12), "text-foreground", "bg-muted"],
                  ["Annuale + IVA", euro((form.tariffa_mensile || 0) * 1.22 * 12), "text-emerald-600", "bg-emerald-50 dark:bg-emerald-950/30"],
                ].map(([l,v,c,bg]) => (
                  <div key={l} className={cn("p-3 rounded-xl border border-border", bg)}>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{l}</div>
                    <div className={cn("font-mono font-extrabold text-[15px]", c)}>{v}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "storico" && (
        <SectionCard title="📜 Storico" compact>
          <div className="text-center py-12 text-muted-foreground text-[13px]">
            <div className="text-4xl mb-3">📜</div>
            <div className="font-medium">Nessuna modifica registrata</div>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

interface Props { palmari: Palmare[]; padroncini: Padroncino[] }
export const PalmariView = ({ palmari, padroncini }: Props) => {
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("TUTTI");
  const [detail, setDetail] = useState<Palmare | null>(null);

  if (detail) return <PalmareDetail palmare={detail} padroncini={padroncini} onBack={() => setDetail(null)} />;

  const filtered = palmari.filter(p => {
    const q = search.toLowerCase();
    return (!q || [p.seriale, p.modello, p.modello_custom, p.note].some(v => v?.toLowerCase().includes(q)))
      && (filtroStato === "TUTTI" || p.stato === filtroStato);
  });

  const padNome = (id?: string) => padroncini.find(p => p.id === id)?.nome || "—";
  const disponibili = palmari.filter(p => p.stato === "DISPONIBILE").length;
  const assegnati = palmari.filter(p => p.stato === "ASSEGNATO").length;
  const guasti = palmari.filter(p => p.stato === "GUASTO").length;
  const dismessi = palmari.filter(p => p.stato === "DISMESSO").length;
  const totEntrate = palmari.filter(p => p.stato === "ASSEGNATO").reduce((s, p) => s + (p.tariffa_mensile || 0), 0);
  const percAssegnati = palmari.length > 0 ? Math.round((assegnati / palmari.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Palmari</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{palmari.length} dispositivi totali</p>
        </div>
      </div>

      {/* Alert guasti */}
      {guasti > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-red-700 dark:text-red-300">{guasti} palmare/i guasto/i</div>
            <div className="text-[11px] text-red-600/70 dark:text-red-400/70 mt-0.5">Da inviare in assistenza</div>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-1 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Disponibili</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{disponibili}</div>
          <div className="text-[11px] text-muted-foreground">pronti all'uso</div>
        </div>

        <div className="col-span-1 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assegnati</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-600">{assegnati}</div>
          <div className="flex items-center gap-1.5 mt-auto">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percAssegnati}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{percAssegnati}%</span>
          </div>
        </div>

        <div className="col-span-1 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Guasti</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>
          <div className={cn("text-2xl font-extrabold", guasti > 0 ? "text-red-600" : "text-muted-foreground")}>{guasti}</div>
          <div className="text-[11px] text-muted-foreground">{dismessi > 0 ? `${dismessi} dismessi` : "da riparare"}</div>
        </div>

        <div className="col-span-3 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Entrate Mensili</span>
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--kpi-violet))]/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--kpi-violet))]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">{euro(totEntrate)}</div>
          <div className="flex items-center gap-4 mt-1">
            <div>
              <div className="text-[10px] text-muted-foreground">Annuale stimato</div>
              <div className="font-mono font-bold text-[13px] text-[hsl(var(--kpi-violet))]">{euro(totEntrate * 12)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Media per palmare</div>
              <div className="font-mono font-bold text-[13px]">{assegnati > 0 ? euro(totEntrate / assegnati) : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca seriale, modello..."
            className="w-full px-3 py-2.5 pl-9 rounded-xl border border-border text-[13px] bg-card outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
          <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex gap-1.5">
          {["TUTTI", ...STATI].map(s => (
            <button key={s} onClick={() => setFiltroStato(s)}
              className={cn("px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all",
                filtroStato === s
                  ? "bg-[hsl(var(--kpi-violet))] text-white border-[hsl(var(--kpi-violet))] shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-accent hover:border-primary/30")}>{s}</button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <CompactTable headers={["Seriale / Modello","Stato","Padroncino","Tariffa","+ IVA","Data Assegnazione","Fine",""]}>
        {filtered.map((p, i) => (
          <TableRow key={p.id} index={i} onClick={() => setDetail(p)}>
            <TableCell>
              <div className="font-extrabold text-[13px] font-mono tracking-wider">{p.seriale}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{p.modello_custom || p.modello || "—"}</div>
            </TableCell>
            <TableCell><StatoBadge stato={p.stato} /></TableCell>
            <TableCell>
              {p.padroncino_id
                ? <span className="font-semibold text-primary text-[12px]">{padNome(p.padroncino_id)}</span>
                : <span className="text-muted-foreground italic text-[11px]">—</span>}
            </TableCell>
            <TableCell mono className="font-bold text-[hsl(var(--kpi-violet))]">
              {p.tariffa_mensile ? euro(p.tariffa_mensile) : "—"}
            </TableCell>
            <TableCell mono className="text-muted-foreground text-[11px]">
              {p.tariffa_mensile ? euro(p.tariffa_mensile * 1.22) : "—"}
            </TableCell>
            <TableCell className="text-[12px]">{p.data_assegnazione || "—"}</TableCell>
            <TableCell className="text-[12px]">{p.data_fine || "—"}</TableCell>
            <TableCell>
              <button className="px-2.5 py-1 rounded-md bg-[hsl(var(--kpi-violet))]/10 text-[hsl(var(--kpi-violet))] text-[11px] font-semibold hover:bg-[hsl(var(--kpi-violet))]/20 transition-colors">
                Dettaglio
              </button>
            </TableCell>
          </TableRow>
        ))}
      </CompactTable>

      <div className="text-[11px] text-muted-foreground text-right">{filtered.length} di {palmari.length} palmari</div>
    </div>
  );
};
