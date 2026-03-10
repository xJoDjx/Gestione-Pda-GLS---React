// ═══════════════════════════════════════════════════════════════════════════════
// src/hooks/useActivityLog.js  —  Hook per il Log Storico Globale
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect } from "react";

const isElectron = typeof window !== "undefined" && !!window.electronAPI;

// ─── Salva/Carica log entries via Electron o localStorage (fallback) ──────────
async function persistLogEntry(entry) {
  if (isElectron && window.electronAPI.saveLogEntry) {
    const res = await window.electronAPI.saveLogEntry(entry);
    return res?.entry || entry;
  }
  // fallback localStorage
  try {
    const all = JSON.parse(localStorage.getItem("gls_activity_log") || "[]");
    const withId = { ...entry, id: Date.now() };
    all.unshift(withId);
    if (all.length > 2000) all.length = 2000; // limite sicurezza
    localStorage.setItem("gls_activity_log", JSON.stringify(all));
    return withId;
  } catch { return entry; }
}

async function loadLogEntries() {
  if (isElectron && window.electronAPI.getLogEntries) {
    return await window.electronAPI.getLogEntries();
  }
  try {
    return JSON.parse(localStorage.getItem("gls_activity_log") || "[]");
  } catch { return []; }
}

// ─── HOOK PRINCIPALE ──────────────────────────────────────────────────────────
export function useActivityLog() {
  const [logEntries, setLogEntries] = useState([]);

  // Carica all'avvio
  useEffect(() => {
    loadLogEntries().then(entries => setLogEntries(entries || [])).catch(() => {});
  }, []);

  /**
   * Aggiunge una voce di log e la persiste immediatamente.
   *
   * @param {object} opts
   * @param {string}  opts.sezione      - "padroncini"|"mezzi"|"palmari"|"codici"|"conteggi"|"sistema"
   * @param {string}  opts.azione       - "CREA"|"MODIFICA"|"ELIMINA"
   * @param {string}  opts.entita_id    - ID dell'entità modificata
   * @param {string}  opts.entita_nome  - Nome leggibile (es. "Mario Rossi")
   * @param {string}  opts.descrizione  - Descrizione testuale dell'operazione
   * @param {object}  opts.currentUser  - Utente corrente ({ nome, username })
   * @param {Array}   opts.campi        - Array {campo, da, a} dei campi modificati
   */
  const addLogEntry = useCallback(async ({
    sezione = "",
    azione = "MODIFICA",
    entita_id = "",
    entita_nome = "",
    descrizione = "",
    currentUser = null,
    campi = [],
  }) => {
    const entry = {
      ts:               new Date().toISOString(),
      utente:           currentUser?.nome || currentUser?.username || "Sistema",
      username:         currentUser?.username || "",
      sezione,
      azione,
      entita_id:        String(entita_id),
      entita_nome,
      descrizione,
      campi_modificati: campi,
    };

    // Aggiorna stato React immediatamente (ottimistico)
    setLogEntries(prev => [entry, ...prev]);

    // Persiste in background e aggiorna con l'id reale
    try {
      const saved = await persistLogEntry(entry);
      if (saved && saved.id) {
        setLogEntries(prev => {
          const idx = prev.findIndex(e => e.ts === entry.ts && e.utente === entry.utente && !e.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], id: saved.id };
          return next;
        });
      }
    } catch (e) {
      console.error("[log] persistLogEntry error:", e);
    }
  }, []);

  return { logEntries, addLogEntry };
}

// ─── HELPER: calcola diff tra due oggetti ─────────────────────────────────────
/**
 * Confronta due oggetti e restituisce l'array di campi modificati.
 * @param {object} oldObj - stato precedente
 * @param {object} newObj - stato nuovo
 * @param {Array}  campiConfig - array di [chiave, label, trasformatore?]
 * @param {Array}  padroncini  - lista padroncini per risolvere padroncino_id
 */
export function diffCampi(oldObj, newObj, campiConfig, padroncini = []) {
  const result = [];
  for (const [key, label, fmt] of campiConfig) {
    const vo = String(oldObj?.[key] ?? "");
    const vn = String(newObj?.[key] ?? "");
    if (vo === vn) continue;
    let da = vo || "—";
    let a  = vn || "—";
    if (key === "padroncino_id") {
      da = padroncini.find(p => p.id === vo)?.nome || (vo ? vo : "Nessuno");
      a  = padroncini.find(p => p.id === vn)?.nome || (vn ? vn : "Nessuno");
    } else if (fmt) {
      da = fmt(vo);
      a  = fmt(vn);
    }
    result.push({ campo: label, da, a });
  }
  return result;
}
