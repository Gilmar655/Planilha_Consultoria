/* ===== Painel Planejamento START – interface com menu lateral ===== */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const D0 = Data, nf = (v, d = 2) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const int = v => (v ?? 0).toLocaleString('pt-BR');
  const pc = (v, d = 1) => v == null || !isFinite(v) ? '—' : nf(v * 100, d) + '%';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesLabel = m => m ? MESES[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4) : '(sem data)';
  const semLabel = k => k ? 'S' + +k.slice(6) + '/' + k.slice(2, 4) : '';
  const br = D0.br, sum = (a, f) => a.reduce((s, r) => s + (f(r) || 0), 0);
  const countBy = (a, f) => { const m = {}; a.forEach(r => { const k = f(r); if (k) m[k] = (m[k] || 0) + 1; }); return m; };
  const top = (m, n = 12) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
  const SIT_EXEC = [['Executado', '--good'], ['Executado parcial', '--warn'], ['Cancelado', '--crit'], ['A executar (sem status)', '--s1'], ['Sem status (data passada)', null]];
  const SIT_RESTR = [['Eliminada', '--good'], ['Não eliminada', '--crit'], ['Sem resposta', '--warn'], ['Não aplicável', null]];
  const colorOf = (L, s) => { const f = L.find(x => x[0] === s); return f && f[1] ? css(f[1]) : '#c9d1cc'; };
  const order = L => (a, b) => L.findIndex(x => x[0] === a) - L.findIndex(x => x[0] === b);
  const FX = ['Vencido', '0 a 30 dias', '31 a 60 dias', '61 a 90 dias', 'Mais de 90 dias', 'Sem prazo informado'];
  const isoWeek = d => { const t = new Date(d + 'T12:00:00Z'); const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day + 3); const y = t.getUTCFullYear(); const j = new Date(Date.UTC(y, 0, 4)); const w = 1 + Math.round(((t - j) / 86400000 - 3 + ((j.getUTCDay() + 6) % 7)) / 7); return { y, w, key: `${y}-S${String(w).padStart(2, '0')}` }; };
  const weekStart = key => { const y = +key.slice(0, 4), w = +key.slice(6); const j = new Date(Date.UTC(y, 0, 4)); const mon = new Date(j); mon.setUTCDate(j.getUTCDate() - ((j.getUTCDay() + 6) % 7) + (w - 1) * 7); return mon; };
  const addDays = (dt, n) => { const x = new Date(dt); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const nextWeeks = (key, n) => { const s = weekStart(key), out = []; for (let i = 0; i < n; i++) out.push(isoWeek(addDays(s, i * 7 + 3)).key); return out; };
  const prevWeek = key => isoWeek(addDays(weekStart(key), -4)).key;
  const stTag = r => { const c = r.grupo === 'Executado' ? 'ok' : r.grupo === 'Executado parcial' ? 'parc' : r.grupo === 'Cancelado' ? 'crit' : 'neu'; return `<span class="tag status-${c}"><span class="dot"></span>${esc(r.status || r.grupo)}</span>`; };
  const kpis = list => `<div class="kpis">${list.map(([t, v, s, a]) => `<div class="kpi${a ? ' alert' : ''}"><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s || ''}</div></div>`).join('')}</div>`;
  const card = (cls, id, title, sub, extra = '') => `<div class="card ${cls}"><h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}${extra}<div class="chart" id="${id}"></div></div>`;
  const legend = items => `<div class="legend">${items.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>`;

  /* ---------- colunas ---------- */
  const C_EXEC = [['origem', 'Aba'], ['data', 'Data', 'd'], ['semKey', 'Semana', 'sem'], ['id', 'ID Execução'], ['projeto', 'Projeto', 'proj'], ['familia', 'Família'], ['tipoProgN', 'Tipo prog.'], ['pctPlan', '% plan.', 'pct'],
    ['equipeCod', 'Equipe'], ['encarregado', 'Encarregado'], ['tipoEquipe', 'Tipo'], ['upsProg', 'UPS prog.', 'n2'], ['iniPrev', 'Início prev.'], ['fimPrev', 'Término prev.'], ['saidaBase', 'Saída base'],
    ['status', 'Status finalização', 'st'], ['pctExec', '% exec.', 'pct'], ['upsExec', 'UPS exec.', 'n2'], ['causa', 'Causa'], ['justificativa', 'Justificativa', 'wrap'], ['observacao', 'Observação', 'wrap'], ['restrPend', 'Restr. pend.', 'num'], ['prazo', 'Prazo'], ['municipio', 'Município']];
  const C_CART = [['projeto', 'Projeto', 'proj'], ['resumo', 'Resumo contratada'], ['statusObra', 'Status obra'], ['prazo', 'Prazo'], ['diasVenc', 'Dias p/ venc.', 'num'], ['prazoFinal', 'Prazo final', 'd'],
    ['priorizacao', 'Priorização MV'], ['familia', 'Família'], ['tipoProjeto', 'Tipo projeto'], ['upsPlan', 'Ups_Plan', 'n2'], ['upsExecProj', 'Ups_Exec_Projeto', 'n2'], ['programar', 'Programar?'], ['qtdProg', 'Qtd prog.', 'num'],
    ['ultimaData', 'Última data prog.', 'd'], ['sigeoStatus', 'Status prog. SIGEO'], ['sigeoData', 'Data SIGEO', 'd'], ['sigeoTipo', 'Tipo interv.'], ['powerOn', 'PowerON'], ['municipio', 'Município'], ['bairro', 'Bairro'], ['circuito', 'Circuito'], ['devolutiva', 'Devolutiva ENEL', 'wrap'], ['obs', 'Observações', 'wrap']];
  const C_RESTR = [['origem', 'Aba'], ['semKey', 'Semana', 'sem'], ['data', 'Data prog.', 'd'], ['projeto', 'Projeto', 'proj'], ['id', 'ID Execução'], ['familia', 'Família'], ['restricao', 'Restrição'], ['descricao', 'Descrição', 'wrap'], ['area', 'Área'], ['responsavel', 'Responsável'], ['acao', 'Ação', 'wrap'], ['retorno', 'Retorno', 'dt'], ['limite', 'Limite', 'd'], ['sit', 'Situação'], ['justificativa', 'Justificativa', 'wrap']];
  const C_INSTR = [['n', 'Nº', 'num'], ['secao', 'Seção'], ['tipoL', 'Tipo'], ['item', 'Item'], ['texto', 'Texto', 'wrap']];

  /* ---------- seções ---------- */
  const G_EXEC = [
    { key: 'semKey', name: 'Semana', label: semLabel, sort: 'desc', collapse: 14 }, { key: 'mes', name: 'Mês', label: mesLabel, sort: 'key' },
    { key: 'grupo', name: 'Resultado', sort: order(SIT_EXEC) }, { key: 'status', name: 'Status finalização' }, { key: 'familia', name: 'Família', collapse: 10 },
    { key: 'tipoProgN', name: 'Tipo de programação' }, { key: 'tipoEquipe', name: 'Tipo de equipe' }, { key: 'encarregado', name: 'Encarregado', collapse: 12 },
    { key: 'causa', name: 'Causa', collapse: 10 }, { key: 'municipioN', name: 'Município' }, { key: 'prazo', name: 'Prazo (ENEL)' }, { key: 'origem', name: 'Aba de origem' }];
  const SEC = [
    { id: 'visao', ic: '◧', t: 'Visão geral', desc: 'Programação e execução de todas as semanas (abas Histórico + Base Programada), com desempenho, causas, equipes mobilizadas e a qualidade dos dados.', groups: G_EXEC, date: r => r.data, data: () => S.D.exec,
      hay: r => [r.projeto, r.id, r.encarregado, r.equipeCod, r.causa, r.justificativa, r.observacao, r.familia, r.municipio], cols: C_EXEC, sub: 'Uma linha por equipe por execução (Histórico + Base Programada).', placeholder: 'Buscar projeto, ID de execução, encarregado, causa, justificativa…' },
    { id: 'instr', ic: '☰', t: 'Instruções', desc: 'Manual da planilha (aba Instruções): fluxo da semana, regras, status, termos e botões. Use a busca para achar uma regra ou um termo.', groups: [{ key: 'secao', name: 'Seção', sort: (a, b) => (parseInt(a) || 0) - (parseInt(b) || 0) }, { key: 'tipoL', name: 'Tipo' }], data: () => S.D.instr.filter(i => i.tipo !== 'secao'),
      hay: r => [r.secao, r.item, r.texto], cols: C_INSTR, sub: 'Todas as linhas do manual, na ordem da planilha.', noDates: true, placeholder: 'Buscar no manual (ex.: % Executado, CANCELADO ENEL, restrição)…' },
    { id: 'cart', ic: '▤', t: 'Carteira', desc: 'Obras da aba CARTEIRA: situação, prazo, priorização, UPS previsto e executado (ENEL) e programação no SIGEO.', groups: [
      { key: 'resumo', name: 'Resumo contratada' }, { key: 'statusObra', name: 'Status obra' }, { key: 'prazo', name: 'Prazo' }, { key: 'faixaVenc', name: 'Vencimento', sort: (a, b) => FX.indexOf(a) - FX.indexOf(b) },
      { key: 'priorizacao', name: 'Priorização MV', collapse: 10 }, { key: 'familia', name: 'Família', collapse: 10 }, { key: 'tipoCliente', name: 'Tipo de cliente' }, { key: 'mbo', name: 'KPI MBO' },
      { key: 'tipoExec', name: 'Tipo exec.', collapse: 8 }, { key: 'sigeoStatus', name: 'Status prog. SIGEO' }, { key: 'municipioN', name: 'Município' }, { key: 'programar', name: 'Programar?' }],
      date: r => r.ultimaData, data: () => S.D.cart, hay: r => [r.projeto, r.nota, r.tipoProjeto, r.circuito, r.bairro, r.municipio, r.obs, r.devolutiva, r.equipamentos, r.localInst, r.powerOn], cols: C_CART, sub: 'Todas as obras da CARTEIRA. Datas filtram pela "Última Data Programação". Clique numa obra para ver o histórico.', placeholder: 'Buscar projeto, nota, circuito, bairro, observação…' },
    { id: 'bp', ic: '▦', t: 'Base Programada', desc: 'Programação da semana atual e das próximas (aba Base Programada), uma linha por equipe.', groups: G_EXEC.filter(g => !['origem', 'mes'].includes(g.key)).concat([{ key: 'restrPendF', name: 'Restrições pendentes' }]), date: r => r.data,
      data: () => S.D.exec.filter(r => r.origem === 'Base Programada'), hay: r => [r.projeto, r.id, r.encarregado, r.equipeCod, r.causa, r.justificativa, r.observacao, r.familia], cols: C_EXEC.filter(c => c[0] !== 'origem'), sub: 'Todas as linhas da aba Base Programada.', placeholder: 'Buscar projeto, ID, encarregado…' },
    { id: 'eqp', ic: '▣', t: 'Equipes programadas', desc: 'Equipes × dias da semana escolhida, como na aba Equipes programadas, com UPS da semana, mínimo e horizonte. Vale para qualquer semana (Histórico + Base).', groups: [
      { key: 'semKey', name: 'Semana', label: semLabel, sort: 'desc', collapse: 14, single: true }, { key: 'tipoEquipe', name: 'Tipo de equipe' }, { key: 'encarregado', name: 'Encarregado', collapse: 12 }, { key: 'grupo', name: 'Resultado', sort: order(SIT_EXEC) }, { key: 'familia', name: 'Família', collapse: 8 }],
      date: r => r.data, data: () => S.D.exec, hay: r => [r.projeto, r.id, r.encarregado, r.equipeCod], cols: [['data', 'Data', 'd'], ['dia', 'Dia'], ['equipeCod', 'Equipe'], ['encarregado', 'Encarregado'], ['tipoEquipe', 'Tipo'], ['projeto', 'Projeto', 'proj'], ['id', 'ID Execução'], ['iniPrev', 'Início prev.'], ['fimPrev', 'Término prev.'], ['upsProg', 'UPS prog.', 'n2'], ['status', 'Status', 'st'], ['pctExec', '% exec.', 'pct'], ['upsExec', 'UPS exec.', 'n2'], ['causa', 'Causa'], ['origem', 'Aba']],
      sub: 'Linhas de equipe da semana selecionada.', noDates: true, placeholder: 'Buscar projeto, equipe, encarregado…' },
    { id: 'restr', ic: '⚑', t: 'Planilha de Restrição', desc: 'Restrições por obra e semana (aba Planilha de Restrição). Para incluir semanas encerradas, ative "Histórico Restrições" no filtro Aba de origem.', groups: [
      { key: 'semKey', name: 'Semana', label: semLabel, sort: 'desc', collapse: 14 }, { key: 'sit', name: 'Situação', sort: order(SIT_RESTR) }, { key: 'restricao', name: 'Restrição' }, { key: 'area', name: 'Área responsável' },
      { key: 'responsavel', name: 'Responsável', collapse: 10 }, { key: 'familia', name: 'Família', collapse: 10 }, { key: 'origem', name: 'Aba de origem' }],
      date: r => r.data, data: () => S.D.restr, hay: r => [r.projeto, r.id, r.restricao, r.descricao, r.responsavel, r.acao, r.justificativa], cols: C_RESTR, sub: 'Restrições nos filtros atuais.', placeholder: 'Buscar projeto, restrição, ação, justificativa…' },
    { id: 'painel', ic: '◉', t: 'Painel Restrições', desc: 'Como a aba Painel Restrições: % eliminadas da próxima semana (meta 90%) e restrições pendentes por obra nas próximas 8 semanas. Pendente = "Não eliminada" ou sem resposta.', groups: [
      { key: 'restricao', name: 'Restrição' }, { key: 'area', name: 'Área responsável' }, { key: 'familia', name: 'Família', collapse: 10 }], data: () => S.D.restr, hay: r => [r.projeto, r.restricao, r.responsavel, r.acao],
      cols: [['semKey', 'Semana', 'sem'], ['projeto', 'Obra', 'proj'], ['sitObra', 'Situação da obra'], ['restricao', 'Restrição'], ['sit', 'Situação'], ['area', 'Área'], ['responsavel', 'Responsável'], ['acao', 'Ação', 'wrap'], ['retorno', 'Retorno', 'dt'], ['limite', 'Limite', 'd'], ['justificativa', 'Justificativa', 'wrap']],
      sub: 'Restrições pendentes das obras nas 8 semanas exibidas.', noDates: true, placeholder: 'Buscar obra, restrição, responsável…' },
  ];
  const SECMAP = Object.fromEntries(SEC.map(s => [s.id, s]));

  const S = { D: null, P: [], Q: [], sec: 'visao', st: {}, open: {} };
  SEC.forEach(s => S.st[s.id] = { f: Object.fromEntries(s.groups.map(g => [g.key, new Set()])), q: '', qn: [], de: '', ate: '', page: 0, sort: null });
  const cur = () => SECMAP[S.sec], st = () => S.st[S.sec];

  /* ---------- carga ---------- */
  function carregar(abas, meta) {
    S.D = D0.build(abas); S.P = D0.projetos(S.D); S.Pmap = new Map(S.P.map(p => [p.projeto, p])); S.Q = D0.qualidade(S.D); Object.assign(S, meta);
    S.D.exec.forEach(r => { r.dia = r.data ? D0.diaSem(r.data) : ''; r.restrPendF = r.restrPend == null ? '' : r.restrPend === 0 ? 'Nenhuma' : r.restrPend <= 3 ? '1 a 3' : '4 ou mais'; });
    S.D.instr.forEach(i => { i.tipoL = { fluxo: 'Fluxo', regra: 'Regra', termo: 'Termo / status', texto: 'Texto', cabecalho: 'Apresentação' }[i.tipo] || i.tipo; i.item = i.tipo === 'termo' ? i.termo : i.tipo === 'regra' ? i.icone : i.tipo === 'fluxo' ? 'Passos' : ''; if (i.tipo === 'fluxo') i.texto = i.cols.join(' | '); });
    S.hoje = isoWeek(S.D.hoje);
    for (const id in S.st) { const x = S.st[id]; for (const k in x.f) x.f[k].clear(); x.page = 0; }
    S.st.restr.f.origem.add('Planilha de Restrição');
    const e = S.D.eqpSheet, wk = e?.semana && e?.ano ? `${e.ano}-S${String(e.semana).padStart(2, '0')}` : null;
    const semanas = new Set(S.D.exec.map(r => r.semKey));
    const def = wk && semanas.has(wk) ? wk : [...semanas].filter(k => k >= S.hoje.key).sort()[0] || [...semanas].sort().pop();
    if (def) S.st.eqp.f.semKey.add(def);
    buildSide(); renderAll();
  }

  /* ---------- menu lateral ---------- */
  function buildSide() {
    const D = S.D, cnt = {
      visao: `${int(D.exec.length)} linhas · ${new Set(D.exec.map(r => r.semKey)).size} semanas`, instr: `${D.instr.filter(i => i.tipo === 'secao').length} seções do manual`,
      cart: `${int(D.cart.length)} obras`, bp: `${int(D.exec.filter(r => r.origem === 'Base Programada').length)} linhas de equipe`,
      eqp: `${new Set(D.exec.filter(r => r.encarregado).map(r => r.encarregado)).size} encarregados`, restr: `${int(D.restr.filter(r => r.origem === 'Planilha de Restrição').length)} restrições`,
      painel: `semana atual ${semLabel(S.hoje.key)}`,
    };
    $('#side').innerHTML = '<div class="sidetitle">Acesso</div>' + SEC.map(s => `<button class="navcard" data-sec="${s.id}" aria-current="${S.sec === s.id}"><span class="ic">${s.ic}</span><span><b>${s.t}</b><span>${cnt[s.id]}</span></span></button>`).join('');
    $$('#side .navcard').forEach(b => b.onclick = () => go(b.dataset.sec));
  }
  function go(id) { S.sec = id; location.hash = id; $$('#side .navcard').forEach(b => b.setAttribute('aria-current', b.dataset.sec === id)); renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /* ---------- filtros ---------- */
  function pass(sec, r, skip) {
    const x = S.st[sec.id];
    for (const g of sec.groups) { if (g.key === skip) continue; const s = x.f[g.key]; if (s.size && !s.has(r[g.key] ?? '')) return false; }
    if (sec.date && !sec.noDates) { const d = sec.date(r); if (x.de && (!d || d < x.de)) return false; if (x.ate && (!d || d > x.ate)) return false; }
    if (x.qn.length) { const h = D0.norm(sec.hay(r).join(' ')); if (!x.qn.every(t => h.includes(t))) return false; }
    return true;
  }
  const filtered = sec => sec.data().filter(r => pass(sec, r));
  function renderFilters() {
    const sec = cur(), x = st(), host = $('#filters'), data = sec.data();
    host.innerHTML = '';
    for (const g of sec.groups) {
      const counts = new Map();
      for (const r of data) { const v = r[g.key]; if (v !== '' && v != null && !counts.has(v)) counts.set(v, 0); }
      for (const r of data) { const v = r[g.key]; if (v !== '' && v != null && pass(sec, r, g.key)) counts.set(v, counts.get(v) + 1); }
      let vals = [...counts.keys()];
      if (vals.length < 2 && !x.f[g.key].size) continue;
      if (g.sort === 'key') vals.sort(); else if (g.sort === 'desc') vals.sort().reverse(); else if (typeof g.sort === 'function') vals.sort(g.sort); else vals.sort((a, b) => counts.get(b) - counts.get(a) || String(a).localeCompare(String(b)));
      const row = document.createElement('div'); row.className = 'fgroup'; row.innerHTML = `<div class="name">${g.name}${g.single ? ' <span style="text-transform:none;font-weight:500">(escolha uma)</span>' : ''}</div><div class="chips"></div>`;
      const box = row.querySelector('.chips'), ok = sec.id + g.key, lim = g.collapse && !S.open[ok] ? g.collapse : Infinity;
      vals.forEach((v, i) => {
        if (i >= lim && !x.f[g.key].has(v)) return;
        const b = document.createElement('button'); b.className = 'chip' + (counts.get(v) ? '' : ' zero'); b.setAttribute('aria-pressed', x.f[g.key].has(v));
        b.innerHTML = `${esc(g.label ? g.label(v) : v)} <span class="n">${int(counts.get(v))}</span>`;
        b.onclick = () => { const s = x.f[g.key]; if (g.single) { s.clear(); s.add(v); } else s.has(v) ? s.delete(v) : s.add(v); x.page = 0; renderAll(); };
        box.appendChild(b);
      });
      if (vals.length > lim) { const m = document.createElement('button'); m.className = 'fmore'; m.textContent = `+ ver todos (${vals.length})`; m.onclick = () => { S.open[ok] = true; renderFilters(); }; box.appendChild(m); }
      else if (g.collapse && S.open[ok]) { const m = document.createElement('button'); m.className = 'fmore'; m.textContent = '− recolher'; m.onclick = () => { S.open[ok] = false; renderFilters(); }; box.appendChild(m); }
      host.appendChild(row);
    }
    host.style.display = host.children.length ? '' : 'none';
    const n = Object.entries(x.f).reduce((a, [k, s]) => a + (sec.groups.find(g => g.key === k)?.single ? 0 : s.size), 0) + (x.de ? 1 : 0) + (x.ate ? 1 : 0) + (x.q ? 1 : 0);
    $('#btnLimpar').disabled = !n; $('#btnLimpar').textContent = n ? `Limpar filtros (${n})` : 'Limpar filtros';
  }
  function only(key, v) { const x = st(), s = x.f[key]; if (!s) return; if (s.size === 1 && s.has(v)) s.clear(); else { s.clear(); s.add(v); } x.page = 0; renderAll(); }

  /* ---------- cabeçalho ---------- */
  function renderHeader() {
    const D = S.D, ds = D.exec.map(r => r.data).filter(Boolean).sort();
    $('#basebar').innerHTML = [`<span class="pill">Fonte: <b>${esc(S.fonte)}</b></span>`, ds.length ? `<span class="pill">Programação: ${br(ds[0])} a ${br(ds[ds.length - 1])}</span>` : '',
      `<span class="pill">Semana atual: ${semLabel(S.hoje.key)}</span>`, D.faltando.length ? `<span class="pill" title="${esc(D.faltando.join(', '))}">⚠ não encontrado: ${esc(D.faltando.join(', '))}</span>` : '', S.gerado ? `<span class="pill">Base de ${esc(S.gerado)}</span>` : ''].join('');
    $('#bannerSaved').style.display = S.origem === 'salva' ? 'flex' : 'none';
  }

  /* ---------- tabela genérica ---------- */
  function cell(type, v, r) {
    if (type === 'st') return stTag(r);
    if (v == null || v === '') return '';
    if (type === 'd') return br(v); if (type === 'dt') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? br(v) : esc(v); if (type === 'n2') return nf(v); if (type === 'pct') return pc(v, 0);
    if (type === 'num') return typeof v === 'number' ? v.toLocaleString('pt-BR') : esc(v); if (type === 'sem') return semLabel(v);
    if (type === 'proj') return `<a href="#" class="mono" data-p="${esc(v)}">${esc(v)}</a>`;
    return esc(v);
  }
  const isNum = ty => ['num', 'n2', 'pct'].includes(ty);
  function table(host, rows, cols, sortState, onSort, per = 0, pager = null, page = 0, onPage = null) {
    const [k, dir] = sortState || [null, 1];
    const L = k ? rows.slice().sort((a, b) => { const x = a[k], y = b[k]; if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir; }) : rows;
    const pages = per ? Math.max(1, Math.ceil(L.length / per)) : 1; page = Math.min(page, pages - 1);
    const pg = per ? L.slice(page * per, page * per + per) : L;
    host.innerHTML = `<table><thead><tr>${cols.map(([c, t, ty]) => `<th class="${isNum(ty) ? 'num' : ''}" data-k="${c}">${t}${k === c ? `<span class="arr">${dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr></thead><tbody>${pg.map(r => `<tr>${cols.map(([c, , ty]) => `<td class="${isNum(ty) ? 'num' : ty === 'wrap' ? 'wrap' : ''}">${cell(ty, r[c], r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="empty">Nada nos filtros atuais.</td></tr>`}</tbody></table>`;
    host.querySelectorAll('th').forEach(h => h.onclick = () => { const c = h.dataset.k; onSort([c, k === c ? -dir : (typeof L.find(r => r[c] != null && r[c] !== '')?.[c] === 'number' ? -1 : 1)]); });
    host.querySelectorAll('a[data-p]').forEach(a => a.onclick = e => { e.preventDefault(); abrirProjeto(a.dataset.p); });
    if (pager) {
      pager.innerHTML = per ? `<span>${int(L.length)} linhas · página ${page + 1} de ${pages}</span><button class="btn" data-a="-1" ${page ? '' : 'disabled'}>‹ Anterior</button><button class="btn" data-a="1" ${page < pages - 1 ? '' : 'disabled'}>Próxima ›</button>` : '';
      pager.querySelectorAll('button').forEach(b => b.onclick = () => onPage(page + +b.dataset.a));
    }
    return L;
  }

  /* ======================= SEÇÕES ======================= */
  const V = {};

  V.visao = R => {
    const D = S.D;
    const prog = sum(R, r => r.upsProg), exec = sum(R, r => r.upsExec), comSt = R.filter(r => ['Executado', 'Executado parcial', 'Cancelado'].includes(r.grupo));
    const execd = comSt.filter(r => r.grupo === 'Executado').length, canc = comSt.filter(r => r.grupo === 'Cancelado'), cancEnel = canc.filter(r => r.statusN.includes('ENEL')).length;
    const aFazer = R.filter(r => r.grupo === 'A executar (sem status)').length, semSt = R.filter(r => r.grupo === 'Sem status (data passada)').length;
    const pw = painelSemana(D.restr, nextWeeks(S.hoje.key, 2)[1]);
    $('#view').innerHTML = kpis([
      ['UPS programado', nf(prog), 'soma de "Quantidade de UPS por Equipe"'], ['UPS executado', nf(exec), `${pc(prog ? exec / prog : null)} do programado`],
      ['Execuções', int(new Set(R.map(r => r.id).filter(Boolean)).size), `${int(R.length)} linhas de equipe · ${new Set(R.map(r => r.projeto)).size} projetos`],
      ['Aderência', pc(comSt.length ? execd / comSt.length : null), `${execd} linhas EXECUTADO de ${comSt.length} com status`],
      ['Cancelamentos', int(canc.length), `${cancEnel} com motivo ENEL · ${canc.length - cancEnel} outros`], ['A executar', int(aFazer), 'data de hoje em diante, sem status'],
      ['Sem status (data passada)', int(semSt), semSt ? 'resultado não registrado' : 'tudo registrado', semSt > 0],
      ['Restrições eliminadas · próxima semana', pc(pw.pct), `${pw.el} de ${pw.base} · meta 90% · ${semLabel(pw.key)}`, pw.base && pw.pct < 0.9],
    ]) + `<div class="grid">
      ${card('c12', 'chSem', 'UPS programado × executado por semana', 'Mesma regra da aba Semanas Programadas. Clique numa semana para filtrar.', legend([['UPS programado', css('--s1')], ['UPS executado', css('--s3')]]))}
      ${card('c7', 'chStatus', 'Resultado por semana', 'Linhas de equipe por "Status finalização".', '<div class="legend" id="lgStatus"></div>')}
      ${card('c5', 'chDesemp', 'Desempenho de execução semanal', 'Valor da aba Semanas Programadas: UPS executado ÷ (equipes × 650 ÷ 4). Não muda com os filtros.')}
      ${card('c4', 'chCausa', 'Causas de cancelamento e parcial', 'Linhas de equipe. Clique para filtrar.')}
      ${card('c4', 'chCancTipo', 'Tipo de cancelamento / parcial', 'Status finalização.')}
      ${card('c4', 'chFam', 'UPS executado por família', 'Clique para filtrar.')}
      ${card('c6', 'chMes', 'UPS programado × executado por mês', 'Pela data da programação.', legend([['UPS programado', css('--s1')], ['UPS executado', css('--s3')]]))}
      <div class="card c6"><h3>Equipes mobilizadas e desempenho mensal</h3><p class="sub">Aba Equipes Mobilizadas, como está na planilha.</p><div class="tablewrap" style="max-height:300px">${tabMob()}</div></div>
      <div class="card c12"><h3>Semanas Programadas</h3><p class="sub">Aba Semanas Programadas, como está na planilha.</p><div class="tablewrap" style="max-height:340px">${tabSemanas()}</div></div>
      <div class="card c12"><h3>Qualidade dos dados e abas do arquivo</h3><p class="sub">Verificações calculadas sobre todas as linhas (não dependem dos filtros), achados das abas calculadas, a aba Verificação da planilha e o inventário das abas.</p><div id="qual"></div></div>
    </div>`;
    const sems = [...new Set(R.map(r => r.semKey).filter(Boolean))].sort();
    Charts.columns($('#chSem'), sems.map(semLabel), [{ name: 'UPS programado', color: css('--s1'), values: sems.map(k => sum(R.filter(r => r.semKey === k), r => r.upsProg)) }, { name: 'UPS executado', color: css('--s3'), values: sems.map(k => sum(R.filter(r => r.semKey === k), r => r.upsExec)) }],
      { grouped: true, unit: 'UPS', tipTitle: i => `Semana ${+sems[i].slice(6)} de ${sems[i].slice(0, 4)}`, onClick: i => only('semKey', sems[i]) });
    const grupos = SIT_EXEC.map(s => s[0]).filter(s => R.some(r => r.grupo === s));
    Charts.columns($('#chStatus'), sems.map(semLabel), grupos.map(g => ({ name: g, color: colorOf(SIT_EXEC, g), values: sems.map(k => R.filter(r => r.semKey === k && r.grupo === g).length) })), { unit: 'linhas', dec: 0 });
    $('#lgStatus').innerHTML = grupos.map(g => `<span><i style="background:${colorOf(SIT_EXEC, g)}"></i>${g}</span>`).join('');
    const SP = D.semanas.filter(s => s.semana && (s.upsProg || s.upsExec));
    Charts.columns($('#chDesemp'), SP.map(s => 'S' + s.semana + '/' + String(s.ano).slice(2)), [{ name: 'Desempenho execução', color: css('--s1'), values: SP.map(s => s.desemp || 0) }], { max: 1, axisFmt: v => nf(v * 100, 0) + '%', valFmt: v => pc(v), unit: '%', tipTitle: i => `Semana ${SP[i].semana}/${SP[i].ano} · ${nf(SP[i].upsExec)} UPS exec.` });
    const cz = R.filter(r => r.grupo === 'Cancelado' || r.grupo === 'Executado parcial');
    Charts.hbars($('#chCausa'), top(countBy(cz, r => r.causa || '(sem causa)')), { fmt: v => nf(v, 0), valueName: 'Linhas', onClick: it => it.label !== '(sem causa)' && only('causa', it.label) });
    Charts.hbars($('#chCancTipo'), top(countBy(cz, r => r.status.toUpperCase())), { fmt: v => nf(v, 0), valueName: 'Linhas' });
    const fam = {}; R.forEach(r => { if (r.familia) fam[r.familia] = (fam[r.familia] || 0) + r.upsExec; });
    Charts.hbars($('#chFam'), top(fam), { valueName: 'UPS executado', onClick: it => only('familia', it.label) });
    const ms = [...new Set(R.map(r => r.mes).filter(Boolean))].sort();
    Charts.columns($('#chMes'), ms.map(mesLabel), [{ name: 'UPS programado', color: css('--s1'), values: ms.map(m => sum(R.filter(r => r.mes === m), r => r.upsProg)) }, { name: 'UPS executado', color: css('--s3'), values: ms.map(m => sum(R.filter(r => r.mes === m), r => r.upsExec)) }], { grouped: true, unit: 'UPS', height: 240, onClick: i => only('mes', ms[i]) });
    renderQual($('#qual'));
  };
  const tabMob = () => `<table><thead><tr><th>Mês</th><th class="num">LM</th><th class="num">LV</th><th class="num">Total equipes</th><th class="num">Meta (UPS)</th><th class="num">UPS executado</th><th class="num">Desempenho</th></tr></thead><tbody>${S.D.mobil.map(m => `<tr><td>${mesLabel((m.mes || '').slice(0, 7))}</td><td class="num">${m.lm ?? ''}</td><td class="num">${m.lv ?? ''}</td><td class="num">${m.total ?? ''}</td><td class="num">${m.meta != null ? nf(m.meta, 0) : ''}</td><td class="num">${nf(m.exec || 0)}</td><td class="num">${m.desemp != null ? pc(m.desemp) : '—'}</td></tr>`).join('')}</tbody></table>`;
  const tabSemanas = () => `<table><thead><tr><th>Semana</th><th class="num">Qtd equipe</th><th class="num">Mínimo UPS</th><th class="num">UPS programado</th><th class="num">Obras</th><th class="num">No prazo</th><th class="num">Fora prazo</th><th class="num">UPS executado</th><th class="num">Desempenho</th></tr></thead><tbody>${S.D.semanas.filter(s => s.semana).map(s => `<tr><td>S${s.semana}/${s.ano}</td><td class="num">${s.qtdEquipe != null ? nf(s.qtdEquipe, 1) : ''}</td><td class="num">${s.minimo != null ? nf(s.minimo) : ''}</td><td class="num">${nf(s.upsProg || 0)}</td><td class="num">${s.obras ?? ''}</td><td class="num">${s.no ?? ''}</td><td class="num">${s.fora ?? ''}</td><td class="num">${nf(s.upsExec || 0)}</td><td class="num">${s.desemp != null ? pc(s.desemp) : '—'}</td></tr>`).join('')}</tbody></table>`;

  /* --- Instruções --- */
  V.instr = R => {
    const x = st(), ids = new Set(R.map(i => i.n)), all = S.D.instr, hl = t => { let s = esc(t); for (const q of x.qn) { if (q.length < 2) continue; s = s.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); } return s; };
    const head = all.filter(i => i.tipo === 'cabecalho' && ids.has(i.n));
    let html = head.length ? `<div class="card" style="margin-bottom:14px">${head.map((h, k) => k === 0 ? `<h3 style="font-size:17px">${hl(h.texto)}</h3>` : `<p class="note" style="font-size:13px;margin:4px 0">${hl(h.texto)}</p>`).join('')}</div>` : '';
    const secs = [...new Set(all.filter(i => i.tipo === 'secao').map(i => i.secao))];
    html += '<div class="card man">';
    let shown = 0;
    for (const sname of secs) {
      const its = all.filter(i => i.secao === sname && i.tipo !== 'secao' && ids.has(i.n)); if (!its.length) continue; shown++;
      html += `<h4>${hl(sname)}</h4>`;
      const fl = its.filter(i => i.tipo === 'fluxo');
      if (fl.length) { const cols = [0, 1, 2, 3, 4]; html += `<div class="flow">${cols.map(c => `<div class="st"><div class="num">${esc(fl[0]?.cols[c] || c + 1)}</div><div class="ab">${hl(fl[1]?.cols[c] || '')}</div><div class="tt">${hl(fl[2]?.cols[c] || '')}</div><div class="tx">${hl(fl[3]?.cols[c] || '')}</div></div>`).join('')}</div>`; }
      const rg = its.filter(i => i.tipo === 'regra'); if (rg.length) html += rg.map(r => `<div class="rule"><span class="i ${r.icone === '✔' ? 'ok' : r.icone === '✖' ? 'no' : 'inf'}">${r.icone}</span><span>${hl(r.texto)}</span></div>`).join('');
      const tx = its.filter(i => i.tipo === 'texto'); if (tx.length) html += tx.map(t => `<p style="font-size:13px;color:var(--ink-2);margin:6px 0">${hl(t.texto)}</p>`).join('');
      const tm = its.filter(i => i.tipo === 'termo'); if (tm.length) html += `<div class="terms">${tm.map(t => `<div>${hl(t.termo)}</div><div>${hl(t.texto)}</div>`).join('')}</div>`;
    }
    html += shown ? '</div>' : '<div class="empty">Nada encontrado no manual com essa busca.</div></div>';
    $('#view').innerHTML = kpis([['Seções', secs.length, 'do manual'], ['Regras de ouro', all.filter(i => i.tipo === 'regra').length, '✔ fazer · ✖ não fazer · ℹ informação'], ['Termos e status explicados', all.filter(i => i.tipo === 'termo').length, 'status, colunas, botões e abas'], ['Itens na busca atual', R.length, x.q ? `para "${esc(x.q)}"` : 'sem busca']]) + html;
  };

  /* --- Carteira --- */
  V.cart = R => {
    const fora = R.filter(r => r.prazo === 'FORA DO PRAZO').length, venc = R.filter(r => r.diasVenc != null && r.diasVenc < 0).length, v30 = R.filter(r => r.diasVenc != null && r.diasVenc >= 0 && r.diasVenc <= 30).length;
    const projs = new Set(R.map(r => r.projeto)), progs = S.P.filter(p => projs.has(p.projeto));
    $('#view').innerHTML = kpis([['Obras', int(R.length), `de ${S.D.cart.length} na CARTEIRA`], ['Ups_Plan', nf(sum(R, r => r.upsPlan)), 'UPS total previsto (ENEL)'], ['Ups_Exec_Projeto', nf(sum(R, r => r.upsExecProj)), 'UPS já executado no projeto (ENEL)'],
      ['Fora do prazo', int(fora), `${R.filter(r => r.prazo === 'NO PRAZO').length} no prazo · ${R.filter(r => !r.prazo).length} sem informação`, fora > 0], ['Vencidas', int(venc), `${v30} vencem em até 30 dias`],
      ['Programar? = SIM', int(R.filter(r => r.programar === 'SIM').length), `${R.filter(r => r.sigeoData).length} com programação no SIGEO`], ['Com programação na planilha', int(progs.filter(p => p.nExec).length), `UPS executado registrado: ${nf(sum(progs, p => p.upsExec))}`]]) +
      `<div class="grid">${card('c4', 'chResumo', 'Resumo contratada', 'Obras por situação informada pela Start. Clique para filtrar.')}${card('c4', 'chStObra', 'Status obra', 'Calculado pelo botão ATUALIZAR STATUS.')}${card('c4', 'chPrior', 'Priorização MV', 'Clique para filtrar.')}
      ${card('c4', 'chVenc', 'Vencimento do prazo', 'Coluna "Qtd Dias p/ Venc".')}${card('c4', 'chCFam', 'Ups_Plan por família', 'UPS previsto (ENEL).')}${card('c4', 'chSigeo', 'Status da programação no SIGEO', 'Coluna "Status Programacao".')}
      ${card('c6', 'chCMun', 'Obras por município', 'Clique para filtrar.')}${card('c6', 'chCTop', 'Maiores Ups_Plan sem execução registrada', 'Obras da carteira sem UPS executado nas abas Histórico/Base. Clique para abrir.')}</div>`;
    const hb = (id, key, n = 16) => Charts.hbars($('#' + id), top(countBy(R, r => r[key] || '(vazio)'), n), { fmt: v => nf(v, 0), valueName: 'Obras', onClick: it => it.label !== '(vazio)' && only(key, it.label) });
    hb('chResumo', 'resumo'); hb('chStObra', 'statusObra'); hb('chPrior', 'priorizacao'); hb('chSigeo', 'sigeoStatus');
    Charts.hbars($('#chCMun'), top(countBy(R, r => r.municipioN)), { fmt: v => nf(v, 0), valueName: 'Obras', onClick: it => only('municipioN', it.label) });
    Charts.columns($('#chVenc'), FX, [{ name: 'Obras', color: css('--s1'), values: FX.map(f => R.filter(r => r.faixaVenc === f).length) }], { dec: 0, unit: 'obras', labelEvery: 1, onClick: i => only('faixaVenc', FX[i]) });
    const fam = {}; R.forEach(r => { if (r.familia) fam[r.familia] = (fam[r.familia] || 0) + (r.upsPlan || 0); });
    Charts.hbars($('#chCFam'), top(fam), { valueName: 'Ups_Plan', onClick: it => only('familia', it.label) });
    const sem = R.filter(r => !(S.Pmap.get(r.projeto)?.upsExec > 0) && r.upsPlan).sort((a, b) => b.upsPlan - a.upsPlan).slice(0, 10);
    Charts.hbars($('#chCTop'), sem.map(r => ({ label: r.projeto, value: r.upsPlan, sub: `${r.resumo || 'sem Resumo'} · ${r.prazo || 'sem prazo'}` })), { valueName: 'Ups_Plan', onClick: it => abrirProjeto(it.label) });
  };

  /* --- Base Programada --- */
  V.bp = R => {
    const prog = sum(R, r => r.upsProg), exec = sum(R, r => r.upsExec), sems = [...new Set(R.map(r => r.semKey).filter(Boolean))].sort();
    const SPm = new Map(S.D.semanas.map(s => [`${s.ano}-S${String(s.semana).padStart(2, '0')}`, s]));
    const pend = R.filter(r => r.restrPend > 0);
    $('#view').innerHTML = kpis([['Linhas de equipe', int(R.length), `${int(new Set(R.map(r => r.id).filter(Boolean)).size)} execuções · ${new Set(R.map(r => r.projeto)).size} projetos`], ['UPS programado', nf(prog), `semanas ${sems.map(semLabel).join(', ') || '—'}`],
      ['UPS executado', nf(exec), `${pc(prog ? exec / prog : null)} do programado`], ['A executar', int(R.filter(r => r.grupo === 'A executar (sem status)').length), 'sem status, data de hoje em diante'],
      ['Sem status (data passada)', int(R.filter(r => r.grupo === 'Sem status (data passada)').length), 'registrar o resultado', R.some(r => r.grupo === 'Sem status (data passada)')],
      ['Com restrição pendente', int(new Set(pend.map(r => r.id)).size), 'execuções com "Número de restrição pendentes" > 0', pend.length > 0], ['Fora do prazo (ENEL)', int(new Set(R.filter(r => r.prazo === 'FORA DO PRAZO').map(r => r.projeto)).size), 'projetos']]) +
      `<div class="grid">${card('c6', 'chBpSem', 'UPS programado × mínimo da semana', 'Mínimo UPS semana vem da aba Semanas Programadas (meta mensal ÷ 4 × 80%).', legend([['UPS programado', css('--s1')], ['Mínimo UPS semana', css('--s4')]]))}
      ${card('c6', 'chBpDia', 'UPS programado por dia', 'Clique numa coluna para filtrar a semana.')}
      ${card('c4', 'chBpEq', 'UPS programado por encarregado', 'Clique para filtrar.')}${card('c4', 'chBpFam', 'UPS programado por família', 'Clique para filtrar.')}${card('c4', 'chBpSt', 'Resultado', 'Linhas de equipe.')}
      ${card('c6', 'chBpRes', 'Execuções com restrições pendentes', 'Coluna "Número de restrição pendentes". Clique para abrir o projeto.')}${card('c6', 'chBpEqDia', 'Equipes programadas por dia', 'Encarregados distintos com programação no dia.')}</div>`;
    Charts.columns($('#chBpSem'), sems.map(semLabel), [{ name: 'UPS programado', color: css('--s1'), values: sems.map(k => sum(R.filter(r => r.semKey === k), r => r.upsProg)) }, { name: 'Mínimo UPS semana', color: css('--s4'), values: sems.map(k => SPm.get(k)?.minimo || 0) }], { grouped: true, unit: 'UPS', onClick: i => only('semKey', sems[i]) });
    const ds = [...new Set(R.map(r => r.data).filter(Boolean))].sort();
    Charts.columns($('#chBpDia'), ds.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)), [{ name: 'UPS programado', color: css('--s1'), values: ds.map(d => sum(R.filter(r => r.data === d), r => r.upsProg)) }], { unit: 'UPS', sublabels: ds.map(D0.diaSem), tipTitle: i => `${br(ds[i])} (${D0.diaSem(ds[i])})`, onClick: i => only('semKey', isoWeek(ds[i]).key) });
    const by = (k, f) => { const m = {}; R.forEach(r => { const v = r[k]; if (v) m[v] = (m[v] || 0) + f(r); }); return m; };
    Charts.hbars($('#chBpEq'), top(by('encarregado', r => r.upsProg), 20), { valueName: 'UPS programado', onClick: it => only('encarregado', it.label) });
    Charts.hbars($('#chBpFam'), top(by('familia', r => r.upsProg)), { valueName: 'UPS programado', onClick: it => only('familia', it.label) });
    Charts.hbars($('#chBpSt'), SIT_EXEC.map(s => ({ label: s[0], value: R.filter(r => r.grupo === s[0]).length, color: colorOf(SIT_EXEC, s[0]) })).filter(x => x.value), { fmt: v => nf(v, 0), valueName: 'Linhas', onClick: it => only('grupo', it.label) });
    const rp = {}; R.forEach(r => { if (r.restrPend > 0) rp[r.id] = { label: r.id, value: r.restrPend, sub: `${br(r.data)} · ${r.projeto}`, projeto: r.projeto }; });
    Charts.hbars($('#chBpRes'), Object.values(rp).sort((a, b) => b.value - a.value).slice(0, 12), { fmt: v => nf(v, 0), valueName: 'Restrições pendentes', color: css('--s2'), onClick: it => abrirProjeto(it.projeto) });
    Charts.columns($('#chBpEqDia'), ds.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)), [{ name: 'Equipes', color: css('--s3'), values: ds.map(d => new Set(R.filter(r => r.data === d && r.encarregado).map(r => r.encarregado)).size) }], { dec: 0, unit: 'equipes', sublabels: ds.map(D0.diaSem) });
  };

  /* --- Equipes programadas --- */
  V.eqp = R => {
    const x = st(), wk = [...x.f.semKey][0] || '', e = S.D.eqpSheet || {};
    const sp = S.D.semanas.find(s => `${s.ano}-S${String(s.semana).padStart(2, '0')}` === wk);
    const mon = wk ? weekStart(wk) : null, days = mon ? [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i)) : [];
    const ups = sum(R, r => r.upsProg), min = sp?.minimo;
    const futuras = [...new Set(S.D.exec.filter(r => r.origem === 'Base Programada' && r.semKey > S.hoje.key).map(r => r.semKey))].sort();
    const sheetW = e.semana && e.ano ? `${e.ano}-S${String(e.semana).padStart(2, '0')}` : '';
    $('#view').innerHTML = kpis([
      ['Semana exibida', semLabel(wk) || '—', days.length ? `${br(days[0])} a ${br(days[6])}` : ''], ['UPS programados', nf(ups), `UPS executado: ${nf(sum(R, r => r.upsExec))}`],
      ['Mínimo UPS da semana', min != null ? nf(min) : '—', min != null ? (ups >= min ? '✔ atingido' : `✖ faltam ${nf(min - ups)}`) : 'semana fora da aba Semanas Programadas', min != null && ups < min],
      ['Equipes programadas', new Set(R.filter(r => r.encarregado).map(r => r.encarregado)).size, `${int(R.length)} linhas · ${new Set(R.map(r => r.projeto)).size} projetos`],
      ['Semanas futuras na Base', futuras.length, futuras.length ? futuras.map(semLabel).join(', ') : 'nenhuma'],
      ['Horizonte (aba Equipes programadas)', e.horizonte || '—', [e.horizonteTxt, sheetW && `valores da planilha para ${semLabel(sheetW)}: ${nf(e.ups)} UPS · ${e.meta}`].filter(Boolean).join(' · '), /NÃO/.test(e.horizonteTxt || '')],
    ]) + `<div class="card" style="margin-bottom:14px"><h3>Equipes × dias · ${semLabel(wk)}</h3><p class="sub">Cada célula lista os projetos da equipe no dia, com a cor do resultado. Entram todas as equipes programadas (a aba da planilha mostra só CM1 a LV5). Clique num projeto para abrir o histórico; escolha outra semana no filtro acima.</p>${legend(SIT_EXEC.map(s => [s[0], colorOf(SIT_EXEC, s[0])]))}<div class="tablewrap eqgrid" id="grid" style="max-height:none"></div></div>
      <div class="grid">${card('c6', 'chEqUps', 'UPS programado por dia', 'Semana exibida.')}${card('c6', 'chEqRes', 'Resultado por equipe', 'Linhas de equipe da semana.', legend(SIT_EXEC.map(s => [s[0], colorOf(SIT_EXEC, s[0])])))}
      <div class="card c12"><h3>Escala: 6 semanas anteriores, semana atual e a próxima</h3><p class="sub">Equipe × dia, cor pelo resultado (o pior do dia). Não depende da semana escolhida.</p>${legend([...SIT_EXEC.map(s => [s[0], colorOf(SIT_EXEC, s[0])]), ['Sem programação', '#f4f6f5']])}<div class="hm" id="hm"></div></div>
      <div class="card c12"><h3>Cadastro de equipes (aba Auxiliar ListSusp)</h3><p class="sub">Código, encarregado, tipo, turno e composição, como estão na planilha.</p><div class="tablewrap">${tabCad()}</div></div></div>`;
    // grade
    const eqs = new Map(); R.forEach(r => { const k = r.equipeCod || r.encarregado; if (!k) return; if (!eqs.has(k)) eqs.set(k, { cod: r.equipeCod, enc: r.encarregado, tipo: r.tipoEquipe, rows: [] }); eqs.get(k).rows.push(r); });
    const L = [...eqs.values()].sort((a, b) => (a.cod || 'zz').localeCompare(b.cod || 'zz', 'pt', { numeric: true }));
    const pr = s => SIT_EXEC.findIndex(x => x[0] === s);
    $('#grid').innerHTML = `<table><thead><tr><th>Equipe</th><th>Encarregado</th>${days.map(d => `<th>${br(d).slice(0, 5)} ${D0.diaSem(d)}</th>`).join('')}<th class="num">UPS semana</th></tr></thead><tbody>${L.map(q => `<tr><td class="cod">${esc(q.cod)}</td><td>${esc(q.enc)}<div class="note">${esc(q.tipo)}</div></td>${days.map(d => { const rs = q.rows.filter(r => r.data === d); const pj = [...new Set(rs.map(r => r.projeto))]; return `<td>${pj.map(p => { const g = rs.filter(r => r.projeto === p).map(r => r.grupo).sort((a, b) => pr(a) - pr(b)).pop(); return `<span class="pj" data-p="${esc(p)}" style="border-left-color:${colorOf(SIT_EXEC, g)}" title="${esc(g)}">${esc(p)}</span>`; }).join('')}</td>`; }).join('')}<td class="num">${nf(sum(q.rows, r => r.upsProg))}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Equipes programadas no dia</td>${days.map(d => `<td>${new Set(R.filter(r => r.data === d).map(r => r.equipeCod || r.encarregado)).size}</td>`).join('')}<td class="num">${nf(ups)}</td></tr></tfoot></table>`;
    $$('#grid .pj').forEach(s => s.onclick = () => abrirProjeto(s.dataset.p));
    Charts.columns($('#chEqUps'), days.map(d => br(d).slice(0, 5)), [{ name: 'UPS programado', color: css('--s1'), values: days.map(d => sum(R.filter(r => r.data === d), r => r.upsProg)) }, { name: 'UPS executado', color: css('--s3'), values: days.map(d => sum(R.filter(r => r.data === d), r => r.upsExec)) }], { grouped: true, unit: 'UPS', sublabels: days.map(D0.diaSem), labelEvery: 1 });
    const encs = [...new Set(R.map(r => r.encarregado).filter(Boolean))].sort();
    Charts.columns($('#chEqRes'), encs.map(n => n.split(' ')[0]), SIT_EXEC.map(s => ({ name: s[0], color: colorOf(SIT_EXEC, s[0]), values: encs.map(n => R.filter(r => r.encarregado === n && r.grupo === s[0]).length) })).filter(s => s.values.some(Boolean)), { dec: 0, unit: 'linhas', tipTitle: i => encs[i] });
    // escala 8 semanas (todas as linhas, respeita filtros de equipe)
    const sec = cur(), H = S.D.exec.filter(r => pass(sec, r, 'semKey'));
    const last = addDays(weekStart(S.hoje.key), 13), first = addDays(weekStart(S.hoje.key), -42);
    const ds = []; for (let d = first; d <= last; d = addDays(new Date(d + 'T12:00:00Z'), 1)) ds.push(d);
    const cellM = {}; H.forEach(r => { if (r.data >= first && r.data <= last && r.encarregado) (cellM[r.encarregado + '|' + r.data] ||= []).push(r); });
    const nomes = [...new Set(H.filter(r => r.data >= first && r.data <= last && r.encarregado).map(r => r.encarregado))].sort();
    $('#hm').innerHTML = `<table><thead><tr><th class="day" style="position:sticky;left:0;background:#fff;z-index:2"></th>${ds.map(d => { const wd = new Date(d + 'T12:00:00').getDay(); return `<th class="day${wd === 0 || wd === 6 ? ' we' : ''}">${d.slice(8, 10)}<br>${D0.diaSem(d)[0]}</th>`; }).join('')}</tr></thead><tbody>${nomes.map(n => `<tr><td class="who">${esc(n)}</td>${ds.map(d => { const rs = cellM[n + '|' + d]; if (!rs) return '<td class="cell" style="background:#f4f6f5"></td>'; const g = rs.map(r => r.grupo).sort((a, b) => pr(a) - pr(b)).pop(); return `<td class="cell" data-t="${esc(`${br(d)} · ${n}|${rs.map(r => `${r.projeto} – ${r.status || r.grupo}`).join('|')}`)}" style="background:${colorOf(SIT_EXEC, g)}"></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    $$('#hm td.cell[data-t]').forEach(c => { c.onmousemove = ev => { const [h, ...rest] = c.dataset.t.split('|'); const t = $('#tip'); t.innerHTML = `<b>${esc(h)}</b>${rest.map(v => `<div>${esc(v)}</div>`).join('')}`; t.style.opacity = 1; t.style.left = Math.min(ev.clientX + 14, innerWidth - t.offsetWidth - 8) + 'px'; t.style.top = ev.clientY + 16 + 'px'; }; c.onmouseleave = Charts.hideTip; });
  };
  const tabCad = () => S.D.equipes.length ? `<table><thead><tr><th>Código</th><th>Encarregado</th><th>Tipo</th><th>Início turno</th><th>Fim turno</th><th class="num">Enc. turma</th><th class="num">Oficial eletric.</th><th class="num">Ajudante</th><th class="num">Mot. Munck</th><th class="num">Motorista</th></tr></thead><tbody>${S.D.equipes.map(e => `<tr><td>${esc(e.cod)}</td><td>${esc(e.enc)}</td><td>${esc(e.tipo)}</td><td>${esc(e.ini)}</td><td>${esc(e.fim)}</td>${['encT', 'ofic', 'ajud', 'munck', 'mot'].map(k => `<td class="num">${e[k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<div class="empty">Cadastro não encontrado.</div>';

  /* --- Planilha de Restrição --- */
  V.restr = R => {
    const c = countBy(R, r => r.sit), el = c['Eliminada'] || 0, na = c['Não aplicável'] || 0, base = R.length - na;
    const P = R.filter(r => r.sit === 'Não eliminada' || r.sit === 'Sem resposta');
    $('#view').innerHTML = kpis([['Restrições', int(R.length), `${new Set(R.map(r => r.projeto)).size} obras · ${new Set(R.map(r => r.semKey)).size} semanas`], ['% eliminadas', pc(base ? el / base : null), `${el} de ${base} (total − não aplicável) · meta 90%`, base && el / base < 0.9],
      ['Eliminadas', int(el)], ['Não eliminadas', int(c['Não eliminada'] || 0)], ['Sem resposta', int(c['Sem resposta'] || 0), '"RESTRIÇÃO ELIMINADA?" vazio'], ['Não aplicável', int(na)],
      ['Pendentes sem ação', int(P.filter(r => !r.acao).length), 'não eliminada ou sem resposta, sem AÇÃO preenchida', P.some(r => !r.acao)]]) +
      `<div class="grid">${card('c6', 'chRPct', '% eliminadas por semana', 'Eliminadas ÷ (total − não aplicável). Tracejado = meta 90%.')}${card('c6', 'chRSit', 'Situação por semana', 'Coluna "RESTRIÇÃO ELIMINADA?". Vazio = sem resposta.', '<div class="legend" id="lgRSit"></div>')}
      ${card('c6', 'chRTipo', 'Situação por tipo de restrição', 'Restrições por tipo, empilhadas pela situação.', '<div class="legend" id="lgRTipo"></div>')}${card('c6', 'chRArea', 'Pendentes por área responsável', 'Não eliminada + sem resposta. Clique para filtrar.')}
      ${card('c6', 'chRResp', 'Pendentes por responsável', 'Clique para filtrar.')}${card('c6', 'chRObra', 'Obras com mais pendências', 'Clique para abrir o histórico do projeto.')}</div>`;
    const sems = [...new Set(R.map(r => r.semKey).filter(Boolean))].sort();
    const pct = sems.map(k => { const w = R.filter(r => r.semKey === k), n = w.length - w.filter(r => r.sit === 'Não aplicável').length; return n ? w.filter(r => r.sit === 'Eliminada').length / n : 0; });
    Charts.columns($('#chRPct'), sems.map(semLabel), [{ name: '% eliminadas', color: css('--s1'), values: pct }], { max: 1, ref: 0.9, refLabel: 'meta 90%', axisFmt: v => nf(v * 100, 0) + '%', valFmt: v => pc(v), unit: '%', onClick: i => only('semKey', sems[i]) });
    const sits = SIT_RESTR.map(s => s[0]).filter(s => R.some(r => r.sit === s));
    Charts.columns($('#chRSit'), sems.map(semLabel), sits.map(s => ({ name: s, color: colorOf(SIT_RESTR, s), values: sems.map(k => R.filter(r => r.semKey === k && r.sit === s).length) })), { dec: 0, unit: 'restrições' });
    $('#lgRSit').innerHTML = $('#lgRTipo').innerHTML = sits.map(s => `<span><i style="background:${colorOf(SIT_RESTR, s)}"></i>${s}</span>`).join('');
    const tipos = Object.entries(countBy(R, r => r.restricao)).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    Charts.columns($('#chRTipo'), tipos.map(t => t.length > 14 ? t.slice(0, 13) + '…' : t), sits.map(s => ({ name: s, color: colorOf(SIT_RESTR, s), values: tipos.map(t => R.filter(r => r.restricao === t && r.sit === s).length) })), { dec: 0, unit: 'restrições', labelEvery: 1, height: 300, tipTitle: i => tipos[i], onClick: i => only('restricao', tipos[i]) });
    Charts.hbars($('#chRArea'), top(countBy(P, r => r.area || '(sem área)')), { fmt: v => nf(v, 0), valueName: 'Pendentes', color: css('--s2'), onClick: it => it.label !== '(sem área)' && only('area', it.label) });
    Charts.hbars($('#chRResp'), top(countBy(P, r => r.responsavel || '(sem responsável)')), { fmt: v => nf(v, 0), valueName: 'Pendentes', color: css('--s2'), onClick: it => it.label !== '(sem responsável)' && only('responsavel', it.label) });
    Charts.hbars($('#chRObra'), top(countBy(P, r => r.projeto)), { fmt: v => nf(v, 0), valueName: 'Pendentes', color: css('--s2'), onClick: it => abrirProjeto(it.label) });
  };

  /* --- Painel Restrições --- */
  function painelSemana(R, key) {
    const w = R.filter(r => r.semKey === key), na = w.filter(r => r.sit === 'Não aplicável').length, el = w.filter(r => r.sit === 'Eliminada').length, base = w.length - na;
    const pend = w.filter(r => r.sit === 'Não eliminada' || r.sit === 'Sem resposta');
    return { key, total: w.length, el, base, pct: base ? el / base : null, pend: pend.length, obrasPend: new Set(pend.map(r => r.projeto)).size, rows: w };
  }
  function painelData(R) {
    const ws = nextWeeks(S.hoje.key, 8), porSem = {};
    const has = new Set(R.map(r => r.semKey + '|' + r.projeto));
    for (const k of ws) {
      const p = painelSemana(R, k), obras = [...new Set(p.rows.map(r => r.projeto))].sort();
      p.obras = obras.map(o => { const rs = p.rows.filter(r => r.projeto === o), n = rs.filter(r => r.sit === 'Não eliminada' || r.sit === 'Sem resposta').length; return { obra: o, pend: n, sit: has.has(prevWeek(k) + '|' + o) ? '↺ Veio da sem. anterior' : 'Nova' }; });
      porSem[k] = p;
    }
    return { ws, porSem };
  }
  V.painel = R => {
    const { ws, porSem } = painelData(R), prox = porSem[ws[1]], atual = porSem[ws[0]], ini = weekStart(ws[0]);
    const per = k => { const m = weekStart(k); return `${br(addDays(m, 0)).slice(0, 5)} a ${br(addDays(m, 6))}`; };
    $('#view').innerHTML = kpis([['Semana atual', semLabel(ws[0]), per(ws[0])], ['Próxima semana', semLabel(ws[1]), per(ws[1])],
      ['% eliminadas · próxima semana', pc(prox.pct), `${prox.el} de ${prox.base} restrições eliminadas`, prox.base && prox.pct < 0.9], ['Meta · próxima semana', prox.base ? (prox.pct >= 0.9 ? '✔ BATIDA' : '✖ NÃO BATIDA') : '—', 'meta mínima de eliminação: 90%', prox.base && prox.pct < 0.9],
      ['Pendentes · próxima semana', int(prox.pend), `em ${prox.obrasPend} obras`], ['Pendentes · semana atual', int(atual.pend), `em ${atual.obrasPend} obras · ${pc(atual.pct)} eliminadas`]]) +
      `<div class="grid" style="margin-bottom:14px">${card('c6', 'chPPct', '% eliminadas · próximas 8 semanas', 'Tracejado = meta 90%.')}${card('c6', 'chPPend', 'Pendentes por semana e situação da obra', '"Veio da sem. anterior" = a obra já tinha restrição na semana anterior.', legend([['Nova', css('--s1')], ['↺ Veio da sem. anterior', css('--s2')]]))}</div>
      <div class="card"><h3>Restrições por obra · próximas 8 semanas</h3><p class="sub">Número de restrições pendentes por obra. ✔ Liberada = nenhuma pendente. Cores como na planilha: verde liberada, amarelo 1 a 3, vermelho 4 ou mais. Clique na obra para abrir o histórico.</p><div class="pweeks">${ws.map(k => { const p = porSem[k]; return `<div class="pw"><div class="h"><b>${semLabel(k)}</b> <span class="d">${per(k)}</span><div class="pc">${p.total ? pc(p.pct) : '—'}</div><div class="d">${p.total ? `${p.el} de ${p.base} eliminadas · ${p.pct >= 0.9 ? '✔ meta batida' : '✖ meta não batida'}` : 'Sem restrições lançadas'}</div></div>${p.obras.length ? `<table><tbody>${p.obras.map(o => `<tr><td><a href="#" class="mono" data-p="${esc(o.obra)}">${esc(o.obra)}</a></td><td class="num" style="background:${o.pend === 0 ? '#e6f6e6' : o.pend <= 3 ? '#fff6e0' : '#fde8e8'}">${o.pend === 0 ? '✔' : o.pend}</td><td class="note">${esc(o.sit)}</td></tr>`).join('')}</tbody></table>` : ''}</div>`; }).join('')}</div></div>`;
    $$('#view a[data-p]').forEach(a => a.onclick = e => { e.preventDefault(); abrirProjeto(a.dataset.p); });
    Charts.columns($('#chPPct'), ws.map(semLabel), [{ name: '% eliminadas', color: css('--s1'), values: ws.map(k => porSem[k].pct || 0) }], { max: 1, ref: 0.9, refLabel: 'meta 90%', axisFmt: v => nf(v * 100, 0) + '%', valFmt: v => pc(v), unit: '%', labelEvery: 1 });
    Charts.columns($('#chPPend'), ws.map(semLabel), [{ name: 'Nova', color: css('--s1'), values: ws.map(k => sum(porSem[k].obras.filter(o => o.sit === 'Nova'), o => o.pend)) }, { name: '↺ Veio da sem. anterior', color: css('--s2'), values: ws.map(k => sum(porSem[k].obras.filter(o => o.sit !== 'Nova'), o => o.pend)) }], { dec: 0, unit: 'pendentes', labelEvery: 1 });
  };

  /* ---------- qualidade (dentro da Visão geral) ---------- */
  function renderQual(host) {
    const ord = { crit: 0, warn: 1, info: 2, ok: 3 }, nome = { crit: 'Crítico', warn: 'Atenção', info: 'Aviso', ok: 'OK' };
    const det = (q, open) => `<details class="q ${q.nivel}"${open ? ' open' : ''}><summary><span class="lvl">${nome[q.nivel]}</span><b>${esc(q.titulo)}</b><span class="cnt">${q.itens ? (q.nivel === 'ok' ? 'sem ocorrências' : q.itens.length + ' ocorrência(s)') : ''}</span></summary><p>${esc(q.texto)}</p>${q.itens?.length ? `<div class="tablewrap" style="max-height:260px"><table>${q.cab ? `<thead><tr>${q.cab.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : ''}<tbody>${q.itens.slice(0, 500).map(it => `<tr>${it.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}</details>`;
    const Q = S.Q.slice().sort((a, b) => ord[a.nivel] - ord[b.nivel]), Vf = S.D.verif, vt = countBy(Vf, v => v.tipo), I = S.inventario || [];
    host.innerHTML = `<h3 style="margin:6px 0">Verificações do painel <span class="note">${['crit', 'warn', 'info', 'ok'].map(n => `${nome[n]}: ${Q.filter(q => q.nivel === n).length}`).join(' · ')}</span></h3><div class="qlist">${Q.map(q => det(q, false)).join('')}</div>
      <h3 style="margin:16px 0 6px">Achados da análise das abas calculadas</h3><div class="qlist">${(S.achados || []).map(a => det(a, true)).join('') || '<div class="note">Valem para o arquivo embutido; não são recalculados ao importar outro arquivo.</div>'}</div>
      <h3 style="margin:16px 0 6px">Aba Verificação da planilha</h3>${Vf.length ? `<p class="note">${esc(window.BASE?.verificacao_titulo || '')} Por tipo: ${Object.entries(vt).map(([k, n]) => `${esc(k)} (${n})`).join(' · ')}</p><div class="tablewrap" style="max-height:300px"><table><thead><tr><th>Tipo</th><th>Aba</th><th class="num">Linha</th><th>Projeto</th><th>Detalhe</th></tr></thead><tbody>${Vf.map(v => `<tr><td>${esc(v.tipo)}</td><td>${esc(v.aba)}</td><td class="num">${esc(v.linha)}</td><td class="mono">${esc(v.projeto)}</td><td class="wrap">${esc(v.detalhe)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Aba Verificação não encontrada.</div>'}
      <h3 style="margin:16px 0 6px">Parâmetros (aba Auxiliar ListSusp)</h3><div style="display:flex;flex-wrap:wrap;gap:6px">${S.D.param.map(p => `<span class="tag">${esc(p.p)}: <b>${esc(typeof p.v === 'number' ? (/margem/i.test(p.p) ? pc(p.v, 0) : p.v.toLocaleString('pt-BR')) : p.v)}</b></span>`).join('')}</div>
      <h3 style="margin:16px 0 6px">Abas do arquivo</h3><div class="tablewrap" style="max-height:420px"><table><thead><tr><th>Aba</th><th>Visível?</th><th class="num">Linhas com dados</th><th>Conteúdo</th><th>No painel</th></tr></thead><tbody>${I.map(a => `<tr><td>${esc(a.aba)}</td><td>${esc(a.vis)}</td><td class="num">${a.linhas ?? ''}</td><td class="wrap">${esc(a.conteudo)}</td><td class="wrap">${esc(a.uso)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- lista geral (rodapé de cada seção) ---------- */
  function listaRows(sec, R) {
    if (sec.id === 'painel') { const { ws, porSem } = painelData(R); const sitO = {}; ws.forEach(k => porSem[k].obras.forEach(o => sitO[k + '|' + o.obra] = o.sit)); return R.filter(r => ws.includes(r.semKey) && (r.sit === 'Não eliminada' || r.sit === 'Sem resposta')).map(r => ({ ...r, sitObra: sitO[r.semKey + '|' + r.projeto] })); }
    return R;
  }
  function renderLista(R) {
    const sec = cur(), x = st(), rows = listaRows(sec, R);
    $('#listaCnt').textContent = `· ${int(rows.length)} registro(s)`; $('#listaSub').textContent = sec.sub + ' Clique no título da coluna para ordenar; clique no projeto para abrir o histórico.';
    S.listaAtual = table($('#tLista'), rows, sec.cols, x.sort, s => { x.sort = s; renderLista(R); }, 50, $('#pgLista'), x.page, p => { x.page = p; renderLista(R); });
  }

  /* ---------- detalhe do projeto (janela) ---------- */
  function abrirProjeto(cod) {
    const p = S.Pmap.get(cod); if (!p) return; const c = p.cart || {};
    $('#dTitulo').textContent = p.projeto;
    $('#dSub').innerHTML = [p.familia, c.tipoProjeto, c.municipio && `${c.bairro ? c.bairro + ' · ' : ''}${c.municipio}`, c.circuito && 'Circuito ' + c.circuito, p.naCarteira ? 'Na CARTEIRA' : 'Fora da CARTEIRA atual'].filter(Boolean).map(esc).join(' · ');
    const F = [['Resumo contratada', c.resumo], ['Status obra', c.statusObra], ['Prazo', c.prazo ? `${c.prazo}${c.diasVenc != null ? ` (${c.diasVenc} dias)` : ''}` : ''], ['Prazo final', br(c.prazoFinal)], ['Priorização MV', c.priorizacao],
      ['Ups_Plan (ENEL)', p.upsPlan != null ? nf(p.upsPlan) : ''], ['Ups_Exec_Projeto (ENEL)', p.upsExecProj != null ? nf(p.upsExecProj) : ''], ['UPS programado (planilha)', nf(p.upsProg)], ['UPS executado (planilha)', nf(p.upsExec)],
      ['Execuções', p.nExec], ['Período', p.primeira ? `${br(p.primeira)} a ${br(p.ultima)}` : ''], ['Programação SIGEO', c.sigeoData ? `${br(c.sigeoData)} · ${c.sigeoStatus || ''} · ${c.sigeoTipo || ''}` : ''], ['PowerON', c.powerOn], ['CHI', c.chi], ['Restrições lançadas', p.nRestr]].filter(f => f[1] !== '' && f[1] != null);
    $('#dFacts').innerHTML = F.map(([t, v]) => `<div class="fact"><div class="t">${t}</div><div class="v">${esc(v)}</div></div>`).join('');
    $('#dObs').innerHTML = [c.obs && `<b>Observações:</b> ${esc(c.obs)}`, c.devolutiva && `<b>Devolutiva ENEL:</b> ${esc(c.devolutiva)}`].filter(Boolean).join('<br>');
    $('#pmodal').classList.add('on');
    const ds = [...new Set(p.exec.map(r => r.data).filter(Boolean))].sort();
    Charts.columns($('#chProj'), ds.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)), [{ name: 'UPS programado', color: css('--s1'), values: ds.map(d => sum(p.exec.filter(r => r.data === d), r => r.upsProg)) }, { name: 'UPS executado', color: css('--s3'), values: ds.map(d => sum(p.exec.filter(r => r.data === d), r => r.upsExec)) }], { grouped: true, unit: 'UPS', height: 220, sublabels: ds.map(d => d.slice(0, 4)), tipTitle: i => `${br(ds[i])} (${D0.diaSem(ds[i])})` });
    const rs = p.restr;
    $('#dTimeline').innerHTML = ds.length ? ds.slice().reverse().map(d => {
      const L = p.exec.filter(r => r.data === d), ids = [...new Set(L.map(r => r.id))], sk = L[0].semKey, rc = countBy(rs.filter(r => r.semKey === sk), r => r.sit);
      return `<li><div class="when">${br(d)}<small>${D0.diaSem(d)} · ${semLabel(sk)} · ${esc(L[0].origem)}</small></div><div>${ids.map(id => { const E = L.filter(r => r.id === id), e0 = E[0];
        return `<div class="what" style="margin-bottom:8px"><b>${esc(id)}</b><div class="meta"><span class="tag">${esc(e0.tipoProgN || '—')}</span>${e0.pctPlan != null ? `<span class="tag">% planejada ${pc(e0.pctPlan, 0)}</span>` : ''}<span class="tag">${nf(sum(E, r => r.upsProg))} UPS prog.</span><span class="tag">${nf(sum(E, r => r.upsExec))} UPS exec.</span>${e0.iniPrev ? `<span class="tag">${e0.iniPrev}–${e0.fimPrev}</span>` : ''}${e0.restrPend ? `<span class="tag">${e0.restrPend} restr. pendente(s)</span>` : ''}</div>
          <div class="tablewrap" style="margin-top:6px;max-height:none"><table><thead><tr><th>Equipe</th><th>Tipo</th><th class="num">UPS prog.</th><th>Status</th><th class="num">% exec.</th><th class="num">UPS exec.</th><th>Causa</th><th>Justificativa / observação</th></tr></thead><tbody>${E.map(r => `<tr><td>${esc(r.equipeLabel || '—')}</td><td>${esc(r.tipoEquipe)}</td><td class="num">${nf(r.upsProg)}</td><td>${stTag(r)}</td><td class="num">${r.pctExec != null ? pc(r.pctExec, 0) : ''}</td><td class="num">${nf(r.upsExec)}</td><td>${esc(r.causa)}</td><td class="wrap">${esc([r.justificativa, r.observacao].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table></div></div>`; }).join('')}${Object.keys(rc).length ? `<div class="note">Restrições da semana: ${Object.entries(rc).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')}</div>` : ''}</div></li>`;
    }).join('') : '<li><div></div><div class="note">Projeto sem programação no Histórico nem na Base Programada.</div></li>';
    const pend = rs.filter(r => r.sit === 'Não eliminada' || r.sit === 'Sem resposta').sort((a, b) => b.semKey.localeCompare(a.semKey));
    $('#dRestr').innerHTML = pend.length ? `<table><thead><tr><th>Semana</th><th>Restrição</th><th>Situação</th><th>Área</th><th>Responsável</th><th>Ação</th><th>Retorno</th><th>Justificativa</th></tr></thead><tbody>${pend.map(r => `<tr><td>${semLabel(r.semKey)}</td><td>${esc(r.restricao)}</td><td>${esc(r.sit)}</td><td>${esc(r.area)}</td><td>${esc(r.responsavel)}</td><td>${esc(r.acao)}</td><td>${esc(/^\d{4}-/.test(r.retorno) ? br(r.retorno) : r.retorno)}</td><td class="wrap">${esc(r.justificativa)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nenhuma restrição pendente registrada para este projeto.</div>';
  }
  $('#pFechar').onclick = () => $('#pmodal').classList.remove('on');
  $('#pmodal').onclick = e => { if (e.target.id === 'pmodal') $('#pmodal').classList.remove('on'); };
  addEventListener('keydown', e => { if (e.key === 'Escape') { $('#pmodal').classList.remove('on'); $('#modal').classList.remove('on'); } });

  /* ---------- exportação por seção ---------- */
  const xv = (ty, v, r) => ty === 'st' ? (r.status || r.grupo) : v == null ? '' : ty === 'd' ? br(v) : ty === 'dt' ? (/^\d{4}-\d{2}-\d{2}$/.test(v) ? br(v) : v) : ty === 'sem' ? semLabel(v) : typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v;
  const sheetOf = (name, cols, rows) => ({ name, header: cols.map(c => c[1]), data: rows.map(r => cols.map(([k, , ty]) => xv(ty, r[k], r))) });
  const resumo = (name, rows, key, label) => { const m = new Map(); rows.forEach(r => { const k = r[key] || '(vazio)'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return { name, header: [label, 'Linhas', 'UPS programado', 'UPS executado', '% executado', 'EXECUTADO', 'PARCIAL', 'Cancelado', 'Sem status'], data: [...m.entries()].sort().map(([k, L]) => { const p = sum(L, r => r.upsProg), e = sum(L, r => r.upsExec); return [key === 'semKey' ? semLabel(k) : key === 'data' ? br(k) : k, L.length, Math.round(p * 100) / 100, Math.round(e * 100) / 100, p ? Math.round(e / p * 10000) / 10000 : '', L.filter(r => r.grupo === 'Executado').length, L.filter(r => r.grupo === 'Executado parcial').length, L.filter(r => r.grupo === 'Cancelado').length, L.filter(r => r.grupo.startsWith('Sem status') || r.grupo.startsWith('A executar')).length]; }) }; };
  const qualSheet = () => ({ name: 'Qualidade', header: ['Nível', 'Verificação', 'Detalhe 1', 'Detalhe 2', 'Detalhe 3', 'Detalhe 4', 'Detalhe 5'], data: S.Q.flatMap(q => q.itens.length ? q.itens.map(it => [q.nivel, q.titulo, ...it]) : [[q.nivel, q.titulo, 'sem ocorrências']]) });
  function exportar() {
    const sec = cur(), R = filtered(sec), L = listaRows(sec, R); let sheets;
    if (sec.id === 'visao') sheets = [sheetOf('Lista geral', sec.cols, L), resumo('Por semana', R, 'semKey', 'Semana'), resumo('Por mês', R, 'mes', 'Mês'), resumo('Por encarregado', R, 'encarregado', 'Encarregado'), qualSheet()];
    else if (sec.id === 'instr') sheets = [sheetOf('Instruções', sec.cols, L)];
    else if (sec.id === 'cart') { const ps = new Set(R.map(r => r.projeto)); sheets = [sheetOf('CARTEIRA', sec.cols, L), sheetOf('Execuções das obras', C_EXEC, S.D.exec.filter(r => ps.has(r.projeto)))]; }
    else if (sec.id === 'bp') sheets = [sheetOf('Base Programada', sec.cols, L), resumo('Por dia', R, 'data', 'Data'), resumo('Por encarregado', R, 'encarregado', 'Encarregado'), resumo('Por semana', R, 'semKey', 'Semana')];
    else if (sec.id === 'eqp') { const wk = [...st().f.semKey][0], mon = weekStart(wk), days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i)); const eqs = [...new Set(R.map(r => r.equipeCod || r.encarregado).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }));
      sheets = [{ name: 'Grade ' + semLabel(wk).replace('/', '-'), header: ['Equipe', 'Encarregado', ...days.map(d => `${br(d)} ${D0.diaSem(d)}`), 'UPS semana'], data: eqs.map(q => { const rs = R.filter(r => (r.equipeCod || r.encarregado) === q); return [q, rs[0]?.encarregado || '', ...days.map(d => [...new Set(rs.filter(r => r.data === d).map(r => r.projeto))].join('\n')), Math.round(sum(rs, r => r.upsProg) * 100) / 100]; }) },
        sheetOf('Linhas da semana', sec.cols, L), resumo('Por encarregado', R, 'encarregado', 'Encarregado'), { name: 'Cadastro de equipes', header: ['Código', 'Encarregado', 'Tipo', 'Início turno', 'Fim turno'], data: S.D.equipes.map(e => [e.cod, e.enc, e.tipo, e.ini, e.fim]) }]; }
    else if (sec.id === 'restr') { const g = (k, n) => ({ name: n, header: [n.replace('Por ', ''), 'Total', 'Eliminada', 'Não eliminada', 'Sem resposta', 'Não aplicável', '% eliminadas'], data: Object.entries(countBy(R, r => r[k] || '(vazio)')).sort((a, b) => b[1] - a[1]).map(([v]) => { const w = R.filter(r => (r[k] || '(vazio)') === v), c = countBy(w, r => r.sit), b = w.length - (c['Não aplicável'] || 0); return [k === 'semKey' ? semLabel(v) : v, w.length, c['Eliminada'] || 0, c['Não eliminada'] || 0, c['Sem resposta'] || 0, c['Não aplicável'] || 0, b ? Math.round((c['Eliminada'] || 0) / b * 10000) / 10000 : '']; }) });
      sheets = [sheetOf('Restrições', sec.cols, L), g('semKey', 'Por semana'), g('restricao', 'Por restrição'), g('area', 'Por área'), g('responsavel', 'Por responsável')]; }
    else if (sec.id === 'painel') { const { ws, porSem } = painelData(R); const obras = [...new Set(ws.flatMap(k => porSem[k].obras.map(o => o.obra)))].sort();
      sheets = [{ name: 'Resumo por semana', header: ['Semana', 'Restrições', 'Eliminadas', 'Base (total − não aplicável)', '% eliminadas', 'Meta 90%', 'Pendentes', 'Obras com pendência'], data: ws.map(k => { const p = porSem[k]; return [semLabel(k), p.total, p.el, p.base, p.pct ?? '', p.total ? (p.pct >= 0.9 ? 'BATIDA' : 'NÃO BATIDA') : 'Sem restrições', p.pend, p.obrasPend]; }) },
        { name: 'Obra x semana', header: ['Obra', ...ws.map(semLabel)], data: obras.map(o => [o, ...ws.map(k => { const x = porSem[k].obras.find(b => b.obra === o); return x ? (x.pend === 0 ? 'Liberada' : x.pend) : ''; })]) }, sheetOf('Pendentes', sec.cols, L)]; }
    const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(/[-: ]/g, '');
    IO.download(IO.xlsxOf(sheets), `planejamento_start_${sec.id}_${stamp}.xlsx`);
  }
  $('#btnXlsx').onclick = exportar;
  $('#btnCsv').onclick = () => { const sec = cur(), L = listaRows(sec, filtered(sec)); const s = sheetOf('x', sec.cols, L); const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(/[-: ]/g, ''); IO.download(new Blob([IO.csvOf(s.header, s.data)], { type: 'text/csv;charset=utf-8' }), `planejamento_start_${sec.id}_${stamp}.csv`); };

  /* ---------- importação ---------- */
  const modal = $('#modal');
  $('#btnImport').onclick = () => { modal.classList.add('on'); $('#prog').textContent = ''; };
  $('#mFechar').onclick = () => modal.classList.remove('on');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('on'); };
  const drop = $('#drop'), inp = $('#file');
  drop.onclick = () => inp.click(); drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) importar(e.dataTransfer.files[0]); };
  inp.onchange = () => { if (inp.files[0]) importar(inp.files[0]); inp.value = ''; };
  const KEEP = ['INSTRUCOES', 'HISTORICO', 'BASE PROGRAMADA', 'CARTEIRA', 'PLANILHA DE RESTRICAO', 'HISTORICO RESTRICOES', 'SEMANAS PROGRAMADAS', 'EQUIPES MOBILIZADAS', 'REGISTROS SEMANAIS', 'AUXILIAR LISTSUSP', 'VERIFICACAO', 'EQUIPES PROGRAMADAS'];
  async function importar(f) {
    const prog = $('#prog');
    try {
      if (!/\.xls[xm]$/i.test(f.name)) throw new Error('Use o arquivo .xlsm ou .xlsx da Planilha de Planejamento START.');
      prog.textContent = `Abrindo ${f.name}…`;
      const abas = await IO.readXlsx(await f.arrayBuffer(), t => prog.textContent = t);
      const D = D0.build(abas);
      if (!D.exec.length && !D.cart.length) throw new Error('Não encontrei as tabelas da planilha (Histórico, Base Programada, CARTEIRA). Confira se é a Planilha de Planejamento START.');
      const slim = abas.filter(a => KEEP.includes(D0.norm(a.aba))).map(a => D0.norm(a.aba) === 'AUXILIAR LISTSUSP' ? { aba: a.aba, rows: a.rows.slice(0, 30).map(r => r.slice(0, 40)) } : D0.norm(a.aba) === 'EQUIPES PROGRAMADAS' ? { aba: a.aba, rows: a.rows.slice(0, 9) } : a);
      const gerado = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).slice(0, 17);
      const inventario = abas.map(a => ({ aba: a.aba, vis: '—', linhas: a.rows.filter(r => r && r.some(c => String(c ?? '').trim() !== '')).length, conteudo: '', uso: KEEP.includes(D0.norm(a.aba)) ? 'Lida pelo painel' : 'Não usada pelo painel' }));
      carregar(slim, { fonte: f.name, origem: 'importada', gerado, inventario, achados: [] });
      prog.textContent = `Pronto: ${D.exec.length} linhas de programação, ${D.cart.length} obras, ${D.restr.length} restrições.` + (D.faltando.length ? ` Não encontrei: ${D.faltando.join(', ')}.` : '');
      if ($('#lembrar').checked) await IO.save('baseplan2', { abas: slim, fonte: f.name, gerado, inventario });
      setTimeout(() => modal.classList.remove('on'), 1200);
    } catch (e) { prog.innerHTML = `<span style="color:var(--crit)">${esc(e.message || e)}</span>`; console.error(e); }
  }
  $('#btnOriginal').onclick = async () => { await IO.del('baseplan2'); embutida(); };

  /* ---------- controles ---------- */
  let qT; $('#q').oninput = e => { clearTimeout(qT); qT = setTimeout(() => { const x = st(); x.q = e.target.value.trim(); x.qn = D0.norm(x.q).split(' ').filter(Boolean); x.page = 0; renderAll(); }, 220); };
  $('#de').onchange = e => { st().de = e.target.value; st().page = 0; renderAll(); }; $('#ate').onchange = e => { st().ate = e.target.value; st().page = 0; renderAll(); };
  $('#btnLimpar').onclick = () => { const sec = cur(), x = st(); sec.groups.forEach(g => { if (!g.single) x.f[g.key].clear(); }); if (sec.id === 'restr') x.f.origem.add('Planilha de Restrição'); x.de = x.ate = x.q = ''; x.qn = []; x.page = 0; renderAll(); };
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(renderAll, 150); });
  function renderAll() {
    const sec = cur(), x = st();
    renderHeader(); $('#secTitle').textContent = sec.t; $('#secDesc').textContent = sec.desc;
    $('#q').placeholder = sec.placeholder; $('#q').value = x.q; $('#de').value = x.de; $('#ate').value = x.ate;
    $$('[data-dates]').forEach(e => e.style.display = sec.noDates ? 'none' : '');
    renderFilters(); const R = filtered(sec);
    $('#fInfo').textContent = `${int(R.length)} de ${int(sec.data().length)} registros`;
    V[sec.id](R); renderLista(R);
  }

  /* ---------- relógio de Brasília ---------- */
  const fH = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fD = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const tick = () => { const n = new Date(); $('#clkH').textContent = fH.format(n); $('#clkD').textContent = fD.format(n) + ' · Horário de Brasília'; };
  tick(); setInterval(tick, 1000);

  function embutida() { const B = window.BASE; carregar(B.abas, { fonte: B.fonte, origem: 'embutida', gerado: B.gerado, inventario: B.inventario, achados: B.achados }); }
  const h = (location.hash || '').slice(1); if (SECMAP[h]) S.sec = h;
  addEventListener('hashchange', () => { const k = location.hash.slice(1); if (SECMAP[k] && k !== S.sec) go(k); });
  (async () => { const s = await IO.load('baseplan2'); if (s && s.abas?.length) carregar(s.abas, { fonte: s.fonte, origem: 'salva', gerado: s.gerado, inventario: s.inventario, achados: [] }); else embutida(); })();
})();
