// Histórico no ecrã: guardar, abrir, apagar, exportar e importar.
import { toJSON, toCSV, parseImport } from './export.js';
import { fmt } from '../num.js';
import { saveFile } from '../platform/files.js';
import { CABOS, grupoDoCabo } from '../calc/temperatura.js';
import { temperaturaCalculo } from '../boletim/state.js';

const LAST = 'flechas-ultimo-vao-cabo';
const pad = n => String(n).padStart(2, '0');
const when = iso => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const newId = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

export function mountHistory({ calc, boletim = null, history, setVista = () => {} }) {
  const $ = id => document.getElementById(id);
  const msg = (t = '', err = false) => { $('hist-msg').textContent = t; $('hist-msg').classList.toggle('info', !err); };

  let saving = 'cabo';
  const boletimTemResultado = () => !!boletim && Object.values(boletim.resultados() || {}).some(R => R && (R.verdict || R.reg || R.meas));
  const canSave = () => {
    $('save').disabled = !history || !calc.lastResult();
    const b = $('b-save'); if (b) b.disabled = !history || !boletimTemResultado();
  };
  const fm = (v, d) => fmt(v, d);
  /** Resultados do boletim para guardar: só os números, por cabo. */
  function resultadosBoletim(B, res) {
    const out = {};
    for (const c of CABOS) {
      const R = res[c], tc = temperaturaCalculo(B, grupoDoCabo(c));
      if (!R) { out[c] = null; continue; }
      if (R.reg) out[c] = { ft: R.reg.f, flecha: R.reg.f, p: R.reg.p, z: R.reg.z, zMin: R.reg.zMin, zMax: R.reg.zMax, tc };
      else if (R.verdict) out[c] = { ft: R.theo.ft, flecha: R.verdict.f, desvio: R.verdict.dev, conforme: R.verdict.ok, p: R.meas.p, tc };
      else if (R.meas) out[c] = { flecha: R.meas.f, p: R.meas.p, tc };
      else out[c] = null;
    }
    return out;
  }
  canSave();

  if (!history) {
    $('hist-warn').hidden = false;
    ['hist-export-json', 'hist-export-csv', 'hist-import'].forEach(id => { $(id).disabled = true; });
  }

  async function refresh() {
    let list = [];
    try { list = history ? await history.list() : []; }
    catch (e) { msg('Não foi possível ler o histórico. Fecha e volta a abrir a app.', true); }
    $('hist-empty').hidden = list.length > 0;
    const ul = $('hist-list'); ul.textContent = '';
    for (const r of list) {
      const li = document.createElement('li');
      const main = document.createElement('span'); main.className = 'hist-main';
      const v = document.createElement('span');
      if (r.kind === 'boletim') {
        const vals = Object.values(r.resultados || {}).filter(Boolean);
        if (r.modo === 'reg') { main.append(`${r.vao || '—'} · Boletim · ${vals.length} ${vals.length === 1 ? 'cabo' : 'cabos'} · `); v.textContent = 'Regulação'; }
        else {
          const tot = vals.filter(x => typeof x.conforme === 'boolean'), conf = tot.filter(x => x.conforme).length;
          main.append(`${r.vao || '—'} · Boletim · `);
          v.className = conf === tot.length ? 'ok' : 'nok'; v.textContent = `${conf}/${tot.length} conformes`;
        }
      } else if (r.modo === 'reg') {
        main.append(`${r.vao || '—'} · ${r.cabo || '—'} · leitura ${fm(r.result && r.result.z, 4)} grad · `); v.textContent = 'Regulação';
      } else {
        const ok = r.result && r.result.conforme;
        main.append(`${r.vao || '—'} · ${r.cabo || '—'} · ${fm(r.result && r.result.flecha, 2)} m · `);
        v.className = ok ? 'ok' : 'nok'; v.textContent = ok ? 'Conforme' : 'Não conforme';
      }
      main.append(v);
      const w = document.createElement('span'); w.className = 'hist-when'; w.textContent = when(r.savedAt);
      const btns = document.createElement('span'); btns.className = 'hist-btns';
      const open = document.createElement('button'); open.type = 'button'; open.className = 'link'; open.textContent = 'Abrir';
      open.addEventListener('click', () => {
        if (r.kind === 'boletim' && boletim) { setVista('boletim'); boletim.setState({ ...r.boletim, id: r.id }); }
        else { setVista('cabo'); calc.setState({ ...r.inputs, method: r.method }); }
        $('hist').close();
      });
      const del = document.createElement('button'); del.type = 'button'; del.className = 'link'; del.textContent = 'Apagar';
      del.addEventListener('click', async () => {
        if (!confirm(`Apagar a medição ${r.vao || ''} ${r.cabo || ''}?`)) return;
        try { await history.remove(r.id); msg(); }
        catch (err) { msg('Não foi possível apagar a medição. Tenta outra vez.', true); }
        refresh();
      });
      btns.append(open, del);
      li.append(main, w, btns);
      ul.append(li);
    }
    return list;
  }

  // Guardar
  const caboField = () => $('save-cabo').closest('label');
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#b-save, #b-hist');
    if (!t) return;
    if (t.id === 'b-hist') { openPanel(); return; }
    saving = 'boletim';
    $('save-vao').value = boletim.getState().vao || '';
    caboField().hidden = true;
    $('save-msg').textContent = '';
    $('save-dialog').showModal();
    $('save-vao').focus();
  });
  $('save').addEventListener('click', () => {
    saving = 'cabo';
    caboField().hidden = false;
    try { const last = JSON.parse(localStorage.getItem(LAST) || 'null'); if (last) { $('save-vao').value = last.vao || ''; $('save-cabo').value = last.cabo || 'CC1'; } } catch (e) { /* sem armazenamento */ }
    const cur = calc.getState();
    if (cur.cabo) $('save-cabo').value = cur.cabo;
    $('save-msg').textContent = '';
    $('save-dialog').showModal();
    $('save-vao').focus();
  });
  $('save-cancel').addEventListener('click', () => $('save-dialog').close());
  $('save-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (saving === 'boletim') {
      const B = boletim.getState(), vao = $('save-vao').value.trim();
      const id = B.id || newId();
      const rec = { id, kind: 'boletim', savedAt: new Date().toISOString(), vao, method: B.method, modo: B.modo,
        boletim: { ...B, id, vao }, resultados: resultadosBoletim(B, boletim.resultados()) };
      try { await history.add(rec); }
      catch (err) { $('save-msg').textContent = 'Não foi possível guardar o boletim. Tenta outra vez.'; return; }
      boletim.setState({ ...B, id, vao });
      $('save-dialog').close();
      return;
    }
    const result = calc.lastResult();
    if (!history || !result) { $('save-dialog').close(); return; }
    const vao = $('save-vao').value.trim(), cabo = $('save-cabo').value;
    const st = calc.getState();
    try {
      await history.add({
        id: newId(), kind: 'cabo', savedAt: new Date().toISOString(), vao, cabo, method: st.method, modo: result.modo || 'ver',
        tLocal: result.tLocal, tc: result.tc, inputs: st,
        result: { a: result.a, ft: result.ft, flecha: result.flecha, desvio: result.desvio, conforme: result.conforme, p: result.p,
          z: result.z, zMin: result.zMin, zMax: result.zMax },
      });
    } catch (err) {
      $('save-msg').textContent = 'Não foi possível guardar a medição. Tenta outra vez.';
      return;
    }
    try { localStorage.setItem(LAST, JSON.stringify({ vao, cabo })); } catch (err) { /* sem armazenamento */ }
    $('save-dialog').close();
  });

  // Painel
  async function openPanel() { msg(); await refresh(); $('hist').showModal(); }
  $('hist-open').addEventListener('click', openPanel);
  $('hist-close').addEventListener('click', () => $('hist').close());

  const exportAs = (ext, make, mime) => async () => {
    try { await saveFile(`flechas-${today()}.${ext}`, make(await history.list()), mime); }
    catch (err) { msg('Não foi possível exportar. Tenta outra vez.', true); }
  };
  $('hist-export-json').addEventListener('click', exportAs('json', toJSON, 'application/json'));
  $('hist-export-csv').addEventListener('click', exportAs('csv', toCSV, 'text/csv;charset=utf-8'));
  $('hist-import').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const { records, invalid } = parseImport(await f.text());
      const { added, skipped } = await history.importMany(records);
      const parts = [`${added} ${added === 1 ? 'medição importada' : 'medições importadas'}`];
      if (skipped) parts.push(`${skipped} já ${skipped === 1 ? 'existia' : 'existiam'}`);
      if (invalid) parts.push(`${invalid} ${invalid === 1 ? 'inválida ignorada' : 'inválidas ignoradas'}`);
      msg(parts.join(', ') + '.');
      refresh();
    } catch (err) { msg(err.message, true); }
  });

  return { onRender: canSave };
}
