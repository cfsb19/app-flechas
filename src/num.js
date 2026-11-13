// Leitura e formatação de números (pt-PT). A entrada aceita vírgula ou ponto decimal.

const fmts = {};

/** Formata com `dec` casas decimais em pt-PT; '–' se não for finito. */
export function fmt(v, dec) {
  if (!isFinite(v)) return '–';
  const f = fmts[dec] || (fmts[dec] = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  return f.format(v);
}

/** Valor para pôr num campo de entrada (vírgula decimal). */
export function fmtIn(v) { return String(v).replace('.', ','); }

/** Com sinal explícito (+ ou −). */
export function sfmt(v, dec) { return (v >= 0 ? '+' : '−') + fmt(Math.abs(v), dec); }

/** Lê um número escrito à mão: vírgula ou ponto, espaços de milhar, sinal menos tipográfico. NaN se inválido. */
export function parseNum(str) {
  let s = String(str || '').trim().replace(/[\s  ]/g, '').replace(/−/g, '-');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}
