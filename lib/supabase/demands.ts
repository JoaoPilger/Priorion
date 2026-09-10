import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { DashboardMetrics, Demand, DemandAudit, Priority, Status } from '../prototype-api';

type DemandRow = {
  id: string;
  code: string;
  requester_id: string;
  assigned_to: string | null;
  title: string;
  impacted_department: string;
  original_description: string;
  refined_report: string | null;
  status: Status;
  reach: number;
  impact: number;
  confidence: number;
  score: number;
  priority: Priority;
  delivery_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  requester: { display_name: string; department: string } | null;
  assignee: { display_name: string } | null;
};

export type DemandUpdate = Partial<Pick<
  Demand,
  'title' | 'client' | 'reach' | 'impact' | 'confidence' | 'status' | 'description' | 'owner'
>> & { justification?: string };

const VALID_STATUSES: Status[] = [
  'pendente_aprovacao',
  'aprovada_aberta',
  'em_execucao',
  'travada',
  'concluida',
];
const VALID_IMPACTS = [0.25, 0.5, 1, 2, 3];
const VALID_CONFIDENCES = [0.5, 0.8, 1];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseDemandUpdate(value: unknown): DemandUpdate {
  if (!isRecord(value)) throw new Error('INVALID_INPUT');
  const input = value;
  const result: DemandUpdate = {};

  function optionalText(key: 'title' | 'client' | 'description' | 'owner') {
    if (!(key in input)) return;
    const field = input[key];
    if (typeof field !== 'string') throw new Error('INVALID_INPUT');
    result[key] = field.trim();
  }

  optionalText('title');
  optionalText('client');
  optionalText('description');
  optionalText('owner');

  if (result.title !== undefined && (result.title.length < 3 || result.title.length > 180)) {
    throw new Error('INVALID_INPUT');
  }
  if (result.client !== undefined && (result.client.length < 2 || result.client.length > 120)) {
    throw new Error('INVALID_INPUT');
  }
  if (result.description !== undefined && result.description.length > 10000) {
    throw new Error('INVALID_INPUT');
  }
  if (result.owner !== undefined && result.owner.length > 120) throw new Error('INVALID_INPUT');

  if ('reach' in input) {
    if (typeof input.reach !== 'number' || !Number.isSafeInteger(input.reach) || input.reach < 0) {
      throw new Error('INVALID_INPUT');
    }
    result.reach = input.reach;
  }
  if ('impact' in input) {
    if (typeof input.impact !== 'number' || !VALID_IMPACTS.includes(input.impact)) {
      throw new Error('INVALID_INPUT');
    }
    result.impact = input.impact;
  }
  if ('confidence' in input) {
    if (typeof input.confidence !== 'number' || !VALID_CONFIDENCES.includes(input.confidence)) {
      throw new Error('INVALID_INPUT');
    }
    result.confidence = input.confidence;
  }
  if ('status' in input) {
    if (typeof input.status !== 'string' || !VALID_STATUSES.includes(input.status as Status)) {
      throw new Error('INVALID_INPUT');
    }
    result.status = input.status as Status;
  }
  if ('justification' in input) {
    if (typeof input.justification !== 'string') throw new Error('INVALID_INPUT');
    const justification = input.justification.trim();
    if (justification.length < 5 || justification.length > 1000) throw new Error('INVALID_INPUT');
    result.justification = justification;
  }

  return result;
}

const DEMAND_SELECT = `
  id,
  code,
  requester_id,
  assigned_to,
  title,
  impacted_department,
  original_description,
  refined_report,
  status,
  reach,
  impact,
  confidence,
  score,
  priority,
  delivery_date,
  approved_by,
  approved_at,
  created_at,
  updated_at,
  requester:profiles!demands_requester_id_fkey(display_name, department),
  assignee:profiles!demands_assigned_to_fkey(display_name)
`;

function asRows(data: unknown): DemandRow[] {
  return (data ?? []) as DemandRow[];
}

function asRow(data: unknown): DemandRow | null {
  return (data ?? null) as DemandRow | null;
}

function toDemand(row: DemandRow): Demand {
  return {
    id: row.id,
    title: row.title,
    client: row.impacted_department,
    reach: Number(row.reach),
    impact: Number(row.impact),
    confidence: Number(row.confidence),
    score: Number(row.score),
    priority: row.priority,
    status: row.status,
    owner: row.assignee?.display_name ?? 'Não atribuído',
    createdAt: row.created_at,
    refinedAt: row.refined_report ? row.updated_at : undefined,
    description: row.refined_report ?? row.original_description,
    originalText: row.original_description,
  };
}

export async function listDemands(
  supabase: SupabaseClient,
  filter?: { statusNot?: Status; requesterId?: string }
): Promise<Demand[]> {
  let query = supabase
    .from('demands')
    .select(DEMAND_SELECT)
    .order('score', { ascending: false });

  if (filter?.statusNot && filter?.requesterId) {
    query = query.or(`status.neq.${filter.statusNot},requester_id.eq.${filter.requesterId}`);
  } else if (filter?.statusNot) {
    query = query.neq('status', filter.statusNot);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao consultar demandas: ${error.message}`);
  return asRows(data).map(toDemand);
}

export async function getDemand(supabase: SupabaseClient, id: string): Promise<Demand | null> {
  const { data, error } = await supabase
    .from('demands')
    .select(DEMAND_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Falha ao consultar demanda: ${error.message}`);
  const row = asRow(data);
  return row ? toDemand(row) : null;
}

export async function getDemandAudit(supabase: SupabaseClient, id: string): Promise<DemandAudit> {
  const [evaluationResult, historyResult] = await Promise.all([
    supabase
      .from('ai_evaluations')
      .select('model, prompt_version, questions, answers, justification, inconsistency_alerts, created_at')
      .eq('demand_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('demand_history')
      .select('id, action, justification, created_at, actor:profiles!demand_history_actor_id_fkey(display_name)')
      .eq('demand_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (evaluationResult.error) throw new Error(`Falha ao consultar avaliação: ${evaluationResult.error.message}`);
  if (historyResult.error) throw new Error(`Falha ao consultar histórico: ${historyResult.error.message}`);

  const evaluationRow = evaluationResult.data as null | Record<string, unknown>;
  const historyRows = (historyResult.data ?? []) as Array<Record<string, unknown>>;
  return {
    evaluation: evaluationRow ? {
      model: String(evaluationRow.model),
      promptVersion: String(evaluationRow.prompt_version),
      questions: Array.isArray(evaluationRow.questions) ? evaluationRow.questions.map(String) : [],
      answers: Array.isArray(evaluationRow.answers) ? evaluationRow.answers.map(String) : [],
      justification: String(evaluationRow.justification),
      inconsistencyAlerts: Array.isArray(evaluationRow.inconsistency_alerts) ? evaluationRow.inconsistency_alerts.map(String) : [],
      createdAt: String(evaluationRow.created_at),
    } : null,
    history: historyRows.map(row => {
      const actor = row.actor as { display_name?: unknown } | null;
      return {
        id: Number(row.id),
        action: String(row.action),
        justification: typeof row.justification === 'string' ? row.justification : null,
        createdAt: String(row.created_at),
        actorName: typeof actor?.display_name === 'string' ? actor.display_name : 'Sistema',
      };
    }),
  };
}

async function requireAdmin(supabase: SupabaseClient, user: User) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !['administrador', 'admin'].includes(data?.role)) throw new Error('FORBIDDEN');
}

async function resolveAssignee(supabase: SupabaseClient, owner: string) {
  if (!owner || owner === 'Não atribuído') return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('display_name', owner)
    .limit(2);

  if (error) throw new Error(`Falha ao consultar responsável: ${error.message}`);
  if (!data || data.length !== 1) throw new Error('RESPONSAVEL_INVALIDO');
  return data[0].id as string;
}

export async function updateDemand(
  supabase: SupabaseClient,
  user: User,
  id: string,
  updates: DemandUpdate,
): Promise<Demand | null> {
  await requireAdmin(supabase, user);

  const { data: previousData, error: previousError } = await supabase
    .from('demands')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (previousError) throw new Error(`Falha ao consultar demanda: ${previousError.message}`);
  if (!previousData) return null;

  const previous = previousData as DemandRow;
  const nextStatus = updates.status ?? previous.status;
  const patch: Record<string, string | number | null> = {};

  if (typeof updates.title === 'string') patch.title = updates.title.trim();
  if (typeof updates.client === 'string') patch.impacted_department = updates.client.trim();
  if (typeof updates.description === 'string') patch.refined_report = updates.description.trim();
  if (typeof updates.reach === 'number') patch.reach = updates.reach;
  if (typeof updates.impact === 'number') patch.impact = updates.impact;
  if (typeof updates.confidence === 'number') patch.confidence = updates.confidence;
  if (updates.status) patch.status = nextStatus;
  if (typeof updates.owner === 'string') patch.assigned_to = await resolveAssignee(supabase, updates.owner);

  if (previous.status === 'pendente_aprovacao' && nextStatus !== 'pendente_aprovacao') {
    patch.approved_by = user.id;
    patch.approved_at = new Date().toISOString();
  } else if (nextStatus === 'pendente_aprovacao') {
    patch.approved_by = null;
    patch.approved_at = null;
  }

  const { data, error } = await supabase
    .from('demands')
    .update(patch)
    .eq('id', id)
    .select(DEMAND_SELECT)
    .maybeSingle();

  if (error) throw new Error(`Falha ao atualizar demanda: ${error.message}`);
  const row = asRow(data);
  if (!row) return null;

  const justification = updates.justification?.trim() || 'Alteração manual pelo administrador.';
  const action = previous.status === 'pendente_aprovacao' && nextStatus !== 'pendente_aprovacao'
    ? 'aprovada'
    : nextStatus === 'travada'
      ? 'travada'
      : nextStatus === 'concluida'
        ? 'concluida'
        : 'editada';
  const { error: historyError } = await supabase.from('demand_history').insert({
    demand_id: id,
    actor_id: user.id,
    action,
    previous_state: previous,
    new_state: row,
    justification,
  });

  if (historyError) throw new Error(`Demanda alterada, mas o histórico falhou: ${historyError.message}`);
  return toDemand(row);
}

export function buildDashboard(demands: Demand[]): DashboardMetrics {
  const priorityCounts: DashboardMetrics['priorityCounts'] = {
    critico: 0,
    alto: 0,
    medio: 0,
    baixo: 0,
  };
  const statusCounts: DashboardMetrics['statusCounts'] = {
    'aprovada_aberta': 0,
    'em_execucao': 0,
    pendente_aprovacao: 0,
    'travada': 0,
    concluida: 0,
  };

  for (const demand of demands) {
    priorityCounts[demand.priority] += 1;
    statusCounts[demand.status] += 1;
  }

  return {
    totalDemands: demands.length,
    priorityCounts,
    statusCounts,
    totalReach: demands.reduce((total, demand) => total + demand.reach, 0),
    averageConfidence: demands.length
      ? demands.reduce((total, demand) => total + demand.confidence, 0) / demands.length
      : 0,
    averageImpact: demands.length
      ? demands.reduce((total, demand) => total + demand.impact, 0) / demands.length
      : 0,
    stalledDemands: demands.filter((demand) => demand.status === 'travada'),
    topPriorityDemands: demands.slice(0, 5),
  };
}
