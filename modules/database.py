#!/usr/bin/env python3
"""
database.py — GLS Gestione Padroncini
Modulo database completo con supporto per tutti i campi dell'app React.

Gestisce automaticamente la migrazione del DB ad ogni avvio:
aggiunge colonne mancanti e crea le tabelle mancanti senza perdita di dati.
"""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path

# ─── PATH DATABASE ────────────────────────────────────────────────────────────
DB_PATH = os.environ.get("GLS_DB_PATH", str(Path(__file__).parent / "gls_padroncini.db"))


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ─── MIGRAZIONE AUTOMATICA ────────────────────────────────────────────────────
# Chiamata ad ogni avvio: aggiunge colonne/tabelle mancanti senza perdere dati.

PADRONCINI_COLS = [
    # Colonne originali (non aggiunte se già esistono)
    ("id",                           "TEXT PRIMARY KEY"),
    ("nome",                         "TEXT NOT NULL DEFAULT ''"),
    ("codice",                       "TEXT DEFAULT ''"),
    ("stato",                        "TEXT DEFAULT 'ATTIVO'"),
    ("durc_scadenza",                "TEXT DEFAULT ''"),
    ("durc_stato",                   "TEXT DEFAULT ''"),
    ("dvr_stato",                    "TEXT DEFAULT ''"),
    ("dvr_scadenza",                 "TEXT DEFAULT ''"),
    ("fatturato_totale",             "REAL DEFAULT 0"),
    ("note_varie",                   "TEXT DEFAULT ''"),
    ("cronologia",                   "TEXT DEFAULT '[]'"),
    ("created_at",                   "TEXT DEFAULT ''"),
    ("updated_at",                   "TEXT DEFAULT ''"),
    # Campi JSON (array/oggetti serializzati)
    ("palmari",                      "TEXT DEFAULT '[]'"),
    ("mezzi",                        "TEXT DEFAULT '[]'"),
    ("codici_autisti",               "TEXT DEFAULT '[]'"),
    ("fatturato_template",           "TEXT DEFAULT '[]'"),
    # Documenti legacy
    ("dvr",                          "TEXT DEFAULT ''"),
    ("doc_contratto",                "TEXT DEFAULT NULL"),
    ("doc_durc",                     "TEXT DEFAULT NULL"),
    ("doc_dvr",                      "TEXT DEFAULT NULL"),
    # ── NUOVI CAMPI (aggiunti dalla app React) ──
    ("partita_iva",                  "TEXT DEFAULT ''"),
    ("codice_fiscale",               "TEXT DEFAULT ''"),
    ("telefono",                     "TEXT DEFAULT ''"),
    ("email",                        "TEXT DEFAULT ''"),
    ("sede_legale",                  "TEXT DEFAULT ''"),
    ("via_sede_legale",              "TEXT DEFAULT ''"),
    ("rappresentante",               "TEXT DEFAULT ''"),
    ("visura_doc",                   "TEXT DEFAULT NULL"),
    ("contratto_doc",                "TEXT DEFAULT NULL"),
    ("durc_doc",                     "TEXT DEFAULT NULL"),
    ("dvr_doc",                      "TEXT DEFAULT NULL"),
    ("predefinite_fatturato",        "TEXT DEFAULT '[]'"),
    ("predefinite_altri_fatturato",  "TEXT DEFAULT '[]'"),
    ("predefinite_altri_addebiti",   "TEXT DEFAULT '[]'"),
]

MEZZI_FLOTTA_COLS = [
    ("id",                           "TEXT PRIMARY KEY"),
    ("targa",                        "TEXT DEFAULT ''"),
    ("tipo",                         "TEXT DEFAULT ''"),
    ("marca",                        "TEXT DEFAULT ''"),
    ("modello",                      "TEXT DEFAULT ''"),
    ("alimentazione",                "TEXT DEFAULT ''"),
    ("tipo_cassone",                 "TEXT DEFAULT ''"),
    ("colore",                       "TEXT DEFAULT ''"),
    ("anno_imm",                     "TEXT DEFAULT ''"),
    ("portata_kg",                   "REAL DEFAULT 0"),
    ("volume_m3",                    "REAL DEFAULT 0"),
    ("stato",                        "TEXT DEFAULT 'DISPONIBILE'"),
    ("autista",                      "TEXT DEFAULT ''"),
    ("padroncino_id",                "TEXT DEFAULT NULL"),
    ("scad_assicurazione",           "TEXT DEFAULT ''"),
    ("scad_revisione",               "TEXT DEFAULT ''"),
    ("scad_bollo",                   "TEXT DEFAULT ''"),
    ("scad_tachigrafo",              "TEXT DEFAULT ''"),
    ("proprietario",                 "TEXT DEFAULT ''"),
    ("n_contratto",                  "TEXT DEFAULT ''"),
    ("data_inizio",                  "TEXT DEFAULT ''"),
    ("data_fine",                    "TEXT DEFAULT ''"),
    ("canone_noleggio",              "REAL DEFAULT 0"),
    ("rata_noleggio",                "REAL DEFAULT 0"),
    ("limitazioni_km",               "REAL DEFAULT 0"),
    ("km_attuale",                   "REAL DEFAULT 0"),
    ("km_data",                      "TEXT DEFAULT ''"),
    ("targa_rimorchio",              "TEXT DEFAULT ''"),
    ("note_veicolo",                 "TEXT DEFAULT ''"),
    ("created_at",                   "TEXT DEFAULT ''"),
    ("updated_at",                   "TEXT DEFAULT ''"),
    # ── NUOVI CAMPI ──
    ("categoria",                    "TEXT DEFAULT 'DISTRIBUZIONE'"),
    ("maggiorazione_ricarica_pct",   "REAL DEFAULT 0"),
    ("documenti",                    "TEXT DEFAULT '[]'"),
    ("storico",                      "TEXT DEFAULT '[]'"),
    ("tipologia",                    "TEXT DEFAULT ''"),
]

PALMARI_FLOTTA_COLS = [
    ("id",                  "TEXT PRIMARY KEY"),
    ("seriale",             "TEXT NOT NULL DEFAULT ''"),
    ("modello",             "TEXT DEFAULT ''"),
    ("stato",               "TEXT DEFAULT 'DISPONIBILE'"),
    ("padroncino_id",       "TEXT DEFAULT NULL"),
    ("tariffa_mensile",     "REAL DEFAULT 0"),
    ("tariffa_gg_solari",   "REAL DEFAULT 0"),
    ("data_acquisto",       "TEXT DEFAULT ''"),
    ("data_fine",           "TEXT DEFAULT ''"),
    ("note",                "TEXT DEFAULT ''"),
    ("documenti",           "TEXT DEFAULT '[]'"),
    ("created_at",          "TEXT DEFAULT ''"),
    ("updated_at",          "TEXT DEFAULT ''"),
]

CONTEGGI_COLS = [
    ("id",                           "INTEGER PRIMARY KEY AUTOINCREMENT"),
    ("padroncino_id",                "TEXT NOT NULL DEFAULT ''"),
    ("mese",                         "TEXT NOT NULL DEFAULT ''"),
    ("anno",                         "INTEGER NOT NULL DEFAULT 0"),
    ("fisso_mensile",                "REAL DEFAULT 0"),
    ("totale_spedizioni",            "REAL DEFAULT 0"),
    ("totale_ritiri",                "REAL DEFAULT 0"),
    ("totale_ritiri_fissi",          "REAL DEFAULT 0"),
    ("consegne_doppie",              "REAL DEFAULT 0"),
    ("consegne_extra",               "REAL DEFAULT 0"),
    ("sforamento_rientri",           "REAL DEFAULT 0"),
    ("compensazioni_imponibile",     "REAL DEFAULT 0"),
    ("altri_fatturato",              "TEXT DEFAULT '[]'"),
    ("voci_fatturato",               "TEXT DEFAULT '[]'"),
    ("totale_imponibile",            "REAL DEFAULT 0"),
    ("iva",                          "REAL DEFAULT 0"),
    ("totale_fattura",               "REAL DEFAULT 0"),
    ("acconto_fattura",              "REAL DEFAULT 0"),
    ("addebiti_palmari",             "REAL DEFAULT 0"),
    ("addebiti_mezzi",               "REAL DEFAULT 0"),
    ("addebiti_ricariche",           "REAL DEFAULT 0"),
    ("altri_addebiti",               "TEXT DEFAULT '[]'"),
    ("totale_addebiti",              "REAL DEFAULT 0"),
    ("compensazioni_distribuzione",  "REAL DEFAULT 0"),
    ("fatture_fine_mese",            "TEXT DEFAULT '[]'"),
    ("cassa_prima_nota",             "TEXT DEFAULT '[]'"),
    ("totale_da_bonificare",         "REAL DEFAULT 0"),
    ("note_varie",                   "TEXT DEFAULT ''"),
    ("dettagli_mezzi",               "TEXT DEFAULT '[]'"),
    ("ricariche_mezzi",              "TEXT DEFAULT '[]'"),
    ("n_palmari",                    "INTEGER DEFAULT 0"),
    ("distrib_inviata",              "INTEGER DEFAULT 0"),
    ("pdf_addeb",                    "INTEGER DEFAULT 0"),
    ("fattura_ricevuta",             "INTEGER DEFAULT 0"),
    ("fatt_tu_creata",               "INTEGER DEFAULT 0"),
    ("unione_pdf",                   "INTEGER DEFAULT 0"),
    ("caricata_scadenziario",        "INTEGER DEFAULT 0"),
    ("created_at",                   "TEXT DEFAULT ''"),
    ("updated_at",                   "TEXT DEFAULT ''"),
    # ── NUOVI CAMPI ──
    ("note_spedizioni",              "TEXT DEFAULT ''"),
    ("note_proforma",                "TEXT DEFAULT ''"),
    ("predefinite_loaded",           "INTEGER DEFAULT 0"),
]


def _migrate(conn):
    """Aggiunge colonne e tabelle mancanti. Idempotente."""
    c = conn.cursor()

    def add_missing_cols(table, col_defs):
        c.execute(f"PRAGMA table_info({table})")
        existing = {r[1] for r in c.fetchall()}
        for col, typ in col_defs:
            if col not in existing and "PRIMARY KEY" not in typ and "AUTOINCREMENT" not in typ:
                try:
                    c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typ}")
                except Exception as e:
                    print(f"[DB] WARN alter {table}.{col}: {e}")

    # Crea tabelle se non esistono
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS padroncini (
            {', '.join(f'{n} {t}' for n, t in PADRONCINI_COLS)}
        )
    """)
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS mezzi_flotta (
            {', '.join(f'{n} {t}' for n, t in MEZZI_FLOTTA_COLS)}
        )
    """)
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS palmari_flotta (
            {', '.join(f'{n} {t}' for n, t in PALMARI_FLOTTA_COLS)}
        )
    """)
    c.execute(f"""
        CREATE TABLE IF NOT EXISTS conteggi (
            {', '.join(f'{n} {t}' for n, t in CONTEGGI_COLS)}
        )
    """)

    # Aggiungi colonne mancanti a tabelle già esistenti
    add_missing_cols("padroncini",     PADRONCINI_COLS)
    add_missing_cols("mezzi_flotta",   MEZZI_FLOTTA_COLS)
    add_missing_cols("palmari_flotta", PALMARI_FLOTTA_COLS)
    add_missing_cols("conteggi",       CONTEGGI_COLS)

    conn.commit()


# ─── JSON helpers ─────────────────────────────────────────────────────────────
# Campi che contengono array/oggetti JSON serializzati come TEXT nel DB

PAD_JSON_FIELDS  = {"palmari", "mezzi", "codici_autisti", "fatturato_template",
                    "cronologia", "visura_doc", "contratto_doc", "durc_doc", "dvr_doc",
                    "predefinite_fatturato", "predefinite_altri_fatturato", "predefinite_altri_addebiti"}
MEZ_JSON_FIELDS  = {"documenti", "storico"}
PAL_JSON_FIELDS  = {"documenti"}
CONT_JSON_FIELDS = {"altri_fatturato", "voci_fatturato", "altri_addebiti",
                    "fatture_fine_mese", "cassa_prima_nota", "dettagli_mezzi", "ricariche_mezzi"}

CONT_BOOL_FIELDS = {"distrib_inviata", "pdf_addeb", "fattura_ricevuta",
                    "fatt_tu_creata", "unione_pdf", "caricata_scadenziario", "predefinite_loaded"}


def _row_to_dict(row, json_fields: set, bool_fields: set = None) -> dict:
    d = dict(row)
    for k in json_fields:
        if k in d and isinstance(d[k], str):
            try:
                d[k] = json.loads(d[k]) if d[k] else ([] if k not in {"visura_doc","contratto_doc","durc_doc","dvr_doc"} else None)
            except Exception:
                d[k] = []
    if bool_fields:
        for k in bool_fields:
            if k in d:
                d[k] = bool(d[k])
    return d


def _serialize_json_fields(data: dict, json_fields: set) -> dict:
    out = dict(data)
    for k in json_fields:
        if k in out and not isinstance(out[k], str):
            out[k] = json.dumps(out[k], ensure_ascii=False) if out[k] is not None else None
    return out


# ─── INIT ─────────────────────────────────────────────────────────────────────

def init_db():
    """Inizializza il DB e applica migrazione. Chiamare all'avvio dell'app."""
    with get_conn() as conn:
        _migrate(conn)


# ─── PADRONCINI ───────────────────────────────────────────────────────────────

def load_padroncini() -> list:
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        c.execute("SELECT * FROM padroncini ORDER BY nome")
        return [_row_to_dict(r, PAD_JSON_FIELDS) for r in c.fetchall()]


def get_padroncino(pid: str) -> dict | None:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM padroncini WHERE id=?", (pid,))
        row = c.fetchone()
        return _row_to_dict(row, PAD_JSON_FIELDS) if row else None


def upsert_padroncino(p: dict):
    """Salva TUTTI i campi del padroncino, inclusi quelli nuovi."""
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data = _serialize_json_fields(dict(p), PAD_JSON_FIELDS)
        data.setdefault("created_at", now)
        data["updated_at"] = now

        # Ottieni tutte le colonne presenti nella tabella
        c.execute("PRAGMA table_info(padroncini)")
        db_cols = {r[1] for r in c.fetchall()}

        # Filtra solo i campi che esistono nel DB
        filtered = {k: v for k, v in data.items() if k in db_cols}

        cols   = ", ".join(filtered.keys())
        placeh = ", ".join(["?"] * len(filtered))
        vals   = list(filtered.values())

        c.execute(
            f"INSERT INTO padroncini ({cols}) VALUES ({placeh}) "
            f"ON CONFLICT(id) DO UPDATE SET {', '.join(f'{k}=excluded.{k}' for k in filtered if k != 'id')}",
            vals
        )
        conn.commit()


def delete_padroncino(pid: str):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM padroncini WHERE id=?", (pid,))
        c.execute("DELETE FROM conteggi WHERE padroncino_id=?", (pid,))
        conn.commit()


# ─── MEZZI FLOTTA ─────────────────────────────────────────────────────────────

def load_mezzi() -> list:
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        c.execute("SELECT * FROM mezzi_flotta ORDER BY targa")
        return [_row_to_dict(r, MEZ_JSON_FIELDS) for r in c.fetchall()]


def get_mezzo(mid: str) -> dict | None:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM mezzi_flotta WHERE id=?", (mid,))
        row = c.fetchone()
        return _row_to_dict(row, MEZ_JSON_FIELDS) if row else None


def upsert_mezzo(m: dict):
    """Salva TUTTI i campi del mezzo, inclusi categoria, maggiorazione_ricarica_pct, etc."""
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data = _serialize_json_fields(dict(m), MEZ_JSON_FIELDS)
        data.setdefault("created_at", now)
        data["updated_at"] = now
        # Normalizza categoria
        if "categoria" not in data or not data["categoria"]:
            data["categoria"] = "DISTRIBUZIONE"

        c.execute("PRAGMA table_info(mezzi_flotta)")
        db_cols = {r[1] for r in c.fetchall()}
        filtered = {k: v for k, v in data.items() if k in db_cols}

        cols   = ", ".join(filtered.keys())
        placeh = ", ".join(["?"] * len(filtered))
        vals   = list(filtered.values())

        c.execute(
            f"INSERT INTO mezzi_flotta ({cols}) VALUES ({placeh}) "
            f"ON CONFLICT(id) DO UPDATE SET {', '.join(f'{k}=excluded.{k}' for k in filtered if k != 'id')}",
            vals
        )
        conn.commit()


def delete_mezzo(mid: str):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM mezzi_flotta WHERE id=?", (mid,))
        conn.commit()


# ─── PALMARI FLOTTA ───────────────────────────────────────────────────────────

def load_palmari() -> list:
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        c.execute("SELECT * FROM palmari_flotta ORDER BY seriale")
        return [_row_to_dict(r, PAL_JSON_FIELDS) for r in c.fetchall()]


def get_palmare(pid: str) -> dict | None:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM palmari_flotta WHERE id=?", (pid,))
        row = c.fetchone()
        return _row_to_dict(row, PAL_JSON_FIELDS) if row else None


def upsert_palmare(p: dict):
    """Salva palmare con stato (DISPONIBILE/ASSEGNATO) e padroncino_id."""
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data = _serialize_json_fields(dict(p), PAL_JSON_FIELDS)
        data.setdefault("created_at", now)
        data["updated_at"] = now
        if "stato" not in data or not data["stato"]:
            data["stato"] = "DISPONIBILE"

        c.execute("PRAGMA table_info(palmari_flotta)")
        db_cols = {r[1] for r in c.fetchall()}
        filtered = {k: v for k, v in data.items() if k in db_cols}

        cols   = ", ".join(filtered.keys())
        placeh = ", ".join(["?"] * len(filtered))
        vals   = list(filtered.values())

        c.execute(
            f"INSERT INTO palmari_flotta ({cols}) VALUES ({placeh}) "
            f"ON CONFLICT(id) DO UPDATE SET {', '.join(f'{k}=excluded.{k}' for k in filtered if k != 'id')}",
            vals
        )
        conn.commit()


def delete_palmare(pid: str):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM palmari_flotta WHERE id=?", (pid,))
        conn.commit()


# ─── CONTEGGI ─────────────────────────────────────────────────────────────────

def load_conteggi() -> list:
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        c.execute("SELECT * FROM conteggi ORDER BY anno DESC, mese, padroncino_id")
        return [_row_to_dict(r, CONT_JSON_FIELDS, CONT_BOOL_FIELDS) for r in c.fetchall()]


def get_conteggio(padroncino_id: str, mese: str, anno: int) -> dict | None:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT * FROM conteggi WHERE padroncino_id=? AND mese=? AND anno=?",
            (padroncino_id, mese, anno)
        )
        row = c.fetchone()
        return _row_to_dict(row, CONT_JSON_FIELDS, CONT_BOOL_FIELDS) if row else None


def upsert_conteggio(cont: dict):
    """Salva TUTTI i campi del conteggio, inclusi note_spedizioni, etc."""
    with get_conn() as conn:
        _migrate(conn)
        c = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data = _serialize_json_fields(dict(cont), CONT_JSON_FIELDS)
        data.setdefault("created_at", now)
        data["updated_at"] = now

        # Converti bool → int per SQLite
        for k in CONT_BOOL_FIELDS:
            if k in data and isinstance(data[k], bool):
                data[k] = 1 if data[k] else 0

        c.execute("PRAGMA table_info(conteggi)")
        db_cols = {r[1] for r in c.fetchall()}
        filtered = {k: v for k, v in data.items() if k in db_cols and k != "id"}

        # Check if record exists
        c.execute(
            "SELECT id FROM conteggi WHERE padroncino_id=? AND mese=? AND anno=?",
            (data["padroncino_id"], data["mese"], data["anno"])
        )
        existing = c.fetchone()

        if existing:
            set_clause = ", ".join(f"{k}=?" for k in filtered)
            c.execute(
                f"UPDATE conteggi SET {set_clause} WHERE padroncino_id=? AND mese=? AND anno=?",
                list(filtered.values()) + [data["padroncino_id"], data["mese"], data["anno"]]
            )
        else:
            cols   = ", ".join(filtered.keys())
            placeh = ", ".join(["?"] * len(filtered))
            c.execute(f"INSERT INTO conteggi ({cols}) VALUES ({placeh})", list(filtered.values()))

        conn.commit()


# ─── INIT ON IMPORT ───────────────────────────────────────────────────────────
# Assicura che il DB sia sempre aggiornato quando questo modulo viene importato
try:
    init_db()
except Exception as e:
    print(f"[DB] Warn during init: {e}")


if __name__ == "__main__":
    print("=== GLS Database Schema ===")
    with get_conn() as conn:
        for table in ["padroncini", "mezzi_flotta", "palmari_flotta", "conteggi"]:
            conn.execute(f"PRAGMA table_info({table})")  # just test
            import sqlite3 as _sq
            c2 = conn.cursor()
            c2.execute(f"PRAGMA table_info({table})")
            cols = [r[1] for r in c2.fetchall()]
            c2.execute(f"SELECT COUNT(*) FROM {table}")
            n = c2.fetchone()[0]
            print(f"\n{table} ({len(cols)} cols, {n} rows):")
            for col in cols:
                print(f"  {col}")
