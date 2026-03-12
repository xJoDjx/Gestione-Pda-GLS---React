import { useState } from "react";
import { SectionCard, StatusBadge, CompactTable, TableRow, TableCell, KpiCard } from "@/components/ui-custom/BaseComponents";
import { euro, MESI, giorniMese } from "@/utils/formatters";
import { Calculator, Check, FileText, ArrowLeft, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { ConteggiFormView } from "@/components/views/ConteggiFormView";
import type { Padroncino, Conteggio } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  padroncini: Padroncino[];
  conteggi: Conteggio[];
  mese: string;
  anno: number;
}

const CheckIcon = ({ value }: { value?: boolean }) =>
  value
    ? <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto"><Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /></div>
    : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mx-auto"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /></div>;

const MiniProgress = ({ done, total }: { done: number; total: number }) => {
  const perc = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", perc === 100 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${perc}%` }} />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground">{perc}%</span>
    </div>
  );
};

export const ConteggiView = ({ padroncini, conteggi, mese, anno }: Props) => {
  const [selPad, setSelPad] = useState<string | null>(null);
  const giorni = giorniMese(mese, anno);

  const meseConteggi = conteggi.filter(c => c.mese === mese && c.anno === anno);
  const pAttivi = padroncini.filter(p => p.stato === "ATTIVO");

  const totFatt = meseConteggi.reduce((s, c) => s + (c.totale_fattura || 0), 0);
  const totAdd = meseConteggi.reduce((s, c) => s + (c.totale_addebiti || 0), 0);
  const totBon = meseConteggi.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
  const completati = meseConteggi.filter(c => c.caricata_scadenziario).length;
  const percCompletati = meseConteggi.length > 0 ? Math.round((completati / meseConteggi.length) * 100) : 0;
  const tuttiCompletati = completati === meseConteggi.length && meseConteggi.length > 0;

  // Calcola anche conteggi mancanti (padroncini attivi senza conteggio)
  const mancanti = pAttivi.filter(p => !meseConteggi.find(c => c.padroncino_id === p.id)).length;

  if (selPad) {
    const pad = padroncini.find(p => p.id === selPad);
    if (pad) {
      return (
        <ConteggiFormView
          padroncino={pad}
          mese={mese}
          anno={anno}
          giorni={giorni}
          onBack={() => setSelPad(null)}
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Conteggi Mensili</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{pAttivi.length} padroncini attivi</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] font-bold",
            tuttiCompletati
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300")}>
            {tuttiCompletati ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {mese} {anno}
          </div>
          <span className="px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-[11px] font-medium">{giorni} giorni</span>
        </div>
      </div>

      {/* Alert mancanti */}
      {mancanti > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-amber-700 dark:text-amber-300">{mancanti} conteggio/i mancante/i</div>
            <div className="text-[11px] text-amber-600/70 mt-0.5">Clicca sul padroncino per inserire il conteggio</div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-6 gap-3">
        {/* Fatturato */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fatturato Mese</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <div className="text-[22px] font-extrabold text-foreground">{euro(totFatt)}</div>
          <div className="text-[11px] text-muted-foreground">{meseConteggi.length} conteggi inseriti</div>
        </div>

        {/* Addebiti */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Addebiti Totali</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>
          <div className="text-[22px] font-extrabold text-red-600">{euro(totAdd)}</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">
              {totFatt > 0 ? `${Math.round((totAdd / totFatt) * 100)}% del fatturato` : "—"}
            </span>
          </div>
        </div>

        {/* Da bonificare */}
        <div className={cn("col-span-2 rounded-xl border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow",
          totBon >= 0
            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800")}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Da Bonificare</span>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
              totBon >= 0 ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-red-100 dark:bg-red-900/50")}>
              <Calculator className={cn("w-3.5 h-3.5", totBon >= 0 ? "text-emerald-600" : "text-red-600")} />
            </div>
          </div>
          <div className={cn("text-[22px] font-extrabold", totBon >= 0 ? "text-emerald-600" : "text-red-600")}>
            {euro(totBon)}
          </div>
          <div className="text-[11px] text-muted-foreground">fattura − addebiti</div>
        </div>

        {/* Stato completamento */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Completamento</span>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
              tuttiCompletati ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-amber-100 dark:bg-amber-900/50")}>
              {tuttiCompletati
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                : <Clock className="w-3.5 h-3.5 text-amber-600" />}
            </div>
          </div>
          <div className="text-[22px] font-extrabold text-foreground">{completati}<span className="text-[15px] text-muted-foreground font-medium">/{meseConteggi.length}</span></div>
          <MiniProgress done={completati} total={meseConteggi.length} />
        </div>

        {/* Conteggi mancanti */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Da Inserire</span>
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
              mancanti === 0 ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-amber-100 dark:bg-amber-900/50")}>
              <FileText className={cn("w-3.5 h-3.5", mancanti === 0 ? "text-emerald-600" : "text-amber-600")} />
            </div>
          </div>
          <div className={cn("text-[22px] font-extrabold", mancanti === 0 ? "text-emerald-600" : "text-amber-600")}>{mancanti}</div>
          <div className="text-[11px] text-muted-foreground">{mancanti === 0 ? "Tutti inseriti ✓" : `su ${pAttivi.length} attivi`}</div>
        </div>

        {/* Media per padroncino */}
        <div className="col-span-2 bg-card rounded-xl border border-border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Media Bonifico</span>
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--kpi-violet))]/10 flex items-center justify-center">
              <Calculator className="w-3.5 h-3.5 text-[hsl(var(--kpi-violet))]" />
            </div>
          </div>
          <div className="text-[22px] font-extrabold text-foreground">
            {meseConteggi.length > 0 ? euro(totBon / meseConteggi.length) : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground">per padroncino</div>
        </div>
      </div>

      {/* Tabella conteggi */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          <span className="text-[13px] font-bold text-foreground">Conteggi — {mese} {anno}</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">{meseConteggi.length} / {pAttivi.length}</span>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              {["Padroncino","Fattura","Addebiti","Bonifico","Stato","Distrib.","PDF","Fatt.","TU","Unione","Scad."].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider first:pl-4 last:pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pAttivi.map((p, i) => {
              const c = meseConteggi.find(c => c.padroncino_id === p.id);
              const hasMissing = !c;
              return (
                <tr key={p.id}
                  onClick={() => setSelPad(p.id)}
                  className={cn(
                    "cursor-pointer transition-colors group",
                    i % 2 === 0 ? "bg-card" : "bg-muted/20",
                    "hover:bg-primary/5"
                  )}>
                  {/* Nome */}
                  <td className="px-3 py-3 pl-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-6 rounded-full flex-shrink-0", hasMissing ? "bg-amber-400" : c?.caricata_scadenziario ? "bg-emerald-500" : "bg-blue-400")} />
                      <span className="font-bold text-foreground text-[12px]">{p.nome}</span>
                    </div>
                  </td>
                  {/* Fattura */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-[12px] font-semibold">{c ? euro(c.totale_fattura) : <span className="text-muted-foreground">—</span>}</span>
                  </td>
                  {/* Addebiti */}
                  <td className="px-3 py-3">
                    <span className={cn("font-mono text-[12px] font-semibold", c ? "text-red-600" : "text-muted-foreground")}>{c ? euro(c.totale_addebiti) : "—"}</span>
                  </td>
                  {/* Bonifico */}
                  <td className="px-3 py-3">
                    <span className={cn("font-mono text-[12px] font-bold",
                      !c ? "text-muted-foreground" : (c.totale_da_bonificare || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {c ? euro(c.totale_da_bonificare) : "—"}
                    </span>
                  </td>
                  {/* Stato */}
                  <td className="px-3 py-3">
                    {c ? (
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold",
                        c.caricata_scadenziario
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", c.caricata_scadenziario ? "bg-emerald-500" : "bg-amber-500")} />
                        {c.caricata_scadenziario ? "Completato" : "In corso"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Mancante
                      </span>
                    )}
                  </td>
                  {/* Checkboxes */}
                  {[c?.distrib_inviata, c?.pdf_addeb, c?.fattura_ricevuta, c?.fatt_tu_creata, c?.unione_pdf, c?.caricata_scadenziario].map((v, j) => (
                    <td key={j} className="px-3 py-3 text-center">
                      <CheckIcon value={v} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
