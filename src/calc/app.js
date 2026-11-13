// Interface da calculadora (extraída de app/calculadora-flechas.html).
// O cálculo vem do núcleo validado; aqui só há leitura do formulário, validação e desenho.
import { G2R, solveTangent, solveParam, pFromSag, flechaInternacional, flechaPortugues } from '../../core/flechas-core.mjs';
import { parseNum, fmt, fmtIn, sfmt } from '../num.js';
import { computeCabo } from './compute.js';
import { POSTES_ROWS } from './tipos.js';

/** Resumo do último resultado com veredicto, para guardar no histórico. */
export function resultSummary(R) {
  if (!R || !R.verdict || !R.theo) return null;
  return { M: R.M, a: R.a, ft: R.theo.ft, flecha: R.verdict.f, desvio: R.verdict.dev, conforme: R.verdict.ok, p: R.meas.p };
}

/** onRender: chamado depois de cada recálculo (ex.: para ativar "Guardar medição"). */
export function mountCalc(root, { onRender } = {}) {
  const $ = id => document.getElementById(id);
  const IDS = ['a','dp','t','tipo','ponto','H','HS','perna','cad','z1','z2','cota','F','zf','z','temp','ft','tolA','tolB'];
  const KEY = 'flechas-verificacao-v3';
  const DEFAULTS = {method:'int', a:'', dp:'', t:'', tipo:'', ponto:'sup', H:'', HS:'', perna:'', cad:'', z1:'', z2:'', cota:'', F:'', zf:'', z:'', temp:'', ft:'', tolA:'2,5', tolB:'1,5'};
  const EX_INT = {a:'425,48', t:'60', z1:'59,5046', z2:'81,6059', z:'82,1749', temp:'20', ft:'13,50'};
  const EX_PT = {a:'417,36', dp:'', tipo:'YLS2e', ponto:'sup', H:'31,55', HS:'0,689', perna:'0', cad:'4,24', cota:'5', F:'-350,56', zf:'97,673', z:'98,844', temp:'18', ft:'14,83'};
  const NAMES = {a:'o comprimento do vão', t:'a distância de visada', z1:'o desnível 1', z2:'o desnível 2',
    H:'a altura H', HS:'o HS', cad:'a cadeia', cota:'a cota', F:'a distância de visada', zf:'o ângulo de fixação'};
  const COL = {ht:1, sup:2, med:3, hu:4};
  const PONTO_TXT = {ht:'o topo (Ht)', sup:'braço superior', med:'braço médio', hu:'braço inferior (Hu)'};

  // Tabela de apoios (última ocorrência prevalece, como o PROCV da folha)
  const POSTES = new Map();
  POSTES_ROWS.forEach(r => POSTES.set(String(r[0]).toUpperCase(), r));

  function listPt(arr){ return arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1]; }
  const method = () => document.querySelector('input[name=method]:checked').value;
  function getState(){ const s = {method: method()}; IDS.forEach(id => s[id] = $(id).value); return s; }
  function setState(s){
    document.querySelector(`input[name=method][value=${s.method === 'pt' ? 'pt' : 'int'}]`).checked = true;
    IDS.forEach(id => { if(s[id] !== undefined) $(id).value = s[id]; });
    if(!$('ponto').value) $('ponto').value = 'sup';
  }


  function tipoInfo(){
    const row = POSTES.get($('tipo').value.trim().toUpperCase());
    if(!$('tipo').value.trim()) return {msg:'Da tabela de apoios da folha LBL. Preenche H e HS.'};
    if(!row) return {msg:'Tipo não encontrado na tabela. Indica H e HS à mão.', warn:true};
    const parts = [['Ht',row[1]],['Br.Sup',row[2]],['Br.Med',row[3]],['Hu',row[4]],['HS',row[5]]].filter(p => p[1] != null).map(p => `${p[0]} ${fmt(p[1], p[1] % 1 ? (String(p[1]).split('.')[1].length) : 0)} m`);
    return {row, msg: row[0] + ': ' + parts.join(', ') + '.'};
  }
  function applyTipo(){
    const info = tipoInfo(); if(!info.row) return;
    const h = info.row[COL[$('ponto').value]];
    $('H').value = h == null ? '' : fmtIn(h);
    $('HS').value = info.row[5] == null ? '' : fmtIn(info.row[5]);
  }

  function gaugeHTML(R){
    const devPct = R.verdict.dev * 100, A = R.tolA, B = R.tolB;
    const lo = Math.min(-A - 1, devPct - 0.8), hi = Math.max(B + 1, devPct + 0.8);
    const pos = x => (x - lo) / (hi - lo) * 100;
    const pin = Math.min(94, Math.max(6, pos(devPct)));
    return `<div class="gauge" role="img" aria-label="Desvio de ${sfmt(devPct,1)} %, tolerância de −${fmt(A,1)} % a +${fmt(B,1)} %">
      <div class="track">
        <div class="band" style="left:${pos(-A)}%;width:${pos(B) - pos(-A)}%"></div>
        <div class="zero" style="left:${pos(0)}%"></div>
        <div class="pin" style="left:${pin}%">${sfmt(devPct,1)} %</div>
      </div>
      <span class="tick" style="left:${pos(-A)}%">−${fmt(A,1)} %</span>
      <span class="tick" style="left:${pos(0)}%">0</span>
      <span class="tick" style="left:${pos(B)}%">+${fmt(B,1)} %</span>
      <span class="side" style="left:0">cabo mais alto</span>
      <span class="side" style="right:0">cabo mais baixo</span>
    </div>`;
  }

  const NOTES = {
    int: `<h2>Como o cálculo é feito</h2>
      <p>Das leituras Z₁ e Z₂ saem os desníveis: Desn₁ = t·tan(100 − Z₁) e Desn₂ = (a + t)·tan(100 − Z₂), em grados. O desnível do vão é Desn₂ − Desn₁.</p>
      <p>Com a visada ao seio do cabo procura-se o parâmetro p da catenária y = p·(cosh(x/p) − 1) que deixa essa visada tangente ao cabo dentro do vão. A flecha sai de a·√(a² + d²)/(8p)·(1 + (a² + d²)/(48p²)). O desvio é (medida − teórica) / teórica.</p>`,
    pt: `<h2>Como o cálculo é feito</h2>
      <p>Segue a folha LBL. A altura da fixação no apoio de estação sobre o teodolito é S = H − HS − cadeia − cota + perna. O desnível do vão é (a − F)·tan(100 − Z<sub>f</sub>) − S, ou o desnível do perfil se o indicares.</p>
      <p>O parâmetro p é o que deixa a visada ao seio tangente à catenária dentro do vão. A flecha é a exata a meio vão, p·(cosh(a/2p) − 1)·√(1 + (d/AU)²), com AU = 2p·sinh(a/2p). O desvio é 1 − teórica / medida, como na coluna D da folha.</p>`
  };

  let lastR = null;
  function render(){
    const S = getState(), M = S.method;
    document.querySelectorAll('[data-m]').forEach(el => el.hidden = el.dataset.m !== M);
    $('method-caption').textContent = M === 'pt'
      ? 'Altura de fixação no apoio de estação pela tabela de apoios, desnível pelo ângulo de fixação no apoio oposto.'
      : 'Desníveis pelas leituras zenitais aos dois pontos de fixação.';
    syncTipoBtn();
    const ti = tipoInfo(); $('tipo-hint').textContent = ti.msg; $('tipo-hint').className = 'hint' + (ti.row ? ' info' : '');
    $('notes').innerHTML = NOTES[M];

    const R = computeCabo(S); lastR = R;
    IDS.forEach(id => $(id).setAttribute('aria-invalid', R.bad.has(id) ? 'true' : 'false'));
    $('tol-sum').textContent = `Tolerâncias: cabo mais alto −${fmt(R.tolA,1)} %, mais baixo +${fmt(R.tolB,1)} %`;
    $('msgs').innerHTML = R.errors.map(m => `<p class="msg err">${m}</p>`).concat(R.warns.map(m => `<p class="msg warn">${m}</p>`)).join('');

    const rd = $('reading'); rd.className = 'reading st-wait';
    let verdict = '', lbl = '', big = '–', sub = '', gauge = '';
    let d1l = 'Leitura esperada', d1v = '–', d2v = '–';
    if(R.missing){
      lbl = 'Resultado'; sub = 'Preenche ' + listPt(R.missing) + '.';
    } else if(R.errors.length){
      lbl = 'Resultado'; sub = 'Corrige os dados assinalados.';
    } else if(R.verdict){
      const V = R.verdict, cm = Math.abs(V.diff) * 100;
      rd.className = 'reading ' + (V.ok ? 'st-ok' : 'st-bad');
      verdict = `<span class="verdict ${V.ok ? 'ok' : 'bad'}">${V.ok ? 'Conforme' : 'Não conforme'}</span>`;
      lbl = 'Flecha medida'; big = `${fmt(V.f,2)}<small>m</small>`;
      const where = cm < 0.5 ? 'Cabo na posição teórica' : `Cabo ${fmt(cm,0)} cm mais ${V.diff > 0 ? 'baixo' : 'alto'} (${sfmt(V.dev * 100,1)} %)`;
      sub = `Teórica ${fmt(R.theo.ft,2)} m. ${where}, ${V.ok ? 'dentro' : 'fora'} do limite de ${V.dev >= 0 ? '+' : '−'}${fmt(V.lim,1)} %.`;
      gauge = gaugeHTML(R);
      d1l = 'Resultado'; d1v = V.ok ? 'Conforme' : 'Não conforme'; d2v = `${fmt(V.f,2)} m`;
    } else if(R.theo){
      lbl = 'Leitura esperada no seio do cabo'; big = `${fmt(R.theo.zT,4)}<small>grad</small>`;
      sub = `Conforme com leituras entre ${fmt(R.theo.zMin,4)} e ${fmt(R.theo.zMax,4)} grad. Introduz a visada medida para verificar.`;
      d1v = `${fmt(R.theo.zT,4)} grad`;
    } else if(R.meas){
      lbl = 'Flecha medida'; big = `${fmt(R.meas.f,2)}<small>m</small>`;
      sub = 'Indica a flecha teórica para verificar a conformidade.';
      d1l = 'Resultado'; d1v = 'Sem flecha teórica'; d2v = `${fmt(R.meas.f,2)} m`;
    } else {
      lbl = 'Resultado'; sub = 'Falta a visada ao seio do cabo ou a flecha teórica.';
    }
    $('r-verdict').innerHTML = verdict; $('r-lbl').textContent = lbl; $('r-big').innerHTML = big;
    $('r-sub').textContent = sub.replace(/ (%|m\b|grad\b|cm\b)/g, '\u00a0$1'); $('gauge').innerHTML = gauge;
    $('dock-l1').textContent = d1l; $('dock-v1').textContent = d1v; $('dock-v2').textContent = d2v;

    const st = [], ref = M === 'pt' ? 'apoio de estação' : 'apoio 1';
    if(!R.errors.length && R.geoOK){
      if(R.theo) st.push(`<div><dt>Limites da flecha</dt><dd>${fmt(R.theo.fLo,2)}–${fmt(R.theo.fHi,2)} m<span>teórica ${fmt(R.theo.ft,2)} m</span></dd></div>`);
      if(R.theo && R.meas) st.push(`<div><dt>Leitura esperada</dt><dd>${fmt(R.theo.zT,4)} grad<span>conforme de ${fmt(R.theo.zMin,4)} a ${fmt(R.theo.zMax,4)}</span></dd></div>`);
      if(R.meas) st.push(`<div><dt>Parâmetro real</dt><dd>${fmt(R.meas.p,1)} m<span>tangência a ${fmt(R.meas.s.u,1)} m do ${ref}</span></dd></div>`);
      st.push(`<div><dt>Desnível do vão</dt><dd>${fmt(R.d,2)} m<span>fixação no ${ref} a ${fmt(R.h,2)} m acima do teodolito</span></dd></div>`);
      if(isFinite(R.sens)) st.push(`<div><dt>Erro de 0,01 grad em Z</dt><dd>≈ ${fmt(R.sens * 100,0)} cm<span>de variação na flecha</span></dd></div>`);
      if(isFinite(R.v.temp)) st.push(`<div><dt>Temperatura</dt><dd>${fmt(R.v.temp,1)} °C<span>registada na medição</span></dd></div>`);
    }
    $('stats').innerHTML = st.join('');
    $('steps').innerHTML = (R.geoOK && !R.errors.length) ? R.steps.map(r => `<tr><td>${r[0]}</td><td class="f">${r[1]}</td><td class="v">${r[2]}</td></tr>`).join('') : '';
    draw(R.drawObj || null);
    save(S);
    if (onRender) onRender();
  }
  function nice(x){ const e = Math.pow(10, Math.floor(Math.log10(x))); const f = x / e; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e; }
  function draw(R){
    const host = $('profile');
    const W = Math.max(280, Math.round(host.clientWidth || 600));
    const H = Math.round(Math.min(420, Math.max(250, W * 0.48)));
    if(!R || !R.ok){
      host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Perfil indisponível"><text x="${W/2}" y="${H/2}" text-anchor="middle" class="m">O perfil aparece quando houver visada ao seio do cabo ou flecha teórica.</text></svg>`;
      return;
    }
    const {a, t, d, h, p} = R, XA = R.geo.XA, YA = R.geo.YA, ut = R.tan.u, th = R.tan.th;
    const cab = u => p * (Math.cosh((XA + u) / p) - 1) - YA;
    const n = 160, pts = []; let cmin = Infinity;
    for(let i = 0; i <= n; i++){ const u = a * i / n, vv = cab(u); pts.push([u, vv]); cmin = Math.min(cmin, vv); }
    const vt = cab(ut);
    let umin = Math.min(-t, 0), umax = a;
    const du = umax - umin; umin -= 0.06 * du; umax += 0.05 * du;
    let vmin = Math.min(-h, 0, d, cmin), vmax = Math.max(0, d, vt, -h);
    const dv = Math.max(vmax - vmin, 1); vmin -= 0.04 * dv; vmax += 0.06 * dv;
    const ml = 16, mr = 16, mt = 30, mb = 36;
    let sx = (W - ml - mr) / (umax - umin), sy = (H - mt - mb) / (vmax - vmin);
    if(sy < sx){ sx = sy; const need = (W - ml - mr) / sx, c = (umin + umax) / 2; umin = c - need / 2; umax = c + need / 2; }
    const ex = sy / sx;
    const X = u => ml + (u - umin) * sx, Y = vv => H - mb - (vv - vmin) * sy;
    const uAt = px => umin + (px - ml) / sx, vAt = py => vmin + (H - mb - py) / sy;
    const o = [];
    o.push(`<defs><clipPath id="plot"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>`);
    // quadrícula
    const hs = nice((umax - umin) / 7), vs = nice((vmax - vmin) / 5);
    const u0 = uAt(0), u1 = uAt(W), v0 = vAt(H), v1 = vAt(0);
    for(let k = Math.ceil(u0 / hs); k * hs <= u1; k++){ const x = X(k * hs).toFixed(1); o.push(`<line class="grid" x1="${x}" y1="0" x2="${x}" y2="${H}"/>`); }
    for(let k = Math.ceil(v0 / vs); k * vs <= v1; k++){ const y = Y(k * vs).toFixed(1); o.push(`<line class="grid" x1="0" y1="${y}" x2="${W}" y2="${y}"/>`); }
    // apoios
    [[0, 0, R.M === 'pt' ? 'Estação' : 'Apoio 1'], [a, d, R.M === 'pt' ? 'Oposto' : 'Apoio 2']].forEach(([u, vv, name]) => {
      const px = X(u), py = Y(vv), top = py - 8;
      let s = `M${px - 3} ${top}L${px - 12} ${H}M${px + 3} ${top}L${px + 12} ${H}M${px - 15} ${py}L${px + 15} ${py}`;
      let left = true;
      for(let yy = top + 14; yy < H; yy += 20){
        const w0 = 3 + 9 * (yy - top) / (H - top), w1 = 3 + 9 * (Math.min(H, yy + 20) - top) / (H - top);
        s += left ? `M${px - w0} ${yy}L${px + w1} ${Math.min(H, yy + 20)}` : `M${px + w0} ${yy}L${px - w1} ${Math.min(H, yy + 20)}`;
        left = !left;
      }
      o.push(`<path class="tower" d="${s}"/>`);
      o.push(`<circle cx="${px}" cy="${py}" r="3.5" fill="var(--ink)"/>`);
      o.push(`<text class="b" x="${Math.max(34, Math.min(W - 34, px))}" y="${top - 8}" text-anchor="middle">${name}</text>`);
    });
    // corda e condutor
    o.push(`<line class="chord" x1="${X(0)}" y1="${Y(0)}" x2="${X(a)}" y2="${Y(d)}"/>`);
    o.push(`<path class="wire" d="M${pts.map(q => X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join('L')}"/>`);
    // flecha a meio vão
    const xm = X(a / 2), yc = Y(d / 2), yw = Y(cab(a / 2));
    o.push(`<path class="dim" d="M${xm} ${yc}L${xm} ${yw}M${xm - 5} ${yc}L${xm + 5} ${yc}M${xm - 5} ${yw}L${xm + 5} ${yw}"/>`);
    o.push(`<text x="${Math.max(50, Math.min(W - 50, xm))}" y="${yc - 10}" text-anchor="middle" class="b">f = ${fmt(R.sag.fDoc,2)} m</text>`);
    // visada
    const ox = X(-t), oy = Y(-h), ue = uAt(W + 20), ve = -h + Math.tan(th) * (ue + t);
    o.push(`<g clip-path="url(#plot)"><line class="sight" x1="${ox}" y1="${oy}" x2="${X(ue)}" y2="${Y(ve)}"/></g>`);
    // teodolito
    o.push(`<path class="inst" d="M${ox} ${oy + 5}L${ox - 10} ${oy + 26}M${ox} ${oy + 5}L${ox + 10} ${oy + 26}M${ox} ${oy + 5}L${ox} ${oy + 26}"/>`);
    o.push(`<rect class="inst-head" x="${ox - 5}" y="${oy - 5}" width="10" height="10" rx="2"/>`);
    o.push(`<text x="${ox + 14}" y="${oy + 24}">teodolito</text>`);
    // tangência
    const tx = X(ut), ty = Y(vt);
    o.push(`<circle class="tan" cx="${tx}" cy="${ty}" r="5.5"/>`);
    const right = th < 0 || tx < W * 0.3;
    o.push(`<text x="${right ? tx + 10 : tx - 10}" y="${ty - 10}" text-anchor="${right ? 'start' : 'end'}">tangência</text>`);
    // legendas
    $('cap').textContent = `Perfil do vão, linha vermelha é a visada tangente ao cabo. ${ex > 1.05 ? 'Escala vertical exagerada ×' + fmt(ex, 1) : 'Escala 1:1'}, quadrícula de ${fmt(hs,0)} m por ${fmt(vs,0)} m.`;
    const aria = `Perfil do vão de ${fmt(a,1)} m com desnível de ${fmt(d,1)} m; visada tangente ao cabo a ${fmt(ut,1)} m do P1; flecha ${fmt(R.sag.fDoc,2)} m.`;
    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${o.join('')}</svg>`;
  }

  function save(S){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
  function load(){
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if(s && typeof s === 'object') return Object.assign({}, DEFAULTS, s); } catch(e){}
    try { const s = JSON.parse(localStorage.getItem('flechas-verificacao-v2') || 'null'); if(s && typeof s === 'object') return Object.assign({}, DEFAULTS, s, {method:'int'}); } catch(e){}
    return Object.assign({}, DEFAULTS, EX_INT);
  }

  setState(load());
  document.querySelectorAll('input:not([type=radio])').forEach(el => el.addEventListener('input', render));
  document.querySelectorAll('input[type=radio]').forEach(el => el.addEventListener('change', render));

  // Seletor de tipo de apoio com pesquisa
  const POSTES_LIST = Array.from(POSTES.values()).sort((x, y) => String(x[0]).localeCompare(String(y[0]), 'pt', {numeric:true, sensitivity:'base'}));
  const combo = {items:[], active:-1};
  const isSheet = () => !matchMedia('(min-width: 900px)').matches;
  const dec = v => String(v).replace('.', ',');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function syncTipoBtn(){ const v = $('tipo').value; $('tipo-val').textContent = v || 'Escolher apoio'; $('tipo-val').className = v ? '' : 'ph'; }
  function tipoDetail(r){ const p = []; if(r[1] != null) p.push('Ht ' + dec(r[1])); if(r[4] != null) p.push('Hu ' + dec(r[4])); return p.length ? p.join(', ') + ' m' : ''; }
  function filterTipos(q){
    q = q.trim().toUpperCase();
    if(!q) return [{none:true}].concat(POSTES_LIST);
    const starts = [], has = [];
    POSTES_LIST.forEach(r => { const n = String(r[0]).toUpperCase(); if(n.startsWith(q)) starts.push(r); else if(n.includes(q)) has.push(r); });
    return starts.concat(has);
  }
  function setActive(i, scroll){
    combo.active = i;
    const lis = $('tipo-list').children;
    for(let k = 0; k < lis.length; k++) lis[k].classList.toggle('active', k === i);
    if(i >= 0 && lis[i]){
      $('tipo-q').setAttribute('aria-activedescendant', lis[i].id);
      const L = $('tipo-list'), top = lis[i].offsetTop, bot = top + lis[i].offsetHeight;
      if(scroll === 'center') L.scrollTop = Math.max(0, top - L.clientHeight / 2);
      else if(scroll){ if(top < L.scrollTop) L.scrollTop = top; else if(bot > L.scrollTop + L.clientHeight) L.scrollTop = bot - L.clientHeight; }
    }
    else $('tipo-q').removeAttribute('aria-activedescendant');
  }
  function renderTipoList(){
    const q = $('tipo-q').value.trim();
    const items = filterTipos(q); combo.items = items;
    const cur = $('tipo').value.toUpperCase();
    $('tipo-list').innerHTML = items.map((r, i) => r.none
      ? `<li role="option" id="tipo-opt-${i}" data-i="${i}" aria-selected="${!cur}"><span class="n">Sem tipo</span><span class="d">H e HS à mão</span></li>`
      : `<li role="option" id="tipo-opt-${i}" data-i="${i}" aria-selected="${String(r[0]).toUpperCase() === cur}"><span class="n">${esc(r[0])}</span><span class="d">${tipoDetail(r)}</span></li>`).join('');
    $('tipo-count').textContent = !q ? `${POSTES_LIST.length} tipos na tabela` : items.length ? `${items.length} ${items.length === 1 ? 'tipo encontrado' : 'tipos encontrados'}` : `Nenhum tipo com «${q}». Fecha e escolhe «Sem tipo» para indicar H e HS à mão.`;
    const sel = items.findIndex(r => r.none ? !cur : String(r[0]).toUpperCase() === cur);
    $('tipo-list').scrollTop = 0;
    setActive(q ? (items.length ? 0 : -1) : Math.max(0, sel), q ? false : 'center');
  }
  function openTipo(){
    $('tipo-panel').hidden = false; $('tipo-btn').setAttribute('aria-expanded', 'true');
    $('tipo-q').value = ''; renderTipoList();
    if(isSheet()) document.body.style.overflow = 'hidden';
    $('tipo-q').focus({preventScroll:true});
  }
  function closeTipo(focusBtn){
    if($('tipo-panel').hidden) return;
    $('tipo-panel').hidden = true; $('tipo-btn').setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if(focusBtn) $('tipo-btn').focus({preventScroll:true});
  }
  function chooseTipo(i){
    const r = combo.items[i]; if(!r) return;
    $('tipo').value = r.none ? '' : r[0];
    if(!r.none) applyTipo();
    closeTipo(true); render();
  }
  $('tipo-btn').addEventListener('click', () => $('tipo-panel').hidden ? openTipo() : closeTipo(false));
  $('tipo-btn').addEventListener('keydown', e => { if(e.key === 'ArrowDown'){ e.preventDefault(); openTipo(); } });
  $('tipo-close').addEventListener('click', () => closeTipo(true));
  $('tipo-q').addEventListener('input', renderTipoList);
  $('tipo-q').addEventListener('keydown', e => {
    const n = combo.items.length;
    if(e.key === 'ArrowDown'){ e.preventDefault(); if(n) setActive(Math.min(n - 1, combo.active + 1), true); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); if(n) setActive(Math.max(0, combo.active - 1), true); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(combo.active >= 0) chooseTipo(combo.active); else if(isSheet()) $('tipo-q').blur(); }
    else if(e.key === 'Escape'){ e.preventDefault(); closeTipo(true); }
  });
  $('tipo-list').addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if(li) chooseTipo(+li.dataset.i); });
  document.addEventListener('pointerdown', e => { if(!$('tipo-panel').hidden && !isSheet() && !e.target.closest('.combo')) closeTipo(false); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !$('tipo-panel').hidden) closeTipo(true); });
  $('ponto').addEventListener('change', () => { applyTipo(); render(); });
  $('ex').addEventListener('click', () => { const M = method(); setState(Object.assign(getState(), M === 'pt' ? EX_PT : EX_INT)); render(); });
  $('new').addEventListener('click', () => { const keep = {tolA:$('tolA').value, tolB:$('tolB').value, method:method()}; setState(Object.assign({}, DEFAULTS, keep)); render(); $('a').focus(); });
  $('next').addEventListener('click', () => {
    const ids = method() === 'pt' ? ['zf','z'] : ['z1','z2','z'];
    ids.forEach(id => $(id).value = ''); render(); $(ids[0]).focus();
  });
  $('dock').addEventListener('click', () => $('out').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}));
  let lastW = 0;
  if('ResizeObserver' in window) new ResizeObserver(() => { const w = Math.round($('profile').clientWidth); if(w !== lastW){ lastW = w; draw(lastR && lastR.drawObj || null); } }).observe($('profile'));
  if('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => $('dock').classList.toggle('hide', e.isIntersecting)), {threshold:0.12}).observe($('out'));
  render();

  return { getState, setState: s => { setState(Object.assign({}, DEFAULTS, s)); render(); }, lastResult: () => resultSummary(lastR) };
}
