import type { Demanda } from '../types/demanda';

export type ColunaFila = 'priorizados' | 'critico' | 'alto' | 'medio' | 'baixo';

export const ORDEM_COLUNAS: ColunaFila[] = ['priorizados', 'critico', 'alto', 'medio', 'baixo'];

export const TITULO_COLUNA: Record<ColunaFila, string> = {
  priorizados: 'Priorizados',
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo',
};

function colunaDaDemanda(demanda: Demanda): ColunaFila | null {
  if (demanda.fixada) return 'priorizados';
  return demanda.prioridade;
}

/** Agrupa por coluna (fixada vence a faixa de score) e ordena cada coluna por scoreFinal decrescente. */
export function agruparPorColuna(demandas: Demanda[]): Record<ColunaFila, Demanda[]> {
  const colunas: Record<ColunaFila, Demanda[]> = {
    priorizados: [],
    critico: [],
    alto: [],
    medio: [],
    baixo: [],
  };

  for (const demanda of demandas) {
    const coluna = colunaDaDemanda(demanda);
    if (coluna !== null) colunas[coluna].push(demanda);
  }

  for (const coluna of ORDEM_COLUNAS) {
    colunas[coluna].sort((a, b) => b.scoreFinal - a.scoreFinal);
  }

  return colunas;
}

/**
 * Percentil por normalização min-max (0..1) do valor contra o conjunto informado.
 * Escolhido em vez de rank/total por ser mais simples de explicar no hover
 * ("40% do maior reach da fila") e não precisar de critério de desempate.
 */
export function percentil(valor: number, todos: number[]): number {
  if (todos.length <= 1) return 1;
  const min = Math.min(...todos);
  const max = Math.max(...todos);
  if (max === min) return 1;
  return (valor - min) / (max - min);
}

export interface PercentisRic {
  reach: number;
  impact: number;
  confidence: number;
}

/** Percentis dos 3 fatores RIC de `demanda` contra `todasDemandas` (a fila inteira). */
export function calcularPercentisRic(demanda: Demanda, todasDemandas: Demanda[]): PercentisRic {
  return {
    reach: percentil(demanda.reach.valor, todasDemandas.map((d) => d.reach.valor)),
    impact: percentil(demanda.impact.valor, todasDemandas.map((d) => d.impact.valor)),
    confidence: percentil(demanda.confidence.valor, todasDemandas.map((d) => d.confidence.valor)),
  };
}
