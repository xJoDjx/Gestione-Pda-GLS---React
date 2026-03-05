// ═══════════════════════════════════════════════════════════════════════════════
// preload.js  —  Electron preload (contextIsolation: true)
// Espone window.electronAPI al renderer in modo sicuro tramite contextBridge.
// Ogni metodo corrisponde a un handler ipcMain.handle("db:...") in main.js
// ═══════════════════════════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

  // ── Padroncini ─────────────────────────────────────────────────────────────
  getPadroncini:   ()    => ipcRenderer.invoke("db:getPadroncini"),
  savePadroncino:  (p)   => ipcRenderer.invoke("db:savePadroncino",  p),
  deletePadroncino:(id)  => ipcRenderer.invoke("db:deletePadroncino",id),

  // ── Conteggi ───────────────────────────────────────────────────────────────
  getConteggi:     ()    => ipcRenderer.invoke("db:getConteggi"),
  saveConteggio:   (c)   => ipcRenderer.invoke("db:saveConteggio",   c),
  deleteConteggio: (padroncino_id, mese, anno) =>
    ipcRenderer.invoke("db:deleteConteggio", { padroncino_id, mese, anno }),

  // ── Mezzi ──────────────────────────────────────────────────────────────────
  getMezzi:        ()    => ipcRenderer.invoke("db:getMezzi"),
  saveMezzo:       (m)   => ipcRenderer.invoke("db:saveMezzo",       m),
  deleteMezzo:     (id)  => ipcRenderer.invoke("db:deleteMezzo",     id),

  // ── Palmari ────────────────────────────────────────────────────────────────
  getPalmari:      ()    => ipcRenderer.invoke("db:getPalmari"),
  savePalmare:     (p)   => ipcRenderer.invoke("db:savePalmare",     p),
  deletePalmare:   (id)  => ipcRenderer.invoke("db:deletePalmare",   id),

  // ── Codici Autisti ─────────────────────────────────────────────────────────
  getCodAutisti:    ()   => ipcRenderer.invoke("db:getCodAutisti"),
  saveCodAutista:   (a)  => ipcRenderer.invoke("db:saveCodAutista",   a),
  deleteCodAutista: (id) => ipcRenderer.invoke("db:deleteCodAutista", id),

  // ── Ricariche ──────────────────────────────────────────────────────────────
  getRicariche:    ()     => ipcRenderer.invoke("db:getRicariche"),
  saveRicariche:   (data) => ipcRenderer.invoke("db:saveRicariche",  data),

  // ── Settings generici ──────────────────────────────────────────────────────
  getSettings:     (key)        => ipcRenderer.invoke("db:getSettings",  key),
  saveSettings:    (key, value) => ipcRenderer.invoke("db:saveSettings", key, value),

  // ── Percorso DB ────────────────────────────────────────────────────────────
  getDbPath:       ()    => ipcRenderer.invoke("db:getDbPath"),
  changeDbPath:    ()    => ipcRenderer.invoke("db:changeDbPath"),

});
