// Tabela de tipos de apoio (folha 'Postes' da LBL). Colunas: tipo, Ht, BrSup, BrMed, Hu, HS.
import postes from '../../data/postes.json' with { type: 'json' };

export const POSTES_ROWS = postes.apoios;
