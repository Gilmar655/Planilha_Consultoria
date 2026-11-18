"""Escolhe a planilha mais recente do repositório, gera o index.html e escreve um resumo.
Usado pelo robô do GitHub (.github/workflows/atualizar-site.yml), mas também roda no computador:
    python ferramentas/atualizar_site.py [planilha.xlsm]
"""
import os, sys, subprocess, pathlib, json, re

raiz = pathlib.Path(__file__).resolve().parent.parent
os.chdir(raiz)


def git(*a):
    return subprocess.run(['git', *a], capture_output=True, text=True).stdout


def escolher():
    if len(sys.argv) > 1:
        return pathlib.Path(sys.argv[1])
    # 1) planilha enviada no último push (se o robô informar o intervalo)
    antes, depois = os.environ.get('ANTES', ''), os.environ.get('DEPOIS', 'HEAD')
    if antes and not re.fullmatch(r'0+', antes):
        alt = [l for l in git('diff', '--name-only', '-z', '--diff-filter=AM', antes, depois).split('\0') if l]
        alt = [p for p in alt if p.lower().endswith(('.xlsm', '.xlsx')) and not p.startswith('versao-anterior')]
        if alt:
            return pathlib.Path(alt[0])
    # 2) senão, a planilha com o commit mais recente
    cands = []
    for p in [l for l in git('ls-files', '-z').split('\0') if l.lower().endswith(('.xlsm', '.xlsx')) and not l.startswith('versao-anterior')]:
        ts = git('log', '-1', '--format=%ct', '--', p).strip() or '0'
        cands.append((int(ts), p))
    if not cands:
        sys.exit('Nenhuma planilha .xlsm/.xlsx encontrada no repositório.')
    return pathlib.Path(sorted(cands)[-1][1])


arq = escolher()
print(f'Planilha escolhida: {arq}')
r = subprocess.run([sys.executable, '-I', str(raiz / 'ferramentas' / 'build.py'), str(arq), 'index.html', arq.name], capture_output=True, text=True)
print(r.stdout)
if r.returncode != 0:
    print(r.stderr[-3000:])
    sys.exit('Falha ao gerar o site: confira se o arquivo é a Planilha de Planejamento START e se as abas/tabelas não foram renomeadas.')

# resumo para o log do robô
html = pathlib.Path('index.html').read_text(encoding='utf-8')
m = re.search(r'window\.BASE = (\{.*?\});</script>', html, re.S)
base = json.loads(m.group(1))
lin = {a['aba']: len(a['rows']) - 1 for a in base['abas']}
linhas = [f"## Site atualizado a partir de `{arq.name}`", '',
          '| Aba | Linhas lidas |', '|---|---:|'] + [f'| {k} | {v} |' for k, v in lin.items()] + ['', '### Conferências']
for a in base.get('achados', []):
    icone = {'ok': '✅', 'info': 'ℹ️', 'warn': '⚠️', 'crit': '❌'}.get(a['nivel'], '•')
    linhas.append(f"- {icone} **{a['titulo']}**: {a['texto']}")
resumo = '\n'.join(linhas)
print(resumo)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
        f.write(resumo + '\n')
