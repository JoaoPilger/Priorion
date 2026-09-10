-- Priorion — schema canônico para Supabase PostgreSQL
-- Score: Reach × Impact × Confidence. Data de entrega é apenas informativa.
-- Hierarquia de papéis: admin (super) > administrador > colaborador
--   - admin       : acesso total + gestão de papéis de usuários
--   - administrador: triagem, aprovação e edição de demandas
--   - colaborador  : cria e acompanha demandas

create schema if not exists private;

do $$ begin
  create type public.app_role as enum ('colaborador', 'administrador', 'admin');
exception when duplicate_object then null;
end $$;

-- Adiciona 'admin' ao enum se já existir sem o valor (idempotente)
do $$ begin
  alter type public.app_role add value if not exists 'admin';
exception when others then null;
end $$;

do $$ begin
  create type public.demand_status as enum (
    'pendente_aprovacao',
    'aprovada_aberta',
    'em_execucao',
    'travada',
    'concluida'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  department text not null check (char_length(trim(department)) between 2 and 120),
  role public.app_role not null default 'colaborador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demands (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^DEM-[0-9]{3,}$'),
  requester_id uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  title text not null check (char_length(trim(title)) between 3 and 180),
  impacted_department text not null check (char_length(trim(impacted_department)) between 2 and 120),
  original_description text not null check (char_length(trim(original_description)) between 10 and 10000),
  refined_report text,
  status public.demand_status not null default 'pendente_aprovacao',
  reach bigint not null check (reach >= 0),
  impact numeric(3,2) not null check (impact in (0.25, 0.50, 1.00, 2.00, 3.00)),
  confidence numeric(3,2) not null check (confidence in (0.50, 0.80, 1.00)),
  score numeric(14,1) generated always as (round((reach * impact * confidence)::numeric, 1)) stored,
  priority text generated always as (
    case
      when reach * impact * confidence >= 1200 then 'critico'
      when reach * impact * confidence >= 500 then 'alto'
      when reach * impact * confidence >= 150 then 'medio'
      else 'baixo'
    end
  ) stored,
  delivery_date date,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_consistency check (
    (status = 'pendente_aprovacao' and approved_by is null and approved_at is null)
    or
    (status <> 'pendente_aprovacao' and approved_by is not null and approved_at is not null)
  )
);

create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  model text not null,
  prompt_version text not null,
  input_snapshot jsonb not null,
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  reach bigint not null check (reach >= 0),
  impact numeric(3,2) not null check (impact in (0.25, 0.50, 1.00, 2.00, 3.00)),
  confidence numeric(3,2) not null check (confidence in (0.50, 0.80, 1.00)),
  score numeric(14,1) generated always as (round((reach * impact * confidence)::numeric, 1)) stored,
  justification text not null check (char_length(trim(justification)) between 10 and 1000),
  inconsistency_alerts jsonb not null default '[]'::jsonb check (jsonb_typeof(inconsistency_alerts) = 'array'),
  raw_response jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.demand_history (
  id bigint generated always as identity primary key,
  demand_id uuid not null references public.demands(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null check (action in (
    'criada',
    'avaliada_ia',
    'aprovada',
    'editada',
    'enviada_execucao',
    'travada',
    'concluida'
  )),
  previous_state jsonb,
  new_state jsonb not null,
  justification text,
  created_at timestamptz not null default now(),
  constraint manual_change_requires_reason check (
    action not in ('editada', 'travada')
    or char_length(trim(coalesce(justification, ''))) >= 5
  )
);

create index if not exists demands_requester_id_idx on public.demands(requester_id);
create index if not exists demands_assigned_to_idx on public.demands(assigned_to);
create index if not exists demands_status_score_idx on public.demands(status, score desc);
create index if not exists ai_evaluations_demand_created_idx on public.ai_evaluations(demand_id, created_at desc);
create index if not exists demand_history_demand_created_idx on public.demand_history(demand_id, created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

drop trigger if exists demands_touch_updated_at on public.demands;
create trigger demands_touch_updated_at
before update on public.demands
for each row execute function private.touch_updated_at();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role::text in ('administrador', 'admin')
  );
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role::text = 'admin'
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, department)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário'
    ),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'department'), ''), 'Não informado')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Garante que usuários preexistentes em auth.users tenham registro em public.profiles
insert into public.profiles (id, display_name, department, role)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Usuário'
  ),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'department'), ''), 'Não informado'),
  'colaborador'::public.app_role
from auth.users u
on conflict (id) do nothing;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;
revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.demands enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.demand_history enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.demands from anon, authenticated;
revoke all on table public.ai_evaluations from anon, authenticated;
revoke all on table public.demand_history from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, department) on table public.profiles to authenticated;
grant update (role) on table public.profiles to authenticated;
grant select, insert, update on table public.demands to authenticated;
grant select on table public.ai_evaluations to authenticated;
grant select, insert on table public.demand_history to authenticated;
grant usage, select on sequence public.demand_history_id_seq to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check ((select auth.uid()) = id or (select private.is_admin()));

-- Somente super admins podem alterar o campo role de qualquer perfil
drop policy if exists profiles_update_role on public.profiles;
create policy profiles_update_role on public.profiles for update to authenticated
using ((select private.is_super_admin()))
with check (
  (select private.is_super_admin())
  -- Impede promoção para 'admin' via interface (somente via banco)
  and role::text in ('colaborador', 'administrador')
);

drop policy if exists demands_select on public.demands;
create policy demands_select on public.demands for select to authenticated
using (
  requester_id = (select auth.uid())
  or status <> 'pendente_aprovacao'
  or (select private.is_admin())
);

drop policy if exists demands_insert on public.demands;
create policy demands_insert on public.demands for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pendente_aprovacao'
  and approved_by is null
  and approved_at is null
);

drop policy if exists demands_update_admin on public.demands;
create policy demands_update_admin on public.demands for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists ai_evaluations_select on public.ai_evaluations;
create policy ai_evaluations_select on public.ai_evaluations for select to authenticated
using (
  exists (
    select 1 from public.demands
    where demands.id = ai_evaluations.demand_id
      and (
        demands.requester_id = (select auth.uid())
        or demands.status <> 'pendente_aprovacao'
        or (select private.is_admin())
      )
  )
);

drop policy if exists demand_history_select on public.demand_history;
create policy demand_history_select on public.demand_history for select to authenticated
using (
  exists (
    select 1 from public.demands
    where demands.id = demand_history.demand_id
      and (
        demands.requester_id = (select auth.uid())
        or demands.status <> 'pendente_aprovacao'
        or (select private.is_admin())
      )
  )
);

drop policy if exists demand_history_insert_admin on public.demand_history;
create policy demand_history_insert_admin on public.demand_history for insert to authenticated
with check ((select private.is_admin()) and actor_id = (select auth.uid()));
