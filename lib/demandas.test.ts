import { describe, expect, it } from 'vitest';
import demandasJson from '../data/demandas.json';
import type { Demanda } from '../types/demanda';
import { calcularScore, type RegraEmpresa } from './score';

const demandas = demandasJson as unknown as Demanda[];

describe('data/demandas.json — semente auditável', () => {
  it('contém exatamente sete demandas com IDs únicos', () => {
    expect(demandas).toHaveLength(7);
    expect(new Set(demandas.map((demanda) => demanda.id)).size).toBe(7);
  });

  it('exercita ausência, data futura e data passada sem criar estado de urgência', () => {
    expect(demandas.some((demanda) => demanda.dataEntrega === null)).toBe(true);
    expect(demandas.some((demanda) => demanda.dataEntrega === '2026-10-19')).toBe(true);
    expect(demandas.some((demanda) => demanda.dataEntrega === '2026-09-05')).toBe(true);

    for (const demanda of demandas) {
      expect(demanda).not.toHaveProperty('folgaDias');
      expect(demanda).not.toHaveProperty('estadoPrazo');
      expect(demanda).not.toHaveProperty('multiplicadorUrgencia');
      expect(demanda).not.toHaveProperty('effort');
    }
  });

  it('mantém score base e final coerentes com os três fatores e ajustes registrados', () => {
    for (const demanda of demandas) {
      const regras: RegraEmpresa[] = demanda.ajustesRegra.map((ajuste) => ({
        id: ajuste.regraId,
        descricao: ajuste.descricao,
        avaliar: () => true,
        efeito: Number(ajuste.efeito),
      }));
      const resultado = calcularScore(
        {
          reach: demanda.reach,
          impact: demanda.impact,
          confidence: demanda.confidence,
        },
        regras,
      );

      expect(resultado.scoreBase, demanda.id).toBe(demanda.scoreBase);
      expect(resultado.scoreFinal, demanda.id).toBe(demanda.scoreFinal);
      expect(resultado.prioridade, demanda.id).toBe(demanda.prioridade);
    }
  });
});
