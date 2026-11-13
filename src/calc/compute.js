// Cálculo de um cabo a partir do estado do formulário (strings, vírgula decimal).
// Usado pela vista cabo a cabo e pelo boletim do vão. Modo 'ver' (verificação) ou 'reg' (regulação).
import { G2R, solveTangent, solveParam, pFromSag, flechaInternacional, flechaPortugues } from '../../core/flechas-core.mjs';
import { parseNum, fmt, sfmt } from '../num.js';

const IDS = ['a','dp','t','tipo','ponto','H','HS','perna','cad','z1','z2','cota','F','zf','z','temp','ft','tolA','tolB'];
const NAMES = {a:'o comprimento do vão', t:'a distância de visada', z1:'o desnível 1', z2:'o desnível 2',
  H:'a altura H', HS:'o HS', cad:'a cadeia', cota:'a cota', F:'a distância de visada', zf:'o ângulo de fixação', preg:'o parâmetro'};

export function computeCabo(S){
  S = Object.assign({}, S);
  IDS.concat(['preg']).forEach(id => { S[id] = S[id] == null ? '' : String(S[id]); });
  const v = {}; IDS.forEach(id => v[id] = parseNum(S[id]));
  const M = S.method;
  const modo = S.modo === 'reg' ? 'reg' : 'ver';
  v.preg = parseNum(S.preg);
  // Na regulação a leitura Z e a flecha teórica não entram: o parâmetro dá a leitura a apontar.
  if(modo === 'reg'){ v.z = NaN; v.ft = NaN; S.z = ''; S.ft = ''; }
  const R = {M, modo, errors:[], warns:[], bad:new Set(), steps:[], v};
  R.tolA = (isFinite(v.tolA) && v.tolA >= 0) ? v.tolA : 2.5;
  R.tolB = (isFinite(v.tolB) && v.tolB >= 0) ? v.tolB : 1.5;
  ['tolA','tolB'].forEach(id => { if(S[id].trim() && !(v[id] >= 0)) R.bad.add(id); });
  const optional = M === 'pt' ? ['z','temp','ft','dp','perna'] : ['z','temp','ft'];
  optional.forEach(id => { if(S[id].trim() && !isFinite(v[id])){ R.bad.add(id); R.errors.push('Há um valor que não é um número. Usa vírgula para as décimas.'); } });

  const need = M === 'pt' ? ['a','H','HS','cad','cota','F'].concat(isFinite(v.dp) ? [] : ['zf']) : ['a','t','z1','z2'];
  if(modo === 'reg') need.push('preg');
  const miss = need.filter(id => !isFinite(v[id]));
  miss.forEach(id => { if(S[id].trim()) R.bad.add(id); });
  if(miss.length){ R.missing = miss.map(id => NAMES[id]); R.errors = [...new Set(R.errors)]; return R; }
  if(!(v.a > 0)){ R.bad.add('a'); R.errors.push('O comprimento do vão tem de ser maior que zero.'); }
  ['z1','z2','zf','z'].forEach(id => { if(need.includes(id) || id === 'z'){ if(isFinite(v[id]) && !(v[id] > 0 && v[id] < 200)){ R.bad.add(id); R.errors.push('As leituras zenitais têm de estar entre 0 e 200 grad.'); } } });
  if(isFinite(v.ft) && !(v.ft > 0)){ R.bad.add('ft'); R.errors.push('A flecha teórica tem de ser maior que zero.'); }
  if(modo === 'reg' && !(v.preg > 0)){ R.bad.add('preg'); R.errors.push('O parâmetro tem de ser maior que zero.'); }

  let a = v.a, t, d, h;
  if(M === 'int'){
    if(!(v.t > 0)){ R.bad.add('t'); R.errors.push('A distância de visada tem de ser maior que zero.'); }
    if(R.errors.length){ R.errors = [...new Set(R.errors)]; return R; }
    const D1 = v.t * Math.tan((100 - v.z1) * G2R), D2 = (a + v.t) * Math.tan((100 - v.z2) * G2R);
    t = v.t; d = D2 - D1; h = D1;
    R.steps.push(['Desnível ao apoio 1, Desn₁', 't·tan(π/200·(100 − Z₁))', fmt(D1,3) + ' m'],
                 ['Desnível ao apoio 2, Desn₂', '(a + t)·tan(π/200·(100 − Z₂))', fmt(D2,3) + ' m'],
                 ['Desnível do vão, d', 'Desn₂ − Desn₁', fmt(d,3) + ' m']);
    if(!(h > 0)) R.warns.push('O apoio 1 fica abaixo do teodolito. Confirma a leitura Z₁.');
  } else {
    if(!(a - v.F > 0)){ R.bad.add('F'); R.errors.push('Com esta distância de visada o teodolito fica para lá do apoio oposto. Confirma o sinal: negativa com o teodolito atrás do apoio de estação.'); }
    if(R.errors.length){ R.errors = [...new Set(R.errors)]; return R; }
    const perna = isFinite(v.perna) ? v.perna : 0;
    h = v.H - v.HS - v.cad - v.cota + perna;
    t = -v.F;
    R.steps.push(['Fixação na estação sobre o teodolito, S', 'H − HS − cadeia − cota + perna', fmt(h,3) + ' m']);
    if(isFinite(v.dp)){
      d = v.dp;
      R.steps.push(['Desnível do vão, d', 'desnível do perfil', fmt(d,3) + ' m']);
    } else {
      d = (a - v.F) * Math.tan((100 - v.zf) * G2R) - h;
      R.steps.push(['Desnível do vão, d', '(a − F)·tan(π/200·(100 − Z_f)) − S', fmt(d,3) + ' m']);
    }
    if(!(h > 0)) R.warns.push('O ponto de fixação no apoio de estação fica abaixo do teodolito. Confirma H, cadeia e cota.');
  }
  Object.assign(R, {a, t, d, h, geoOK:true});
  const fn = M === 'pt' ? flechaPortugues : flechaInternacional;
  if(modo === 'reg' && !R.errors.length) v.ft = fn(a, d, v.preg);
  const devOf = (f, ft) => M === 'pt' ? 1 - ft / f : (f - ft) / ft;
  const sagName = M === 'pt' ? 'p·(cosh(a/2p) − 1)·√(1 + (d/AU)²)' : 'a·√(a² + d²)/(8p)·(1 + (a² + d²)/(48p²))';

  // Flecha teórica: leitura esperada e intervalo conforme
  if(isFinite(v.ft)){
    const ft = v.ft, A = R.tolA / 100, B = R.tolB / 100;
    const fLo = M === 'pt' ? ft / (1 + A) : ft * (1 - A);
    const fHi = M === 'pt' ? ft / (1 - B) : ft * (1 + B);
    const pT = modo === 'reg' ? v.preg : pFromSag(fn, a, d, ft);
    const sT = isFinite(pT) ? solveTangent(a, d, pT, t, h) : null;
    if(!sT || sT.above){
      R.errors.push('Com esta geometria não há visada tangente ao cabo. Confirma a distância de visada e os desníveis.');
    } else {
      const zAt = f => { const pp = pFromSag(fn, a, d, f); if(!isFinite(pp)) return NaN; const s = solveTangent(a, d, pp, t, h); return s.above ? NaN : s.zen; };
      const zLo = zAt(fLo), zHi = zAt(fHi);
      R.theo = {ft, fLo, fHi, pT, sT, zT: sT.zen, zMin: Math.min(zLo, zHi), zMax: Math.max(zLo, zHi)};
      if(sT.u < 0 || sT.u > a) R.warns.push(`Com a flecha teórica, a visada toca o cabo a ${fmt(sT.u,0)} m do apoio ${M === 'pt' ? 'de estação' : '1'}, fora do vão. Afasta ou aproxima o teodolito.`);
      R.steps.push(['Parâmetro teórico, p₀', 'flecha(p₀) = flecha teórica', fmt(pT,1) + ' m'],
                   ['Leitura esperada, Z₀', 'visada tangente com p₀', fmt(sT.zen,4) + ' grad'],
                   ['Limites da flecha', `−${fmt(R.tolA,1)} % / +${fmt(R.tolB,1)} %`, `${fmt(fLo,3)} a ${fmt(fHi,3)} m`],
                   ['Leituras conformes', 'visada tangente nos limites', `${fmt(R.theo.zMin,4)} a ${fmt(R.theo.zMax,4)} grad`]);
    }
  }

  if(modo === 'reg' && R.theo) R.reg = {p:R.theo.pT, f:R.theo.ft, z:R.theo.zT, zMin:R.theo.zMin, zMax:R.theo.zMax};

  // Medição
  if(isFinite(v.z) && !R.errors.length){
    const sp = solveParam(a, d, t, h, v.z);
    if(!sp.best){
      R.bad.add('z');
      R.errors.push('Esta visada ao seio do cabo não fica tangente ao cabo dentro do vão com nenhum parâmetro. Confirma as leituras.');
    } else {
      const p = sp.best.p, s = solveTangent(a, d, p, t, h), f = fn(a, d, p);
      if(sp.inside.length > 1) R.warns.push('Há mais de um parâmetro possível com tangência dentro do vão; usa-se o de tangência mais perto do meio.');
      if(s.u < 0.1 * a || s.u > 0.9 * a) R.warns.push(`A tangência fica a ${fmt(100 * s.u / a,0)} % do vão, perto de um apoio. A leitura é mais sensível: se puderes, ajusta a distância de visada.`);
      R.meas = {p, s, f, th: Math.atan(Math.sinh(s.X / p))};
      R.steps.push(['Elevação medida, θ', '100 − Z', fmt(100 - v.z,4) + ' grad'],
                   ['Parâmetro real, p', 'visada tangente ao cabo', fmt(p,2) + ' m'],
                   ['Tangência a partir do apoio ' + (M === 'pt' ? 'de estação' : '1'), 'X − X_A', fmt(s.u,1) + ' m'],
                   ['Flecha medida', sagName, fmt(f,3) + ' m']);
    }
  }

  // Sensibilidade a 0,01 grad
  const zRef = R.meas ? v.z : (R.theo ? R.theo.zT : NaN);
  if(isFinite(zRef) && !R.errors.length){
    const fAt = zz => { const sp = solveParam(a, d, t, h, zz); return sp.best ? fn(a, d, sp.best.p) : NaN; };
    const f0 = fAt(zRef), f1 = fAt(zRef + 0.01), f2 = fAt(zRef - 0.01);
    R.sens = (Math.abs(f1 - f0) + Math.abs(f2 - f0)) / 2;
  }

  // Conformidade
  if(R.meas && R.theo){
    const f = R.meas.f, dev = devOf(f, R.theo.ft);
    const lim = dev >= 0 ? R.tolB : R.tolA;
    R.verdict = {f, dev, diff: f - R.theo.ft, lim, ok: Math.abs(dev) * 100 <= lim + 1e-9};
    R.steps.push(['Desvio', M === 'pt' ? '1 − teórica / medida' : '(medida − teórica) / teórica', sfmt(dev * 100,2) + ' %']);
  }

  const src = R.meas ? {p:R.meas.p, s:R.meas.s, f:R.meas.f} : (R.theo && !R.errors.length ? {p:R.theo.pT, s:R.theo.sT, f:R.theo.ft} : null);
  if(src && !R.errors.length) R.drawObj = {ok:true, M, a, t, d, h, p:src.p, geo:{XA:src.s.XA, YA:src.s.YA}, tan:{u:src.s.u, th:Math.atan(Math.sinh(src.s.X / src.p))}, sag:{fDoc:src.f}};
  R.errors = [...new Set(R.errors)];
  return R;
}
