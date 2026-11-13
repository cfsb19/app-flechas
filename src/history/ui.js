// Histórico no ecrã: guardar, abrir, apagar, exportar e importar.
import { toJSON, toCSV, parseImport } from './export.js';
import { fmt } from '../num.js';
import { saveFile } from '../platform/files.js';

const LAST = 'flechas-ultimo-vao-cabo';
const pad = n => String(n).padStart(2, '0');
const when = iso => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const newId = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

export function mountHistory({ calc, history }) {
  const $ = id => document.getElementById(id);
  const msg = (t = '', err = false) => { $('hist-msg').textContent = t; $('hist-msg').classList.toggle('info', !err); };

  const canSave = () => { $('save').disabled = !history || !calc.lastResult(); };
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
      const ok = r.result && r.result.conforme;
      main.append(`${r.vao || '—'} · ${r.cabo || '—'} · ${fmt(r.result && r.result.flecha, 2)} m · `);
      const v = document.createElement('span'); v.className = ok ? 'ok' : 'nok'; v.textContent = ok ? 'Conforme' : 'Não conforme';
      main.append(v);
      const w = document.createElement('span'); w.className = 'hist-when'; w.textContent = when(r.savedAt);
      const btns = document.createElement('span'); btns.className = 'hist-btns';
      const open = document.createElement('button'); open.type = 'button'; open.className = 'link'; open.textContent = 'Abrir';
      open.addEventListener('click', () => { calc.setState({ ...r.inputs, method: r.method }); $('hist').close(); });
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
  $('save').addEventListener('click', () => {
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
    const result = calc.lastResult();
    if (!history || !result) { $('save-dialog').close(); return; }
    const vao = $('save-vao').value.trim(), cabo = $('save-cabo').value;
    const st = calc.getState();
    try {
      await history.add({
        id: newId(), savedAt: new Date().toISOString(), vao, cabo, method: st.method, inputs: st,
        result: { a: result.a, ft: result.ft, flecha: result.flecha, desvio: result.desvio, conforme: result.conforme, p: result.p },
      });
    } catch (err) {
      $('save-msg').textContent = 'Não foi possível guardar a medição. Tenta outra vez.';
      return;
    }
    try { localStorage.setItem(LAST, JSON.stringify({ vao, cabo })); } catch (err) { /* sem armazenamento */ }
    $('save-dialog').close();
  });

  // Painel
  $('hist-open').addEventListener('click', async () => { msg(); await refresh(); $('hist').showModal(); });
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
