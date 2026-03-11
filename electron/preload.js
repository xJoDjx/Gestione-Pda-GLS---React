const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // ── Padroncini ────────────────────────────────────────────────────────────
  getPadroncini:    ()  => ipcRenderer.invoke("get-padroncini"),
  savePadroncino:   (p) => ipcRenderer.invoke("save-padroncino",  p),
  deletePadroncino: (id)=> ipcRenderer.invoke("delete-padroncino",id),

  // ── Conteggi ──────────────────────────────────────────────────────────────
  getConteggi:      ()  => ipcRenderer.invoke("get-conteggi"),
  saveConteggio:    (c) => ipcRenderer.invoke("save-conteggio",   c),
  deleteConteggio:  (pid, mese, anno) => ipcRenderer.invoke("delete-conteggio", pid, mese, anno),

  // ── Mezzi ─────────────────────────────────────────────────────────────────
  getMezzi:         ()  => ipcRenderer.invoke("get-mezzi"),
  saveMezzo:        (m) => ipcRenderer.invoke("save-mezzo",       m),
  deleteMezzo:      (id)=> ipcRenderer.invoke("delete-mezzo",     id),

  // ── Palmari ───────────────────────────────────────────────────────────────
  getPalmari:       ()  => ipcRenderer.invoke("get-palmari"),
  savePalmare:      (p) => ipcRenderer.invoke("save-palmare",     p),
  deletePalmare:    (id)=> ipcRenderer.invoke("delete-palmare",   id),

  // ── Cod Autisti ───────────────────────────────────────────────────────────
  getCodAutisti:    ()  => ipcRenderer.invoke("get-cod-autisti"),
  saveCodAutista:   (a) => ipcRenderer.invoke("save-cod-autista", a),
  deleteCodAutista: (id)=> ipcRenderer.invoke("delete-cod-autista",id),

  // ── Ricariche ─────────────────────────────────────────────────────────────
  getRicariche:          (mese, anno) => ipcRenderer.invoke("get-ricariche", mese, anno),
  saveRicaricheMese:     (mese, anno, data) => ipcRenderer.invoke("save-ricariche-mese", mese, anno, data),

  // ── Impostazioni ──────────────────────────────────────────────────────────
  getSetting:       (k)     => ipcRenderer.invoke("get-setting",   k),
  setSetting:       (k, v)  => ipcRenderer.invoke("set-setting",   k, v),
  getDbPath:        ()      => ipcRenderer.invoke("get-db-path"),
  changeDbPath:     ()      => ipcRenderer.invoke("change-db-path"), 

  // ── Log Storico Globale ────────────────────────────────────────────────────
  saveLogEntry:  (entry)  => ipcRenderer.invoke("save-log-entry",  entry),
  getLogEntries: ()       => ipcRenderer.invoke("get-log-entries"),

  // ── File system ───────────────────────────────────────────────────────────
  // BUG 4 FIX: apri file con app nativa del SO (PDF con Adobe, immagini con Foto, ecc.)
  openFile:   (data, nome) => ipcRenderer.invoke("open-file",  { data, nome }),
  // Salva file su disco tramite dialog "Salva con nome"
  saveFile:   (data, nome) => ipcRenderer.invoke("save-file",  { data, nome }),
});
