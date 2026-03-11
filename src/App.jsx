import { useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { LoginScreen } from "./components/LoginScreen";
import { GestioneUtenti } from "./components/GestioneUtenti";
import { useDatabase } from "./hooks/useDatabase";
import { DashboardView } from "./components/DashboardView";
import { PadronciniView } from "./components/PadronciniView";
import { ConteggiEditor } from "./components/ConteggiEditor";
import { MezziView } from "./components/MezziView";
import { PalmariView } from "./components/PalmariView";
import { RicaricheView } from "./components/RicaricheView";
import { RicercaGlobale } from "./components/RicercaGlobale";
import { Icon } from "./components/Icons";
import { euro, giorniMese, MESI } from "./utils/formatters";
import { CodAutistiView } from "./components/CodAutistiView";
import { LogStoricoView }   from "./components/LogStoricoView";
import { useActivityLog }   from "./hooks/useActivityLog";

const MESI_IT = MESI;

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────
const Notification = ({ msg, type }) => (
  <div style={{
    position: "fixed", bottom: 24, right: 24, zIndex: 9999,
    background: type === "error" ? "#dc2626" : "#0f172a",
    color: "#fff", padding: "12px 18px", borderRadius: 12,
    fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    display: "flex", alignItems: "center", gap: 8,
    animation: "slideIn 0.2s ease"
  }}>
    <Icon name={type === "error" ? "warning" : "check"} size={16} />
    {msg}
  </div>
);

// ─── EXPORT VIEW ──────────────────────────────────────────────────────────────
const ExportView = ({ mese, anno }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "16px 20px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Esportazione File</div>
      <div style={{ fontSize: 13, color: "#64748b" }}>Per l'esportazione Excel e PDF usa i comandi Python dalla cartella del progetto:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {[`python main.py export-excel ${mese} ${anno}`, `python main.py export-pdf ${mese} ${anno}`].map(cmd => (
          <code key={cmd} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#10b981", background: "#0f172a", padding: "8px 14px", borderRadius: 8, display: "block" }}>{cmd}</code>
        ))}
      </div>
    </div>
  </div>
);

// ─── IMPOSTAZIONI ─────────────────────────────────────────────────────────────
const ImpostazioniView = ({ onReload, addebitiStandard = [], onSaveAddebitiStandard = () => {} }) => {
  const [dbPath, setDbPath] = useState("Caricamento...");
  const isElectron = typeof window !== "undefined" && !!window.electronAPI;

  useState(() => {
    if (isElectron) { window.electronAPI.getDbPath().then(p => setDbPath(p)); }
    else { setDbPath("LocalStorage (modalità browser)"); }
  });

  const changeDb = async () => {
    if (!isElectron) return;
    const newPath = await window.electronAPI.changeDbPath();
    if (newPath) { setDbPath(newPath); alert("Percorso DB aggiornato. Riavvia l'applicazione per applicare la modifica."); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Database SQLite</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Percorso corrente</div>
          <code style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#374151", border: "1px solid #e2e8f0", wordBreak: "break-all" }}>{dbPath}</code>
          {isElectron && (
            <div style={{ marginTop: 8 }}>
              <button onClick={changeDb} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#1e40af", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <Icon name="db" size={14} /> Cambia cartella DB (rete condivisa)
              </button>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                💡 Per uso in rete: seleziona una cartella condivisa accessibile da tutti i PC (es. <code>\\SERVER\GLS</code>)
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Uso in rete locale</div>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
          Per usare questo programma su più PC contemporaneamente:<br/>
          <strong>1.</strong> Crea una cartella condivisa in rete (es. <code>\\SERVER\GLS\</code>)<br/>
          <strong>2.</strong> Da questo PC, clicca "Cambia cartella DB" e seleziona quella cartella<br/>
          <strong>3.</strong> Installa il programma su ogni PC e ripeti il passaggio 2<br/>
          <strong>4.</strong> Tutti i PC ora condivideranno lo stesso database SQLite ✅
        </div>
      </div>

      {/* ADDEBITI STANDARD */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>📋 Addebiti Standard (Template)</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
          Crea template per addebiti ricorrenti. Nei Conteggi Mensili potrai selezionarli e inserire solo la parte variabile.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {addebitiStandard.map((tpl, i) => (
            <div key={tpl.id} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fafafa", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>📋 {tpl.nome || "Nuovo Template"}</span>
                <button onClick={() => onSaveAddebitiStandard(addebitiStandard.filter((_, j) => j !== i))}
                  style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Nome Template</label>
                  <input value={tpl.nome || ""} onChange={e => { const a = [...addebitiStandard]; a[i] = { ...a[i], nome: e.target.value }; onSaveAddebitiStandard(a); }}
                    placeholder="es. PROT SANZ" style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Prefisso fisso</label>
                  <input value={tpl.prefisso || ""} onChange={e => { const a = [...addebitiStandard]; a[i] = { ...a[i], prefisso: e.target.value }; onSaveAddebitiStandard(a); }}
                    placeholder="es. PROT SANZ " style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono',monospace" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Conto Voce</label>
                  <input value={tpl.conto_voce || ""} onChange={e => { const a = [...addebitiStandard]; a[i] = { ...a[i], conto_voce: e.target.value }; onSaveAddebitiStandard(a); }}
                    placeholder="es. 4.08.041 - FURTI E DANNI" style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Importo Default (€)</label>
                    <input type="number" value={tpl.importo_default || 0} step="0.01" onChange={e => { const a = [...addebitiStandard]; a[i] = { ...a[i], importo_default: parseFloat(e.target.value) || 0 }; onSaveAddebitiStandard(a); }}
                      style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "'DM Mono',monospace" }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>IVA predefinita</label>
                    <select value={tpl.iva_rate ?? 0} onChange={e => { const a = [...addebitiStandard]; a[i] = { ...a[i], iva_rate: parseFloat(e.target.value) }; onSaveAddebitiStandard(a); }}
                      style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff" }}>
                      {[["No IVA", 0], ["IVA 4%", 0.04], ["IVA 10%", 0.10], ["IVA 15%", 0.15], ["IVA 22%", 0.22]].map(([l, r]) => (
                        <option key={r} value={r}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => onSaveAddebitiStandard([...addebitiStandard, { id: "TPL_" + Date.now(), nome: "", prefisso: "", conto_voce: "", importo_default: 0, iva_rate: 0 }])}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, background: "#f5f3ff", border: "1px dashed #c4b5fd", color: "#5b21b6", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            ＋ Aggiungi Template Addebito
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── APP INNER ────────────────────────────────────────────────────────────────
const AppInner = () => {
  const { currentUser, isAdmin, canAccess, logout } = useAuth();
  const { logEntries, addLogEntry } = useActivityLog();
  const [view, setView] = useState("dashboard");
  const [mese, setMese] = useState(MESI_IT[new Date().getMonth()]);
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [notification, setNotification] = useState(null);
  const [addebitiStandard, setAddebitiStandard] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gls_addebiti_standard") || "[]"); } catch { return []; }
  });

  const saveAddebitiStandard = (list) => {
    setAddebitiStandard(list);
    try { localStorage.setItem("gls_addebiti_standard", JSON.stringify(list)); } catch {}
  };

  const { padroncini, conteggi, mezzi, palmari, codAutisti, ricariche, loading, error,
          savePadroncino, deletePadroncino, saveConteggio,
          saveMezzo, deleteMezzo, savePalmare, deletePalmare,
          saveCodAutista, deleteCodAutista,
          saveRicaricheMese, reload } = useDatabase();

  const notify = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleSavePadroncino = useCallback(async (p) => {
    try {
      await savePadroncino(p);
      notify("Padroncino salvato!");
    } catch (e) {
      notify("Errore nel salvataggio: " + e.message, "error");
    }
    // Il log globale viene scritto esclusivamente via onLogChange (evita doppia registrazione)
  }, [savePadroncino, notify]);

  const handleDeletePadroncino = useCallback(async (id) => {
    try {
      const pad = padroncini.find(p => p.id === id);
      await deletePadroncino(id);
      notify("Padroncino eliminato");
      addLogEntry({
        sezione:     "padroncini",
        azione:      "ELIMINA",
        entita_id:   id,
        entita_nome: pad?.nome || id,
        descrizione: `Eliminato padroncino "${pad?.nome || id}"`,
        currentUser,
        campi: [],
      });
    } catch (e) { notify("Errore eliminazione: " + e.message, "error"); }
  }, [deletePadroncino, padroncini, notify, addLogEntry, currentUser]);

  // FIX BUG 2: handleSaveConteggio (era erroneamente chiamata handleSaveConteggioLogged nel JSX)
  const handleSaveConteggio = useCallback(async (c) => {
    try { await saveConteggio(c); notify("Conteggio salvato!"); }
    catch (e) { notify("Errore nel salvataggio: " + e.message, "error"); }
  }, [saveConteggio, notify]);

  const deleteConteggio = async (c) => {
    const isElectron = typeof window !== "undefined" && !!window.electronAPI;
    if (isElectron && window.electronAPI.deleteConteggio) {
      await window.electronAPI.deleteConteggio(c.padroncino_id, c.mese, c.anno);
    } else {
      const updated = JSON.parse(localStorage.getItem("gls_conteggi") || "[]")
        .filter(x => !(x.padroncino_id === c.padroncino_id && x.mese === c.mese && x.anno === c.anno));
      localStorage.setItem("gls_conteggi", JSON.stringify(updated));
    }
    reload();
    notify("Conteggio eliminato");
  };

  const handleAddNew = () => {
    const newPad = {
      id: `PAD_${Date.now()}`, nome: "Nuovo Padroncino", codice: "", stato: "ATTIVO",
      durc_scadenza: null, durc_stato: "NON PRESENTE", fatturato_totale: 0,
      palmari: [], mezzi: [], codici_autisti: [], fatturato_template: [], note_varie: "", dvr: "",
    };
    handleSavePadroncino(newPad, null, "CREA");
    notify("Nuovo padroncino creato!");
  };

  const handleAddNewMezzo = (categoria = "DISTRIBUZIONE") => {
    const m = {
      id: "MEZZO_" + Date.now(), targa: "", alimentazione: "Diesel",
      marca: "", modello: "", tipo: "Furgone", categoria,
      stato: "DISPONIBILE", autista: "", padroncino_id: "",
      scad_assicurazione: "", scad_revisione: "", scad_bollo: "", scad_tachigrafo: "",
      proprietario: "", data_inizio: "", data_fine: "",
      canone_noleggio: 0, rata_noleggio: 0,
      maggiorazione_ricarica_pct: categoria === "DISTRIBUZIONE" ? 20 : null,
      note_veicolo: "",
    };
    handleSaveMezzo(m, []);
  };

  const handleSaveMezzo = useCallback(async (m, nuoviLog = []) => {
    const az = mezzi?.find(x => x.id === m.id) ? "MODIFICA" : "CREA";
    try { await saveMezzo(m); } catch (e) { notify("Errore mezzo: " + e.message, "error"); return; }

    const campi = (nuoviLog || []).map(s => ({ campo: s.campo, da: s.da, a: s.a }));
    if (az === "MODIFICA" && campi.length === 0) return;

    addLogEntry({
      sezione:     "mezzi",
      azione:      az,
      entita_id:   m.id,
      entita_nome: m.targa || m.id,
      descrizione: az === "CREA"
        ? `Creato mezzo "${m.targa || m.id}"`
        : campi.length === 1
          ? `Mezzo "${m.targa}": ${campi[0].campo} ${campi[0].da} → ${campi[0].a}`
          : `Mezzo "${m.targa}": ${campi.map(c => `${c.campo} → ${c.a}`).join(" · ")}`,
      currentUser,
      campi,
    });
    notify("Mezzo salvato!");
  }, [saveMezzo, mezzi, addLogEntry, currentUser, notify]);

  const handleDeleteMezzo = useCallback(async (id) => {
    const m = mezzi?.find(x => x.id === id);
    try { await deleteMezzo(id); } catch (e) { notify("Errore: " + e.message, "error"); return; }
    addLogEntry({
      sezione: "mezzi", azione: "ELIMINA",
      entita_id: id, entita_nome: m?.targa || id,
      descrizione: `Eliminato mezzo "${m?.targa || id}"`,
      currentUser, campi: [],
    });
    notify("Mezzo eliminato");
  }, [deleteMezzo, mezzi, addLogEntry, currentUser, notify]);

  const handleAddNewPalmare = () => {
    const p = {
      id:              "PALM_" + Date.now(),
      seriale:         "",
      modello:         "",
      modello_custom:  "",
      stato:           "DISPONIBILE",
      padroncino_id:   "",
      tariffa_mensile: 0,
      data_assegnazione: "",
      data_fine:       "",
      note:            "",
      storico:         [],
      documenti:       [],
      imei:            "",
      sim:             "",
      numero_sim:      "",
      firmware:        "",
      data_acquisto:   "",
      fornitore:       "",
    };
    handleSavePalmare(p, []);
  };

  // FIX BUG 1: handleSavePalmare definita correttamente in AppInner
  const handleSavePalmare = useCallback(async (p, nuoviLog = []) => {
    const az = palmari?.find(x => x.id === p.id) ? "MODIFICA" : "CREA";
    try { await savePalmare(p); } catch (e) { notify("Errore palmare: " + e.message, "error"); return; }

    const campi = (nuoviLog || []).map(s => ({ campo: s.campo, da: s.da, a: s.a }));
    if (az === "MODIFICA" && campi.length === 0) return;

    addLogEntry({
      sezione:     "palmari",
      azione:      az,
      entita_id:   p.id,
      entita_nome: p.seriale || p.id,
      descrizione: az === "CREA"
        ? `Creato palmare "${p.seriale || p.id}"`
        : campi.length === 1
          ? `Palmare "${p.seriale}": ${campi[0].campo} ${campi[0].da} → ${campi[0].a}`
          : `Palmare "${p.seriale}": ${campi.map(c => `${c.campo} → ${c.a}`).join(" · ")}`,
      currentUser,
      campi,
    });
    notify("Palmare salvato!");
  }, [savePalmare, palmari, addLogEntry, currentUser, notify]);

  const handleDeletePalmare = useCallback(async (id) => {
    const p = palmari?.find(x => x.id === id);
    try { await deletePalmare(id); } catch (e) { notify("Errore: " + e.message, "error"); return; }
    addLogEntry({
      sezione: "palmari", azione: "ELIMINA",
      entita_id: id, entita_nome: p?.seriale || id,
      descrizione: `Eliminato palmare "${p?.seriale || id}"`,
      currentUser, campi: [],
    });
    notify("Palmare eliminato");
  }, [deletePalmare, palmari, addLogEntry, currentUser, notify]);

  const handleAddNewCodAutista = () => {
    const a = {
      id:              "COD_" + Date.now(),
      codice:          "",
      stato:           "DISPONIBILE",
      padroncino_id:   "",
      note:            "",
      storico:         [],
      documenti:       [],
      tariffa_fissa:   0,
      tariffa_ritiro:  0,
      target:          "",
      data_inizio:     "",
      data_fine:       "",
      contratto:       "",
      numero_badge:    "",
      patente:         "",
      scad_patente:    "",
    };
    handleSaveCodAutista(a, []);
  };

  const handleSaveCodAutista = useCallback(async (a, nuoviLog = []) => {
    const az = codAutisti?.find(x => x.id === a.id) ? "MODIFICA" : "CREA";
    try { await saveCodAutista(a); } catch (e) { notify("Errore codice: " + e.message, "error"); return; }

    const campi = (nuoviLog || []).map(s => ({ campo: s.campo, da: s.da, a: s.a }));
    if (az === "MODIFICA" && campi.length === 0) return;

    addLogEntry({
      sezione:     "codici",
      azione:      az,
      entita_id:   a.id,
      entita_nome: a.codice || a.id,
      descrizione: az === "CREA"
        ? `Creato codice autista "${a.codice || a.id}"`
        : campi.length === 1
          ? `Cod. "${a.codice}": ${campi[0].campo} ${campi[0].da} → ${campi[0].a}`
          : `Cod. "${a.codice}": ${campi.map(c => `${c.campo} → ${c.a}`).join(" · ")}`,
      currentUser,
      campi,
    });
    notify("Codice autista salvato!");
  }, [saveCodAutista, codAutisti, addLogEntry, currentUser, notify]);

  const handleDeleteCodAutista = useCallback(async (id) => {
    const a = codAutisti?.find(x => x.id === id);
    try { await deleteCodAutista(id); } catch (e) { notify("Errore: " + e.message, "error"); return; }
    addLogEntry({
      sezione: "codici", azione: "ELIMINA",
      entita_id: id, entita_nome: a?.codice || id,
      descrizione: `Eliminato codice autista "${a?.codice || id}"`,
      currentUser, campi: [],
    });
    notify("Codice eliminato");
  }, [deleteCodAutista, codAutisti, addLogEntry, currentUser, notify]);

  const navItems = [
    { id: "dashboard",    label: "Dashboard",            icon: "dashboard",   show: canAccess("dashboard") },
    { id: "padroncini",   label: "Padroncini",           icon: "users",       show: canAccess("padroncini") },
    { id: "conteggi",     label: "Conteggi Mensili",     icon: "calculator",  show: canAccess("conteggi") },
    { id: "mezzi",        label: "Flotta Mezzi",         icon: "truck",       show: canAccess("mezzi") },
    { id: "palmari",      label: "Palmari",              icon: "device",      show: canAccess("mezzi") },
    { id: "cod_autisti",  label: "Cod. Autisti",         icon: "users",       show: canAccess("cod_autisti") },
    { id: "ricariche",    label: "Ricariche Elettriche", icon: "euro",        show: canAccess("ricariche") },
    { id: "ricerca",      label: "Ricerca Globale",      icon: "search",      show: canAccess("ricerca") },
    { id: "export",       label: "Esportazione",         icon: "export",      show: true },
    { id: "impostazioni", label: "Impostazioni",         icon: "settings",    show: isAdmin },
    { id: "utenti",       label: "Gestione Utenti",      icon: "users",       show: isAdmin },
    { id: "log_storico",  label: "Log Storico",          icon: "list",        show: isAdmin },
  ].filter(n => n.show);

  if (loading) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f0f4f8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #1e40af", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ color: "#64748b", fontSize: 14 }}>Caricamento database...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f0f4f8" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 32, textAlign: "center", border: "1px solid #fca5a5", maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Errore Database</div>
        <div style={{ fontSize: 13, color: "#64748b" }}>{error}</div>
        <button onClick={reload} style={{ marginTop: 16, padding: "8px 18px", borderRadius: 8, background: "#1e40af", color: "#fff", border: "none", fontSize: 13, cursor: "pointer" }}>Riprova</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: "#f0f4f8", color: "#0f172a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        @keyframes slideIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: "#0f172a", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "4px 0 20px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#f59e0b", borderRadius: 10, padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>GLS</div>
              <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Padroncini</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2,
                background: view === item.id ? "#1e40af" : "transparent",
                color: view === item.id ? "#fff" : "#94a3b8",
                fontSize: 13, fontWeight: view === item.id ? 700 : 500, textAlign: "left", transition: "all 0.15s"
              }}
              onMouseEnter={e => { if (view !== item.id) { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#e2e8f0"; } }}
              onMouseLeave={e => { if (view !== item.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; } }}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 14px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stato Mese</div>
          {(() => {
            const mc = conteggi.filter(c => c.mese === mese && c.anno === anno);
            const totBon = mc.reduce((s, c) => s + (c.totale_da_bonificare || 0), 0);
            const completati = mc.filter(c => c.caricata_scadenziario).length;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "#64748b" }}>Da bonificare</span>
                  <span style={{ color: "#10b981", fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{euro(totBon)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "#64748b" }}>Completati</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{completati}/{mc.length}</span>
                </div>
              </div>
            );
          })()}
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, borderTop: "1px solid #1e293b" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {(currentUser?.nome || currentUser?.username || "U")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.nome || currentUser?.username}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{isAdmin ? "Admin" : "Operatore"}</div>
            </div>
            <button onClick={logout} title="Esci" style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 2 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{navItems.find(n => n.id === view)?.label || view}</span>
            {(view === "conteggi") && (
              <>
                <select value={mese} onChange={e => setMese(e.target.value)}
                  style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #e2e8f0", fontSize:13, fontWeight:600, background:"#fff", color:"#1d4ed8", cursor:"pointer", outline:"none" }}>
                  {MESI_IT.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={anno} onChange={e => setAnno(parseInt(e.target.value))}
                  style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #e2e8f0", fontSize:13, fontWeight:600, background:"#fff", color:"#1d4ed8", cursor:"pointer", outline:"none" }}>
                  {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span style={{ background:"#f1f5f9", color:"#64748b", borderRadius:6, padding:"4px 9px", fontSize:12 }}>{giorniMese(mese, anno)} gg</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {padroncini.filter(p => p.durc_stato === "SCADUTO").length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff7ed", borderRadius: 7, padding: "5px 10px", border: "1px solid #fed7aa" }}>
                <Icon name="warning" size={14} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e" }}>{padroncini.filter(p => p.durc_stato === "SCADUTO").length} DURC scaduti</span>
              </div>
            )}
            <button onClick={() => setView("ricerca")} style={{ display: "flex", alignItems: "center", gap: 5, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#475569", fontSize: 12 }}>
              <Icon name="search" size={14} /> Cerca
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {view === "dashboard"    && <DashboardView padroncini={padroncini} conteggi={conteggi} mezzi={mezzi || []} onNavigate={setView} />}
          {view === "padroncini"   && (
            <PadronciniView
              padroncini={padroncini} conteggi={conteggi} mezzi={mezzi || []}
              palmariGlobali={palmari || []} codAutistiGlobali={codAutisti || []}
              onSave={handleSavePadroncino}
              utente={currentUser?.nome || currentUser?.username || ""}
              onSaveConteggio={handleSaveConteggio}
              onSaveMezzo={handleSaveMezzo}
              onDelete={handleDeletePadroncino}
              onSavePalmare={handleSavePalmare}
              onSaveCodAutista={handleSaveCodAutista}
              onAddNew={handleAddNew}
              onLogChange={(formSaved, campiDiff) => {
                // PadroncinoDetail ha già calcolato il diff — qui scriviamo solo il log globale.
                if (!campiDiff?.length) return;

                // Rileva tipo azione dal primo campo
                const primoLabel = (campiDiff[0]?.label || "").toLowerCase();
                const isAssegn   = primoLabel.includes("assegnat");
                const isRimoss   = primoLabel.includes("rimoss");
                const isNuovo    = !padroncini?.find(x => x.id === formSaved.id);

                const az = isNuovo ? "CREA" : isAssegn ? "ASSEGNAZIONE" : isRimoss ? "RIMOZIONE" : "MODIFICA";

                // Descrizione leggibile
                let desc;
                if (az === "CREA") {
                  desc = `Creato padroncino "${formSaved.nome}"`;
                } else if (isAssegn || isRimoss) {
                  // es. "Mezzo assegnato" → valore è la targa/seriale/codice
                  const cosa  = campiDiff[0].label.replace(/ assegnato| rimosso/i, "").trim();
                  const valore = isAssegn ? campiDiff[0].a : campiDiff[0].da;
                  const verbo  = isAssegn ? "assegnato" : "rimosso";
                  desc = `${cosa} ${valore} ${verbo} ${isAssegn ? "a" : "da"} "${formSaved.nome}"`;
                } else {
                  desc = campiDiff.length === 1
                    ? `"${formSaved.nome}": ${campiDiff[0].label} → ${campiDiff[0].a}`
                    : `"${formSaved.nome}": ${campiDiff.map(c => `${c.label} → ${c.a}`).join(" · ")}`;
                }

                addLogEntry({
                  sezione:     "padroncini",
                  azione:      az,
                  entita_id:   formSaved.id,
                  entita_nome: formSaved.nome || formSaved.id,
                  descrizione: desc,
                  currentUser,
                  campi: campiDiff.map(c => ({ campo: c.label, da: c.da, a: c.a })),
                });
              }}
            />
          )}
          {view === "conteggi"    && (
            <ConteggiEditor
              padroncini={padroncini} conteggi={conteggi}
              mese={mese} anno={anno}
              onSave={handleSaveConteggio}
              onDelete={deleteConteggio}
              addebiti_standard={addebitiStandard}
              ricariche={ricariche || {}} mezziFlotta={mezzi || []}
            />
          )}
          {view === "mezzi"       && <MezziView
            mezzi={mezzi || []} padroncini={padroncini}
            onSave={handleSaveMezzo} onDelete={handleDeleteMezzo} onAddNew={handleAddNewMezzo}
            utente={currentUser?.nome || currentUser?.username || ""}
          />}
          {view === "ricariche"   && <RicaricheView ricariche={ricariche || {}} onSave={saveRicaricheMese} mezzi={mezzi || []} padroncini={padroncini || []} mese={mese} anno={anno} onSaveMezzo={saveMezzo} />}
          {view === "ricerca"     && <RicercaGlobale padroncini={padroncini} conteggi={conteggi} />}
          {view === "palmari"    && <PalmariView
            palmari={palmari || []} padroncini={padroncini}
            onSave={handleSavePalmare} onDelete={handleDeletePalmare} onAddNew={handleAddNewPalmare}
            utente={currentUser?.nome || currentUser?.username || ""}
          />}
          {view === "cod_autisti" && <CodAutistiView
            codAutisti={codAutisti || []} padroncini={padroncini}
            onSave={handleSaveCodAutista} onDelete={handleDeleteCodAutista} onAddNew={handleAddNewCodAutista}
            utente={currentUser?.nome || currentUser?.username || ""}
          />}
          {view === "export"      && <ExportView mese={mese} anno={anno} />}
          {view === "impostazioni"&& <ImpostazioniView onReload={reload} addebitiStandard={addebitiStandard} onSaveAddebitiStandard={saveAddebitiStandard} />}
          {view === "utenti"      && isAdmin && <GestioneUtenti />}
          {view === "log_storico" && isAdmin && <LogStoricoView logEntries={logEntries} />}
        </div>
      </main>

      {notification && <Notification msg={notification.msg} type={notification.type} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}

const AppWithAuth = () => {
  const { currentUser, authReady } = useAuth();
  if (!authReady) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!currentUser) return <LoginScreen />;
  return <AppInner />;
};
