# Central de Programações — Start Engenharia | Enel Brasil

Site estático de consulta operacional criado a partir do arquivo fornecido `PROGRAMAÇÃO START(SETEMBRO 26).csv`. Interface em português, cores claras, gráficos dinâmicos, filtros, navegação por categorias, consulta individual de registros, relógio e data ao vivo (fuso de São Paulo), importação de CSV/Excel e exportação `.xlsx` ou `.csv`.

## Aviso de confidencialidade

**ANTES DE PUBLICAR:** os arquivos `dados/base.js`, `dados/base.json` e `dados/fonte_original_setembro_2026.csv` contêm dados de programação operacional (nomes, projetos, endereços e observações extraídos da fonte). **GitHub Pages não é um repositório de acesso restrito à empresa:** páginas publicadas podem ser acessíveis pela internet. Publique apenas depois de autorização formal da Enel e conferência das políticas corporativas de sigilo e marca. Para distribuição interna, dê preferência à hospedagem corporativa com controle de acesso. Um “login” feito apenas em JavaScript não impediria que terceiros recuperassem os dados.

Este painel é um artefato de análise, **não é um sistema oficial da Enel** e não está conectado ao SharePoint, Sigeo ou outras bases corporativas. A menção e o logotipo da Enel têm finalidade identificadora do contexto fornecido pelo usuário, sem afirmar endosso institucional.

## Resumo fiel da fonte

- Arquivo recebido: `PROGRAMAÇÃO START(SETEMBRO 26).csv` (codificação Windows-1252; separador ponto e vírgula).
- Formato recebido: **CSV — 1 aba lógica** denominada “Setembro 2026”. CSV não inclui várias planilhas. Para incorporar abas reais, será necessário importar o **arquivo Excel original com múltiplas abas**.
- Dimensões: **966 linhas × 26 colunas**, preservadas em `dados/base.js` e `dados/base.json`, inclusive linhas e células vazias.
- Linhas com data: **492**. Fechamentos sinalizados por “PROGRAMADO DIA”: **30**. Linhas completamente vazias após o cabeçalho: **440**.
- Cabeçalho: `3.492,11 UPS` (linha 1, coluna E). Soma dos 30 fechamentos: **3.492,1144 UPS**.
- Soma das linhas datadas em “UPS PROG”: **3.642,1774 UPS**. Diferença de **150,0630 UPS**, relativa à linha **528**, registrada após o último fechamento, com motivo de não aprovação pela MV Enel presente na fonte. A linha **não foi excluída**.
- Linhas com `UPS PROG` maior que zero: **41**. Códigos distintos identificados pelo prefixo `DAC/A.` ou `DMP/A.`: **38**.
- Todos os **30 fechamentos individuais** coincidem com a soma das linhas de seus respectivos blocos. Há **3** registros com data diferente da primeira data do respectivo bloco de fechamento, nas linhas **19, 21 e 382**. Há um valor `#REF!` na linha **288**, coluna A.
- A coluna “PROJETO” também contém valores não padronizados como `FOLGA`, `MAIS SERVIÇO`, `1268`, `841` e `950`; eles são preservados mas não tratados como projetos DAC/DMP.
- Campos “STATUS”, “CAUSAS”, “% JÁ EXEC.” e “Exec Dia” estão vazios nos 492 registros com data; “UPS EXEC” está zerada onde preenchida. O painel não presume que os trabalhos foram ou não realizados.

**Critério analítico:** “registro de programação” = linha com data reconhecida na coluna DATA; “fechamento diário” = linha iniciada com `PROGRAMADO DIA`. Gráficos e indicadores de linha não adicionam os fechamentos às somas, evitando dupla contagem. A aba “Base integral” mostra toda a fonte sem aplicar esses filtros analíticos.

## Como abrir

1. Descompacte o ZIP.
2. Abra `index.html` no navegador Chrome, Edge ou Firefox atual. Também é possível servir os arquivos por HTTP/HTTPS.
3. Use “Visão geral”, “Programações”, “Projetos”, “Equipes”, “Qualidade dos dados” e “Base integral”.
4. Selecione uma aba no menu superior quando importar um `.xlsx` com mais de uma planilha.
5. Use os botões **Importar arquivo**, **Exportar Excel** e **Exportar filtrados**.

O importador suporta `.xlsx`, `.xlsm` (sem senha), `.csv` e `.tsv`. A leitura de Excel importa **valores exibidos/armazenados nas células e o nome das abas**, não seus objetos, estilos, macros, imagens ou fórmulas editáveis. Fórmulas sem resultado armazenado podem ficar vazias. Para descompressão de `.xlsx` é necessário navegador moderno com `DecompressionStream('deflate-raw')`.

Ao importar, os dados são processados localmente, apenas nesta sessão, a menos que o usuário escolha **“? → Salvar esta base neste navegador”**. Isso usa `localStorage`, limitado ao navegador em uso, e **não atualiza a versão publicada no GitHub**. Os arquivos não são enviados para uma API pelo site. O relógio é atualizado por segundo no fuso `America/Sao_Paulo`, usando o relógio do dispositivo, não um servidor de horário externo.

## Publicação no GitHub Pages (após autorização)

1. Crie um repositório no GitHub.
2. Envie o **conteúdo descompactado** da pasta (incluindo `index.html`, `app.js`, `styles.css`, `excel.js`, `dados/` e `assets/`) para a **raiz** do repositório. Não envie somente o ZIP.
3. Em **Settings → Pages**, selecione **Deploy from a branch**, branch **main**, pasta **/(root)**, e salve.
4. Aguarde o GitHub exibir a URL do Pages. Abra-a e confira os dados, o logotipo, os filtros e as exportações.

A marca Enel Brasil exibida no site é carregada da versão vetorial pública hospedada na Wikimedia Commons: `https://commons.wikimedia.org/wiki/File:Enel_Brasil_Nova_Marca.svg` (referência de identidade institucional em `https://www.enel.com.br/pt/quemsomos/nova-marca.html`). Se não carregar, há uma indicação textual de fallback. O logotipo permanece uma marca registrada e seu uso deve seguir as regras corporativas.

## Organização do pacote

- `index.html`: estrutura da interface.
- `styles.css`: cores claras, responsividade e componentes.
- `app.js`: cálculos, gráficos, filtros, tabelas, pesquisa e navegação.
- `excel.js`: leitor e gravador de arquivos Excel/CSV no navegador, sem servidor.
- `dados/base.js`: base inicial embutida, necessária para abrir o painel até pelo disco local.
- `dados/base.json`: cópia JSON legível da base inicial.
- `dados/fonte_original_setembro_2026.csv`: arquivo original fornecido, mantido **sem alterações**.
- `assets/favicon.svg`: favicon da ferramenta (não é a marca institucional).

## Limitações conscientes

- Não houve arquivo `.xlsx` original com múltiplas abas nesta conversa; só foi recebida a versão `.csv` de setembro de 2026. Nenhuma aba extra foi inventada.
- A análise não atribui significados não documentados a campos vazios nem afirma execução concluída onde só existe programação.
- A importação de um novo Excel no navegador não altera arquivos no GitHub automaticamente.
- Dados importados não são sincronizados entre usuários. O site não possui login, banco de dados nem controle de permissões.
