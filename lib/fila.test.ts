import { describe, expect, it } from 'vitest';
import { agruparPorColuna } from './fila';
import type { Demanda } from '../types/demanda';

function criarDemanda(overrides: Partial<Demanda>): Demanda {
  return {
    id: 'DEM-000',
    titulo: 'demanda de teste',
    cliente: 'Cliente Teste',
    sistemaAfetado: 'Sistema Teste',
    tipo: 'bug',
    responsavel: null,
    status: 'aprovada_aberta',
    textoOriginal: 'texto',
    relatorioRefinado: null,
    reach: { valor: 10, confianca: 0.8, origem: 'informado', justificativa: 'x' },
    impact: { valor: 1, confianca: 0.8, origem: 'informado', justificativa: 'x' },
    confidence: { valor: 1, confianca: 0.8, origem: 'informado', justificativa: 'x' },
    dataEntrega: null,
    scoreBase: 10,
    ajustesRegra: [],
    scoreFinal: 10,
    prioridade: 'baixo',
    fixada: false,
    motivoFixacao: null,
    posicaoAtual: 1,
    posicaoAnterior: null,
    motivoDelta: null,
    criadaEm: '2026-09-09T00:00:00-03:00',
    atualizadaEm: '2026-09-09T00:00:00-03:00',
    ...overrides,
  };
}

describe('agruparPorColuna', () => {
  it('fixada vence a faixa de score — vai pra Priorizados mesmo com prioridade baixo', () => {
    const demanda = criarDemanda({ id: 'DEM-001', fixada: true, prioridade: 'critico', scoreFinal: 5 });
    const colunas = agruparPorColuna([demanda]);

    expect(colunas.priorizados).toEqual([demanda]);
    expect(colunas.critico).toEqual([]);
  });

  it('ordena cada coluna por scoreFinal decrescente', () => {
    const menor = criarDemanda({ id: 'DEM-002', prioridade: 'alto', scoreFinal: 60 });
    const maior = criarDemanda({ id: 'DEM-003', prioridade: 'alto', scoreFinal: 90 });
    const colunas = agruparPorColuna([menor, maior]);

    expect(colunas.alto.map((d) => d.id)).toEqual(['DEM-003', 'DEM-002']);
  });

  it('data de entrega não altera a coluna da demanda', () => {
    const semData = criarDemanda({ id: 'DEM-004', prioridade: 'medio', dataEntrega: null });
    const vencida = criarDemanda({ id: 'DEM-005', prioridade: 'medio', dataEntrega: '2020-01-01' });
    const colunas = agruparPorColuna([semData, vencida]);

    expect(colunas.medio).toEqual([semData, vencida]);
  });
});
