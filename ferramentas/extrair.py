"""Extrai as abas da Planilha de Planejamento START por inteiro (todas as linhas e colunas com conteúdo,
inclusive células fora das tabelas), no mesmo formato que o leitor de .xlsx do navegador produz:
datas dd/mm/aaaa, horas hh:mm, números como números + código do formato de exibição (%, casas decimais).
Fica de fora apenas: LOG_USUARIOS e Controle de Acesso (dados de acesso) e as colunas do cadastro
nominal de funcionários (tabela Table10 da aba Auxiliar ListSusp, com número de registro)."""
import json, sys, re, datetime, openpyxl
from openpyxl.utils import range_boundaries

SRC, OUT = sys.argv[1], sys.argv[2]
NOME = sys.argv[3] if len(sys.argv) > 3 else SRC.split('/')[-1]
FORA = {'LOG_USUARIOS', 'Controle de Acesso'}
wb = openpyxl.load_workbook(SRC, data_only=True)


def fcode(f):
    """Código curto do formato numérico: p<n> = porcentagem com n casas; n<n>[t] = número com n casas (t = separador de milhar)."""
    if not f or f in ('General', '@'):
        return ''
    g = re.sub(r'"[^"]*"|\[[^\]]*\]|\\.|_.|\*.', '', f).split(';')[0]
    m = re.search(r'0\.(0+)', g)
    d = len(m.group(1)) if m else 0
    if '%' in g:
        return f'p{d}'
    if re.search(r'[0#]', g) and not re.search(r'[dmyhs]', g.lower()):
        return f'n{d}' + ('t' if ',' in g.split('.')[0] else '')
    return ''


def cv(v, nf=''):
    g0 = re.sub(r'"[^"]*"|\[[^\]]*\]', '', nf or '').lower()
    if isinstance(v, datetime.datetime) and 'h' in g0 and not re.search(r'[dy]', g0):
        return v.strftime('%H:%M')  # formato só de hora: o Excel mostra a hora (ex.: 25:00 em h:mm aparece como 1:00)
    if isinstance(v, datetime.datetime):
        if v.year < 1900:
            g = re.sub(r'"[^"]*"|\[[^\]]*\]', '', nf or '').lower()
            if re.search(r'[dy]', g):  # data "zero" do Excel (00/01/1900)
                return '00/01/1900' + (v.strftime(' %H:%M') if (v.hour or v.minute) else '')
            return v.strftime('%H:%M')
        return v.strftime('%d/%m/%Y') + (v.strftime(' %H:%M') if (v.hour or v.minute) else '')
    if isinstance(v, datetime.date):
        return v.strftime('%d/%m/%Y')
    if isinstance(v, datetime.time):
        return v.strftime('%H:%M')
    if isinstance(v, bool):
        return 'VERDADEIRO' if v else 'FALSO'
    if isinstance(v, float):
        return round(v, 10)
    if v is None:
        return ''
    return v


abas = []
for ws in wb.worksheets:
    if ws.title in FORA:
        continue
    blank = set()
    if ws.title == 'Auxiliar ListSusp' and 'Table10' in ws.tables:
        c1, r1, c2, r2 = range_boundaries(ws.tables['Table10'].ref)
        blank = set(range(c1, c2 + 1))
    rows, fmt = [], {}
    for r in ws.iter_rows():
        row = []
        for c in r:
            if c.column in blank or c.value in (None, ''):
                row.append('')
                continue
            val = cv(c.value, c.number_format)
            row.append(val)
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                code = fcode(c.number_format)
                if code:
                    fmt[f'{c.row - 1},{c.column - 1}'] = code
        while row and row[-1] == '':
            row.pop()
        rows.append(row)
    while rows and not rows[-1]:
        rows.pop()
    abas.append({'aba': ws.title, 'vis': 'Visível' if ws.sheet_state == 'visible' else 'Oculta', 'rows': rows, 'fmt': fmt,
                 'omitido': 'Colunas do cadastro nominal de funcionários (Table10: Equipes, Código, REGISTRO, NOME, CARGO, Horário de inicio) não são exibidas.' if blank else ''})

ver = wb['Verificação']
data = {'fonte': NOME, 'verificacao_titulo': cv(ver['A1'].value), 'verificacao_resumo': cv(ver['A2'].value),
        'abas': abas, 'fora': sorted(FORA & set(wb.sheetnames))}
s = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
open(OUT, 'w', encoding='utf-8').write(s)
print('bytes', len(s.encode()))
for a in abas:
    print(f"{a['aba']:<26} {sum(1 for r in a['rows'] if r):>6} linhas com dados  {max((len(r) for r in a['rows']), default=0)} colunas  {len(a['fmt'])} formatos")
