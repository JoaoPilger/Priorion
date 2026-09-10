import evaluationConfig from '../../config/ai-demand-evaluation.json';

export const REFINEMENT_MODEL = evaluationConfig.model;
export const REFINEMENT_PROMPT_VERSION = evaluationConfig.version;
const MAX_RETRIES = 4;
const RETRY_DELAYS_MS = [800, 1600, 3200, 6000];
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function retryDelay(response: Response | null, retryIndex: number) {
  const retryAfterSeconds = Number(response?.headers.get('retry-after'));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 15_000);
  }
  return RETRY_DELAYS_MS[retryIndex] ?? 4000;
}

export type InterviewTurn = { question: string; answer: string };
export type RefinementEvaluation = {
  title: string;
  refinedReport: string;
  reach: { value: number; source: 'informed' | 'inferred'; justification: string };
  impact: { value: number; source: 'informed' | 'inferred'; justification: string };
  confidence: { value: number; source: 'informed' | 'inferred'; justification: string };
  justification: string;
  inconsistencyAlerts: string[];
};
export type RefinementResult = {
  decision: 'ask_clarification' | 'complete';
  questions: Array<{ id: string; factor: 'reach' | 'impact' | 'confidence' | 'context'; text: string; options: string[] }>;
  evaluation: RefinementEvaluation | null;
  raw: unknown;
};

function validEvaluation(value: unknown): value is RefinementEvaluation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const reach = item.reach as Record<string, unknown> | undefined;
  const impact = item.impact as Record<string, unknown> | undefined;
  const confidence = item.confidence as Record<string, unknown> | undefined;
  return typeof item.title === 'string'
    && typeof item.refinedReport === 'string'
    && typeof reach?.value === 'number' && Number.isSafeInteger(reach.value) && reach.value >= 0
    && [0.25, 0.5, 1, 2, 3].includes(Number(impact?.value))
    && [0.5, 0.8, 1].includes(Number(confidence?.value))
    && typeof item.justification === 'string'
    && Array.isArray(item.inconsistencyAlerts);
}

export async function evaluateDemand(input: {
  initialText: string;
  impactedDepartment: string;
  history: InterviewTurn[];
  forceComplete?: boolean;
}): Promise<RefinementResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('REFINEMENT_NOT_CONFIGURED');

  const instruction = input.forceComplete
    ? `${evaluationConfig.systemInstruction} MODO FINALIZAÇÃO OBRIGATÓRIA: Você DEVE obrigatoriamente retornar "decision": "complete", "questions": [] e preencher completamente o objeto "evaluation" (com title, refinedReport, reach, impact, confidence, justification, inconsistencyAlerts). Reduza Confidence quando houver incerteza, sem inventar fatos. NUNCA retorne "ask_clarification".`
    : evaluationConfig.systemInstruction;
  const requestBody = JSON.stringify({
    model: REFINEMENT_MODEL,
    messages: [
      { role: 'system', content: instruction },
      { role: 'user', content: JSON.stringify({
        relatoOriginal: input.initialText,
        setorImpactado: input.impactedDepartment,
        respostasAnteriores: input.history,
        perguntasProibidasPorJaTeremSidoRespondidas: input.history.map(turn => turn.question),
      }) },
    ],
    temperature: 0.1,
    max_completion_tokens: input.forceComplete ? 750 : 450,
    reasoning_format: 'hidden',
    reasoning_effort: 'none',
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'priorion_demand_evaluation',
        strict: true,
        schema: evaluationConfig.responseJsonSchema,
      },
    },
  });
  let response: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
          throw new Error('REFINEMENT_TIMEOUT');
        }
        throw new Error('REFINEMENT_NETWORK');
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay(null, attempt)));
      continue;
    }
    if (response.ok || !RETRYABLE_STATUS.has(response.status) || attempt === MAX_RETRIES) break;
    await new Promise(resolve => setTimeout(resolve, retryDelay(response, attempt)));
  }

  if (!response?.ok) throw new Error(`REFINEMENT_HTTP_${response?.status ?? 503}`);
  const raw = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = raw.choices?.[0]?.message?.content;
  if (!text) throw new Error('REFINEMENT_EMPTY_RESPONSE');
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const decision = parsed.decision;
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const evaluation = validEvaluation(parsed.evaluation) ? parsed.evaluation : null;

  if (decision !== 'ask_clarification' && decision !== 'complete') throw new Error('REFINEMENT_INVALID_RESPONSE');
  if (decision === 'complete' && !evaluation) throw new Error('REFINEMENT_INVALID_RESPONSE');

  return { decision, questions: questions as RefinementResult['questions'], evaluation, raw };
}
