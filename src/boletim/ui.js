// Boletim do vão na interface: tabela no tablet (≥ 760 px), separadores por cabo no telemóvel.
import { CABOS, grupoDoCabo, linhasTabela, lerCorrecoes, guardarCorrecoes, temperaturaDoDia, lembrarTemperatura, hojeISO } from '../calc/temperatura.js';
import { novoBoletim, normalizarBoletim, caboVazio, calcularBoletim, resumo, temperaturaCalculo, entradaDoCabo, specVazio } from './state.js';
import { POSTES_ROWS } from '../calc/tipos.js';
import { fmt, sfmt, fmtT } from '../num.js';

const KEY = 'flechas-boletim-v1';
const GRUPOS = [['Braço superior', ['CC1', 'CC2']], ['Braço médio', ['CC3', 'CC4']], ['Braço inferior', ['CC5', 'CC6']], ['Cabo de guarda', ['CG1', 'CG2']]];
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const idOf = path => 'b-' + path.replace(/[^\w-]/g, '-');
const getP = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function setP(o, path, v) {
  const ks = path.split('.'); let x = o;
  for (const k of ks.slice(0, -1)) { if (x[k] == null || typeof x[k] !== 'object') x[k] = {}; x = x[k]; }
  x[ks[ks.length - 1]] = v;
}
const wide = () => matchMedia('(min-width: 760px)').matches;
const listPt = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]);

export function mountBoletim(root, { onChange } = {}) {
  let B = load();
  let tab = 'CC1', sig = '', res = {};
  const modoGlobal = () => ((document.querySelector('input[name=modo]:checked') || {}).value === 'reg' ? 'reg' : 'ver');
  B.modo = modoGlobal();

  function load() {
    let b = null;
    try { b = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* corrompido */ }
    b = normalizarBoletim(b);
    if (!b.tLocal) b.tLocal = temperaturaDoDia(localStorage, hojeISO());
    if (!b.corr.CC && !b.corr.CG) b.corr = lerCorrecoes(localStorage);
    return b;
  }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(B)); } catch (e) { /* sem armazenamento */ } };
  const reg = () => B.modo === 'reg';
  const k = () => (reg() ? 'param' : 'teor');
  const noun = () => (reg() ? 'Parâmetro' : 'Flecha');

  // ---------- construção ----------
  const input = (path, { num = true, ph = '', aria = '', list = '' } = {}) =>
    `<input id="${idOf(path)}" data-path="${path}" value="${esc(getP(B, path))}" ${num ? 'inputmode="decimal"' : ''} autocomplete="off"${ph ? ` placeholder="${esc(ph)}"` : ''}${aria ? ` aria-label="${esc(aria)}"` : ''}${list ? ` list="${list}"` : ''}>`;
  const field = (label, path, unit = '', opts = {}) =>
    `<div class="field"><label for="${idOf(path)}">${label}</label><div class="box">${input(path, opts)}${unit ? `<span class="unit">${unit}</span>` : ''}</div></div>`;
  const seg = (name, opts, cur, aria) => `<div class="seg seg-sm" role="radiogroup" aria-label="${esc(aria)}">${opts.map(([v, l]) =>
    `<input type="radio" name="${name}" id="${name}-${v}" value="${v}"${cur === v ? ' checked' : ''}><label for="${name}-${v}">${l}</label>`).join('')}</div>`;

  function tabelaFields(prefix, spec, tc, aria = '') {
    if (spec.tipo !== 'tabela') return field(aria || noun(), `${prefix}.direta`, 'm', { aria });
    const L = linhasTabela(tc);
    if (!L.length) return '<p class="hint">Indica a temperatura local para usar a tabela.</p>';
    return `<div class="pair">${L.map(T => field(`${noun()} a ${fmtT(T)} °C`, `${prefix}.tabela.${T}`, 'm')).join('')}</div>`;
  }

  function vaoHTML() {
    const pt = B.method === 'pt';
    const geo = pt
      ? `${field('Comprimento do vão <i>a</i>', 'a', 'm')}${field('Desnível do perfil <i>opcional</i>', 'dp', 'm')}
         <div class="field"><label for="b-tipo">Apoio de estação (tipo)</label><div class="box">${input('tipo', { num: false, list: 'b-tipos' }).replace('id="b-tipo"', 'id="b-tipo"')}</div></div>
         <div class="pair">${field('HS', 'HS', 'm')}${field('Perna', 'perna', 'm', { ph: '0' })}</div>
         <div class="pair">${field('Cota', 'cota', 'm')}${field('Dist. visada <i>F</i>', 'F', 'm')}</div>`
      : `${field('Comprimento do vão <i>a</i>', 'a', 'm')}${field('Distância de visada <i>t</i>', 't', 'm')}`;
    const grupos = ['CC', 'CG'].map(g => {
      const spec = B[k()][g], name = `b-tipo-${g}`;
      return `<div class="b-teor"><span class="lbl">${noun()} ${g === 'CC' ? 'dos condutores (CC)' : 'dos cabos de guarda (CG)'}</span>
        ${seg(name, [['direta', 'Direta'], ['tabela', 'Pela tabela']], spec.tipo, `${noun()} ${g}`)}
        ${tabelaFields(`${k()}.${g}`, spec, temperaturaCalculo(B, g), spec.tipo === 'direta' ? `${noun()} ${g}` : '')}</div>`;
    }).join('');
    return `<div class="b-head"><h2>Boletim do vão</h2><button type="button" class="link" id="b-novo">Novo boletim</button></div>
      <div class="b-vao">
        <fieldset><legend>Vão</legend>
          ${field('Vão', 'vao', '', { num: false, ph: 'por exemplo 9-10' })}
          ${seg('b-m', [['int', 'Método internacional'], ['pt', 'Método português']], B.method, 'Método de cálculo')}
          ${geo}
        </fieldset>
        <fieldset><legend>Temperatura</legend>
          ${field('Temperatura local', 'tLocal', '°C')}
          <div class="pair">${field('Correção CC', 'corr.CC', '°C', { ph: '0' })}${field('Correção CG', 'corr.CG', '°C', { ph: '0' })}</div>
          <p class="tc" id="b-tc"></p>
        </fieldset>
        <fieldset><legend>${reg() ? 'Parâmetro' : 'Flecha teórica'}</legend>${grupos}</fieldset>
      </div>
      <details class="tol"><summary>Tolerâncias</summary><div class="pair">${field('Cabo mais alto', 'tolA', '%')}${field('Cabo mais baixo', 'tolB', '%')}</div></details>
      <datalist id="b-tipos">${POSTES_ROWS.map(r => `<option value="${esc(r[0])}">`).join('')}</datalist>`;
  }

  const entradas = () => (B.method === 'pt'
    ? [['H', 'Altura <i>H</i>', 'm'], ['cad', 'Cadeia', 'm'], ['zf', 'Fixação <i>Z<sub>f</sub></i>', 'grad']]
    : [['z1', 'Desnível <i>Z₁</i>', 'grad'], ['z2', 'Desnível <i>Z₂</i>', 'grad']]).concat(reg() ? [] : [['z', 'Visada <i>Z</i>', 'grad']]);
  const resultados = () => (reg()
    ? [['leitura', 'Leitura a apontar'], ['intervalo', 'Leituras conformes'], ['flecha', 'Flecha']]
    : [['flecha', 'Flecha medida'], ['desvio', 'Desvio'], ['resultado', 'Resultado']])
    .concat([['sens', 'Erro de 0,01 grad'], ['avisos', 'Avisos']]);

  function teorCell(c) {
    const own = B.cabos[c][k()];
    return `<span data-res="teor" data-cabo="${c}"></span>
      <button type="button" class="mini" data-act="proprio" data-cabo="${c}">${own ? 'Usar o do grupo' : 'Valor próprio'}</button>
      ${own ? `<div class="b-own">${seg(`b-own-${c}`, [['direta', 'Direta'], ['tabela', 'Tabela']], own.tipo, `Valor próprio ${c}`)}
        ${tabelaFields(`cabos.${c}.${k()}`, own, temperaturaCalculo(B, grupoDoCabo(c)), `${noun()} ${c}`)}</div>` : ''}`;
  }

  function tabelaHTML() {
    const rows = entradas().map(([f, l, u]) => `<tr><th scope="row">${l} <small>${u}</small></th>${CABOS.map(c =>
      `<td>${input(`cabos.${c}.${f}`, { aria: `${c} ${l.replace(/<[^>]+>/g, '')}` })}</td>`).join('')}</tr>`).join('');
    const teor = `<tr><th scope="row">${reg() ? 'Parâmetro' : 'Flecha teórica'} <small>m</small></th>${CABOS.map(c => `<td class="b-teorcell">${teorCell(c)}</td>`).join('')}</tr>`;
    const out = resultados().map(([r, l]) => `<tr class="res"><th scope="row">${l}</th>${CABOS.map(c => `<td data-res="${r}" data-cabo="${c}"></td>`).join('')}</tr>`).join('');
    return `<div class="b-scroll"><table class="b-table">
      <thead><tr><th class="corner" rowspan="2"></th>${GRUPOS.map(([n]) => `<th colspan="2" class="grp">${n}</th>`).join('')}</tr>
      <tr>${CABOS.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead>
      <tbody>${rows}${teor}${out}</tbody></table></div>`;
  }

  function separadoresHTML() {
    const c = tab;
    return `<div class="b-tabs" role="tablist" aria-label="Cabos">${CABOS.map(x =>
      `<button type="button" role="tab" id="b-tab-${x}" data-cabo="${x}" aria-selected="${x === c}" aria-controls="b-panel" tabindex="${x === c ? 0 : -1}">${x}<span class="mark" data-mark="${x}"></span></button>`).join('')}</div>
      <div class="b-panel" id="b-panel" role="tabpanel" aria-labelledby="b-tab-${c}">
        <div class="pair">${entradas().map(([f, l, u]) => field(l, `cabos.${c}.${f}`, u)).join('')}</div>
        <div class="field"><span class="lbl">${reg() ? 'Parâmetro' : 'Flecha teórica'}</span><div class="b-teorcell">${teorCell(c)}</div></div>
        <dl class="b-res">${resultados().map(([r, l]) => `<div><dt>${l}</dt><dd data-res="${r}" data-cabo="${c}"></dd></div>`).join('')}</dl>
      </div>`;
  }

  function signature() {
    const parts = [B.method, B.modo, wide(), wide() ? '' : tab];
    for (const g of ['CC', 'CG']) { const s = B[k()][g]; parts.push(s.tipo, s.tipo === 'tabela' ? linhasTabela(temperaturaCalculo(B, g)).join('|') : ''); }
    for (const c of CABOS) { const o = B.cabos[c][k()]; parts.push(o ? o.tipo + (o.tipo === 'tabela' ? linhasTabela(temperaturaCalculo(B, grupoDoCabo(c))).join('|') : '') : '-'); }
    return parts.join(';');
  }

  function build() {
    const ae = document.activeElement, path = ae && root.contains(ae) && ae.dataset ? ae.dataset.path : null;
    const pos = path && ae.selectionStart != null ? ae.selectionStart : null;
    root.innerHTML = `<div class="wrap">${vaoHTML()}<section class="b-cabos" aria-label="Cabos">${wide() ? tabelaHTML() : separadoresHTML()}</section>
      <div class="b-resumo" id="b-resumo" aria-live="polite"></div>
      <div class="actions" id="b-actions"><button type="button" class="link" id="b-save" disabled>Guardar boletim</button><button type="button" class="link" id="b-hist">Histórico</button></div></div>`;
    sig = signature();
    const sel = root.querySelector('[role=tab][aria-selected=true]');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (path) { const el = root.querySelector(`[data-path="${CSS.escape(path)}"]`); if (el) { el.focus(); if (pos != null) try { el.setSelectionRange(pos, pos); } catch (e) { /* tipo sem seleção */ } } }
  }

  // ---------- resultados ----------
  function update() {
    if (signature() !== sig) build();
    res = calcularBoletim(B);
    const tcCC = temperaturaCalculo(B, 'CC'), tcCG = temperaturaCalculo(B, 'CG');
    const tcEl = root.querySelector('#b-tc');
    if (tcEl) tcEl.textContent = Number.isFinite(tcCC) ? `Temperatura de cálculo CC ${fmtT(tcCC)} °C · CG ${fmtT(tcCG)} °C` : 'Temperatura de cálculo –';
    for (const c of CABOS) {
      const R = res[c], S = entradaDoCabo(B, c);
      const set = (r, html, cls = '') => root.querySelectorAll(`[data-res="${r}"][data-cabo="${c}"]`).forEach(el => { el.innerHTML = html; el.className = cls; });
      const h = root.querySelector(`[data-path="cabos.${c}.H"]`);
      if (h) h.placeholder = B.cabos[c].H ? '' : S.H;
      const tv = reg() ? S.preg : S.ft;
      set('teor', tv ? `${fmt(Number(tv), reg() ? 1 : 2)}${B.cabos[c][k()] ? ' ●' : ''}` : '–');
      const mark = root.querySelector(`[data-mark="${c}"]`);
      if (!R) { for (const [r] of resultados()) set(r, ''); if (mark) mark.textContent = ''; continue; }
      const prob = R.missing ? 'Falta ' + listPt(R.missing) : R.errors.length ? R.errors[0] : '';
      set('sens', !prob && Number.isFinite(R.sens) ? `≈ ${fmt(R.sens * 100, 0)} cm` : '–');
      set('avisos', R.warns.length && !R.missing ? R.warns.map(esc).join('<br>') : '—', R.warns.length && !R.missing ? 'warn' : '');
      if (reg()) {
        set('leitura', R.reg ? `${fmt(R.reg.z, 4)} grad` : '–');
        set('intervalo', R.reg ? `${fmt(R.reg.zMin, 4)}–${fmt(R.reg.zMax, 4)}` : `<span class="b-msg">${esc(prob || 'Sem visada tangente')}</span>`);
        set('flecha', R.reg ? `${fmt(R.reg.f, 2)} m` : '–');
        if (mark) mark.textContent = R.reg ? ' •' : '';
      } else {
        const V = R.verdict;
        set('flecha', V ? `${fmt(V.f, 2)} m` : R.meas ? `${fmt(R.meas.f, 2)} m` : '–');
        set('desvio', V ? `${sfmt(V.dev * 100, 1)} %` : '–');
        set('resultado', V ? (V.ok ? 'Conforme' : 'Não conforme') : `<span class="b-msg">${esc(prob || 'Falta a flecha teórica')}</span>`, V ? (V.ok ? 'ok' : 'bad') : '');
        if (mark) mark.textContent = V ? (V.ok ? ' ✓' : ' ✗') : '';
      }
    }
    const rs = root.querySelector('#b-resumo');
    if (reg()) {
      const n = CABOS.filter(c => res[c] && res[c].reg).length;
      rs.textContent = n ? `Leituras a apontar calculadas para ${n} ${n === 1 ? 'cabo' : 'cabos'}.` : 'Preenche os dados dos cabos para ver as leituras a apontar.';
    } else {
      const r = resumo(res);
      rs.textContent = r.total ? `${r.conformes} de ${r.total} conformes${r.naoConformes.length ? ` · Não conformes: ${listPt(r.naoConformes)}` : ''}` : 'Preenche as leituras dos cabos para ver o resumo.';
      rs.className = 'b-resumo' + (r.total ? (r.naoConformes.length ? ' bad' : ' ok') : '');
    }
    if (onChange) onChange();
  }

  // ---------- eventos ----------
  root.addEventListener('input', e => {
    const path = e.target.dataset && e.target.dataset.path;
    if (!path) return;
    setP(B, path, e.target.value);
    if (path === 'vao') B.id = null; // outro vão = outro registo no histórico
    if (path.startsWith('corr.')) guardarCorrecoes(localStorage, B.corr);
    if (path === 'tLocal') lembrarTemperatura(localStorage, B.tLocal, hojeISO());
    persist(); update();
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.type !== 'radio') return;
    if (t.name === 'b-m') B.method = t.value;
    else if (t.name.startsWith('b-tipo-')) B[k()][t.name.slice(7)].tipo = t.value;
    else if (t.name.startsWith('b-own-')) { const c = t.name.slice(6); if (B.cabos[c][k()]) B.cabos[c][k()].tipo = t.value; }
    persist(); update();
  });
  root.addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn || !root.contains(btn)) return;
    if (btn.dataset.act === 'proprio') {
      const c = btn.dataset.cabo, g = grupoDoCabo(c);
      B.cabos[c][k()] = B.cabos[c][k()] ? null : JSON.parse(JSON.stringify(B[k()][g] || specVazio()));
      persist(); update();
      const el = root.querySelector(`[data-path^="cabos.${c}.${k()}."]:not([type=radio])`); if (el) el.focus();
    } else if (btn.getAttribute('role') === 'tab') {
      tab = btn.dataset.cabo; update(); root.querySelector(`#b-tab-${tab}`)?.focus();
    } else if (btn.id === 'b-novo') {
      if (CABOS.some(c => !caboVazio(B, c)) && !confirm('Começar um boletim novo? As leituras deste boletim que não guardaste perdem-se.')) return;
      const keep = { method: B.method, modo: B.modo, tolA: B.tolA, tolB: B.tolB };
      B = Object.assign(novoBoletim(), keep, { tLocal: temperaturaDoDia(localStorage, hojeISO()), corr: lerCorrecoes(localStorage) });
      persist(); build(); update();
    }
  });
  root.addEventListener('keydown', e => {
    const t = e.target; if (t.getAttribute && t.getAttribute('role') === 'tab' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const i = CABOS.indexOf(tab), j = (i + (e.key === 'ArrowRight' ? 1 : CABOS.length - 1)) % CABOS.length;
      tab = CABOS[j]; update(); root.querySelector(`#b-tab-${tab}`)?.focus(); e.preventDefault();
    }
  });
  document.querySelectorAll('input[name=modo]').forEach(el => el.addEventListener('change', () => { B.modo = modoGlobal(); persist(); update(); }));
  const mq = matchMedia('(min-width: 760px)');
  (mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update));

  build(); update();

  return {
    getState: () => JSON.parse(JSON.stringify(B)),
    setState(b) {
      B = normalizarBoletim(b);
      const r = document.querySelector(`input[name=modo][value=${B.modo === 'reg' ? 'reg' : 'ver'}]`);
      if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change')); }
      persist(); build(); update();
    },
    resultados: () => res,
    /** Depois de guardar: liga o boletim ao registo, só se o vão não mudou entretanto. */
    marcarGuardado(id, vaoGuardado, vaoAntes) {
      if ((B.vao || '') !== (vaoAntes || '')) return;
      B.id = id; B.vao = vaoGuardado;
      const el = root.querySelector('[data-path="vao"]'); if (el && el.value !== vaoGuardado) el.value = vaoGuardado;
      persist(); update();
    },
  };
}
