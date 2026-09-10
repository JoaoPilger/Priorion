import { describe, expect, it } from 'vitest';

import type { Demand } from '../prototype-api';
import { buildDashboard, parseDemandUpdate } from './demands';

const demands: Demand[] = [
  {
    id: '1',
    title: 'Automatizar conciliação',
    client: 'Financeiro',
    reach: 100,
    impact: 3,
    confidence: 0.8,
    score: 240,
    priority: 'medio',
    status: 'aprovada_aberta',
    owner: 'Ana',
    createdAt: '2026-09-10T00:00:00Z',
  },
  {
    id: '2',
    title: 'Corrigir bloqueio de faturamento',
    client: 'Operações',
    reach: 500,
    impact: 3,
    confidence: 1,
    score: 1500,
    priority: 'critico',
    status: 'travada',
    owner: 'Não atribuído',
    createdAt: '2026-09-10T00:00:00Z',
  },
];

describe('buildDashboard', () => {
  it('calcula métricas exclusivamente a partir das demandas reais recebidas', () => {
    const result = buildDashboard(demands);

    expect(result.totalDemands).toBe(2);
    expect(result.totalReach).toBe(600);
    expect(result.averageImpact).toBe(3);
    expect(result.averageConfidence).toBe(0.9);
    expect(result.priorityCounts).toEqual({ critico: 1, alto: 0, medio: 1, baixo: 0 });
    expect(result.statusCounts['travada']).toBe(1);
    expect(result.stalledDemands).toEqual([demands[1]]);
    expect(result.topPriorityDemands).toEqual(demands);
  });
});

describe('parseDemandUpdate', () => {
  it('aceita apenas fatores e status previstos pelo domínio', () => {
    expect(parseDemandUpdate({
      reach: 250,
      impact: 2,
      confidence: 0.8,
      status: 'em_execucao',
      justification: 'Valor confirmado pelo gestor.',
    })).toEqual({
      reach: 250,
      impact: 2,
      confidence: 0.8,
      status: 'em_execucao',
      justification: 'Valor confirmado pelo gestor.',
    });
  });

  it.each([
    { reach: -1 },
    { reach: 1.5 },
    { impact: 4 },
    { confidence: 0.7 },
    { status: 'urgente' },
    { justification: 'não' },
  ])('rejeita entrada externa inválida: %o', (input) => {
    expect(() => parseDemandUpdate(input)).toThrow('INVALID_INPUT');
  });
});
