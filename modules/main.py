#!/usr/bin/env python3
"""
main.py - GLS Gestione Padroncini
Applicazione modulare per la gestione dei padroncini GLS

Utilizzo:
    python main.py                          # Menu interattivo
    python main.py import <riepilogo> <conteggi> [anno]
    python main.py export-excel <mese> <anno>
    python main.py export-pdf <mese> <anno> [padroncino_id]
    python main.py list
    python main.py show <padroncino_id>
    python main.py nuovo-mese <mese> <anno>
"""

import sys
import os
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from modules.database import (
    load_padroncini, load_conteggi, get_padroncino,
    upsert_padroncino, delete_padroncino, upsert_conteggio, get_conteggio
)

MONTHS_IT = [
    '', 'GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
    'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'
]

MONTHS_NUM = {m: i for i, m in enumerate(MONTHS_IT) if m}


def clear():
    os.system('clear' if os.name == 'posix' else 'cls')


def separator(char='─', n=70):
    print(char * n)


def print_header(title: str):
    clear()
    separator('═')
    print(f"  GLS GESTIONE PADRONCINI  │  {title}")
    separator('═')
    print()


def print_menu(title: str, options: list):
    print_header(title)
    for i, (label, _) in enumerate(options, 1):
        print(f"  [{i}] {label}")
    print()
    print(f"  [0] ← Indietro / Esci")
    print()
    separator()


def get_choice(max_val: int) -> int:
    while True:
        try:
            val = int(input("  → Scelta: ").strip())
            if 0 <= val <= max_val:
                return val
            print(f"  Inserire un numero tra 0 e {max_val}")
        except ValueError:
            print("  Inserire un numero valido")
        except KeyboardInterrupt:
            return 0


def input_prompt(label: str, default: str = '') -> str:
    prompt = f"  {label}"
    if default:
        prompt += f" [{default}]"
    prompt += ": "
    val = input(prompt).strip()
    return val if val else default


def select_mese_anno() -> tuple:
    print_header("SELEZIONA MESE E ANNO")
    for i, m in enumerate(MONTHS_IT[1:], 1):
        print(f"  [{i:2}] {m}")
    print()
    mese_idx = get_choice(12)
    if mese_idx == 0:
        return None, None
    mese = MONTHS_IT[mese_idx]
    anno = int(input_prompt("Anno", "2026"))
    return mese, anno


# ─── PADRONCINI ───────────────────────────────────────────────────────────────

def menu_padroncini():
    while True:
        options = [
            ("Elenco padroncini",         cmd_lista_padroncini),
            ("Dettaglio padroncino",      cmd_dettaglio_padroncino),
            ("Aggiungi padroncino",       cmd_aggiungi_padroncino),
            ("Modifica padroncino",       cmd_modifica_padroncino),
            ("Rimuovi padroncino",        cmd_rimuovi_padroncino),
            ("Aggiorna stato DURC",       cmd_aggiorna_durc),
        ]
        print_menu("GESTIONE PADRONCINI", options)
        choice = get_choice(len(options))
        if choice == 0:
            break
        options[choice - 1][1]()
        input("\n  [INVIO per continuare...]")


def cmd_lista_padroncini():
    print_header("ELENCO PADRONCINI")
    padroncini = load_padroncini()
    if not padroncini:
        print("  Nessun padroncino trovato. Eseguire prima l'importazione.")
        return

    print(f"  {'ID':<35} {'STATO':<12} {'DURC':<10} {'TOT.FATT':>12}  {'PALMARI':>8}  {'MEZZI':>6}")
    separator('-')
    for p in padroncini:
        stato = p.get('stato', 'ATTIVO')
        durc  = p.get('durc_stato', '')
        fatt  = p.get('fatturato_totale', 0)
        n_pal = len(p.get('palmari', []))
        n_mez = len(p.get('mezzi', []))
        durc_sym = '✓' if durc == 'VALIDO' else '✗' if durc == 'SCADUTO' else '○'
        print(f"  {p['nome']:<35} {stato:<12} {durc_sym} {durc:<9} {fatt:>12,.2f}  {n_pal:>8}  {n_mez:>6}")
    separator('-')
    print(f"  Totale: {len(padroncini)} padroncini")


def cmd_dettaglio_padroncino():
    padroncini = load_padroncini()
    if not padroncini:
        print("  Nessun padroncino trovato.")
        return

    print_header("DETTAGLIO PADRONCINO")
    for i, p in enumerate(padroncini, 1):
        print(f"  [{i:2}] {p['nome']}")
    print()
    choice = get_choice(len(padroncini))
    if choice == 0:
        return

    p = padroncini[choice - 1]
    print_header(f"DETTAGLIO: {p['nome']}")

    print(f"  Nome:           {p['nome']}")
    print(f"  Codice:         {p.get('codice', 'N/D')}")
    print(f"  Stato:          {p.get('stato', 'N/D')}")
    print(f"  DURC Scadenza:  {p.get('durc_scadenza', 'N/D')}")
    print(f"  DURC Stato:     {p.get('durc_stato', 'N/D')}")
    print(f"  Fatturato Tot:  € {p.get('fatturato_totale', 0):,.2f}")
    print()

    codici = p.get('codici_autisti', [])
    if codici:
        print(f"  CODICI AUTISTI ({len(codici)}):")
        separator('-')
        for c in codici:
            print(f"    {c.get('codice',''):>6}  tariffa: {c.get('tariffa_fissa',0):>6}  target: {c.get('target',0):>6}  note: {c.get('note','')}")

    palmari = p.get('palmari', [])
    if palmari:
        print(f"\n  PALMARI ({len(palmari)}):")
        separator('-')
        for pal in palmari:
            print(f"    Seriale: {pal.get('seriale',''):>15}  Cod: {pal.get('codice_associato',''):>6}  Tariffa: {pal.get('tariffa_gg_solari',0):.2f} €/gg")

    mezzi = p.get('mezzi', [])
    if mezzi:
        print(f"\n  MEZZI IN NOLEGGIO ({len(mezzi)}):")
        separator('-')
        for m in mezzi:
            stato_mezzo = m.get('stato', '')
            print(f"    {m.get('targa',''):>10}  {m.get('tipologia',''):>15}  {m.get('tariffa_mensile',0):>6}€/mese  {stato_mezzo}")

    storico = p.get('storico_fatturato', [])
    if storico:
        print(f"\n  STORICO FATTURATO (ultimi 12):")
        separator('-')
        for s in storico[-12:]:
            var = s.get('variazione_pct')
            var_str = f"  ({var:+.1%})" if var else ""
            print(f"    {s.get('anno','')} {s.get('mese',''):>10}:  € {s.get('fatturato',0):>12,.2f}{var_str}")


def cmd_aggiungi_padroncino():
    print_header("AGGIUNGI PADRONCINO")
    nome = input_prompt("Nome padroncino")
    if not nome:
        print("  Nome obbligatorio!")
        return
    codice = input_prompt("Codice (es. C&SSPE)")
    stato  = input_prompt("Stato (ATTIVO/DISMESSO)", "ATTIVO").upper()
    durc_sc = input_prompt("DURC Scadenza (YYYY-MM-DD)")
    durc_st = input_prompt("DURC Stato (VALIDO/SCADUTO/ESENTE)", "VALIDO").upper()

    pid = nome.upper().replace(' ', '_')[:30]
    padroncino = {
        'id': pid, 'nome': nome, 'codice': codice,
        'stato': stato, 'durc_scadenza': durc_sc, 'durc_stato': durc_st,
        'dvr': '', 'palmari': [], 'mezzi': [], 'codici_autisti': [],
        'storico_fatturato': [], 'note_varie': '', 'bonus_fissi': [],
        'fatturato_totale': 0.0,
    }
    upsert_padroncino(padroncino)
    print(f"\n  ✓ Padroncino '{nome}' aggiunto con ID: {pid}")


def cmd_modifica_padroncino():
    padroncini = load_padroncini()
    if not padroncini:
        return
    print_header("MODIFICA PADRONCINO")
    for i, p in enumerate(padroncini, 1):
        print(f"  [{i:2}] {p['nome']}")
    choice = get_choice(len(padroncini))
    if choice == 0:
        return
    p = dict(padroncini[choice - 1])

    print(f"\n  Modifica '{p['nome']}' (INVIO = mantieni valore attuale):")
    p['nome']          = input_prompt("Nome", p['nome'])
    p['codice']        = input_prompt("Codice", p.get('codice', ''))
    p['stato']         = input_prompt("Stato", p.get('stato', 'ATTIVO')).upper()
    p['durc_scadenza'] = input_prompt("DURC Scadenza", p.get('durc_scadenza', '') or '')
    p['durc_stato']    = input_prompt("DURC Stato", p.get('durc_stato', 'VALIDO')).upper()
    p['note_varie']    = input_prompt("Note varie", p.get('note_varie', ''))

    upsert_padroncino(p)
    print(f"\n  ✓ Padroncino aggiornato!")


def cmd_rimuovi_padroncino():
    padroncini = load_padroncini()
    if not padroncini:
        return
    print_header("RIMUOVI PADRONCINO")
    for i, p in enumerate(padroncini, 1):
        print(f"  [{i:2}] {p['nome']}")
    choice = get_choice(len(padroncini))
    if choice == 0:
        return
    p = padroncini[choice - 1]
    confirm = input(f"\n  Confermi rimozione di '{p['nome']}'? (si/no): ").strip().lower()
    if confirm == 'si':
        delete_padroncino(p['id'])
        print(f"  ✓ Padroncino rimosso!")
    else:
        print("  Operazione annullata.")


def cmd_aggiorna_durc():
    padroncini = load_padroncini()
    if not padroncini:
        return
    print_header("AGGIORNA STATO DURC")
    for i, p in enumerate(padroncini, 1):
        durc = p.get('durc_stato', '')
        sc   = p.get('durc_scadenza', '')
        sym  = '✓' if durc == 'VALIDO' else '✗'
        print(f"  [{i:2}] {p['nome']:<35} {sym} {durc} (scad. {sc})")
    choice = get_choice(len(padroncini))
    if choice == 0:
        return
    p = dict(padroncini[choice - 1])
    p['durc_stato']    = input_prompt("Nuovo stato DURC (VALIDO/SCADUTO/ESENTE)", p.get('durc_stato', '')).upper()
    p['durc_scadenza'] = input_prompt("Nuova scadenza DURC (YYYY-MM-DD)", p.get('durc_scadenza', '') or '')
    upsert_padroncino(p)
    print("  ✓ DURC aggiornato!")


# ─── CONTEGGI ─────────────────────────────────────────────────────────────────

def menu_conteggi():
    while True:
        options = [
            ("Visualizza conteggi mensili",   cmd_visualizza_conteggi),
            ("Inserisci/Modifica conteggio",  cmd_modifica_conteggio),
            ("Nuovo mese (copia struttura)",  cmd_nuovo_mese),
            ("Aggiorna checklist",            cmd_aggiorna_checklist),
        ]
        print_menu("GESTIONE CONTEGGI MENSILI", options)
        choice = get_choice(len(options))
        if choice == 0:
            break
        options[choice - 1][1]()
        input("\n  [INVIO per continuare...]")


def cmd_visualizza_conteggi():
    mese, anno = select_mese_anno()
    if not mese:
        return
    print_header(f"CONTEGGI {mese} {anno}")
    conteggi = [c for c in load_conteggi()
                if c.get('mese') == mese and c.get('anno') == anno]
    if not conteggi:
        print(f"  Nessun conteggio per {mese} {anno}")
        return

    tot_fatt = tot_add = tot_bon = 0
    print(f"  {'PADRONCINO':<35} {'FATTURATO':>14} {'ADDEBITI':>12} {'BONIFICO':>12}  {'DISTR':>6} {'PDF':>5} {'FATT':>5} {'SCAD':>5}")
    separator('-')
    for c in conteggi:
        pid  = c['padroncino_id']
        fatt = c.get('totale_imponibile', 0)
        add  = c.get('totale_addebiti', 0)
        bon  = c.get('totale_da_bonificare', 0)
        tot_fatt += fatt; tot_add += add; tot_bon += bon
        d = '✓' if c.get('distrib_inviata')      else '·'
        p = '✓' if c.get('pdf_addeb')             else '·'
        f = '✓' if c.get('fattura_ricevuta')      else '·'
        s = '✓' if c.get('caricata_scadenziario') else '·'
        bon_str = f"{bon:>12,.2f}"
        if bon < 0:
            bon_str = f"\033[91m{bon_str}\033[0m"
        print(f"  {pid:<35} {fatt:>14,.2f} {add:>12,.2f} {bon_str}  {d:>6} {p:>5} {f:>5} {s:>5}")
    separator('-')
    print(f"  {'TOTALE':<35} {tot_fatt:>14,.2f} {tot_add:>12,.2f} {tot_bon:>12,.2f}")


def cmd_modifica_conteggio():
    padroncini = load_padroncini()
    if not padroncini:
        print("  Nessun padroncino trovato.")
        return
    mese, anno = select_mese_anno()
    if not mese:
        return

    print_header(f"SELEZIONA PADRONCINO – {mese} {anno}")
    for i, p in enumerate(padroncini, 1):
        c = get_conteggio(p['id'], mese, anno)
        bon = c.get('totale_da_bonificare', 0) if c else 0
        print(f"  [{i:2}] {p['nome']:<35}  bon: {bon:>12,.2f}")
    choice = get_choice(len(padroncini))
    if choice == 0:
        return

    p = padroncini[choice - 1]
    c = get_conteggio(p['id'], mese, anno) or {
        'padroncino_id': p['id'], 'mese': mese, 'anno': anno,
        'fisso_mensile': 0, 'totale_spedizioni': 0, 'totale_ritiri': 0,
        'totale_ritiri_fissi': 0, 'consegne_doppie': 0, 'consegne_extra': 0,
        'sforamento_rientri': 0, 'compensazioni_imponibile': 0,
        'altri_fatturato': [], 'totale_imponibile': 0, 'iva': 0,
        'totale_fattura': 0, 'acconto_fattura': 0,
        'addebiti_palmari': 0, 'addebiti_mezzi': 0, 'addebiti_ricariche': 0,
        'altri_addebiti': [], 'totale_addebiti': 0,
        'compensazioni_distribuzione': 0, 'accrediti_storni': [],
        'cassa_prima_nota': [], 'fatture_fine_mese': [],
        'totale_da_bonificare': 0, 'note_varie': '',
        'distrib_inviata': False, 'pdf_addeb': False,
        'fattura_ricevuta': False, 'fatt_tu_creata': False,
        'unione_pdf': False, 'caricata_scadenziario': False,
        'n_palmari': 0, 'dettagli_palmari': [], 'dettagli_mezzi': [], 'noleggio_extra': [],
    }

    print_header(f"MODIFICA CONTEGGIO: {p['nome']} – {mese} {anno}")
    print("  FATTURATO:")
    c['fisso_mensile']           = float(input_prompt("  Fisso Mensile", str(c.get('fisso_mensile', 0))))
    c['totale_spedizioni']       = float(input_prompt("  Totale Spedizioni", str(c.get('totale_spedizioni', 0))))
    c['totale_ritiri']           = float(input_prompt("  Totale Ritiri", str(c.get('totale_ritiri', 0))))
    c['consegne_doppie']         = float(input_prompt("  Consegne Doppie (neg.)", str(c.get('consegne_doppie', 0))))
    c['sforamento_rientri']      = float(input_prompt("  Sforamento Rientri (neg.)", str(c.get('sforamento_rientri', 0))))
    c['compensazioni_imponibile']= float(input_prompt("  Compensazioni Imponibile", str(c.get('compensazioni_imponibile', 0))))

    print("\n  TOTALI:")
    c['totale_imponibile']       = float(input_prompt("  Totale Imponibile", str(c.get('totale_imponibile', 0))))
    c['iva']                     = float(input_prompt("  IVA", str(c.get('iva', 0))))
    c['totale_fattura']          = float(input_prompt("  Totale Fattura", str(c.get('totale_fattura', 0))))

    print("\n  ADDEBITI:")
    c['addebiti_palmari']        = float(input_prompt("  Addebiti Palmari", str(c.get('addebiti_palmari', 0))))
    c['addebiti_mezzi']          = float(input_prompt("  Addebiti Mezzi", str(c.get('addebiti_mezzi', 0))))
    c['totale_addebiti']         = float(input_prompt("  Totale Addebiti", str(c.get('totale_addebiti', 0))))
    c['compensazioni_distribuzione'] = float(input_prompt("  Compensazioni Distribuzione", str(c.get('compensazioni_distribuzione', 0))))
    c['totale_da_bonificare']    = float(input_prompt("  TOTALE DA BONIFICARE", str(c.get('totale_da_bonificare', 0))))

    c['note_varie'] = input_prompt("  Note varie", c.get('note_varie', ''))

    upsert_conteggio(c)
    print(f"\n  ✓ Conteggio salvato!")


def cmd_nuovo_mese():
    print_header("NUOVO MESE – COPIA STRUTTURA")
    print("  Crea i record di conteggio (vuoti) per un nuovo mese.")
    mese, anno = select_mese_anno()
    if not mese:
        return

    padroncini = load_padroncini()
    creati = 0
    for p in padroncini:
        if p.get('stato', 'ATTIVO') != 'ATTIVO':
            continue
        existing = get_conteggio(p['id'], mese, anno)
        if not existing:
            c = {
                'padroncino_id': p['id'], 'mese': mese, 'anno': anno,
                'fisso_mensile': 0, 'totale_spedizioni': 0, 'totale_ritiri': 0,
                'totale_ritiri_fissi': 0, 'consegne_doppie': 0, 'consegne_extra': 0,
                'sforamento_rientri': 0, 'compensazioni_imponibile': 0,
                'altri_fatturato': [], 'totale_imponibile': 0, 'iva': 0,
                'totale_fattura': 0, 'acconto_fattura': 0,
                'addebiti_palmari': 0, 'addebiti_mezzi': 0, 'addebiti_ricariche': 0,
                'altri_addebiti': [], 'totale_addebiti': 0,
                'compensazioni_distribuzione': 0, 'accrediti_storni': [],
                'cassa_prima_nota': [], 'fatture_fine_mese': [],
                'totale_da_bonificare': 0, 'note_varie': '',
                'distrib_inviata': False, 'pdf_addeb': False,
                'fattura_ricevuta': False, 'fatt_tu_creata': False,
                'unione_pdf': False, 'caricata_scadenziario': False,
                'n_palmari': len(p.get('palmari', [])),
                'dettagli_palmari': [], 'dettagli_mezzi': [], 'noleggio_extra': [],
            }
            upsert_conteggio(c)
            creati += 1

    print(f"\n  ✓ Creati {creati} conteggi per {mese} {anno}")


def cmd_aggiorna_checklist():
    padroncini = load_padroncini()
    if not padroncini:
        return
    mese, anno = select_mese_anno()
    if not mese:
        return

    print_header(f"AGGIORNA CHECKLIST – {mese} {anno}")
    for i, p in enumerate(padroncini, 1):
        print(f"  [{i:2}] {p['nome']}")
    choice = get_choice(len(padroncini))
    if choice == 0:
        return

    p = padroncini[choice - 1]
    c = get_conteggio(p['id'], mese, anno)
    if not c:
        print("  Conteggio non trovato per questo mese.")
        return

    c = dict(c)
    print(f"\n  Checklist per {p['nome']} – {mese} {anno}:")
    print("  (1=sì, 0=no, INVIO=mantieni)")

    checks = [
        ('Distrib. Inviata',    'distrib_inviata'),
        ('PDF Addebiti',        'pdf_addeb'),
        ('Fattura Ricevuta',    'fattura_ricevuta'),
        ('Fatt. Tu Creata',     'fatt_tu_creata'),
        ('Unione PDF',          'unione_pdf'),
        ('Caricata Scadenziario', 'caricata_scadenziario'),
    ]
    for label, key in checks:
        curr = '✓' if c.get(key) else '·'
        val = input(f"    {label} (attuale: {curr}): ").strip()
        if val == '1':
            c[key] = True
        elif val == '0':
            c[key] = False

    upsert_conteggio(c)
    print("  ✓ Checklist aggiornata!")


# ─── ESPORTAZIONE ─────────────────────────────────────────────────────────────

def menu_esportazione():
    while True:
        options = [
            ("Esporta Excel mensile",           cmd_export_excel),
            ("Esporta PDF singolo padroncino",  cmd_export_pdf_singolo),
            ("Esporta PDF tutti i padroncini",  cmd_export_pdf_tutti),
        ]
        print_menu("ESPORTAZIONE", options)
        choice = get_choice(len(options))
        if choice == 0:
            break
        options[choice - 1][1]()
        input("\n  [INVIO per continuare...]")


def cmd_export_excel():
    from modules.excel_exporter import export_excel
    mese, anno = select_mese_anno()
    if not mese:
        return
    print(f"\n  Generazione Excel per {mese} {anno}...")
    try:
        path = export_excel(mese, anno)
        print(f"\n  ✓ File salvato:\n    {path}")
    except Exception as e:
        print(f"\n  ✗ Errore: {e}")


def cmd_export_pdf_singolo():
    try:
        from modules.pdf_exporter import export_pdf_single
    except Exception as e:
        print(f"  reportlab non disponibile: {e}")
        return

    padroncini = load_padroncini()
    mese, anno = select_mese_anno()
    if not mese:
        return
    print_header(f"SELEZIONA PADRONCINO – {mese} {anno}")
    for i, p in enumerate(padroncini, 1):
        print(f"  [{i:2}] {p['nome']}")
    choice = get_choice(len(padroncini))
    if choice == 0:
        return
    p = padroncini[choice - 1]
    print(f"\n  Generazione PDF per {p['nome']}...")
    try:
        path = export_pdf_single(p['id'], mese, anno)
        print(f"\n  ✓ File salvato:\n    {path}")
    except Exception as e:
        print(f"\n  ✗ Errore: {e}")


def cmd_export_pdf_tutti():
    try:
        from modules.pdf_exporter import export_pdf_all
    except Exception as e:
        print(f"  reportlab non disponibile: {e}")
        return
    mese, anno = select_mese_anno()
    if not mese:
        return
    print(f"\n  Generazione PDF per tutti i padroncini ({mese} {anno})...")
    try:
        path = export_pdf_all(mese, anno)
        print(f"\n  ✓ File salvato:\n    {path}")
    except Exception as e:
        print(f"\n  ✗ Errore: {e}")


# ─── IMPORTAZIONE ─────────────────────────────────────────────────────────────

def menu_importazione():
    print_header("IMPORTAZIONE DATI")
    print("  Importa i dati dai file Excel esistenti.")
    print()
    riepilogo = input_prompt("  Percorso file Riepilogo Padroncini (.xlsx)")
    if not riepilogo:
        return
    conteggi_f = input_prompt("  Percorso file Conteggi Mensili (.xlsx)")
    if not conteggi_f:
        return
    anno = int(input_prompt("  Anno di riferimento", "2026"))

    try:
        from modules.importer import run_full_import
        padroncini, conteggi = run_full_import(riepilogo, conteggi_f, anno)
        print(f"\n  ✓ Importati {len(padroncini)} padroncini e {len(conteggi)} conteggi")
    except Exception as e:
        print(f"\n  ✗ Errore: {e}")
        import traceback
        traceback.print_exc()

    input("\n  [INVIO per continuare...]")


# ─── MAIN MENU ────────────────────────────────────────────────────────────────

def main_menu():
    while True:
        options = [
            ("Gestione Padroncini",      menu_padroncini),
            ("Conteggi Mensili",         menu_conteggi),
            ("Esportazione (Excel/PDF)", menu_esportazione),
            ("Importazione da Excel",    menu_importazione),
        ]
        print_menu("MENU PRINCIPALE", options)
        print("  📦 GLS Gestione Padroncini v1.0")
        print()
        choice = get_choice(len(options))
        if choice == 0:
            print("\n  Arrivederci!\n")
            break
        options[choice - 1][1]()


# ─── CLI COMMANDS ─────────────────────────────────────────────────────────────

def cli_import(args):
    if len(args) < 2:
        print("Uso: python main.py import <riepilogo.xlsx> <conteggi.xlsx> [anno]")
        sys.exit(1)
    anno = int(args[2]) if len(args) > 2 else 2026
    from modules.importer import run_full_import
    run_full_import(args[0], args[1], anno)


def cli_export_excel(args):
    if len(args) < 2:
        print("Uso: python main.py export-excel <MESE> <ANNO>")
        sys.exit(1)
    from modules.excel_exporter import export_excel
    export_excel(args[0].upper(), int(args[1]))


def cli_export_pdf(args):
    if len(args) < 2:
        print("Uso: python main.py export-pdf <MESE> <ANNO> [padroncino_id]")
        sys.exit(1)
    if len(args) > 2:
        from modules.pdf_exporter import export_pdf_single
        export_pdf_single(args[2], args[0].upper(), int(args[1]))
    else:
        from modules.pdf_exporter import export_pdf_all
        export_pdf_all(args[0].upper(), int(args[1]))


def cli_list():
    padroncini = load_padroncini()
    print(f"{'ID':<35} {'STATO':<12} {'DURC'}")
    print("-" * 60)
    for p in padroncini:
        print(f"{p['nome']:<35} {p.get('stato',''):12} {p.get('durc_stato','')}")


def cli_show(args):
    if not args:
        print("Uso: python main.py show <padroncino_id>")
        sys.exit(1)
    p = get_padroncino(args[0])
    if not p:
        print(f"Padroncino '{args[0]}' non trovato")
        sys.exit(1)
    print(json.dumps(p, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        main_menu()
    elif args[0] == 'import':
        cli_import(args[1:])
    elif args[0] == 'export-excel':
        cli_export_excel(args[1:])
    elif args[0] == 'export-pdf':
        cli_export_pdf(args[1:])
    elif args[0] == 'list':
        cli_list()
    elif args[0] == 'show':
        cli_show(args[1:])
    elif args[0] == 'nuovo-mese':
        if len(args) < 3:
            print("Uso: python main.py nuovo-mese <MESE> <ANNO>")
        else:
            # Create empty conteggi for all active padroncini
            padroncini = load_padroncini()
            mese, anno = args[1].upper(), int(args[2])
            creati = 0
            for p in padroncini:
                if p.get('stato', 'ATTIVO') == 'ATTIVO':
                    if not get_conteggio(p['id'], mese, anno):
                        upsert_conteggio({
                            'padroncino_id': p['id'], 'mese': mese, 'anno': anno,
                            'totale_imponibile': 0, 'totale_addebiti': 0,
                            'totale_da_bonificare': 0
                        })
                        creati += 1
            print(f"Creati {creati} conteggi per {mese} {anno}")
    else:
        print(__doc__)
