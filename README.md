# Planejamento START · Programação e Execução

Painel estático (HTML + CSS + JavaScript num único `index.html`, sem servidor) feito a partir da **Planilha de Planejamento START** (.xlsm). A planilha em si **não fica no repositório**: o robô gera o site e apaga o arquivo, inclusive do histórico.

Desenvolvido por **Gilmar Campos**, Técnico – Gestão de Programação · Enel Brasil – Grids.

## Seções (cartões de acesso à esquerda)

| Seção | O que mostra |
|---|---|
| **Visão geral** | UPS programado × executado por semana e por mês, resultado por semana, desempenho semanal, causas de cancelamento/parcial, equipes mobilizadas, Semanas Programadas e a qualidade dos dados (verificações do painel, achados, aba Verificação, parâmetros e inventário das 18 abas). |
| **Instruções** | O manual da aba Instruções: fluxo da semana, regras de ouro, status, termos, botões e abas, com busca. |
| **Carteira** | Obras da aba CARTEIRA por Resumo Contratada, Status Obra, Priorização MV, vencimento, família, município e status no SIGEO. |
| **Base Programada** | Programação da semana atual e das próximas: UPS × mínimo da semana, UPS por dia, por encarregado e por família, restrições pendentes e equipes por dia. |
| **Equipes programadas** | Grade equipe × dia da semana escolhida, UPS e mínimo da semana, horizonte, escala com o resultado e cadastro de equipes. |
| **Planilha de Restrição** | % eliminadas por semana (meta 90%), situação por tipo, pendências por área, responsável e obra. |
| **Painel Restrições** | O mesmo cálculo da aba Painel Restrições: % eliminadas da próxima semana e pendências por obra nas próximas 8 semanas (Nova / Veio da sem. anterior). |

Todas as seções têm, no topo, uma **barra de filtros fixa** (continua visível ao rolar): busca, período, **Importar**, **Excel** e **CSV**. Cada grupo de filtro (Semana, Resultado, Família, Encarregado…) é um **menu suspenso** com caixas de seleção, contagem por opção e busca interna. Os filtros ativos aparecem como etiquetas removíveis. No fim da página fica a **aba original completa** da planilha (veja abaixo). Clicar num projeto abre o histórico dele (CARTEIRA + execuções + restrições).

## Aba original completa no rodapé de cada seção

No fim de cada seção aparece a aba correspondente da planilha **por inteiro**: todas as linhas e todas as colunas com conteúdo, com os valores e os formatos da planilha (%, casas decimais, datas e horas), sem colunas criadas pelo painel. A coluna "Linha" é o número da linha no Excel. Se a aba tiver conteúdo acima da tabela (títulos, parâmetros), ele aparece em "Conteúdo acima da tabela".

| Seção | Aba mostrada no rodapé |
|---|---|
| Visão geral | Histórico, com seletor para Semanas Programadas, Equipes Mobilizadas, Registros Semanais, Analise_core team, Causas Cancel-Parcial, Histórico Restrições, Verificação, Auxiliar Rest. e Auxiliar ListSusp |
| Instruções | Instruções |
| Carteira | CARTEIRA |
| Base Programada | Base Programada |
| Equipes programadas | Equipes programadas |
| Planilha de Restrição | Planilha de Restrição (e Histórico Restrições no seletor) |
| Painel Restrições | Painel Restrições |

- Por padrão a lista mostra **100% da aba**. A busca da própria lista e a opção "Aplicar os filtros do topo" reduzem as linhas exibidas, e o aviso mostra quantas de quantas.
- **Excel desta aba** baixa a aba completa (ou só as linhas filtradas, se houver filtro), com os mesmos formatos.
- Conferência feita célula por célula: das 17 abas exibidas, nenhuma célula falta e nenhuma foi criada. Vale tanto para a base publicada quanto para uma planilha importada pelo botão Importar.
- Ficam de fora só: **LOG_USUARIOS** (registro de acesso de pessoas), **Controle de Acesso** (configuração de segurança) e as colunas do cadastro nominal de funcionários da aba Auxiliar ListSusp (Table10: Equipes, Código, REGISTRO, NOME, CARGO, Horário de inicio).

## Regras de cálculo (as mesmas da planilha)

- **UPS programado** = soma de "Quantidade de UPS por Equipe". **UPS executado** = soma de "Qtd UPS executado". Os totais conferem com a aba Semanas Programadas nas 38 semanas.
- **Aderência** = linhas EXECUTADO ÷ linhas com Status finalização.
- **% restrições eliminadas** = Eliminadas ÷ (total − Não aplicável). **Pendente** = "Não eliminada" ou sem resposta. A conferência com o Painel Restrições bate nas 109 combinações obra × semana.

## Como atualizar os dados

### Atualização automática (robô do GitHub)

1. No repositório, clique em **Add file → Upload files**.
2. Arraste a planilha nova (.xlsm ou .xlsx) e clique em **Commit changes**. O nome do arquivo pode ser qualquer um.
3. Em cerca de 2 a 3 minutos o robô gera o site de novo, publica e **apaga a planilha do repositório e de todo o histórico**. Acompanhe na aba **Actions** do repositório: ✅ verde = publicado e planilha apagada.
4. O resumo de cada execução (aba Actions → execução → Summary) mostra quantas linhas foram lidas de cada aba e as conferências (ex.: Semanas Programadas confere com as linhas).

Entre o upload e o fim do robô (2 a 3 minutos) a planilha fica visível no repositório. Para ela nunca passar pelo GitHub, use a atualização pelo chat (abaixo).

Se o robô falhar (❌), ele apaga a planilha do mesmo jeito e o site fica como estava; confira o motivo no log e envie de novo.

Como a planilha é apagada a cada execução, **Run workflow** manual não tem planilha para ler: para gerar de novo, envie a planilha outra vez.

### Atualização pelo chat

Anexe a planilha nova na conversa com o Claude e peça para atualizar o site: ele gera, confere e publica só o `index.html`. A planilha não é enviada ao GitHub.

### Só para consulta, sem publicar

No site, clique em **Importar** e escolha a planilha. A leitura acontece no navegador: as macros não são executadas e nada é enviado para servidor nenhum. Com "Lembrar esta base" marcado, o painel abre com ela na próxima visita naquele navegador. Isso **não altera** o que está publicado.

### Gerar no computador (opcional)

```bash
pip install openpyxl
python ferramentas/atualizar_site.py "Planilha_de_Planejamento_START.xlsm"
```

## Atenção: repositório público

Este repositório é **público**. O `index.html` traz embutidos nomes de encarregados, códigos de projeto, bairros e municípios, justificativas e observações. A planilha .xlsm não fica no repositório (o robô a apaga, inclusive do histórico), porque contém a aba LOG_USUARIOS (e-mails e usuários de quem abriu a planilha), o Controle de Acesso e o cadastro de funcionários com número de registro. Confirme com a área responsável se os dados do `index.html` podem ficar públicos.

O painel deixa de fora LOG_USUARIOS, Controle de Acesso, o cadastro nominal de funcionários e as colunas Username.

## Estrutura

- `index.html`: o painel completo (dados, estilos e scripts embutidos).
- `assets/`: coloque aqui o `logo-enel.png`. Sem ele, aparece o selo em texto "Enel Brasil · Grids".
- `ferramentas/`: `atualizar_site.py` (usado pelo robô), `build.py`, `extrair.py` e o código-fonte em `src/`.
- `.github/workflows/atualizar-site.yml`: o robô que gera e publica o site quando uma planilha é enviada e depois apaga a planilha do repositório e do histórico.
- `versao-anterior-setembro-2026/`: o site que estava antes na raiz, guardado sem alterações.
- `.nojekyll`: publica os arquivos como estão no GitHub Pages.
