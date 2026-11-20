/* ===== Leitura/gravação de planilhas no navegador (sem bibliotecas externas) ===== */
const IO = (() => {
  const td = new TextDecoder('utf-8');

  /* ---- ZIP (leitura) ---- */
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = u8.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Arquivo não é um .xlsx válido.');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
    const ent = {};
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      ent[td.decode(u8.subarray(p + 46, p + 46 + nl))] = { method, csize, off };
      p += 46 + nl + el + cl;
    }
    async function read(name) {
      const f = ent[name]; if (!f) return null;
      const lnl = dv.getUint16(f.off + 26, true), lel = dv.getUint16(f.off + 28, true);
      const start = f.off + 30 + lnl + lel, data = u8.subarray(start, start + f.csize);
      if (f.method === 0) return td.decode(data);
      if (typeof DecompressionStream === 'undefined') throw new Error('Navegador sem suporte a descompactação. Use Chrome/Edge atualizados ou importe em .csv.');
      const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(s).text();
    }
    return { names: Object.keys(ent), read };
  }

  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const colIdx = ref => { let n = 0; for (const ch of ref) { const c = ch.charCodeAt(0); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); } return n - 1; };
  const pad = n => String(n).padStart(2, '0');
  function serialToDate(v) { if (v < 1) return '00/01/1900'; const d = new Date(Math.round((Math.floor(v) + (v < 61 ? 1 : 0) - 25569) * 86400000)); return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`; } // 1900 como no Excel
  function serialToTime(v) { const sec = Math.round((v % 1) * 86400) % 86400, m = Math.floor(sec / 60); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; } // como o Excel: segundos truncados

  /* ---- XLSX -> {abas:[{aba, rows}]} ---- */
  async function readXlsx(buf, onProgress) {
    const z = await unzip(buf);
    const wb = xml(await z.read('xl/workbook.xml'));
    const rels = xml(await z.read('xl/_rels/workbook.xml.rels'));
    const rmap = {};
    for (const r of rels.getElementsByTagName('Relationship')) rmap[r.getAttribute('Id')] = r.getAttribute('Target');
    let ss = [];
    const sst = await z.read('xl/sharedStrings.xml');
    if (sst) {
      for (const si of xml(sst).getElementsByTagName('si')) {
        let t = ''; for (const x of si.getElementsByTagName('t')) { if (x.parentNode.nodeName === 'rPh') continue; t += x.textContent; }
        ss.push(t);
      }
    }
    // estilos: quais índices de estilo são data/hora
    const kind = [], fc = [];
    const BUILTIN = { 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 37: '#,##0', 38: '#,##0', 39: '#,##0.00', 40: '#,##0.00' };
    const fcode = f => { if (!f || f === 'General' || f === '@') return ''; const g = f.replace(/"[^"]*"|\[[^\]]*\]|\\.|_.|\*./g, '').split(';')[0]; const m = g.match(/0\.(0+)/), d = m ? m[1].length : 0; if (g.includes('%')) return 'p' + d; if (/[0#]/.test(g) && !/[dmyhs]/i.test(g)) return 'n' + d + (g.split('.')[0].includes(',') ? 't' : ''); return ''; };
    const sty = await z.read('xl/styles.xml');
    if (sty) {
      const sd = xml(sty), custom = {};
      for (const f of sd.getElementsByTagName('numFmt')) custom[f.getAttribute('numFmtId')] = f.getAttribute('formatCode') || '';
      const xfs = sd.getElementsByTagName('cellXfs')[0];
      if (xfs) for (const xf of xfs.getElementsByTagName('xf')) {
        const id = +xf.getAttribute('numFmtId'); const code = (custom[id] || '').toLowerCase().replace(/"[^"]*"|\[[^\]]*\]/g, '');
        let k = '';
        if ((id >= 14 && id <= 17) || id === 22 || /[dy]/.test(code) || (/m/.test(code) && !/[hs]/.test(code) && !/0/.test(code))) k = 'date';
        if ((id >= 18 && id <= 21) || (id >= 45 && id <= 47) || (/h/.test(code) && !/[dy]/.test(code))) k = 'time';
        kind.push(k); fc.push(k ? '' : fcode(custom[id] ?? BUILTIN[id] ?? ''));
      }
    }
    const sheets = [...wb.getElementsByTagName('sheet')];
    const out = [];
    for (let si = 0; si < sheets.length; si++) {
      const sh = sheets[si];
      const name = sh.getAttribute('name');
      const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let target = rmap[rid] || ''; target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
      onProgress && onProgress(`Lendo aba ${si + 1} de ${sheets.length}: ${name}`);
      const s = await z.read('xl/' + target); if (!s) continue;
      const doc = xml(s), rows = [], fmt = {};
      for (const row of doc.getElementsByTagName('row')) {
        const ri = (+row.getAttribute('r') || rows.length + 1) - 1; const arr = [];
        for (const c of row.getElementsByTagName('c')) {
          const ci = colIdx(c.getAttribute('r') || 'A'); const t = c.getAttribute('t'); const vEl = c.getElementsByTagName('v')[0];
          let v = vEl ? vEl.textContent : '';
          if (t === 's') v = ss[+v] ?? '';
          else if (t === 'inlineStr') { v = ''; for (const x of c.getElementsByTagName('t')) v += x.textContent; }
          else if (t === 'b') v = v === '1' ? 'VERDADEIRO' : 'FALSO';
          else if (t === 'e') v = v || '#ERRO';
          else if (t === 'str') { /* fórmula texto */ }
          else if (v !== '') {
            const num = +v, k = kind[+c.getAttribute('s') || 0] || '';
            if (k === 'date' && num >= 0) v = serialToDate(num) + (Math.round((num % 1) * 86400) % 86400 >= 60 ? ' ' + serialToTime(num) : '');
            else if (k === 'time' && num >= 0) v = serialToTime(num);
            else { v = num; const f = fc[+c.getAttribute('s') || 0]; if (f) fmt[`${ri},${ci}`] = f; }
          }
          arr[ci] = v;
        }
        for (let k = 0; k < arr.length; k++) if (arr[k] === undefined) arr[k] = '';
        while (arr.length && arr[arr.length - 1] === '') arr.pop();
        rows[ri] = arr;
      }
      for (let k = 0; k < rows.length; k++) if (!rows[k]) rows[k] = [];
      while (rows.length && !rows[rows.length - 1].some(x => x !== '')) rows.pop();
      out.push({ aba: name, rows, fmt, vis: sh.getAttribute('state') === 'hidden' || sh.getAttribute('state') === 'veryHidden' ? 'Oculta' : 'Visível' });
      await new Promise(r => setTimeout(r, 0));
    }
    return out;
  }

  /* ---- CSV ---- */
  function decodeText(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
    catch { return new TextDecoder('windows-1252').decode(buf); }
  }
  function parseCsv(text) {
    const head = text.slice(0, 5000);
    const d = (head.match(/;/g) || []).length >= (head.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += ch;
      } else if (ch === '"' && f === '') q = true;
      else if (ch === d) { row.push(f); f = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(f); rows.push(row); row = []; f = '';
      } else f += ch;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  /* ---- Exportação ---- */
  function csvOf(header, data) {
    const esc = v => { v = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return '﻿' + [header, ...data].map(r => r.map(esc).join(';')).join('\r\n');
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files) {
    const te = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const [name, content] of files) {
      const nb = te.encode(name), data = te.encode(content), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nb);
      off += 30 + nb.length + data.length;
    }
    const csize = cen.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const xesc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  const colName = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  // formatos de número: código do painel -> estilo (índice em cellXfs, a partir de 2)
  const XF = [9, 164, 10, 2, 165, 166, 3, 4, 167, 1];
  const XFK = { p0: 2, p1: 3, p2: 4, n2: 5, n1: 6, n3: 7, n0t: 8, n2t: 9, n1t: 10, n0: 11 };
  function xlsxOf(sheets) { // sheets: [{name, header, data, fmt?(ri,ci)}]
    const files = [];
    files.push(['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>']);
    files.push(['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
    files.push(['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => `<sheet name="${xesc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>']);
    files.push(['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
    files.push(['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="4"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="0.0"/><numFmt numFmtId="166" formatCode="0.000"/><numFmt numFmtId="167" formatCode="#,##0.0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B6E4F"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="12"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/>' + XF.map(id => `<xf numFmtId="${id}" applyNumberFormat="1"/>`).join('') + '</cellXfs></styleSheet>']);
    sheets.forEach((s, i) => {
      const rows = [s.header, ...s.data].map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
        const ref = colName(ci) + (ri + 1);
        if (v == null || v === '') return '';
        if (typeof v === 'number' && isFinite(v)) { const st = ri && s.fmt ? XFK[s.fmt(ri - 1, ci)] : null; return `<c r="${ref}"${ri ? (st ? ` s="${st}"` : '') : ' s="1"'}><v>${v}</v></c>`; }
        return `<c r="${ref}" t="inlineStr"${ri ? '' : ' s="1"'}><is><t xml:space="preserve">${xesc(v)}</t></is></c>`;
      }).join('') + '</row>').join('');
      const cols = '<cols>' + s.header.map((h, ci) => `<col min="${ci + 1}" max="${ci + 1}" width="${Math.min(60, Math.max(10, String(h).length + 4))}" customWidth="1"/>`).join('') + '</cols>';
      files.push([`xl/worksheets/sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData><autoFilter ref="A1:${colName(s.header.length - 1)}${s.data.length + 1}"/></worksheet>`]);
    });
    return zipStore(files);
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---- IndexedDB (guarda a última base importada neste navegador) ---- */
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open('painel-start', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function save(key, val) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(val, key); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch { return false; } }
  async function load(key) { try { const db = await idb(); return await new Promise((res) => { const t = db.transaction('kv').objectStore('kv').get(key); t.onsuccess = () => res(t.result); t.onerror = () => res(null); }); } catch { return null; } }
  async function del(key) { try { const db = await idb(); await new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(key); t.oncomplete = res; t.onerror = res; }); } catch { } }

  return { readXlsx, decodeText, parseCsv, csvOf, xlsxOf, download, save, load, del };
})();
