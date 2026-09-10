import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ action: string }> };

type AuthBody = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  department?: unknown;
};

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_LIMIT = 5;
const signupAttempts = new Map<string, number[]>();

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

function allowSignup(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwarded || request.headers.get('x-real-ip') || 'local';
  const now = Date.now();
  const recent = (signupAttempts.get(key) ?? []).filter(time => now - time < SIGNUP_WINDOW_MS);
  if (recent.length >= SIGNUP_LIMIT) return false;
  signupAttempts.set(key, [...recent, now]);
  return true;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }

  const { action } = await context.params;
  const supabase = await createSupabaseServerClient();

  if (action === 'logout') {
    await supabase.auth.signOut();
    return new NextResponse(null, { status: 204 });
  }

  let body: AuthBody;
  try {
    body = (await request.json()) as AuthBody;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const email = text(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !email.includes('@') || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: 'Informe um e-mail válido e uma senha entre 8 e 128 caracteres.' },
      { status: 400 },
    );
  }

  if (action === 'login') {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true });
  }

  if (action === 'signup') {
    const displayName = text(body.displayName);
    const department = text(body.department);

    if (displayName.length < 2 || displayName.length > 120) {
      return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 });
    }
    if (department.length < 2 || department.length > 120) {
      return NextResponse.json({ error: 'Informe seu setor.' }, { status: 400 });
    }
    if (!allowSignup(request)) {
      return NextResponse.json(
        { error: 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.' },
        { status: 429 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        department,
      },
    });

    if (error) {
      console.error('Falha no cadastro Supabase:', error.code, error.message);
      const messages: Record<string, string> = {
        email_address_invalid: 'Este endereço de e-mail não é válido.',
        email_exists: 'Já existe uma conta com este e-mail.',
        user_already_exists: 'Já existe uma conta com este e-mail.',
        weak_password: 'A senha não atende aos requisitos de segurança.',
        over_request_rate_limit: 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.',
      };
      return NextResponse.json(
        { error: messages[error.code ?? ''] ?? 'Não foi possível criar a conta.' },
        { status: error.status || 400 },
      );
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      if (data.user) await admin.auth.admin.deleteUser(data.user.id);
      console.error('Conta revertida após falha no login inicial:', loginError.code, loginError.message);
      return NextResponse.json({ error: 'A conta não pôde ser iniciada. Tente novamente.' }, { status: 500 });
    }

    return NextResponse.json({ authenticated: true, requiresEmailConfirmation: false });
  }

  return NextResponse.json({ error: 'Ação de autenticação inexistente.' }, { status: 404 });
}
