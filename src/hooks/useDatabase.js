import { useState, useEffect, useCallback } from "react";

// ─── AMBIENTE ─────────────────────────────────────────────────────────────────
const isElectron = typeof window !== "undefined" && !!window.electronAPI;

// ─── localStorage helpers ─────────────────────────────────────────────────────
const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ─── Merge helpers ────────────────────────────────────────────────────────────
const mergeById = (base = [], override = [], idKey = "id") => {
  const overMap = Object.fromEntries(override.map(x => [x[idKey], x]));
  const baseIds = new Set(base.map(x => x[idKey]));
  const merged  = base.map(x => overMap[x[idKey]] ? { ...x, ...overMap[x[idKey]] } : x);
  override.forEach(x => { if (!baseIds.has(x[idKey])) merged.push(x); });
  return merged;
};

const cKey = c => `${c.padroncino_id}_${c.mese}_${c.anno}`;
const mergeConteggi = (base = [], override = []) => {
  const overMap  = Object.fromEntries(override.map(x => [cKey(x), x]));
  const baseKeys = new Set(base.map(cKey));
  const merged   = base.map(x => overMap[cKey(x)] ? { ...x, ...overMap[cKey(x)] } : x);
  override.forEach(x => { if (!baseKeys.has(cKey(x))) merged.push(x); });
  return merged;
};

// ─── Ricariche storage ────────────────────────────────────────────────────────
const saveRicaricheStorage = async (data) => {
  if (isElectron) {
    if (window.electronAPI.saveRicariche) { await window.electronAPI.saveRicariche(data); return; }
    if (window.electronAPI.saveSettings)  { await window.electronAPI.saveSettings("ricariche", JSON.stringify(data)); return; }
  }
  lsSet("gls_ricariche", data);
};

const loadRicaricheStorage = async () => {
  if (isElectron) {
    if (window.electronAPI.getRicariche) { const r = await window.electronAPI.getRicariche(); return r || {}; }
    if (window.electronAPI.getSettings)  {
      const raw = await window.electronAPI.getSettings("ricariche");
      try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
    }
  }
  return lsGet("gls_ricariche", {});
};

// ─── Electron API safe caller ─────────────────────────────────────────────────
const eCall = async (method, ...args) => {
  if (isElectron && typeof window.electronAPI[method] === "function") {
    return await window.electronAPI[method](...args);
  }
  return null;
};

// ─── HOOK PRINCIPALE ──────────────────────────────────────────────────────────
export function useDatabase() {
  const [padroncini,  setPadroncini]  = useState([]);
  const [mezzi,       setMezzi]       = useState([]);
  const [palmari,     setPalmari]     = useState([]);
  const [codAutisti,  setCodAutisti]  = useState([]);
  const [conteggi,    setConteggi]    = useState([]);
  const [ricariche,   setRicariche]   = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // ── LOAD ALL ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isElectron) {
        const [ePads, eConts, eMezzi] = await Promise.all([
          window.electronAPI.getPadroncini(),
          window.electronAPI.getConteggi(),
          window.electronAPI.getMezzi(),
        ]);
        const ePalm     = await eCall("getPalmari")     || [];
        const eCodAut   = await eCall("getCodAutisti")  || [];

        const lsPads    = lsGet("gls_padroncini",   []);
        const lsConts   = lsGet("gls_conteggi",     []);
        const lsMezzi   = lsGet("gls_mezzi",        []);
        const lsPalm    = lsGet("gls_palmari",      []);
        const lsCodAut  = lsGet("gls_cod_autisti",  []);

        setPadroncini (ePads.length    > 0 ? ePads    : lsPads);
        setConteggi   (eConts.length   > 0 ? eConts   : lsConts);
        setMezzi      (eMezzi.length   > 0 ? eMezzi   : lsMezzi);
        setPalmari    (ePalm.length    > 0 ? ePalm    : lsPalm);
        setCodAutisti (eCodAut.length  > 0 ? eCodAut  : lsCodAut);

      } else {
        setPadroncini (lsGet("gls_padroncini",  []));
        setConteggi   (lsGet("gls_conteggi",    []));
        setMezzi      (lsGet("gls_mezzi",       []));
        setPalmari    (lsGet("gls_palmari",     []));
        setCodAutisti (lsGet("gls_cod_autisti", []));
      }

      setRicariche(await loadRicaricheStorage());
    } catch (e) {
      setError(e.message);
      console.error("[useDatabase] loadAll error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── PADRONCINI ──────────────────────────────────────────────────────────────
  const savePadroncino = useCallback(async (p) => {
    try { await eCall("savePadroncino", p); } catch (e) { console.error("[savePadroncino]", e); }
    setPadroncini(prev => {
      const next = prev.some(x => x.id === p.id)
        ? prev.map(x => x.id === p.id ? p : x)
        : [...prev, p];
      lsSet("gls_padroncini", next);
      return next;
    });
  }, []);

  const deletePadroncino = useCallback(async (id) => {
    try { await eCall("deletePadroncino", id); } catch {}
    setPadroncini(prev => { const next = prev.filter(p => p.id !== id); lsSet("gls_padroncini", next); return next; });
    setConteggi(prev   => { const next = prev.filter(c => c.padroncino_id !== id); lsSet("gls_conteggi", next); return next; });
  }, []);

  // ── MEZZI ───────────────────────────────────────────────────────────────────
  const saveMezzo = useCallback(async (m) => {
    try { await eCall("saveMezzo", m); } catch (e) { console.error("[saveMezzo]", e); }
    setMezzi(prev => {
      const next = prev.some(x => x.id === m.id)
        ? prev.map(x => x.id === m.id ? m : x)
        : [...prev, m];
      lsSet("gls_mezzi", next);
      return next;
    });
  }, []);

  const deleteMezzo = useCallback(async (id) => {
    try { await eCall("deleteMezzo", id); } catch {}
    setMezzi(prev => { const next = prev.filter(m => m.id !== id); lsSet("gls_mezzi", next); return next; });
  }, []);

  // ── PALMARI FLOTTA ──────────────────────────────────────────────────────────
  const savePalmare = useCallback(async (p) => {
    try { await eCall("savePalmare", p); } catch (e) { console.error("[savePalmare]", e); }
    setPalmari(prev => {
      const next = prev.some(x => x.id === p.id)
        ? prev.map(x => x.id === p.id ? p : x)
        : [...prev, p];
      lsSet("gls_palmari", next);
      return next;
    });
  }, []);

  const deletePalmare = useCallback(async (id) => {
    try { await eCall("deletePalmare", id); } catch {}
    setPalmari(prev => { const next = prev.filter(p => p.id !== id); lsSet("gls_palmari", next); return next; });
  }, []);

  // ── COD AUTISTI FLOTTA ──────────────────────────────────────────────────────
  const saveCodAutista = useCallback(async (a) => {
    try { await eCall("saveCodAutista", a); } catch (e) { console.error("[saveCodAutista]", e); }
    setCodAutisti(prev => {
      const next = prev.some(x => x.id === a.id)
        ? prev.map(x => x.id === a.id ? a : x)
        : [...prev, a];
      lsSet("gls_cod_autisti", next);
      return next;
    });
  }, []);

  const deleteCodAutista = useCallback(async (id) => {
    try { await eCall("deleteCodAutista", id); } catch {}
    setCodAutisti(prev => { const next = prev.filter(a => a.id !== id); lsSet("gls_cod_autisti", next); return next; });
  }, []);

  // ── CONTEGGI ────────────────────────────────────────────────────────────────
  const saveConteggio = useCallback(async (c) => {
    try { await eCall("saveConteggio", c); } catch (e) { console.error("[saveConteggio]", e); }
    setConteggi(prev => {
      const idx  = prev.findIndex(x => cKey(x) === cKey(c));
      const next = idx >= 0 ? prev.map((x, i) => i === idx ? c : x) : [...prev, c];
      lsSet("gls_conteggi", next);
      return next;
    });
  }, []);

  const deleteConteggio = useCallback(async (c) => {
    try { await eCall("deleteConteggio", c.padroncino_id, c.mese, c.anno); } catch (e) { console.error("[deleteConteggio]", e); }
    setConteggi(prev => {
      const next = prev.filter(x => cKey(x) !== cKey(c));
      lsSet("gls_conteggi", next);
      return next;
    });
  }, []);

  // ── RICARICHE ───────────────────────────────────────────────────────────────
  const saveRicaricheMese = useCallback(async (key, data) => {
    const updated = { ...ricariche, [key]: data };
    await saveRicaricheStorage(updated);
    setRicariche(updated);
  }, [ricariche]);

  return {
    padroncini, conteggi, mezzi, palmari, codAutisti, ricariche, loading, error,
    savePadroncino,  deletePadroncino,
    saveConteggio,   deleteConteggio,
    saveMezzo,       deleteMezzo,
    savePalmare,     deletePalmare,
    saveCodAutista,  deleteCodAutista,
    saveRicaricheMese,
    reload: loadAll,
  };
}
