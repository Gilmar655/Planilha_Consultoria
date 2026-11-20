/* ===== Leitura das abas da Planilha de Planejamento START =====
   Cada tabela é localizada pelo nome da aba e pela linha de cabeçalho (nomes de coluna),
   tanto na base embutida quanto num .xlsm/.xlsx importado. Nada é estimado: tudo vem das células. */
const Data = (() => {
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const clean = s => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = clean(v).replace('%', '').trim();
    if (!s || /^#/.test(s)) return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s); return isFinite(n) ? n : null;
  }
  const isTextNum = v => typeof v === 'string' && clean(v) !== '' && num(v) != null;
  function frac(v) { const n = num(v); if (n == null) return null; return typeof v === 'string' && v.includes('%') ? n / 100 : n; }
  function toISO(v) {
    if (typeof v === 'number') { if (v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); } return ''; }
    const s = clean(v); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (!m) return '';
    let y = +m[3]; if (y < 100) y += 2000; return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  function hora(v) {
    if (typeof v === 'number') { if (v < 1) { const m = Math.floor(Math.round(v * 86400) / 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); } return ''; }
    const m = clean(v).match(/(\d{1,2}):(\d{2})/); return m ? m[1].padStart(2, '0') + ':' + m[2] : '';
  }

  /** Acha a tabela numa aba: linha de cabeçalho que contém todas as colunas-chave. */
  function findTable(rows, keys) {
    const K = keys.map(norm);
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const n = (rows[i] || []).map(norm);
      if (K.every(k => n.includes(k))) {
        const hdr = rows[i].map(clean), idx = {}; hdr.forEach((h, j) => { const k = norm(h); if (k && !(k in idx)) idx[k] = j; });
        const key = idx[K[0]], pairs = [];
        for (let r = i + 1; r < rows.length; r++) { const row = rows[r] || []; if (row.some(c => clean(c) !== '')) pairs.push([row, r + 1]); }
        const get = (row, name) => { const j = idx[norm(name)]; return j == null ? '' : row[j] ?? ''; };
        const keep = pairs.filter(([r]) => clean(r[key]) !== '' || r.some((c, j) => j !== key && clean(c) !== '' && !/^start$/i.test(clean(c))));
        return { hdr, hdrRow: i, data: keep.map(p => p[0]), xr: keep.map(p => p[1]), get, has: n => norm(n) in idx };
      }
    }
    return null;
  }
  const SHEETS = {
    hist: { nome: 'Histórico', keys: ['Data da programação', 'ID Execução', 'Status finalização'] },
    base: { nome: 'Base Programada', keys: ['Data da programação', 'ID Execução', 'Status finalização'] },
    cart: { nome: 'CARTEIRA', keys: ['Projeto', 'Resumo Contratada', 'Ups_Plan'] },
    restr: { nome: 'Planilha de Restrição', keys: ['Projeto', 'RESTRIÇÃO', 'RESTRIÇÃO ELIMINADA?'] },
    hrestr: { nome: 'Histórico Restrições', keys: ['Projeto', 'RESTRIÇÃO', 'RESTRIÇÃO ELIMINADA?'] },
    sem: { nome: 'Semanas Programadas', keys: ['Semana do ano', 'UPS Programado', 'UPS executado'] },
    mob: { nome: 'Equipes Mobilizadas', keys: ['Mês', 'Total de equipes', 'Desempenho mensal'] },
    reg: { nome: 'Registros Semanais', keys: ['Semana', 'Aderência à programação', 'Eliminação de restrições'] },
    equipes: { nome: 'Auxiliar ListSusp · Equipes', aba: 'Auxiliar ListSusp', keys: ['Equipes', 'Encarregado', 'Tipo equipe', 'Início do turno'] },
    param: { nome: 'Auxiliar ListSusp · Parâmetros', aba: 'Auxiliar ListSusp', keys: ['Parâmetro', 'Valor'] },
    verif: { nome: 'Verificação', keys: ['Tipo', 'Aba', 'Linha', 'Projeto', 'Detalhe'] },
  };

  /** Recebe [{aba, rows}] (do arquivo importado ou da base embutida) e devolve os conjuntos de dados. */
  function build(abas) {
    const byName = {}; abas.forEach(a => { (byName[norm(a.aba)] ||= []).push(a); });
    const T = {}, faltando = [];
    for (const [k, s] of Object.entries(SHEETS)) {
      const cands = [...(byName[norm(s.nome)] || []), ...(s.aba ? byName[norm(s.aba)] || [] : [])];
      let t = null; for (const a of cands) { t = findTable(a.rows, s.keys); if (t) break; }
      if (t) T[k] = t; else faltando.push(s.nome);
    }
    const out = { faltando, abasLidas: abas.map(a => a.aba) };

    // --- Execuções (Histórico + Base Programada): uma linha por equipe por execução
    const exec = [];
    for (const [k, origem] of [['hist', 'Histórico'], ['base', 'Base Programada']]) {
      const t = T[k]; if (!t) continue;
      t.data.forEach((r, i) => {
        const g = n => t.get(r, n);
        const eqRaw = clean(g('Equipes')), enc = clean(g('Encarregado'));
        const [cod, ...resto] = eqRaw.split(' - ');
        const nome = (enc || resto.join(' - ')).toUpperCase();
        const upsPlanRaw = g('Ups_Plan');
        const rec = {
          origem, i, xr: t.xr[i], data: toISO(g('Data da programação')), semana: num(g('Semana')), ano: num(g('Ano')), id: clean(g('ID Execução')),
          projeto: clean(g('Projeto')).toUpperCase(), nota: clean(g('Nota')), familia: clean(g('familia_regen')), prazo: clean(g('STATUS_PRAZO')).toUpperCase(),
          diasVenc: num(g('Qtd Dias p/ Venc')), tipoProg: clean(g('Tipo de Programação')), pctPlan: frac(g('% Planejada')), upsPlan: num(upsPlanRaw), upsPlanTexto: isTextNum(upsPlanRaw),
          upsExecProj: num(g('Ups_Exec_Projeto')), municipio: clean(g('municipio')).toUpperCase(), qtdEquipes: num(g('Qtd Equipes')),
          restrPend: num(g('Número de restrição pendentes')), equipeCod: clean(cod), encarregado: nome, tipoEquipe: clean(g('Tipo Equipe')).toUpperCase(),
          upsProg: num(g('Quantidade de UPS por Equipe')) || 0, iniTurno: hora(g('Início do turno')), iniPrev: hora(g('Início previsto (Hora)')), fimPrev: hora(g('Término previsto (Hora)')),
          saidaBase: hora(g('Saída da base')), causaAtraso: clean(g('Causa de atraso')), status: clean(g('Status finalização')), pctExec: frac(g('% Executado')),
          causa: clean(g('Causa')), justificativa: clean(g('Justificativa')), observacao: clean(g('Observação')), upsExec: num(g('Qtd UPS executado')) || 0,
        };
        rec.statusN = norm(rec.status);
        rec.tipoProgN = rec.tipoProg ? rec.tipoProg[0].toUpperCase() + rec.tipoProg.slice(1).toLowerCase() : '';
        rec.municipioN = norm(rec.municipio);
        rec.mes = rec.data.slice(0, 7);
        rec.semKey = rec.ano && rec.semana ? `${rec.ano}-S${String(rec.semana).padStart(2, '0')}` : '';
        rec.equipeLabel = rec.equipeCod && nome ? `${rec.equipeCod} · ${nome}` : (rec.equipeCod || nome);
        exec.push(rec);
      });
    }
    const hoje = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
    for (const r of exec) {
      r.situacao = r.statusN === 'EXECUTADO' ? 'Executado' : r.statusN === 'EXECUTADO PARCIAL' ? 'Executado parcial' :
        r.statusN.startsWith('CANCELADO') ? r.status.toUpperCase().replace('CANCELADO ENEL | PREVIAMENTE', 'CANCELADO ENEL | PREVIAMENTE') :
        r.data && r.data >= hoje ? 'A executar (sem status)' : 'Sem status (data passada)';
      r.grupo = r.situacao === 'Executado' ? 'Executado' : r.situacao === 'Executado parcial' ? 'Executado parcial' : r.statusN.startsWith('CANCELADO') ? 'Cancelado' : r.situacao;
    }
    out.exec = exec; out.hoje = hoje;

    // --- Carteira
    const cart = [];
    if (T.cart) T.cart.data.forEach((r, i) => {
      const g = n => T.cart.get(r, n);
      const aproIso = toISO(g('dataAPRO'));
      cart.push({
        i, xr: T.cart.xr[i], projeto: clean(g('Projeto')).toUpperCase(), nota: clean(g('Nota')), statusNota: clean(g('Status_Nota')), statusProjeto: clean(g('Status_Projeto')),
        familia: clean(g('familia_regen')), tipoProjeto: clean(g('Tipo_projeto')), mbo: clean(g('KPI MBO')), prazo: clean(g('STATUS_PRAZO')).toUpperCase(),
        diasVenc: num(g('Qtd Dias p/ Venc')), contrato: clean(g('contrato')), upsPlan: num(g('Ups_Plan')), upsExecProj: num(g('Ups_Exec_Projeto')),
        tipoCliente: clean(g('Tipo de Cliente')), area: clean(g('Area Real')), circuito: clean(g('Circuito')), localInst: clean(g('LocalInst')),
        prazoFinal: toISO(g('Prazo_Final_DELI')), dataAPRO: aproIso === '1900-01-01' ? '' : aproIso, apro1900: aproIso === '1900-01-01', dataAUTO: toISO(g('dataAUTO')),
        progRealizadas: num(g('Programacoes_realizadas')), bairro: clean(g('bairro')).toUpperCase(), municipio: clean(g('municipio')).toUpperCase(),
        tipoExec: clean(g('Tipo_exec')), programar: clean(g('Programar?')).toUpperCase(), qtdProg: num(g('Qtd Programações')), resumo: clean(g('Resumo Contratada')),
        obs: clean(g('Observações')), devolutiva: clean(g('DEVOLUTIVA ENEL')), responsavel: clean(g('RESPONSÁVEL')), statusObra: clean(g('Status Obra')),
        ultimaData: toISO(g('Última Data Programação')), priorizacao: clean(g('Priorização MV')), dataPriorizacao: toISO(g('Data Priorização')),
        sigeoData: toISO(g('Data Programacao')), sigeoStatus: clean(g('Status Programacao')), sigeoTipo: clean(g('Tipo Intervencao')),
        powerOn: clean(g('Numero PowerON')), equipamentos: clean(g('Equipamentos')), chi: num(g('CHI')), sigeoIni: hora(g('Horario Inicio')), sigeoFim: hora(g('Horario Fim')),
      });
    });
    for (const c of cart) {
      c.municipioN = norm(c.municipio);
      c.faixaVenc = c.diasVenc == null ? 'Sem prazo informado' : c.diasVenc < 0 ? 'Vencido' : c.diasVenc <= 30 ? '0 a 30 dias' : c.diasVenc <= 60 ? '31 a 60 dias' : c.diasVenc <= 90 ? '61 a 90 dias' : 'Mais de 90 dias';
    }
    out.cart = cart;

    // --- Restrições (Planilha de Restrição + Histórico Restrições)
    const restr = [];
    for (const [k, origem] of [['hrestr', 'Histórico Restrições'], ['restr', 'Planilha de Restrição']]) {
      const t = T[k]; if (!t) continue;
      t.data.forEach((r, i) => {
        const g = n => t.get(r, n);
        const ret = g('DATA DE RETORNO');
        const rec = {
          origem, i, xr: t.xr[i], projeto: clean(g('Projeto')).toUpperCase(), nota: clean(g('Nota')), id: clean(g('ID Execução')), familia: clean(g('familia_regen')),
          data: toISO(g('DATA DE PROGRAMAÇÃO')), semana: num(g('SEMANA')), ano: num(g('ANO')), restricao: clean(g('RESTRIÇÃO')), descricao: clean(g('DESCRIÇÃO DA RESTRIÇÃO')),
          area: clean(g('ÁREA RESPONSÁVEL')), responsavel: clean(g('Responsável')), acao: clean(g('AÇÃO')), retorno: toISO(ret) || clean(ret), retornoTexto: clean(ret) !== '' && !toISO(ret),
          limite: toISO(g('DATA LIMITE PARA ELIMINAÇÃO DA RESTRIÇÃO')), eliminada: clean(g('RESTRIÇÃO ELIMINADA?')), justificativa: clean(g('JUSTIFICATIVA')),
        };
        rec.sit = rec.eliminada || 'Sem resposta';
        rec.semKey = rec.ano && rec.semana ? `${rec.ano}-S${String(rec.semana).padStart(2, '0')}` : '';
        restr.push(rec);
      });
    }
    out.restr = restr;

    // --- Tabelas de resumo calculadas pela própria planilha (mostradas como estão)
    const rowsOf = (k, cols) => T[k] ? T[k].data.map(r => Object.fromEntries(cols.map(([key, name, f]) => [key, f ? f(T[k].get(r, name)) : T[k].get(r, name)]))) : [];
    out.semanas = rowsOf('sem', [['semana', 'Semana do ano', num], ['ano', 'Ano', num], ['qtdEquipe', 'Qtd Equipe', num], ['minimo', 'Minimo UPS semana', num], ['upsProg', 'UPS Programado', num], ['obras', 'Obras Programadas', num], ['fora', 'Fora Prazo', num], ['no', 'No Prazo', num], ['upsExec', 'UPS executado', num], ['desemp', 'Desempenho Execução', num]]);
    out.mobil = rowsOf('mob', [['mes', 'Mês', toISO], ['lm', 'LM', num], ['lv', 'LV', num], ['total', 'Total de equipes', num], ['prod', 'Produtividade mensal por equipe (UPS)', num], ['meta', 'Meta mensal (UPS)', num], ['exec', 'UPS executado no mês', num], ['desemp', 'Desempenho mensal', num]]);
    out.registros = rowsOf('reg', [['semana', 'Semana', num], ['ano', 'Ano', num], ['fora', 'FORA DO PRAZO', num], ['no', 'NO PRAZO', num], ['pctFora', '%Fora do prazo', num], ['venc30', 'Qtd vencimento 30 dias', num], ['venc60', 'Qtd vencimento 60 dias', num], ['horizonte', 'Horizonte de programação', num], ['aderencia', 'Aderência à programação', num], ['elimin', 'Eliminação de restrições', num]]).filter(r => r.semana);
    out.equipes = rowsOf('equipes', [['cod', 'Equipes', clean], ['enc', 'Encarregado', clean], ['tipo', 'Tipo equipe', clean], ['ini', 'Início do turno', hora], ['fim', 'Fim do turno', hora], ['encT', 'ENCARREGADO DE TURMAS', num], ['ofic', 'OFICIAL ELETRICISTA', num], ['ajud', 'AJUDANTE', num], ['munck', 'MOT. MUNCK II', num], ['mot', 'MOTORISTA', num]]).filter(r => r.cod);
    out.param = rowsOf('param', [['p', 'Parâmetro', clean], ['v', 'Valor', x => x]]).filter(r => r.p);
    out.verif = rowsOf('verif', [['tipo', 'Tipo', clean], ['aba', 'Aba', clean], ['linha', 'Linha', x => x], ['projeto', 'Projeto', clean], ['detalhe', 'Detalhe', clean]]).filter(r => r.tipo);
    out.meta = Object.fromEntries(out.param.map(p => [norm(p.p), p.v]));
    const ins = abas.find(a => norm(a.aba) === 'INSTRUCOES'); out.instr = ins ? parseInstr(ins.rows) : [];
    const eqs = abas.find(a => norm(a.aba) === 'EQUIPES PROGRAMADAS'); out.eqpSheet = eqs ? readEqp(eqs.rows) : null;
    if (!ins) faltando.push('Instruções');
    return out;
  }

  /** Manual (aba Instruções): seções numeradas, fluxo, regras e termos, na ordem da planilha. */
  function parseInstr(rows) {
    const items = []; let sec = 'Apresentação', n = 0;
    for (const row of rows) {
      const c = (row || []).slice(1, 6).map(clean); if (!c.some(Boolean)) continue;
      const m = c[0].match(/^(\d+)\.\s+(.*)$/);
      if (m && !c.slice(1).some(Boolean)) { sec = `${m[1]}. ${clean(m[2])}`; items.push({ secao: sec, tipo: 'secao', texto: clean(m[2]), n: ++n }); continue; }
      if (c.filter(Boolean).length >= 4) { items.push({ secao: sec, tipo: 'fluxo', cols: c, n: ++n }); continue; }
      if (['✔', '✖', 'ℹ'].includes(c[0])) { items.push({ secao: sec, tipo: 'regra', icone: c[0], texto: c.slice(1).filter(Boolean).join(' '), n: ++n }); continue; }
      if (c[0] && c[1]) { items.push({ secao: sec, tipo: 'termo', termo: c[0], texto: c.slice(1).filter(Boolean).join(' '), n: ++n }); continue; }
      items.push({ secao: sec, tipo: sec === 'Apresentação' ? 'cabecalho' : 'texto', texto: c.filter(Boolean).join(' '), n: ++n });
    }
    return items;
  }
  /** Valores do topo da aba Equipes programadas (semana escolhida, UPS, meta, horizonte), como a planilha calcula. */
  function readEqp(rows) {
    const out = {};
    const below = lbl => { for (let r = 0; r < rows.length; r++) { const row = rows[r] || []; for (let c = 0; c < row.length; c++) if (norm(row[c]).startsWith(lbl)) return { v: (rows[r + 1] || [])[c], v2: (rows[r + 2] || [])[c], label: clean(row[c]) }; } return null; };
    const right = lbl => { for (const row of rows) { if (!row) continue; for (let c = 0; c < row.length; c++) if (norm(row[c]).startsWith(lbl)) { for (let k = c + 1; k < row.length; k++) if (clean(row[k]) !== '') return row[k]; } } return null; };
    const u = below('UPS PROGRAMADOS'), m = below('META DE UPS'), s = below('SEMANA ATUAL'), h = below('HORIZONTE DE PROGRAMACAO');
    out.semana = num(right('SEMANA ➜')); out.ano = num(right('ANO ➜'));
    out.ups = u ? num(u.v) : null; out.metaLabel = m?.label || ''; out.meta = m ? clean(m.v) : ''; out.semanaAtual = s ? num(s.v) : null;
    out.horizonte = h ? clean(h.v) : ''; out.horizonteTxt = h ? clean(h.v2) : '';
    return out;
  }

  /** Resumo por projeto: junta Carteira, execuções e restrições pelo código do projeto. */
  function projetos(D) {
    const m = new Map();
    const get = p => { let x = m.get(p); if (!x) { x = { projeto: p, cart: null, exec: [], restr: [] }; m.set(p, x); } return x; };
    D.cart.forEach(c => { if (c.projeto) get(c.projeto).cart = c; });
    D.exec.forEach(r => { if (r.projeto) get(r.projeto).exec.push(r); });
    D.restr.forEach(r => { if (r.projeto) get(r.projeto).restr.push(r); });
    const out = [];
    for (const x of m.values()) {
      const e = x.exec, c = x.cart || {};
      const ids = new Set(e.map(r => r.id)), datas = e.map(r => r.data).filter(Boolean).sort();
      const comStatus = e.filter(r => ['Executado', 'Executado parcial', 'Cancelado'].includes(r.grupo));
      const pend = x.restr.filter(r => r.sit === 'Não eliminada' || r.sit === 'Sem resposta');
      // notas técnicas do projeto: a da CARTEIRA primeiro, depois as das execuções e restrições
      const notas = [...new Set([c.nota, ...e.map(r => r.nota), ...x.restr.map(r => r.nota)].filter(Boolean))];
      out.push({
        projeto: x.projeto, notas, naCarteira: !!x.cart, familia: c.familia || e[0]?.familia || x.restr[0]?.familia || '', resumo: c.resumo || '', statusObra: c.statusObra || '',
        prazo: c.prazo || e[e.length - 1]?.prazo || '', diasVenc: c.diasVenc ?? null, priorizacao: c.priorizacao || '', municipio: c.municipio || e[0]?.municipio || '',
        upsPlan: c.upsPlan ?? e.find(r => r.upsPlan != null)?.upsPlan ?? null, upsExecProj: c.upsExecProj ?? null,
        nExec: ids.size, nLinhas: e.length, upsProg: e.reduce((s, r) => s + r.upsProg, 0), upsExec: e.reduce((s, r) => s + r.upsExec, 0),
        nExecutado: comStatus.filter(r => r.grupo === 'Executado').length, nParcial: comStatus.filter(r => r.grupo === 'Executado parcial').length, nCancel: comStatus.filter(r => r.grupo === 'Cancelado').length,
        primeira: datas[0] || '', ultima: datas[datas.length - 1] || '', nRestr: x.restr.length, nPend: pend.length,
        cart: x.cart, exec: e, restr: x.restr,
      });
    }
    return out;
  }

  /** Verificações de consistência calculadas pelo painel. */
  function qualidade(D) {
    const Q = [], add = (nivel, titulo, texto, cab, itens) => Q.push({ nivel, titulo, texto, cab, itens });
    const br = d => d ? d.split('-').reverse().join('/') : '';
    const E = D.exec;
    const semStatus = E.filter(r => r.situacao === 'Sem status (data passada)');
    add(semStatus.length ? 'crit' : 'ok', 'Programação com data passada e sem "Status finalização"', 'A data já passou e a equipe não tem status. A planilha manda registrar o resultado no dia da execução (passo 4 do manual).', ['Origem', 'Data', 'Projeto', 'Equipe'], semStatus.map(r => [r.origem, br(r.data), r.projeto, r.equipeLabel]));
    const semCausa = E.filter(r => (r.grupo === 'Cancelado' || r.grupo === 'Executado parcial') && (!r.causa || !r.justificativa));
    add(semCausa.length ? 'warn' : 'ok', 'Cancelado ou parcial sem Causa ou sem Justificativa', 'Regra de ouro do manual: cancelado ou parcial sempre com Causa (da lista) e Justificativa.', ['Origem', 'Data', 'Projeto', 'Status', 'Falta'], semCausa.map(r => [r.origem, br(r.data), r.projeto, r.status, [!r.causa && 'Causa', !r.justificativa && 'Justificativa'].filter(Boolean).join(' e ')]));
    const incoer = E.filter(r => (r.statusN === 'EXECUTADO' && r.pctExec != null && r.pctExec < 1) || (r.statusN === 'EXECUTADO PARCIAL' && r.pctExec != null && r.pctExec >= 1));
    add(incoer.length ? 'warn' : 'ok', 'Status × % Executado incoerentes', 'Pelo manual, EXECUTADO = 100% do programado e EXECUTADO PARCIAL = menos de 100%. Estas linhas contrariam a regra; o UPS executado é calculado pelo %, não pelo status.', ['Origem', 'Data', 'Projeto', 'Status', '% Executado'], incoer.map(r => [r.origem, br(r.data), r.projeto, r.status, Math.round(r.pctExec * 100) + '%']));
    const grafia = E.filter(r => (r.status && r.status !== r.status.toUpperCase()) || (r.tipoProg && !['Total', 'Parcial'].includes(r.tipoProg)));
    add(grafia.length ? 'info' : 'ok', 'Valores fora da lista (maiúsculas/minúsculas)', 'Ex.: "Executado" em vez de "EXECUTADO", "total" em vez de "Total". O painel agrupa corretamente, mas filtros e o Power BI podem separar.', ['Origem', 'Data', 'Projeto', 'Campo', 'Valor'], grafia.map(r => [r.origem, br(r.data), r.projeto, r.status !== r.status.toUpperCase() ? 'Status finalização' : 'Tipo de Programação', r.status !== r.status.toUpperCase() ? r.status : r.tipoProg]));
    const txt = E.filter(r => r.upsPlanTexto);
    add(txt.length ? 'info' : 'ok', 'Ups_Plan gravado como texto', 'O número está como texto (ex.: "432,75"). Somas e PROCV no Excel ignoram essas células.', ['Origem', 'Data', 'Projeto', 'Ups_Plan'], txt.map(r => [r.origem, br(r.data), r.projeto, r.upsPlan]));
    const mun = {}; [...E, ...D.cart].forEach(r => { if (r.municipio) (mun[r.municipioN] ||= new Set()).add(r.municipio); });
    const munV = Object.values(mun).filter(s => s.size > 1).map(s => [[...s].join(' / ')]);
    add(munV.length ? 'info' : 'ok', 'Município escrito de formas diferentes', 'Mesma cidade com e sem acento. O painel junta pelo nome sem acento.', ['Grafias encontradas'], munV);
    const dup = [], seen = {};
    E.forEach(r => { if (!r.data || !r.encarregado) return; const k = r.data + '|' + r.projeto + '|' + r.encarregado; if (seen[k]) dup.push([r.origem, br(r.data), r.projeto, r.equipeLabel]); else seen[k] = 1; });
    add(dup.length ? 'warn' : 'ok', 'Mesma equipe 2x no mesmo projeto e dia', 'O manual diz que a planilha bloqueia este caso; estas linhas passaram.', ['Origem', 'Data', 'Projeto', 'Equipe'], dup);
    const semEq = E.filter(r => !r.equipeCod && !r.encarregado);
    add(semEq.length ? 'warn' : 'ok', 'Linha de programação sem equipe', 'Sem código de equipe e sem encarregado.', ['Origem', 'Data', 'Projeto', 'Status'], semEq.map(r => [r.origem, br(r.data), r.projeto, r.status]));
    const nomes = {}; E.forEach(r => { if (r.encarregado) { const k = norm(r.encarregado).split(' ').slice(0, 2).join(' '); (nomes[k] ||= new Set()).add(r.encarregado); } });
    const nv = Object.values(nomes).filter(s => s.size > 1).map(s => [[...s].join(' / ')]);
    add(nv.length ? 'info' : 'ok', 'Encarregado com nomes diferentes entre Histórico e Base', 'O Histórico usa "código - nome completo" e a Base usa nome curto. O painel não junta esses nomes; confira se são a mesma equipe.', ['Variações'], nv);
    const apro = D.cart.filter(c => c.apro1900);
    add(apro.length ? 'info' : 'ok', 'CARTEIRA: dataAPRO = 01/01/1900', 'Data "vazia" vinda da importação. O painel trata como sem data.', ['Projeto', 'Resumo Contratada'], apro.map(c => [c.projeto, c.resumo]));
    const progSemData = D.cart.filter(c => c.programar === 'SIM' && !c.ultimaData);
    add(progSemData.length ? 'info' : 'ok', 'CARTEIRA: "Programar?" = SIM sem Última Data Programação', 'Obra marcada para programar que ainda não tem data registrada na CARTEIRA.', ['Projeto', 'Resumo Contratada', 'Status Obra'], progSemData.map(c => [c.projeto, c.resumo, c.statusObra]));
    const semResp = D.restr.filter(r => r.sit === 'Sem resposta' && r.data && r.data < D.hoje);
    add(semResp.length ? 'warn' : 'ok', 'Restrição sem resposta em programação já passada', '"RESTRIÇÃO ELIMINADA?" vazio para obra cuja data de programação já passou.', ['Origem', 'Semana', 'Projeto', 'Restrição'], semResp.map(r => [r.origem, r.semKey, r.projeto, r.restricao]));
    const naoElSemAcao = D.restr.filter(r => r.sit === 'Não eliminada' && (!r.acao || !r.retorno));
    add(naoElSemAcao.length ? 'warn' : 'ok', 'Restrição "Não eliminada" sem Ação ou Data de retorno', 'O manual pede ação e data de retorno para restrição pendente.', ['Origem', 'Semana', 'Projeto', 'Restrição', 'Falta'], naoElSemAcao.map(r => [r.origem, r.semKey, r.projeto, r.restricao, [!r.acao && 'Ação', !r.retorno && 'Data de retorno'].filter(Boolean).join(' e ')]));
    const retTxt = D.restr.filter(r => r.retornoTexto);
    add(retTxt.length ? 'info' : 'ok', 'DATA DE RETORNO com texto em vez de data', 'Textos como "não programado nesta data" na coluna de data.', ['Origem', 'Semana', 'Projeto', 'Valor'], retTxt.map(r => [r.origem, r.semKey, r.projeto, r.retorno]));
    const nCart = new Set(D.cart.map(c => c.projeto));
    const foraCart = [...new Set(D.exec.filter(r => r.origem === 'Base Programada' && !nCart.has(r.projeto)).map(r => r.projeto))];
    add(foraCart.length ? 'info' : 'ok', 'Projeto na Base Programada que não está na CARTEIRA', 'Programado na semana atual/futura, mas sem linha na CARTEIRA.', ['Projeto'], foraCart.map(p => [p]));
    return Q;
  }

  const br = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
  const diaSem = d => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(d + 'T12:00:00').getDay()];
  return { build, projetos, qualidade, norm, br, diaSem, num, toISO, findTable, SHEETS };
})();
