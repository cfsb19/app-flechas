// Exportação e importação do histórico (funções puras).

const BAD_FILE = 'Ficheiro não é uma exportação da app Flechas.';

export function toJSON(records, now = new Date()) {
  return JSON.stringify({ app: 'flechas', versao: 1, exportadoEm: now.toISOString(), medicoes: records }, null, 1);
}

const isRecord = r => r && typeof r === 'object' && typeof r.id === 'string' && typeof r.savedAt === 'string'
  && (r.method === 'int' || r.method === 'pt') && r.inputs && typeof r.inputs === 'object' && !Array.isArray(r.inputs);

/** Lê um ficheiro exportado. Lança erro se não for uma exportação da app; conta os registos inválidos. */
export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error(BAD_FILE); }
  if (!data || data.app !== 'flechas' || !Array.isArray(data.medicoes)) throw new Error(BAD_FILE);
  const records = data.medicoes.filter(isRecord);
  return { records, invalid: data.medicoes.length - records.length };
}

const num = (v, dec) => Number.isFinite(v) ? v.toFixed(dec).replace('.', ',') : '';
const pad = n => String(n).padStart(2, '0');
const localDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const cell = v => { const s = String(v ?? ''); return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const trimNum = s => s.includes(',') ? s.replace(/0+$/, '').replace(/,$/, '') : s;

/** CSV para o Excel em português: BOM, separador ';', vírgula decimal. */
export function toCSV(records) {
  const head = 'data;vao;cabo;metodo;vao_m;flecha_teorica_m;flecha_medida_m;desvio_pct;resultado';
  const rows = records.map(r => {
    const x = r.result || {};
    return [
      localDate(r.savedAt), r.vao, r.cabo, r.method === 'pt' ? 'Português' : 'Internacional',
      trimNum(num(x.a, 3)), trimNum(num(x.ft, 3)), num(x.flecha, 3), num(Number.isFinite(x.desvio) ? x.desvio * 100 : NaN, 2),
      x.conforme === true ? 'Conforme' : x.conforme === false ? 'Não conforme' : '',
    ].map(cell).join(';');
  });
  return '﻿' + [head, ...rows].join('\r\n') + '\r\n';
}
