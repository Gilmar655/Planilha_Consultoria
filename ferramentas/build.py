"""Gera o index.html autônomo a partir da Planilha de Planejamento START.
Uso: python build.py <planilha.xlsm> [saida.html]"""
import sys, json, datetime, pathlib, subprocess, openpyxl
from collections import defaultdict
from openpyxl.utils import range_boundaries

here = pathlib.Path(__file__).parent
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else str(here / 'dist' / 'index.html')
NOME = sys.argv[3] if len(sys.argv) > 3 else pathlib.Path(SRC).name
tmp = here / 'base.tmp.json'
subprocess.run([sys.executable, '-I', str(here / 'extrair.py'), SRC, str(tmp), NOME], check=True, stderr=subprocess.DEVNULL)
data = json.loads(tmp.read_text(encoding='utf-8')); tmp.unlink()
wb = openpyxl.load_workbook(SRC, data_only=True)


def tab(sh, tn):
    ws = wb[sh]; c1, r1, c2, r2 = range_boundaries(ws.tables[tn].ref)
    rows = list(ws.iter_rows(min_row=r1, max_row=r2, min_col=c1, max_col=c2, values_only=True))
    H = [str(h) for h in rows[0]]
    return [dict(zip(H, r)) for r in rows[1:]]


def nonempty(ws):
    return sum(1 for r in ws.iter_rows(values_only=True) if any(v not in (None, '') for v in r))


DESC = {
    'Instruções': ('Manual da planilha: fluxo semanal, regras de preenchimento, status, termos e botões.', 'Usado para as definições do painel (status, aderência, % eliminadas).'),
    'CARTEIRA': ('Carteira de obras da Start (tbCarteira): dados ENEL, prazo, priorização, Resumo Contratada, Status Obra e dados do SIGEO.', 'Aba Carteira, Histórico por projeto.'),
    'Registros Semanais': ('Indicadores semanais (fora/no prazo, vencimentos, horizonte, aderência, eliminação de restrições).', 'Lida; mostrada em Qualidade e abas (achados).'),
    'Auxiliar ListSusp': ('Listas de validação, cadastro de equipes, pesos por tipo de equipe e parâmetros (meta, produtividade).', 'Cadastro de equipes e parâmetros. O cadastro nominal de funcionários (com registro) NÃO é exibido.'),
    'Base Programada': ('Programação da semana atual e futuras, uma linha por equipe (tbProgramação).', 'Visão geral, Equipes, Histórico por projeto, Base detalhada.'),
    'Analise_core team': ('Quadro semanal/mensal calculado (UPS, status, aderência, restrições, produtividade).', 'Não usada: o painel recalcula a partir das linhas. Comparada em Achados.'),
    'Equipes programadas': ('Grade equipe × dia da semana escolhida, com UPS e meta da semana.', 'Não usada diretamente: a aba Equipes do painel recalcula a escala para qualquer período.'),
    'Planilha de Restrição': ('Restrições das obras programadas, por semana (tbRestrição).', 'Aba Restrições, Histórico por projeto.'),
    'Painel Restrições': ('Visão das restrições: % eliminadas da próxima semana (meta 90%) e pendências por obra.', 'Recalculado na aba Restrições com a mesma regra.'),
    'Semanas Programadas': ('Resumo semanal: equipes, mínimo UPS, UPS programado/executado, obras, prazo e desempenho.', 'Gráfico de desempenho semanal; conferência dos totais.'),
    'Auxiliar Rest.': ('Lista padrão de restrições e área responsável por cada uma.', 'Não exibida (lista de apoio).'),
    'Histórico': ('Semanas anteriores arquivadas da Base Programada (tbHistórico).', 'Visão geral, Equipes, Histórico por projeto, Base detalhada.'),
    'Histórico Restrições': ('Restrições de semanas encerradas (tbRestrição6).', 'Aba Restrições, Histórico por projeto.'),
    'LOG_USUARIOS': ('Registro de quem abriu a planilha (data, e-mail, usuário Windows).', 'Não exibida: dados de acesso de pessoas.'),
    'Causas Cancel-Parcial': ('Quadro de cancelamentos e parciais por causa, para uma semana escolhida.', 'Recalculado nos gráficos de causas. Ver Achados.'),
    'Controle de Acesso': ('Configuração de perfis e bloqueios (grupos, domínios de e-mail, colunas bloqueadas).', 'Não exibida: configuração de segurança.'),
    'Verificação': ('Verificação de consistência gerada pela macro da planilha.', 'Mostrada como está em Qualidade e abas.'),
    'Equipes Mobilizadas': ('Equipes mobilizadas por mês (LM/LV), meta mensal, UPS executado e desempenho.', 'Tabela na Visão geral.'),
}
inv = [{'aba': ws.title, 'vis': 'Visível' if ws.sheet_state == 'visible' else 'Oculta', 'linhas': nonempty(ws),
        'conteudo': DESC.get(ws.title, ('', ''))[0], 'uso': DESC.get(ws.title, ('', ''))[1]} for ws in wb.worksheets]

# ---------- achados (comparações feitas no próprio arquivo) ----------
achados = []
H = tab('Histórico', 'tbHistórico'); B = tab('Base Programada', 'tbProgramação')
num = lambda v: v if isinstance(v, (int, float)) else 0
wk = defaultdict(lambda: [0.0, 0.0])
for r in H + B:
    if r.get('Semana'):
        wk[(r['Ano'], r['Semana'])][0] += num(r['Quantidade de UPS por Equipe']); wk[(r['Ano'], r['Semana'])][1] += num(r['Qtd UPS executado'])
SP = [r for r in tab('Semanas Programadas', 'Table14') if r.get('Semana do ano')]
dif = [f"S{r['Semana do ano']}" for r in SP if (r['Ano'], r['Semana do ano']) in wk and (abs(wk[(r['Ano'], r['Semana do ano'])][0] - num(r['UPS Programado'])) > 0.05 or abs(wk[(r['Ano'], r['Semana do ano'])][1] - num(r['UPS executado'])) > 0.05)]
comp = sum(1 for r in SP if (r['Ano'], r['Semana do ano']) in wk)
achados.append({'nivel': 'ok' if not dif else 'warn', 'titulo': 'Semanas Programadas confere com as linhas',
                'texto': f"Recalculei UPS programado e executado de {comp} semanas a partir do Histórico + Base Programada. " + ('Todas batem com a aba Semanas Programadas.' if not dif else 'Divergem: ' + ', '.join(dif) + '.')})
ac = wb['Analise_core team']
row = {}
for r in range(1, ac.max_row + 1):
    if ac.cell(r, 1).value and ac.cell(r, 1).value not in row: row[ac.cell(r, 1).value] = r
if 'Semanas' in row and 'UPS Programada' in row:
    spm = {r['Semana do ano']: num(r['UPS Programado']) for r in SP if r['Ano'] == 2026}
    div = []
    for c in range(2, ac.max_column + 1):
        w = ac.cell(row['Semanas'], c).value; v = ac.cell(row['UPS Programada'], c).value
        if isinstance(w, int) and w in spm and isinstance(v, (int, float)) and abs(v - spm[w]) > 0.05:
            div.append(f"S{w} ({v:,.0f} × {spm[w]:,.0f})".replace(',', '.'))
    if div:
        achados.append({'nivel': 'warn', 'titulo': 'Aba oculta "Analise_core team" desatualizada',
                        'texto': f"O UPS programado por semana nessa aba difere da aba Semanas Programadas em {len(div)} semana(s): " + '; '.join(div) + '. Valores entre parênteses: Analise_core team × Semanas Programadas. Use Semanas Programadas (ou este painel) como referência.'})
cc = wb['Causas Cancel-Parcial']
semcc = cc['B2'].value; tot = cc['D14'].value
bw = sorted({r['Semana'] for r in B if r.get('Semana')})
if semcc is not None:
    achados.append({'nivel': 'info' if tot else 'warn', 'titulo': f'Aba "Causas Cancel-Parcial" aponta para a semana {semcc}',
                    'texto': f"O quadro usa só a Base Programada, que hoje tem as semanas {bw[0]} a {bw[-1]}. Por isso a semana {semcc} aparece com total {tot}. As linhas dessa semana já foram para o Histórico. Os gráficos de causas deste painel usam Histórico + Base."})
RS = tab('Registros Semanais', 'Table15')
filled = [r for r in RS if r.get('Semana')]
achados.append({'nivel': 'info', 'titulo': 'Aba oculta "Registros Semanais"',
                'texto': f"A tabela tem {len(RS)} linhas, mas só {len(filled)} com semana preenchida (semanas {filled[0]['Semana']} a {filled[-1]['Semana']} de {filled[-1]['Ano']}). As demais só têm \"Start\" na coluna Empreiteira_Contratos."})
ep = wb['Equipes programadas']
grade = []
for r in range(1, ep.max_row + 1):
    v = ep.cell(r, 2).value
    if isinstance(v, str) and v.strip().lower().startswith('equipes programadas no dia'):
        break
    if r > 10 and v:
        grade.append(str(v).strip())
cad = [str(r['Equipes']).strip() for r in tab('Auxiliar ListSusp', 'tbEquipes') if r.get('Equipes')]
fora = [c for c in cad if c not in grade]
if fora:
    semep = ep['E8'].value
    usados = sorted({str(r['Equipes']).strip() for r in B if r.get('Semana') == semep and str(r.get('Equipes') or '').strip() in fora})
    achados.append({'nivel': 'warn', 'titulo': 'Aba "Equipes programadas" não mostra todas as equipes do cadastro',
                    'texto': f"A grade da aba tem {len(grade)} equipes ({grade[0]} a {grade[-1]}). Ficam de fora {', '.join(fora)}, que estão no cadastro" + (f" e têm programação na semana {semep} ({', '.join(usados)})" if usados else '') + ". Por isso a linha \"Equipes programadas no dia\" da planilha conta menos equipes que a Base Programada. A seção Equipes programadas deste painel considera todas as equipes."})
pr = wb['Painel Restrições']
achados.append({'nivel': 'info', 'titulo': 'Painel Restrições (como está na planilha)',
                'texto': f"Semana atual {pr['B6'].value}, próxima semana {pr['F6'].value}: {pr['J7'].value} ({num(pr['J6'].value)*100:.1f}%), {pr['N6'].value}; {pr['R6'].value} pendentes {str(pr['R7'].value)}. A aba Restrições deste painel usa a mesma regra."})
EM = tab('Equipes Mobilizadas', 'tbEquipesMobilizadas')
sem_eq = [r['Mês'].strftime('%m/%Y') for r in EM if num(r.get('UPS executado no mês')) > 0 and not r.get('Total de equipes')]
if sem_eq:
    achados.append({'nivel': 'warn', 'titulo': 'Equipes Mobilizadas: mês com UPS executado e sem equipes informadas',
                    'texto': 'Meses: ' + ', '.join(sem_eq) + '. Sem a quantidade de equipes, o desempenho mensal fica vazio. A A&M preenche essa aba no início de cada mês.'})
achados.append({'nivel': 'info', 'titulo': 'Abas lidas e não exibidas',
                'texto': 'LOG_USUARIOS (registro de acesso de pessoas), Controle de Acesso (configuração de segurança) e o cadastro nominal de funcionários da aba Auxiliar ListSusp foram lidos, mas ficam fora do painel por conterem dados de acesso e de pessoas.'})

data['inventario'] = inv
data['achados'] = achados
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
data['gerado'] = now.strftime('%d/%m/%Y %H:%M')
src = here / 'src'
html = (src / 'index.template.html').read_text(encoding='utf-8')
for k, v in {'/*CSS*/': (src / 'style.css').read_text(encoding='utf-8'),
             '/*DATA*/': json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'),
             '/*IO*/': (src / 'io.js').read_text(encoding='utf-8'), '/*DATAJS*/': (src / 'data.js').read_text(encoding='utf-8'),
             '/*CHARTS*/': (src / 'charts.js').read_text(encoding='utf-8'), '/*APP*/': (src / 'app.js').read_text(encoding='utf-8'),
             '{{VERSAO}}': now.strftime('%Y.%m.%d-%H%M')}.items():
    html = html.replace(k, v)
pathlib.Path(OUT).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(OUT).write_text(html, encoding='utf-8')
print('ok', OUT, len(html.encode()))
for a in achados: print('-', a['titulo'], '|', a['texto'][:220])
