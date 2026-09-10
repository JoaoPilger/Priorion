import type { AjusteRegra, FatorRic, Prioridade } from '../types/demanda';

export interface FatoresRic {
  reach: FatorRic;
  impact: FatorRic;
  confidence: FatorRic;
}

export interface RegraEmpresa {
  id: string;
  descricao: string;
  avaliar: (fatores: FatoresRic) => boolean;
  // Ajuste aditivo aplicado depois do score base. A primeira regra que casa vence.
  efeito: number;
}

export interface LinhaExtrato {
  etapa: 'score-base' | 'regra';
  descricao: string;
  operacao: string;
  scoreResultante: number;
}

export interface ResultadoScore {
  scoreBase: number;
  ajustesRegra: AjusteRegra[];
  scoreFinal: number;
  prioridade: Prioridade;
  extrato: LinhaExtrato[];
}

export const LIMITES_PRIORIDADE = {
  critico: 1200,
  alto: 500,
  medio: 150,
} as const;

const IMPACTOS_VALIDOS = [0.25, 0.5, 1, 2, 3] as const;
const CONFIANCAS_VALIDAS = [0.5, 0.8, 1] as const;

function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function validarFatores(fatores: FatoresRic): void {
  if (!Number.isInteger(fatores.reach.valor) || fatores.reach.valor < 0) {
    throw new RangeError('Reach deve ser um inteiro maior ou igual a zero.');
  }
  if (!IMPACTOS_VALIDOS.includes(fatores.impact.valor as (typeof IMPACTOS_VALIDOS)[number])) {
    throw new RangeError('Impact deve ser 0.25, 0.5, 1, 2 ou 3.');
  }
  if (!CONFIANCAS_VALIDAS.includes(fatores.confidence.valor as (typeof CONFIANCAS_VALIDAS)[number])) {
    throw new RangeError('Confidence deve ser 0.5, 0.8 ou 1.');
  }
}

export function determinarPrioridade(score: number): Prioridade {
  if (score >= LIMITES_PRIORIDADE.critico) return 'critico';
  if (score >= LIMITES_PRIORIDADE.alto) return 'alto';
  if (score >= LIMITES_PRIORIDADE.medio) return 'medio';
  return 'baixo';
}

/**
 * Calcula Valor & Certeza: Reach × Impact × Confidence.
 * `dataEntrega` deliberadamente não faz parte desta API: é apenas informativa.
 */
export function calcularScore(fatores: FatoresRic, regras: RegraEmpresa[] = []): ResultadoScore {
  validarFatores(fatores);

  const scoreBase = arredondar(
    fatores.reach.valor * fatores.impact.valor * fatores.confidence.valor,
  );
  const extrato: LinhaExtrato[] = [
    {
      etapa: 'score-base',
      descricao: 'Score base (Valor & Certeza)',
      operacao: `${fatores.reach.valor} × ${fatores.impact.valor} × ${fatores.confidence.valor}`,
      scoreResultante: scoreBase,
    },
  ];

  const ajustesRegra: AjusteRegra[] = [];
  let scoreFinal = scoreBase;

  for (const regra of regras) {
    if (!regra.avaliar(fatores)) continue;

    scoreFinal = arredondar(scoreBase + regra.efeito);
    ajustesRegra.push({
      regraId: regra.id,
      descricao: regra.descricao,
      efeito: regra.efeito >= 0 ? `+${regra.efeito}` : `${regra.efeito}`,
    });
    extrato.push({
      etapa: 'regra',
      descricao: `Regra: ${regra.descricao}`,
      operacao: regra.efeito >= 0 ? `+${regra.efeito}` : `${regra.efeito}`,
      scoreResultante: scoreFinal,
    });
    break;
  }

  return {
    scoreBase,
    ajustesRegra,
    scoreFinal,
    prioridade: determinarPrioridade(scoreFinal),
    extrato,
  };
}
