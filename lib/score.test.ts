import { describe, expect, it } from 'vitest';
import {
  calcularScore,
  determinarPrioridade,
  LIMITES_PRIORIDADE,
  type RegraEmpresa,
} from './score';
import type { FatorRic } from '../types/demanda';

function fator(valor: number): FatorRic {
  return { valor, confianca: 1, origem: 'informado', justificativa: 'teste' };
}

function fatores(reach: number, impact: number, confidence: number) {
  return {
    reach: fator(reach),
    impact: fator(impact),
    confidence: fator(confidence),
  };
}

describe('calcularScore — Valor & Certeza', () => {
  it('calcula Reach × Impact × Confidence sem Effort', () => {
    const resultado = calcularScore(fatores(1200, 3, 1));
    expect(resultado.scoreBase).toBe(3600);
    expect(resultado.scoreFinal).toBe(3600);
  });

  it('arredonda o score para uma casa decimal', () => {
    const resultado = calcularScore(fatores(341, 0.5, 0.8));
    expect(resultado.scoreBase).toBe(136.4);
  });

  it('não recebe data de entrega e produz o mesmo score independentemente desse metadado', () => {
    const semData = { dataEntrega: null, fatores: fatores(300, 2, 0.8) };
    const comDataVencida = { dataEntrega: '2020-01-01', fatores: fatores(300, 2, 0.8) };

    expect(calcularScore(semData.fatores).scoreFinal).toBe(
      calcularScore(comDataVencida.fatores).scoreFinal,
    );
  });
});

describe('determinarPrioridade — limites do modelo sem Effort', () => {
  it.each([
    [LIMITES_PRIORIDADE.critico, 'critico'],
    [LIMITES_PRIORIDADE.critico - 0.1, 'alto'],
    [LIMITES_PRIORIDADE.alto, 'alto'],
    [LIMITES_PRIORIDADE.alto - 0.1, 'medio'],
    [LIMITES_PRIORIDADE.medio, 'medio'],
    [LIMITES_PRIORIDADE.medio - 0.1, 'baixo'],
  ] as const)('classifica score %s como %s', (score, prioridade) => {
    expect(determinarPrioridade(score)).toBe(prioridade);
  });
});

describe('calcularScore — regras da empresa', () => {
  const base = fatores(100, 2, 0.8); // scoreBase = 160

  it('aplica a regra depois do score base', () => {
    const regra: RegraEmpresa = {
      id: 'r1',
      descricao: 'afeta faturamento',
      avaliar: () => true,
      efeito: 40,
    };
    const resultado = calcularScore(base, [regra]);

    expect(resultado.scoreBase).toBe(160);
    expect(resultado.scoreFinal).toBe(200);
  });

  it('quando mais de uma regra casa, somente a primeira é aplicada', () => {
    const regras: RegraEmpresa[] = [
      { id: 'r1', descricao: 'primeira', avaliar: () => true, efeito: 40 },
      { id: 'r2', descricao: 'segunda', avaliar: () => true, efeito: 999 },
    ];
    const resultado = calcularScore(base, regras);

    expect(resultado.ajustesRegra).toHaveLength(1);
    expect(resultado.ajustesRegra[0].regraId).toBe('r1');
    expect(resultado.scoreFinal).toBe(200);
  });

  it('ignora regras que não casam antes de aplicar a primeira que casa', () => {
    const regras: RegraEmpresa[] = [
      { id: 'r1', descricao: 'não casa', avaliar: () => false, efeito: 999 },
      { id: 'r2', descricao: 'casa', avaliar: () => true, efeito: -10 },
    ];
    const resultado = calcularScore(base, regras);

    expect(resultado.ajustesRegra[0].regraId).toBe('r2');
    expect(resultado.scoreFinal).toBe(150);
    expect(resultado.prioridade).toBe('medio');
  });
});

describe('calcularScore — extrato de rastreabilidade', () => {
  it('registra a fórmula, cada ajuste aplicado e termina no score final', () => {
    const regras: RegraEmpresa[] = [
      { id: 'r-bonus', descricao: 'afeta faturamento', avaliar: () => true, efeito: 40 },
    ];
    const resultado = calcularScore(fatores(1200, 3, 1), regras);

    expect(resultado.extrato).toEqual([
      {
        etapa: 'score-base',
        descricao: 'Score base (Valor & Certeza)',
        operacao: '1200 × 3 × 1',
        scoreResultante: 3600,
      },
      {
        etapa: 'regra',
        descricao: 'Regra: afeta faturamento',
        operacao: '+40',
        scoreResultante: 3640,
      },
    ]);
    expect(resultado.extrato.at(-1)?.scoreResultante).toBe(resultado.scoreFinal);
  });
});

describe('calcularScore — validação dos fatores', () => {
  it('rejeita Reach fracionário', () => {
    expect(() => calcularScore(fatores(10.5, 1, 0.8))).toThrow(RangeError);
  });

  it('rejeita Impact fora da escala', () => {
    expect(() => calcularScore(fatores(10, 1.5, 0.8))).toThrow(RangeError);
  });

  it('rejeita Confidence fora da escala', () => {
    expect(() => calcularScore(fatores(10, 1, 0.7))).toThrow(RangeError);
  });
});
