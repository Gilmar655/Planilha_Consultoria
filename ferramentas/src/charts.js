/* ===== Gráficos em SVG puro (sem dependências) ===== */
const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const tip = () => document.getElementById('tip');
  function showTip(ev, html) { const t = tip(); t.innerHTML = html; t.style.opacity = 1; const x = Math.min(ev.clientX + 14, innerWidth - t.offsetWidth - 8); const y = ev.clientY + 16 + t.offsetHeight > innerHeight ? ev.clientY - t.offsetHeight - 10 : ev.clientY + 16; t.style.left = x + 'px'; t.style.top = y + 'px'; }
  function hideTip() { tip().style.opacity = 0; }
  const el = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const nf = (v, d = 0) => (v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  // caminho de barra com topo arredondado (4px) e base reta no eixo
  function barPath(x, y, w, h, r = 4) { if (h <= 0) return ''; r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
  function hbarPath(x, y, w, h, r = 4) { if (w <= 0) return ''; r = Math.min(r, h / 2, w); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; }

  /** Colunas verticais, simples ou empilhadas.
   * cats: rótulos; series: [{name,color,values}]; opts: {height, unit, dec, onClick, labelEvery, tipTitle, ref} */
  function columns(host, cats, series, opts = {}) {
    host.innerHTML = '';
    if (!cats.length) { host.innerHTML = '<div class="empty">Sem dados para os filtros escolhidos.</div>'; return; }
    const W = Math.max(host.clientWidth || 640, 320), H = opts.height || 260, m = { t: 24, r: 10, b: 44, l: 52 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const tot = cats.map((_, i) => series.reduce((s, se) => s + (se.values[i] || 0), 0));
    const max = opts.max || niceMax(Math.max(...(opts.grouped ? series.flatMap(s => s.values.map(v => v || 0)) : tot), opts.ref || 0));
    const fmtAxis = opts.axisFmt || (v => nf(v, max < 5 ? 1 : 0));
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || 'gráfico de colunas' }, host);
    const g = el('g', { transform: `translate(${m.l},${m.t})` }, svg);
    for (let k = 0; k <= 4; k++) { const y = ih - ih * k / 4; el('line', { x1: 0, x2: iw, y1: y, y2: y, stroke: k ? '#eef1ef' : '#c9d1cc' }, g); const t = el('text', { x: -8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#7a8782' }, g); t.textContent = fmtAxis(max * k / 4); }
    if (opts.unit) { const t = el('text', { x: -m.l + 2, y: -14, 'font-size': 10.5, fill: '#7a8782' }, g); t.textContent = opts.unit; }
    const step = iw / cats.length, bw = Math.max(2, Math.min(opts.grouped ? 46 : 38, step * 0.72));
    const every = opts.labelEvery || Math.ceil(cats.length / Math.max(1, Math.floor(iw / 46)));
    cats.forEach((c, i) => {
      const x = i * step + (step - bw) / 2; let acc = 0;
      const segs = series.map(se => ({ se, v: se.values[i] || 0 })).filter(s => s.v > 0);
      if (opts.grouped) {
        const n = series.length, gw = (bw - 2 * (n - 1)) / n;
        series.forEach((se, si) => { const v = se.values[i] || 0, h = ih * v / max; if (h > 0) el('path', { d: barPath(x + si * (gw + 2), ih - h, gw, h, Math.min(4, gw / 2)), fill: se.color }, g); });
      } else
      segs.forEach((s, si) => {
        const h = ih * s.v / max, y = ih - ih * (acc + s.v) / max; acc += s.v;
        const top = si === segs.length - 1;
        // segmento do topo: cantos arredondados; demais: 2px de respiro em relação ao de cima
        const d = top ? barPath(x, y, bw, h) : (h > 2 ? `M${x},${y + h}V${y + 2}H${x + bw}V${y + h}Z` : '');
        if (d) el('path', { d, fill: s.se.color }, g);
      });
      if (i % every === 0) { const t = el('text', { x: x + bw / 2, y: ih + 16, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#4a5752' }, g); t.textContent = c; }
      if (opts.sublabels && i % every === 0) { const t = el('text', { x: x + bw / 2, y: ih + 29, 'text-anchor': 'middle', 'font-size': 9.5, fill: opts.subColor?.(i) || '#9aa5a0' }, g); t.textContent = opts.sublabels[i]; }
      const hit = el('rect', { x: i * step, y: 0, width: step, height: ih, fill: 'transparent', style: opts.onClick ? 'cursor:pointer' : '' }, g);
      hit.addEventListener('mousemove', ev => {
        const rows = series.filter(se => (se.values[i] || 0) > 0 || series.length === 1 || opts.grouped).map(se => `<div class="row"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${se.color};margin-right:6px"></i>${se.name}</span><b>${(opts.valFmt || (v => nf(v, opts.dec ?? 2)))(se.values[i] || 0)}</b></div>`).join('');
        showTip(ev, `<b>${opts.tipTitle ? opts.tipTitle(i) : c}</b>${rows}${series.length > 1 && !opts.grouped && !opts.noTotal ? `<div class="row" style="border-top:1px solid #3a4743;margin-top:4px;padding-top:4px"><span>Total</span><b>${nf(tot[i], opts.dec ?? 2)}</b></div>` : ''}`);
      });
      hit.addEventListener('mouseleave', hideTip);
      if (opts.onClick) hit.addEventListener('click', () => opts.onClick(i));
    });
    if (opts.ref) { const y = ih - ih * opts.ref / max; el('line', { x1: 0, x2: iw, y1: y, y2: y, stroke: '#16201c', 'stroke-dasharray': '4 4', 'stroke-width': 1.2 }, g); const t = el('text', { x: iw, y: y - 5, 'text-anchor': 'end', 'font-size': 11, fill: '#16201c' }, g); t.textContent = opts.refLabel || ''; }
  }

  /** Barras horizontais (ranking). items: [{label, value, sub}] */
  function hbars(host, items, opts = {}) {
    host.innerHTML = '';
    if (!items.length) { host.innerHTML = '<div class="empty">Sem dados para os filtros escolhidos.</div>'; return; }
    const W = Math.max(host.clientWidth || 420, 300), rowH = 26, m = { t: 4, r: 70, b: 4, l: Math.min(240, Math.max(90, Math.max(...items.map(i => i.label.length)) * 6.6 + 12)) };
    const maxCh = Math.floor((m.l - 12) / 6.6);
    const H = m.t + m.b + items.length * rowH, iw = W - m.l - m.r;
    const max = Math.max(...items.map(i => i.value), 0) || 1;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || 'ranking' }, host);
    const g = el('g', { transform: `translate(${m.l},${m.t})` }, svg);
    items.forEach((it, i) => {
      const y = i * rowH, bh = 14, w = iw * it.value / max;
      const lab = el('text', { x: -8, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#16201c' }, g); lab.textContent = it.label.length > maxCh ? it.label.slice(0, maxCh - 1) + '…' : it.label;
      el('path', { d: hbarPath(0, y + (rowH - bh) / 2, Math.max(w, it.value > 0 ? 2 : 0), bh), fill: it.color || opts.color || css('--s1') }, g);
      const v = el('text', { x: w + 6, y: y + rowH / 2 + 4, 'font-size': 11.5, fill: '#4a5752', 'font-variant-numeric': 'tabular-nums' }, g); v.textContent = (opts.fmt || (x => nf(x, 2)))(it.value);
      const hit = el('rect', { x: -m.l, y, width: W, height: rowH, fill: 'transparent', style: opts.onClick ? 'cursor:pointer' : '' }, g);
      hit.addEventListener('mousemove', ev => showTip(ev, `<b>${it.label}</b><div class="row"><span>${opts.valueName || 'Valor'}</span><b>${(opts.fmt || (x => nf(x, 2)))(it.value)}</b></div>${it.sub ? `<div style="color:#b9c4bf;margin-top:3px">${it.sub}</div>` : ''}`));
      hit.addEventListener('mouseleave', hideTip);
      if (opts.onClick) hit.addEventListener('click', () => opts.onClick(it));
    });
  }

  /** Histórico do projeto: colunas = % de cada programação; linha = % acumulado (mesmo eixo, 0–100+%). */
  function projeto(host, progs) {
    host.innerHTML = '';
    if (!progs.length) { host.innerHTML = '<div class="empty">Projeto só aparece como apoio (sem UPS programada).</div>'; return; }
    const W = Math.max(host.clientWidth || 640, 320), H = 240, m = { t: 16, r: 16, b: 40, l: 46 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = Math.max(100, niceMax(Math.max(...progs.map(p => p.pct_acum || 0))));
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'histórico do projeto' }, host);
    const g = el('g', { transform: `translate(${m.l},${m.t})` }, svg);
    for (let k = 0; k <= 4; k++) { const v = max * k / 4, y = ih - ih * k / 4; el('line', { x1: 0, x2: iw, y1: y, y2: y, stroke: k ? '#eef1ef' : '#c9d1cc' }, g); const t = el('text', { x: -8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#7a8782' }, g); t.textContent = nf(v) + '%'; }
    const y100 = ih - ih * 100 / max; el('line', { x1: 0, x2: iw, y1: y100, y2: y100, stroke: '#16201c', 'stroke-dasharray': '4 4' }, g);
    const step = iw / progs.length, bw = Math.min(46, step * 0.5);
    const pts = [];
    progs.forEach((p, i) => {
      const cx = i * step + step / 2, h = ih * (p.pct_prog || 0) / max;
      el('path', { d: barPath(cx - bw / 2, ih - h, bw, h), fill: css('--s1') }, g);
      pts.push([cx, ih - ih * (p.pct_acum || 0) / max]);
      const t = el('text', { x: cx, y: ih + 16, 'text-anchor': 'middle', 'font-size': 11, fill: '#4a5752' }, g); t.textContent = p.data.slice(8, 10) + '/' + p.data.slice(5, 7);
      const t2 = el('text', { x: cx, y: ih + 30, 'text-anchor': 'middle', 'font-size': 10, fill: '#9aa5a0' }, g); t2.textContent = p.data.slice(0, 4);
    });
    el('path', { d: 'M' + pts.map(p => p.join(',')).join('L'), fill: 'none', stroke: css('--s2'), 'stroke-width': 2 }, g);
    pts.forEach(([x, y], i) => {
      el('circle', { cx: x, cy: y, r: 4.5, fill: css('--s2'), stroke: '#fff', 'stroke-width': 2 }, g);
      const p = progs[i]; const t = el('text', { x, y: y - 9, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: '#16201c' }, g); t.textContent = nf(p.pct_acum, 0) + '%';
      const hit = el('rect', { x: i * step, y: 0, width: step, height: ih, fill: 'transparent' }, g);
      hit.addEventListener('mousemove', ev => showTip(ev, `<b>${p.data.split('-').reverse().join('/')} · ${p.doc || ''}</b><div class="row"><span>% programado no dia</span><b>${nf(p.pct_prog, 0)}%</b></div><div class="row"><span>% acumulado</span><b>${nf(p.pct_acum, 0)}%</b></div><div class="row"><span>UPS programada</span><b>${nf(p.ups_prog, 2)}</b></div><div class="row"><span>Encarregado</span><b>${p.encarregado || '—'}</b></div>`));
      hit.addEventListener('mouseleave', hideTip);
    });
  }
  return { columns, hbars, projeto, hideTip };
})();
