create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  role text not null default 'underwriter',
  created_at timestamptz not null default now()
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.model_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  name text not null,
  version text not null,
  status text not null check (status in ('champion', 'challenger', 'shadow')),
  auc numeric(4,3) not null,
  precision numeric(4,3) not null,
  recall numeric(4,3) not null,
  drift numeric(5,2) not null default 0,
  notes text not null default '',
  deployed_at date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  external_ref text not null unique,
  customer_name text not null,
  email text not null,
  product_line text not null check (product_line in ('auto_insurance', 'personal_loan')),
  amount_requested numeric(12,2) not null,
  annual_income numeric(12,2) not null,
  credit_score integer not null check (credit_score between 300 and 850),
  debt_to_income numeric(5,4) not null check (debt_to_income between 0 and 1),
  claims_count integer not null default 0,
  fraud_signals text[] not null default '{}',
  document_confidence numeric(5,4) not null default 0.8,
  geospatial_risk numeric(5,4) not null default 0.3,
  state text not null,
  status text not null default 'new' check (status in ('new', 'scored', 'manual_review', 'approved', 'declined')),
  workflow_stage text not null default 'intake',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.risk_scores (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  score numeric(5,2) not null,
  band text not null check (band in ('low', 'moderate', 'high')),
  fraud_probability numeric(5,2) not null,
  document_confidence numeric(5,4) not null,
  recommendation text not null check (recommendation in ('auto_approve', 'manual_review', 'decline')),
  reasons text[] not null default '{}',
  factors jsonb not null default '[]'::jsonb,
  model_version text not null,
  generated_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  decision text not null check (decision in ('auto_approve', 'manual_review', 'decline')),
  actor text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  actor text not null,
  action text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  customer_name text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  label text not null,
  value text not null,
  delta text not null,
  tone text not null check (tone in ('positive', 'neutral', 'negative')),
  created_at timestamptz not null default now()
);

create or replace function public.current_organization_id()
returns uuid
language sql
stable
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.workflows enable row level security;
alter table public.model_versions enable row level security;
alter table public.applications enable row level security;
alter table public.risk_scores enable row level security;
alter table public.decisions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.fraud_alerts enable row level security;
alter table public.portfolio_metrics enable row level security;

drop policy if exists "profiles can read own organization" on public.profiles;
drop policy if exists "organizations read by member" on public.organizations;
drop policy if exists "workflows tenant isolation" on public.workflows;
drop policy if exists "model versions tenant isolation" on public.model_versions;
drop policy if exists "applications tenant isolation" on public.applications;
drop policy if exists "risk scores tenant isolation" on public.risk_scores;
drop policy if exists "decisions tenant isolation" on public.decisions;
drop policy if exists "audit logs tenant isolation" on public.audit_logs;
drop policy if exists "fraud alerts tenant isolation" on public.fraud_alerts;
drop policy if exists "portfolio metrics tenant isolation" on public.portfolio_metrics;


create policy "profiles can read own organization" on public.profiles
for select using (organization_id = public.current_organization_id() or id = auth.uid());

create policy "organizations read by member" on public.organizations
for select using (id = public.current_organization_id());

create policy "workflows tenant isolation" on public.workflows
for all using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "model versions tenant isolation" on public.model_versions
for all using (organization_id = public.current_organization_id() or organization_id is null)
with check (organization_id = public.current_organization_id() or organization_id is null);

create policy "applications tenant isolation" on public.applications
for all using (organization_id = public.current_organization_id() or organization_id is null)
with check (organization_id = public.current_organization_id() or organization_id is null);

create policy "risk scores tenant isolation" on public.risk_scores
for all using (
  exists (
    select 1 from public.applications a
    where a.id = risk_scores.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1 from public.applications a
    where a.id = risk_scores.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);

create policy "decisions tenant isolation" on public.decisions
for all using (
  exists (
    select 1 from public.applications a
    where a.id = decisions.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1 from public.applications a
    where a.id = decisions.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);

create policy "audit logs tenant isolation" on public.audit_logs
for all using (
  exists (
    select 1 from public.applications a
    where a.id = audit_logs.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1 from public.applications a
    where a.id = audit_logs.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);

create policy "fraud alerts tenant isolation" on public.fraud_alerts
for all using (
  exists (
    select 1 from public.applications a
    where a.id = fraud_alerts.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
)
with check (
  exists (
    select 1 from public.applications a
    where a.id = fraud_alerts.application_id
      and (a.organization_id = public.current_organization_id() or a.organization_id is null)
  )
);

create policy "portfolio metrics tenant isolation" on public.portfolio_metrics
for all using (organization_id = public.current_organization_id() or organization_id is null)
with check (organization_id = public.current_organization_id() or organization_id is null);
