import { parseNum } from '../num.js';
// Exportação e importação do histórico (funções puras).

const BAD_FILE = 'Ficheiro não é uma exportação da app Flechas.';

export function toJSON(records, now = new Date()) {
  return JSON.stringify({ app: 'flechas', versao: 1, exportadoEm: now.toISOString(), medicoes: records }, null, 1);
}

const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
/** Registo cabo a cabo (kind 'cabo' ou antigo, sem kind) ou boletim do vão (kind 'boletim'). */
const isRecord = r => isObj(r) && typeof r.id === 'string' && typeof r.savedAt === 'string'
  && (r.method === 'int' || r.method === 'pt')
  && (r.kind === 'boletim' ? isObj(r.boletim) && isObj(r.resultados) : (r.kind == null || r.kind === 'cabo') && isObj(r.inputs));

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

/** CSV para o Excel em português: BOM, separador ';', vírgula decimal. Uma linha por cabo. */
export function toCSV(records) {
  const head = 'data;vao;cabo;modo;metodo;temp_local_c;temp_calculo_c;vao_m;flecha_teorica_m;flecha_medida_m;desvio_pct;resultado;parametro_m;leitura_alvo_grad';
  const n = v => (typeof v === 'string' ? parseNum(v) : v);
  const row = (r, cabo, x, extra) => {
    const reg = (r.modo || 'ver') === 'reg';
    return [
      localDate(r.savedAt), r.vao, cabo, reg ? 'Regulação' : 'Verificação', r.method === 'pt' ? 'Português' : 'Internacional',
      trimNum(num(n(extra.tLocal), 1)), trimNum(num(n(extra.tc), 1)),
      trimNum(num(n(extra.a), 3)), trimNum(num(x.ft, 3)),
      reg ? '' : num(x.flecha, 3), reg ? '' : num(Number.isFinite(x.desvio) ? x.desvio * 100 : NaN, 2),
      reg ? '' : x.conforme === true ? 'Conforme' : x.conforme === false ? 'Não conforme' : '',
      num(x.p, 2), reg ? num(x.z, 4) : '',
    ].map(cell).join(';');
  };
  const rows = [];
  for (const r of records) {
    if (r.kind === 'boletim') {
      const b = r.boletim || {};
      for (const [cabo, x] of Object.entries(r.resultados || {})) {
        if (!x) continue;
        rows.push(row(r, cabo, x, { tLocal: b.tLocal, tc: x.tc, a: b.a }));
      }
    } else {
      const x = r.result || {};
      rows.push(row(r, r.cabo, x, { tLocal: r.tLocal, tc: r.tc, a: x.a }));
    }
  }
  return '\uFEFF' + [head, ...rows].join('\r\n') + '\r\n';
}
