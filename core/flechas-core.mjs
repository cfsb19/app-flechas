// Núcleo de cálculo de flechas por visada tangente (catenária exata).
// Extraído do protótipo app/calculadora-flechas.html e validado contra a folha LBL (tests/).
// Ângulos de entrada: leituras zenitais em grados (100 grad = horizontal).

export const G2R = Math.PI / 200;

/** Geometria do vão com origem no ponto mais baixo da catenária y = p·(cosh(x/p) − 1).
 *  XA, YA: coordenadas do apoio 1 / apoio de estação nesse referencial. */
export function geometry(a, d, p) {
  const AU = 2 * p * Math.sinh(a / (2 * p));
  const k = d / AU;
  const XA = -a / 2 + p * Math.asinh(k);
  const YA = p * (Math.cosh(XA / p) - 1);
  return { AU, k, XA, YA };
}

/** F(X) = 0 quando a reta tangente à catenária em X passa pelo teodolito.
 *  t: distância horizontal do teodolito ao apoio 1, positiva para fora do vão.
 *  h: altura do ponto de fixação no apoio 1 acima do teodolito. */
function Ftan(X, p, XA, YA, t, h) {
  return p * (Math.cosh(X / p) - 1) - Math.sinh(X / p) * (X - XA + t) - YA + h;
}
const negOrNaN = v => !(v > 0);

/** Dado o parâmetro p, ponto de tangência e leitura zenital da visada tangente. */
export function solveTangent(a, d, p, t, h) {
  const g = geometry(a, d, p);
  const xo = g.XA - t;
  if (!(Ftan(xo, p, g.XA, g.YA, t, h) > 0)) return { ...g, above: true };
  let lo = xo, hi = xo + Math.max(a, 1), n = 0;
  while (!negOrNaN(Ftan(hi, p, g.XA, g.YA, t, h)) && n < 80) { hi = xo + (hi - xo) * 2; n++; }
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (negOrNaN(Ftan(m, p, g.XA, g.YA, t, h))) hi = m; else lo = m;
  }
  const X = (lo + hi) / 2;
  const th = Math.atan(Math.sinh(X / p));
  return { ...g, X, u: X - g.XA, th, zen: 100 - th / G2R };
}

/** Dada a leitura zenital da visada tangente, parâmetro(s) p que a tornam tangente.
 *  Varrimento em escala log + bisseção. Pode haver duas raízes; best = tangência dentro
 *  do vão (0 ≤ u ≤ a) mais perto do meio. */
export function solveParam(a, d, t, h, zen) {
  const th = (100 - zen) * G2R;
  const s = Math.asinh(Math.tan(th));
  const G = p => { const g = geometry(a, d, p); const X = p * s; return { v: Ftan(X, p, g.XA, g.YA, t, h), u: X - g.XA }; };
  const pmin = Math.max(a / 20, 1), pmax = 3e5, N = 800;
  const roots = [];
  let prevP = pmin, prev = G(pmin).v;
  for (let i = 1; i <= N; i++) {
    const p = pmin * Math.pow(pmax / pmin, i / N);
    const v = G(p).v;
    if (isFinite(prev) && isFinite(v) && (prev === 0 || prev * v < 0)) {
      let lo = prevP, hi = p, flo = prev;
      for (let j = 0; j < 120; j++) {
        const m = Math.sqrt(lo * hi); const fm = G(m).v;
        if (fm * flo > 0) { lo = m; flo = fm; } else hi = m;
      }
      const pr = Math.sqrt(lo * hi);
      roots.push({ p: pr, u: G(pr).u });
    }
    prevP = p; prev = v;
  }
  const inside = roots.filter(r => r.u >= 0 && r.u <= a);
  const best = inside.length ? inside.reduce((b, r) => Math.abs(r.u - a / 2) < Math.abs(b.u - a / 2) ? r : b) : null;
  return { roots, inside, best };
}

/** Flecha do método internacional (fórmula do documento Formulas_Calculo_Flechas_2.docx). */
export const flechaInternacional = (a, d, p) => {
  const b2 = a * a + d * d;
  return a * Math.sqrt(b2) / (8 * p) * (1 + b2 / (48 * p * p));
};

/** Flecha do método português: flecha exata da catenária a meio vão (coluna M da folha LBL). */
export const flechaPortugues = (a, d, p) =>
  p * (Math.cosh(a / 2 / p) - 1) * Math.sqrt(1 + Math.pow(d / (2 * p * Math.sinh(a / 2 / p)), 2));

/** Inverte uma função de flecha (decrescente em p). */
export function pFromSag(fn, a, d, f) {
  let lo = a / 100, hi = 1e8;
  if (!(fn(a, d, lo) > f && fn(a, d, hi) < f)) return NaN;
  for (let i = 0; i < 200; i++) { const m = Math.sqrt(lo * hi); if (fn(a, d, m) > f) lo = m; else hi = m; }
  return Math.sqrt(lo * hi);
}

/** Desvio e conformidade.
 *  Internacional: (medida − teórica)/teórica. Português: 1 − teórica/medida (coluna D da folha LBL).
 *  Tolerâncias em %: tolAlto para cabo mais alto (flecha menor), tolBaixo para cabo mais baixo. */
export function conformidade(metodo, f, ft, tolAlto = 2.5, tolBaixo = 1.5) {
  const desvio = metodo === 'pt' ? 1 - ft / f : (f - ft) / ft;
  const limite = desvio >= 0 ? tolBaixo : tolAlto;
  return { desvio, limite, conforme: Math.abs(desvio) * 100 <= limite + 1e-9, diferenca: f - ft };
}

/** Limites de flecha coerentes com a regra de conformidade de cada método. */
export function limitesFlecha(metodo, ft, tolAlto = 2.5, tolBaixo = 1.5) {
  const A = tolAlto / 100, B = tolBaixo / 100;
  return metodo === 'pt'
    ? { min: ft / (1 + A), max: ft / (1 - B) }
    : { min: ft * (1 - A), max: ft * (1 + B) };
}

/** Geometria do método internacional: desníveis pelas leituras Z1 e Z2. */
export function geometriaInternacional({ a, t, z1, z2 }) {
  const D1 = t * Math.tan((100 - z1) * G2R);
  const D2 = (a + t) * Math.tan((100 - z2) * G2R);
  return { t, h: D1, d: D2 - D1, D1, D2 };
}

/** Geometria do método português (folha LBL).
 *  F: distância de visada ao apoio de estação, NEGATIVA com o teodolito atrás dele (fora do vão).
 *  S = H − HS − cadeia − cota + perna (fixação na estação acima do teodolito).
 *  d = (a − F)·tan(100 − Zf) − S, ou dPerfil se indicado. */
export function geometriaPortugues({ a, F, cota, H, HS, perna = 0, cadeia, zf, dPerfil }) {
  const S = H - HS - cadeia - cota + perna;
  const d = Number.isFinite(dPerfil) ? dPerfil : (a - F) * Math.tan((100 - zf) * G2R) - S;
  return { t: -F, h: S, d, S };
}

/** Cálculo completo de um cabo. metodo: 'int' | 'pt'. Devolve null se não houver tangência no vão. */
export function calcularCabo(metodo, entrada, { tolAlto = 2.5, tolBaixo = 1.5 } = {}) {
  const geo = metodo === 'pt' ? geometriaPortugues(entrada) : geometriaInternacional(entrada);
  const { a, z, ft } = entrada;
  const fn = metodo === 'pt' ? flechaPortugues : flechaInternacional;
  const sp = solveParam(a, geo.d, geo.t, geo.h, z);
  const res = { geo, raizes: sp.roots };
  if (sp.best) {
    res.p = sp.best.p;
    res.u = sp.best.u;
    res.flecha = fn(a, geo.d, res.p);
    if (Number.isFinite(ft)) Object.assign(res, conformidade(metodo, res.flecha, ft, tolAlto, tolBaixo));
  }
  if (Number.isFinite(ft)) {
    const lim = limitesFlecha(metodo, ft, tolAlto, tolBaixo);
    const zPara = f => { const p = pFromSag(fn, a, geo.d, f); if (!isFinite(p)) return NaN; const s = solveTangent(a, geo.d, p, geo.t, geo.h); return s.above ? NaN : s.zen; };
    const z0 = zPara(ft), zA = zPara(lim.min), zB = zPara(lim.max);
    res.leituraEsperada = { z: z0, min: Math.min(zA, zB), max: Math.max(zA, zB), flechaMin: lim.min, flechaMax: lim.max };
  }
  return res;
}
