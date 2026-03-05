"""
pdf_exporter.py - Esportazione PDF per singolo padroncino o tutti
"""
try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                     Paragraph, Spacer, HRFlowable, PageBreak)
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False
    print("WARNING: reportlab non disponibile. Installare con: pip install reportlab")

from pathlib import Path
from modules.database import load_padroncini, load_conteggi

MONTHS_IT = [
    '', 'GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
    'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'
]

# Colors
BLU_GLS   = colors.HexColor('#1F3864')
BLU_MED   = colors.HexColor('#2F5496')
BLU_LIGHT = colors.HexColor('#D6E4F7')
GIALLO    = colors.HexColor('#FFE699')
VERDE     = colors.HexColor('#E2EFDA')
ROSSO_L   = colors.HexColor('#FCE4D6')
GRIGIO    = colors.HexColor('#F2F2F2')


def _euro(val):
    try:
        return f"€ {float(val):,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    except Exception:
        return "€ 0,00"


def _build_padroncino_pdf(story, padroncino, conteggio, mese, anno, styles):
    nome   = padroncino.get('nome', '')
    codice = padroncino.get('codice', '')
    durc_sc = padroncino.get('durc_scadenza', 'N/D')
    durc_st = padroncino.get('durc_stato', '')

    # Title
    story.append(Paragraph(
        f"<b>{nome}</b>  ({codice})",
        ParagraphStyle('title', fontSize=16, textColor=colors.white,
                       backColor=BLU_GLS, alignment=TA_CENTER,
                       spaceAfter=4, spaceBefore=8, leftIndent=5, rightIndent=5)
    ))
    story.append(Paragraph(
        f"{mese} {anno}",
        ParagraphStyle('subtitle', fontSize=12, textColor=BLU_MED,
                       alignment=TA_CENTER, spaceAfter=6)
    ))

    durc_color = colors.HexColor('#C6EFCE') if durc_st == 'VALIDO' else colors.HexColor('#FFC7CE')
    story.append(Table(
        [[f"DURC – Scadenza: {durc_sc}", f"Stato: {durc_st}"]],
        colWidths=[120*mm, 50*mm],
        style=TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), BLU_LIGHT),
            ('BACKGROUND', (1, 0), (1, 0), durc_color),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [None]),
        ])
    ))
    story.append(Spacer(1, 4*mm))

    if not conteggio:
        story.append(Paragraph("Nessun conteggio disponibile per questo mese.",
                                styles['Normal']))
        return

    c = conteggio

    # ── Fatturato table ──────────────────────────────────────────
    story.append(Paragraph("FATTURATO SPEDIZIONI + RITIRI",
                            ParagraphStyle('sec', fontSize=10, textColor=colors.white,
                                           backColor=BLU_MED, alignment=TA_CENTER,
                                           spaceAfter=2, spaceBefore=4)))

    fatt_rows = [
        ["Descrizione", "Importo"],
        ["Fisso Mensile",                  _euro(c.get('fisso_mensile', 0))],
        ["Totale Spedizioni (Proforma)",   _euro(c.get('totale_spedizioni', 0))],
        ["Totale Ritiri",                  _euro(c.get('totale_ritiri', 0))],
        ["Consegne Doppie",                _euro(c.get('consegne_doppie', 0))],
        ["Sforamento Rientri",             _euro(c.get('sforamento_rientri', 0))],
        ["Compensazioni Imponibile",       _euro(c.get('compensazioni_imponibile', 0))],
    ]
    for item in c.get('altri_fatturato', []):
        fatt_rows.append([item.get('descrizione', ''), _euro(item.get('importo', 0))])

    fatt_rows += [
        ["", ""],
        ["Totale Imponibile",  _euro(c.get('totale_imponibile', 0))],
        ["IVA",                _euro(c.get('iva', 0))],
        ["TOTALE FATTURA",     _euro(c.get('totale_fattura', 0))],
    ]

    n_data = len(fatt_rows)
    t = Table(fatt_rows, colWidths=[130*mm, 40*mm])
    ts = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLU_GLS),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -4), [colors.white, GRIGIO]),
        ('BACKGROUND', (0, n_data-3), (-1, n_data-3), BLU_LIGHT),
        ('BACKGROUND', (0, n_data-1), (-1, n_data-1), GIALLO),
        ('FONTNAME', (0, n_data-3), (-1, n_data-1), 'Helvetica-Bold'),
        ('FONTNAME', (0, n_data-1), (-1, n_data-1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ])
    t.setStyle(ts)
    story.append(t)
    story.append(Spacer(1, 4*mm))

    # ── Addebiti table ────────────────────────────────────────────
    story.append(Paragraph("ADDEBITI",
                            ParagraphStyle('sec', fontSize=10, textColor=colors.white,
                                           backColor=BLU_MED, alignment=TA_CENTER,
                                           spaceAfter=2, spaceBefore=4)))

    add_rows = [["Descrizione", "Importo"]]
    n_palm = c.get('n_palmari', 0)
    add_palm = c.get('addebiti_palmari', 0)
    if n_palm or add_palm:
        add_rows.append([f"Noleggio Palmari (N. {n_palm})", _euro(add_palm)])

    for m in c.get('dettagli_mezzi', []):
        add_rows.append([f"Noleggio Mezzo {m.get('targa','')} ({m.get('tipologia','')})",
                         _euro(m.get('importo', 0))])

    for item in c.get('altri_addebiti', []):
        add_rows.append([item.get('descrizione', ''), _euro(item.get('importo', 0))])

    if len(add_rows) > 1:
        add_rows.append(["", ""])
        add_rows.append(["TOTALE ADDEBITI", _euro(c.get('totale_addebiti', 0))])

        t2 = Table(add_rows, colWidths=[130*mm, 40*mm])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BLU_GLS),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, GRIGIO]),
            ('BACKGROUND', (0, -1), (-1, -1), ROSSO_L),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t2)
        story.append(Spacer(1, 4*mm))

    # ── Compensazioni/Fatture fine mese ───────────────────────────
    ffm = c.get('fatture_fine_mese', [])
    if ffm:
        story.append(Paragraph("FATTURE E COMPENSAZIONI",
                                ParagraphStyle('sec', fontSize=10, textColor=colors.white,
                                               backColor=BLU_MED, alignment=TA_CENTER,
                                               spaceAfter=2, spaceBefore=4)))
        ffm_rows = [["Descrizione", "Importo"]]
        for item in ffm:
            ffm_rows.append([item.get('descrizione', ''), _euro(item.get('importo', 0))])
        t3 = Table(ffm_rows, colWidths=[130*mm, 40*mm])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BLU_GLS),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [VERDE, colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(t3)
        story.append(Spacer(1, 4*mm))

    # ── TOTALE DA BONIFICARE ─────────────────────────────────────
    bon = c.get('totale_da_bonificare', 0)
    bon_color = VERDE if bon >= 0 else ROSSO_L
    story.append(Table(
        [["TOTALE DA BONIFICARE", _euro(bon)]],
        colWidths=[130*mm, 40*mm],
        style=TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bon_color),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 13),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 1, BLU_GLS),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ])
    ))

    # Note
    if c.get('note_varie'):
        story.append(Spacer(1, 3*mm))
        story.append(Paragraph(f"<i>Note: {c['note_varie']}</i>",
                                ParagraphStyle('note', fontSize=8,
                                               textColor=colors.HexColor('#595959'))))

    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=BLU_MED))


def export_pdf_single(padroncino_id: str, mese: str, anno: int, output_path: str = None) -> str:
    if not REPORTLAB_OK:
        raise ImportError("reportlab non disponibile")

    padroncini = {p['id']: p for p in load_padroncini()}
    conteggi   = {c['padroncino_id']: c
                  for c in load_conteggi()
                  if c.get('mese') == mese and c.get('anno') == anno}

    p = padroncini.get(padroncino_id)
    if not p:
        raise ValueError(f"Padroncino non trovato: {padroncino_id}")

    if not output_path:
        exports_dir = Path(__file__).parent.parent / "exports"
        exports_dir.mkdir(exist_ok=True)
        safe = p['nome'].replace(' ', '_').replace('/', '_')[:30]
        output_path = str(exports_dir / f"GLS_{mese}_{anno}_{safe}.pdf")

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    story = []
    _build_padroncino_pdf(story, p, conteggi.get(padroncino_id), mese, anno, styles)
    doc.build(story)
    print(f"PDF salvato: {output_path}")
    return output_path


def export_pdf_all(mese: str, anno: int, output_path: str = None) -> str:
    """Esporta un PDF con tutti i padroncini"""
    if not REPORTLAB_OK:
        raise ImportError("reportlab non disponibile")

    padroncini = load_padroncini()
    conteggi   = {c['padroncino_id']: c
                  for c in load_conteggi()
                  if c.get('mese') == mese and c.get('anno') == anno}

    if not output_path:
        exports_dir = Path(__file__).parent.parent / "exports"
        exports_dir.mkdir(exist_ok=True)
        output_path = str(exports_dir / f"GLS_{mese}_{anno}_TUTTI.pdf")

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    story = []

    # Cover page
    story.append(Spacer(1, 40*mm))
    story.append(Paragraph(
        "GLS – GESTIONE PADRONCINI",
        ParagraphStyle('cover_title', fontSize=22, textColor=BLU_GLS,
                       alignment=TA_CENTER, fontName='Helvetica-Bold')
    ))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph(
        f"{mese} {anno}",
        ParagraphStyle('cover_sub', fontSize=16, textColor=BLU_MED,
                       alignment=TA_CENTER)
    ))
    story.append(Spacer(1, 10*mm))

    # Riepilogo table on cover
    riepilogo_rows = [["Fornitore", "Fatturato", "Addebiti", "Da Bonificare", "Stato"]]
    for p in padroncini:
        c = conteggi.get(p['id'], {})
        riepilogo_rows.append([
            p['nome'],
            _euro(c.get('totale_imponibile', 0)),
            _euro(c.get('totale_addebiti', 0)),
            _euro(c.get('totale_da_bonificare', 0)),
            p.get('stato', ''),
        ])

    t_cov = Table(riepilogo_rows, colWidths=[55*mm, 30*mm, 30*mm, 35*mm, 22*mm])
    t_cov.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLU_GLS),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (-2, -1), 'RIGHT'),
        ('ALIGN', (-1, 0), (-1, -1), 'CENTER'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GRIGIO]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_cov)
    story.append(PageBreak())

    # Individual pages
    for i, p in enumerate(padroncini):
        _build_padroncino_pdf(story, p, conteggi.get(p['id']), mese, anno, styles)
        if i < len(padroncini) - 1:
            story.append(PageBreak())

    doc.build(story)
    print(f"PDF completo salvato: {output_path}")
    return output_path
