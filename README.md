# Planejamento START · Programação e Execução

Painel estático (HTML + CSS + JavaScript num único `index.html`, sem servidor) feito a partir da **Planilha de Planejamento START** (`20260224_Planilha de Planejamento_START.xlsm`).

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

Todas as seções têm, no topo, uma **barra de filtros fixa** (continua visível ao rolar): busca, período, **Importar**, **Excel** e **CSV**. Cada grupo de filtro (Semana, Resultado, Família, Encarregado…) é um **menu suspenso** com caixas de seleção, contagem por opção e busca interna. Os filtros ativos aparecem como etiquetas removíveis. No fim da página fica a **lista geral** dos registros. Clicar num projeto abre o histórico dele (CARTEIRA + execuções + restrições).

## Regras de cálculo (as mesmas da planilha)

- **UPS programado** = soma de "Quantidade de UPS por Equipe". **UPS executado** = soma de "Qtd UPS executado". Os totais conferem com a aba Semanas Programadas nas 38 semanas.
- **Aderência** = linhas EXECUTADO ÷ linhas com Status finalização.
- **% restrições eliminadas** = Eliminadas ÷ (total − Não aplicável). **Pendente** = "Não eliminada" ou sem resposta. A conferência com o Painel Restrições bate nas 109 combinações obra × semana.

## Como atualizar os dados

Abra o site, clique em **Importar planilha (.xlsm / .xlsx)** e escolha a versão mais nova. A leitura acontece no navegador: as macros não são executadas e nada é enviado para servidor nenhum. Com "Lembrar esta base" marcado, o painel abre com ela na próxima visita naquele navegador. A importação **não altera** o que está publicado aqui.

Para atualizar a versão publicada, gere um novo `index.html` e substitua o arquivo no repositório:

```bash
pip install openpyxl
python ferramentas/build.py "Planilha_de_Planejamento_START.xlsm" index.html "Planilha_de_Planejamento_START.xlsm"
```

## Atenção: repositório público

Este repositório é **público**. O `index.html` traz embutidos nomes de encarregados, códigos de projeto, bairros e municípios, justificativas e observações. O arquivo `.xlsm` na raiz contém ainda mais: a aba LOG_USUARIOS (e-mails e usuários de quem abriu a planilha) e o cadastro de funcionários com número de registro. Confirme com a área responsável se esses dados podem ficar públicos, ou torne o repositório privado.

O painel deixa de fora LOG_USUARIOS, Controle de Acesso, o cadastro nominal de funcionários e as colunas Username.

## Estrutura

- `index.html`: o painel completo (dados, estilos e scripts embutidos).
- `assets/`: coloque aqui o `logo-enel.png`. Sem ele, aparece o selo em texto "Enel Brasil · Grids".
- `ferramentas/`: `build.py`, `extrair.py` e o código-fonte em `src/`.
- `versao-anterior-setembro-2026/`: o site que estava antes na raiz, guardado sem alterações.
- `.nojekyll`: publica os arquivos como estão no GitHub Pages.
