import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateDemand, REFINEMENT_MODEL } from '../server/services/refinement';

const validPayload = {
  choices: [{
    message: {
      content: JSON.stringify({
        decision: 'ask_clarification',
        questions: [{ id: 'reach', factor: 'reach', text: 'Quantas pessoas são afetadas?', options: [] }],
        evaluation: null,
      }),
    },
  }],
};

describe('serviço de refinamento', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('usa o modelo de produção econômico selecionado', () => {
    expect(REFINEMENT_MODEL).toBe('qwen/qwen3.6-27b');
  });

  it('faz quatro retries antes de retornar erro transitório', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const assertion = expect(evaluateDemand({
      initialText: 'Leitor do caixa parou de funcionar.',
      impactedDepartment: 'Operações',
      history: [],
    })).rejects.toThrow('REFINEMENT_HTTP_503');

    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('retorna normalmente quando a quinta tentativa funciona', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json(validPayload));
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = evaluateDemand({
      initialText: 'Leitor do caixa parou de funcionar.',
      impactedDepartment: 'Operações',
      history: [],
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;
    expect(result.decision).toBe('ask_clarification');
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
