// Temperatura de cálculo (correção de fluência), linhas da tabela de regulação e interpolação.
import { parseNum } from '../num.js';

export const CABOS = ['CC1', 'CC2', 'CC3', 'CC4', 'CC5', 'CC6', 'CG1', 'CG2'];

/** CC1–CC6 → 'CC'; CG1, CG2 → 'CG'. */
export const grupoDoCabo = cabo => (String(cabo).startsWith('CG') ? 'CG' : 'CC');

/** Braço do apoio (coluna da tabela de apoios) de cada cabo, como na folha LBL. */
export function bracoDoCabo(cabo) {
  const B = { CC1: 'sup', CC2: 'sup', CC3: 'med', CC4: 'med', CC5: 'hu', CC6: 'hu', CG1: 'ht', CG2: 'ht' };
  return B[cabo] || 'sup';
}

/** Temperatura de cálculo: local menos a correção de fluência (vazia = 0). */
export const tempCalculo = (tLocal, corr) => (Number.isFinite(tLocal) ? tLocal - (Number.isFinite(corr) ? corr : 0) : NaN);

/** Temperaturas da tabela a pedir: [Tc] se múltiplo de 5, senão [T0, T0 + 5]. */
export function linhasTabela(Tc) {
  if (!Number.isFinite(Tc)) return [];
  const r = 5 * Math.round(Tc / 5);
  if (Math.abs(Tc - r) < 1e-9) return [r === 0 ? 0 : r];
  const t0 = 5 * Math.floor(Tc / 5);
  return [t0 === 0 ? 0 : t0, t0 + 5];
}

/** Valor teórico (flecha ou parâmetro): direto, ou pela tabela com interpolação linear. NaN se faltar. */
export function resolverTeorico(spec, Tc) {
  if (!spec) return NaN;
  if (spec.tipo !== 'tabela') return parseNum(spec.direta);
  const L = linhasTabela(Tc);
  if (!L.length) return NaN;
  const v = L.map(T => parseNum((spec.tabela || {})[String(T)]));
  if (v.some(x => !Number.isFinite(x))) return NaN;
  if (L.length === 1) return v[0];
  return v[0] + (Tc - L[0]) / 5 * (v[1] - v[0]);
}

const TEMP_KEY = 'flechas-temp-dia', CORR_KEY = 'flechas-correcoes';
const readJSON = (st, k) => { try { return JSON.parse(st.getItem(k) || 'null'); } catch (e) { return null; } };
const writeJSON = (st, k, v) => { try { st.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

/** Última temperatura escrita no mesmo dia (AAAA-MM-DD), ou ''. */
export function temperaturaDoDia(storage, hoje) {
  const v = readJSON(storage, TEMP_KEY);
  return v && v.data === hoje && typeof v.valor === 'string' ? v.valor : '';
}
export const lembrarTemperatura = (storage, valor, hoje) => writeJSON(storage, TEMP_KEY, { data: hoje, valor: String(valor) });

export function lerCorrecoes(storage) {
  const v = readJSON(storage, CORR_KEY) || {};
  return { CC: typeof v.CC === 'string' ? v.CC : '', CG: typeof v.CG === 'string' ? v.CG : '' };
}
export const guardarCorrecoes = (storage, c) => writeJSON(storage, CORR_KEY, { CC: String(c.CC ?? ''), CG: String(c.CG ?? '') });

/** Data local de hoje em AAAA-MM-DD. */
export function hojeISO(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
