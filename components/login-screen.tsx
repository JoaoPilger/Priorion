'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        displayName: form.get('displayName'),
        department: form.get('department'),
      }),
    });
    const result = (await response.json()) as {
      authenticated?: boolean;
      requiresEmailConfirmation?: boolean;
      error?: string;
    };

    if (!response.ok) {
      setError(result.error ?? 'Não foi possível autenticar.');
      setLoading(false);
      return;
    }

    if (result.requiresEmailConfirmation) {
      setNotice('Conta criada. Você já pode entrar no Priorion.');
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0B] px-4 text-[#EDEDEF]">
      <section className="w-full max-w-[360px] rounded-md border border-[#232327] bg-[#111113]">
        <header className="border-b border-[#232327] px-5 py-5">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#4D7CFF]">
              <SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Priorion</h1>
              <p className="font-mono text-[10px] text-[#6B6B73]">Valor &amp; Certeza</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
          </h2>
          <p className="mt-1 text-xs text-[#9B9BA3]">
            {mode === 'login'
              ? 'Entre para acompanhar e priorizar demandas.'
              : 'Cadastre-se como colaborador da sua empresa.'}
          </p>
        </header>

        <form className="space-y-4 px-5 py-5" onSubmit={submit}>
          {mode === 'signup' ? (
            <>
              <Field label="Nome completo" name="displayName" autoComplete="name" />
              <Field label="Setor" name="department" autoComplete="organization-title" />
            </>
          ) : null}
          <Field label="E-mail" name="email" type="email" autoComplete="email" />
          <Field
            label="Senha"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
          />

          {error ? (
            <p role="alert" className="rounded border border-[rgba(255,92,92,0.28)] bg-[rgba(255,92,92,0.10)] px-3 py-2 text-xs text-[#FF5C5C]">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded border border-[rgba(61,220,151,0.28)] bg-[rgba(61,220,151,0.10)] px-3 py-2 text-xs text-[#3DDC97]">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#4D7CFF] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#6B93FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            {!loading ? <ArrowRight aria-hidden="true" size={14} strokeWidth={1.5} /> : null}
          </button>
        </form>

        <footer className="border-t border-[#232327] px-5 py-4 text-center text-xs text-[#6B6B73]">
          {mode === 'login' ? 'Ainda não tem uma conta? ' : 'Já possui uma conta? '}
          <button
            type="button"
            onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')}
            className="font-medium text-[#6B93FF] hover:text-[#EDEDEF]"
          >
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </footer>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <label className="block text-xs font-medium text-[#9B9BA3]">
      {label}
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        className="mt-1.5 h-9 w-full rounded-md border border-[#2E2E33] bg-[#17171A] px-3 text-[13px] text-[#EDEDEF] outline-none transition-colors placeholder:text-[#4A4A52] focus:border-[#4D7CFF]"
      />
    </label>
  );
}
