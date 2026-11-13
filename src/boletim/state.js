// Boletim do vão: estado (strings, como os campos), entrada de cada cabo para computeCabo e resumo.
import { computeCabo } from '../calc/compute.js';
import { CABOS, grupoDoCabo, bracoDoCabo, tempCalculo, resolverTeorico } from '../calc/temperatura.js';
import { POSTES_ROWS } from '../calc/tipos.js';
import { parseNum } from '../num.js';

const COL = { ht: 1, sup: 2, med: 3, hu: 4 };
const POSTES = new Map();
POSTES_ROWS.forEach(r => POSTES.set(String(r[0]).toUpperCase(), r)); // última ocorrência prevalece, como o PROCV

export const specVazio = () => ({ tipo: 'direta', direta: '', tabela: {} });
const caboVazioState = () => ({ z1: '', z2: '', z: '', zf: '', cad: '', H: '', teor: null, param: null });

export function novoBoletim() {
  return {
    id: null, vao: '', method: 'int', modo: 'ver', tLocal: '', corr: { CC: '', CG: '' },
    a: '', t: '', dp: '', tipo: '', HS: '', perna: '', cota: '', F: '', tolA: '2,5', tolB: '1,5',
    teor: { CC: specVazio(), CG: specVazio() }, param: { CC: specVazio(), CG: specVazio() },
    cabos: Object.fromEntries(CABOS.map(c => [c, caboVazioState()])),
  };
}

/** Normaliza um boletim lido do armazenamento (campos em falta ficam com o valor por omissão). */
export function normalizarBoletim(B) {
  const N = novoBoletim();
  if (!B || typeof B !== 'object') return N;
  const out = { ...N, ...B, corr: { ...N.corr, ...(B.corr || {}) } };
  out.teor = { CC: { ...specVazio(), ...((B.teor || {}).CC || {}) }, CG: { ...specVazio(), ...((B.teor || {}).CG || {}) } };
  out.param = { CC: { ...specVazio(), ...((B.param || {}).CC || {}) }, CG: { ...specVazio(), ...((B.param || {}).CG || {}) } };
  out.cabos = Object.fromEntries(CABOS.map(c => [c, { ...caboVazioState(), ...((B.cabos || {})[c] || {}) }]));
  return out;
}

/** Sem nenhuma leitura (Z₁, Z₂, Z, Zf). A cadeia pré-preenchida não conta. */
export function caboVazio(B, cabo) {
  const c = B.cabos[cabo] || {};
  return !['z1', 'z2', 'z', 'zf'].some(k => String(c[k] ?? '').trim() !== '');
}

const str = x => (Number.isFinite(x) ? String(x) : '');
const tcDoGrupo = (B, g) => tempCalculo(parseNum(B.tLocal), parseNum((B.corr || {})[g]));

/** Temperatura de cálculo de um grupo ('CC' | 'CG'). */
export const temperaturaCalculo = (B, g) => tcDoGrupo(B, g);

/** Estado de computeCabo para um cabo do boletim. */
export function entradaDoCabo(B, cabo) {
  const c = B.cabos[cabo] || caboVazioState(), g = grupoDoCabo(cabo), tc = tcDoGrupo(B, g);
  const row = POSTES.get(String(B.tipo || '').trim().toUpperCase());
  const hTab = row ? row[COL[bracoDoCabo(cabo)]] : null;
  const H = String(c.H ?? '').trim() !== '' ? c.H : (hTab == null ? '' : String(hTab));
  const HS = String(B.HS ?? '').trim() !== '' ? B.HS : (row && row[5] != null ? String(row[5]) : '');
  return {
    method: B.method, modo: B.modo, a: B.a, dp: B.dp, t: B.t, H, HS, perna: B.perna, cad: c.cad,
    z1: c.z1, z2: c.z2, cota: B.cota, F: B.F, zf: c.zf, z: c.z, temp: B.tLocal,
    ft: str(resolverTeorico(c.teor || B.teor[g], tc)),
    preg: str(resolverTeorico(c.param || B.param[g], tc)),
    tolA: B.tolA, tolB: B.tolB,
  };
}

/** Resultado de computeCabo por cabo; null para cabos vazios. */
export function calcularBoletim(B) {
  return Object.fromEntries(CABOS.map(c => [c, caboVazio(B, c) ? null : computeCabo(entradaDoCabo(B, c))]));
}

/** Resumo da verificação: cabos com veredicto, quantos conformes e quais não. */
export function resumo(resultados) {
  let total = 0, conformes = 0; const naoConformes = [];
  for (const c of CABOS) {
    const R = resultados[c];
    if (!R || !R.verdict) continue;
    total++;
    if (R.verdict.ok) conformes++; else naoConformes.push(c);
  }
  return { total, conformes, naoConformes };
}
