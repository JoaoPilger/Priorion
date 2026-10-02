import { NextResponse, type NextRequest } from 'next/server';

import {
  buildDashboard,
  getDemand,
  getDemandAudit,
  listDemands,
  parseDemandUpdate,
  updateDemand,
} from '@/lib/supabase/demands';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  evaluateDemand,
  REFINEMENT_MODEL,
  REFINEMENT_PROMPT_VERSION,
  type InterviewTurn,
} from '@/server/services/refinement';

type RouteContext = { params: Promise<{ route?: string[] }> };

function normalizeQuestion(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function authenticated() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Erro interno.';
  if (message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }
  if (message === 'RESPONSAVEL_INVALIDO') {
    return NextResponse.json({ error: 'Selecione um responsável cadastrado e único.' }, { status: 400 });
  }
  if (message === 'INVALID_INPUT') {
    return NextResponse.json({ error: 'Dados da demanda inválidos.' }, { status: 400 });
  }
  if (message.startsWith('REFINEMENT_')) {
    console.error(`[Refinement API Error] Falha no refinamento: ${message}`);
    return NextResponse.json(
      { error: 'O refinamento está temporariamente indisponível. Tente novamente.' },
      { status: 503 },
    );
  }
  console.error(message);
  return NextResponse.json({ error: 'Não foi possível concluir a operação.' }, { status: 500 });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const route = (await context.params).route ?? [];
  const { user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });

  try {
    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'administrador' || profile?.role === 'admin';
    const isSuperAdmin = profile?.role === 'admin';

    if (route[0] === 'demands' && route.length === 1) {
      const demands = await listDemands(
        admin,
        isAdmin ? undefined : { statusNot: 'pendente_aprovacao', requesterId: user.id },
      );
      return NextResponse.json({ demands, total: demands.length });
    }
    if (route[0] === 'demands' && route[1] && route[2] === 'audit') {
      const demand = await getDemand(admin, route[1]);
      if (!demand) return NextResponse.json({ error: 'Demanda não encontrada.' }, { status: 404 });
      if (!isAdmin && demand.status === 'pendente_aprovacao') {
        const { data: row } = await admin.from('demands').select('requester_id').eq('id', route[1]).single();
        if (row?.requester_id !== user.id) {
          return NextResponse.json({ error: 'Demanda em análise restrita.' }, { status: 403 });
        }
      }
      return NextResponse.json(await getDemandAudit(admin, route[1]));
    }
    if (route[0] === 'demands' && route[1]) {
      const [demand, demands] = await Promise.all([
        getDemand(admin, route[1]),
        listDemands(admin, isAdmin ? undefined : { statusNot: 'pendente_aprovacao', requesterId: user.id }),
      ]);
      if (!demand) return NextResponse.json({ error: 'Demanda não encontrada.' }, { status: 404 });
      if (!isAdmin && demand.status === 'pendente_aprovacao') {
        const { data: row } = await admin.from('demands').select('requester_id').eq('id', route[1]).single();
        if (row?.requester_id !== user.id) {
          return NextResponse.json({ error: 'Demanda em análise restrita.' }, { status: 403 });
        }
      }
      return NextResponse.json({
        demand,
        position: demands.findIndex((item) => item.id === demand.id) + 1,
        total: demands.length,
      });
    }
    if (route[0] === 'dashboard') {
      return NextResponse.json(buildDashboard(await listDemands(admin)));
    }
    if (route[0] === 'interview' && route[1] === 'status') {
      return NextResponse.json({
        refinementConfigured: Boolean(process.env.GROQ_API_KEY),
        supabaseConfigured: true,
        model: REFINEMENT_MODEL,
      });
    }
    if (route[0] === 'users' && route.length === 1) {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Acesso restrito a super admins.' }, { status: 403 });
      }
      const { data: users, error: usersError } = await admin
        .from('profiles')
        .select('id, display_name, department, role, created_at')
        .order('created_at', { ascending: true });
      if (usersError) throw usersError;
      return NextResponse.json({ users: users ?? [] });
    }
    return NextResponse.json({ error: 'Rota não implementada.' }, { status: 404 });

  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const route = (await context.params).route ?? [];

  const { supabase, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });

  // PUT /api/users/:id/role — troca o papel de um usuário (somente super admin)
  if (route[0] === 'users' && route[1] && route[2] === 'role') {
    const targetId = route[1];
    const admin = createSupabaseAdminClient();

    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a super admins.' }, { status: 403 });
    }
    if (targetId === user.id) {
      return NextResponse.json({ error: 'O super admin não pode alterar o próprio papel.' }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
    }
    const newRole = body.role;
    if (newRole !== 'colaborador' && newRole !== 'administrador') {
      return NextResponse.json({ error: 'Papel inválido. Use "colaborador" ou "administrador".' }, { status: 400 });
    }

    const { data: targetProfile } = await admin.from('profiles').select('role').eq('id', targetId).single();
    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    if (targetProfile.role === 'admin') {
      return NextResponse.json({ error: 'Não é possível alterar o papel de outro super admin.' }, { status: 403 });
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, id: targetId, role: newRole });
  }

  // PUT /api/demands/:id
  if (route[0] !== 'demands' || !route[1]) {
    return NextResponse.json({ error: 'Rota não encontrada.' }, { status: 404 });
  }

  try {
    const updates = parseDemandUpdate(await request.json());
    const demand = await updateDemand(supabase, user, route[1], updates);
    if (!demand) return NextResponse.json({ error: 'Demanda não encontrada.' }, { status: 404 });
    return NextResponse.json(demand);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const route = (await context.params).route ?? [];
  const { supabase, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const initialText = typeof body.initialText === 'string' ? body.initialText.trim() : '';
    const impactedDepartment = typeof body.clientName === 'string' ? body.clientName.trim() : '';
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: InterviewTurn[] = rawHistory.flatMap(turn => {
      if (!turn || typeof turn !== 'object') return [];
      const item = turn as Record<string, unknown>;
      if (typeof item.question !== 'string' || typeof item.answer !== 'string') return [];
      return [{ question: item.question.trim().slice(0, 500), answer: item.answer.trim().slice(0, 2000) }];
    }).slice(0, 6);
    if (initialText.length < 10 || initialText.length > 10000 || impactedDepartment.length < 2 || impactedDepartment.length > 120) {
      return NextResponse.json({ error: 'Relato ou setor impactado inválido.' }, { status: 400 });
    }

    if (route[0] === 'interview' && route[1] === 'next-question') {
      const result = await evaluateDemand({ initialText, impactedDepartment, history });
      const asked = new Set(history.map(turn => normalizeQuestion(turn.question)));
      const question = result.questions.find(item => !asked.has(normalizeQuestion(item.text)));
      const finished = result.decision === 'complete' || (!question && history.length > 0);
      return NextResponse.json({
        question: question?.text ?? 'As informações necessárias foram reunidas.',
        options: question?.options ?? [],
        factor: question ? ({ reach: 'Reach', impact: 'Impact', confidence: 'Confidence', context: 'Contexto' } as const)[question.factor] : 'Contexto',
        completeness: finished ? 100 : Math.min(90, 35 + history.length * 25),
        isFinished: finished,
      });
    }

    if (route[0] === 'interview' && route[1] === 'finalize') {
      const result = await evaluateDemand({ initialText, impactedDepartment, history, forceComplete: true });
      if (!result.evaluation) throw new Error('REFINEMENT_INVALID_RESPONSE');
      const evaluation = result.evaluation;
      const admin = createSupabaseAdminClient();
      const code = `DEM-${Date.now()}`;
      const { data: demandRow, error: demandError } = await admin.from('demands').insert({
        code,
        requester_id: user.id,
        title: evaluation.title,
        impacted_department: impactedDepartment,
        original_description: initialText,
        refined_report: evaluation.refinedReport,
        status: 'pendente_aprovacao',
        reach: evaluation.reach.value,
        impact: evaluation.impact.value,
        confidence: evaluation.confidence.value,
      }).select('id').single();
      if (demandError || !demandRow) throw new Error(`SUPABASE_CREATE_${demandError?.code ?? 'FAILED'}`);

      const demandId = demandRow.id as string;
      const score = evaluation.reach.value * evaluation.impact.value * evaluation.confidence.value;
      try {
        const { error: evaluationError } = await admin.from('ai_evaluations').insert({
          demand_id: demandId,
          model: REFINEMENT_MODEL,
          prompt_version: REFINEMENT_PROMPT_VERSION,
          input_snapshot: { initialText, impactedDepartment, history },
          questions: history.map(turn => turn.question),
          answers: history.map(turn => turn.answer),
          reach: evaluation.reach.value,
          impact: evaluation.impact.value,
          confidence: evaluation.confidence.value,
          justification: evaluation.justification,
          inconsistency_alerts: evaluation.inconsistencyAlerts,
          raw_response: result.raw,
        });
        if (evaluationError) throw evaluationError;
        const { error: historyError } = await admin.from('demand_history').insert({
          demand_id: demandId,
          actor_id: user.id,
          action: 'criada',
          new_state: { code, status: 'pendente_aprovacao', score },
        });
        if (historyError) throw historyError;
      } catch (writeError) {
        await admin.from('demands').delete().eq('id', demandId);
        throw writeError;
      }

      const demand = await getDemand(supabase, demandId);
      if (!demand) throw new Error('SUPABASE_READ_AFTER_CREATE');
      return NextResponse.json({
        demand,
        metrics: {
          title: evaluation.title,
          reach: evaluation.reach.value,
          impact: evaluation.impact.value,
          confidence: evaluation.confidence.value,
          structuredReport: evaluation.refinedReport,
        },
        score,
        priority: demand.priority,
      });
    }

    return NextResponse.json({ error: 'Rota não implementada.' }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Exclusão física não é permitida; use o fluxo de governança.' },
    { status: 405, headers: { Allow: 'GET, PUT, POST' } },
  );
}
