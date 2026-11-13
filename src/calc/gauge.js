// Barra de tolerância: faixa verde entre −tolA e +tolB, marcador no desvio medido.
import { fmt, sfmt } from '../num.js';

/** HTML da barra para um resultado com veredicto. mini: versão compacta para a tabela do boletim. */
export function gaugeHTML(R, mini = false) {
  const devPct = R.verdict.dev * 100, A = R.tolA, B = R.tolB;
  const lo = Math.min(-A - 1, devPct - 0.8), hi = Math.max(B + 1, devPct + 0.8);
  const pos = x => (x - lo) / (hi - lo) * 100;
  const pin = Math.min(94, Math.max(6, pos(devPct)));
  return `<div class="gauge${mini ? ' mini' : ''}" role="img" aria-label="Desvio de ${sfmt(devPct,1)} %, tolerância de −${fmt(A,1)} % a +${fmt(B,1)} %">
    <div class="track">
      <div class="band" style="left:${pos(-A)}%;width:${pos(B) - pos(-A)}%"></div>
      <div class="zero" style="left:${pos(0)}%"></div>
      <div class="pin${R.verdict.ok ? '' : ' bad'}" style="left:${pin}%">${sfmt(devPct,1)} %</div>
    </div>
    <span class="tick" style="left:${pos(-A)}%">−${fmt(A,1)} %</span>
    <span class="tick" style="left:${pos(0)}%">0</span>
    <span class="tick" style="left:${pos(B)}%">+${fmt(B,1)} %</span>
    <span class="side" style="left:0">cabo mais alto</span>
    <span class="side" style="right:0">cabo mais baixo</span>
  </div>`;
}
