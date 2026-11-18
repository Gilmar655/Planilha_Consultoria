"""Extrai das abas da Planilha de Planejamento START só as tabelas usadas pelo painel,
no mesmo formato que o leitor de .xlsx do navegador produz (datas dd/mm/aaaa, horas hh:mm).
Não inclui: LOG_USUARIOS, Controle de Acesso, cadastro nominal de funcionários (Table10), colunas Username."""
import json, sys, datetime, openpyxl
from openpyxl.utils import range_boundaries

SRC = sys.argv[1]
OUT = sys.argv[2]
wb = openpyxl.load_workbook(SRC, data_only=True)

DROP = {'Username', 'Plan_Servico_$', 'Atividade', 'Plano de Ação', 'Início real (Hora)', 'Término real (Hora)',
        'Atraso término (h)', 'Tipo de Intervenção', 'Momento da ação', 'DATA DA AÇÃO', 'Data/Hora Alt. Resumo Contratada',
        'DESCRIÇÃO DA RESTRIÇÃO_'}


def cv(v):
    if isinstance(v, datetime.datetime):
        return v.strftime('%d/%m/%Y') + (v.strftime(' %H:%M') if (v.hour or v.minute) else '')
    if isinstance(v, datetime.date):
        return v.strftime('%d/%m/%Y')
    if isinstance(v, datetime.time):
        return v.strftime('%H:%M')
    if isinstance(v, float):
        return round(v, 6)
    if isinstance(v, str):
        return v.replace('\xa0', ' ').strip()
    return '' if v is None else v


def table(sheet, tname, maxrows=None, keep_empty_cols=False):
    ws = wb[sheet]
    c1, r1, c2, r2 = range_boundaries(ws.tables[tname].ref)
    rows = [list(r) for r in ws.iter_rows(min_row=r1, max_row=r2, min_col=c1, max_col=c2, values_only=True)]
    hdr = [str(h).strip() if h is not None else '' for h in rows[0]]
    data = [r for r in rows[1:] if any(v not in (None, '') for v in r)]
    if maxrows:
        data = data[:maxrows]
    keep = [i for i, h in enumerate(hdr) if h not in DROP and (keep_empty_cols or any(r[i] not in (None, '') for r in data))]
    out = [[hdr[i] for i in keep]] + [[cv(r[i]) for i in keep] for r in data]
    # corta vazios à direita
    out = [r[:max((k + 1 for k, c in enumerate(r) if c not in ('', None)), default=0)] for r in out]
    return {'aba': sheet, 'tabela': tname, 'rows': out}


def area(sheet, ref):
    ws = wb[sheet]
    c1, r1, c2, r2 = range_boundaries(ref)
    rows = [[cv(v) for v in r] for r in ws.iter_rows(min_row=r1, max_row=r2, min_col=c1, max_col=c2, values_only=True)]
    return {'aba': sheet, 'tabela': ref, 'rows': [r for r in rows if any(c != '' for c in r)]}


ver = wb['Verificação']
data = {
    'fonte': (sys.argv[3] if len(sys.argv) > 3 else SRC.split('/')[-1]),
    'verificacao_titulo': cv(ver['A1'].value), 'verificacao_resumo': cv(ver['A2'].value),
    'abas': [
        table('Histórico', 'tbHistórico'),
        table('Base Programada', 'tbProgramação'),
        table('CARTEIRA', 'tbCarteira'),
        table('Planilha de Restrição', 'tbRestrição'),
        table('Histórico Restrições', 'tbRestrição6'),
        table('Semanas Programadas', 'Table14', keep_empty_cols=True),
        table('Equipes Mobilizadas', 'tbEquipesMobilizadas', keep_empty_cols=True),
        table('Registros Semanais', 'Table15', maxrows=None),
        {**table('Auxiliar ListSusp', 'tbEquipes', keep_empty_cols=True), 'aba': 'Auxiliar ListSusp · Equipes'},
        {**table('Auxiliar ListSusp', 'tbParametros'), 'aba': 'Auxiliar ListSusp · Parâmetros'},
        area('Verificação', f'A3:E{ver.max_row}'),
        area('Instruções', f'A1:F{wb["Instruções"].max_row}'),
        area('Equipes programadas', 'A1:L9'),
    ],
}
# Registros Semanais: só linhas com Semana preenchida
rs = next(a for a in data['abas'] if a['aba'] == 'Registros Semanais')
rs['rows'] = [rs['rows'][0]] + [r for r in rs['rows'][1:] if r and r[0] != '']
s = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
open(OUT, 'w', encoding='utf-8').write(s)
print('bytes', len(s.encode()))
for a in data['abas']:
    print(f"{a['aba']:<32} {len(a['rows']) - 1:>6} linhas  {len(a['rows'][0])} colunas")
