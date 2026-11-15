#!/usr/bin/env python3
"""Génère docs/tableau-des-scores.pdf (+ .png) à partir de data/golf.json.

Usage : python3 tools/gen_tableau.py   (nécessite google-chrome et pdftoppm)
"""
import json, os, subprocess, base64, html, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = json.load(open(os.path.join(ROOT, 'data', 'golf.json'), encoding='utf-8'))
NAMES = ['Vic', 'Nico', 'Jef', 'JC', 'Sam']
DUO = [('Vic', 'Nico'), ('Jef', 'JC'), ('Vic', 'Sam'), ('Nico', 'Jef'), ('JC', 'Sam'), ('Vic', 'Jef')]
DAYS = ['Dim. 24/01', 'Lun. 25/01', 'Mar. 26/01', 'Mer. 27/01', 'Jeu. 28/01', 'Ven. 29/01']


def team(p, d):
    return 'ROUGE' if p in DUO[d] else 'BLEUE'


def fr(v, dec=None):
    if v is None or v == '':
        return ''
    if dec is not None:
        v = round(float(v), dec)
    s = ('%g' % float(v)) if isinstance(v, (int, float)) else str(v)
    return s.replace('.', ',')


rows = {r['nom']: r for r in G.get('classement', [])}
idx = G.get('index', {})
order = sorted(NAMES, key=lambda n: (rows.get(n, {}).get('total') is None, rows.get(n, {}).get('total') or 0, NAMES.index(n)))
played_any = any(r.get('total') is not None for r in rows.values())

logo = base64.b64encode(open(os.path.join(ROOT, 'logo-sm.png'), 'rb').read()).decode()

head = ''.join(f'<th colspan="3" class="ph">PARTIE {d+1}<small>{DAYS[d]}</small></th>' for d in range(6))
sub = ''.join('<th class="s">BRUT<span>/hcp</span></th><th class="s">NET</th><th class="s">BONUS</th>' for _ in range(6))
body = ''
for i, n in enumerate(order):
    r = rows.get(n, {})
    parts = r.get('parties', []) or []
    cells = ''
    for d in range(6):
        t = team(n, d)
        c = 'bl' if t == 'BLEUE' else 'rd'
        x = parts[d] if d < len(parts) and parts[d] else {}
        played = x.get('brut') is not None
        hcp = x.get('hcp')
        if hcp is None and d == 0:
            hcp = idx.get(n)
        if hcp is None and d > 0 and d - 1 < len(parts) and parts[d - 1] and parts[d - 1].get('brut') is not None and parts[d - 1].get('par') is not None:
            hcp = parts[d - 1]['brut'] - parts[d - 1]['par']
        brut = fr(x.get('brut')) if played else ''
        net = fr(x.get('net')) if played else ''
        bonus = ('−' + fr(x.get('bonus'))) if played and x.get('bonus') else ('—' if played else '')
        cells += (f'<td class="brut {c}"><span class="tag">{t}</span><b>{brut}</b><span class="hc">{fr(hcp) if hcp is not None else ("index" if d == 0 else "hcp")}</span></td>'
                  f'<td class="{c} n">{net}</td><td class="{c} bo">{bonus}</td>')
    tot = fr(r.get('total')) if r.get('total') is not None else ''
    rk = str(i + 1) if played_any and r.get('total') is not None else '–'
    body += f'<tr><td class="rk">{rk}</td><td class="nm">{html.escape(n)}</td>{cells}<td class="tot">{tot}</td></tr>'

P = G.get('parties', []) or []
def foot(label, cls, key):
    out = f'<tr class="tr"><td></td><td class="tl {cls}">{label}</td>'
    for d in range(6):
        v = P[d].get(key) if d < len(P) and P[d] else None
        out += f'<td colspan="3" class="tv">{fr(v) if v is not None else ""}</td>'
    return out
win = '<tr class="tr"><td></td><td class="tl">Bonus</td>'
for d in range(6):
    x = P[d] if d < len(P) and P[d] else {}
    g = x.get('gagnant')
    win += f'<td colspan="3" class="tv l">gagnant : <b>{html.escape(str(g)) if g else ""}</b>{(" · −" + fr(x.get("bonus"))) if x.get("bonus") else ""}</td>'
foot_rows = foot('Moy. Bleue <small>(÷3)</small>', 'lb', 'moyBleue') + '<td></td></tr>' + \
    foot('Moy. Rouge <small>(÷2)</small>', 'lr', 'moyRouge') + '<td></td></tr>' + win + '<td></td></tr>'

maj = G.get('majLe')
doc = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Tableau des scores AG 2027</title><style>
@page {{ size: A4 landscape; margin: 9mm 9mm 8mm; }}
body {{ margin:0; font-family: Inter, 'Helvetica Neue', Arial, sans-serif; color:#0A1630; }}
.top {{ display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0A1630; padding-bottom:6px; margin-bottom:8px }}
.kick {{ font-size:8pt; letter-spacing:3px; color:#B8892B; font-weight:700 }}
h1 {{ margin:2px 0 2px; font-size:18pt }}
.sub {{ font-size:8.5pt; color:#444 }}
.top img {{ width:58px; height:58px }}
table {{ width:100%; border-collapse:collapse; table-layout:fixed; font-size:8pt }}
th {{ background:#0A1630; color:#fff; font-weight:700; padding:3px 2px; border:1px solid #fff }}
th.ph small {{ display:block; font-weight:400; font-size:6.5pt; color:#E9C977 }}
th.s {{ font-size:6.5pt; background:#1B2F5E }} th.s span {{ font-size:5.5pt; font-weight:400 }}
th.rk, th.tot {{ background:#C9A24A; color:#0A1630 }}
td {{ border:1px solid #d5d9e3; text-align:center; height:46px; padding:0 2px }}
td.rk {{ font-size:16pt; font-weight:800; background:#F2F4F8 }}
td.nm {{ font-size:11pt; font-weight:700; text-align:left; padding-left:6px; background:#F2F4F8 }}
.bl {{ background:#E6EFFB }} .rd {{ background:#FBE6E8 }}
td.brut {{ position:relative }}
td.brut .tag {{ position:absolute; top:1px; left:2px; font-size:5pt; font-weight:700; color:#5B6B8C }}
td.rd.brut .tag {{ color:#B83A48 }}
td.brut b {{ font-size:11pt }}
td.brut .hc {{ position:absolute; bottom:1px; right:2px; font-size:6.5pt; color:#B8892B; font-weight:700 }}
td.n {{ font-size:10pt; font-weight:600 }} td.bo {{ font-size:9pt; color:#2E7D4F; font-weight:700 }}
td.tot {{ background:#FBF3DF; font-size:12pt; font-weight:800 }}
tr.tr td {{ height:24px; font-size:8pt }} td.tl {{ text-align:left; padding-left:6px; font-weight:700 }}
td.lb {{ color:#1F3E7A; background:#E6EFFB }} td.lr {{ color:#B83A48; background:#FBE6E8 }}
td.tv.l {{ text-align:left; padding-left:6px }}
td.leg {{ font-size:6.5pt; font-style:italic; color:#444; text-align:left }}
.legend {{ margin-top:8px; font-size:7.5pt; line-height:1.5; color:#333 }}
.foot {{ margin-top:6px; display:flex; justify-content:space-between; font-size:7pt; color:#666; font-style:italic }}
</style></head><body>
<div class="top"><div><div class="kick">TOURNOI OFFICIEL · GOLF &amp; CONVIVIALITÉ</div><h1>Feuille de Scores &amp; Classement Général</h1>
<div class="sub">AG 2027 — Île Maurice · 5 joueurs · Suivi des 6 parties : handicap du jour, score net, bonus d'équipe et cumul{(' · mis à jour le ' + html.escape(maj)) if maj else ''}</div></div>
<img src="data:image/png;base64,{logo}" alt=""></div>
<table><colgroup><col style="width:3.2%"><col style="width:6.5%">{'<col><col><col>' * 6}<col style="width:6.5%"></colgroup>
<thead><tr><th class="rk" rowspan="2">RANG</th><th rowspan="2">JOUEUR</th>{head}<th class="tot" rowspan="2">TOTAL<br>CUMULÉ</th></tr><tr>{sub}</tr></thead>
<tbody>{body}{foot_rows}</tbody></table>
<div class="legend"><b>BRUT / hcp</b> : score brut en grand · en petit dans le coin, le handicap du jour (P1 = index, P2 à P6 = Brut de la veille − Par) &nbsp; <b>NET</b> : Brut − hcp du jour<br>
<b>ÉQUIPES</b> : Bleue = 3 joueurs, Rouge = 2 joueurs, comparées sur leur moyenne nette &nbsp; <b>BONUS</b> : moyenne perdante − moyenne gagnante (arrondi au dixième), déduit du net de chaque gagnant (perdants inchangés) &nbsp; <b>TOTAL CUMULÉ</b> : Σ des 6 (Net − Bonus) — le plus bas remporte le séjour</div>
<div class="foot"><span>AG 2027 — Île Maurice · Feuille de scores · Version 5 joueurs</span><span>Lignes triées par classement général · Bleu / Rouge = équipe du joueur pour la partie</span></div>
</body></html>"""

out_pdf = os.path.join(ROOT, 'docs', 'tableau-des-scores.pdf')
with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f:
    f.write(doc); tmp = f.name
subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
                '--print-to-pdf=' + out_pdf, 'file://' + tmp], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
subprocess.run(['pdftoppm', '-r', '170', '-png', '-singlefile', '-f', '1', '-l', '1', out_pdf, os.path.join(ROOT, 'docs', 'tableau-des-scores')], check=True)
os.unlink(tmp)
try:
    from PIL import Image, ImageOps
    png = os.path.join(ROOT, 'docs', 'tableau-des-scores.png')
    im = Image.open(png).convert('RGB')
    box = ImageOps.invert(im).getbbox()
    if box:
        m = 30
        im.crop((max(0, box[0] - m), max(0, box[1] - m), min(im.width, box[2] + m), min(im.height, box[3] + m))).save(png, optimize=True)
except ImportError:
    pass
print('OK', out_pdf)
