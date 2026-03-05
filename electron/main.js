// ═══════════════════════════════════════════════════════════════════════════════
// main.js  —  Electron main process
// ═══════════════════════════════════════════════════════════════════════════════

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path  = require("path");
const fs    = require("fs");

// ─── SETTINGS STORE ──────────────────────────────────────────────────────────
// Salva in %APPDATA%/<appName>/gls-settings.json
// init() è lazy: viene chiamato sempre dopo app.whenReady()
const store = (() => {
  let _data = null;
  let _file = null;

  const init = () => {
    if (_file) return;
    _file = path.join(app.getPath("userData"), "gls-settings.json");
    try { _data = JSON.parse(fs.readFileSync(_file, "utf8")); }
    catch { _data = {}; }
  };

  return {
    get: (key)        => { init(); return _data[key]; },
    set: (key, value) => {
      init();
      _data[key] = value;
      try { fs.writeFileSync(_file, JSON.stringify(_data, null, 2), "utf8"); }
      catch (e) { console.error("[store] write error:", e); }
    },
  };
})();

// ─── PERCORSO DATABASE ───────────────────────────────────────────────────────
function getDbPath() {
  const custom = store.get("dbPath");
  // FIX: non usare fs.existsSync → SQLite crea il file se non esiste.
  // Se il path custom è salvato usarlo sempre (funziona anche su cartelle di rete).
  if (custom && typeof custom === "string" && custom.trim() !== "") return custom;
  return path.join(app.getPath("userData"), "gls_padroncini.db");
}

// ─── CONNESSIONE SQLITE ──────────────────────────────────────────────────────
let db = null;

function openDb() {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const Database = require("better-sqlite3");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations();
  return db;
}

// ─── MIGRAZIONI ──────────────────────────────────────────────────────────────
function addColumnIfMissing(table, column, definition) {
  const cols = db.pragma(`table_info(${table})`).map(r => r.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function runMigrations() {

  db.exec(`CREATE TABLE IF NOT EXISTS padroncini (
    id                           TEXT PRIMARY KEY,
    nome                         TEXT,
    codice                       TEXT,
    stato                        TEXT DEFAULT 'ATTIVO',
    durc_scadenza                TEXT,
    durc_stato                   TEXT DEFAULT 'NON PRESENTE',
    fatturato_totale             REAL DEFAULT 0,
    palmari                      TEXT DEFAULT '[]',
    mezzi                        TEXT DEFAULT '[]',
    codici_autisti               TEXT DEFAULT '[]',
    fatturato_template           TEXT DEFAULT '[]',
    note_varie                   TEXT DEFAULT '',
    dvr                          TEXT DEFAULT '',
    dvr_stato                    TEXT DEFAULT 'NON PRESENTE',
    dvr_scadenza                 TEXT,
    doc_contratto                TEXT,
    doc_durc                     TEXT,
    doc_dvr                      TEXT,
    cronologia                   TEXT DEFAULT '[]',
    predefinite_fatturato        TEXT DEFAULT '[]',
    predefinite_altri_fatturato  TEXT DEFAULT '[]',
    predefinite_altri_addebiti   TEXT DEFAULT '[]',
    partita_iva                  TEXT DEFAULT '',
    codice_fiscale               TEXT DEFAULT '',
    telefono                     TEXT DEFAULT '',
    email                        TEXT DEFAULT '',
    sede_legale                  TEXT DEFAULT '',
    via_sede_legale              TEXT DEFAULT '',
    rappresentante               TEXT DEFAULT '',
    visura_doc                   TEXT,
    contratto_doc                TEXT,
    durc_doc                     TEXT,
    dvr_doc                      TEXT,
    created_at                   TEXT DEFAULT (datetime('now')),
    updated_at                   TEXT DEFAULT (datetime('now'))
  )`);
  [["dvr_stato","TEXT DEFAULT 'NON PRESENTE'"],["dvr_scadenza","TEXT"],["doc_contratto","TEXT"],
   ["doc_durc","TEXT"],["doc_dvr","TEXT"],["cronologia","TEXT DEFAULT '[]'"],
   ["predefinite_fatturato","TEXT DEFAULT '[]'"],["predefinite_altri_fatturato","TEXT DEFAULT '[]'"],
   ["predefinite_altri_addebiti","TEXT DEFAULT '[]'"],["partita_iva","TEXT DEFAULT ''"],
   ["codice_fiscale","TEXT DEFAULT ''"],["telefono","TEXT DEFAULT ''"],["email","TEXT DEFAULT ''"],
   ["sede_legale","TEXT DEFAULT ''"],["via_sede_legale","TEXT DEFAULT ''"],["rappresentante","TEXT DEFAULT ''"],
   ["visura_doc","TEXT"],["contratto_doc","TEXT"],["durc_doc","TEXT"],["dvr_doc","TEXT"],
  ].forEach(([c,d]) => addColumnIfMissing("padroncini", c, d));

  db.exec(`CREATE TABLE IF NOT EXISTS conteggi (
    id                           INTEGER PRIMARY KEY AUTOINCREMENT,
    padroncino_id                TEXT,
    mese                         TEXT,
    anno                         INTEGER,
    fisso_mensile                REAL DEFAULT 0,
    totale_spedizioni            REAL DEFAULT 0,
    totale_ritiri                REAL DEFAULT 0,
    totale_ritiri_fissi          REAL DEFAULT 0,
    consegne_doppie              REAL DEFAULT 0,
    consegne_extra               REAL DEFAULT 0,
    sforamento_rientri           REAL DEFAULT 0,
    compensazioni_imponibile     REAL DEFAULT 0,
    altri_fatturato              TEXT DEFAULT '[]',
    voci_fatturato               TEXT DEFAULT '[]',
    totale_imponibile            REAL DEFAULT 0,
    iva                          REAL DEFAULT 0,
    totale_fattura               REAL DEFAULT 0,
    acconto_fattura              REAL DEFAULT 0,
    addebiti_palmari             REAL DEFAULT 0,
    addebiti_mezzi               REAL DEFAULT 0,
    addebiti_ricariche           REAL DEFAULT 0,
    ricariche_mezzi              TEXT DEFAULT '[]',
    altri_addebiti               TEXT DEFAULT '[]',
    totale_addebiti              REAL DEFAULT 0,
    bollo_addebiti               REAL DEFAULT 0,
    compensazioni_distribuzione  REAL DEFAULT 0,
    fatture_fine_mese            TEXT DEFAULT '[]',
    cassa_prima_nota             TEXT DEFAULT '[]',
    totale_da_bonificare         REAL DEFAULT 0,
    note_varie                   TEXT DEFAULT '',
    dettagli_mezzi               TEXT DEFAULT '[]',
    n_palmari                    INTEGER DEFAULT 0,
    distrib_inviata              INTEGER DEFAULT 0,
    pdf_addeb                    INTEGER DEFAULT 0,
    fattura_ricevuta             INTEGER DEFAULT 0,
    fatt_tu_creata               INTEGER DEFAULT 0,
    unione_pdf                   INTEGER DEFAULT 0,
    caricata_scadenziario        INTEGER DEFAULT 0,
    note_spedizioni              TEXT DEFAULT '',
    note_proforma                TEXT DEFAULT '',
    predefinite_loaded           INTEGER DEFAULT 0,
    ops_mese                     TEXT DEFAULT '[]',
    created_at                   TEXT DEFAULT (datetime('now')),
    updated_at                   TEXT DEFAULT (datetime('now')),
    UNIQUE(padroncino_id, mese, anno)
  )`);
  [["ops_mese","TEXT DEFAULT '[]'"],["ricariche_mezzi","TEXT DEFAULT '[]'"],["bollo_addebiti","REAL DEFAULT 0"],
   ["voci_fatturato","TEXT DEFAULT '[]'"],["dettagli_mezzi","TEXT DEFAULT '[]'"],
   ["n_palmari","INTEGER DEFAULT 0"],["note_spedizioni","TEXT DEFAULT ''"],
   ["note_proforma","TEXT DEFAULT ''"],["predefinite_loaded","INTEGER DEFAULT 0"],
  ].forEach(([c,d]) => addColumnIfMissing("conteggi", c, d));

  db.exec(`CREATE TABLE IF NOT EXISTS mezzi_flotta (
    id                         TEXT PRIMARY KEY,
    targa                      TEXT,
    tipo                       TEXT,
    marca                      TEXT,
    modello                    TEXT,
    alimentazione              TEXT DEFAULT 'Diesel',
    categoria                  TEXT DEFAULT 'DISTRIBUZIONE',
    tipo_cassone               TEXT,
    colore                     TEXT,
    anno_imm                   TEXT,
    portata_kg                 REAL,
    volume_m3                  REAL,
    stato                      TEXT DEFAULT 'DISPONIBILE',
    autista                    TEXT,
    padroncino_id              TEXT,
    tariffa_mensile            REAL DEFAULT 0,
    canone_noleggio            REAL DEFAULT 0,
    rata_noleggio              REAL DEFAULT 0,
    maggiorazione_ricarica_pct REAL,
    scad_assicurazione         TEXT,
    scad_revisione             TEXT,
    scad_bollo                 TEXT,
    scad_tachigrafo            TEXT,
    proprietario               TEXT,
    n_contratto                TEXT,
    data_inizio                TEXT,
    data_fine                  TEXT,
    limitazioni_km             REAL,
    km_attuale                 REAL,
    km_data                    TEXT,
    targa_rimorchio            TEXT,
    note_veicolo               TEXT,
    documenti                  TEXT DEFAULT '[]',
    storico                    TEXT DEFAULT '[]',
    created_at                 TEXT DEFAULT (datetime('now')),
    updated_at                 TEXT DEFAULT (datetime('now'))
  )`);
  [["documenti","TEXT DEFAULT '[]'"],["storico","TEXT DEFAULT '[]'"],
   ["categoria","TEXT DEFAULT 'DISTRIBUZIONE'"],["tariffa_mensile","REAL DEFAULT 0"],
   ["maggiorazione_ricarica_pct","REAL"],
  ].forEach(([c,d]) => addColumnIfMissing("mezzi_flotta", c, d));

  db.exec(`CREATE TABLE IF NOT EXISTS palmari_flotta (
    id                TEXT PRIMARY KEY,
    seriale           TEXT,
    modello           TEXT DEFAULT '',
    modello_custom    TEXT DEFAULT '',
    stato             TEXT DEFAULT 'DISPONIBILE',
    padroncino_id     TEXT DEFAULT '',
    tariffa_mensile   REAL DEFAULT 0,
    data_assegnazione TEXT DEFAULT '',
    data_fine         TEXT DEFAULT '',
    note              TEXT DEFAULT '',
    storico           TEXT DEFAULT '[]',
    documenti         TEXT DEFAULT '[]',
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
  )`);
  [["storico","TEXT DEFAULT '[]'"],["documenti","TEXT DEFAULT '[]'"],
   ["padroncino_id","TEXT DEFAULT ''"],["data_assegnazione","TEXT DEFAULT ''"],
   ["data_fine","TEXT DEFAULT ''"],["note","TEXT DEFAULT ''"],
   ["modello_custom","TEXT DEFAULT ''"],
  ].forEach(([c,d]) => addColumnIfMissing("palmari_flotta", c, d));


  db.exec(`CREATE TABLE IF NOT EXISTS cod_autisti (
    id            TEXT PRIMARY KEY,
    codice        TEXT DEFAULT '',
    stato         TEXT DEFAULT 'DISPONIBILE',
    padroncino_id TEXT DEFAULT '',
    note          TEXT DEFAULT '',
    storico       TEXT DEFAULT '[]',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  )`);
  [
    ["codice",        "TEXT DEFAULT ''"],
    ["stato",         "TEXT DEFAULT 'DISPONIBILE'"],
    ["padroncino_id", "TEXT DEFAULT ''"],
    ["note",          "TEXT DEFAULT ''"],
    ["storico",       "TEXT DEFAULT '[]'"],
  ].forEach(([c,d]) => addColumnIfMissing("cod_autisti", c, d));

  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
}


// ─── JSON HELPERS ─────────────────────────────────────────────────────────────
const JSON_FIELDS_PADRONCINI = [
  "palmari","mezzi","codici_autisti","fatturato_template","cronologia",
  "doc_contratto","doc_durc","doc_dvr",
  "contratto_doc","durc_doc","dvr_doc","visura_doc",
  "predefinite_fatturato","predefinite_altri_fatturato","predefinite_altri_addebiti",
];
const JSON_FIELDS_CONTEGGI = [
  "altri_fatturato","voci_fatturato","ricariche_mezzi","ops_mese",
  "altri_addebiti","fatture_fine_mese","cassa_prima_nota","dettagli_mezzi",
];
const JSON_FIELDS_MEZZI    = ["documenti","storico"];
const JSON_FIELDS_PALMARI  = ["documenti","storico"];
const JSON_FIELDS_COD_AUTISTI = ["storico"];

function parseRow(row, jsonFields) {
  if (!row) return null;
  const out = { ...row };
  for (const f of jsonFields) {
    if (out[f] !== undefined && out[f] !== null) {
      try { out[f] = typeof out[f] === "string" ? JSON.parse(out[f]) : out[f]; }
      catch { out[f] = []; }
    }
  }
  for (const k of ["distrib_inviata","pdf_addeb","fattura_ricevuta","fatt_tu_creata","unione_pdf","caricata_scadenziario"]) {
    if (out[k] !== undefined) out[k] = !!out[k];
  }
  return out;
}

function stringifyForDb(obj, jsonFields) {
  const out = { ...obj };
  for (const f of jsonFields) {
    if (out[f] !== undefined)
      out[f] = typeof out[f] === "string" ? out[f] : JSON.stringify(out[f] ?? []);
  }
  return out;
}

// ─── SYNC PALMARI ↔ PADRONCINI ────────────────────────────────────────────────
// I palmari vivono in due posti: palmari_flotta (tabella) e padroncini.palmari (JSON).
// Queste due funzioni li mantengono sempre allineati.

// Dopo upsertPalmare: aggiorna il JSON embedded nel padroncino
function syncFlottaToPadroncino(pal) {
  const seriale = pal.seriale;
  if (!seriale) return;

  // Rimuovi questo seriale da TUTTI i padroncini (potrebbe essere stato riassegnato)
  for (const pad of db.prepare("SELECT id, palmari FROM padroncini").all()) {
    let arr = [];
    try { arr = JSON.parse(pad.palmari || "[]"); } catch {}
    const prima = arr.length;
    arr = arr.filter(p => p.seriale !== seriale);
    if (arr.length !== prima)
      db.prepare("UPDATE padroncini SET palmari=?, updated_at=? WHERE id=?")
        .run(JSON.stringify(arr), new Date().toISOString(), pad.id);
  }

  // Se ora ha un padroncino, aggiungilo al suo embedded
  const pid = pal.padroncino_id;
  if (!pid || pid === "") return;
  const pad = db.prepare("SELECT id, palmari FROM padroncini WHERE id=?").get(pid);
  if (!pad) return;
  let arr = [];
  try { arr = JSON.parse(pad.palmari || "[]"); } catch {}
  const idx = arr.findIndex(p => p.seriale === seriale);
  const entry = {
    seriale,
    codice_associato: arr[idx]?.codice_associato || "",
    stato:            "ATTIVO",
    data_inizio:      pal.data_assegnazione || arr[idx]?.data_inizio || "",
    data_fine:        pal.data_fine         || arr[idx]?.data_fine   || "",
    tariffa_mensile:  pal.tariffa_mensile   || 0,
    note:             pal.note              || "",
  };
  if (idx >= 0) arr[idx] = entry; else arr.push(entry);
  db.prepare("UPDATE padroncini SET palmari=?, updated_at=? WHERE id=?")
    .run(JSON.stringify(arr), new Date().toISOString(), pid);
}

// Dopo upsertPadroncino: aggiorna palmari_flotta dai palmari embedded
function syncPadroncinoToFlotta(padroncino) {
  if (!padroncino?.id) return;
  let arr = [];
  try {
    arr = Array.isArray(padroncino.palmari)
      ? padroncino.palmari
      : JSON.parse(padroncino.palmari || "[]");
  } catch {}

  // Disassocia tutti i palmari già assegnati a questo padroncino in flotta
  db.prepare("UPDATE palmari_flotta SET padroncino_id='', stato='DISPONIBILE', updated_at=? WHERE padroncino_id=?")
    .run(new Date().toISOString(), padroncino.id);

  // Riassocia quelli nell'embedded
  for (const p of arr) {
    if (!p.seriale) continue;
    const ex = db.prepare("SELECT id FROM palmari_flotta WHERE seriale=?").get(p.seriale);
    if (ex) {
      db.prepare(`UPDATE palmari_flotta SET padroncino_id=?, stato='ASSEGNATO',
        tariffa_mensile=?, data_assegnazione=?, data_fine=?, updated_at=? WHERE seriale=?`)
        .run(padroncino.id, p.tariffa_mensile||0, p.data_inizio||"", p.data_fine||"",
          new Date().toISOString(), p.seriale);
    } else {
      const t = new Date().toISOString();
      db.prepare(`INSERT INTO palmari_flotta
        (id,seriale,stato,padroncino_id,tariffa_mensile,data_assegnazione,data_fine,note,storico,documenti,created_at,updated_at)
        VALUES (?,?,'ASSEGNATO',?,?,?,?,?,'[]','[]',?,?)`)
        .run("PALM_"+Date.now()+"_"+Math.random().toString(36).slice(2,6),
          p.seriale, padroncino.id, p.tariffa_mensile||0,
          p.data_inizio||"", p.data_fine||"", p.note||"", t, t);
    }
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function getAllPadroncini() {
  return db.prepare("SELECT * FROM padroncini ORDER BY nome").all()
    .map(r => parseRow(r, JSON_FIELDS_PADRONCINI));
}

function upsertPadroncino(p) {
  const row = stringifyForDb({ ...p, updated_at: new Date().toISOString() }, JSON_FIELDS_PADRONCINI);
  const cols = Object.keys(row).filter(k => k !== "id");
  db.prepare(`INSERT INTO padroncini (id,${cols.join(",")}) VALUES (@id,${cols.map(c=>"@"+c).join(",")})
    ON CONFLICT(id) DO UPDATE SET ${cols.map(c=>`${c}=excluded.${c}`).join(",\n")}`).run(row);
  try { syncPadroncinoToFlotta(p); } catch(e) { console.error("[sync pad→flotta]", e.message); }
}

function deletePadroncino(id) {
  db.prepare("UPDATE palmari_flotta SET padroncino_id='', stato='DISPONIBILE', updated_at=? WHERE padroncino_id=?")
    .run(new Date().toISOString(), id);
  db.prepare("DELETE FROM padroncini WHERE id=?").run(id);
  db.prepare("DELETE FROM conteggi WHERE padroncino_id=?").run(id);
}

function getAllConteggi() {
  return db.prepare("SELECT * FROM conteggi ORDER BY anno DESC, mese").all()
    .map(r => parseRow(r, JSON_FIELDS_CONTEGGI));
}

function upsertConteggio(c) {
  const row = stringifyForDb({ ...c, updated_at: new Date().toISOString() }, JSON_FIELDS_CONTEGGI);
  for (const k of ["distrib_inviata","pdf_addeb","fattura_ricevuta","fatt_tu_creata","unione_pdf","caricata_scadenziario"])
    if (row[k] !== undefined) row[k] = row[k] ? 1 : 0;
  if (!row.id) delete row.id;
  const cols = Object.keys(row);
  db.prepare(`INSERT INTO conteggi (${cols.join(",")}) VALUES (${cols.map(c=>"@"+c).join(",")})
    ON CONFLICT(padroncino_id,mese,anno) DO UPDATE SET
    ${cols.filter(c=>!["padroncino_id","mese","anno","id"].includes(c)).map(c=>`${c}=excluded.${c}`).join(",\n")}`).run(row);
}

function deleteConteggio(padroncino_id, mese, anno) {
  db.prepare("DELETE FROM conteggi WHERE padroncino_id=? AND mese=? AND anno=?").run(padroncino_id, mese, anno);
}

function getAllMezzi() {
  return db.prepare("SELECT * FROM mezzi_flotta ORDER BY targa").all()
    .map(r => parseRow(r, JSON_FIELDS_MEZZI));
}

function upsertMezzo(m) {
  const row = stringifyForDb({ ...m, updated_at: new Date().toISOString() }, JSON_FIELDS_MEZZI);
  const cols = Object.keys(row).filter(k => k !== "id");
  db.prepare(`INSERT INTO mezzi_flotta (id,${cols.join(",")}) VALUES (@id,${cols.map(c=>"@"+c).join(",")})
    ON CONFLICT(id) DO UPDATE SET ${cols.map(c=>`${c}=excluded.${c}`).join(",\n")}`).run(row);
}

function deleteMezzo(id) { db.prepare("DELETE FROM mezzi_flotta WHERE id=?").run(id); }

function getAllPalmari() {
  return db.prepare("SELECT * FROM palmari_flotta ORDER BY seriale").all()
    .map(r => parseRow(r, JSON_FIELDS_PALMARI));
}

function upsertPalmare(p) {
  // Auto-stato coerente con l'assegnazione
  const stato = (p.padroncino_id && p.padroncino_id !== "")
    ? "ASSEGNATO"
    : (p.stato === "ASSEGNATO" ? "DISPONIBILE" : (p.stato || "DISPONIBILE"));
  const withStato = { ...p, stato };
  const row = stringifyForDb({ ...withStato, updated_at: new Date().toISOString() }, JSON_FIELDS_PALMARI);
  const cols = Object.keys(row).filter(k => k !== "id");
  db.prepare(`INSERT INTO palmari_flotta (id,${cols.join(",")}) VALUES (@id,${cols.map(c=>"@"+c).join(",")})
    ON CONFLICT(id) DO UPDATE SET ${cols.map(c=>`${c}=excluded.${c}`).join(",\n")}`).run(row);
  try { syncFlottaToPadroncino(withStato); } catch(e) { console.error("[sync flotta→pad]", e.message); }
}

function deletePalmare(id) {
  const pal = db.prepare("SELECT * FROM palmari_flotta WHERE id=?").get(id);
  if (pal?.padroncino_id && pal.padroncino_id !== "") {
    const pad = db.prepare("SELECT id, palmari FROM padroncini WHERE id=?").get(pal.padroncino_id);
    if (pad) {
      let arr = [];
      try { arr = JSON.parse(pad.palmari || "[]"); } catch {}
      arr = arr.filter(p => p.seriale !== pal.seriale);
      db.prepare("UPDATE padroncini SET palmari=?, updated_at=? WHERE id=?")
        .run(JSON.stringify(arr), new Date().toISOString(), pad.id);
    }
  }
  db.prepare("DELETE FROM palmari_flotta WHERE id=?").run(id);
}

function getAllCodAutisti() {
  return db.prepare("SELECT * FROM cod_autisti ORDER BY codice").all()
    .map(r => parseRow(r, JSON_FIELDS_COD_AUTISTI));
}

function upsertCodAutista(a) {
  const stato = (a.padroncino_id && a.padroncino_id !== "")
    ? (a.stato === "DISPONIBILE" ? "ASSEGNATO" : (a.stato || "ASSEGNATO"))
    : (a.stato === "ASSEGNATO" ? "DISPONIBILE" : (a.stato || "DISPONIBILE"));
  const withStato = { ...a, stato };
  const row = stringifyForDb({ ...withStato, updated_at: new Date().toISOString() }, JSON_FIELDS_COD_AUTISTI);
  const cols = Object.keys(row).filter(k => k !== "id");
  db.prepare(`INSERT INTO cod_autisti (id,${cols.join(",")}) VALUES (@id,${cols.map(c=>"@"+c).join(",")})
    ON CONFLICT(id) DO UPDATE SET ${cols.map(c=>`${c}=excluded.${c}`).join(",\n")}`).run(row);
}

function deleteCodAutistaDb(id) {
  db.prepare("DELETE FROM cod_autisti WHERE id=?").run(id);
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key=?").get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(key, value);
}
function getRicariche() {
  try { return JSON.parse(getSetting("ricariche") || "{}"); } catch { return {}; }
}
function saveRicariche(data) { setSetting("ricariche", JSON.stringify(data)); }

// ─── WINDOW ───────────────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const isDev = process.env.NODE_ENV === "development" || process.env.ELECTRON_DEV === "1";
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
  }
}

// ─── IPC ──────────────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  ipcMain.handle("db:getPadroncini",    ()      => getAllPadroncini());
  ipcMain.handle("db:savePadroncino",   (_,p)   => { upsertPadroncino(p); return {ok:true}; });
  ipcMain.handle("db:deletePadroncino", (_,id)  => { deletePadroncino(id); return {ok:true}; });

  ipcMain.handle("db:getConteggi",      ()      => getAllConteggi());
  ipcMain.handle("db:saveConteggio",    (_,c)   => { upsertConteggio(c); return {ok:true}; });
  ipcMain.handle("db:deleteConteggio",  (_,{padroncino_id,mese,anno}) => {
    deleteConteggio(padroncino_id,mese,anno); return {ok:true};
  });

  ipcMain.handle("db:getMezzi",         ()      => getAllMezzi());
  ipcMain.handle("db:saveMezzo",        (_,m)   => { upsertMezzo(m); return {ok:true}; });
  ipcMain.handle("db:deleteMezzo",      (_,id)  => { deleteMezzo(id); return {ok:true}; });

  ipcMain.handle("db:getPalmari",       ()      => getAllPalmari());
  ipcMain.handle("db:savePalmare",      (_,p)   => { upsertPalmare(p); return {ok:true}; });
  ipcMain.handle("db:deletePalmare",    (_,id)  => { deletePalmare(id); return {ok:true}; });

  ipcMain.handle("db:getCodAutisti",    ()     => getAllCodAutisti());
  ipcMain.handle("db:saveCodAutista",   (_,a)  => { upsertCodAutista(a); return {ok:true}; });
  ipcMain.handle("db:deleteCodAutista", (_,id) => { deleteCodAutistaDb(id); return {ok:true}; });

  ipcMain.handle("db:getRicariche",     ()          => getRicariche());
  ipcMain.handle("db:saveRicariche",    (_,data)    => { saveRicariche(data); return {ok:true}; });
  ipcMain.handle("db:getSettings",      (_,key)     => getSetting(key));
  ipcMain.handle("db:saveSettings",     (_,key,val) => { setSetting(key,val); return {ok:true}; });
  ipcMain.handle("db:getDbPath",        ()          => getDbPath());

  ipcMain.handle("db:changeDbPath", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Seleziona cartella database",
      properties: ["openDirectory"],
      buttonLabel: "Usa questa cartella",
    });
    if (result.canceled || !result.filePaths.length) return null;

    const newPath = path.join(result.filePaths[0], "gls_padroncini.db");
    const oldPath = getDbPath();

    // Copia il DB corrente nella nuova cartella
    if (oldPath !== newPath) {
      try {
        if (db) { db.close(); db = null; }
        if (fs.existsSync(oldPath)) {
          fs.copyFileSync(oldPath, newPath);
          console.log(`[db] Copiato: ${oldPath} → ${newPath}`);
        }
      } catch(e) { console.error("[db] Errore copia:", e); }
    }

    // Salva il path PRIMA di aprire il DB (così getDbPath() lo usa subito)
    store.set("dbPath", newPath);
    openDb();
    return newPath;
  });
}

// ─── LIFECYCLE ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  openDb();
  registerIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (db) db.close();
  if (process.platform !== "darwin") app.quit();
});
