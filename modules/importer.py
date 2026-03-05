"""
importer.py - Importazione dati dai file Excel esistenti
"""
import pandas as pd
from pathlib import Path
from datetime import date
import re
from modules.database import save_padroncini, save_conteggi, upsert_conteggio


MONTHS_IT = {
    'GENNAIO': 1, 'FEBBRAIO': 2, 'MARZO': 3, 'APRILE': 4,
    'MAGGIO': 5, 'GIUGNO': 6, 'LUGLIO': 7, 'AGOSTO': 8,
    'SETTEMBRE': 9, 'OTTOBRE': 10, 'NOVEMBRE': 11, 'DICEMBRE': 12
}

SKIP_SHEETS = {'RIEPILOGO', 'RICARICHE'}


def _safe_float(val) -> float:
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return 0.0
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def _safe_date(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        if hasattr(val, 'date'):
            return val.date().isoformat()
        return str(val)[:10]
    except Exception:
        return None


def import_riepilogo_padroncini(filepath: str) -> list:
    """Importa i dati anagrafici dal file Riepilogo Padroncini"""
    xl = pd.read_excel(filepath, sheet_name=None, header=None)
    padroncini = []

    # Parse RIEPILOGO sheet for overview
    riepilogo = xl.get('RIEPILOGO')
    riepilogo_map = {}
    if riepilogo is not None:
        for _, row in riepilogo.iterrows():
            nome = str(row.get(1, '') or '').strip()
            if nome and nome != 'FORNITORE':
                riepilogo_map[nome.upper()] = {
                    'stato': str(row.get(6, 'ATTIVO') or 'ATTIVO').strip(),
                    'durc_scadenza': _safe_date(row.get(3)),
                    'durc_stato': str(row.get(4, 'VALIDO') or 'VALIDO').strip(),
                    'codici_assegnati': _safe_float(row.get(7)),
                    'mezzi_noleggio': _safe_float(row.get(8)),
                    'palmari': _safe_float(row.get(9)),
                    'fatturato_totale': _safe_float(row.get(10)),
                }

    # Parse each padroncino sheet
    for sheet_name, df in xl.items():
        if sheet_name in SKIP_SHEETS:
            continue

        padroncino = _parse_padroncino_sheet(sheet_name, df)
        if padroncino:
            # Enrich with riepilogo data
            nome_upper = padroncino['nome'].upper()
            for k, v in riepilogo_map.items():
                if k in nome_upper or nome_upper in k:
                    padroncino.update(v)
                    break
            padroncini.append(padroncino)

    return padroncini


def _parse_padroncino_sheet(sheet_name: str, df) -> dict:
    """Parse a single padroncino sheet from Riepilogo file"""
    p = {
        'id': sheet_name,
        'nome': sheet_name,
        'codice': '',
        'stato': 'ATTIVO',
        'durc_scadenza': None,
        'durc_stato': 'VALIDO',
        'dvr': '',
        'palmari': [],
        'mezzi': [],
        'codici_autisti': [],
        'storico_fatturato': [],
        'note_varie': '',
        'bonus_fissi': [],
        'fatturato_totale': 0.0,
    }

    rows = []
    for _, row in df.iterrows():
        rows.append(list(row))

    # Extract name from row 1
    for row in rows[:3]:
        for cell in row:
            if cell and str(cell).strip() not in ('NaN', 'nan', 'None'):
                val = str(cell).strip()
                if 'FORNITORE' in val.upper():
                    continue
                # Next non-null after FORNITORE label
                pass

    # Row 1 typically has name in col 2
    if len(rows) > 1:
        nome_cell = rows[1][2] if len(rows[1]) > 2 else None
        if nome_cell and str(nome_cell).strip() not in ('NaN', 'nan', 'None', ''):
            raw = str(nome_cell).strip()
            # Extract code from parentheses
            match = re.search(r'\(([^)]+)\)', raw)
            if match:
                p['codice'] = match.group(1)
                p['nome'] = raw.replace(f'({match.group(1)})', '').strip()
            else:
                p['nome'] = raw

    storico = []
    palmari = []
    mezzi = []
    codici = []
    bonus_fissi = []
    fatturato_totale = 0.0

    mode = None
    i = 0
    while i < len(rows):
        row = rows[i]
        # Read cells as strings safely
        cells = [str(c).strip() if c is not None and str(c) not in ('nan', 'NaN', 'None') else '' for c in row]

        row_text = ' '.join(cells).upper()

        if 'SCADENZA DURC' in row_text or 'DURC SCADENZA' in row_text:
            for j, c in enumerate(cells):
                if c and c not in ('SCADENZA DURC', 'DURC SCADENZA', 'STATO', 'NOTE'):
                    # Check if it's a date
                    if re.match(r'\d{4}-\d{2}-\d{2}', c):
                        p['durc_scadenza'] = c[:10]
                    elif c in ('VALIDO', 'SCADUTO', 'ESENTE', 'DISMESSO'):
                        p['durc_stato'] = c

        if 'FATTURATO TOTALE' in row_text:
            for j, c in enumerate(cells):
                try:
                    v = float(c)
                    if v > 0:
                        fatturato_totale = v
                        break
                except ValueError:
                    pass

        if 'BONUS FISSI MENSILI' in row_text:
            mode = 'bonus'

        if 'CODICI E TARIFFE' in row_text:
            mode = 'codici_header'

        if mode == 'codici_header' and 'CONTRATTO' in row_text and 'CODICE AUTISTA' in row_text:
            mode = 'codici'

        if mode == 'codici' and i + 1 < len(rows):
            # Rows with codice data
            if cells[1] in ('Visualizza', '') or (cells[1] and cells[1] != 'CONTRATTO'):
                try:
                    codice_val = cells[3] if len(cells) > 3 else ''
                    tariffa = _safe_float(cells[4]) if len(cells) > 4 else 0
                    if codice_val and codice_val not in ('CODICE AUTISTA', 'NaN', ''):
                        codici.append({
                            'contratto': cells[1],
                            'data_contratto': cells[2][:10] if re.match(r'\d{4}', cells[2]) else '',
                            'codice': codice_val,
                            'tariffa_fissa': tariffa,
                            'target': _safe_float(cells[5]) if len(cells) > 5 else 0,
                            'bonus_malus': cells[6] if len(cells) > 6 else '',
                            'note': cells[7] if len(cells) > 7 else '',
                        })
                except Exception:
                    pass

        if 'N.PALMARI' in row_text or 'NOLEGGIO PALMARI' in row_text:
            mode = 'palmari_header'

        if mode == 'palmari_header' and 'SERIALE PALMARE' in row_text:
            mode = 'palmari'

        if mode == 'palmari' and cells[1] in ('Visualizza', '') and len(cells) > 3:
            seriale = cells[2] if len(cells) > 2 else ''
            if seriale and seriale not in ('SERIALE PALMARE', ''):
                palmari.append({
                    'contratto': cells[1],
                    'seriale': seriale,
                    'codice_associato': cells[3] if len(cells) > 3 else '',
                    'tariffa_gg_solari': _safe_float(cells[4]) if len(cells) > 4 else 0,
                    'tariffa_ivata': _safe_float(cells[5]) if len(cells) > 5 else 0,
                    'note': cells[6] if len(cells) > 6 else '',
                })

        if 'NOLEGGIO MEZZI ATTIVI' in row_text:
            mode = 'mezzi_header'

        if mode == 'mezzi_header' and 'DATA INIZIO NOLEGGIO' in row_text:
            mode = 'mezzi'

        if mode == 'mezzi' and cells[1] in ('Visualizza', '') and len(cells) > 3:
            targa = cells[3] if len(cells) > 3 else ''
            if targa and targa not in ('TARGA', ''):
                mezzi.append({
                    'contratto': cells[1],
                    'data_inizio': cells[2][:10] if re.match(r'\d{4}', cells[2]) else '',
                    'targa': targa,
                    'tipologia': cells[4] if len(cells) > 4 else '',
                    'assegnato': cells[5] if len(cells) > 5 else '',
                    'tariffa_mensile': _safe_float(cells[6]) if len(cells) > 6 else 0,
                    'tariffa_ivata': _safe_float(cells[7]) if len(cells) > 7 else 0,
                    'data_fine': cells[8][:10] if len(cells) > 8 and re.match(r'\d{4}', cells[8]) else '',
                    'stato': cells[9] if len(cells) > 9 else '',
                    'note': cells[10] if len(cells) > 10 else '',
                })

        # Storico fatturato - rows with ANNO/MESE pattern
        if len(cells) > 14:
            anno_cell = cells[13] if len(cells) > 13 else ''
            mese_cell = cells[14] if len(cells) > 14 else ''
            fatt_cell = cells[15] if len(cells) > 15 else ''
            if anno_cell.isdigit() and mese_cell.upper() in MONTHS_IT:
                storico.append({
                    'anno': int(anno_cell),
                    'mese': mese_cell.upper(),
                    'fatturato': _safe_float(fatt_cell),
                    'variazione_pct': _safe_float(cells[16]) if len(cells) > 16 else None,
                })

        i += 1

    p['palmari'] = palmari
    p['mezzi'] = mezzi
    p['codici_autisti'] = codici
    p['storico_fatturato'] = storico
    p['fatturato_totale'] = fatturato_totale
    return p


def import_conteggi_mensili(filepath: str, anno: int) -> list:
    """Importa i conteggi mensili dal file bonifici"""
    xl = pd.read_excel(filepath, sheet_name=None, header=None)
    conteggi = []

    # Get month from RIEPILOGO
    mese = 'GENNAIO'
    riepilogo = xl.get('RIEPILOGO')
    if riepilogo is not None:
        for _, row in riepilogo.iterrows():
            val = str(row.get(1, '') or '').strip().upper()
            if val in MONTHS_IT:
                mese = val
                break
            # Row 0 has mese in col 2
            val2 = str(row.get(2, '') or '').strip().upper()
            if val2 in MONTHS_IT:
                mese = val2
                break

    for sheet_name, df in xl.items():
        if sheet_name in SKIP_SHEETS:
            continue

        conteggio = _parse_conteggio_sheet(sheet_name, df, mese, anno)
        if conteggio:
            conteggi.append(conteggio)

    return conteggi


def _parse_conteggio_sheet(sheet_name: str, df, mese: str, anno: int) -> dict:
    c = {
        'padroncino_id': sheet_name,
        'mese': mese,
        'anno': anno,
        'fisso_mensile': 0.0,
        'totale_spedizioni': 0.0,
        'totale_ritiri': 0.0,
        'totale_ritiri_fissi': 0.0,
        'consegne_doppie': 0.0,
        'consegne_extra': 0.0,
        'sforamento_rientri': 0.0,
        'compensazioni_imponibile': 0.0,
        'altri_fatturato': [],
        'totale_imponibile': 0.0,
        'iva': 0.0,
        'totale_fattura': 0.0,
        'acconto_fattura': 0.0,
        'addebiti_palmari': 0.0,
        'addebiti_mezzi': 0.0,
        'addebiti_ricariche': 0.0,
        'altri_addebiti': [],
        'totale_addebiti': 0.0,
        'compensazioni_distribuzione': 0.0,
        'accrediti_storni': [],
        'cassa_prima_nota': [],
        'fatture_fine_mese': [],
        'totale_da_bonificare': 0.0,
        'note_varie': '',
        'distrib_inviata': False,
        'pdf_addeb': False,
        'fattura_ricevuta': False,
        'fatt_tu_creata': False,
        'unione_pdf': False,
        'caricata_scadenziario': False,
        'n_palmari': 0,
        'dettagli_palmari': [],
        'dettagli_mezzi': [],
        'noleggio_extra': [],
    }

    rows = []
    for _, row in df.iterrows():
        rows.append(list(row))

    for row in rows:
        cells = [str(v).strip() if v is not None and str(v) not in ('nan', 'NaN', 'None') else '' for v in row]
        row_text = ' '.join(cells).upper()

        # Find key values by label matching
        for j, cell in enumerate(cells):
            if not cell:
                continue
            cell_upper = cell.upper()

            if 'FISSO MENSILE' in cell_upper and j + 1 < len(cells):
                v = _safe_float(cells[j + 1])
                if v: c['fisso_mensile'] = v

            elif 'TOTALE SPEDIZIONI' in cell_upper and 'VALORE' in cell_upper and j + 1 < len(cells):
                c['totale_spedizioni'] = _safe_float(cells[j + 1])

            elif 'TOTALE RITIRI' in cell_upper and 'ZONA FISSI' not in cell_upper and j + 1 < len(cells):
                c['totale_ritiri'] = _safe_float(cells[j + 1])

            elif 'TOTALE RITIRI ZONA FISSI' in cell_upper and j + 1 < len(cells):
                c['totale_ritiri_fissi'] = _safe_float(cells[j + 1])

            elif 'CONSEGNE DOPPIE' in cell_upper and j + 1 < len(cells):
                c['consegne_doppie'] = _safe_float(cells[j + 1])

            elif 'SFORAMENTO RIENTRI' in cell_upper and j + 1 < len(cells):
                c['sforamento_rientri'] = _safe_float(cells[j + 1])

            elif cell_upper == 'TOTALE IMPONIBILE' and j + 1 < len(cells):
                c['totale_imponibile'] = _safe_float(cells[j + 1])

            elif cell_upper == 'IVA' and j + 1 < len(cells):
                c['iva'] = _safe_float(cells[j + 1])

            elif 'TOTALE FATTURA DA RICEVERE' in cell_upper and j + 1 < len(cells):
                c['totale_fattura'] = _safe_float(cells[j + 1])

            elif 'TOTALE ADDEBITI DA INSERIRE' in cell_upper and j + 1 < len(cells):
                c['totale_addebiti'] = _safe_float(cells[j + 1])

            elif 'TOTALE DA BONIFICARE' in cell_upper and j + 1 < len(cells):
                v = _safe_float(cells[j + 1])
                if v != 0: c['totale_da_bonificare'] = v

            elif 'COMPENSAZIONI E ADDEBITI SU DISTRIBUZIONE' in cell_upper and j + 1 < len(cells):
                v = _safe_float(cells[j + 1])
                if v: c['compensazioni_distribuzione'] = v

            elif 'ADDEBITI NOLEGGIO PALMARI' in cell_upper:
                # Extract number of palmari
                match = re.search(r'N\.(\d+)', cell_upper)
                if match:
                    c['n_palmari'] = int(match.group(1))

            elif 'ADDEBITI NOLEGGIO MEZZI' in cell_upper:
                pass  # mezzi parsed below

        # Detect fattura fine mese entries (right side)
        if 'FATTURA FINE MESE' in row_text or 'SALDO FATT' in row_text:
            for j, cell in enumerate(cells):
                if ('FATTURA FINE MESE' in cell.upper() or 'SALDO FATT' in cell.upper()) and j + 1 < len(cells):
                    v = _safe_float(cells[j + 1])
                    if v:
                        c['fatture_fine_mese'].append({'descrizione': cell, 'importo': v})

        # Detect accrediti/acconti (right side table)
        if 'ACCONTO NON VERSATO' in row_text:
            for j, cell in enumerate(cells):
                if 'ACCONTO NON VERSATO' in cell.upper() and j + 1 < len(cells):
                    v = _safe_float(cells[j + 1])
                    if v:
                        c['cassa_prima_nota'].append({'descrizione': cell, 'importo': v})

        # Noleggio mezzo details
        if len(cells) > 2 and re.match(r'^[A-Z]{2}\d{3}[A-Z]{2}$', cells[1]) or \
           (len(cells) > 1 and re.match(r'^[A-Z]{2}\d{3}[A-Z]{2}$', cells[1])):
            targa = cells[1]
            importo = _safe_float(cells[2]) if len(cells) > 2 else 0
            tipo = cells[3] if len(cells) > 3 else ''
            if importo:
                c['dettagli_mezzi'].append({'targa': targa, 'importo': importo, 'tipologia': tipo})
                c['addebiti_mezzi'] += importo

        # Note varie (last column area)
        if 'NOTE VARIE' in row_text:
            for j, cell in enumerate(cells):
                if 'NOTE VARIE' in cell.upper() and j + 1 < len(cells):
                    note = cells[j + 1]
                    if note:
                        c['note_varie'] = note

    return c


def run_full_import(riepilogo_path: str, conteggi_path: str, anno: int = 2026):
    """Esegue l'importazione completa da entrambi i file"""
    print(f"Importazione padroncini da: {riepilogo_path}")
    padroncini = import_riepilogo_padroncini(riepilogo_path)
    save_padroncini(padroncini)
    print(f"  -> {len(padroncini)} padroncini importati")

    print(f"Importazione conteggi da: {conteggi_path}")
    conteggi = import_conteggi_mensili(conteggi_path, anno)
    save_conteggi(conteggi)
    print(f"  -> {len(conteggi)} conteggi mensili importati")

    return padroncini, conteggi
